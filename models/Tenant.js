const mongoose = require("mongoose");

const TenantSchema = new mongoose.Schema({
  tid: { type: Number, unique: true, required: true }, // Tenant ID
  tname: { type: String, required: true }, // Tenant Name
  mobileNumber: { type: String, required: true }, // Mobile Number
  pgName: { type: String, required: true }, // PG Name
  roomNo: { type: String, required: true }, // Room Number
  rent: { type: Number, required: true }, // Rent Amount
  documentsUploaded: { type: Boolean, default: false }, // Document Upload Status
  idCardUploaded: { type: Boolean, default: false }, // ID Card Upload Status
  securityAmount: { type: Number, required: true }, // Security Deposit
  maintenanceAmount: { type: Number, required: true, default: 500 }, // Fixed Maintenance Fee
  electricityPastMonth: { type: Number, default: 0 }, // Previous Month Electricity Reading
  electricityPresentMonth: { type: Number, default: 0 }, // Current Month Electricity Reading
  dueElectricityBill: { type: Number, default: 0 }, // Electricity Bill Due
  totalAmountDue: { type: Number, default: 0 } // Total Amount Due (Rent + Maintenance + Electricity)
}, { timestamps: true });

module.exports = mongoose.model("Tenant", TenantSchema);
