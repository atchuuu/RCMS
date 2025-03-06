const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema({
    tenantId: { type: Number, ref: "Tenant", required: true },
    amountDue: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    upiId: { type: String, required: true },
    qrCodeData: { type: String, required: true },
    status: { type: String, enum: ["Pending", "Paid"], default: "Pending" },
    utrNumber: { type: String, default: null },
    paymentScreenshot: { type: String, default: null },
});

module.exports = mongoose.model("Invoice", invoiceSchema);
