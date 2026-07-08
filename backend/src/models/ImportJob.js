const mongoose = require("mongoose");

const importJobSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    originalFileName: {
      type: String,
      required: true,
      trim: true,
    },
    totalRows: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalImported: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSkipped: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    errorMessage: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ImportJob", importJobSchema);
