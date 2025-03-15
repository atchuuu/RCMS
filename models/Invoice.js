const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema({
    pgId: { type: String, required: true },
    roomNo: { type: String, required: true },
    pgName: { type: String, required: true },
    tenantName: { type: String, required: true },
    rent: { type: Number, required: true }, // Added rent field
    maintenanceAmount: { type: Number, required: true }, // Added maintenance amount
    electricityPastMonth: { type: Number, required: true }, // Added electricity past month
    electricityPresentMonth: { type: Number, required: true }, // Added electricity present month
    dueElectricityBill: { type: Number, required: true }, // Added due electricity bill
    totalAmountDue: { type: Number, required: true }, // Total amount due
    dueDate: { type: Date, required: true },
    costPerUnit: { type: Number, required: true, default: 10 }, // Added cost per unit with default value 10
    upiId: { type: String },
    qrCodeImage: { type: String, required: true, default: "/.assets/upi_qr.png" },
    status: { type: String, default: "Pending" },
    utrNumber: { type: String, default: null },
    paymentScreenshot: { type: String, default: null }
});

module.exports = mongoose.model("Invoice", invoiceSchema);
