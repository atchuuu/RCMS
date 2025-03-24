const multer = require("multer");
const path = require("path");
const fs = require("fs-extra");

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      let uploadPath;
      if (file.fieldname === "aadharFront") {
        uploadPath = path.join(__dirname, `../documents/aadhar/${req.body.pgName}/front/temp`);
      } else if (file.fieldname === "aadharBack") {
        uploadPath = path.join(__dirname, `../documents/aadhar/${req.body.pgName}/back/temp`);
      } else if (file.fieldname === "idCard") {
        uploadPath = path.join(__dirname, `../documents/idcard/${req.body.pgName}/temp`);
      }
      await fs.ensureDir(uploadPath);
      cb(null, uploadPath);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const fileExt = path.extname(file.originalname);
    const fileName = `${Date.now()}${fileExt}`; // Temporary filename with original extension
    cb(null, fileName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
  allowedTypes.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error("Invalid file type. Only JPEG, PNG, and PDF are allowed."));
};

const uploadId = multer({ storage, fileFilter });

module.exports = uploadId;