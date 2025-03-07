const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema({
  tid: { type: Number, required: true }, // Tenant ID
  amountPaid: { type: Number, required: true }, // Amount Paid
  utrNumber: { type: String, required: true, unique: true }, // UTR Number
  paymentDate: { type: Date, default: Date.now }, // Payment Date
  status: { type: String, enum: ["Paid", "Pending"], default: "Paid" } // Payment Status
}, { timestamps: true });

module.exports = mongoose.model("Transaction", TransactionSchema);
