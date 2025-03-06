const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const listEndpoints = require("express-list-endpoints");

const invoiceRoutes = require("./routes/invoiceRoutes");

const app = express();
app.use(express.json());
app.use(cors());

mongoose
  .connect("mongodb://127.0.0.1:27017/rentalDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.use("/api/invoices", invoiceRoutes);

// Debugging: Print all routes
console.log(listEndpoints(app));


const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
