const Maintenance = require("../models/Maintenance");
const Tenant = require("../models/Tenant");
const PG =require("../models/PG")
// Create Maintenance Request (Tenant Only)
exports.createRequest = async (req, res) => {
  try {
    const { category, description, availableDate } = req.body;
    const { tid, pgId, roomNo, mobileNumber } = req.user;

    if (req.user.role !== "tenant") {
      return res.status(403).json({ message: "Unauthorized: Tenant access only" });
    }

    if (!tid || !pgId) {
      return res.status(401).json({
        message: "Invalid token: Tenant ID (tid) and PG ID (pgId) are required",
      });
    }

    const tenant = await Tenant.findOne({ tid });
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found in database" });
    }

    const finalRoomNo = roomNo || tenant.roomNo;
    const finalMobileNumber = mobileNumber || tenant.mobileNumber;

    console.log("Final mobileNumber:", finalMobileNumber); // Debug log

    if (!finalRoomNo || !finalMobileNumber) {
      return res.status(400).json({
        message: "Room number and mobile number are required",
      });
    }

    // Optional: Add explicit validation if needed, but schema should handle it
    if (!/^\+\d{10,15}$/.test(finalMobileNumber)) {
      return res.status(400).json({
        message: "Mobile number must include country code and be 10-15 digits",
      });
    }

    const newRequest = new Maintenance({
      tid,
      pgId,
      roomNo: finalRoomNo,
      mobileNumber: finalMobileNumber,
      category,
      description,
      availableDate,
    });

    await newRequest.save();
    res.status(201).json({ 
      message: "Maintenance request submitted successfully", 
      data: newRequest 
    });
  } catch (error) {
    console.error("Error in createRequest:", error);
    res.status(500).json({ message: "Server error: " + error.message });
  }
};
// Get Tenant's Maintenance Requests (Tenant or Admin)
exports.getTenantRequests = async (req, res) => {
  try {
    const tenantId = req.user.tid;
    // Allow both tenants and admins
    if (req.user.role !== "tenant" && req.user.role !== "admin" && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Unauthorized: Tenant or Admin access only" });
    }

    if (!tenantId && req.user.role === "tenant") {
      return res.status(401).json({ message: "Tenant ID is required" });
    }

    const requests = await Maintenance.find({ tid: tenantId });
    res.status(200).json(requests);
  } catch (error) {
    console.error("Error in getTenantRequests:", error);
    res.status(500).json({ message: "Server error: " + error.message });
  }
};

// Update Maintenance Status (Admin Only)
exports.updateStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const updatedRequest = await Maintenance.findByIdAndUpdate(
      requestId,
      { status },
      { new: true }
    );

    if (!updatedRequest) {
      return res.status(404).json({ message: "Request not found" });
    }

    res.status(200).json({ 
      message: "Status updated successfully", 
      data: updatedRequest 
    });
  } catch (error) {
    console.error("Error in updateStatus:", error);
    res.status(500).json({ message: "Server error: " + error.message });
  }
};

// Update Feedback (Tenant Only)
exports.updateFeedback = async (req, res) => {
  try {
    // Validate tenant role
    if (req.user.role !== "tenant") {
      return res.status(403).json({ message: "Unauthorized: Tenant access only" });
    }

    const { id } = req.params;
    const { remarks, rating } = req.body;

    // Validate ID format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    // Validate required fields
    if (!remarks || !rating) {
      return res.status(400).json({ message: "Remarks and rating are required" });
    }

    // Ensure tenant owns the request
    const request = await Maintenance.findById(id);
    if (!request || request.tid !== req.user.tid) {
      return res.status(403).json({ message: "Unauthorized: You can only update your own requests" });
    }

    const updatedRequest = await Maintenance.findByIdAndUpdate(
      id,
      { remarks, rating },
      { new: true }
    );

    if (!updatedRequest) {
      return res.status(404).json({ message: "Maintenance request not found" });
    }

    res.json({ 
      message: "Feedback updated successfully", 
      data: updatedRequest 
    });
  } catch (error) {
    console.error("Error updating feedback:", error);
    res.status(500).json({ message: "Server error: " + error.message });
  }
};

// Get Requests by pgId (Admin Only)
exports.getRequestsByPgId = async (req, res) => {
  try {
    const { pgId } = req.params;
    const requests = await Maintenance.find({ pgId });
    res.status(200).json(requests);
  } catch (error) {
    console.error("Error in getRequestsByPgId:", error);
    res.status(500).json({ message: "Server error: " + error.message });
  }
};
// Get Latest Maintenance Requests (Admin Only)
exports.getLatestRequests = async (req, res) => {
  try {
    console.log("Fetching latest requests...");
    const requests = await Maintenance.find()
      .sort({ createdAt: -1 }) // Sort by most recent first
      .limit(10) // Limit to 10 latest requests
      .lean();

    console.log("Fetched requests:", requests);

    // Fetch PG names
    const pgIds = [...new Set(requests.map((req) => req.pgId))];
    console.log("Unique pgIds:", pgIds);
    const pgs = await PG.find({ pgId: { $in: pgIds } }).select("pgId name").lean();
    console.log("Fetched PGs:", pgs);

    // Map PG names to requests
    const pgMap = new Map(pgs.map((pg) => [pg.pgId, pg.name]));
    const enrichedRequests = requests.map((req) => ({
      ...req,
      pgName: pgMap.get(req.pgId) || "Unknown",
    }));

    res.status(200).json(enrichedRequests);
  } catch (error) {
    console.error("Error in getLatestRequests:", error.stack);
    res.status(500).json({ message: "Server error: " + error.message });
  }
};