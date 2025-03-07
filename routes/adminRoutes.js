const express = require("express");
const { adminLogin, getAdminProfile } = require("../controllers/adminController");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

// 🟢 **Admin Login Route**
router.post("/login", adminLogin);

// 🔵 **Get Admin Profile (Protected)**
router.get("/me", verifyToken, getAdminProfile);

module.exports = router;
