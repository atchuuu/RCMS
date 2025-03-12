const mongoose = require("mongoose");

const TenantSchema = new mongoose.Schema({
  tid: { type: Number, unique: true },
  tname: { type: String },
  mobileNumber: { type: String,default:null, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  pgName: { type: String },
  roomNo: { type: String },
  rent: { type: Number },
  securityAmount: { type: Number },
  maintenanceAmount: { type: Number, default: 500 }, // Default value
  electricityPastMonth: { type: Number, default: 0 },
  electricityPresentMonth: { type: Number, default: 0 },
  dueElectricityBill: { type: Number, default: 0 },
  totalAmountDue: { type: Number, default: 0 },
  documentsUploaded: { type: Boolean, default: false },
  idCardUploaded: { type: Boolean, default: false },

  // ✅ New fields for document storage paths
  aadharCardPath: { type: String, default: null }, 
  idCardPath: { type: String, default: null }
});

module.exports = mongoose.model("Tenant", TenantSchema);
