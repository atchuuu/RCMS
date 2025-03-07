const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const listEndpoints = require("express-list-endpoints");
const invoiceRoutes = require("./routes/invoiceRoutes");
const tenantRoutes = require("./routes/tenantRoutes");
const app = express();
const path = require("path");
app.use(express.json());
app.use(cors());
app.use("/api/tenants", tenantRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/assets", express.static(path.join(__dirname, ".assets")));
mongoose.connect("mongodb://127.0.0.1:27017/rentalDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.get("/", (req, res) => {
  res.send("🏡 Rental Property Management System API is running...");
});


console.log(listEndpoints(app));

const PORT = process.env.PORT||5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
