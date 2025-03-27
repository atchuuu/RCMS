const PDFDocument = require("pdfkit");
const fs = require("fs"); // Use standard fs instead of fs.promises
const path = require("path");

async function generateInvoicePDF(invoice) {
  try {
    const dueDate = new Date(invoice.dueDate);
    const monthYear = dueDate.toLocaleString("default", { month: "long", year: "numeric" }).replace(" ", "");
    const dirPath = path.join(__dirname, `../invoices/${monthYear}/${invoice.pgId}`);
    const fileName = `invoice_${invoice.roomNo}.pdf`;
    const filePath = path.join(dirPath, fileName);

    // Ensure directory exists (using synchronous mkdir for simplicity, or use fs.promises.mkdir if async)
    await fs.promises.mkdir(dirPath, { recursive: true });

    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath); // Now works with standard fs
    doc.pipe(stream);

    // Header
    doc.fontSize(25).font("Helvetica-Bold").text("INVOICE", { align: "center" }).moveDown(0.5);

    // PG Details
    doc.fontSize(12).font("Helvetica")
      .text(`PG Name: ${invoice.pgName}`)
      .text(`Room No: ${invoice.roomNo}`)
      .text(`Tenant: ${invoice.tenantName}`)
      .text(`Due Date: ${dueDate.toLocaleDateString()}`)
      .moveDown(1.5);

    // Table Setup
    const tableTop = doc.y;
    const itemWidth = 300;
    const amountWidth = 100;
    const tableWidth = itemWidth + amountWidth;

    doc.fontSize(12).font("Helvetica-Bold")
      .text("Description", 50, tableTop, { width: itemWidth })
      .text("Amount (₹)", 50 + itemWidth, tableTop, { width: amountWidth, align: "right" });

    doc.moveTo(50, tableTop + 15).lineTo(50 + tableWidth, tableTop + 15).stroke();

    // Table Content
    let yPos = tableTop + 25;
    doc.fontSize(11).font("Helvetica");

    const items = [
      { desc: "Rent", amount: invoice.rent },
      { desc: "Maintenance", amount: invoice.maintenanceAmount },
      {
        desc: `Electricity (${invoice.electricityPresentMonth - invoice.electricityPastMonth} units @ ₹${invoice.costPerUnit}/unit)`,
        amount: invoice.dueElectricityBill,
      },
    ];

    items.forEach(({ desc, amount }) => {
      doc.text(desc, 50, yPos, { width: itemWidth });
      doc.text(amount.toFixed(2), 50 + itemWidth, yPos, { width: amountWidth, align: "right" });
      yPos += 20;
    });

    doc.moveTo(50, yPos - 10).lineTo(50 + tableWidth, yPos - 10).stroke();

    // Total
    doc.fontSize(12).font("Helvetica-Bold")
      .text("Total Amount Due", 50, yPos, { width: itemWidth })
      .text(`₹${invoice.totalAmountDue.toFixed(2)}`, 50 + itemWidth, yPos, { width: amountWidth, align: "right" });

    // Footer
    doc.moveDown(2).fontSize(10).font("Helvetica-Oblique")
      .text("Please pay by the due date to avoid late fees.", { align: "center" });

    doc.end();

    // Return a promise that resolves when the stream finishes
    return new Promise((resolve, reject) => {
      stream.on("finish", () => resolve(filePath));
      stream.on("error", reject);
    });
  } catch (error) {
    console.error("❌ Error generating invoice PDF:", error);
    throw error;
  }
}

module.exports = { generateInvoicePDF };