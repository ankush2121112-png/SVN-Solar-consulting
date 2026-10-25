const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
  {
    leadNumber: { type: String, unique: true, required: true },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false
    },
    customerName: { type: String, required: true, trim: true, maxlength: 100 },
    customerPhone: { type: String, required: true, trim: true, maxlength: 20 },
    customerEmail: { type: String, trim: true, lowercase: true, maxlength: 160, default: "" },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    projectType: {
      type: String,
      enum: ["Residential Rooftop", "Commercial", "Industrial", "Solar Agricultural Pump", "Repair / AMC"],
      required: true
    },
    monthlyBill: { type: String, trim: true, maxlength: 60, default: "" },
    budget: { type: String, trim: true, maxlength: 80, default: "" },
    spaceAvailable: { type: String, trim: true, maxlength: 80, default: "" },
    recommendedKw: { type: String, trim: true, maxlength: 60, default: "" },
    requirement: { type: String, trim: true, maxlength: 1500, default: "" },
    status: {
      type: String,
      enum: [
        "New",
        "Reviewed",
        "Vendor Assigned",
        "Site Visit",
        "Quotation Received",
        "Installation",
        "Completed",
        "Cancelled"
      ],
      default: "New"
    },
    assignedVendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    internalNotes: { type: String, trim: true, maxlength: 1000, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Lead", leadSchema);
