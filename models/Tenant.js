const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const TenantSchema = new mongoose.Schema(
  {
    tid: { type: Number, unique: true, default: Date.now }, // Auto-generate tenant ID
    tname: { type: String }, // Will be updated later
    mobileNumber: { type: String, required: true, unique: true }, // Required
    email: { type: String, required: true, unique: true }, // Required
    password: { type: String, required: true }, // Required
    pgId: { type: String },
     // Will be updated later
    roomNo: { type: String }, // Will be updated later
    rent: { type: Number }, // Will be updated later
    documentsUploaded: { type: Boolean, default: false },
    idCardUploaded: { type: Boolean, default: false },
    securityAmount: { type: Number, default: 500 }, // Default value to prevent missing data
    maintenanceAmount: { type: Number, default: 500 }, // Default value
    electricityPastMonth: { type: Number, default: 0 },
    electricityPresentMonth: { type: Number, default: 0 },
    dueElectricityBill: { type: Number, default: 0 },
    totalAmountDue: { type: Number, default: 0 },
    transactions: [
      {
        date: { type: Date, default: Date.now },
        amount: { type: Number },
        utrNumber: { type: String },
        status: {
          type: String,
          enum: ["Paid", "Pending", "Failed", "Cancelled"],
          default: "Pending",
        },
      },
    ],
  },
  { timestamps: true }
);

// 🔑 Hash password before saving
TenantSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model("Tenant", TenantSchema);
