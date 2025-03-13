const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const uploadExcel = require("../middleware/uploadExcel");
const { uploadPGData } = require("../controllers/pgExcelController");
// ✅ Import all controller functions in one statement
const { 
    addPG, 
    getAllPGs, 
    getPGById, 
    updatePG, 
    deletePG, 
    uploadPGImages, 
    deletePGImage 
} = require("../controllers/pgController");

// Route to upload PG images
router.post("/upload/:pgId", upload.array("images", 5), uploadPGImages);

// Delete PG Image
router.delete("/delete/:pgId/:imageName", deletePGImage);

// Route to add a new PG
router.post("/add", addPG);

// Route to get all PGs
router.get("/all", getAllPGs);

// Route to get a PG by pgId
router.get("/pgid/:pgId", getPGById); // ✅ Change route to avoid conflict with MongoDB ID


// Route to update a PG by pgId
router.put("/update/:pgId", updatePG);

// Route to delete a PG by pgId
router.delete("/delete/:pgId", deletePG);

router.post("/upload-excel", uploadExcel.single("file"), uploadPGData);

module.exports = router;
