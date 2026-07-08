const fs = require("fs");
const csvParser = require("csv-parser");

const normalizeRow = (row) => {
  const normalized = {};

  Object.entries(row).forEach(([key, value]) => {
    const cleanKey = String(key || "").trim();
    const cleanValue = typeof value === "string" ? value.trim() : value;

    if (cleanKey) {
      normalized[cleanKey] = cleanValue;
    }
  });

  return normalized;
};

const createCsvReadStream = (filePath) =>
  fs.createReadStream(filePath).pipe(
    csvParser({
      mapHeaders: ({ header }) => String(header || "").trim(),
      skipLines: 0,
      strict: false,
    })
  );

const parseCsvPreview = (filePath, limit = 20) =>
  new Promise((resolve, reject) => {
    const rows = [];
    const columns = [];
    let totalRows = 0;

    createCsvReadStream(filePath)
      .on("data", (row) => {
        const normalizedRow = normalizeRow(row);
        totalRows += 1;

        if (!columns.length) {
          columns.push(...Object.keys(normalizedRow));
        }

        if (rows.length < limit) {
          rows.push(normalizedRow);
        }
      })
      .on("error", reject)
      .on("end", () => {
        resolve({
          totalRows,
          columns,
          rows,
        });
      });
  });

const processCsvInBatches = (filePath, batchSize, onBatch) =>
  new Promise((resolve, reject) => {
    let batch = [];
    let totalRows = 0;
    let chain = Promise.resolve();

    const processBatch = (rows) => {
      if (!rows.length) return;

      const batchStartIndex = totalRows - rows.length;
      chain = chain.then(() => onBatch(rows, batchStartIndex));
    };

    createCsvReadStream(filePath)
      .on("data", (row) => {
        batch.push(normalizeRow(row));
        totalRows += 1;

        if (batch.length >= batchSize) {
          processBatch(batch);
          batch = [];
        }
      })
      .on("error", reject)
      .on("end", async () => {
        processBatch(batch);

        try {
          await chain;
          resolve(totalRows);
        } catch (error) {
          reject(error);
        }
      });
  });

module.exports = {
  parseCsvPreview,
  processCsvInBatches,
};
