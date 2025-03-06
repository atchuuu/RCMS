const express = require("express");
const router = express.Router();

// Test route
router.get("/", (req, res) => {
    res.json({ message: "Property route is working!" });
});

module.exports = router;
