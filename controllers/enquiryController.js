const Enquiry = require("../models/Enquiry");

// ✅ Handle Enquiry Submission
exports.submitEnquiry = async (req, res) => {
    try {
        const { pgId, pgName, name, email, mobile, message } = req.body;

        if (!pgId || !pgName || !name || !email || !mobile || !message) {
            return res.status(400).json({ error: "All fields are required" });
        }

        const newEnquiry = new Enquiry({ pgId, pgName, name, email, mobile, message });
        await newEnquiry.save();

        res.status(201).json({ message: "Enquiry submitted successfully" });
    } catch (error) {
        console.error("Error submitting enquiry:", error);
        res.status(500).json({ error: "Server error. Please try again." });
    }
};

// ✅ Fetch All Enquiries (For Admin Panel)
exports.getAllEnquiries = async (req, res) => {
    try {
        const enquiries = await Enquiry.find().sort({ date: -1 });
        res.status(200).json(enquiries);
    } catch (error) {
        console.error("Error fetching enquiries:", error);
        res.status(500).json({ error: "Server error" });
    }
};
