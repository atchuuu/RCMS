const jwt = require("jsonwebtoken");
const Tenant = require("../models/Tenant");
const Admin = require("../models/Admin");

const verifyToken = async (req, res, next, options = { requireAdmin: false }) => {
  const tokenHeader = req.header("Authorization");

  if (!tokenHeader) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  const token = tokenHeader.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ message: "Invalid token format. Use Bearer <token>." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded JWT:", decoded);

    if (options.requireAdmin && decoded.role !== "admin") {
      return res.status(403).json({ message: "Access denied: Admin role required" });
    }

    if (decoded.role === "admin") {
      const admin = await Admin.findById(decoded.id).select("-password");
      if (!admin) {
        return res.status(404).json({ message: "Admin not found." });
      }
      const adminData = admin.toObject();
      req.user = {
        id: adminData._id.toString(),
        _id: adminData._id.toString(),
        email: adminData.email,
        role: "admin",
      };
      console.log("req.user set to (admin):", req.user);
    } else {
      const tenant = await Tenant.findOne({ tid: decoded.tenantId });
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found." });
      }
      const tenantData = tenant.toObject();
      req.user = {
        tid: tenantData.tid, // Primary identifier for tenants
        _id: tenantData._id.toString(), // Keep for reference
        role: decoded.role || "tenant",
        tname: tenantData.tname,
        email: tenantData.email,
        mobileNumber: tenantData.mobileNumber,
        pgName: tenantData.pgName,
        roomNo: tenantData.roomNo,
        documentsUploaded: tenantData.documentsUploaded,
        idCardUploaded: tenantData.idCardUploaded,
        isVerified: tenantData.isVerified,
      };
      req.tenant = tenantData; // Full tenant object
      console.log("req.user set to (tenant):", req.user);
      console.log("req.tenant set to:", req.tenant);
    }

    next();
  } catch (error) {
    console.error("Token verification error:", error.message);
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token has expired." });
    }
    res.status(401).json({ message: "Invalid token." });
  }
};

const createVerifyToken = (options = {}) => (req, res, next) => verifyToken(req, res, next, options);

module.exports = {
  verifyToken: createVerifyToken(),
  verifyTokenAdmin: createVerifyToken({ requireAdmin: true }),
};