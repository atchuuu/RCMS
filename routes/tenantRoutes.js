const express = require("express");
const Tenant = require("../models/Tenant");

const router = express.Router();

// 🟢 **1. Add a new tenant**
router.post("/add", async (req, res) => {
  try {
    const newTenant = new Tenant(req.body);
    await newTenant.save();
    res.status(201).json({ success: true, message: "Tenant added successfully!", tenant: newTenant });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error adding tenant", error });
  }
});

// 🔵 **2. Get all tenants**
router.get("/", async (req, res) => {
  try {
    const tenants = await Tenant.find();
    res.status(200).json(tenants);
  } catch (error) {
    res.status(500).json({ message: "Error fetching tenants" });
  }
});

// 🟡 **3. Update tenant details**
router.put("/update/:tid", async (req, res) => {
  try {
    const { tid } = req.params;
    const updatedTenant = await Tenant.findOneAndUpdate({ tid }, req.body, { new: true });
    if (!updatedTenant) return res.status(404).json({ message: "Tenant not found" });
    res.json({ success: true, message: "Tenant updated successfully", tenant: updatedTenant });
  } catch (error) {
    res.status(500).json({ message: "Error updating tenant" });
  }
});

// 🔴 **4. Delete a tenant**
router.delete("/delete/:tid", async (req, res) => {
  try {
    const { tid } = req.params;
    const deletedTenant = await Tenant.findOneAndDelete({ tid });
    if (!deletedTenant) return res.status(404).json({ message: "Tenant not found" });
    res.json({ success: true, message: "Tenant deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting tenant" });
  }
});

module.exports = router;
