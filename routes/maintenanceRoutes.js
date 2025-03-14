const express = require("express");
const router = express.Router();
const maintenanceController = require("../controllers/maintenanceController");
const { verifyToken } = require("../middleware/authMiddleware");

// Create Maintenance Request (Tenant Only)
router.post("/create", verifyToken, maintenanceController.createRequest);

// Get Tenant's Maintenance Requests (Tenant Only)
router.get("/tenant", verifyToken, maintenanceController.getTenantRequests);

// Update Maintenance Status (Admin Only)
router.put("/update-status/:requestId", verifyToken, maintenanceController.updateStatus);

// Update Feedback (Tenant Only)
router.put("/feedback/:id", verifyToken, maintenanceController.updateFeedback);

module.exports = router;