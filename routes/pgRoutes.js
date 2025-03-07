const express = require("express");
const { addPG, getAllPGs, updatePG, deletePG } = require("../controllers/pgController");

const router = express.Router();

// Route to add a new PG
router.post("/add", addPG);

// Route to get all PGs
router.get("/all", getAllPGs);

// Route to update a PG by ID
router.put("/update/:id", updatePG);

// Route to delete a PG by ID
router.delete("/delete/:id", deletePG);

module.exports = router;
