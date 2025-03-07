const express = require("express");
const {
    tenantLogin, // ✅ Import tenantLogin
    addTenant,
    getAllTenants,
    updateTenant,
    deleteTenant,
    getTenantTransactions,
    getTenantDashboard,
    getTenantProfile
} = require("../controllers/tenantController");

const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

// ✅ Tenant Login Route
router.post("/login", tenantLogin);

router.post("/add", addTenant);
router.get("/", getAllTenants);
router.put("/update/:tid", updateTenant);
router.delete("/delete/:tid", deleteTenant);
router.get("/:tid/transactions", getTenantTransactions);
router.get("/dashboard", getTenantDashboard);
router.get("/me", verifyToken, getTenantProfile);

module.exports = router;
