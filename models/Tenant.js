const mongoose = require("mongoose");

const TenantSchema = new mongoose.Schema({
  tid: { type: Number, unique: true },
  tname: { type: String },
  mobileNumber: { type: String, default: null, unique: true, match: /^\+\d{10,15}$/ },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  pgId: { type: String },
  pgName: { type: String },
  roomNo: { type: String },
  rent: { type: Number, default: 0 },
  securityAmount: { type: Number },
  firebaseUid: { type: String, unique: true },
  isVerified: { type: Boolean, required: true, default: false },
  emailVerified: { type: Boolean, default: false },
  mobileVerified: { type: Boolean, default: false },
  emailOtp: { type: String, default: null },
  electricityFine: { type: Number, default: 0 }, // New field for fine
  mainLastMonth: { type: Number, default: 0 }, // Added
  mainCurrentMonth: { type: Number, default: 0 }, // Added
  inverterLastMonth: { type: Number, default: 0 }, // Added
  inverterCurrentMonth: { type: Number, default: 0 }, // Added
  motorUnits: { type: Number, default: 0 }, // Added
  maintenanceAmount: { type: Number, default: 0 },
  dueElectricityBill: { type: Number, default: 0 },
  totalAmountDue: { type: Number, default: 0 },
  documentsUploaded: { type: Boolean, default: false },
  idCardUploaded: { type: Boolean, default: false },
  aadharFrontPath: { type: String, default: null },
  aadharBackPath: { type: String, default: null },
  idCardPath: { type: String, default: null },
  transactions: [
    {
      amount: { type: Number, required: true },
      date: { type: Date, default: Date.now },
      utrNumber: { type: String, required: true },
    },
  ],
});

module.exports = mongoose.model("Tenant", TenantSchema);