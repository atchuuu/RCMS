const Maintenance = require("../models/Maintenance");
const Tenant = require("../models/Tenant");

// Create Maintenance Request (Token Required)
exports.createRequest = async (req, res) => {
  try {
    console.log("Decoded Token (req.user):", req.user);

    const { category, description, availableDate } = req.body;
    const tenantId = req.user.tid; // tid is a Number (e.g., 9)

    if (!tenantId) {
      return res.status(401).json({ message: "Invalid token: Tenant ID missing" });
    }

    const newRequest = new Maintenance({
      tid: tenantId, // Number (e.g., 9)
      pgName: req.user.pgName,
      roomNo: req.user.roomNo,
      mobileNumber: req.user.mobileNumber,
      category,
      description,
      availableDate,
    });

    await newRequest.save();
    res.status(201).json({ message: "Maintenance request submitted", data: newRequest });
  } catch (error) {
    console.error("Error in createRequest:", error);
    res.status(500).json({ message: "Server error: " + error.message });
  }
};

// Get Tenant's Maintenance Requests (Token Required)
exports.getTenantRequests = async (req, res) => {
  try {
    const tenantId = req.user.tid; // Fetch tid from token
    const requests = await Maintenance.find({ tid: tenantId });
    res.status(200).json(requests);
  } catch (error) {
    console.error("Error in getTenantRequests:", error);
    res.status(500).json({ message: "Server error: " + error.message });
  }
};

// Update Maintenance Status (Admin Token Required)
exports.updateStatus = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const { requestId } = req.params;
    const { status } = req.body;

    const updatedRequest = await Maintenance.findByIdAndUpdate(
      requestId,
      { status },
      { new: true }
    );

    if (!updatedRequest) return res.status(404).json({ message: "Request not found" });

    res.status(200).json({ message: "Status updated", data: updatedRequest });
  } catch (error) {
    console.error("Error in updateStatus:", error);
    res.status(500).json({ message: "Server error: " + error.message });
  }
};
exports.updateFeedback = async (req, res) => {
    try {
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

        console.log("Updating feedback for ID:", id);
        console.log("New remarks:", remarks);
        console.log("New rating:", rating);

        // Update the maintenance request
        const updatedRequest = await Maintenance.findByIdAndUpdate(
            id,
            { remarks, rating },
            { new: true } // Return the updated document
        );

        console.log("Updated document:", updatedRequest);

        if (!updatedRequest) {
            return res.status(404).json({ message: "Maintenance request not found" });
        }

        res.json({ message: "Feedback updated successfully", data: updatedRequest });
    } catch (error) {
        console.error("Error updating feedback:", error);
        res.status(500).json({ message: "Server error" });
    }
};