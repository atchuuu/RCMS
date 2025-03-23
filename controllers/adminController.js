require("dotenv").config();
const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");
const Tenant = require("../models/Tenant");
const Transaction = require("../models/Transaction");

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

const getPendingTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ status: "Pending" });
    const tenants = await Tenant.find({}, "tid tname pgName roomNo pgId");
    console.log("Fetched Tenants:", tenants);
    const tenantMap = new Map(tenants.map((tenant) => [Number(tenant.tid), tenant]));
    console.log("Tenant Map:", Array.from(tenantMap.entries()));

    const pendingTransactions = transactions.map((txn) => {
      const tenant = tenantMap.get(txn.tid);
      console.log(`TID ${txn.tid}:`, tenant);
      return {
        _id: txn._id,
        tid: txn.tid,
        amount: txn.amount,
        utrNumber: txn.utrNumber,
        screenshotPath: txn.screenshotPath || "",
        paymentDate: txn.paymentDate,
        status: txn.status,
        tname: tenant?.tname || "Unknown",
        pgName: tenant?.pgName || "N/A",
        roomNo: tenant?.roomNo || "N/A",
        pgId: tenant?.pgId || "N/A",
      };
    });

    console.log("Pending Transactions:", pendingTransactions);
    res.json({ transactions: pendingTransactions });
  } catch (error) {
    console.error("Error fetching pending transactions:", error.message);
    res.status(500).json({ message: "Server error: " + error.message });
  }
};

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
    tenant.dueDate = new Date(transaction.nextDueDate || Date.now());
    await tenant.save();

    res.json({ message: "Transaction approved", transaction, tenant });
  } catch (error) {
    console.error("Error approving transaction:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find();
    const tenants = await Tenant.find({}, "tid tname pgName roomNo pgId");
    console.log("Fetched Tenants:", tenants);
    const tenantMap = new Map(tenants.map((tenant) => [Number(tenant.tid), tenant]));
    console.log("Tenant Map:", Array.from(tenantMap.entries()));

    const groupedTransactions = transactions.reduce((acc, txn) => {
      const tenant = tenantMap.get(txn.tid);
      console.log(`TID ${txn.tid}:`, tenant);
      const key = `${tenant?.pgName || "Unknown"}-${tenant?.pgId || "N/A"}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push({
        _id: txn._id,
        tid: txn.tid,
        amount: txn.amount,
        utrNumber: txn.utrNumber,
        screenshotPath: txn.screenshotPath || "",
        paymentDate: txn.paymentDate,
        status: txn.status,
        tname: tenant?.tname || "Unknown",
        pgName: tenant?.pgName || "N/A",
        roomNo: tenant?.roomNo || "N/A",
        pgId: tenant?.pgId || "N/A",
      });
      return acc;
    }, {});

    console.log("All Transactions:", groupedTransactions);
    res.json({ transactions: groupedTransactions });
  } catch (error) {
    console.error("Error fetching all transactions:", error.message);
    res.status(500).json({ message: "Server error: " + error.message });
  }
};

const addAdmin = async (req, res) => {
  try {
    const { email, name, password } = req.body;
    if (!email || !name || !password) {
      return res.status(400).json({ message: "Email, name, and password are required" });
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new Admin({ email, name, password: hashedPassword, role: "admin" });
    await newAdmin.save();

    res.status(201).json({
      message: "Admin added successfully",
      admin: { id: newAdmin._id, email: newAdmin.email, name: newAdmin.name },
    });
  } catch (error) {
    console.error("Error adding admin:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().select("email name role createdAt"); // Include name
    res.status(200).json(admins);
  } catch (error) {
    console.error("Error fetching admins:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const deleteAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    if (admin.role === "superadmin") {
      return res.status(403).json({ message: "Cannot delete a superadmin" });
    }

    await Admin.deleteOne({ _id: adminId });
    res.status(200).json({ message: "Admin deleted successfully" });
  } catch (error) {
    console.error("Error deleting admin:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getAdminProfile,
  verifyTenant,
  getPendingTransactions,
  approveTransaction,
  getAllTransactions,
  addAdmin,
  deleteAdmin,
  getAllAdmins,
};