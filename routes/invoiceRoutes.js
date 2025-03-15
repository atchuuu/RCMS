const express = require("express");
const router = express.Router();
const invoiceController = require("../controllers/invoiceController");
const {verifyToken} = require("../middleware/authMiddleware"); // Adjust path if needed

// 🟢 Generate and Save Invoice
router.post("/generate", verifyToken, invoiceController.generateInvoice);

// ✅ Get All Invoices
router.get("/", verifyToken, invoiceController.getAllInvoices);

// ✅ Get Invoices by PG ID & Room No
router.get("/:pgId/:roomNo", verifyToken, invoiceController.getInvoicesByPgIdAndRoomNo);

// ✅ Download Invoice PDF (Likely line 17 based on your error)
router.get("/download/:pgId/:roomNo", invoiceController.downloadInvoice);

// ✅ Mark Invoice as Paid
router.put("/:invoiceId/mark-paid", verifyToken, invoiceController.markInvoiceAsPaid);

// ✅ Calculate and Update Invoices for All Tenants
router.put("/calculate-invoices", verifyToken, invoiceController.calculateInvoices);

module.exports = router;