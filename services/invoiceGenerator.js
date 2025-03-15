const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

async function generateInvoicePDF(invoice) {
    return new Promise((resolve, reject) => {
        try {
            console.log("📌 Starting PDF generation...");
            const dueDate = new Date(invoice.dueDate);
            const monthYear = dueDate.toLocaleString("default", { month: "long", year: "numeric" }).replace(" ", "");
            
            const dirPath = path.join(__dirname, `../invoices/${monthYear}/${invoice.pgId}`);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
                console.log("📌 Created directory:", dirPath);
            }

            const fileName = `invoice_${invoice.roomNo}.pdf`;
            const filePath = path.join(dirPath, fileName);
            console.log("📌 PDF will be saved at:", filePath);

            const doc = new PDFDocument({ margin: 50 });
            const stream = fs.createWriteStream(filePath);
            doc.pipe(stream);

            // Header
            doc.fontSize(25).font('Helvetica-Bold')
                .text("INVOICE", { align: "center" });
            doc.moveDown(0.5);

            // PG Details
            doc.fontSize(12).font('Helvetica')
                .text(`PG Name: ${invoice.pgName}`, { align: "left" })
                .text(`Room No: ${invoice.roomNo}`)
                .text(`Tenant: ${invoice.tenantName}`)
                .text(`Due Date: ${dueDate.toLocaleDateString()}`);
            doc.moveDown(1.5);

            // Table Header
            const tableTop = doc.y;
            const itemWidth = 300;
            const amountWidth = 100;
            const tableWidth = itemWidth + amountWidth;

            doc.fontSize(12).font('Helvetica-Bold');
            doc.text("Description", 50, tableTop, { width: itemWidth });
            doc.text("Amount (₹)", 50 + itemWidth, tableTop, { width: amountWidth, align: "right" });

            // Table Header Line
            doc.moveTo(50, tableTop + 15)
                .lineTo(50 + tableWidth, tableTop + 15)
                .stroke();

            // Table Content
            let yPos = tableTop + 25;
            doc.fontSize(11).font('Helvetica');

            // Rent
            doc.text("Rent", 50, yPos, { width: itemWidth });
            doc.text(invoice.rent.toFixed(2), 50 + itemWidth, yPos, { width: amountWidth, align: "right" });
            yPos += 20;

            // Maintenance
            doc.text("Maintenance", 50, yPos, { width: itemWidth });
            doc.text(invoice.maintenanceAmount.toFixed(2), 50 + itemWidth, yPos, { width: amountWidth, align: "right" });
            yPos += 20;

            // Electricity Bill
            const unitsConsumed = invoice.electricityPresentMonth - invoice.electricityPastMonth;
            const electricityDesc = `Electricity (${unitsConsumed} units @ ₹${invoice.costPerUnit}/unit)`;
            doc.text(electricityDesc, 50, yPos, { width: itemWidth });
            doc.text(invoice.dueElectricityBill.toFixed(2), 50 + itemWidth, yPos, { width: amountWidth, align: "right" });
            yPos += 30;

            // Table Footer Line
            doc.moveTo(50, yPos - 10)
                .lineTo(50 + tableWidth, yPos - 10)
                .stroke();

            // Total
            doc.fontSize(12).font('Helvetica-Bold');
            doc.text("Total Amount Due", 50, yPos, { width: itemWidth });
            doc.text(`₹${invoice.totalAmountDue.toFixed(2)}`, 50 + itemWidth, yPos, { width: amountWidth, align: "right" });

            // Footer
            doc.moveDown(2);
            doc.fontSize(10).font('Helvetica-Oblique')
                .text("Please pay by the due date to avoid late fees.", { align: "center" });

            // Stream Events
            stream.on("finish", () => {
                console.log("✅ PDF saved successfully:", filePath);
                resolve(filePath);
            });

            stream.on("error", (err) => {
                console.error("❌ PDF stream error:", err);
                reject(err);
            });

            doc.end();
        } catch (error) {
            console.error("❌ Error generating invoice PDF:", error);
            reject(error);
        }
    });
}

module.exports = { generateInvoicePDF };