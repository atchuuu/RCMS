const mongoose = require("mongoose");


const pgSchema = new mongoose.Schema({
    pgId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    address: { type: String, required: true },
    ownerName: { type: String, required: true },
    contact: { type: String, required: true },
    rent: { type: Number, default: 0 },
    vacantRooms: { type: Number, default: 0 },
    images: [{ type: String }],
    rooms: [{
        roomNo: { type: String, required: true }, // Room Number
        electricityPastMonth: { type: Number, default: 0 }, // Last Month's Reading
        electricityPresentMonth: { type: Number, default: 0 }, // Current Month's Reading
        maintenanceAmount: { type: Number, default: 0 } // Maintenance Fees
    }]
});

module.exports = mongoose.model("PG", pgSchema);
