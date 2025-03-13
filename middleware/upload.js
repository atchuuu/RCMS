const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDirectory = "uploads/pg-images";

// Set Storage Engine for Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const pgId = req.params.pgId;
        const pgDirectory = path.join(__dirname, "..", "uploads", "pg-images", pgId);
        
        // Ensure PG directory exists
        if (!fs.existsSync(pgDirectory)) {
            fs.mkdirSync(pgDirectory, { recursive: true });
        }

        cb(null, pgDirectory);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Save with timestamp
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
