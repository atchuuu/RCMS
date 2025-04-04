const Invoice = require("../models/Invoice");
const Tenant = require("../models/Tenant");
const { generateInvoicePDF } = require("../services/invoiceGenerator");
const path = require("path");
const fs = require("fs").promises;
const twilio = require("twilio");

// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER; // e.g., "whatsapp:+14155238886"
const client = twilio(accountSid, authToken);

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

// Function to send WhatsApp message with PDF
const sendWhatsAppInvoice = async (tenant, invoiceData, pdfPath) => {
  try {
    const monthYear = invoiceData.monthYear;
    const messageBody = `Hello ${tenant.tname},\nYour ${monthYear} invoice for ${tenant.pgName}, Room ${tenant.roomNo} is attached:\n- Rent: ₹${invoiceData.rent}\n- Maintenance: ₹${invoiceData.maintenanceAmount}\n- Electricity: ₹${invoiceData.dueElectricityBill}\n- Fine: ₹${invoiceData.electricityFine || 0}\n- Total Due: ₹${invoiceData.totalAmountDue}\nDue by: ${new Date(invoiceData.dueDate).toLocaleDateString()}\nPay on time to avoid late fees! Contact us at +91-XXXXXXXXXX for queries.`;

    const pdfUrl = `${process.env.BACKEND_URL}/invoices/${monthYear}/${invoiceData.pgId}/invoice_${invoiceData.roomNo}.pdf`;

    const message = await client.messages.create({
      from: twilioPhoneNumber,
      to: `whatsapp:${tenant.mobileNumber}`,
      body: messageBody,
      mediaUrl: [pdfUrl], // Attach the PDF
    });

    console.log(`✅ WhatsApp message sent to ${tenant.mobileNumber}: ${message.sid}`);
    return { success: true, messageSid: message.sid };
  } catch (error) {
    console.error("❌ Error sending WhatsApp message:", error);
    throw new Error("Failed to send WhatsApp message");
  }
};

