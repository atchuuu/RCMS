const multer = require("multer");
const path = require("path");
const fs = require("fs-extra");

// Define storage for ID Cards and Documents
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const idCardPath = path.join(__dirname, "../uploads/tenantDocuments/idCard/");
      const documentPath = path.join(__dirname, "../uploads/tenantDocuments/documents/");

      // Create directories if they don’t exist
      await fs.ensureDir(idCardPath);
      await fs.ensureDir(documentPath);

      // Store based on file fieldname
      if (file.fieldname === "idCard") {
        cb(null, idCardPath);
      } else if (file.fieldname === "documents") {
        cb(null, documentPath);
      } else {
        cb(new Error("Invalid file type"));
      }
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const { tenantName, mobileNumber } = req.body; // Tenant details from request
    if (!tenantName || !mobileNumber) {
      return cb(new Error("Missing tenant details"));
    }

    const fileExt = path.extname(file.originalname);
    const fileName = `${tenantName}_${mobileNumber}${fileExt}`;
    cb(null, fileName);
  },
});

// Multer file filter (optional)
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPEG, PNG, and PDF are allowed."));
  }
};

// Multer upload instance
const upload = multer({ storage, fileFilter });

module.exports = upload;
