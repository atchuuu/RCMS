const express = require("express");
const router = express.Router();
const maintenanceController = require("../controllers/maintenanceController");
const { verifyToken, verifyTokenAnyAdmin } = require("../middleware/authMiddleware");

// Create Maintenance Request (Tenant Only)
router.post("/create", verifyToken, maintenanceController.createRequest);

// Get Tenant's Maintenance Requests (Tenant or Admin)
router.get("/tenant", verifyToken, maintenanceController.getTenantRequests);

// Update Maintenance Status (Admin Only)
router.put("/update-status/:requestId", verifyTokenAnyAdmin, maintenanceController.updateStatus);

// Update Feedback (Tenant Only)
router.put("/feedback/:id", verifyToken, maintenanceController.updateFeedback);

// Get Maintenance Requests by pgId (Admin Only)
router.get("/pg/:pgId", verifyTokenAnyAdmin, maintenanceController.getRequestsByPgId);

// Get Latest Maintenance Requests (Admin Only)
router.get("/latest", verifyTokenAnyAdmin, maintenanceController.getLatestRequests);

module.exports = router;