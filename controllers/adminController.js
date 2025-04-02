require("dotenv").config();
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs").promises;
const fsExtra = require("fs-extra");
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
    const { tid } = req.params; // Changed from tenantId to tid

    const tenant = await Tenant.findOne({ tid });
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
    const tenantMap = new Map(tenants.map((tenant) => [Number(tenant.tid), tenant]));

    const pendingTransactions = transactions.map((txn) => {
      const tenant = tenantMap.get(txn.tid);
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
    const tenantMap = new Map(tenants.map((tenant) => [Number(tenant.tid), tenant]));

    const groupedTransactions = transactions.reduce((acc, txn) => {
      const tenant = tenantMap.get(txn.tid);
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
    const admins = await Admin.find().select("email name role createdAt");
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

const getUnverifiedTenants = async (req, res) => {
  try {
    const tenants = await Tenant.find({ isVerified: false }).select(
      "tid tname email aadharFrontPath aadharBackPath pgName"
    );
    res.status(200).json(tenants);
  } catch (error) {
    console.error("Error fetching unverified tenants:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
const getTenantDocuments = async (req, res) => {
  try {
    const { tid } = req.params; // Already fixed to use 'tid'
    console.log("Fetching documents for tid:", tid, "Type:", typeof tid);

    if (!tid) {
      console.log("No tid provided in request parameters");
      return res.status(400).json({ success: false, message: "Tenant ID is required" });
    }

    // Query tenant with flexible tid matching, including idCardPath
    const tenant = await Tenant.findOne({
      $or: [{ tid: Number(tid) }, { tid: tid }],
    }).select("aadharFrontPath aadharBackPath idCardPath pgName");

    if (!tenant) {
      console.log("No tenant found for tid:", tid);
      return res.status(404).json({ success: false, message: "Tenant not found" });
    }

    const { aadharFrontPath, aadharBackPath, idCardPath, pgName } = tenant;
    console.log("Tenant document paths:", { aadharFrontPath, aadharBackPath, idCardPath, pgName });

    const baseDocPath = path.join(__dirname, "../documents");
    console.log("Base document path:", baseDocPath);

    const frontFileName = aadharFrontPath ? path.basename(aadharFrontPath) : null;
    const backFileName = aadharBackPath ? path.basename(aadharBackPath) : null;
    const idCardFileName = idCardPath ? path.basename(idCardPath) : null;

    const frontPath = frontFileName ? path.join(baseDocPath, "aadhar", pgName, "front", frontFileName) : null;
    const backPath = backFileName ? path.join(baseDocPath, "aadhar", pgName, "back", backFileName) : null;
    const idCardPathFull = idCardFileName ? path.join(baseDocPath, "idcard", pgName, idCardFileName) : null;

    console.log("Checking files:", { frontPath, backPath, idCardPath: idCardPathFull });

    const documents = {};

    // Check front document
    if (frontPath) {
      try {
        await fs.access(frontPath, fs.constants.F_OK);
        documents.front = {
          url: `/documents/aadhar/${pgName}/front/${frontFileName}`, // Adjusted to include /api prefix
        };
        console.log(`Front file confirmed at ${frontPath}`);
      } catch (error) {
        console.warn(`Front file not found or inaccessible at ${frontPath}:`, error.message);
        documents.front = { error: "Aadhaar front image not found or inaccessible" };
      }
    } else if (aadharFrontPath) {
      console.warn("Front path specified but no filename extracted:", aadharFrontPath);
      documents.front = { error: "Invalid front document path" };
    }

    // Check back document
    if (backPath) {
      try {
        await fs.access(backPath, fs.constants.F_OK);
        documents.back = {
          url: `/documents/aadhar/${pgName}/back/${backFileName}`, // Adjusted to include /api prefix
        };
        console.log(`Back file confirmed at ${backPath}`);
      } catch (error) {
        console.warn(`Back file not found or inaccessible at ${backPath}:`, error.message);
        documents.back = { error: "Aadhaar back image not found or inaccessible" };
      }
    } else if (aadharBackPath) {
      console.warn("Back path specified but no filename extracted:", aadharBackPath);
      documents.back = { error: "Invalid back document path" };
    }

    // Check ID card document
    if (idCardPathFull) {
      try {
        await fs.access(idCardPathFull, fs.constants.F_OK);
        documents.idCard = {
          url: `/documents/idcard/${pgName}/${idCardFileName}`, // Adjusted to include /api prefix
        };
        console.log(`ID card file confirmed at ${idCardPathFull}`);
      } catch (error) {
        console.warn(`ID card file not found or inaccessible at ${idCardPathFull}:`, error.message);
        documents.idCard = { error: "ID card image not found or inaccessible" };
      }
    } else if (idCardPath) {
      console.warn("ID card path specified but no filename extracted:", idCardPath);
      documents.idCard = { error: "Invalid ID card document path" };
    }

    // If paths exist but no documents are accessible, log a warning
    if (!documents.front && !documents.back && !documents.idCard && (aadharFrontPath || aadharBackPath || idCardPath)) {
      console.log("Documents specified in DB but none found on server");
    }

    res.status(200).json({ success: true, documents });
  } catch (error) {
    console.error("Critical error in getTenantDocuments:", error.stack);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
const deleteDocumentsByPgName = async (req, res) => {
  try {
    const { pgName } = req.body;
    console.log("Attempting to delete documents for pgName:", pgName);

    if (!pgName) {
      console.log("No pgName provided in request body");
      return res.status(400).json({ success: false, message: "PG Name is required" });
    }

    const aadharPath = path.join(__dirname, "../documents/aadhar", pgName);
    const idCardPath = path.join(__dirname, "../documents/idcard", pgName);

    console.log("Aadhaar path to delete:", aadharPath);
    console.log("ID card path to delete:", idCardPath);

    // Delete Aadhaar documents
    try {
      await fsExtra.access(aadharPath, fsExtra.constants.F_OK);
      await fsExtra.remove(aadharPath);
      console.log(`Successfully deleted Aadhaar documents at ${aadharPath}`);
    } catch (err) {
      if (err.code === "ENOENT") {
        console.log(`Aadhaar path ${aadharPath} does not exist, skipping deletion`);
      } else {
        console.error(`Error accessing/removing Aadhaar path ${aadharPath}:`, err.message);
        throw err; // Rethrow if it's not a "file not found" error
      }
    }

    // Delete ID card documents
    try {
      await fsExtra.access(idCardPath, fsExtra.constants.F_OK);
      await fsExtra.remove(idCardPath);
      console.log(`Successfully deleted ID card documents at ${idCardPath}`);
    } catch (err) {
      if (err.code === "ENOENT") {
        console.log(`ID card path ${idCardPath} does not exist, skipping deletion`);
      } else {
        console.error(`Error accessing/removing ID card path ${idCardPath}:`, err.message);
        throw err;
      }
    }

    // Update tenants in MongoDB
    const updateResult = await Tenant.updateMany(
      { pgName },
      {
        $set: {
          documentsUploaded: false,
          idCardUploaded: false,
          aadharFrontPath: null,
          aadharBackPath: null,
          idCardPath: null,
          isVerified: false,
        },
      }
    );
    console.log(`Updated ${updateResult.modifiedCount} tenants for pgName: ${pgName}`);

    res.status(200).json({
      success: true,
      message: `Documents for PG '${pgName}' deleted successfully`,
    });
  } catch (error) {
    console.error("Critical error in deleteDocumentsByPgName:", error.stack);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
const denyTenantVerification = async (req, res) => {
  try {
    const { tid } = req.params;

    const tenant = await Tenant.findOne({ tid });
    if (!tenant) {
      return res.status(404).json({ success: false, message: "Tenant not found" });
    }

    const { pgName, roomNo, tname } = tenant;
    const aadharFrontPath = path.join(__dirname, `../documents/aadhar/${pgName}/front/${tname}+${roomNo}${path.extname(tenant.aadharFrontPath || "")}`);
    const aadharBackPath = path.join(__dirname, `../documents/aadhar/${pgName}/back/${tname}+${roomNo}${path.extname(tenant.aadharBackPath || "")}`);
    const idCardPath = path.join(__dirname, `../documents/idcard/${pgName}/${tname}+${roomNo}${path.extname(tenant.idCardPath || "")}`);

    // Delete individual files if they exist
    try {
      await fs.access(aadharFrontPath);
      await fsExtra.remove(aadharFrontPath);
    } catch (err) {
      if (err.code !== "ENOENT") console.warn(`Aadhaar front not found at ${aadharFrontPath}`);
    }

    try {
      await fs.access(aadharBackPath);
      await fsExtra.remove(aadharBackPath);
    } catch (err) {
      if (err.code !== "ENOENT") console.warn(`Aadhaar back not found at ${aadharBackPath}`);
    }

    try {
      await fs.access(idCardPath);
      await fsExtra.remove(idCardPath);
    } catch (err) {
      if (err.code !== "ENOENT") console.warn(`ID card not found at ${idCardPath}`);
    }

    // Reset tenant document fields and verification status
    tenant.documentsUploaded = false;
    tenant.idCardUploaded = false;
    tenant.aadharFrontPath = null;
    tenant.aadharBackPath = null;
    tenant.idCardPath = null;
    tenant.isVerified = false;
    await tenant.save();

    res.status(200).json({ success: true, message: `Verification denied for tenant ${tid}. Documents deleted.` });
  } catch (error) {
    console.error("Error in denyTenantVerification:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
const getTenantsByPgId = async (req, res) => {
  try {
    const { pgId } = req.params;
    console.log("Fetching tenants for pgId:", pgId);

    const tenants = await Tenant.find({ pgId }).select(
      "tid tname email mobileNumber pgName roomNo isVerified aadharFrontPath aadharBackPath idCardPath " +
      "rent maintenanceAmount dueElectricityBill totalAmountDue " +
      "mainLastMonth mainCurrentMonth inverterLastMonth inverterCurrentMonth motorUnits transactions"
    );

    if (!tenants || tenants.length === 0) {
      return res.status(404).json({ success: false, message: "No tenants found for this PG" });
    }

    res.status(200).json({ success: true, tenants });
  } catch (error) {
    console.error("Error fetching tenants by pgId:", error.message);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
const rejectTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const tenant = await Tenant.findOne({ "transactions._id": transactionId });
    if (!tenant) return res.status(404).json({ message: "Transaction not found" });

    tenant.transactions.id(transactionId).remove();
    await tenant.save();

    res.json({ message: "Transaction rejected and removed" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
const deleteTenant = async (req, res) => {
  try {
    const { tid } = req.params;
    const tenant = await Tenant.findOneAndDelete({ tid });
    if (!tenant) return res.status(404).json({ message: "Tenant not found" });
    res.json({ message: "Tenant deleted successfully" });
  } catch (error) {
    console.error("Delete Tenant Error:", error);
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
  getUnverifiedTenants,
  getTenantDocuments,
  deleteDocumentsByPgName,
  denyTenantVerification,
  getTenantsByPgId, // Add this
  rejectTransaction,
  deleteTenant,
};