const Tenant = require("../models/Tenant");
const Transaction = require("../models/Transaction");
const Invoice = require("../models/Invoice");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");
const fsExtra = require("fs-extra");
const admin = require("firebase-admin");
require("dotenv").config();

// Initialize Firebase Admin SDK
const serviceAccount = require("../serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const addTenant = async (req, res) => {
  try {
    const { tname, email, mobileNumber, password, idToken } = req.body;

    if (!tname || !email || !mobileNumber || !password || !idToken) {
      return res.status(400).json({ message: "All fields are required: tname, email, mobileNumber, password, idToken" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const mobileRegex = /^\+\d{10,15}$/;
    if (!mobileRegex.test(mobileNumber)) {
      return res.status(400).json({ message: "Invalid mobile number format. Must include country code (e.g., +919876543210)" });
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    if (decodedToken.phone_number !== mobileNumber) {
      return res.status(400).json({ message: "Mobile number does not match authenticated user" });
    }

    const existingTenant = await Tenant.findOne({
      $or: [{ email }, { mobileNumber }],
    });
    if (existingTenant) {
      return res.status(400).json({ message: "Tenant with this email or mobile number already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const lastTenant = await Tenant.findOne().sort({ tid: -1 });
    const newTid = lastTenant ? lastTenant.tid + 1 : 1000;

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
    res.status(500).json({ message: "Server error: " + error.message });
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

const checkMobile = async (req, res) => {
  try {
    const { mobileNumber } = req.body;

    if (!mobileNumber) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    const tenant = await Tenant.findOne({ mobileNumber });
    if (!tenant) {
      return res.status(404).json({ message: "No tenant found with this mobile number" });
    }

    res.status(200).json({ message: "Mobile number found" });
  } catch (error) {
    console.error("Error checking mobile number:", error);
    res.status(500).json({ message: "Server error: " + error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { mobileNumber, newPassword } = req.body;

    if (!mobileNumber || !newPassword) {
      return res.status(400).json({ message: "Mobile number and new password are required" });
    }

    const tenant = await Tenant.findOne({ mobileNumber });
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await Tenant.updateOne(
      { mobileNumber },
      { $set: { password: hashedPassword } }
    );

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ message: "Server error: " + error.message });
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

const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "Old password and new password are required" });
    }

    const tenant = await Tenant.findOne({ tid: req.user.tid });
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    const isMatch = await bcrypt.compare(oldPassword, tenant.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect old password" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters long" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    tenant.password = hashedPassword;
    await tenant.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ message: "Server error: " + error.message });
  }
};

const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: "ID token is required" });
    }

    // Verify the Google ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { email, name } = decodedToken;

    // Check if tenant exists by email
    let tenant = await Tenant.findOne({ email });

    if (!tenant) {
      // Create a new tenant if not found
      const lastTenant = await Tenant.findOne().sort({ tid: -1 });
      const newTid = lastTenant ? lastTenant.tid + 1 : 1000;

      tenant = new Tenant({
        tid: newTid,
        tname: name || email.split("@")[0], // Use Google name or derive from email
        email,
        mobileNumber: null, // Initially null, to be updated later
        password: await bcrypt.hash(Math.random().toString(36).slice(-8), 10), // Random password since Google login doesn’t use it
        isVerified: false, // New tenant starts unverified
        firebaseUid: decodedToken.uid,
      });
      await tenant.save();
    }

    // Generate JWT token
    const token = jwt.sign(
      { tenantId: tenant.tid, email: tenant.email, role: "tenant", pgName: tenant.pgName, roomNo: tenant.roomNo },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Return tenant data and token
    res.status(200).json({
      message: "✅ Google login successful",
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
    console.error("Google Login Error:", error);
    res.status(500).json({ message: "Server error: " + error.message });
  }
};
const updateMobile = async (req, res) => {
  try {
    const { mobileNumber, newPassword } = req.body;
    const tenantId = req.user.tid; // Extracted from JWT via verifyToken middleware

    if (!mobileNumber) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    const mobileRegex = /^\+\d{10,15}$/;
    if (!mobileRegex.test(mobileNumber)) {
      return res.status(400).json({ message: "Invalid mobile number format. Must include country code (e.g., +919876543210)" });
    }

    // Check if mobile number is already in use by another tenant
    const existingTenant = await Tenant.findOne({ mobileNumber });
    if (existingTenant && existingTenant.tid !== tenantId) {
      return res.status(400).json({ message: "Mobile number is already associated with another tenant" });
    }

    // Find the tenant
    const tenant = await Tenant.findOne({ tid: tenantId });
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    // Update mobile number
    tenant.mobileNumber = mobileNumber;

    // Update password if provided
    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters long" });
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      tenant.password = hashedPassword;
    }

    await tenant.save();

    // Generate a new JWT token with updated data
    const token = jwt.sign(
      { tenantId: tenant.tid, email: tenant.email, role: "tenant", pgName: tenant.pgName, roomNo: tenant.roomNo },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Return updated tenant data and token
    res.status(200).json({
      message: "✅ Profile updated successfully",
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
    console.error("Update Mobile Error:", error);
    res.status(500).json({ message: "Server error: " + error.message });
  }
};


const updateTenant = async (req, res) => {
  try {
    const { tid } = req.params;
    const { email, mobileNumber, ...updates } = req.body;

    const tenant = await Tenant.findOne({ tid });
    if (!tenant) return res.status(404).json({ message: "Tenant not found" });

    const emailChanged = email && email !== tenant.email;
    const mobileChanged = mobileNumber && mobileNumber !== tenant.mobileNumber;

    if (emailChanged && !tenant.emailVerified) {
      return res.status(400).json({ message: "Email must be verified before updating" });
    }
    if (mobileChanged && !tenant.mobileVerified) {
      return res.status(400).json({ message: "Mobile number must be verified before updating" });
    }

    if (emailChanged) tenant.email = email;
    if (mobileChanged) tenant.mobileNumber = mobileNumber;
    Object.assign(tenant, updates);

    await tenant.save();

    const token = jwt.sign(
      { tenantId: tenant.tid, email: tenant.email, role: "tenant", pgName: tenant.pgName, roomNo: tenant.roomNo },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Tenant updated successfully",
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
        emailVerified: tenant.emailVerified,
        mobileVerified: tenant.mobileVerified,
      },
    });
  } catch (error) {
    console.error("Update Tenant Error:", error);
    res.status(500).json({ message: "Error updating tenant: " + error.message });
  }
};
// Add these dependencies at the top if not already present
const nodemailer = require("nodemailer");

// Email transport configuration (update with your SMTP details)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Generate OTP
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// Send Email OTP
const sendEmailOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const tenantId = req.user.tid;

    const tenant = await Tenant.findOne({ tid: tenantId });
    if (!tenant) return res.status(404).json({ message: "Tenant not found" });
    if (tenant.emailVerified) return res.status(400).json({ message: "Email already verified" });

    const otp = generateOtp();
    tenant.emailOtp = otp; // Assuming you add an `emailOtp` field to the Tenant schema temporarily
    await tenant.save();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Email Verification OTP",
      text: `Your OTP for email verification is: ${otp}. It expires in 10 minutes.`,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Email OTP sent successfully" });
  } catch (error) {
    console.error("Send Email OTP Error:", error);
    res.status(500).json({ message: "Server error: " + error.message });
  }
};

// Verify Email OTP
const verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const tenantId = req.user.tid;

    const tenant = await Tenant.findOne({ tid: tenantId });
    if (!tenant) return res.status(404).json({ message: "Tenant not found" });
    if (tenant.emailVerified) return res.status(400).json({ message: "Email already verified" });

    if (tenant.emailOtp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    tenant.emailVerified = true;
    tenant.emailOtp = null; // Clear OTP after verification
    tenant.email = email;
    await tenant.save();

    const token = jwt.sign(
      { tenantId: tenant.tid, email: tenant.email, role: "tenant", pgName: tenant.pgName, roomNo: tenant.roomNo },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "Email verified successfully",
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
        emailVerified: tenant.emailVerified,
        mobileVerified: tenant.mobileVerified,
      },
    });
  } catch (error) {
    console.error("Verify Email OTP Error:", error);
    res.status(500).json({ message: "Server error: " + error.message });
  }
};

