const express = require("express");
const {
    addTenant,
    getAllTenants,
    updateTenant,
    deleteTenant,
    getTenantTransactions,
    getTenantDashboard
} = require("../controllers/tenantController");

const router = express.Router();

// 🟢 **1. Add a new tenant**
router.post("/add", addTenant);

// 🔵 **2. Get all tenants**
router.get("/", getAllTenants);

// 🟡 **3. Update tenant details**
router.put("/update/:tid", updateTenant);

// 🔴 **4. Delete a tenant**
router.delete("/delete/:tid", deleteTenant);

// 🟣 **5. Get past transactions of a tenant**
router.get("/:tid/transactions", getTenantTransactions);

// 🟠 **6. Get tenant dashboard**
router.get("/dashboard", getTenantDashboard);

module.exports = router;
