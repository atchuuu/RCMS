const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create the uploads/pg-images directory if it doesn't exist
const uploadDirectory = "uploads/pg-images";
if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
}

// Set Storage Engine for Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDirectory); // Store images in the "uploads/pg-images/" folder
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Use a unique filename based on timestamp
    }
});

// File Filter (Only Images)
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true); // Accept the file
    } else {
        cb(new Error("Only image files are allowed!"), false); // Reject non-image files
    }
};

// Multer Configuration
const upload = multer({ storage, fileFilter });

module.exports = upload;
