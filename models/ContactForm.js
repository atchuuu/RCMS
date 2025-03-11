const mongoose = require("mongoose");

const contactFormSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    mobile: { type: String, required: true },
    message: { type: String, required: true },
  },
  { timestamps: true } // This will automatically add createdAt and updatedAt fields
);

module.exports = mongoose.model("ContactForm", contactFormSchema);
