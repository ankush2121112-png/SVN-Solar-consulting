const express = require("express");
const storage = require("../services/storage");
const Lead = storage.models.Lead;
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

// Submit a lead
router.post("/", async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    const {
      customerName,
      customerPhone,
      customerEmail = "",
      city,
      projectType,
      monthlyBill = "",
      budget = "",
      spaceAvailable = "",
      recommendedKw = "",
      requirement = ""
    } = req.body;

    const name = customerName || (user ? user.name : "");
    const phone = customerPhone || (user ? user.phone : "");
    const email = customerEmail || (user ? user.email : "");

    if (!name || !phone || !city || !projectType) {
      return res.status(400).json({ error: "Name, phone, city, and project type are required." });
    }

    const leadNumber = "SVN-LD-" + Math.floor(1000 + Math.random() * 9000);
    const engine = storage.getEngine();

    if (engine === "supabase") {
      const lead = await storage.supabaseDb.createLead({
        leadNumber,
        customer: user ? (user.id || user._id) : null,
        customerName: String(name).trim().slice(0, 100),
        customerPhone: String(phone).trim().slice(0, 20),
        customerEmail: String(email).trim().toLowerCase().slice(0, 160),
        city: String(city).trim().slice(0, 100),
        projectType,
        monthlyBill: String(monthlyBill).slice(0, 60),
        budget: String(budget).slice(0, 80),
        spaceAvailable: String(spaceAvailable).slice(0, 80),
        recommendedKw: String(recommendedKw).slice(0, 60),
        requirement: String(requirement).slice(0, 1500)
      });
      return res.status(201).json({ message: "Solar requirement submitted successfully!", lead });
    } else if (engine === "mongodb") {
      const lead = await Lead.create({
        leadNumber,
        customer: user ? user._id : null,
        customerName: String(name).trim().slice(0, 100),
        customerPhone: String(phone).trim().slice(0, 20),
        customerEmail: String(email).trim().toLowerCase().slice(0, 160),
        city: String(city).trim().slice(0, 100),
        projectType,
        monthlyBill: String(monthlyBill).slice(0, 60),
        budget: String(budget).slice(0, 80),
        spaceAvailable: String(spaceAvailable).slice(0, 80),
        recommendedKw: String(recommendedKw).slice(0, 60),
        requirement: String(requirement).slice(0, 1500),
        status: "New"
      });
      return res.status(201).json({ message: "Solar requirement submitted successfully!", lead });
    } else {
      const newLead = {
        _id: "ld_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        leadNumber,
        customer: user ? user._id : null,
        customerName: String(name).trim().slice(0, 100),
        customerPhone: String(phone).trim().slice(0, 20),
        customerEmail: String(email).trim().toLowerCase().slice(0, 160),
        city: String(city).trim().slice(0, 100),
        projectType,
        monthlyBill: String(monthlyBill).slice(0, 60),
        budget: String(budget).slice(0, 80),
        spaceAvailable: String(spaceAvailable).slice(0, 80),
        recommendedKw: String(recommendedKw).slice(0, 60),
        requirement: String(requirement).slice(0, 1500),
        status: "New",
        assignedVendor: null,
        internalNotes: "",
        createdAt: new Date().toISOString()
      };
      storage.fallbackStore.leads.unshift(newLead);
      storage.persistFallbackStore();
      return res.status(201).json({ message: "Solar requirement submitted successfully!", lead: newLead });
    }
  } catch (err) {
    next(err);
  }
});

// Get leads for logged-in user
router.get("/mine", async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "Please log in to view leads." });
    }

    const engine = storage.getEngine();

    if (engine === "supabase") {
      let filter = {};
      if (user.role === "customer") {
        filter = { customerId: user.id || user._id, customerEmail: user.email };
      } else if (user.role === "vendor") {
        if (!user.vendorVerified) {
          return res.json({
            leads: [],
            message: "Your vendor account is pending verification by SVN Solar Admin."
          });
        }
        filter = { assignedVendorId: user.id || user._id };
      }
      const leads = await storage.supabaseDb.getLeads(filter);
      return res.json({ leads });
    } else if (engine === "mongodb") {
      let leads = [];
      if (user.role === "customer") {
        leads = await Lead.find({
          $or: [{ customer: user._id }, { customerEmail: user.email }]
        }).sort({ createdAt: -1 });
      } else if (user.role === "vendor") {
        if (!user.vendorVerified) {
          return res.json({
            leads: [],
            message: "Your vendor account is pending verification by SVN Solar Admin."
          });
        }
        leads = await Lead.find({ assignedVendor: user._id }).sort({ createdAt: -1 });
      } else {
        leads = await Lead.find()
          .populate("customer", "name email phone")
          .populate("assignedVendor", "name companyName email phone")
          .sort({ createdAt: -1 });
      }
      return res.json({ leads });
    } else {
      let leads = [];
      if (user.role === "customer") {
        leads = storage.fallbackStore.leads.filter(
          l => l.customer === user._id || (l.customerEmail && l.customerEmail === user.email)
        );
      } else if (user.role === "vendor") {
        if (!user.vendorVerified) {
          return res.json({
            leads: [],
            message: "Your vendor account is pending verification by SVN Solar Admin."
          });
        }
        leads = storage.fallbackStore.leads.filter(l => l.assignedVendor === user._id);
      } else {
        leads = storage.fallbackStore.leads.map(l => {
          const v = l.assignedVendor
            ? storage.fallbackStore.users.find(u => u._id === l.assignedVendor)
            : null;
          return {
            ...l,
            assignedVendorDetails: v
              ? { name: v.name, companyName: v.companyName, email: v.email, phone: v.phone }
              : null
          };
        });
      }
      return res.json({ leads });
    }
  } catch (err) {
    next(err);
  }
});

