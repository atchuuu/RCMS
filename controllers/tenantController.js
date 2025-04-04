const Tenant = require("../models/Tenant");
const Transaction = require("../models/Transaction");
const Invoice = require("../models/Invoice");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");
const fsExtra = require("fs-extra");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
require("dotenv").config();

// Initialize Firebase Admin SDK
const serviceAccount = require("../serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Email transport configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

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

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { email, name } = decodedToken;

    let tenant = await Tenant.findOne({ email });

    if (!tenant) {
      const lastTenant = await Tenant.findOne().sort({ tid: -1 });
      const newTid = lastTenant ? lastTenant.tid + 1 : 1000;

      tenant = new Tenant({
        tid: newTid,
        tname: name || email.split("@")[0],
        email,
        mobileNumber: null,
        password: await bcrypt.hash(Math.random().toString(36).slice(-8), 10),
        isVerified: false,
        firebaseUid: decodedToken.uid,
      });
      await tenant.save();
    }

    const token = jwt.sign(
      { tenantId: tenant.tid, email: tenant.email, role: "tenant", pgName: tenant.pgName, roomNo: tenant.roomNo },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

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
    const tenantId = req.user.tid;

    if (!mobileNumber) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    const mobileRegex = /^\+\d{10,15}$/;
    if (!mobileRegex.test(mobileNumber)) {
      return res.status(400).json({ message: "Invalid mobile number format. Must include country code (e.g., +919876543210)" });
    }

    const existingTenant = await Tenant.findOne({ mobileNumber });
    if (existingTenant && existingTenant.tid !== tenantId) {
      return res.status(400).json({ message: "Mobile number is already associated with another tenant" });
    }

    const tenant = await Tenant.findOne({ tid: tenantId });
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    tenant.mobileNumber = mobileNumber;

    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters long" });
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      tenant.password = hashedPassword;
    }

    await tenant.save();

    const token = jwt.sign(
      { tenantId: tenant.tid, email: tenant.email, role: "tenant", pgName: tenant.pgName, roomNo: tenant.roomNo },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

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
    const updates = req.body;

    // Fetch the current tenant data to compare
    const currentTenant = await Tenant.findOne({ tid });
    if (!currentTenant) return res.status(404).json({ success: false, message: "Tenant not found" });

    // Reset verification statuses if email or mobile changes
    if (updates.email && updates.email !== currentTenant.email) {
      updates.emailVerified = false;
      updates.emailOtp = null; // Clear any existing OTP
    }
    if (updates.mobileNumber && updates.mobileNumber !== currentTenant.mobileNumber) {
      updates.mobileVerified = false;
    }

    // Validate email format if provided
    if (updates.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updates.email)) {
        return res.status(400).json({ success: false, message: "Invalid email format" });
      }
      const existingEmail = await Tenant.findOne({ email: updates.email, tid: { $ne: tid } });
      if (existingEmail) {
        return res.status(400).json({ success: false, message: "Email already in use by another tenant" });
      }
    }

    // Validate mobile number format if provided
    if (updates.mobileNumber) {
      const mobileRegex = /^\+\d{10,15}$/;
      if (!mobileRegex.test(updates.mobileNumber)) {
        return res.status(400).json({ success: false, message: "Invalid mobile number format. Must include country code (e.g., +919876543210)" });
      }
      const existingMobile = await Tenant.findOne({ mobileNumber: updates.mobileNumber, tid: { $ne: tid } });
      if (existingMobile) {
        return res.status(400).json({ success: false, message: "Mobile number already in use by another tenant" });
      }
    }

    const tenant = await Tenant.findOneAndUpdate(
      { tid },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!tenant) return res.status(404).json({ success: false, message: "Tenant not found" });

    // Generate a new token with updated tenant data
    const token = jwt.sign(
      { tenantId: tenant.tid, email: tenant.email, role: "tenant", pgName: tenant.pgName, roomNo: tenant.roomNo },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      success: true,
      message: "Tenant updated successfully",
      tenant,
      token,
    });
  } catch (error) {
    console.error("Update Tenant Error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

const sendEmailOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const tenantId = req.user.tid;

    const tenant = await Tenant.findOne({ tid: tenantId });
    if (!tenant) return res.status(404).json({ message: "Tenant not found" });

    const otp = generateOtp();
    tenant.emailOtp = otp;
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
    tenant.emailOtp = null;
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

const sendVerification = async (req, res) => {
  try {
    const { field, value } = req.body;
    const tenantId = req.user.tid;

    if (field !== "mobileNumber") {
      return res.status(400).json({ message: "Invalid field for this endpoint. Use /send-email-otp for email." });
    }

    const tenant = await Tenant.findOne({ tid: tenantId });
    if (!tenant) return res.status(404).json({ message: "Tenant not found" });

    res.status(200).json({ message: "Verification process initiated for mobileNumber", field, value });
  } catch (error) {
    console.error("Send Verification Error:", error);
    res.status(500).json({ message: "Server error: " + error.message });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { field, idToken } = req.body;
    const tenantId = req.user.tid;

    if (field !== "mobileNumber") {
      return res.status(400).json({ message: "Invalid field for this endpoint. Use /verify-email-otp for email." });
    }

    const tenant = await Tenant.findOne({ tid: tenantId });
    if (!tenant) return res.status(404).json({ message: "Tenant not found" });

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const phoneNumber = decodedToken.phone_number;

    if (!phoneNumber) {
      return res.status(400).json({ message: "Mobile number not verified in Firebase" });
    }

    tenant.mobileVerified = true;
    tenant.mobileNumber = phoneNumber;
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
const resetTenantBilling = async (req, res) => {
  try {
    const { tid } = req.params;
    const tenant = await Tenant.findOne({ tid });
    if (!tenant) return res.status(404).json({ message: "Tenant not found" });

    tenant.rent = 0;
    tenant.maintenanceAmount = 0;
    tenant.mainLastMonth = 0;
    tenant.mainCurrentMonth = 0;
    tenant.inverterLastMonth = 0;
    tenant.inverterCurrentMonth = 0;
    tenant.motorUnits = 0;
    tenant.dueElectricityBill = 0;
    tenant.electricityFine = 0; // Reset fine
    tenant.totalAmountDue = 0;

    await tenant.save();
    res.json({ message: "Tenant billing details reset successfully" });
  } catch (error) {
    console.error("Reset Tenant Billing Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const markTenantAsPaid = async (req, res) => {
  try {
    const { tid } = req.params;
    const tenant = await Tenant.findOneAndUpdate(
      { tid },
      {
        maintenanceAmount: 0,
        dueElectricityBill: 0,
        electricityFine: 0, // Reset fine
        totalAmountDue: 0,
        $pull: { transactions: { status: "Pending" } },
      },
      { new: true }
    );
    if (!tenant) return res.status(404).json({ success: false, message: "Tenant not found" });
    res.status(200).json({ success: true, message: "Tenant marked as paid", tenant });
  } catch (error) {
    console.error("Mark as Paid Error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
const imposeElectricityFine = async (req, res) => {
  try {
    const { tid } = req.params;
    const tenant = await Tenant.findOne({ tid });
    if (!tenant) return res.status(404).json({ success: false, message: "Tenant not found" });

    const fine = tenant.dueElectricityBill * 0.1; // 10% fine
    tenant.electricityFine = (tenant.electricityFine || 0) + fine; // Accumulate fine
    tenant.dueElectricityBill += fine;
    tenant.totalAmountDue += fine;

    await tenant.save();

    res.status(200).json({ success: true, message: "10% fine imposed on electricity due", tenant });
  } catch (error) {
    console.error("Impose Electricity Fine Error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
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
  checkMobile,
  resetPassword,
  changePassword,
  googleLogin,
  updateMobile,
  sendVerification,
  verifyOtp,
  sendEmailOtp,
  verifyEmailOtp,
  resetTenantBilling,
  markTenantAsPaid,
  imposeElectricityFine,
};