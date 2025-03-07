const bcrypt = require("bcrypt");

const storedPasswordHash = "$2b$10$D9GKXuA51LOWEtpki.JLxOnasmnfC2Hw1wJBvZfse9ssU46jbAuPG"; // Copy from MongoDB
const inputPassword = "Tenant@123"; // The password you're trying to log in with

bcrypt.compare(inputPassword, storedPasswordHash)
    .then(isMatch => console.log("✅ Password Match:", isMatch))
    .catch(err => console.error("❌ Error:", err));
