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
  denyTenantVerification,
  getTenantsByPgId,
  rejectTransaction,
  deleteTenant,
} = require("../controllers/adminController");
const {
  resetTenantBilling,
  markTenantAsPaid,
  updateTenant,
} = require("../controllers/tenantController");
const { verifyTokenAnyAdmin, verifyTokenSuperAdmin } = require("../middleware/authMiddleware");

// Admin routes
router.post("/login", adminLogin);
router.get("/profile", verifyTokenAnyAdmin, getAdminProfile);
router.post("/verify-tenant/:tid", verifyTokenAnyAdmin, verifyTenant);
router.get("/pending-transactions", verifyTokenAnyAdmin, getPendingTransactions);
router.post("/approve-transaction/:transactionId", verifyTokenAnyAdmin, approveTransaction);
router.get("/all-transactions", verifyTokenAnyAdmin, getAllTransactions);
router.get("/unverified-tenants", verifyTokenAnyAdmin, getUnverifiedTenants);
router.get("/tenant/:tid", verifyTokenAnyAdmin, getTenantDocuments);
router.post("/delete-documents-pg", verifyTokenAnyAdmin, deleteDocumentsByPgName);
router.post("/deny-tenant/:tid", verifyTokenAnyAdmin, denyTenantVerification);
router.get("/tenants/pg/:pgId", verifyTokenAnyAdmin, getTenantsByPgId);
router.delete("/reject-transaction/:transactionId", verifyTokenAnyAdmin, rejectTransaction);
router.post("/tenant/reset-billing/:tid", verifyTokenAnyAdmin, resetTenantBilling);
router.delete("/tenant/:tid", verifyTokenAnyAdmin, deleteTenant);
router.post("/tenant/mark-as-paid/:tid", verifyTokenAnyAdmin, markTenantAsPaid);
router.put("/tenant/update/:tid", verifyTokenAnyAdmin, updateTenant);

// Superadmin-only routes
router.post("/add-admin", verifyTokenSuperAdmin, addAdmin);
router.delete("/delete-admin/:adminId", verifyTokenSuperAdmin, deleteAdmin);
router.get("/all-admins", verifyTokenSuperAdmin, getAllAdmins);

module.exports = router;