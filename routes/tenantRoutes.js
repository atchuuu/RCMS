const express = require("express");
const {
  tenantLogin,
  addTenant,
  getAllTenants,
  updateTenant,
  deleteTenant,
  getTenantTransactions,
  getTenantDashboard,
  getTenantProfile,
  addTransaction,
  uploadDocuments,
  updateMobile,
  sendVerification,
  verifyOtp,
  sendEmailOtp,
  verifyEmailOtp,
} = require("../controllers/tenantController");
const { verifyToken } = require("../middleware/authMiddleware");
const router = express.Router();
const uploadId = require("../middleware/uploadId");
const uploadMiddleware = require("../middleware/uploadPayement");

router.post("/login", tenantLogin);
router.post("/add", addTenant);
router.get("/", getAllTenants);
router.put("/update/:tid", updateTenant);
router.delete("/delete/:tid", deleteTenant);
router.get("/dashboard", verifyToken, getTenantDashboard);
router.get("/me", verifyToken, getTenantProfile);
router.get("/:tid/transactions", verifyToken, getTenantTransactions);
router.post("/:tid/transactions", verifyToken, uploadMiddleware, addTransaction);
router.post(
  "/upload",
  verifyToken,
  uploadId.fields([
    { name: "aadharFront" },
    { name: "aadharBack" },
    { name: "idCard" },
  ]),
  uploadDocuments
);
router.post("/update-mobile", verifyToken, updateMobile);
router.post("/send-verification", verifyToken, sendVerification);
router.post("/verify-otp", verifyToken, verifyOtp);
router.post("/send-email-otp", verifyToken, sendEmailOtp);
router.post("/verify-email-otp", verifyToken, verifyEmailOtp);

module.exports = router;