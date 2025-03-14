// backend/models/Maintenance.js
const mongoose = require("mongoose");

const MaintenanceSchema = new mongoose.Schema({
  tid: { type: Number, required: true }, // Updated to Number to match Tenant
  pgName: { type: String, required: true },
  roomNo: { type: String, required: true },
  mobileNumber: { type: String, required: true },
  category: {
    type: String,
    required: true,
    enum: [
      "Air Conditioner", "Carpentry", "Desert Cooler/Air Cooler (Electrical)",
      "Desert Cooler/Air Cooler (Plumbing)", "Electricity", "Energy Meter", "Gas Welder",
      "Lift", "Marking", "Mason", "Plumbing", "Sewerage", "Tailor",
      "Water Cooler/Drinking water (Cooling Issue)", "Water Cooler/Drinking water (Electrical Issue)",
      "Water Cooler/Drinking water (Plumbing Issue)", "Water Purifier / RO System", "Welding"
    ],
  },
  description: { type: String, required: true },
  status: {
    type: String,
    enum: ["Pending", "In Progress", "Completed", "Rejected"],
    default: "Pending",
  },
  availableDate: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  remarks: { type: String ,default:null}, // New field for feedback comments
  rating: { type: Number, default:1,min: 1, max: 5 }, // New field for rating (1-5)
});

module.exports = mongoose.model("Maintenance", MaintenanceSchema);