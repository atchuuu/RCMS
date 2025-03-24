const jwt = require("jsonwebtoken");
const Tenant = require("../models/Tenant");
const Admin = require("../models/Admin");

const verifyToken = async (req, res, next, options = { requiredRole: null }) => {
  const tokenHeader = req.header("Authorization");
  console.log("Authorization Header:", tokenHeader); // Debug

  if (!tokenHeader) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  const token = tokenHeader.replace("Bearer ", "");
  console.log("Extracted Token:", token); // Debug

  if (!token) {
    return res.status(401).json({ message: "Invalid token format. Use Bearer <token>." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded JWT:", decoded); // Debug

    if (decoded.role === "admin" || decoded.role === "superadmin") {
      const admin = await Admin.findById(decoded.id).select("-password");
      if (!admin) {
        return res.status(404).json({ message: "Admin not found." });
      }
      req.user = {
        id: admin._id.toString(),
        email: admin.email,
        role: admin.role,
      };
      console.log("req.user (admin):", req.user); // Debug

      if (options.requiredRole) {
        const requiredRoles = Array.isArray(options.requiredRole)
          ? options.requiredRole
          : [options.requiredRole];
        console.log("Required Roles:", requiredRoles); // Debug
        if (!requiredRoles.includes(req.user.role)) {
          return res.status(403).json({ message: "Access denied: admin or superadmin role required" });
        }
      }
    } else {
      // For tenants, use `tenantId` from the token (which maps to `tid`)
      const tenant = await Tenant.findOne({ tid: decoded.tenantId });
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found." });
      }
      req.user = {
        tid: tenant.tid, // Use tid instead of _id
        email: tenant.email,
        pgId: tenant.pgId,
        tname: tenant.tname, // Include tname for uploadDocuments
        role: "tenant",
      };
      console.log("req.user (tenant):", req.user); // Debug

      if (options.requiredRole) {
        return res.status(403).json({ message: "Access denied: Admin role required" });
      }
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
  verifyTokenAdmin: createVerifyToken({ requiredRole: "admin" }),
  verifyTokenSuperAdmin: createVerifyToken({ requiredRole: "superadmin" }),
  verifyTokenAnyAdmin: createVerifyToken({ requiredRole: ["admin", "superadmin"] }),
};