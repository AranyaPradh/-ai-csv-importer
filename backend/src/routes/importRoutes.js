const express = require("express");
const {
  previewImport,
  confirmImport,
} = require("../controllers/importController");
const uploadCsv = require("../middlewares/uploadMiddleware");
const asyncHandler = require("../middlewares/asyncHandler");

const router = express.Router();

router.post("/preview", uploadCsv.single("file"), asyncHandler(previewImport));
router.post("/confirm", uploadCsv.single("file"), asyncHandler(confirmImport));

module.exports = router;
