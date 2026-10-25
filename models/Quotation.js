const mongoose = require("mongoose");

const quotationSchema = new mongoose.Schema(
  {
    quoteId: { type: String, unique: true, required: true },
    leadId: { type: String, required: true },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    vendorName: { type: String, required: true },
    vendorCompanyName: { type: String, default: "" },
    vendorPhone: { type: String, default: "" },
    systemCapacity: { type: String, required: true },
    panelDetails: { type: String, default: "" },
    inverterDetails: { type: String, default: "" },
    totalPrice: { type: Number, required: true },
    warrantyTerms: { type: String, default: "" },
    estimatedDays: { type: Number, default: 7 },
    status: {
      type: String,
      enum: ["Submitted", "Accepted by Customer", "Declined"],
      default: "Submitted"
    },
    notes: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Quotation", quotationSchema);
