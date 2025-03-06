const express = require("express");
const { getTenantDashboard } = require("../controllers/tenantController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Get tenant dashboard (protected route)
router.get("/dashboard", authMiddleware, getTenantDashboard);

module.exports = router;
