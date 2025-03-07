const express = require("express");
const { addPG, getAllPGs, getPGById, updatePG, deletePG } = require("../controllers/pgController");

const router = express.Router();

// Route to add a new PG
router.post("/add", addPG);

// Route to get all PGs
router.get("/all", getAllPGs);

// Route to get a PG by pgId
router.get("/:pgId", getPGById);

// Route to update a PG by pgId
router.put("/update/:pgId", updatePG);

// Route to delete a PG by pgId
router.delete("/delete/:pgId", deletePG);

module.exports = router;
