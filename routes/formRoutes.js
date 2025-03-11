const express = require("express");
const ContactForm = require("../models/ContactForm"); // Import ContactForm model
const router = express.Router();

// Route to submit contact form data
router.post("/submit", async (req, res) => {
  try {
    const { name, email, mobile, message } = req.body;

    // Basic validation
    if (!name || !email || !mobile || !message) {
      return res.status(400).json({ error: "All fields are required." });
    }

    // Save form data in database
    const newFormEntry = new ContactForm({ name, email, mobile, message });
    await newFormEntry.save();

    res.status(201).json({ message: "Form submitted successfully!" });
  } catch (error) {
    console.error("Error submitting form:", error);
    res.status(500).json({ error: "Something went wrong!" });
  }
});

// Route to fetch all contact form submissions (for admin panel)
router.get("/submissions", async (req, res) => {
  try {
    const submissions = await ContactForm.find().sort({ createdAt: -1 });
    res.status(200).json(submissions);
  } catch (error) {
    console.error("Error fetching submissions:", error);
    res.status(500).json({ error: "Something went wrong!" });
  }
});
router.delete("/delete-all", async (req, res) => {
    try {
      await ContactForm.deleteMany({});
      res.status(200).json({ message: "All form entries deleted." });
    } catch (error) {
      console.error("Error deleting forms:", error);
      res.status(500).json({ error: "Something went wrong!" });
    }
  });
  
module.exports = router;
