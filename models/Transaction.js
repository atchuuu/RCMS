const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  tid: { type: Number, required: true },
  amount: { type: Number, required: true },
  utrNumber: { type: String, required: true, unique: true },
  screenshotPath: { type: String, required: true },
  paymentDate: { type: Date, default: Date.now },
  nextDueDate: { type: Date, required: true },
  status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
}, { timestamps: true });

module.exports = mongoose.model("Transaction", transactionSchema);