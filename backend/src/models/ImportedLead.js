const mongoose = require("mongoose");

const importedLeadSchema = new mongoose.Schema(
  {
    importJobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ImportJob",
      required: true,
      index: true,
    },
    created_at: {
      type: Date,
      default: null,
    },
    name: {
      type: String,
      default: "",
      trim: true,
    },
    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },
    country_code: {
      type: String,
      default: "",
      trim: true,
    },
    mobile_without_country_code: {
      type: String,
      default: "",
      trim: true,
    },
    company: {
      type: String,
      default: "",
      trim: true,
    },
    city: {
      type: String,
      default: "",
      trim: true,
    },
    state: {
      type: String,
      default: "",
      trim: true,
    },
    country: {
      type: String,
      default: "",
      trim: true,
    },
    lead_owner: {
      type: String,
      default: "",
      trim: true,
    },
    crm_status: {
      type: String,
      enum: ["", "GOOD_LEAD_FOLLOW_UP", "DID_NOT_CONNECT", "BAD_LEAD", "SALE_DONE"],
      default: "",
    },
    crm_note: {
      type: String,
      default: "",
      trim: true,
    },
    data_source: {
      type: String,
      enum: ["", "leads_on_demand", "meridian_tower", "eden_park", "varah_swamy", "sarjapur_plots"],
      default: "",
    },
    possession_time: {
      type: String,
      default: "",
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    rawRow: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

importedLeadSchema.index({ email: 1 });
importedLeadSchema.index({ mobile_without_country_code: 1 });

module.exports = mongoose.model("ImportedLead", importedLeadSchema);
