const Invoice = require("../models/Invoice");
const Tenant = require("../models/Tenant");
const { generateInvoicePDF } = require("../services/invoiceGenerator");
const path = require("path");
const fs = require("fs").promises;

const requiredFields = [
  "pgId", "roomNo", "pgName", "tenantName", "dueDate", "rent",
  "maintenanceAmount", "electricityPastMonth", "electricityPresentMonth",
  "dueElectricityBill", "totalAmountDue", "costPerUnit",
];

const generateInvoice = async (req, res) => {
  try {
    const invoiceData = req.body;
    const missingFields = requiredFields.filter((field) => invoiceData[field] === undefined);
    if (missingFields.length) {
      return res.status(400).json({ success: false, message: "Missing required fields", missingFields });
    }

    const pdfPath = await generateInvoicePDF(invoiceData);
    // Optionally save invoice metadata to DB
    const invoice = new Invoice({
      ...invoiceData,
      pdfPath,
      status: "Pending",
    });
    await invoice.save();

    res.json({ success: true, message: "Invoice generated successfully", pdfPath, invoiceId: invoice._id });
  } catch (error) {
    console.error("❌ Error generating invoice:", error);
    res.status(500).json({ success: false, message: "Error generating invoice", error: error.message });
  }
};

const getAllInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find().lean();
    res.status(200).json({ success: true, invoices });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getInvoicesByPgIdAndRoomNo = async (req, res) => {
  try {
    const { pgId, roomNo } = req.params;
    const invoices = await Invoice.find({ pgId, roomNo }).lean();
    if (!invoices.length) {
      return res.status(404).json({ success: false, message: "No invoices found" });
    }
    res.status(200).json({ success: true, invoices });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const downloadInvoice = async (req, res) => {
  try {
    const { pgId, roomNo } = req.params;
    const { monthYear } = req.query;

    if (!pgId || !roomNo || !monthYear) {
      return res.status(400).json({ error: "Missing parameters: pgId, roomNo, or monthYear" });
    }

    const filePath = path.join(__dirname, `../invoices/${monthYear}/${pgId}/invoice_${roomNo}.pdf`);
    await fs.access(filePath);
    res.download(filePath, `invoice_${roomNo}.pdf`);
  } catch (error) {
    console.error("❌ Error downloading invoice:", error.code === "ENOENT" ? "File not found" : error);
    res.status(error.code === "ENOENT" ? 404 : 500).json({
      error: error.code === "ENOENT" ? "Invoice not found" : "Server error",
    });
  }
};

const markInvoiceAsPaid = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { utrNumber, paymentScreenshot } = req.body;

    if (!utrNumber || !paymentScreenshot) {
      return res.status(400).json({ success: false, message: "UTR number and payment screenshot required" });
    }

    const invoice = await Invoice.findByIdAndUpdate(
      invoiceId,
      { status: "Paid", utrNumber, paymentScreenshot },
      { new: true }
    );

    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }

    res.status(200).json({ success: true, message: "Invoice marked as paid", invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const calculateInvoices = async (req, res) => {
  try {
    const costPerUnit = req.body.costPerUnit || 10;
    const tenants = await Tenant.find().lean();

    const updates = tenants.map((tenant) => {
      const electricityBill = (tenant.electricityPresentMonth - tenant.electricityPastMonth) * costPerUnit;
      return {
        updateOne: {
          filter: { _id: tenant._id },
          update: {
            dueElectricityBill: electricityBill,
            totalAmountDue: tenant.rent + tenant.maintenanceAmount + electricityBill,
          },
        },
      };
    });

    await Tenant.bulkWrite(updates);
    res.json({ success: true, message: "Invoices calculated and updated" });
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