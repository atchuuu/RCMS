const mongoose = require("mongoose");

const MaintenanceSchema = new mongoose.Schema({
  tid: {
    type: Number,
    required: true,
    index: true, // Index for faster queries by tenant ID
  },
  pgId: {
    type: String,
    required: true,
    index: true, // Index for faster queries by pgId
  },
  roomNo: {
    type: String,
    required: true,
  },
  mobileNumber: {
    type: String,
    default: null,
    unique: true,
    match: [/^\+\d{10,15}$/, "Please enter a valid mobile number with country code (e.g., +919876543210)"],
  },
  category: {
    type: String,
    required: true,
    enum: [
      "Air Conditioner",
      "Carpentry",
      "Desert Cooler/Air Cooler (Electrical)",
      "Desert Cooler/Air Cooler (Plumbing)",
      "Electricity",
      "Energy Meter",
      "Gas Welder",
      "Lift",
      "Marking",
      "Mason",
      "Plumbing",
      "Sewerage",
      "Tailor",
      "Water Cooler/Drinking Water (Cooling Issue)",
      "Water Cooler/Drinking Water (Electrical Issue)",
      "Water Cooler/Drinking Water (Plumbing Issue)",
      "Water Purifier / RO System",
      "Welding",
    ],
  },
  description: {
    type: String,
    required: true,
    trim: true, // Remove leading/trailing whitespace
  },
  status: {
    type: String,
    enum: ["Pending", "In Progress", "Completed", "Rejected"],
    default: "Pending",
  },
  availableDate: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now, // Track last update
  },
  remarks: {
    type: String,
    default: null,
    trim: true, // Remove leading/trailing whitespace
  },
  rating: {
    type: Number,
    default: null, // Null as default since not all requests will have ratings initially
    min: [1, "Rating must be at least 1"],
    max: [5, "Rating must not exceed 5"],
  },
  assignedTo: {
    type: String,
    default: null, // Optional field for tracking assigned worker
  },
});

// Pre-save middleware to update `updatedAt`
MaintenanceSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Pre-update middleware to update `updatedAt`
MaintenanceSchema.pre("findOneAndUpdate", function (next) {
  this.set({ updatedAt: Date.now() });
  next();
});

module.exports = mongoose.model("Maintenance", MaintenanceSchema);