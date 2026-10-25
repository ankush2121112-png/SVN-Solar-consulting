const mongoose = require("mongoose");

const serviceTicketSchema = new mongoose.Schema(
  {
    ticketId: { type: String, unique: true, required: true },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false
    },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, required: true, trim: true },
    customerEmail: { type: String, default: "" },
    systemId: { type: String, default: "" },
    city: { type: String, default: "" },
    serviceType: {
      type: String,
      enum: [
        "Panel Cleaning",
        "Inverter Fault / Diagnostics",
        "Low Generation Investigation",
        "Wiring & Earthing Inspection",
        "Scheduled AMC Preventive Visit",
        "Emergency Breakdown"
      ],
      required: true
    },
    description: { type: String, required: true, trim: true, maxlength: 1000 },
    preferredDate: { type: String, default: "" },
    status: {
      type: String,
      enum: [
        "Booked",
        "Assigned to Vendor",
        "Site Visit Scheduled",
        "In Progress",
        "Completed",
        "Cancelled"
      ],
      default: "Booked"
    },
    assignedVendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    technicianNotes: { type: String, default: "" },
    completedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ServiceTicket", serviceTicketSchema);
