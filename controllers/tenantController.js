const Tenant = require("../models/Tenant");
const Transaction = require("../models/Transaction");
const Invoice = require("../models/Invoice");
const bcrypt = require("bcryptjs"); // Use bcryptjs instead of bcrypt for consistency
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");
const fsExtra = require("fs-extra");
const admin = require("firebase-admin"); // Firebase Admin SDK
require("dotenv").config();

// Initialize Firebase Admin SDK
const serviceAccount = require("../serviceAccountKey.json"); // Adjust the path to your service account key file
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const addTenant = async (req, res) => {
  try {
    const { tname, email, mobileNumber, password, idToken } = req.body;

    // Validate required fields
    if (!tname || !email || !mobileNumber || !password || !idToken) {
      return res.status(400).json({ message: "All fields are required: tname, email, mobileNumber, password, idToken" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Validate mobile number format (e.g., +919876543210)
    const mobileRegex = /^\+\d{10,15}$/;
    if (!mobileRegex.test(mobileNumber)) {
      return res.status(400).json({ message: "Invalid mobile number format. Must include country code (e.g., +919876543210)" });
    }

    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Check if the mobile number matches the one in the token
    if (decodedToken.phone_number !== mobileNumber) {
      return res.status(400).json({ message: "Mobile number does not match authenticated user" });
    }

    // Check if tenant already exists
    const existingTenant = await Tenant.findOne({
      $or: [{ email }, { mobileNumber }],
    });
    if (existingTenant) {
      return res.status(400).json({ message: "Tenant with this email or mobile number already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate a unique tid (e.g., increment based on the last tenant)
    const lastTenant = await Tenant.findOne().sort({ tid: -1 });
    const newTid = lastTenant ? lastTenant.tid + 1 : 1000;

    // Save the tenant to the database
    const newTenant = new Tenant({
      tid: newTid,
      tname,
      email,
      mobileNumber,
      password: hashedPassword,
      firebaseUid: uid,
    });
    await newTenant.save();

    res.status(201).json({ message: "Tenant created successfully", tid: newTid });
  } catch (error) {
    console.error("Error adding tenant:", error);
    res.status(500).json({ message: "Server error: " + error.message });
  }
};

const getAllTenants = async (req, res) => {
  try {
    const tenants = await Tenant.find();
    res.status(200).json(tenants);
  } catch (error) {
    res.status(500).json({ message: "Error fetching tenants" });
  }
};

const updateTenant = async (req, res) => {
  try {
    const { tid } = req.params;
    const updatedTenant = await Tenant.findOneAndUpdate({ tid }, req.body, { new: true });
    if (!updatedTenant) return res.status(404).json({ message: "Tenant not found" });
    res.json({ success: true, message: "Tenant updated successfully", tenant: updatedTenant });
  } catch (error) {
    res.status(500).json({ message: "Error updating tenant" });
  }
};

const deleteTenant = async (req, res) => {
  try {
    const { tid } = req.params;
    const deletedTenant = await Tenant.findOneAndDelete({ tid });
    if (!deletedTenant) return res.status(404).json({ message: "Tenant not found" });
    res.json({ success: true, message: "Tenant deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting tenant" });
  }
};

const getTenantTransactions = async (req, res) => {
  try {
    const { tid } = req.params;

    if (parseInt(tid) !== req.user.tid) {
      return res.status(403).json({ message: "Unauthorized: TID does not match token" });
    }

    const tenant = await Tenant.findOne({ tid }, { transactions: 1, _id: 0 });
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    const sortedTransactions = tenant.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.status(200).json({ transactions: sortedTransactions });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

const getTenantDashboard = async (req, res) => {
  try {
    const tenant = await Tenant.findOne({ tid: req.user.tid }).populate("invoices");
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    res.json({
      name: tenant.tname,
      mobile: tenant.mobileNumber,
      rentDue: tenant.totalAmountDue,
      maintenanceDue: tenant.maintenanceAmount,
      invoices: tenant.invoices,
      idProofs: tenant.idCardUploaded,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTenantProfile = async (req, res) => {
  try {
    const tenant = await Tenant.findOne({ tid: req.user.tid });
    if (!tenant) {
      return res.status(404).json({ success: false, message: "Tenant not found" });
    }
    res.status(200).json(tenant);
  } catch (error) {
    console.error("Error fetching tenant profile:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const tenantLogin = async (req, res) => {
  try {
    const { email, mobileNumber, password } = req.body;

    if (!password || (!email && !mobileNumber)) {
      return res.status(400).json({ message: "Email or mobile number and password are required" });
    }

    const tenant = await Tenant.findOne({
      $or: [{ email }, { mobileNumber }],
    });

    if (!tenant) {
      console.log("❌ No tenant found for email:", email, "or mobile:", mobileNumber);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, tenant.password);
    if (!isMatch) {
      console.log("❌ Password mismatch for tenant:", tenant._id);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { tenantId: tenant.tid, email: tenant.email, role: "tenant", pgName: tenant.pgName, roomNo: tenant.roomNo },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "✅ Login successful",
      token,
      tenant: {
        tid: tenant.tid,
        tname: tenant.tname,
        email: tenant.email,
        mobileNumber: tenant.mobileNumber,
        pgName: tenant.pgName,
        roomNo: tenant.roomNo,
        documentsUploaded: tenant.documentsUploaded,
        idCardUploaded: tenant.idCardUploaded,
        isVerified: tenant.isVerified,
      },
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

const uploadDocuments = async (req, res) => {
  try {
    const { pgName, roomNo } = req.body;
    const tname = req.user.tname;

    if (!tname || !pgName || !roomNo) {
      return res.status(400).json({ success: false, message: "Missing required fields: tname, pgName, or roomNo" });
    }

    if (!req.files || !req.files["aadharFront"] || !req.files["aadharBack"] || !req.files["idCard"]) {
      return res.status(400).json({ success: false, message: "Aadhar Front, Back, and ID Card must be uploaded" });
    }

    const baseDocPath = path.join(__dirname, "../documents");
    const aadharFrontFolder = path.join(baseDocPath, "aadhar", pgName, "front");
    const aadharBackFolder = path.join(baseDocPath, "aadhar", pgName, "back");
    const idCardFolder = path.join(baseDocPath, "idcard", pgName);

    const fileExtAadharFront = path.extname(req.files["aadharFront"][0].originalname);
    const fileExtAadharBack = path.extname(req.files["aadharBack"][0].originalname);
    const fileExtId = path.extname(req.files["idCard"][0].originalname);

    const aadharFrontFileName = `${tname}+${roomNo}${fileExtAadharFront}`;
    const aadharBackFileName = `${tname}+${roomNo}${fileExtAadharBack}`;
    const idCardFileName = `${tname}+${roomNo}${fileExtId}`;

    await fsExtra.ensureDir(aadharFrontFolder);
    await fsExtra.move(req.files["aadharFront"][0].path, path.join(aadharFrontFolder, aadharFrontFileName), { overwrite: true });

    await fsExtra.ensureDir(aadharBackFolder);
    await fsExtra.move(req.files["aadharBack"][0].path, path.join(aadharBackFolder, aadharBackFileName), { overwrite: true });

    await fsExtra.ensureDir(idCardFolder);
    await fsExtra.move(req.files["idCard"][0].path, path.join(idCardFolder, idCardFileName), { overwrite: true });

    const updateData = {
      documentsUploaded: true,
      idCardUploaded: true,
      aadharFrontPath: path.join("documents", "aadhar", pgName, "front", aadharFrontFileName),
      aadharBackPath: path.join("documents", "aadhar", pgName, "back", aadharBackFileName),
      idCardPath: path.join("documents", "idcard", pgName, idCardFileName),
      pgName,
      roomNo,
    };

    const updatedTenant = await Tenant.findOneAndUpdate(
      { tid: req.user.tid },
      { $set: updateData },
      { new: true }
    );

    res.status(200).json({ success: true, message: "Documents uploaded successfully!", updatedTenant });
  } catch (error) {
    console.error("Error in uploadDocuments:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

const getTransactions = async (req, res) => {
  try {
    const { tid } = req.params;

    if (parseInt(tid) !== req.user.tid) {
      return res.status(403).json({ message: "Unauthorized: TID does not match token" });
    }

    const transactions = await Transaction.find({ tid });
    res.json({ transactions });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const addTransaction = async (req, res) => {
  try {
    if (parseInt(req.params.tid) !== req.user.tid) {
      return res.status(403).json({ message: "Unauthorized: TID does not match token" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Screenshot is required" });
    }

    const { utrNumber, amount, date, nextDueDate } = req.body;

    const tenant = await Tenant.findOne({ tid: req.user.tid });
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }
    if (!tenant.pgName || !tenant.roomNo) {
      return res.status(400).json({ message: "Tenant pgName or roomNo missing" });
    }

    const baseScreenshotPath = path.join(__dirname, "../uploads/payment_screenshots");
    const screenshotFolder = path.join(baseScreenshotPath, tenant.pgName, tenant.roomNo);

    const fileExt = path.extname(req.file.originalname);
    const paymentDate = date ? new Date(date) : new Date();
    const month = paymentDate.toLocaleString("default", { month: "long" }).toLowerCase();
    const screenshotFileName = `${month}${fileExt}`;
    const screenshotPath = path.join(screenshotFolder, screenshotFileName);

    await fsExtra.ensureDir(screenshotFolder);
    await fsExtra.move(req.file.path, screenshotPath, { overwrite: true });

    const relativeScreenshotPath = path.join("uploads", "payment_screenshots", tenant.pgName, tenant.roomNo, screenshotFileName);

    const transaction = new Transaction({
      tid: req.user.tid,
      amount,
      utrNumber,
      screenshotPath: relativeScreenshotPath,
      paymentDate: date,
      nextDueDate,
    });

    await transaction.save();

    if (!tenant.transactions) {
      tenant.transactions = [];
    }

    tenant.transactions.push({
      amount: parseFloat(amount),
      date: new Date(date),
      utrNumber,
    });
    tenant.dueDate = new Date(nextDueDate);
    await tenant.save();

    res.status(201).json({ transaction });
  } catch (error) {
    console.error("Transaction error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  tenantLogin,
  addTenant,
  getAllTenants,
  updateTenant,
  deleteTenant,
  getTenantTransactions,
  getTenantDashboard,
  getTenantProfile,
  uploadDocuments,
  addTransaction,
  getTransactions,
};