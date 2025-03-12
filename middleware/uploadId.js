const multer = require("multer");
const path = require("path");
const fs = require("fs-extra");

// Define storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const uploadPath = path.join(__dirname, `../uploads/tenantDocuments/${file.fieldname}/`);
      await fs.ensureDir(uploadPath);
      cb(null, uploadPath);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const { mobileNumber } = req.body;
    if (!mobileNumber) {
      return cb(new Error("Missing tenant mobile number"));
    }
    const fileExt = path.extname(file.originalname);
    const fileName = `${mobileNumber}${fileExt}`;
    cb(null, fileName);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
  allowedTypes.includes(file.mimetype) ? cb(null, true) : cb(new Error("Invalid file type."));
};

// Upload instance
const uploadId = multer({ storage, fileFilter });

module.exports = uploadId;
