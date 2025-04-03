const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema({
  pgId: { type: String, required: true },
  roomNo: { type: String, required: true },
  pgName: { type: String, required: true },
  tenantName: { type: String, required: true },
  tid: { type: Number, required: true },
  invoiceNumber: { type: String, unique: true }, // New field for invoice number
  rent: { type: Number, required: true },
  maintenanceAmount: { type: Number, required: true },
  electricityPastMonth: { type: Number, required: true },
  electricityPresentMonth: { type: Number, required: true },
  inverterPastMonth: { type: Number, required: true },
  inverterPresentMonth: { type: Number, required: true },
  motorUnits: { type: Number, required: true, default: 0 },
  dueElectricityBill: { type: Number, required: true },
  totalAmountDue: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  costPerUnit: { type: Number, required: true, default: 10 },
  status: { type: String, default: "Pending" },
  utrNumber: { type: String, default: null },
  paymentScreenshot: { type: String, default: null },
  pdfPath: { type: String, required: true },
  generatedAt: { type: Date },
  paidAt: { type: Date },
});

module.exports = mongoose.model("Invoice", invoiceSchema);