// Adjust existing sendVerification (remove email handling)
const sendVerification = async (req, res) => {
  try {
    const { field, value } = req.body;
    const tenantId = req.user.tid;

    if (field !== "mobileNumber") {
      return res.status(400).json({ message: "Invalid field for this endpoint. Use /send-email-otp for email." });
    }

    const tenant = await Tenant.findOne({ tid: tenantId });
    if (!tenant) return res.status(404).json({ message: "Tenant not found" });
    if (tenant.mobileVerified) return res.status(400).json({ message: "Mobile number already verified" });

    res.status(200).json({ message: "Verification process initiated for mobileNumber", field, value });
  } catch (error) {
    console.error("Send Verification Error:", error);
    res.status(500).json({ message: "Server error: " + error.message });
  }
};

// Existing verifyOtp (unchanged, already correct for mobile)
const verifyOtp = async (req, res) => {
  try {
    const { field, idToken } = req.body;
    const tenantId = req.user.tid;

    if (!["mobileNumber"].includes(field)) {
      return res.status(400).json({ message: "Invalid field for this endpoint. Use /verify-email-otp for email." });
    }

    const tenant = await Tenant.findOne({ tid: tenantId });
    if (!tenant) return res.status(404).json({ message: "Tenant not found" });

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const firebaseUid = decodedToken.uid;

    if (firebaseUid !== tenant.firebaseUid) {
      return res.status(403).json({ message: "Unauthorized: Firebase UID mismatch" });
    }

    if (field === "mobileNumber" && decodedToken.phone_number) {
      tenant.mobileVerified = true;
      tenant.mobileNumber = decodedToken.phone_number;
    } else {
      return res.status(400).json({ message: "Mobile number not verified in Firebase" });
    }

    await tenant.save();

    const token = jwt.sign(
      { tenantId: tenant.tid, email: tenant.email, role: "tenant", pgName: tenant.pgName, roomNo: tenant.roomNo },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "Mobile number verified successfully",
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
        emailVerified: tenant.emailVerified,
        mobileVerified: tenant.mobileVerified,
      },
    });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    res.status(500).json({ message: "Server error: " + error.message });
  }
};

// Update exports to include new endpoints
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
  checkMobile,
  resetPassword,
  changePassword,
  googleLogin,
  updateMobile,
  sendVerification,
  verifyOtp,
  sendEmailOtp,
  verifyEmailOtp,
};