const generateInvoice = async (req, res) => {
  try {
    const invoiceData = req.body;
    console.log("Received invoiceData:", invoiceData);

    invoiceData.electricityPastMonth = invoiceData.mainLastMonth ?? invoiceData.electricityPastMonth;
    invoiceData.electricityPresentMonth = invoiceData.mainCurrentMonth ?? invoiceData.electricityPresentMonth;
    invoiceData.inverterPastMonth = invoiceData.inverterLastMonth ?? invoiceData.inverterPastMonth;
    invoiceData.inverterPresentMonth = invoiceData.inverterCurrentMonth ?? invoiceData.inverterPresentMonth;
    invoiceData.motorUnits = invoiceData.motorUnits ?? 0;

    const missingFields = requiredFields.filter((field) => invoiceData[field] === undefined || invoiceData[field] === null);
    if (missingFields.length) {
      console.log("Missing fields:", missingFields);
      return res.status(400).json({ success: false, message: "Missing required fields", missingFields });
    }

    console.log("Fetching tenant with tid:", invoiceData.tid);
    const tenant = await Tenant.findOne({ tid: Number(invoiceData.tid) });
    if (!tenant) return res.status(404).json({ success: false, message: "Tenant not found" });
    console.log("Found tenant:", tenant);

    invoiceData.tenantName = tenant.tname;
    invoiceData.roomNo = tenant.roomNo || invoiceData.roomNo;
    invoiceData.pgName = tenant.pgName || invoiceData.pgName;
    invoiceData.tid = tenant.tid;

    const mainUnits = invoiceData.electricityPresentMonth - invoiceData.electricityPastMonth;
    const inverterUnits = invoiceData.inverterPresentMonth - invoiceData.inverterPastMonth;
    const totalElectricityUnits = mainUnits + inverterUnits + invoiceData.motorUnits;
    invoiceData.dueElectricityBill = totalElectricityUnits * invoiceData.costPerUnit;

    invoiceData.electricityFine = invoiceData.electricityFine || tenant.electricityFine || 0;
    invoiceData.dueElectricityBill += invoiceData.electricityFine;

    invoiceData.totalAmountDue = invoiceData.rent + invoiceData.dueElectricityBill + invoiceData.maintenanceAmount;

    invoiceData.dueDate = new Date(invoiceData.dueDate || new Date().setMonth(new Date().getMonth() + 1));
    invoiceData.monthYear = invoiceData.monthYear || new Date().toLocaleString("default", { month: "long", year: "numeric" }).replace(" ", "");

    console.log("Counting invoices for pgId:", invoiceData.pgId, "tid:", invoiceData.tid);
    const invoiceCount = await Invoice.countDocuments({ pgId: invoiceData.pgId, tid: invoiceData.tid });
    invoiceData.invoiceNumber = `${invoiceData.pgId}${invoiceData.tid}${invoiceCount + 1}`;

    console.log("Generating PDF with invoiceData:", invoiceData);
    const pdfPath = await generateInvoicePDF(invoiceData);
    console.log("PDF generated at:", pdfPath);

    const invoice = new Invoice({
      ...invoiceData,
      pdfPath,
      status: "Pending",
      generatedAt: new Date(),
    });
    await invoice.save();
    console.log("Invoice saved:", invoice._id);

    tenant.invoices = tenant.invoices || [];
    tenant.invoices.push(invoice._id);
    await tenant.save();
    console.log("Tenant updated with invoice:", tenant._id);

    console.log("Sending WhatsApp message to:", tenant.mobileNumber);
    await sendWhatsAppInvoice(tenant, invoiceData, pdfPath);

    res.json({
      success: true,
      message: "Invoice generated and sent via WhatsApp",
      pdfPath,
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
    });
  } catch (error) {
    console.error("❌ Error generating invoice:", error.stack);
    res.status(500).json({ success: false, message: "Error generating invoice", error: error.message });
  }
};
const calculateInvoices = async (req, res) => {
  try {
    const { costPerUnit = 10, pgId } = req.body;

    const query = pgId ? { pgId } : {};
    const tenants = await Tenant.find(query).lean();

    if (!tenants.length) return res.status(404).json({ success: false, message: "No tenants found" });

    const invoices = [];
    for (const tenant of tenants) {
      const mainUnits = (tenant.mainCurrentMonth - tenant.mainLastMonth);
      const inverterUnits = (tenant.inverterCurrentMonth - tenant.inverterLastMonth);
      const totalElectricityUnits = mainUnits + inverterUnits + (tenant.motorUnits || 0);
      let dueElectricityBill = totalElectricityUnits * costPerUnit;

      const electricityFine = tenant.electricityFine || 0;
      dueElectricityBill += electricityFine;

      const totalAmountDue = tenant.rent + dueElectricityBill + tenant.maintenanceAmount;

      const invoiceCount = await Invoice.countDocuments({ pgId: tenant.pgId, tid: tenant.tid });
      const invoiceNumber = `${tenant.pgId}${tenant.tid}${invoiceCount + 1}`;

      const currentDate = new Date();
      const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);

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
        electricityFine,
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

      await Tenant.updateOne({ _id: tenant._id }, { $push: { invoices: invoice._id } });

      // Automate WhatsApp sending for batch invoices
      const tenantDoc = await Tenant.findOne({ tid: tenant.tid }); // Fetch full tenant document
      await sendWhatsAppInvoice(tenantDoc, invoiceData, pdfPath);

      invoices.push(invoice);
    }

    res.json({ success: true, message: "Invoices calculated and sent via WhatsApp", invoices });
  } catch (error) {
    console.error("❌ Error calculating invoices:", error);
    res.status(500).json({ success: false, message: "Error calculating invoices", error: error.message });
  }
};

// Other functions remain unchanged
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

const getAllInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find().lean();
    res.status(200).json({ success: true, invoices });
  } catch (error) {
    console.error("❌ Error fetching invoices:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
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