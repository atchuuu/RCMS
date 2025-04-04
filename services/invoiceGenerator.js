const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

async function generateInvoicePDF(invoice) {
  try {
    const dueDate = new Date(invoice.dueDate);
    const monthYear = invoice.monthYear || new Date().toLocaleString("default", { month: "long", year: "numeric" }).replace(" ", "");
    const dirPath = path.join(__dirname, `../invoices/${monthYear}/${invoice.pgId}`);
    const fileName = `invoice_${invoice.roomNo}.pdf`;
    const filePath = path.join(dirPath, fileName);

    await fs.promises.mkdir(dirPath, { recursive: true });

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.rect(0, 0, 612, 100).fill("#1E3A8A");
    doc.fontSize(20).font("Helvetica-Bold").fillColor("white").text("Rohit Cares", 50, 30).fontSize(12).text("Your Trusted PG Partner", 50, 60);
    doc.fontSize(16).text(`Invoice #${invoice.invoiceNumber}`, 400, 40, { align: "right" });
    doc.fillColor("black");

    doc.moveDown(2).fontSize(12).font("Helvetica-Bold").text("Invoice Details", 50, 120);
    doc.moveTo(50, 135).lineTo(562, 135).stroke();
    doc.fontSize(10).font("Helvetica")
      .text(`PG Name: ${invoice.pgName}`, 50, 145)
      .text(`Room No: ${invoice.roomNo}`, 50, 160)
      .text(`Tenant: ${invoice.tenantName}`, 50, 175)
      .text(`Generated: ${new Date().toLocaleDateString()}`, 400, 145, { align: "right" })
      .text(`Due Date: ${dueDate.toLocaleDateString()}`, 400, 160, { align: "right" });

    const tableTop = 200;
    const itemWidth = 300;
    const amountWidth = 100;
    const tableWidth = itemWidth + amountWidth + 50;

    doc.fontSize(12).font("Helvetica-Bold").text("Description", 50, tableTop, { width: itemWidth }).text("Amount (₹)", 400, tableTop, { width: amountWidth, align: "right" });
    doc.moveTo(50, tableTop + 15).lineTo(50 + tableWidth, tableTop + 15).stroke();

    let yPos = tableTop + 25;
    doc.fontSize(10).font("Helvetica");

    const mainUnits = invoice.electricityPresentMonth - invoice.electricityPastMonth;
    const inverterUnits = invoice.inverterPresentMonth - invoice.inverterPastMonth;

    const items = [
      { desc: "Rent", amount: invoice.rent },
      { desc: "Maintenance", amount: invoice.maintenanceAmount },
      { desc: `Main Electricity (${mainUnits} units @ ₹${invoice.costPerUnit}/unit)`, amount: mainUnits * invoice.costPerUnit },
      { desc: `Inverter Electricity (${inverterUnits} units @ ₹${invoice.costPerUnit}/unit)`, amount: inverterUnits * invoice.costPerUnit },
      { desc: `Motor Units (${invoice.motorUnits} units @ ₹${invoice.costPerUnit}/unit)`, amount: invoice.motorUnits * invoice.costPerUnit },
    ];

    // Add fine if it exists and is greater than 0
    if (invoice.electricityFine && invoice.electricityFine > 0) {
      items.push({ desc: "Electricity Fine (10%)", amount: invoice.electricityFine });
    }

    items.forEach(({ desc, amount }, index) => {
      doc.fillColor(index % 2 === 0 ? "#F3F4F6" : "white").rect(50, yPos - 5, tableWidth, 20).fill();
      doc.fillColor("black").text(desc, 55, yPos, { width: itemWidth }).text(amount.toFixed(2), 400, yPos, { width: amountWidth, align: "right" });
      yPos += 20;
    });

    doc.moveTo(50, yPos - 5).lineTo(50 + tableWidth, yPos - 5).stroke();
    doc.fontSize(12).font("Helvetica-Bold").text("Total Amount Due", 55, yPos, { width: itemWidth }).text(`₹${invoice.totalAmountDue.toFixed(2)}`, 400, yPos, { width: amountWidth, align: "right" });

    doc.moveDown(2).fontSize(10).font("Helvetica-Oblique")
      .text("Please pay by the due date to avoid late fees.", 50, doc.y, { align: "center" })
      .text("Contact us: support@rohitcares.com | +91 98781 17788", 50, doc.y + 15, { align: "center" });

    doc.rect(40, 110, 532, yPos + 30 - 110).stroke();
    doc.end();

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