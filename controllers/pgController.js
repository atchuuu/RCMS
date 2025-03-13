const PG = require("../models/PG");
const fs = require("fs");
const path = require("path");

// Add a new PG
const addPG = async (req, res) => {
    try {
        const { pgId, name, rent, address, ownerName, contact, vacantRooms } = req.body;

        // Check if pgId is already taken
        const existingPG = await PG.findOne({ pgId });
        if (existingPG) {
            return res.status(400).json({ message: "PG ID already exists" });
        }

        const newPG = new PG({ pgId, name,rent, address, ownerName, contact, vacantRooms });
        await newPG.save();
        res.status(201).json({ message: "PG added successfully", pg: newPG });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
// Get all PGs
const getAllPGs = async (req, res) => {
    try {
        const pgs = await PG.find();
        res.status(200).json(pgs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


const getPGById = async (req, res) => {
    try {
        const { pgId } = req.params;
        const pg = await PG.findOne({ pgId });

        if (!pg) {
            return res.status(404).json({ message: "PG not found" });
        }

        res.status(200).json(pg);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getPGById };


// Update PG details by pgId
const updatePG = async (req, res) => {
    try {
        const { pgId } = req.params;
        const updatedPG = await PG.findOneAndUpdate({ pgId }, req.body, { new: true });

        if (!updatedPG) return res.status(404).json({ message: "PG not found" });

        res.status(200).json({ message: "PG updated successfully", pg: updatedPG });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete a PG by pgId
const deletePG = async (req, res) => {
    try {
        const { pgId } = req.params;
        const deletedPG = await PG.findOneAndDelete({ pgId });

        if (!deletedPG) return res.status(404).json({ message: "PG not found" });

        res.status(200).json({ message: "PG deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


const uploadPGImages = async (req, res) => {
    try {
        const pgId = req.params.pgId;

        // Find the PG by pgId
        const pg = await PG.findOne({ pgId });
        if (!pg) return res.status(404).json({ message: "PG not found" });

        const imagePaths = req.files.map(file => `/uploads/pg-images/${pgId}/${file.filename}`);

        // Add new image paths to the PG document
        pg.images.push(...imagePaths);
        await pg.save();

        res.status(200).json({ message: "Images uploaded successfully", images: pg.images });
    } catch (error) {
        console.error("❌ Error uploading images:", error);
        res.status(500).json({ message: "Server error", error });
    }
};

const deletePGImage = async (req, res) => {
    try {
        const { pgId, imageName } = req.params;
        
        // Find the PG by pgId
        const pg = await PG.findOne({ pgId });

        if (!pg) return res.status(404).json({ message: "PG not found" });

        // Construct the full image path and remove it from the images array
        const imagePath = `/uploads/pg-images/${imageName}`;
        pg.images = pg.images.filter(img => img !== imagePath);

        // Delete the image file from local storage
        fs.unlinkSync(path.join(__dirname, "..", imagePath));

        await pg.save();
        res.status(200).json({ message: "Image deleted successfully", images: pg.images });
    } catch (error) {
        console.error("❌ Error deleting image:", error);
        res.status(500).json({ message: "Server error", error });
    }
};

const deleteAllImages = async (req, res) => {
    try {
        const { pgId } = req.params;
        
        // Find the PG by pgId
        const pg = await PG.findOne({ pgId });
        if (!pg) return res.status(404).json({ message: "PG not found" });

        // Construct the directory path
        const pgDirectory = path.join(__dirname, "..", "uploads", "pg-images", pgId);

        // Check if directory exists
        if (fs.existsSync(pgDirectory)) {
            fs.rmSync(pgDirectory, { recursive: true, force: true }); // Delete directory and contents
        }

        // Remove image references from the database
        pg.images = [];
        await pg.save();

        res.status(200).json({ message: `All images for PG ${pgId} deleted successfully.` });
    } catch (error) {
        console.error("❌ Error deleting PG images:", error);
        res.status(500).json({ message: "Server error", error });
    }
};


module.exports = { addPG, getAllPGs, getPGById, updatePG, deletePG, uploadPGImages, deletePGImage,deleteAllImages };
