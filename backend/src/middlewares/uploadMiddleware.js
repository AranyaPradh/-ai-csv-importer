const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadDir = path.join(__dirname, "../../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const csvFileFilter = (req, file, cb) => {
  const isCsvMimeType = [
    "text/csv",
    "application/csv",
    "application/vnd.ms-excel",
    "text/plain",
  ].includes(file.mimetype);

  const hasCsvExtension = file.originalname.toLowerCase().endsWith(".csv");

  if (!isCsvMimeType && !hasCsvExtension) {
    return cb(new Error("Only CSV files are allowed"));
  }

  cb(null, true);
};

const uploadCsv = multer({
  storage,
  fileFilter: csvFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

module.exports = uploadCsv;
