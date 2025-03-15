const Invoice = require("../models/Invoice");
const Tenant = require("../models/Tenant");
const { generateInvoicePDF } = require("../services/invoiceGenerator");
const path = require("path");
const fs = require("fs");

// 🟢 Generate and Save Invoice
const generateInvoice = async (req, res) => {
    try {
        console.log("📌 Incoming request body:", req.body);  // ✅ Debugging

        const { pgId, roomNo, pgName, tenantName, amountDue, dueDate } = req.body;

        // ✅ Check required fields before saving
        if (!pgId || !roomNo || !pgName || !tenantName || !amountDue || !dueDate ) {
            return res.status(400).json({ error: "Missing required invoice fields" });
        }

        // ✅ Save to MongoDB
        const newInvoice = new Invoice({
            pgId,
            roomNo,
            pgName,
            tenantName,
            amountDue,
            dueDate
        });
        await newInvoice.save();

        console.log("✅ Invoice saved in database:", newInvoice);

        // ✅ Generate Invoice PDF
        const pdfPath = await generateInvoicePDF(newInvoice);
        if (!pdfPath) {
            return res.status(500).json({ error: "Failed to generate invoice PDF" });
        }

        console.log("✅ Invoice PDF generated successfully:", pdfPath);
        res.status(200).json({ message: "Invoice generated successfully", pdfPath });

    } catch (error) {
        console.error("❌ Error generating invoice:", error);
        res.status(500).json({ error: "Internal Server Error" });
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
      for (const tenant of tenants) {
        const electricityBill = (tenant.electricityPresentMonth - tenant.electricityPastMonth) * tenant.costPerUnit; // Using costPerUnit
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