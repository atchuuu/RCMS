const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const https = require("https");
const fs = require("fs");
const os = require("os"); // Add this to get network interfaces

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

// Function to get the server's IP address dynamically
function getServerIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (e.g., 127.0.0.1) and non-IPv4 addresses
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost"; // Fallback if no external IP is found
}

// Dynamic CORS origins
const serverIp = getServerIp();
const corsOrigins = [
  "https://localhost:3000",
  "https://localhost:3001",
  `https://${serverIp}:3000`, // Dynamically add server IP for port 3000
  `https://${serverIp}:3001`, // Dynamically add server IP for port 3001
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://127.0.0.1:3000",
  "https://172.20.10.2:3000",
  "https://eec0-49-156-108-65.ngrok-free.app",
  "*",
];

// Middleware
app.use(
  cors({
    origin: corsOrigins, // Use the dynamic array
    methods: ["GET", "POST", "PUT", "DELETE"], // Fixed typo from previous code
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
const port = 5000;
https.createServer(sslOptions, app).listen(port, "0.0.0.0", () => {
  console.log(`✅ Server running on https://${serverIp}:${port}`);
});