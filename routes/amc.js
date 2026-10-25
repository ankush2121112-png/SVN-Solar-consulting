const express = require("express");
const storage = require("../services/storage");
const AMCContract = storage.models.AMCContract;
const User = storage.models.User;
const SolarSystem = storage.models.SolarSystem;

const router = express.Router();

const AMC_PLANS = [
  {
    id: "bronze",
    name: "Bronze Basic",
    price: 3499,
    visits: 2,
    badge: "Popular for Small Homes",
    features: [
      "2 Scheduled Visits per year (Bi-annual)",
      "Solar Panel Deep Cleaning (Specialized demineralized wash)",
      "Inverter Diagnostics & Error Code Clearance",
      "DC/AC Cable Joint Tightening & Safety Inspection",
      "Phone & WhatsApp Support within 48 hours"
    ]
  },
  {
    id: "silver",
    name: "Silver Standard",
    price: 5999,
    visits: 4,
    badge: "Most Recommended",
    features: [
      "4 Scheduled Visits per year (Quarterly)",
      "Panel Cleaning & Dust Loss Prevention",
      "Comprehensive Inverter Testing & Voltage Check",
      "Earthing & Lightning Arrestor Verification",
      "Priority Technician Dispatch within 24-48 hours",
      "Generation Efficiency & Shading Analysis Report"
    ]
  },
  {
    id: "gold",
    name: "Gold Comprehensive",
    price: 9999,
    visits: 6,
    badge: "Zero-Downtime Guarantee",
    features: [
      "6 Visits per year (Bi-monthly Maintenance)",
      "Unlimited Emergency Breakdown Visits (24h response)",
      "Thermal Hotspot / Infrared Panel Inspection",
      "Inverter Hardware Replacement Coordination & Logistics",
      "Complete Net-Metering / DISCOM Bill Reconciliation",
      "Dedicated Solar Relationship Manager"
    ]
  }
];

async function getCurrentUser(req) {
  if (!req.session.userId) return null;
  if (storage.getMongoStatus()) {
    return await User.findById(req.session.userId);
  } else {
    return storage.fallbackStore.users.find(u => u._id === req.session.userId) || null;
  }
}

// Get AMC plan offerings
router.get("/plans", (_req, res) => {
  res.json({ plans: AMC_PLANS });
});

// Request an AMC contract (Customer)
router.post("/request", async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    const {
      systemId,
      planName,
      customerName,
      customerPhone,
      customerEmail,
      notes = ""
    } = req.body;

    const name = customerName || (user ? user.name : "");
    const phone = customerPhone || (user ? user.phone : "");
    const email = customerEmail || (user ? user.email : "");

    if (!systemId || !planName || !name || !email) {
      return res.status(400).json({
        error: "System ID, plan name, customer name, and email are required."
      });
    }

    const matchedPlan = AMC_PLANS.find(
      p => p.name.toLowerCase() === String(planName).toLowerCase()
    );
    const annualPrice = matchedPlan ? matchedPlan.price : 5999;
    const visitsQuota = matchedPlan ? matchedPlan.visits : 4;
    const contractId = "SVN-AMC-" + Math.floor(100 + Math.random() * 900);

    if (storage.getMongoStatus()) {
      const contract = await AMCContract.create({
        contractId,
        customer: user ? user._id : null,
        customerEmail: String(email).trim().toLowerCase(),
        customerName: String(name).trim(),
        customerPhone: String(phone).trim(),
        systemId: String(systemId).trim(),
        planName: matchedPlan ? matchedPlan.name : planName,
        annualPrice,
        status: "Pending Approval",
        totalVisitsQuota: visitsQuota,
        completedVisits: 0,
        notes
      });

      return res.status(201).json({
        message: "AMC request registered! SVN Solar Admin will verify and activate your coverage.",
        contract
      });
    } else {
      const newContract = {
        _id: "amc_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        contractId,
        customer: user ? user._id : null,
        customerEmail: String(email).trim().toLowerCase(),
        customerName: String(name).trim(),
        customerPhone: String(phone).trim(),
        systemId: String(systemId).trim(),
        planName: matchedPlan ? matchedPlan.name : planName,
        annualPrice,
        startDate: null,
        endDate: null,
        status: "Pending Approval",
        totalVisitsQuota: visitsQuota,
        completedVisits: 0,
        assignedVendor: null,
        vendorPayout: 0,
        paymentStatus: "Pending",
        notes,
        createdAt: new Date().toISOString()
      };

      storage.fallbackStore.contracts.unshift(newContract);
      storage.persistFallbackStore();

      return res.status(201).json({
        message: "AMC request registered! SVN Solar Admin will verify and activate your coverage.",
        contract: newContract
      });
    }
  } catch (err) {
    next(err);
  }
});

// View AMC contracts (Customer or Admin)
router.get("/mine", async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "Please log in to view AMC contracts." });
    }

    if (storage.getMongoStatus()) {
      let contracts = [];
      if (user.role === "admin") {
        contracts = await AMCContract.find()
          .populate("customer", "name email phone")
          .populate("assignedVendor", "name companyName email phone")
          .sort({ createdAt: -1 });
      } else {
        contracts = await AMCContract.find({
          $or: [{ customer: user._id }, { customerEmail: user.email }]
        }).sort({ createdAt: -1 });
      }
      return res.json({ contracts });
    } else {
      let contracts = [];
      if (user.role === "admin") {
        contracts = storage.fallbackStore.contracts.map(c => {
          const v = c.assignedVendor
            ? storage.fallbackStore.users.find(u => u._id === c.assignedVendor)
            : null;
          return {
            ...c,
            assignedVendorDetails: v
              ? { name: v.name, companyName: v.companyName, phone: v.phone }
              : null
          };
        });
      } else {
        contracts = storage.fallbackStore.contracts.filter(
          c => c.customer === user._id || (c.customerEmail && c.customerEmail === user.email)
        );
      }
      return res.json({ contracts });
    }
  } catch (err) {
    next(err);
  }
});

// Admin activates AMC contract
router.patch("/:id/activate", async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Only Admin can activate AMC contracts." });
    }

    const { vendorId, vendorPayout = 0, durationMonths = 12 } = req.body;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + Number(durationMonths));

    if (storage.getMongoStatus()) {
      const contract = await AMCContract.findByIdAndUpdate(
        req.params.id,
        {
          status: "Active",
          startDate,
          endDate,
          assignedVendor: vendorId || null,
          vendorPayout: Number(vendorPayout),
          paymentStatus: "Paid"
        },
        { new: true }
      );
      if (!contract) return res.status(404).json({ error: "Contract not found." });

      return res.json({ message: "AMC Contract activated successfully!", contract });
    } else {
      const contract = storage.fallbackStore.contracts.find(
        c => c._id === req.params.id || c.contractId === req.params.id
      );
      if (!contract) return res.status(404).json({ error: "Contract not found." });

      contract.status = "Active";
      contract.startDate = startDate.toISOString();
      contract.endDate = endDate.toISOString();
      if (vendorId) contract.assignedVendor = vendorId;
      contract.vendorPayout = Number(vendorPayout);
      contract.paymentStatus = "Paid";
      storage.persistFallbackStore();

      return res.json({ message: "AMC Contract activated successfully!", contract });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
