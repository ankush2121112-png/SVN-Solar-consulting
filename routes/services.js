const express = require("express");
const storage = require("../services/storage");
const ServiceTicket = storage.models.ServiceTicket;
const User = storage.models.User;

const router = express.Router();

async function getCurrentUser(req) {
  if (!req.session.userId) return null;
  if (storage.getMongoStatus()) {
    return await User.findById(req.session.userId);
  } else {
    return storage.fallbackStore.users.find(u => u._id === req.session.userId) || null;
  }
}

// Book a service visit
router.post("/book", async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    const {
      customerName,
      customerPhone,
      customerEmail = "",
      systemId = "",
      city = "",
      serviceType,
      description,
      preferredDate = ""
    } = req.body;

    const name = customerName || (user ? user.name : "");
    const phone = customerPhone || (user ? user.phone : "");
    const email = customerEmail || (user ? user.email : "");

    if (!name || !phone || !serviceType || !description) {
      return res.status(400).json({
        error: "Customer name, phone, service type, and description are required."
      });
    }

    const ticketId = "SVN-SR-" + Math.floor(100 + Math.random() * 900);

    if (storage.getMongoStatus()) {
      const ticket = await ServiceTicket.create({
        ticketId,
        customer: user ? user._id : null,
        customerName: String(name).trim(),
        customerPhone: String(phone).trim(),
        customerEmail: String(email).trim().toLowerCase(),
        systemId: String(systemId).trim(),
        city: String(city).trim(),
        serviceType,
        description: String(description).trim().slice(0, 1000),
        preferredDate: String(preferredDate).trim(),
        status: "Booked"
      });

      return res.status(201).json({
        message: "Service request registered successfully!",
        ticket
      });
    } else {
      const newTicket = {
        _id: "sr_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        ticketId,
        customer: user ? user._id : null,
        customerName: String(name).trim(),
        customerPhone: String(phone).trim(),
        customerEmail: String(email).trim().toLowerCase(),
        systemId: String(systemId).trim(),
        city: String(city).trim(),
        serviceType,
        description: String(description).trim().slice(0, 1000),
        preferredDate: String(preferredDate).trim(),
        status: "Booked",
        assignedVendor: null,
        technicianNotes: "",
        completedAt: null,
        createdAt: new Date().toISOString()
      };

      storage.fallbackStore.services.unshift(newTicket);
      storage.persistFallbackStore();

      return res.status(201).json({
        message: "Service request registered successfully!",
        ticket: newTicket
      });
    }
  } catch (err) {
    next(err);
  }
});

// Get tickets based on user role
router.get("/mine", async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "Please log in to view service requests." });
    }

    if (storage.getMongoStatus()) {
      let tickets = [];
      if (user.role === "admin") {
        tickets = await ServiceTicket.find()
          .populate("customer", "name email phone")
          .populate("assignedVendor", "name companyName email phone")
          .sort({ createdAt: -1 });
      } else if (user.role === "vendor") {
        tickets = await ServiceTicket.find({ assignedVendor: user._id }).sort({ createdAt: -1 });
      } else {
        tickets = await ServiceTicket.find({
          $or: [{ customer: user._id }, { customerEmail: user.email }]
        }).sort({ createdAt: -1 });
      }
      return res.json({ tickets });
    } else {
      let tickets = [];
      if (user.role === "admin") {
        tickets = storage.fallbackStore.services.map(t => {
          const v = t.assignedVendor
            ? storage.fallbackStore.users.find(u => u._id === t.assignedVendor)
            : null;
          return {
            ...t,
            assignedVendorDetails: v
              ? { name: v.name, companyName: v.companyName, phone: v.phone }
              : null
          };
        });
      } else if (user.role === "vendor") {
        tickets = storage.fallbackStore.services.filter(t => t.assignedVendor === user._id);
      } else {
        tickets = storage.fallbackStore.services.filter(
          t => t.customer === user._id || (t.customerEmail && t.customerEmail === user.email)
        );
      }
      return res.json({ tickets });
    }
  } catch (err) {
    next(err);
  }
});

// Admin assigns service ticket to vendor
router.patch("/:id/assign", async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Only Admin can assign service tickets." });
    }

    const { vendorId } = req.body;
    if (!vendorId) return res.status(400).json({ error: "Vendor ID is required." });

    if (storage.getMongoStatus()) {
      const vendor = await User.findOne({ _id: vendorId, role: "vendor", vendorVerified: true });
      if (!vendor) return res.status(400).json({ error: "Verified vendor not found." });

      const ticket = await ServiceTicket.findByIdAndUpdate(
        req.params.id,
        { assignedVendor: vendor._id, status: "Assigned to Vendor" },
        { new: true }
      );
      if (!ticket) return res.status(404).json({ error: "Ticket not found." });

      return res.json({ message: "Vendor assigned to service ticket!", ticket });
    } else {
      const vendor = storage.fallbackStore.users.find(
        u => u._id === vendorId && u.role === "vendor" && u.vendorVerified
      );
      if (!vendor) return res.status(400).json({ error: "Verified vendor not found." });

      const ticket = storage.fallbackStore.services.find(
        t => t._id === req.params.id || t.ticketId === req.params.id
      );
      if (!ticket) return res.status(404).json({ error: "Ticket not found." });

      ticket.assignedVendor = vendor._id;
      ticket.status = "Assigned to Vendor";
      storage.persistFallbackStore();

      return res.json({ message: "Vendor assigned to service ticket!", ticket });
    }
  } catch (err) {
    next(err);
  }
});

// Vendor or Admin updates service progress
router.patch("/:id/status", async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    if (!user || !["admin", "vendor"].includes(user.role)) {
      return res.status(403).json({ error: "Permission denied." });
    }

    const { status, technicianNotes } = req.body;
    const valid = [
      "Booked",
      "Assigned to Vendor",
      "Site Visit Scheduled",
      "In Progress",
      "Completed",
      "Cancelled"
    ];

    if (!valid.includes(status)) {
      return res.status(400).json({ error: "Invalid status." });
    }

    const completedAt = status === "Completed" ? new Date() : null;

    if (storage.getMongoStatus()) {
      const query = { _id: req.params.id };
      if (user.role === "vendor") query.assignedVendor = user._id;

      const updateData = { status };
      if (technicianNotes !== undefined) updateData.technicianNotes = technicianNotes;
      if (completedAt) updateData.completedAt = completedAt;

      const ticket = await ServiceTicket.findOneAndUpdate(query, updateData, { new: true });
      if (!ticket) return res.status(404).json({ error: "Ticket not found or unauthorized." });

      return res.json({ message: "Service status updated successfully!", ticket });
    } else {
      const ticket = storage.fallbackStore.services.find(
        t => t._id === req.params.id || t.ticketId === req.params.id
      );
      if (!ticket) return res.status(404).json({ error: "Ticket not found." });

      if (user.role === "vendor" && ticket.assignedVendor !== user._id) {
        return res.status(403).json({ error: "You are not assigned to this service ticket." });
      }

      ticket.status = status;
      if (technicianNotes !== undefined) ticket.technicianNotes = technicianNotes;
      if (completedAt) ticket.completedAt = completedAt.toISOString();
      storage.persistFallbackStore();

      return res.json({ message: "Service status updated successfully!", ticket });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
