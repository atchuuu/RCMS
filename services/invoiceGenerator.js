const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

async function generateInvoicePDF(invoice) {
    return new Promise((resolve, reject) => {
        console.log("📌 Starting PDF generation...");
        const dueDate = new Date(invoice.dueDate);
        const monthYear = dueDate.toLocaleString("default", { month: "long", year: "numeric" }).replace(" ", ""); 
        
        // Correct folder structure: invoices/{MonthYear}/{pgId}/
        const dirPath = path.join(__dirname, `../invoices/${monthYear}/${invoice.pgId}`);
        
        // Ensure directory exists
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            console.log("📌 Created directory:", dirPath);
        }

        // Set correct file path inside the folder
        const fileName = `invoice_${invoice.roomNo}.pdf`;
        const filePath = path.join(dirPath, fileName);

        console.log("📌 PDF will be saved at:", filePath);

        // Create PDF
        const doc = new PDFDocument();
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Add invoice details
        doc.fontSize(20).text("Invoice", { align: "center" });
        doc.moveDown();
        doc.fontSize(12).text(`PG Name: ${invoice.pgName}`);
        doc.text(`Tenant Name: ${invoice.tenantName}`);
        doc.text(`Room No: ${invoice.roomNo}`);
        doc.text(`Amount Due: ₹${invoice.amountDue}`);
  
        doc.moveDown();

        doc.end(); // Finalize the PDF

        stream.on("finish", () => {
            console.log("✅ PDF saved successfully:", filePath);
            resolve(filePath);
        });

        stream.on("error", (err) => {
            console.error("❌ PDF stream error:", err);
            reject(err);
        });
    });
}

module.exports = { generateInvoicePDF };
