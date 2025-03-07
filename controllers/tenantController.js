const Tenant = require("../models/Tenant");
const Invoice = require("../models/Invoice");

// 🟢 **1. Add a new tenant**
const addTenant = async (req, res) => {
    try {
        const newTenant = new Tenant(req.body);
        await newTenant.save();
        res.status(201).json({ success: true, message: "Tenant added successfully!", tenant: newTenant });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error adding tenant", error });
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

module.exports = {
    addTenant,
    getAllTenants,
    updateTenant,
    deleteTenant,
    getTenantTransactions,
    getTenantDashboard
};
