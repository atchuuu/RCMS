const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');

async function generateInvoice(invoiceData) {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    const filePath = `invoices/invoice_${invoiceData.tenantId}.pdf`;
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // ✅ 1. **Landlord Logo**
    doc.image('logo.png', 50, 50, { width: 100 }); // Replace with your landlord's logo

    // ✅ 2. **Invoice Header**
    doc.fontSize(20).text('Rental Invoice', { align: 'center' }).moveDown();
    doc.fontSize(12).text(`Invoice Date: ${new Date().toLocaleDateString()}`, { align: 'right' });

    // ✅ 3. **Tenant Details**
    doc.moveDown().fontSize(14).text('Tenant Details:', { underline: true });
    doc.fontSize(12)
        .text(`Name: ${invoiceData.tenantName}`)
        .text(`Property: ${invoiceData.propertyName}`)
        .text(`Address: ${invoiceData.propertyAddress}`)
        .text(`Contact: ${invoiceData.tenantContact}`)
        .moveDown();

    // ✅ 4. **Payment Table**
    doc.fontSize(14).text('Payment Details:', { underline: true });

    const tableTop = doc.y + 10;
    const itemX = 50;
    const amountX = 400;

    doc.fontSize(12)
        .text('Item', itemX, tableTop)
        .text('Amount', amountX, tableTop);

    doc.moveDown();
    doc.text('------------------------------------------', itemX, doc.y);
    doc.moveDown();

    doc.text('Rent', itemX, doc.y).text(`₹${invoiceData.rentAmount}`, amountX, doc.y);
    doc.text('Electricity Bill', itemX, doc.y + 20).text(`₹${invoiceData.electricityBill}`, amountX, doc.y + 20);
    doc.text('Water Bill', itemX, doc.y + 40).text(`₹${invoiceData.waterBill}`, amountX, doc.y + 40);
    
    doc.moveDown().text('------------------------------------------', itemX, doc.y);
    doc.fontSize(12).text(`Total Amount Due: ₹${invoiceData.totalAmount}`, { align: 'right' });

    // ✅ 5. **Due Date**
    doc.moveDown();
    doc.text(`Due Date: ${invoiceData.dueDate}`, { bold: true });

    // ✅ 6. **QR Code for Payment**
    doc.moveDown();
    doc.text('Scan to Pay:', { bold: true });

    const qrCodeData = `upi://pay?pa=${invoiceData.upiId}&am=${invoiceData.totalAmount}`;
    const qrCodeImage = await QRCode.toDataURL(qrCodeData);

    const qrBuffer = Buffer.from(qrCodeImage.split(',')[1], 'base64');
    doc.image(qrBuffer, { fit: [100, 100], align: 'center' });

    // ✅ 7. **Final Notes**
    doc.moveDown();
    doc.text('Thank you for your payment.', { align: 'center', italic: true });

    doc.end();
    
    return filePath;
}

// Example Invoice Data
const invoiceData = {
    tenantId: 123456,
    tenantName: 'John Doe',
    propertyName: 'Sunshine Apartments',
    propertyAddress: '123 Main Street, City',
    tenantContact: '+91 9876543210',
    rentAmount: 8000,
    electricityBill: 1200,
    waterBill: 500,
    totalAmount: 9700,
    dueDate: '2025-03-15',
    upiId: 'landlord@upi'
};

// Call the function
generateInvoice(invoiceData).then(filePath => {
    console.log(`Invoice saved at: ${filePath}`);
});
