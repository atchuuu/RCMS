const Invoice = require("../models/Invoice");
const Tenant = require("../models/Tenant");
const { generateInvoicePDF } = require("../services/invoiceGenerator");
const path = require("path");
const fs = require("fs");

const generateInvoice = async (req, res) => {
    try {
        console.log("📌 Incoming request body:", req.body);

        const {
            pgId,
            roomNo,
            pgName,
            tenantName,
            dueDate,
            rent,
            maintenanceAmount,
            electricityPastMonth,
            electricityPresentMonth,
            dueElectricityBill,
            totalAmountDue,
            costPerUnit,
        } = req.body;

        // ✅ Check if all required fields exist
        const missingFields = [];
        if (!pgId) missingFields.push("pgId");
        if (!roomNo) missingFields.push("roomNo");
        if (!pgName) missingFields.push("pgName");
        if (!tenantName) missingFields.push("tenantName");
        if (!dueDate) missingFields.push("dueDate");
        if (rent === undefined) missingFields.push("rent");
        if (maintenanceAmount === undefined) missingFields.push("maintenanceAmount");
        if (electricityPastMonth === undefined) missingFields.push("electricityPastMonth");
        if (electricityPresentMonth === undefined) missingFields.push("electricityPresentMonth");
        if (dueElectricityBill === undefined) missingFields.push("dueElectricityBill");
        if (totalAmountDue === undefined) missingFields.push("totalAmountDue");
        if (costPerUnit === undefined) missingFields.push("costPerUnit");

        if (missingFields.length > 0) {
            console.error("❌ Missing fields:", missingFields);
            return res.status(400).json({ success: false, message: "Missing required invoice fields", missingFields });
        }

        console.log("✅ All required fields are present. Proceeding with invoice generation...");

        // ✅ Generate Invoice PDF
        const pdfPath = await generateInvoicePDF({
            pgId,
            roomNo,
            pgName,
            tenantName,
            dueDate,
            rent,
            maintenanceAmount,
            electricityPastMonth,
            electricityPresentMonth,
            dueElectricityBill,
            totalAmountDue,
            costPerUnit,
        });

        if (!pdfPath) {
            throw new Error("Failed to generate invoice PDF.");
        }

        console.log("📄 Invoice PDF generated at:", pdfPath);

        res.json({ success: true, message: "Invoice generated successfully", pdfPath });
    } catch (error) {
        console.error("❌ Error generating invoice:", error);
        res.status(500).json({ success: false, message: "Error generating invoice", error: error.message });
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

// ✅ Download Invoice
const downloadInvoice = async (req, res) => {
    try {
        const { pgId, roomNo } = req.params;
        const { monthYear } = req.query;

        if (!pgId || !roomNo || !monthYear) {
            return res.status(400).json({ error: "Missing parameters! PG ID, Room No, or Month-Year is required." });
        }

        const filePath = path.join(__dirname, `../invoices/${monthYear}/${pgId}/invoice_${roomNo}.pdf`);
        console.log("📌 Searching for invoice at:", filePath);

        if (!fs.existsSync(filePath)) {
            console.error("❌ Invoice file not found:", filePath);
            return res.status(404).json({ error: "Invoice not found" });
        }

        res.download(filePath, `invoice_${roomNo}.pdf`);
    } catch (error) {
        console.error("❌ Error in invoice download:", error);
        res.status(500).json({ error: "Server error while downloading invoice!" });
    }
};

// ✅ Mark Invoice as Paid
const markInvoiceAsPaid = async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const { utrNumber, paymentScreenshot } = req.body;
        if (!utrNumber || !paymentScreenshot) {
            return res.status(400).json({ success: false, message: "UTR number and payment screenshot required!" });
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
        const costPerUnit = req.body.costPerUnit || 10; // ✅ Use frontend value, default to 10

        for (const tenant of tenants) {
            const electricityBill = (tenant.electricityPresentMonth - tenant.electricityPastMonth) * costPerUnit;
            tenant.dueElectricityBill = electricityBill;
            tenant.totalAmountDue = tenant.rent + tenant.maintenanceAmount + electricityBill;
            await tenant.save();
        }

        res.json({ success: true, message: "Invoices calculated and updated!" });
    } catch (error) {
        console.error("❌ Error calculating invoices:", error);
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