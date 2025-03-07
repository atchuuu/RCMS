const mongoose = require("mongoose");

const pgSchema = new mongoose.Schema({
    pgId: { type: String, required: true, unique: true }, // Custom PG ID
    name: { type: String, required: true },
    rent: {type:Number, default:0},
    address: { type: String, required: true },
    ownerName: { type: String, required: true },
    contact: { type: String, required: true },
    vacantRooms: { type: Number, default: 0 } // Added vacant rooms field
});

module.exports = mongoose.model("PG", pgSchema);
