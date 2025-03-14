const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const path=require("path")
const multer = require("multer");
const fs = require("fs");
const https = require("https");
const tenantRoutes = require("./routes/tenantRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const pgRoutes = require("./routes/pgRoutes");
const authRoutes = require("./routes/authRoutes"); // 🆕 Added authentication routes
const adminRoutes = require("./routes/adminRoutes");
const formRoutes = require("./routes/formRoutes");
const enquiryRoutes = require("./routes/enquiryRoutes");

dotenv.config();

const app = express();




// Load SSL certificates
const options = {
    key: fs.readFileSync("server.key"),
    cert: fs.readFileSync("server.cert"),
};
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

app.use("/api/tenants", tenantRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/pg", pgRoutes);
app.use("/api/auth", authRoutes); // ✅ Added auth routes
app.use("/api/admin", adminRoutes);
app.use("/api/tenant", tenantRoutes);
app.use("/api/contact", formRoutes);
app.use("/api/enquiry", enquiryRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


https.createServer(options, app).listen(process.env.PORT || 5000, () => {
  console.log("Secure server running on https://localhost:5000");
});
