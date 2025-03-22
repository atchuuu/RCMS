require("dotenv").config(); // Load .env variables
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");
const Tenant = require("../models/Tenant");
const Transaction = require("../models/Transaction");

// 🟢 Admin Login
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // ✅ Generate JWT Token
    const token = jwt.sign({ id: admin._id, role: "admin" }, process.env.JWT_SECRET, {
      expiresIn: "7d", // 7 days expiry
    });

    res.json({ token, admin: { id: admin._id, email: admin.email } });
  } catch (error) {
    console.error("Admin login error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Get Admin Profile
const getAdminProfile = async (req, res) => {
  try {
    if (!req.user || (!req.user.id && !req.user._id)) {
      console.log("No user ID found in token");
      return res.status(401).json({ message: "Unauthorized: Invalid or missing user ID in token" });
    }

    const userId = req.user.id || req.user._id;
    console.log("Decoded Token User ID:", userId);

    const admin = await Admin.findById(userId).select("-password");
    if (!admin) {
      console.log("Admin not found for ID:", userId);
      return res.status(404).json({ message: "Admin not found" });
    }

    console.log("Admin found:", admin);
    res.status(200).json(admin);
  } catch (error) {
    console.error("Error fetching admin profile:", error.message);
    res.status(500).json({ message: "Server error while fetching admin profile", error: error.message });
  }
};

// 🟢 Verify Tenant
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
    console.error("Error verifying tenant:", error.message);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// 🟢 Get Pending Transactions
const getPendingTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ status: "Pending" }).populate("tid", "tname pgName roomNo");
    res.json({ transactions });
  } catch (error) {
    console.error("Error fetching pending transactions:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 🟢 Approve Transaction
const approveTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    if (transaction.status !== "Pending") {
      return res.status(400).json({ message: "Transaction already processed" });
    }

    transaction.status = "Approved";
    await transaction.save();

    const tenant = await Tenant.findOne({ tid: transaction.tid });
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    tenant.totalAmountDue = Math.max(0, tenant.totalAmountDue - transaction.amount);
    tenant.dueDate = new Date(transaction.nextDueDate);
    await tenant.save();

    res.json({ message: "Transaction approved", transaction, tenant });
  } catch (error) {
    console.error("Error approving transaction:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  adminLogin,
  getAdminProfile,
  verifyTenant,
  getPendingTransactions,
  approveTransaction,
};