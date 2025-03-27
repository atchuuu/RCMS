const { required } = require("joi");
const mongoose = require("mongoose");

const TenantSchema = new mongoose.Schema({
  tid: { type: Number, unique: true },
  tname: { type: String },
  mobileNumber: { type: String, default: null, unique: true,match: /^\+\d{10,15}$/ },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  pgId: {type: String},
  pgName: { type: String },
  roomNo: { type: String },
  rent: { type: Number },
  securityAmount: { type: Number },
  firebaseUid: { type: String, required: true, unique: true },
  isVerified:{type: Boolean, required:true,default: false},
  maintenanceAmount: { type: Number, default: 500 },
  electricityPastMonth: { type: Number, default: 0 },
  electricityPresentMonth: { type: Number, default: 0 },
  dueElectricityBill: { type: Number, default: 0 },
  totalAmountDue: { type: Number, default: 0 },
  documentsUploaded: { type: Boolean, default: false },
  idCardUploaded: { type: Boolean, default: false },

  // ✅ New fields for storing documents
  aadharFrontPath: { type: String, default: null },
  aadharBackPath: { type: String, default: null },
  idCardPath: { type: String, default: null },
  // ✅ Transactions Array
  transactions: [
    {
      amount: { type: Number, required: true },
      date: { type: Date, default: Date.now },
      utrNumber: { type: String, required: true }
    }
  ]
});

module.exports = mongoose.model("Tenant", TenantSchema);
