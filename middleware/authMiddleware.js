const jwt = require("jsonwebtoken");
const Tenant = require("../models/Tenant");
const Admin = require("../models/Admin");

const verifyToken = async (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  try {
    const bearerToken = token.split(" ")[1];
    if (!bearerToken) {
      return res.status(401).json({ message: "Invalid token format. Use Bearer <token>." });
    }

    const decoded = jwt.verify(bearerToken, process.env.JWT_SECRET || "your_jwt_secret");
    console.log("Decoded JWT:", decoded);

    // Check the role in the token payload
    if (decoded.role === "admin") {
      const admin = await Admin.findById(decoded.id).select("-password");
      console.log("Admin found:", admin);

      if (!admin) {
        return res.status(404).json({ message: "Admin not found." });
      }

      const adminData = admin.toObject();
      req.user = {
        ...adminData,
        id: adminData._id.toString(),
        _id: adminData._id.toString(),
        role: "admin",
      };
      console.log("req.user set to:", req.user);
    } else {
      const tenant = await Tenant.findOne({ tid: decoded.tenantId });
      console.log("Tenant found:", tenant);

      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found." });
      }

      const tenantData = tenant.toObject();
      req.user = {
        ...tenantData,
        id: tenantData._id.toString(),
        _id: tenantData._id.toString(),
        role: decoded.role || "tenant",
      };
      req.tenant = tenantData; // Explicitly set req.tenant for uploadMiddleware
      console.log("req.user set to:", req.user);
      console.log("req.tenant set to:", req.tenant);
    }

    next();
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401).json({ message: "Invalid token." });
  }
};

module.exports = { verifyToken };