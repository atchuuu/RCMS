const Tenant = require("../models/Tenant");
const Invoice = require("../models/Invoice");

exports.getTenantDashboard = async (req, res) => {
    try {
        const tenant = await Tenant.findById(req.user.userId).populate("invoices");

        if (!tenant) {
            return res.status(404).json({ message: "Tenant not found" });
        }

        res.json({
            name: tenant.name,
            mobile: tenant.mobile,
            email: tenant.email,
            rentDue: tenant.rentDue,
            maintenanceDue: tenant.maintenanceDue,
            invoices: tenant.invoices,
            idProofs: tenant.idProofs
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
