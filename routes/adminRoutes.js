const express = require("express");
const router = express.Router();
const { adminLogin } = require("../controllers/authController");
const {
  getAdminProfile,
  verifyTenant,
  getPendingTransactions,
  approveTransaction,
  getAllTransactions,
  addAdmin,
  deleteAdmin,
  getAllAdmins,
} = require("../controllers/adminController");
const { verifyTokenAnyAdmin, verifyTokenSuperAdmin } = require("../middleware/authMiddleware");

router.post("/login", adminLogin);
router.get("/profile", verifyTokenAnyAdmin, getAdminProfile);
router.post("/verify-tenant/:tenantId", verifyTokenAnyAdmin, verifyTenant);
router.get("/pending-transactions", verifyTokenAnyAdmin, getPendingTransactions);
router.post("/approve-transaction/:transactionId", verifyTokenAnyAdmin, approveTransaction);
router.get("/all-transactions", verifyTokenAnyAdmin, getAllTransactions);

// Superadmin-only routes
router.post("/add-admin", verifyTokenSuperAdmin, addAdmin);
router.delete("/delete-admin/:adminId", verifyTokenSuperAdmin, deleteAdmin);
router.get("/all-admins", verifyTokenSuperAdmin, getAllAdmins);

module.exports = router;