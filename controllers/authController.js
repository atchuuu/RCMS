const Tenant = require("../models/Tenant");
const Admin = require("../models/Admin");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const generateToken = (user, role) => {
  return jwt.sign(
    { id: user._id, email: user.email, role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

exports.tenantLogin = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    const tenant = await Tenant.findOne({
      $or: [{ email: identifier }, { mobileNumber: identifier }],
    });

    if (!tenant) return res.status(404).json({ success: false, message: "Tenant not found" });

    const isMatch = await bcrypt.compare(password, tenant.password);
    if (!isMatch) return res.status(400).json({ success: false, message: "Invalid credentials" });

    res.json({
      success: true,
      token: generateToken(tenant, "tenant"),
      tenant: {
        id: tenant._id,
        name: tenant.tname,
        email: tenant.email,
        mobileNumber: tenant.mobileNumber,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ success: false, message: "Invalid credentials" });

    res.json({
      success: true,
      token: generateToken(admin, admin.role),
      admin: {
        id: admin._id,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};