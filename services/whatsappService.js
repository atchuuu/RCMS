const axios = require("axios");

// Function to send invoice via WhatsApp (Mock Implementation)
async function sendInvoiceWhatsApp(tenantId, pdfPath) {
    try {
        console.log(`📩 Sending invoice to tenant ${tenantId} via WhatsApp...`);
        console.log(`Invoice PDF Path: ${pdfPath}`);

        // Here, integrate with a WhatsApp API (Twilio, WhatsApp Cloud API, etc.)
        // Example: Sending message using a mock API
        const response = await axios.post("https://api.whatsapp.com/send", {
            tenantId,
            message: `Your invoice is ready. Download it here: ${pdfPath}`,
        });

        console.log("✅ WhatsApp Message Sent:", response.data);
        return response.data;
    } catch (error) {
        console.error("❌ Error sending WhatsApp message:", error.message);
        throw new Error("Failed to send invoice via WhatsApp.");
    }
}

module.exports = { sendInvoiceWhatsApp };
