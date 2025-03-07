const mongoose = require("mongoose");

const TenantSchema = new mongoose.Schema({
  tid: { type: Number, unique: true, required: true },
  tname: { type: String, required: true },
  mobileNumber: { type: String, required: true },
  pgName: { type: String, required: true },
  roomNo: { type: String, required: true },
  rent: { type: Number, required: true },
  documentsUploaded: { type: Boolean, default: false },
  idCardUploaded: { type: Boolean, default: false },
  securityAmount: { type: Number, required: true },
  maintenanceAmount: { type: Number, required: true, default: 500 },
  electricityPastMonth: { type: Number, default: 0 },
  electricityPresentMonth: { type: Number, default: 0 },
  dueElectricityBill: { type: Number, default: 0 },
  totalAmountDue: { type: Number, default: 0 },
  transactions: [
    {
      date: { type: Date, default: Date.now },
      amount: { type: Number, required: true },
      utrNumber: { type: String, required: true },
      status: { type: String, enum: ["Paid", "Pending"], default: "Paid" },
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model("Tenant", TenantSchema);
