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
    origin: [
      "https://localhost:3000",
      "https://localhost:3001",
      "https://192.168.1.103:3000",
      "https://192.168.1.103:3001",
      "http://localhost:3000", // Add for local HTTP frontend
      "*", // Allow all for testing (restrict later)
      "https://eec0-49-156-108-65.ngrok-free.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Fix typo: "uplads" -> "uploads"
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/documents", express.static(path.join(__dirname, "documents")));

// Routes
app.use("/api/tenant", tenantRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/pg", pgRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/contact", formRoutes);
app.use("/api/enquiry", enquiryRoutes);
app.use("/api/maintenance", maintenanceRoutes);

// Root Route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to RCMS Backend", status: "running" });
});

// 404 Handler
app.use((req, res) => {
  console.log(`Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ message: "Route not found" });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error("Server error:", err.stack);
  res.status(500).json({ message: "Internal server error" });
});

// Start Server on Port 5000, binding to all interfaces
https.createServer(sslOptions, app).listen(5000, "0.0.0.0", () => {
  console.log("✅ Server running on https://localhost:5000 and https://192.168.1.103:5000");
});