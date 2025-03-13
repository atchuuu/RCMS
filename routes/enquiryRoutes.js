const express = require("express");
const router = express.Router();
const { submitEnquiry, getAllEnquiries } = require("../controllers/enquiryController");

router.post("/submit", submitEnquiry); // ✅ Submit enquiry
router.get("/all", getAllEnquiries); // ✅ Get all enquiries (for admin)

module.exports = router;
