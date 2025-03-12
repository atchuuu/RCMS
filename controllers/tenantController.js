const Tenant = require("../models/Tenant");
const Invoice = require("../models/Invoice");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
// 🟢 **1. Add a new tenant**

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

        const newTenant = new Tenant({
            tid,
            tname,
            mobileNumber,
            email,
            password
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
        const tenant = await Tenant.findOne({ tid });

        if (!tenant) {
            return res.status(404).json({ message: "Tenant not found" });
        }

        res.status(200).json({ transactions: tenant.transactions });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 🟠 **6. Get tenant dashboard**
const getTenantDashboard = async (req, res) => {
    try {
        const tenant = await Tenant.findById(req.user.userId).populate("invoices");

        if (!tenant) {
            return res.status(404).json({ message: "Tenant not found" });
        }

        res.json({
            name: tenant.tname,
            mobile: tenant.mobileNumber,
            rentDue: tenant.totalAmountDue,
            maintenanceDue: tenant.maintenanceAmount,
            invoices: tenant.invoices,
            idProofs: tenant.idCardUploaded
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
const getTenantProfile = async (req, res) => {
    try {
        const tenant = await Tenant.findOne({ _id: req.user.id }); // Assuming ID is stored in JWT
        if (!tenant) {
            return res.status(404).json({ message: 'Tenant not found' });
        }
        res.json(tenant);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};


const tenantLogin = async (req, res) => {
    try {
        const { email, mobileNumber, password } = req.body;

        // 🛑 **Check if email or mobile number is provided**
        if (!email && !mobileNumber) {
            return res.status(400).json({ message: "Email or mobile number is required" });
        }

        // 🔎 **Find tenant by email OR mobile number**
        const tenant = await Tenant.findOne({
            $or: [{ email }, { mobileNumber }]
        });

        if (!tenant) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // 🔑 **Verify password**
        const isMatch = await bcrypt.compare(password, tenant.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // 🛠️ **Generate JWT token**
        const token = jwt.sign(
            { tenantId: tenant._id, email: tenant.email },
            process.env.JWT_SECRET, // Ensure you have a valid secret key
            { expiresIn: "7d" }
        );

        res.status(200).json({
            message: "Login successful",
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
            }
        });

    } catch (error) {
        console.error("❌ Login error:", error);
        res.status(500).json({ message: "Server error", error });
    }
};


const uploadDocuments = async (req, res) => {
    try {
      const { mobileNumber, pgName, roomNo } = req.body;
  
      if (!mobileNumber || !pgName || !roomNo) {
        return res.status(400).json({ success: false, message: "PG Name, Room No, and Mobile Number are required." });
      }
  
      // Check if files are uploaded
      if (!req.files || (!req.files["idCard"] && !req.files["aadharCard"])) {
        return res.status(400).json({ success: false, message: "Both Aadhar and ID Card must be uploaded." });
      }
  
      // Find the tenant by mobile number
      const tenant = await Tenant.findOne({ mobileNumber });
  
      if (!tenant) {
        return res.status(404).json({ success: false, message: "Tenant not found" });
      }
  
      // Update document paths
      const updateData = {
        documentsUploaded: req.files["aadharCard"] ? true : tenant.documentsUploaded,
        idCardUploaded: req.files["idCard"] ? true : tenant.idCardUploaded,
        aadharCardPath: req.files["aadharCard"] ? req.files["aadharCard"][0].path : tenant.aadharCardPath,
        idCardPath: req.files["idCard"] ? req.files["idCard"][0].path : tenant.idCardPath,
        pgName,
        roomNo
      };
  
      // Update the tenant in the database
      const updatedTenant = await Tenant.findOneAndUpdate(
        { mobileNumber },
        { $set: updateData },
        { new: true }
      );
  
      res.status(200).json({ success: true, message: "Documents uploaded successfully!", updatedTenant });
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
};
