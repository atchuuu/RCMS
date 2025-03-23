const express = require("express");
const router = express.Router();
const { adminLogin } = require("../controllers/authController"); // Use authController
const {
  getAdminProfile,
  verifyTenant,
  getPendingTransactions,
  approveTransaction,
  getAllTransactions,
} = require("../controllers/adminController");
const { verifyToken, verifyTokenAdmin } = require("../middleware/authMiddleware");

router.post("/login", adminLogin);
router.get("/profile", verifyTokenAdmin, getAdminProfile);
router.post("/verify-tenant/:tenantId", verifyTokenAdmin, verifyTenant);
router.get("/pending-transactions", verifyTokenAdmin, getPendingTransactions);
router.post("/approve-transaction/:transactionId", verifyTokenAdmin, approveTransaction);
router.get("/all-transactions", verifyTokenAdmin, getAllTransactions);
module.exports = router;