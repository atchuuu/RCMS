const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: {type: String, required: true},
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ["admin", "superadmin"], 
    default: "admin" 
  },
}, { timestamps: true });


module.exports = mongoose.model("Admin", adminSchema);