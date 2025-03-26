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
  getUnverifiedTenants,
  getTenantDocuments,
  deleteDocumentsByPgName,
  denyTenantVerification, // New controller
  getTenantsByPgId,
} = require("../controllers/adminController");
const { verifyTokenAnyAdmin, verifyTokenSuperAdmin } = require("../middleware/authMiddleware");

router.post("/login", adminLogin);
router.get("/profile", verifyTokenAnyAdmin, getAdminProfile);
router.post("/verify-tenant/:tid", verifyTokenAnyAdmin, verifyTenant);
router.get("/pending-transactions", verifyTokenAnyAdmin, getPendingTransactions);
router.post("/approve-transaction/:transactionId", verifyTokenAnyAdmin, approveTransaction);
router.get("/all-transactions", verifyTokenAnyAdmin, getAllTransactions);
router.get("/unverified-tenants", verifyTokenAnyAdmin, getUnverifiedTenants);
router.get("/tenant/:tid", verifyTokenAnyAdmin, getTenantDocuments);
router.post("/delete-documents-pg", verifyTokenAnyAdmin, deleteDocumentsByPgName); // New route for PG deletion
router.post("/deny-tenant/:tid", verifyTokenAnyAdmin, denyTenantVerification); // New route for tenant denial
router.get("/tenants/pg/:pgId", verifyTokenAnyAdmin, getTenantsByPgId); // New route

// Superadmin-only routes
router.post("/add-admin", verifyTokenSuperAdmin, addAdmin);
router.delete("/delete-admin/:adminId", verifyTokenSuperAdmin, deleteAdmin);
router.get("/all-admins", verifyTokenSuperAdmin, getAllAdmins);

module.exports = router;