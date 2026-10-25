const mongoose = require("mongoose");

const amcContractSchema = new mongoose.Schema(
  {
    contractId: { type: String, unique: true, required: true },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false
    },
    customerEmail: { type: String, required: true, lowercase: true, trim: true },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, default: "" },
    systemId: { type: String, required: true, trim: true },
    planName: {
      type: String,
      enum: ["Bronze Basic", "Silver Standard", "Gold Comprehensive"],
      required: true
    },
    annualPrice: { type: Number, required: true },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ["Pending Approval", "Active", "Expired", "Cancelled"],
      default: "Pending Approval"
    },
    totalVisitsQuota: { type: Number, default: 4 },
    completedVisits: { type: Number, default: 0 },
    assignedVendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    vendorPayout: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Refunded"],
      default: "Pending"
    },
    notes: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("AMCContract", amcContractSchema);
