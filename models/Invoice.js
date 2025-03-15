const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema({
    pgId: { type: String, required: true },
    roomNo: { type: String, required: true },
    pgName: { type: String, required: true },
    tenantName: {type:String,required: true},
    amountDue: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    upiId: { type: String, },
    qrCodeImage: { type: String, required: true, default: "/.assets/upi_qr.png" }, // Ensure it has a default path
    status: { type: String, default: "Pending" },
    utrNumber: { type: String, default: null },
    paymentScreenshot: { type: String, default: null }
});

module.exports = mongoose.model("Invoice", invoiceSchema);
