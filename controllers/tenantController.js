const Tenant = require("../models/Tenant");
const Invoice = require("../models/Invoice");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
// 🟢 **1. Add a new tenant**

const addTenant = async (req, res) => {
    try {
        let { tname, mobileNumber, email, password} = req.body;

        // 🛑 **Check if tenant already exists (by email or mobile)**
        const existingTenant = await Tenant.findOne({ $or: [{ email }, { mobileNumber }] });
        if (existingTenant) {
            return res.status(400).json({ message: "Tenant already exists with this email or mobile number" });
        }

        // 🔢 **Generate a unique `tid` (Auto-increment logic)**
        const lastTenant = await Tenant.findOne().sort({ tid: -1 });
        const tid = lastTenant ? lastTenant.tid + 1 : 1; // ✅ Auto-increment

        // 🏠 **Create a new tenant entry**
        const newTenant = new Tenant({
            tid,  // ✅ Adding auto-generated `tid`
            tname,
            mobileNumber,
            email,
            password  // ✅ Password will be hashed automatically in Schema
            });

        await newTenant.save();

        res.status(201).json({ message: "Tenant registered successfully!", tenant: newTenant });

    } catch (error) {
        console.error("❌ Error registering tenant:", error);
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
        const tenant = await Tenant.findById(req.user.id).select("-password"); // Exclude password
        if (!tenant) return res.status(404).json({ message: "Tenant not found" });

        res.json(tenant);
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};
const tenantLogin = async (req, res) => {
    try {
        const { email, mobileNumber, password } = req.body;

        // 🛑 Validate input
        if ((!email && !mobileNumber) || !password) {
            return res.status(400).json({ message: "Email or Mobile and password are required" });
        }

        console.log("🔍 Searching for:", email || mobileNumber); // Debugging

        // 🔍 Find tenant by email OR mobile number
        const tenant = await Tenant.findOne({
            $or: [
                { email: email || null },
                { mobileNumber: mobileNumber ? mobileNumber.toString() : null }
            ],
        });

        if (!tenant) {
            console.log("❌ Tenant not found:", email || mobileNumber);
            return res.status(404).json({ message: "Tenant not found" });
        }

        console.log("✅ Tenant found:", tenant.email, tenant.mobileNumber);

        // 🔑 Compare password
        const isMatch = await bcrypt.compare(password, tenant.password);
        if (!isMatch) {
            console.log("❌ Invalid password for:", email || mobileNumber);
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // ✅ Generate JWT Token
        const token = jwt.sign({ id: tenant._id, role: "tenant" }, process.env.JWT_SECRET, {
            expiresIn: "7d",
        });

        res.json({
            token,
            tenant: {
                id: tenant._id,
                email: tenant.email,
                mobileNumber: tenant.mobileNumber,
            },
        });
    } catch (error) {
        console.error("❌ Server Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const uploadDocuments = async (req, res) => {
    try {
      const { tenantName, mobileNumber } = req.body;
  
      if (!tenantName || !mobileNumber) {
        return res.status(400).json({ success: false, message: "Tenant details required" });
      }
  
      // Update tenant record to mark documents as uploaded
      const tenant = await Tenant.findOneAndUpdate(
        { mobileNumber },
        { idCardUploaded: true, documentsUploaded: true },
        { new: true }
      );
  
      if (!tenant) {
        return res.status(404).json({ success: false, message: "Tenant not found" });
      }
  
      res.status(200).json({ success: true, message: "Documents uploaded successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Server error", error });
    }
  };
  
module.exports = {
    tenantLogin, // ✅ Export tenantLogin
    addTenant,
    getAllTenants,
    updateTenant,
    deleteTenant,
    getTenantTransactions,
    getTenantDashboard,
    getTenantProfile,
    uploadDocuments,
};