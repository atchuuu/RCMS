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
    res.status(200).json(pgs); // Return full PG objects: [{ name, address, rent, ... }]
  } catch (error) {
    console.error("Error fetching PGs:", error.message);
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


// Update PG details by pgId
const updatePG = async (req, res) => {
    try {
      const { pgId } = req.params;
      const updates = req.body;
  
      delete updates.pgId; // Prevent updating pgId
  
      const pg = await PG.findOneAndUpdate(
        { pgId },
        { $set: updates },
        { new: true, runValidators: true }
      );
  
      if (!pg) {
        return res.status(404).json({ message: "PG not found" });
      }
  
      res.status(200).json(pg);
    } catch (error) {
      console.error("❌ Error updating PG:", error);
      res.status(500).json({ message: "Server error", error });
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
  
      // Construct the full image path with pgId
      const imagePath = `/uploads/pg-images/${pgId}/${imageName}`;
      console.log("Attempting to delete image at path:", imagePath); // Debug log
  
      // Check if the image exists in the images array
      if (!pg.images.includes(imagePath)) {
        return res.status(404).json({ message: "Image not found in PG record" });
      }
  
      // Remove the image from the images array
      pg.images = pg.images.filter(img => img !== imagePath);
  
      // Delete the image file from local storage if it exists
      const fullPath = path.join(__dirname, "..", imagePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log(`Deleted file: ${fullPath}`);
      } else {
        console.warn(`File not found on disk: ${fullPath}, proceeding with database update`);
      }
  
      await pg.save({ validateBeforeSave: false }); // Skip validation
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

const getLastPg = async (req, res) => {
    try {
        const lastPg = await PG.findOne().sort({ _id: -1 });
        res.status(200).json(lastPg || {});
      } catch (error) {
        res.status(500).json({ message: "Server error: " + error.message });
      }
    };

    const getPropertiesByAddress = async (req, res) => {
      try {
          console.log("Received params:", req.params); // Debugging line
          const { address } = req.params;
  
          if (!address) {
              return res.status(400).json({ message: "Address parameter is required." });
          }
  
          // Ensure case-insensitive and exact match filtering
          const properties = await PG.find({ address: { $regex: new RegExp(`^${address}$`, "i") } });
  
          if (properties.length === 0) {
              return res.status(404).json({ message: `No PGs found for address: ${address}` });
          }
  
          res.status(200).json(properties);
      } catch (error) {
          console.error("Error fetching PGs by address:", error);
          res.status(500).json({ message: "Server error" });
      }
  };
  
module.exports = { addPG, getAllPGs, getPGById, updatePG, deletePG, uploadPGImages, deletePGImage,deleteAllImages, getLastPg, getPropertiesByAddress };
