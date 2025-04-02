const mongoose = require("mongoose");

const pgSchema = new mongoose.Schema({
  pgId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  address: { type: String, required: true },
  ownerName: { type: String, required: true },
  contact: { type: String },
  rent: { type: Number, default: 0 },
  vacantRooms: { type: Number, default: 0 },
  costPerUnit: { type: Number, default: 13 }, // Added costPerUnit with default 13
  images: [{ type: String }],
  rooms: [{
    roomNo: { type: String, required: true },
    mainLastMonth: { type: Number, default: 0 },
    mainCurrentMonth: { type: Number, default: 0 },
    inverterLastMonth: { type: Number, default: 0 },
    inverterCurrentMonth: { type: Number, default: 0 },
    motorUnits: { type: Number, default: 0 },
    maintenanceAmount: { type: Number, default: 0 },
  }],
});

module.exports = mongoose.model("PG", pgSchema);