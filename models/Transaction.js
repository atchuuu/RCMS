const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  tid: { type: Number, required: true }, // Changed from ObjectId to Number
  amount: { type: Number, required: true },
  utrNumber: { type: String, required: true },
  screenshotPath: String,
  paymentDate: { type: Date, default: Date.now },
  nextDueDate: Date,
  status: { type: String, enum: ['Pending', 'Approved', 'Paid', 'Rejected'], default: 'Pending' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Transaction', transactionSchema);