const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 160
    },
    phone: { type: String, trim: true, maxlength: 20, default: "" },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["customer", "vendor", "admin"],
      required: true,
      default: "customer"
    },
    companyName: { type: String, trim: true, maxlength: 160, default: "" },
    serviceAreas: { type: [String], default: [] },
    serviceTypes: { type: [String], default: [] },
    vendorVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
