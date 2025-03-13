const mongoose = require("mongoose");

const enquirySchema = new mongoose.Schema({
    pgId: { type: String, required: true }, // Changed to String, no ref to "PG"
    pgName: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    mobile: { type: String, required: true },
    message: { type: String, required: true },
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Enquiry", enquirySchema);