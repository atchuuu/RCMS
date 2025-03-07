const express = require("express");
const router = express.Router();
const Invoice = require("../models/Invoice");
const { generateInvoicePDF } = require("../services/invoiceGenerator");
const Tenant = require("../models/Tenant");

// 🟢 Generate and Save Invoice
router.post('/generate', async (req, res) => {
    try {
        const { pgId, roomNo, pgName, tenantName, amountDue, dueDate, upiId } = req.body;

        if (!pgId || !roomNo || !pgName || !tenantName || !amountDue || !dueDate || !upiId) {
            return res.status(400).json({ success: false, message: "All fields are required!" });
        }

        const qrCodePath = "/assets/upi_qr.png"; // Default QR Code image path

        const invoice = new Invoice({
            pgId,
            roomNo,
            pgName,
            tenantName, // ✅ Added tenant name
            amountDue,
            dueDate,
            upiId,
            qrCodeImage: qrCodePath,
            status: 'Pending'
        });

        await invoice.save();
        
        console.log("✅ Invoice saved, now generating PDF...");
        const pdfPath = await generateInvoicePDF(invoice);

        res.status(201).json({
            success: true,
            message: "Invoice generated and saved!",
            invoice,
            pdfPath
        });

    } catch (error) {
        console.error("❌ Error generating invoice:", error);
        res.status(500).json({ success: false, message: "Server error!" });
    }
});


// ✅ Get All Invoices
router.get("/", async (req, res) => {
    try {
        const invoices = await Invoice.find();
        res.status(200).json({ success: true, invoices });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error!" });
    }
});

// ✅ Get Invoices by PG ID & Room No
router.get("/:pgId/:roomNo", async (req, res) => {
    try {
        const { pgId, roomNo } = req.params;
        const invoices = await Invoice.find({ pgId, roomNo });

        if (!invoices.length) {
            return res.status(404).json({ success: false, message: "No invoices found!" });
        }

        res.status(200).json({ success: true, invoices });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error!" });
    }
});

// ✅ Mark Invoice as Paid
router.put("/:invoiceId/mark-paid", async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const { utrNumber, paymentScreenshot } = req.body;

        if (!utrNumber || !paymentScreenshot) {
            return res.status(400).json({ success: false, message: "UTR number and payment screenshot are required!" });
        }

        const invoice = await Invoice.findById(invoiceId);
        if (!invoice) {
            return res.status(404).json({ success: false, message: "Invoice not found!" });
        }

        invoice.status = "Paid";
        invoice.utrNumber = utrNumber;
        invoice.paymentScreenshot = paymentScreenshot;
        await invoice.save();

        res.status(200).json({ success: true, message: "Invoice marked as paid!", invoice });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error!" });
    }
});

// ✅ Calculate and Update Invoices for All Tenants
router.put("/calculate-invoices", async (req, res) => {
    try {
        const tenants = await Tenant.find();

        for (const tenant of tenants) {
            const electricityBill = tenant.electricityPresentMonth - tenant.electricityPastMonth;
            tenant.dueElectricityBill = electricityBill;
            tenant.totalAmountDue = tenant.rent + tenant.maintenanceAmount + electricityBill;
            await tenant.save();
        }

        res.json({ success: true, message: "Invoices calculated and updated!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error calculating invoices" });
    }
});

module.exports = router;
