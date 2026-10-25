const express = require("express");
const storage = require("../services/storage");
const User = storage.models.User;
const Lead = storage.models.Lead;
const SolarSystem = storage.models.SolarSystem;
const AMCContract = storage.models.AMCContract;
const ServiceTicket = storage.models.ServiceTicket;

const router = express.Router();

async function requireAdmin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: "Please log in." });
  let user;
  if (storage.getMongoStatus()) {
    user = await User.findById(req.session.userId);
  } else {
    user = storage.fallbackStore.users.find(u => u._id === req.session.userId);
  }
  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required." });
  }
  req.adminUser = user;
  next();
}

// Admin stats
router.get("/stats", requireAdmin, async (_req, res, next) => {
  try {
    if (storage.getMongoStatus()) {
      const [leadsCount, systemsCount, amcActiveCount, servicesOpenCount, vendorsCount] =
        await Promise.all([
          Lead.countDocuments(),
          SolarSystem.countDocuments(),
          AMCContract.countDocuments({ status: "Active" }),
          ServiceTicket.countDocuments({ status: { $ne: "Completed" } }),
          User.countDocuments({ role: "vendor" })
        ]);

      // Calculate approximate revenue pipeline
      const contracts = await AMCContract.find({ status: "Active" });
      const totalAmcRevenue = contracts.reduce((sum, c) => sum + (c.annualPrice || 0), 0);

      return res.json({
        totalLeads: leadsCount,
        totalSystems: systemsCount,
        activeAmcs: amcActiveCount,
        openTickets: servicesOpenCount,
        totalVendors: vendorsCount,
        totalAmcRevenue,
        dbMode: "MongoDB"
      });
    } else {
      const leadsCount = storage.fallbackStore.leads.length;
      const systemsCount = storage.fallbackStore.systems.length;
      const amcActiveCount = storage.fallbackStore.contracts.filter(c => c.status === "Active").length;
      const servicesOpenCount = storage.fallbackStore.services.filter(s => s.status !== "Completed").length;
      const vendorsCount = storage.fallbackStore.users.filter(u => u.role === "vendor").length;
      const totalAmcRevenue = storage.fallbackStore.contracts
        .filter(c => c.status === "Active")
        .reduce((sum, c) => sum + (c.annualPrice || 0), 0);

      return res.json({
        totalLeads: leadsCount,
        totalSystems: systemsCount,
        activeAmcs: amcActiveCount,
        openTickets: servicesOpenCount,
        totalVendors: vendorsCount,
        totalAmcRevenue,
        dbMode: "Local Persistent Store"
      });
    }
  } catch (err) {
    next(err);
  }
});

// List all vendors
router.get("/vendors", requireAdmin, async (_req, res, next) => {
  try {
    if (storage.getMongoStatus()) {
      const vendors = await User.find({ role: "vendor" }).sort({ createdAt: -1 });
      return res.json({ vendors: vendors.map(v => storage.safeUser(v)) });
    } else {
      const vendors = storage.fallbackStore.users.filter(u => u.role === "vendor");
      return res.json({ vendors: vendors.map(v => storage.safeUser(v)) });
    }
  } catch (err) {
    next(err);
  }
});

// Toggle vendor verification
router.patch("/vendors/:id/verify", requireAdmin, async (req, res, next) => {
  try {
    const { verified } = req.body;
    const isVerified = verified === undefined ? true : Boolean(verified);

    if (storage.getMongoStatus()) {
      const vendor = await User.findByIdAndUpdate(
        req.params.id,
        { vendorVerified: isVerified },
        { new: true }
      );
      if (!vendor) return res.status(404).json({ error: "Vendor not found." });

      return res.json({
        message: isVerified ? "Vendor verified successfully!" : "Vendor unverified.",
        vendor: storage.safeUser(vendor)
      });
    } else {
      const vendor = storage.fallbackStore.users.find(u => u._id === req.params.id);
      if (!vendor) return res.status(404).json({ error: "Vendor not found." });

      vendor.vendorVerified = isVerified;
      storage.persistFallbackStore();

      return res.json({
        message: isVerified ? "Vendor verified successfully!" : "Vendor unverified.",
        vendor: storage.safeUser(vendor)
      });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
