const mongoose = require("mongoose");

const pgSchema = new mongoose.Schema({
    pgName: { type: String, required: true },
    address: { type: String, required: true },
    ownerName: { type: String, required: true },
    contact: { type: String, required: true },
    totalRooms: { type: Number, required: true },
    vacantRooms: { type: Number, required: true, default: 0 } // New field
});

module.exports = mongoose.model("PG", pgSchema);
