const express = require("express");
const {  adminLogin } = require("../controllers/authController");
const { tenantLogin } = require("../controllers/tenantController");
const router = express.Router();

// 🟢 Tenant Login (by email or mobile number)
router.post("/tenant/login", tenantLogin);

// 🔵 Admin Login
router.post("/admin/login", adminLogin);

module.exports = router;
