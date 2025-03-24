const Tenant = require("../models/Tenant");
const Transaction = require("../models/Transaction");
const Invoice = require("../models/Invoice");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { access } = require("fs").promises;
const path = require("path");
const fs = require("fs");
const fsExtra = require("fs-extra");
const uploadMiddleware = require("../middleware/uploadPayement");

const addTenant = async (req, res) => {
  try {
    let { tname, mobileNumber, email, password } = req.body;

    if (!mobileNumber) {
      return res.status(400).json({ message: "Mobile number is required!" });
    }

    const existingTenant = await Tenant.findOne({ $or: [{ email }, { mobileNumber }] });
    if (existingTenant) {
      return res.status(400).json({ message: "Tenant already exists with this email or mobile number" });
    }

    const lastTenant = await Tenant.findOne().sort({ tid: -1 });
    const tid = lastTenant ? lastTenant.tid + 1 : 1;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newTenant = new Tenant({
      tid,
      tname,
      mobileNumber,
      email,
      password: hashedPassword,
    });

    await newTenant.save();
    res.status(201).json({ message: "Tenant registered successfully!", tenant: newTenant });
  } catch (error) {
    console.error("Error registering tenant:", error);
    res.status(500).json({ message: "Server error", error });
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

    if (!email && !mobileNumber) {
      return res.status(400).json({ message: "Email or mobile number is required" });
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
      { tenantId: tenant.tid, email: tenant.email, role: "tenant" }, // Added role for consistency
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
    const tname = req.user.tname; // Now available from middleware

    if (!tname || !pgName || !roomNo) {
      return res.status(400).json({ success: false, message: "Missing required fields: tname, pgName, or roomNo" });
    }

    if (!req.files || (!req.files["aadharFront"] || !req.files["aadharBack"] || !req.files["idCard"])) {
      return res.status(400).json({ success: false, message: "Aadhar Front, Back, and ID Card must be uploaded" });
    }

    const aadharFrontFolder = path.join(__dirname, `../documents/aadhar/${pgName}/front`);
    const aadharBackFolder = path.join(__dirname, `../documents/aadhar/${pgName}/back`);
    const idCardFolder = path.join(__dirname, `../documents/idcard/${pgName}`);

    const fileExtAadharFront = path.extname(req.files["aadharFront"][0].originalname);
    const fileExtAadharBack = path.extname(req.files["aadharBack"][0].originalname);
    const fileExtId = path.extname(req.files["idCard"][0].originalname);

    const fileName = `${tname}+${roomNo}${fileExtAadharFront}`;

    await fsExtra.ensureDir(aadharFrontFolder);
    await fsExtra.move(req.files["aadharFront"][0].path, path.join(aadharFrontFolder, fileName), { overwrite: true });

    await fsExtra.ensureDir(aadharBackFolder);
    await fsExtra.move(req.files["aadharBack"][0].path, path.join(aadharBackFolder, fileName), { overwrite: true });

    await fsExtra.ensureDir(idCardFolder);
    await fsExtra.move(req.files["idCard"][0].path, path.join(idCardFolder, fileName), { overwrite: true });

    const updateData = {
      documentsUploaded: true,
      idCardUploaded: true,
      aadharFrontPath: path.join(aadharFrontFolder, fileName),
      aadharBackPath: path.join(aadharBackFolder, fileName),
      idCardPath: path.join(idCardFolder, fileName),
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
    console.error(error);
    res.status(500).json({ success: false, message: "Server error", error });
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

    const screenshotPath = path.join(
      "uploads",
      "payment_screenshots",
      tenant.pgName,
      tenant.roomNo,
      `${new Date().toLocaleString("default", { month: "long" }).toLowerCase()}.jpg`
    );

    const transaction = new Transaction({
      tid: req.user.tid,
      amount,
      utrNumber,
      screenshotPath,
      paymentDate: date,
      nextDueDate,
    });

    await transaction.save();

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

const deleteDocumentsByPgName = async (req, res) => {
  try {
    const { pgName } = req.body;

    if (!pgName) {
      return res.status(400).json({ success: false, message: "PG Name is required" });
    }

    const aadharPath = path.join(__dirname, `../documents/aadhar/${pgName}`);
    const idCardPath = path.join(__dirname, `../documents/idcard/${pgName}`);

    try {
      await access(aadharPath);
      await fsExtra.remove(aadharPath);
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }

    try {
      await access(idCardPath);
      await fsExtra.remove(idCardPath);
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }

    await Tenant.updateMany(
      { pgName },
      {
        $set: {
          documentsUploaded: false,
          idCardUploaded: false,
          aadharFrontPath: null,
          aadharBackPath: null,
          idCardPath: null,
        },
      }
    );

    res.status(200).json({
      success: true,
      message: `Documents for PG '${pgName}' deleted successfully`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error", error });
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
  deleteDocumentsByPgName,
};