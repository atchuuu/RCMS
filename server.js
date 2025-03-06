require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Sample Route
app.get("/", (req, res) => {
  res.send("Backend is running...");
});

app.get("/api/test", (req, res) => {
    res.json({ message: "API is working!" });
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/tenants", require("./routes/tenantRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/properties", require("./routes/propertyRoutes"));
app.use("/api/invoices", require("./routes/invoiceRoutes"));

// Server Listening
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
