const mongoose = require("mongoose");

const solarSystemSchema = new mongoose.Schema(
  {
    systemId: { type: String, unique: true, required: true },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false
    },
    customerEmail: { type: String, required: true, lowercase: true, trim: true },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, default: "" },
    city: { type: String, required: true, trim: true },
    capacityKw: { type: Number, required: true },
    systemType: {
      type: String,
      enum: ["Residential Rooftop", "Commercial On-Grid", "Industrial Rooftop", "Hybrid with Battery", "Solar Water Pump"],
      default: "Residential Rooftop"
    },
    panelBrand: { type: String, default: "Tier-1 Mono PERC Bifacial" },
    panelQuantity: { type: Number, default: 8 },
    inverterBrand: { type: String, default: "On-Grid String Inverter" },
    inverterCapacity: { type: String, default: "3 kW" },
    installationDate: { type: Date, default: Date.now },
    warrantyYears: { type: Number, default: 25 },
    inverterWarrantyYears: { type: Number, default: 5 },
    status: {
      type: String,
      enum: ["Active", "Maintenance Due", "Decommissioned"],
      default: "Active"
    },
    notes: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("SolarSystem", solarSystemSchema);
