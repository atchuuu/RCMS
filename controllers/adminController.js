require("dotenv").config();  // Make sure to load .env variables
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");

// 🟢 **Admin Login**
const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await Admin.findOne({ email });

        if (!admin) return res.status(404).json({ message: "Admin not found" });

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        // ✅ Generate JWT Token
        const token = jwt.sign({ id: admin._id, role: "admin" }, process.env.JWT_SECRET, {
            expiresIn: "7d",  // 7 days expiry
        });

        res.json({ token, admin: { id: admin._id, email: admin.email } });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};

// ✅ **Get Admin Profile**
const getAdminProfile = async (req, res) => {
    try {
      // Check if req.user and req.user.id (or req.user._id) are defined
      if (!req.user || (!req.user.id && !req.user._id)) {
        console.log("No user ID found in token");
        return res.status(401).json({ message: "Unauthorized: Invalid or missing user ID in token" });
      }
  
      // Use req.user.id if available, otherwise fall back to req.user._id
      const userId = req.user.id || req.user._id;
      console.log("Decoded Token User ID:", userId); // Debugging line
  
      // Fetch the admin by ID, excluding the password
      const admin = await Admin.findById(userId).select("-password");
      if (!admin) {
        console.log("Admin not found for ID:", userId);
        return res.status(404).json({ message: "Admin not found" });
      }
  
      console.log("Admin found:", admin); // Debugging line
      res.status(200).json(admin);
    } catch (error) {
      console.error("Error fetching admin profile:", error.message); // Log the error message
      res.status(500).json({ message: "Server error while fetching admin profile", error: error.message });
    }
  };
const verifyTenant = async (req, res) => {
    try {
      const { tenantId } = req.params;
  
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        return res.status(404).json({ success: false, message: "Tenant not found" });
      }
  
      tenant.isVerified = true;
      await tenant.save();
  
      res.json({ success: true, message: "Tenant verified successfully" });
    } catch (error) {
      console.error("Error verifying tenant:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  };
  
module.exports = {
    adminLogin,
    getAdminProfile,
    verifyTenant,
};
