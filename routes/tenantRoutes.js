const express = require("express");
const {
    tenantLogin, // ✅ Import tenantLogin
    addTenant,
    getAllTenants,
    updateTenant,
    deleteTenant,
    getTenantTransactions,
    getTenantDashboard,
    getTenantProfile,
    addTransaction,
    deleteDocumentsByPgName,
} = require("../controllers/tenantController");

const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

const uploadId = require("../middleware/uploadId");
const { uploadDocuments } = require("../controllers/tenantController");

// ✅ Tenant Login Route
router.post("/login", tenantLogin);

router.post("/add", addTenant);
router.get("/", getAllTenants);
router.put("/update/:tid", updateTenant);
router.delete("/delete/:tid", deleteTenant);
router.get("/:tid/transactions", getTenantTransactions);
router.get("/dashboard", getTenantDashboard);
router.get("/me", verifyToken, getTenantProfile);
router.put("/:tid/transactions", addTransaction);
router.post(
    "/upload",
    verifyToken,
    (req, res, next) => {
      console.log("Received request body:", req.body);
      console.log("Decoded user:", req.user);
      
      uploadId.fields([{ name: "aadharCard" }, { name: "idCard" }])(req, res, (err) => {
        if (err) {
          return res.status(400).json({ success: false, message: err.message });
        }
        next();
      });
    },
    uploadDocuments
  );
  
  router.post("/delete-documents", verifyToken, deleteDocumentsByPgName); // New route

module.exports = router;
