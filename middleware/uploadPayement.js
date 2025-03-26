const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempPath = path.join(__dirname, "../uploads/temp");
    cb(null, tempPath); // Save to a temporary directory
  },
  filename: (req, file, cb) => {
    const month = new Date().toLocaleString("default", { month: "long" }).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`; // Ensure uniqueness
    cb(null, `${month}-${uniqueSuffix}${path.extname(file.originalname)}`); // e.g., march-1698765432112-123456789.jpg
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