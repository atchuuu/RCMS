const express = require("express");
const router = express.Router();
const {
  adminLogin,
  getAdminProfile,
  verifyTenant,
  getPendingTransactions,
  approveTransaction,
} = require("../controllers/adminController");
const authMiddleware = require("../middleware/authMiddleware"); // General auth middleware
const adminMiddleware = require("../middleware/adminMiddleware"); // Admin-specific middleware

router.post("/login", adminLogin);
router.get("/profile", authMiddleware, adminMiddleware, getAdminProfile);
router.post("/verify-tenant/:tenantId", authMiddleware, adminMiddleware, verifyTenant);
router.get("/pending-transactions", authMiddleware, adminMiddleware, getPendingTransactions);
router.post("/approve-transaction/:transactionId", authMiddleware, adminMiddleware, approveTransaction);

module.exports = router;