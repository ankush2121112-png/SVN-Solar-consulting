const express = require("express");
const storage = require("../services/storage");
const SolarSystem = storage.models.SolarSystem;
const User = storage.models.User;

const router = express.Router();

async function getCurrentUser(req) {
  if (!req.session.userId) return null;
  const engine = storage.getEngine();
  if (engine === "supabase") {
    return await storage.supabaseDb.findUserById(req.session.userId);
  } else if (engine === "mongodb") {
    return await User.findById(req.session.userId);
  } else {
    return storage.fallbackStore.users.find(u => u._id === req.session.userId) || null;
  }
}

// Get customer systems
router.get("/mine", async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "Please log in to view solar systems." });
    }

    const engine = storage.getEngine();

    if (engine === "supabase") {
      let filter = {};
      if (user.role !== "admin") {
        filter = { customerId: user.id || user._id, customerEmail: user.email };
      }
      const systems = await storage.supabaseDb.getSolarSystems(filter);
      return res.json({ systems });
    } else if (engine === "mongodb") {
      let systems = [];
      if (user.role === "admin") {
        systems = await SolarSystem.find().sort({ createdAt: -1 });
      } else {
        systems = await SolarSystem.find({
          $or: [{ customer: user._id }, { customerEmail: user.email }]
        }).sort({ createdAt: -1 });
      }
      return res.json({ systems });
    } else {
      let systems = [];
      if (user.role === "admin") {
        systems = storage.fallbackStore.systems;
      } else {
        systems = storage.fallbackStore.systems.filter(
          s => s.customer === user._id || (s.customerEmail && s.customerEmail === user.email)
        );
      }
      return res.json({ systems });
    }
  } catch (err) {
    next(err);
  }
});

// Admin creates a solar system record
router.post("/", async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Only Admin can register solar system records." });
    }

    const {
      customerEmail,
      customerName,
      customerPhone = "",
      city,
      capacityKw,
      systemType = "Residential Rooftop",
      panelBrand = "Tier-1 Mono PERC Bifacial",
      panelQuantity = 8,
      inverterBrand = "On-Grid String Inverter",
      inverterCapacity = "3 kW",
      warrantyYears = 25,
      inverterWarrantyYears = 5,
      notes = ""
    } = req.body;

    if (!customerEmail || !customerName || !city || !capacityKw) {
      return res.status(400).json({
        error: "Customer email, customer name, city, and capacity (kW) are required."
      });
    }

    const systemId = "SVN-SYS-" + Math.floor(100 + Math.random() * 900);
    const engine = storage.getEngine();

    if (engine === "supabase") {
      const custUser = await storage.supabaseDb.findUserByEmail(customerEmail);
      const newSys = await storage.supabaseDb.createSolarSystem({
        systemId,
        customer: custUser ? (custUser.id || custUser._id) : null,
        customerEmail: String(customerEmail).trim().toLowerCase(),
        customerName: String(customerName).trim(),
        customerPhone: String(customerPhone).trim(),
        city: String(city).trim(),
        capacityKw: Number(capacityKw),
        systemType,
        panelBrand,
        panelQuantity: Number(panelQuantity),
        inverterBrand,
        inverterCapacity,
        warrantyYears: Number(warrantyYears),
        inverterWarrantyYears: Number(inverterWarrantyYears),
        notes
      });
      return res.status(201).json({
        message: "Customer Solar File & Warranty record created successfully!",
        system: newSys
      });
    } else if (engine === "mongodb") {
      const custUser = await User.findOne({ email: String(customerEmail).trim().toLowerCase() });
      const newSys = await SolarSystem.create({
        systemId,
        customer: custUser ? custUser._id : null,
        customerEmail: String(customerEmail).trim().toLowerCase(),
        customerName: String(customerName).trim(),
        customerPhone: String(customerPhone).trim(),
        city: String(city).trim(),
        capacityKw: Number(capacityKw),
        systemType,
        panelBrand,
        panelQuantity: Number(panelQuantity),
        inverterBrand,
        inverterCapacity,
        warrantyYears: Number(warrantyYears),
        inverterWarrantyYears: Number(inverterWarrantyYears),
        notes,
        status: "Active"
      });
      return res.status(201).json({
        message: "Customer Solar File & Warranty record created successfully!",
        system: newSys
      });
    } else {
      const custUser = storage.fallbackStore.users.find(
        u => u.email === String(customerEmail).trim().toLowerCase()
      );

      const newSys = {
        _id: "sys_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        systemId,
        customer: custUser ? custUser._id : null,
        customerEmail: String(customerEmail).trim().toLowerCase(),
        customerName: String(customerName).trim(),
        customerPhone: String(customerPhone).trim(),
        city: String(city).trim(),
        capacityKw: Number(capacityKw),
        systemType,
        panelBrand,
        panelQuantity: Number(panelQuantity),
        inverterBrand,
        inverterCapacity,
        installationDate: new Date().toISOString(),
        warrantyYears: Number(warrantyYears),
        inverterWarrantyYears: Number(inverterWarrantyYears),
        status: "Active",
        notes,
        createdAt: new Date().toISOString()
      };

      storage.fallbackStore.systems.unshift(newSys);
      storage.persistFallbackStore();

      return res.status(201).json({
        message: "Customer Solar File & Warranty record created successfully!",
        system: newSys
      });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
