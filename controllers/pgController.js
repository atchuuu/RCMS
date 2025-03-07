const PG = require("../models/PG");

// Add a new PG
const addPG = async (req, res) => {
    try {
        const { pgName, address, ownerName, contact, totalRooms, vacantRooms } = req.body;

        const newPG = new PG({
            pgName,
            address,
            ownerName,
            contact,
            totalRooms,
            vacantRooms: vacantRooms || 0 // Default to 0 if not provided
        });

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

// Update PG details
const updatePG = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedPG = await PG.findByIdAndUpdate(id, req.body, { new: true });

        if (!updatedPG) return res.status(404).json({ message: "PG not found" });

        res.status(200).json({ message: "PG updated successfully", pg: updatedPG });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete a PG
const deletePG = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedPG = await PG.findByIdAndDelete(id);
        
        if (!deletedPG) return res.status(404).json({ message: "PG not found" });

        res.status(200).json({ message: "PG deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { addPG, getAllPGs, updatePG, deletePG };
