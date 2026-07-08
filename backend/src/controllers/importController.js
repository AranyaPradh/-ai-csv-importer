const fs = require("fs/promises");
const ImportJob = require("../models/ImportJob");
const ImportedLead = require("../models/ImportedLead");
const { parseCsvPreview } = require("../services/csvParserService");
const { extractCrmRecordsFromCsvFile } = require("../services/aiExtractionService");

const ensureCsvFile = (file) => {
  if (!file) {
    const error = new Error("CSV file is required");
    error.statusCode = 400;
    throw error;
  }
};

const cleanupUploadedFile = async (file) => {
  if (!file?.path) return;

  try {
    await fs.unlink(file.path);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(`Failed to cleanup uploaded file: ${error.message}`);
    }
  }
};

const mapLeadForInsert = (importJobId, record) => ({
  importJobId,
  ...record.lead,
  created_at: record.lead.created_at ? new Date(record.lead.created_at) : null,
  rawRow: record.rawRow,
});

const previewImport = async (req, res) => {
  ensureCsvFile(req.file);

  try {
    const preview = await parseCsvPreview(req.file.path);

    res.status(200).json({
      success: true,
      message: "CSV preview generated successfully",
      data: {
        fileName: req.file.originalname,
        ...preview,
      },
    });
  } finally {
    await cleanupUploadedFile(req.file);
  }
};

const confirmImport = async (req, res) => {
  ensureCsvFile(req.file);

  const importJob = await ImportJob.create({
    fileName: req.file.filename,
    originalFileName: req.file.originalname,
    totalRows: 0,
    totalImported: 0,
    totalSkipped: 0,
    status: "processing",
  });

  const savedLeads = [];
  const skippedRecords = [];

  try {
    const { totalRows } = await extractCrmRecordsFromCsvFile(
      req.file.path,
      async ({ importedRecords, skippedRecords: batchSkippedRecords }) => {
        if (importedRecords.length) {
          const leadsToCreate = importedRecords.map((record) =>
            mapLeadForInsert(importJob._id, record)
          );

          const batchSavedLeads = await ImportedLead.insertMany(leadsToCreate, {
            ordered: false,
          });

          savedLeads.push(...batchSavedLeads);
        }

        skippedRecords.push(...batchSkippedRecords);

        importJob.totalImported = savedLeads.length;
        importJob.totalSkipped = skippedRecords.length;
        await importJob.save();
      }
    );

    importJob.totalRows = totalRows;
    importJob.totalImported = savedLeads.length;
    importJob.totalSkipped = skippedRecords.length;
    importJob.status = "completed";
    await importJob.save();

    res.status(200).json({
      success: true,
      message: "CSV imported successfully",
      data: {
        importJobId: importJob._id,
        totalRows,
        totalImported: savedLeads.length,
        totalSkipped: skippedRecords.length,
        records: savedLeads,
        skippedRecords,
      },
    });
  } catch (error) {
    importJob.status = "failed";
    importJob.errorMessage = error.message || "Import failed";
    await importJob.save();

    throw error;
  } finally {
    await cleanupUploadedFile(req.file);
  }
};

module.exports = {
  previewImport,
  confirmImport,
};
