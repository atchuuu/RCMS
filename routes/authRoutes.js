const express = require("express");
const { adminLogin } = require("../controllers/authController");
const { tenantLogin, checkMobile, resetPassword, changePassword } = require("../controllers/tenantController");
const { verifyToken } = require("../middleware/authMiddleware"); // Destructure the specific function
const router = express.Router();

// 🟢 Tenant Routes
router.post("/tenant/login", tenantLogin);
router.post("/tenant/check-mobile", checkMobile);
router.post("/tenant/reset-password", resetPassword);
router.post("/tenant/change-password", verifyToken, changePassword); // Use verifyToken instead of authMiddleware

// 🔵 Admin Login
router.post("/admin/login", adminLogin);

module.exports = router;