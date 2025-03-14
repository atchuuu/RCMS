const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const https = require("https");
const fs = require("fs");
const tenantRoutes = require("./routes/tenantRoutes"); // Ensure path is correct
const invoiceRoutes = require("./routes/invoiceRoutes");
const pgRoutes = require("./routes/pgRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const formRoutes = require("./routes/formRoutes");
const enquiryRoutes = require("./routes/enquiryRoutes");
const maintenanceRoutes = require("./routes/maintenanceRoutes"); // Import routes

dotenv.config();

const app = express();

// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Routes

app.use("/api/tenant", tenantRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/pg", pgRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/contact", formRoutes);
app.use("/api/enquiry", enquiryRoutes);
app.use("/api/maintenance", maintenanceRoutes);

// Catch-all for 404s (for debugging)
app.use((req, res) => {
  console.log(`Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ message: "Route not found" });
});

// SSL Certificates
const options = {
  key: fs.readFileSync("server.key"),
  cert: fs.readFileSync("server.cert"),
};

// Start Server
https.createServer(options, app).listen(process.env.PORT || 5000, () => {
  console.log(`Secure server running on https://localhost:${process.env.PORT || 5000}`);
});