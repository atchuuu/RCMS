const Tenant = require("../models/Tenant");
const Transaction = require("../models/Transaction");
const Invoice = require("../models/Invoice");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { access } = require("fs").promises; // Use Node.js fs.promises.access
const path=require("path");
const fs = require("fs");
const fsExtra = require("fs-extra");
// 🟢 **1. Add a new tenant**
const uploadMiddleware = require("../middleware/uploadPayement");

const addTenant = async (req, res) => {
    try {
        let { tname, mobileNumber, email, password } = req.body;

        if (!mobileNumber) {
            return res.status(400).json({ message: "Mobile number is required!" });
        }

        // 🔍 Check if tenant already exists
        const existingTenant = await Tenant.findOne({ $or: [{ email }, { mobileNumber }] });
        if (existingTenant) {
            return res.status(400).json({ message: "Tenant already exists with this email or mobile number" });
        }

        // 🆕 Generate unique `tid`
        const lastTenant = await Tenant.findOne().sort({ tid: -1 });
        const tid = lastTenant ? lastTenant.tid + 1 : 1;

        // 🔐 Hash password before saving
        const salt = await bcrypt.genSalt(10); // Generate salt
        const hashedPassword = await bcrypt.hash(password, salt); // Hash password

        // ✅ Create new tenant
        const newTenant = new Tenant({
            tid,
            tname,
            mobileNumber,
            email,
            password: hashedPassword, // 🔐 Save hashed password
        });

        await newTenant.save();
        res.status(201).json({ message: "Tenant registered successfully!", tenant: newTenant });

    } catch (error) {
        console.error("Error registering tenant:", error);
        res.status(500).json({ message: "Server error", error });
    }
};



// 🔵 **2. Get all tenants**
const getAllTenants = async (req, res) => {
    try {
        const tenants = await Tenant.find();
        res.status(200).json(tenants);
    } catch (error) {
        res.status(500).json({ message: "Error fetching tenants" });
    }
};

// 🟡 **3. Update tenant details**
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

// 🔴 **4. Delete a tenant**
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

// 🟣 **5. Get tenant transactions**
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
// 🟠 **6. Get tenant dashboard**
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
        { tenantId: tenant.tid, email: tenant.email },
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
          isVerified: tenant.isVerified, // Add this
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
  
      if (!req.files || (!req.files["aadharCard"] && !req.files["idCard"])) {
        return res.status(400).json({ success: false, message: "Both Aadhar and ID Card must be uploaded" });
      }
  
      const aadharFolder = path.join(__dirname, `../documents/aadhar card/${pgName}`);
      const idCardFolder = path.join(__dirname, `../documents/idcard/${pgName}`);
      const fileExtAadhar = req.files["aadharCard"] ? path.extname(req.files["aadharCard"][0].originalname) : "";
      const fileExtId = req.files["idCard"] ? path.extname(req.files["idCard"][0].originalname) : "";
      const aadharFileName = `${tname}+${roomNo}${fileExtAadhar}`;
      const idCardFileName = `${tname}+${roomNo}${fileExtId}`;
  
      if (req.files["aadharCard"]) {
        await fsExtra.ensureDir(aadharFolder);
        await fsExtra.move(
          req.files["aadharCard"][0].path,
          path.join(aadharFolder, aadharFileName),
          { overwrite: true }
        );
      }
      if (req.files["idCard"]) {
        await fsExtra.ensureDir(idCardFolder);
        await fsExtra.move(
          req.files["idCard"][0].path,
          path.join(idCardFolder, idCardFileName),
          { overwrite: true }
        );
      }
  
      const updateData = {
        documentsUploaded: req.files["aadharCard"] ? true : req.user.documentsUploaded,
        idCardUploaded: req.files["idCard"] ? true : req.user.idCardUploaded,
        aadharCardPath: req.files["aadharCard"] ? path.join(aadharFolder, aadharFileName) : req.user.aadharCardPath,
        idCardPath: req.files["idCard"] ? path.join(idCardFolder, idCardFileName) : req.user.idCardPath,
        pgName,
        roomNo,
      };
  
      const updatedTenant = await Tenant.findOneAndUpdate(
        { tid: req.user.tid }, // Use tid instead of _id
        { $set: updateData },
        { new: true }
      );
  
      res.status(200).json({ success: true, message: "Documents uploaded successfully!", updatedTenant });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Server error", error });
    }
  };

exports.getTenantProfile = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.user.tenantId);
    if (!tenant) return res.status(404).json({ message: "Tenant not found" });
    res.json(tenant);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
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
  console.log("Received request body:", req.body);
  console.log("Tenant ID from params:", req.params.tid);
  console.log("Tenant from token:", req.tenant);

  try {
    if (!req.tenant) {
      console.log("Tenant not attached to req");
      return res.status(500).json({ message: "Tenant data not available" });
    }

    if (parseInt(req.params.tid) !== req.tenant.tid) {
      console.log(`TID mismatch: param=${req.params.tid}, token=${req.tenant.tid}`);
      return res.status(403).json({ message: "Unauthorized: TID does not match token" });
    }

    if (!req.file) {
      console.error("No file uploaded");
      return res.status(400).json({ message: "Screenshot is required" });
    }

    const { utrNumber, amount, date, nextDueDate } = req.body;
    console.log("File uploaded:", req.file);

    const screenshotPath = path.join(
      "uploads",
      "payment_screenshots",
      req.tenant.pgName,
      req.tenant.roomNo,
      `${new Date().toLocaleString("default", { month: "long" }).toLowerCase()}.jpg`
    );

    const transaction = new Transaction({
      tid: req.tenant.tid,
      amount,
      utrNumber,
      screenshotPath,
      paymentDate: date,
      nextDueDate,
    });

    await transaction.save();

    const tenant = await Tenant.findOne({ tid: req.tenant.tid });
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    tenant.transactions.push({
      amount: parseFloat(amount),
      date: new Date(date),
      utrNumber,
    });

    // Don’t update totalAmountDue here; wait for admin approval
    tenant.dueDate = new Date(nextDueDate);
    await tenant.save();

    console.log("Updated tenant with new transaction:", tenant);
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
  
      // Define paths to delete
      const aadharPath = path.join(__dirname, `../documents/aadhar card/${pgName}`);
      const idCardPath = path.join(__dirname, `../documents/idcard/${pgName}`);
  
      // Check if directories exist and delete them
      try {
        await access(aadharPath); // Check if path exists
        await fsExtra.remove(aadharPath); // Delete if it exists
      } catch (err) {
        if (err.code !== "ENOENT") throw err; // Ignore if path doesn’t exist, throw other errors
      }
  
      try {
        await access(idCardPath);
        await fsExtra.remove(idCardPath);
      } catch (err) {
        if (err.code !== "ENOENT") throw err;
      }
  
      // Update tenants in DB to reset document paths
      await Tenant.updateMany(
        { pgName },
        {
          $set: {
            documentsUploaded: false,
            idCardUploaded: false,
            aadharCardPath: null,
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
