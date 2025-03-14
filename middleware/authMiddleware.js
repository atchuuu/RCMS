const jwt = require("jsonwebtoken");
const Tenant = require("../models/Tenant");

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

    const decoded = jwt.verify(bearerToken, process.env.JWT_SECRET);
    console.log("Decoded JWT:", decoded);

    // Query by tid (expects a Number)
    const tenant = await Tenant.findOne({ tid: decoded.tenantId });
    console.log("Tenant found:", tenant);

    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found." });
    }

    req.user = tenant;
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401).json({ message: "Invalid token." });
  }
};

module.exports = { verifyToken };