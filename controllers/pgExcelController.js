const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");
const PG = require("../models/PG");
const Tenant = require("../models/Tenant");

const uploadPGData = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded!" });
    }

    const pgId = req.body.pgId;
    if (!pgId) {
      return res.status(400).json({ message: "pgId is required!" });
    }

    const pg = await PG.findOne({ pgId });
    if (!pg) {
      return res.status(404).json({ message: "PG not found!" });
    }

    const costPerUnit = pg.costPerUnit || 13; // Use PG-specific costPerUnit or default to 13

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    if (data.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Excel file is empty!" });
    }

    for (const row of data) {
      const {
        roomNo,
        mainLastMonth,
        mainCurrentMonth,
        inverterLastMonth,
        inverterCurrentMonth,
        motorUnits,
        maintenanceAmount,
        rent,
      } = row;

      if (
        !roomNo ||
        mainLastMonth === undefined ||
        mainCurrentMonth === undefined ||
        inverterLastMonth === undefined ||
        inverterCurrentMonth === undefined ||
        motorUnits === undefined ||
        maintenanceAmount === undefined ||
        rent === undefined
      ) {
        console.log("Skipping row due to missing data:", row);
        continue;
      }

      const electricityDue =
        ((mainCurrentMonth - mainLastMonth) + (inverterCurrentMonth - inverterLastMonth) + motorUnits) * costPerUnit;
      const totalAmountDue = rent + electricityDue + maintenanceAmount;

      await Tenant.updateOne(
        { pgId: String(pgId), roomNo: String(roomNo) },
        {
          $set: {
            mainLastMonth,
            mainCurrentMonth,
            inverterLastMonth,
            inverterCurrentMonth,
            motorUnits,
            maintenanceAmount,
            rent,
            dueElectricityBill: electricityDue,
            totalAmountDue,
          },
        },
        { upsert: false } // Set to true if you want to create missing tenants
      );
    }

    const currentDate = new Date();
    const month = currentDate.toLocaleString("default", { month: "long" });
    const targetDir = path.join(__dirname, "..", "uploads", "excel-files", pgId, month);
    fs.mkdirSync(targetDir, { recursive: true });

    const newFileName = `${Date.now()}-${path.basename(req.file.originalname)}`;
    const newFilePath = path.join(targetDir, newFileName);
    fs.renameSync(req.file.path, newFilePath);

    res.json({ message: "PG data updated successfully!", savedAt: newFilePath });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error("Error in uploadPGData:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const processExcelFile = async (req, res) => {
  try {
    res.status(200).json({ message: "Excel file processed successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Error processing file", error: error.message });
  }
};

module.exports = { uploadPGData, processExcelFile };