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
        const admin = await Admin.findById(req.user.id).select("-password");
        if (!admin) return res.status(404).json({ message: "Admin not found" });

        res.json(admin);
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};

module.exports = {
    adminLogin,
    getAdminProfile,
};
