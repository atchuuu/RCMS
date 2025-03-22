const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log("Inside upload middleware, req.tenant:", req.tenant); // Debug
    const { pgName, roomNo } = req.tenant || {};
    if (!pgName || !roomNo) {
      console.error("Missing pgName or roomNo in req.tenant:", req.tenant);
      return cb(new Error("Tenant pgName or roomNo missing"));
    }
    const month = new Date().toLocaleString("default", { month: "long" }).toLowerCase();
    const uploadPath = path.join(__dirname, "../uploads/payment_screenshots", pgName, roomNo);

    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const month = new Date().toLocaleString("default", { month: "long" }).toLowerCase();
    cb(null, `${month}.jpg`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Only JPEG/PNG images are allowed"));
  },
}).single("screenshot");

module.exports = upload;