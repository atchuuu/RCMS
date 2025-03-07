const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

async function generateInvoicePDF(invoice) {
    return new Promise((resolve, reject) => {
        console.log("📌 Starting PDF generation...");

        const doc = new PDFDocument();
        
        // Extract month and year from dueDate
        const dueDate = new Date(invoice.dueDate);
        const monthName = dueDate.toLocaleString('default', { month: 'long', year: 'numeric' });

        // Set file name format using PG ID and Room Number
        const fileName = `invoice_${invoice.pgId}_${invoice.roomNo}_${monthName}.pdf`.replace(/\s+/g, '_'); 
        const filePath = path.join(__dirname, `../invoices/${fileName}`);

        console.log("📌 PDF will be saved at:", filePath);

        // Ensure the invoices directory exists
        if (!fs.existsSync(path.dirname(filePath))) {
            console.log("📌 Creating invoices directory...");
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
        }

        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Add Logo
        const logoPath = path.join(__dirname, '../assets/logo.png');  // Change logo path if needed
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 50, 30, { width: 100 });
        }
        
        // Title
        doc.fontSize(20).text('Invoice', { align: 'center' });
        doc.moveDown();

        // Invoice Details
        doc.fontSize(12).text(`PG ID: ${invoice.pgId}`);
        doc.text(`PG Name: ${invoice.pgName}`);
        doc.text(`Tenant Name: ${invoice.tenantName}`); 
        doc.text(`Room Number: ${invoice.roomNo}`);
        doc.text(`Amount Due: ₹${invoice.amountDue}`);
        doc.text(`Due Date: ${monthName}`);
        doc.text(`UPI ID: ${invoice.upiId}`);
        doc.moveDown();

        // Add QR Code Image for UPI Payment
        const qrPath = path.join(__dirname, '../.assets/upi_qr.png'); // Ensure correct path
        if (fs.existsSync(qrPath)) {
            doc.image(qrPath, 200, doc.y, { width: 100 }) // Adjust position as needed
               .text('Scan to Pay', { align: 'center' });
        } else {
            doc.text("QR Code Image Not Found", { align: 'center' });
        }

        console.log("📌 Writing invoice details to PDF...");

        doc.end(); // Finalize the PDF

        stream.on('finish', () => {
            console.log("✅ PDF generation complete:", filePath);
            resolve(filePath);
        });

        stream.on('error', (err) => {
            console.error("❌ PDF stream error:", err);
            reject(err);
        });
    });
}

module.exports = { generateInvoicePDF };
