const Invoice = require("../models/Invoice");
const Tenant = require("../models/Tenant");
const { generateInvoicePDF } = require("../services/invoiceGenerator");
const path = require("path");
const fs = require("fs").promises;

const requiredFields = [
  "pgId",
  "roomNo",
  "pgName",
  "tenantName",
  "rent",
  "maintenanceAmount",
  "electricityPastMonth",
  "electricityPresentMonth",
  "inverterPastMonth",
  "inverterPresentMonth",
  "motorUnits",
  "dueElectricityBill",
  "totalAmountDue",
  "costPerUnit",
];

// Generate a single invoice
const generateInvoice = async (req, res) => {
  try {
    const invoiceData = req.body;
    console.log("Received invoice data:", invoiceData);

    // Map tenant-specific field names if provided
    invoiceData.electricityPastMonth = invoiceData.mainLastMonth ?? invoiceData.electricityPastMonth;
    invoiceData.electricityPresentMonth = invoiceData.mainCurrentMonth ?? invoiceData.electricityPresentMonth;
    invoiceData.inverterPastMonth = invoiceData.inverterLastMonth ?? invoiceData.inverterPastMonth;
    invoiceData.inverterPresentMonth = invoiceData.inverterCurrentMonth ?? invoiceData.inverterPresentMonth;
    invoiceData.motorUnits = invoiceData.motorUnits ?? 0;

    const missingFields = requiredFields.filter((field) => invoiceData[field] === undefined || invoiceData[field] === null);
    if (missingFields.length) {
      return res.status(400).json({ success: false, message: "Missing required fields", missingFields });
    }

    // Validate tenant existence using numeric tid
    const tenant = await Tenant.findOne({ tid: Number(invoiceData.tid) });
    if (!tenant) {
      return res.status(404).json({ success: false, message: "Tenant not found" });
    }

    // Ensure tenant data matches invoice data
    invoiceData.tenantName = tenant.tname;
    invoiceData.roomNo = tenant.roomNo || invoiceData.roomNo;
    invoiceData.pgName = tenant.pgName || invoiceData.pgName;
    invoiceData.tid = tenant.tid;

    // Calculate electricity bill and total amount due
    const mainUnits = invoiceData.electricityPresentMonth - invoiceData.electricityPastMonth;
    const inverterUnits = invoiceData.inverterPresentMonth - invoiceData.inverterPastMonth;
    const totalElectricityUnits = mainUnits + inverterUnits + invoiceData.motorUnits;
    invoiceData.dueElectricityBill = totalElectricityUnits * invoiceData.costPerUnit;
    invoiceData.totalAmountDue = invoiceData.rent + invoiceData.dueElectricityBill + invoiceData.maintenanceAmount;

    // Set dueDate to 1st of next month
    const currentDate = new Date();
    invoiceData.dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);

    // Use current month for storage if monthYear not provided
    invoiceData.monthYear = invoiceData.monthYear || new Date().toLocaleString("default", { month: "long", year: "numeric" }).replace(" ", "");

    // Generate invoice number: pgId + tid + count
    const invoiceCount = await Invoice.countDocuments({ pgId: invoiceData.pgId, tid: invoiceData.tid });
    invoiceData.invoiceNumber = `${invoiceData.pgId}${invoiceData.tid}${invoiceCount + 1}`;

    console.log("Calculated invoice data:", invoiceData);

    const pdfPath = await generateInvoicePDF(invoiceData);
    const invoice = new Invoice({
      ...invoiceData,
      pdfPath,
      status: "Pending",
      generatedAt: new Date(),
    });
    await invoice.save();

    // Update tenant with latest invoice reference
    tenant.invoices = tenant.invoices || [];
    tenant.invoices.push(invoice._id);
    await tenant.save();

    res.json({
      success: true,
      message: "Invoice generated successfully",
      pdfPath,
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
    });
  } catch (error) {
    console.error("❌ Error generating invoice:", error);
    res.status(500).json({ success: false, message: "Error generating invoice", error: error.message });
  }
};

