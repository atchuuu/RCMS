const express = require("express");
const { tenantLogin, adminLogin } = require("../controllers/authController");

const router = express.Router();

// 🟢 Tenant Login (by email or mobile number)
router.post("/tenant/login", tenantLogin);

// 🔵 Admin Login
router.post("/admin/login", adminLogin);

module.exports = router;
