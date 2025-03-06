const fs = require("fs");
const PDFDocument = require("pdfkit");

async function generateInvoicePDF(invoice) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument();
        const filePath = `invoices/invoice_${invoice._id}.pdf`;

        doc.pipe(fs.createWriteStream(filePath));
        doc.fontSize(18).text("Invoice", { align: "center" });
        doc.moveDown();
        doc.fontSize(12).text(`Tenant ID: ${invoice.tenantId}`);
        doc.text(`Amount Due: ₹${invoice.amountDue}`);
        doc.text(`Due Date: ${invoice.dueDate}`);
        doc.text(`UPI ID: ${invoice.upiId}`);

        doc.end();
        doc.on("finish", () => resolve(filePath));
        doc.on("error", (err) => reject(err));
    });
}

module.exports = { generateInvoicePDF };
