const mongoose = require("mongoose");
const bcrypt = require("bcrypt"); // 🛠 Import bcrypt

const TenantSchema = new mongoose.Schema({
  tid: { type: Number, unique: true, required: true },
  tname: { type: String, required: true },
  mobileNumber: { type: String, required: true, unique: true }, // 🆕 Prevent duplicate numbers
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  pgName: { type: String, required: true },
  roomNo: { type: String, required: true },
  rent: { type: Number, required: true },
  documentsUploaded: { type: Boolean, default: false },
  idCardUploaded: { type: Boolean, default: false },
  securityAmount: { type: Number, required: true },
  maintenanceAmount: { type: Number, required: true, default: 500 },
  electricityPastMonth: { type: Number, default: 0 },
  electricityPresentMonth: { type: Number, default: 0 },
  dueElectricityBill: { type: Number, default: 0 },
  totalAmountDue: { type: Number, default: 0 },
  transactions: [
    {
      date: { type: Date, default: Date.now },
      amount: { type: Number, required: true },
      utrNumber: { type: String }, // 🆕 No `required: true`, so it can be empty for pending payments
      status: { 
        type: String, 
        enum: ["Paid", "Pending", "Failed", "Cancelled"], // 🆕 Added more payment statuses
        default: "Pending" 
      },
    }
  ]
}, { timestamps: true });

// 🔑 Hash password before saving
TenantSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model("Tenant", TenantSchema);
