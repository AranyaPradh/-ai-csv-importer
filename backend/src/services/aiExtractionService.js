const OpenAI = require("openai");
const {
  CRM_FIELDS,
  CRM_STATUS_VALUES,
  DATA_SOURCE_VALUES,
} = require("../utils/crmConstants");
const { processCsvInBatches } = require("./csvParserService");

const BATCH_SIZE = 25;
const MAX_AI_BATCH_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getErrorStatus = (error) =>
  error?.status || error?.statusCode || error?.response?.status;

const isRetryableAiError = (error) => {
  const status = getErrorStatus(error);

  if (!status) {
    return true;
  }

  return status === 408 || status === 409 || status === 429 || status >= 500;
};

const emptyLead = () =>
  CRM_FIELDS.reduce((lead, field) => {
    lead[field] = "";
    return lead;
  }, {});

const toText = (value) => {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\r?\n/g, "\\n").trim();
};

const normalizeLead = (lead = {}) => {
  const normalized = emptyLead();

  CRM_FIELDS.forEach((field) => {
    normalized[field] = toText(lead[field]);
  });

  if (
    normalized.created_at &&
    Number.isNaN(new Date(normalized.created_at).getTime())
  ) {
    normalized.created_at = "";
  }

  if (!CRM_STATUS_VALUES.includes(normalized.crm_status)) {
    normalized.crm_status = "";
  }

  if (!DATA_SOURCE_VALUES.includes(normalized.data_source)) {
    normalized.data_source = "";
  }

  normalized.email = normalized.email.toLowerCase();

  return normalized;
};

const hasContact = (lead) =>
  Boolean(lead.email || lead.mobile_without_country_code);

const createPrompt = (rows) => `
You are converting messy CSV rows into GrowEasy CRM lead records.

Return only valid JSON in this exact shape:
{
  "records": [
    {
      "rowIndex": 0,
      "created_at": "",
      "name": "",
      "email": "",
      "country_code": "",
      "mobile_without_country_code": "",
      "company": "",
      "city": "",
      "state": "",
      "country": "",
      "lead_owner": "",
      "crm_status": "",
      "crm_note": "",
      "data_source": "",
      "possession_time": "",
      "description": ""
    }
  ],
  "skippedRecords": [
    {
      "rowIndex": 0,
      "reason": ""
    }
  ]
}

Rules:
- Use only these CRM fields: ${CRM_FIELDS.join(", ")}.
- crm_status must be one of: ${CRM_STATUS_VALUES.join(", ")}. If unsure, leave blank.
- data_source must be one of: ${DATA_SOURCE_VALUES.join(", ")}. If unsure, leave blank.
- created_at must be convertible by JavaScript new Date(created_at). If unsure, leave blank.
- If multiple emails exist, use the first email and put the others in crm_note.
- If multiple mobile numbers exist, use the first mobile and put the others in crm_note.
- Put remarks, comments, follow-up notes, extra emails, extra phones, and useful unmapped info in crm_note.
- Skip a row if it has neither email nor mobile number.
- Do not add line breaks inside values. Use \\n if a line break is necessary.
- Preserve each input rowIndex exactly.

Rows:
${JSON.stringify(rows)}
`;

const parseAiJson = (content) => {
  try {
    return JSON.parse(content);
  } catch (error) {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw error;
    return JSON.parse(match[0]);
  }
};

const extractBatch = async (batchRows) => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing in environment variables");
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    response_format: { type: "json_object" },
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "You are a precise CRM CSV extraction engine. Return only valid JSON.",
      },
      {
        role: "user",
        content: createPrompt(batchRows),
      },
    ],
  });

  const content = response.choices?.[0]?.message?.content || "{}";
  return parseAiJson(content);
};

const extractBatchWithRetry = async (batchRows) => {
  let lastError;

  for (let attempt = 0; attempt <= MAX_AI_BATCH_RETRIES; attempt += 1) {
    try {
      return await extractBatch(batchRows);
    } catch (error) {
      lastError = error;

      if (!isRetryableAiError(error) || attempt === MAX_AI_BATCH_RETRIES) {
        break;
      }

      await wait(RETRY_DELAY_MS * (attempt + 1));
    }
  }

  const error = new Error(
    `AI extraction failed after ${MAX_AI_BATCH_RETRIES + 1} attempts: ${
      lastError?.message || "Unknown error"
    }`
  );
  error.statusCode = getErrorStatus(lastError) || 502;
  throw error;
};

const extractBatchRecords = async ({ rows, batchStartIndex }) => {
  const batch = rows.map((row, index) => ({
    rowIndex: batchStartIndex + index,
    row,
  }));

  const aiResult = await extractBatchWithRetry(batch);
  const importedRecords = [];
  const skippedRecords = [];
  const skippedRowIndexes = new Set();

  const addSkippedRecord = ({ rowIndex, reason }) => {
    const skipKey = rowIndex === null ? `unknown-${skippedRecords.length}` : rowIndex;

    if (rowIndex !== null && skippedRowIndexes.has(skipKey)) {
      return;
    }

    skippedRowIndexes.add(skipKey);
    skippedRecords.push({
      rowIndex,
      reason,
      rawRow: rowIndex !== null ? rows[rowIndex - batchStartIndex] : {},
    });
  };

  (aiResult.records || []).forEach((record) => {
    const rowIndex = Number.isInteger(record.rowIndex) ? record.rowIndex : null;
    const normalizedLead = normalizeLead(record);

    if (!hasContact(normalizedLead)) {
      addSkippedRecord({
        rowIndex,
        reason: "Missing email and mobile number",
      });
      return;
    }

    importedRecords.push({
      rowIndex,
      lead: normalizedLead,
      rawRow: rowIndex !== null ? rows[rowIndex - batchStartIndex] : {},
    });
  });

  (aiResult.skippedRecords || []).forEach((record) => {
    const rowIndex = Number.isInteger(record.rowIndex) ? record.rowIndex : null;

    addSkippedRecord({
      rowIndex,
      reason: record.reason || "Skipped by AI extraction",
    });
  });

  return {
    importedRecords,
    skippedRecords,
  };
};

const extractCrmRecordsFromCsvFile = async (filePath, onBatchResult) => {
  const allImportedRecords = [];
  const allSkippedRecords = [];
  const skippedRowIndexes = new Set();

  const totalRows = await processCsvInBatches(
    filePath,
    BATCH_SIZE,
    async (rows, batchStartIndex) => {
      const { importedRecords, skippedRecords } = await extractBatchRecords({
        rows,
        batchStartIndex,
      });

      importedRecords.forEach((record) => allImportedRecords.push(record));

      skippedRecords.forEach((record) => {
        if (record.rowIndex !== null && skippedRowIndexes.has(record.rowIndex)) {
          return;
        }

        if (record.rowIndex !== null) {
          skippedRowIndexes.add(record.rowIndex);
        }

        allSkippedRecords.push(record);
      });

      if (onBatchResult) {
        await onBatchResult({ importedRecords, skippedRecords });
      }
    }
  );

  return {
    totalRows,
    importedRecords: allImportedRecords,
    skippedRecords: allSkippedRecords,
  };
};

module.exports = {
  extractCrmRecordsFromCsvFile,
};
