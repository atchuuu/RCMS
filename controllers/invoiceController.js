const Invoice = require("../models/Invoice");
const Tenant = require("../models/Tenant");
const { generateInvoicePDF } = require("../services/invoiceGenerator");
const path = require("path");
const fs = require("fs");

// 🟢 Generate and Save Invoice
const generateInvoice = async (req, res) => {
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
            tenantName,
            amountDue,
            dueDate,
            upiId,
            qrCodeImage: qrCodePath,
            status: "Pending",
        });

        await invoice.save();

        console.log("✅ Invoice saved, now generating PDF...");
        const pdfPath = await generateInvoicePDF(invoice);

        res.status(201).json({
            success: true,
            message: "Invoice generated and saved!",
            invoice,
            pdfPath,
        });
    } catch (error) {
        console.error("❌ Error generating invoice:", error);
        res.status(500).json({ success: false, message: "Server error!" });
    }
};

// ✅ Get All Invoices
const getAllInvoices = async (req, res) => {
    try {
        const invoices = await Invoice.find();
        res.status(200).json({ success: true, invoices });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error!" });
    }
};

// ✅ Get Invoices by PG ID & Room No
const getInvoicesByPgIdAndRoomNo = async (req, res) => {
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
};

// ✅ Download Invoice PDF
const downloadInvoice = async (req, res) => {
    try {
        const { pgId, roomNo } = req.params;

        // Find the latest invoice for this pgId and roomNo
        const invoice = await Invoice.findOne({ pgId, roomNo }).sort({ dueDate: -1 });
        if (!invoice) {
            return res.status(404).json({ success: false, message: "No invoice found for this PG and room!" });
        }

        // Generate the filename based on the same logic as in generateInvoicePDF
        const dueDate = new Date(invoice.dueDate);
        const monthName = dueDate.toLocaleString("default", { month: "long", year: "numeric" });
        const fileName = `invoice_${invoice.pgId}_${invoice.roomNo}_${monthName}.pdf`.replace(/\s+/g, "_");
        const filePath = path.join(__dirname, "../invoices", fileName);

        // Check if the file exists
        if (!fs.existsSync(filePath)) {
            // If the file doesn't exist, generate it on-the-fly
            await generateInvoicePDF(invoice);
        }

        // Send the file for download
        res.download(filePath, fileName, (err) => {
            if (err) {
                console.error("❌ Error sending file:", err);
                res.status(500).json({ success: false, message: "Error downloading invoice!" });
            }
        });
    } catch (error) {
        console.error("❌ Error in download route:", error);
        res.status(500).json({ success: false, message: "Server error!" });
    }
};

// ✅ Mark Invoice as Paid
const markInvoiceAsPaid = async (req, res) => {
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
};

// ✅ Calculate and Update Invoices for All Tenants
const calculateInvoices = async (req, res) => {
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
};

module.exports = {
    generateInvoice,
    getAllInvoices,
    getInvoicesByPgIdAndRoomNo,
    downloadInvoice,
    markInvoiceAsPaid,
    calculateInvoices,
};