// Admin assign vendor to lead
router.patch("/:id/assign", async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Only SVN Solar Admin can assign vendors." });
    }

    const { vendorId } = req.body;
    if (!vendorId) {
      return res.status(400).json({ error: "Vendor ID is required." });
    }

    const engine = storage.getEngine();

    if (engine === "supabase") {
      const vendor = await storage.supabaseDb.findUserById(vendorId);
      if (!vendor || vendor.role !== "vendor" || !vendor.vendorVerified) {
        return res.status(400).json({ error: "Verified active vendor not found." });
      }
      const lead = await storage.supabaseDb.updateLead(req.params.id, {
        assignedVendor: vendor.id || vendor._id,
        status: "Vendor Assigned"
      });
      return res.json({ message: "Vendor assigned successfully!", lead });
    } else if (engine === "mongodb") {
      const vendor = await User.findOne({ _id: vendorId, role: "vendor", vendorVerified: true });
      if (!vendor) {
        return res.status(400).json({ error: "Verified active vendor not found." });
      }

      const lead = await Lead.findByIdAndUpdate(
        req.params.id,
        { assignedVendor: vendor._id, status: "Vendor Assigned" },
        { new: true }
      );
      if (!lead) return res.status(404).json({ error: "Lead not found." });

      return res.json({ message: "Vendor assigned successfully!", lead });
    } else {
      const vendor = storage.fallbackStore.users.find(
        u => u._id === vendorId && u.role === "vendor" && u.vendorVerified
      );
      if (!vendor) return res.status(400).json({ error: "Verified active vendor not found." });

      const lead = storage.fallbackStore.leads.find(
        l => l._id === req.params.id || l.leadNumber === req.params.id
      );
      if (!lead) return res.status(404).json({ error: "Lead not found." });

      lead.assignedVendor = vendor._id;
      lead.status = "Vendor Assigned";
      storage.persistFallbackStore();

      return res.json({ message: "Vendor assigned successfully!", lead });
    }
  } catch (err) {
    next(err);
  }
});

// Status update
router.patch("/:id/status", async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    if (!user || !["admin", "vendor"].includes(user.role)) {
      return res.status(403).json({ error: "Permission denied." });
    }

    const { status, internalNotes } = req.body;
    const validStatuses = [
      "New",
      "Reviewed",
      "Vendor Assigned",
      "Site Visit",
      "Quotation Received",
      "Installation",
      "Completed",
      "Cancelled"
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status value." });
    }

    const engine = storage.getEngine();

    if (engine === "supabase") {
      const lead = await storage.supabaseDb.updateLead(req.params.id, {
        status,
        internalNotes
      });
      return res.json({ message: "Status updated successfully!", lead });
    } else if (engine === "mongodb") {
      const query = { _id: req.params.id };
      if (user.role === "vendor") query.assignedVendor = user._id;

      const updateData = { status };
      if (internalNotes !== undefined) updateData.internalNotes = internalNotes;

      const lead = await Lead.findOneAndUpdate(query, updateData, { new: true });
      if (!lead) return res.status(404).json({ error: "Lead not found or unauthorized." });

      return res.json({ message: "Status updated successfully!", lead });
    } else {
      const lead = storage.fallbackStore.leads.find(
        l => l._id === req.params.id || l.leadNumber === req.params.id
      );
      if (!lead) return res.status(404).json({ error: "Lead not found." });

      if (user.role === "vendor" && lead.assignedVendor !== user._id) {
        return res.status(403).json({ error: "You are not assigned to this lead." });
      }

      lead.status = status;
      if (internalNotes !== undefined) lead.internalNotes = internalNotes;
      storage.persistFallbackStore();

      return res.json({ message: "Status updated successfully!", lead });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
