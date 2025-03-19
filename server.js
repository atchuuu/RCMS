const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const https = require("https");
const fs = require("fs");

// Import Routes
const tenantRoutes = require("./routes/tenantRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const pgRoutes = require("./routes/pgRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const formRoutes = require("./routes/formRoutes");
const enquiryRoutes = require("./routes/enquiryRoutes");
const maintenanceRoutes = require("./routes/maintenanceRoutes");

dotenv.config();

// Create a single Express app
const app = express();

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// SSL Certificates
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, "certs", "key.pem")),
  cert: fs.readFileSync(path.join(__dirname, "certs", "cert.pem")),
};

// Middleware
app.use(
  cors({
    origin: ["https://localhost:3000", "https://localhost:3001"], // Update for your frontend ports
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/tenant", tenantRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/pg", pgRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/contact", formRoutes);
app.use("/api/enquiry", enquiryRoutes);
app.use("/api/maintenance", maintenanceRoutes);

// 404 Handler
app.use((req, res) => {
  console.log(`Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ message: "Route not found" });
});

// Start Server on Port 5000
https.createServer(sslOptions, app).listen(5000, () => {
  console.log("✅ Server running on https://localhost:5000");
});