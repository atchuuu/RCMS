const express = require("express");
const router = express.Router();
const Invoice = require("../models/Invoice");
const { sendInvoiceWhatsApp } = require("../services/whatsappService");
const { generateInvoicePDF } = require("../services/invoiceGenerator");

// 🟢 Generate and Send Invoice

router.post("/generate", async (req, res) => {
    try {
        console.log("📩 Received POST request:", req.body);

        const { tenantId, amountDue, dueDate, upiId, qrCodeData } = req.body;

        if (!tenantId || !amountDue || !dueDate || !upiId || !qrCodeData) {
            console.error("🚨 Missing fields in request:", req.body);
            return res.status(400).json({ error: "All fields are required" });
        }

        const newInvoice = new Invoice({
            tenantId,
            amountDue,
            dueDate,
            upiId,
            qrCodeData,
            status: "Pending",
        });

        await newInvoice.save();

        console.log("✅ Invoice saved successfully:", newInvoice);

        res.json({ success: true, message: "Invoice generated and saved!", invoice: newInvoice });

    } catch (error) {
        console.error("🔥 Error generating invoice:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
});



// 🟢 Get All Invoices
router.get("/", async (req, res) => {
    try {
        const invoices = await Invoice.find();
        res.json(invoices);
    } catch (error) {
        res.status(500).json({ message: "Error fetching invoices" });
    }
});

// 🟢 Get Invoice by Tenant ID
router.get("/:tenantId", async (req, res) => {
    try {
        const invoices = await Invoice.find({ tenantId: Number(req.params.tenantId) });
        res.json(invoices);
    } catch (error) {
        res.status(500).json({ message: "Error fetching invoices" });
    }
});

// 🟢 Mark Invoice as Paid
router.put("/:invoiceId/mark-paid", async (req, res) => {
    try {
        const { utrNumber, paymentScreenshot } = req.body;
        const invoice = await Invoice.findById(req.params.invoiceId);
        if (!invoice) {
            return res.status(404).json({ message: "Invoice not found" });
        }

        invoice.status = "Paid";
        invoice.utrNumber = utrNumber;
        invoice.paymentScreenshot = paymentScreenshot;
        await invoice.save();

        res.json({ success: true, message: "Invoice marked as paid!" });
    } catch (error) {
        res.status(500).json({ message: "Error updating invoice" });
    }
});

module.exports = router;
