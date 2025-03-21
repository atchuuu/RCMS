const mongoose = require("mongoose");

const MaintenanceSchema = new mongoose.Schema({
  tid: { 
    type: Number, 
    required: true, 
    index: true // Added index for faster queries by tenant ID
  },
  pgId: { 
    type: String, 
    required: true, 
    index: true // Replaces pgName, matches your pgId convention (e.g., "PG001")
  },
  roomNo: { 
    type: String, 
    required: true 
  },
  mobileNumber: { 
    type: String, 
    required: true, 
    match: [/^\d{10}$/, "Please enter a valid 10-digit mobile number"] // Validation for 10-digit phone
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
      "Welding"
    ]
  },
  description: { 
    type: String, 
    required: true, 
    trim: true // Remove leading/trailing whitespace
  },
  status: {
    type: String,
    enum: ["Pending", "In Progress", "Completed", "Rejected"],
    default: "Pending"
  },
  availableDate: { 
    type: Date, 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now // Added to track last update
  },
  remarks: { 
    type: String, 
    default: null, 
    trim: true 
  },
  rating: { 
    type: Number, 
    default: null, // Changed to null as default since not all requests will have ratings initially
    min: 1, 
    max: 5 
  },
  assignedTo: { 
    type: String, 
    default: null // Optional: Track who’s assigned to handle the request (e.g., worker name/ID)
  }
});

// Update `updatedAt` before saving
MaintenanceSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Update `updatedAt` before updates
MaintenanceSchema.pre("findOneAndUpdate", function (next) {
  this.set({ updatedAt: Date.now() });
  next();
});

module.exports = mongoose.model("Maintenance", MaintenanceSchema);