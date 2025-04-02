const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const uploadExcel = require("../middleware/uploadExcel");
const { uploadPGData } = require("../controllers/pgExcelController");
const {
  addPG,
  getAllPGs,
  getPGById,
  updatePG,
  deletePG,
  uploadPGImages,
  deletePGImage,
  deleteAllImages,
  getLastPg,
  getPropertiesByAddress,
} = require("../controllers/pgController");

router.post("/upload/:pgId", upload.array("images", 5), uploadPGImages);
router.delete("/delete-images/:pgId/:imageName", deletePGImage);
router.delete("/delete-images/:pgId", deleteAllImages);
router.post("/add", addPG);
router.get("/all", getAllPGs);
router.get("/pgid/:pgId", getPGById);
router.put("/update/:pgId", updatePG);
router.get("/address/:address", getPropertiesByAddress);
router.delete("/delete/:pgId", deletePG);
router.post("/upload-excel", uploadExcel.single("file"), uploadPGData);
router.get("/last", getLastPg);

module.exports = router;