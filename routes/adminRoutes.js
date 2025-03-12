const express = require("express");
const { adminLogin, getAdminProfile,verifyTenant } = require("../controllers/adminController");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

// 🟢 **Admin Login Route**
router.post("/login", adminLogin);

// 🔵 **Get Admin Profile (Protected)**
router.get("/me", verifyToken, getAdminProfile);

router.post("/verify/:tenantId", verifyToken, verifyTenant);
module.exports = router;
