const mongoose = require("mongoose");

const tenantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    rentDue: { type: Number, default: 0 },
    maintenanceDue: { type: Number, default: 0 },
    invoices: [{ type: mongoose.Schema.Types.ObjectId, ref: "Invoice" }],
    idProofs: { type: String }, // DigiLocker or manually uploaded
}, { timestamps: true });

module.exports = mongoose.model("Tenant", tenantSchema);