// Get all invoices
const getAllInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find().lean();
    res.status(200).json({ success: true, invoices });
  } catch (error) {
    console.error("❌ Error fetching invoices:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Get invoices by pgId and roomNo
const getInvoicesByPgIdAndRoomNo = async (req, res) => {
  try {
    const { pgId, roomNo } = req.params;
    const invoices = await Invoice.find({ pgId, roomNo }).lean();
    if (!invoices.length) {
      return res.status(404).json({ success: false, message: "No invoices found" });
    }
    res.status(200).json({ success: true, invoices });
  } catch (error) {
    console.error("❌ Error fetching invoices by pgId and roomNo:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Download invoice PDF
const downloadInvoice = async (req, res) => {
  try {
    const { pgId, roomNo } = req.params;
    const { monthYear } = req.query;

    if (!pgId || !roomNo || !monthYear) {
      return res.status(400).json({ error: "Missing parameters: pgId, roomNo, or monthYear" });
    }

    const filePath = path.join(__dirname, `../invoices/${monthYear}/${pgId}/invoice_${roomNo}.pdf`);
    console.log("Attempting to download file from:", filePath);
    try {
      await fs.access(filePath);
      res.download(filePath, `invoice_${roomNo}_${monthYear}.pdf`);
    } catch (err) {
      if (err.code === "ENOENT") {
        return res.status(404).json({ error: "Invoice file not found" });
      }
      throw err;
    }
  } catch (error) {
    console.error("❌ Error downloading invoice:", error);
    res.status(error.code === "ENOENT" ? 404 : 500).json({
      error: error.code === "ENOENT" ? "Invoice file not found" : "Server error",
    });
  }
};

// Mark invoice as paid
const markInvoiceAsPaid = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { utrNumber, paymentScreenshot } = req.body;

    if (!utrNumber || !paymentScreenshot) {
      return res.status(400).json({ success: false, message: "UTR number and payment screenshot required" });
    }

    const invoice = await Invoice.findByIdAndUpdate(
      invoiceId,
      { status: "Paid", utrNumber, paymentScreenshot, paidAt: new Date() },
      { new: true }
    );

    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }

    const tenant = await Tenant.findOne({ tid: invoice.tid });
    if (tenant) {
      tenant.dueElectricityBill = 0;
      tenant.totalAmountDue = 0;
      tenant.maintenanceAmount = 0;
      await tenant.save();
    }

    res.status(200).json({ success: true, message: "Invoice marked as paid", invoice });
  } catch (error) {
    console.error("❌ Error marking invoice as paid:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Calculate and generate invoices for all tenants
const calculateInvoices = async (req, res) => {
  try {
    const { costPerUnit = 10, pgId } = req.body;

    const query = pgId ? { pgId } : {};
    const tenants = await Tenant.find(query).lean();

    if (!tenants.length) {
      return res.status(404).json({ success: false, message: "No tenants found" });
    }

    const invoices = [];
    for (const tenant of tenants) {
      const mainUnits = (tenant.mainCurrentMonth - tenant.mainLastMonth);
      const inverterUnits = (tenant.inverterCurrentMonth - tenant.inverterLastMonth);
      const totalElectricityUnits = mainUnits + inverterUnits + (tenant.motorUnits || 0);
      const dueElectricityBill = totalElectricityUnits * costPerUnit;
      const totalAmountDue = tenant.rent + dueElectricityBill + tenant.maintenanceAmount;

      const invoiceCount = await Invoice.countDocuments({ pgId: tenant.pgId, tid: tenant.tid });
      const invoiceNumber = `${tenant.pgId}${tenant.tid}${invoiceCount + 1}`;

      const currentDate = new Date();
      const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1); // 1st of next month

      const invoiceData = {
        pgId: tenant.pgId,
        roomNo: tenant.roomNo,
        pgName: tenant.pgName,
        tenantName: tenant.tname,
        tid: tenant.tid,
        invoiceNumber,
        dueDate,
        rent: tenant.rent,
        maintenanceAmount: tenant.maintenanceAmount,
        electricityPastMonth: tenant.mainLastMonth,
        electricityPresentMonth: tenant.mainCurrentMonth,
        inverterPastMonth: tenant.inverterLastMonth,
        inverterPresentMonth: tenant.inverterCurrentMonth,
        motorUnits: tenant.motorUnits || 0,
        dueElectricityBill,
        totalAmountDue,
        costPerUnit,
        monthYear: new Date().toLocaleString("default", { month: "long", year: "numeric" }).replace(" ", ""),
      };

      const pdfPath = await generateInvoicePDF(invoiceData);
      const invoice = new Invoice({
        ...invoiceData,
        pdfPath,
        status: "Pending",
        generatedAt: new Date(),
      });
      await invoice.save();

      tenant.invoices = tenant.invoices || [];
      tenant.invoices.push(invoice._id);
      await Tenant.updateOne({ _id: tenant._id }, { invoices: tenant.invoices });

      invoices.push(invoice);
    }

    res.json({ success: true, message: "Invoices calculated and generated", invoices });
  } catch (error) {
    console.error("❌ Error calculating invoices:", error);
    res.status(500).json({ success: false, message: "Error calculating invoices", error: error.message });
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