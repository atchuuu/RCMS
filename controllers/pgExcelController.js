const xlsx = require("xlsx");
const fs = require("fs");
const PG = require("../models/PG"); // PG Schema
const Tenant = require("../models/Tenant"); // Tenant Schema
const path = require("path");  // Missing import for path.join

const processExcelFile = async (req, res) => {
    try {
        console.log("Request Body:", req.body);  // Debugging

        const costPerUnit = req.body.costPerUnit;
        if (!costPerUnit) {
            return res.status(400).json({ message: "Cost per unit is required!" });
        }

        console.log("Received costPerUnit:", costPerUnit);
        console.log("Processing file:", req.file ? req.file.originalname : "No file");

        res.status(200).json({ message: "Excel file processed successfully!" });
    } catch (error) {
        res.status(500).json({ message: "Error processing file", error: error.message });
    }
};
const uploadPGData = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded!" });
        }

        const costPerUnit = parseFloat(req.body.costPerUnit || req.query.costPerUnit);
        if (isNaN(costPerUnit)) {
            return res.status(400).json({ message: "Valid cost per unit is required!" });
        }

        if (!fs.existsSync(req.file.path)) {
            return res.status(400).json({ message: "Uploaded file not found on server!" });
        }

        let workbook;
        try {
            workbook = xlsx.readFile(req.file.path);
        } catch (error) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: "Failed to read Excel file", error: error.message });
        }

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        if (data.length === 0) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: "Excel file is empty!" });
        }

        for (const row of data) {
            const { pgId, roomNo, electricityPastMonth, electricityPresentMonth, maintenanceAmount, rent } = row;

            if (!pgId || !roomNo || electricityPastMonth === undefined || electricityPresentMonth === undefined || !maintenanceAmount || !rent) {
                continue;
            }

            const electricityDue = (electricityPresentMonth - electricityPastMonth) * costPerUnit;
            const totalAmountDue = rent + maintenanceAmount + electricityDue;

            await Tenant.updateOne(
                { pgId: String(pgId), roomNo: String(roomNo) },
                {
                    $set: {
                        electricityPastMonth,
                        electricityPresentMonth,
                        dueElectricityBill: electricityDue,
                        maintenanceAmount,
                        rent,
                        totalAmountDue,
                    },
                },
                { upsert: false } // Set to true if you want to create missing tenants
            );
        }

        // 🛠️ **Move the file to `/uploads/excel-files/<pgId>/<month>/`**
        const firstRow = data[0];
        const pgId = String(firstRow.pgId); // Ensure it's a string
        const currentDate = new Date();
        const month = currentDate.toLocaleString("default", { month: "long" }); // e.g., "March"

        const targetDir = path.join(__dirname, "..", "uploads", "excel-files", pgId, month);
        fs.mkdirSync(targetDir, { recursive: true });

        // ✅ Rename and move the file
        const newFileName = `${Date.now()}-${path.basename(req.file.originalname)}`;
        const newFilePath = path.join(targetDir, newFileName);

        fs.renameSync(req.file.path, newFilePath);

        res.json({ message: "PG data updated successfully!", savedAt: newFilePath });
    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = { uploadPGData, processExcelFile };
