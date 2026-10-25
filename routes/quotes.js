const express = require("express");
const storage = require("../services/storage");
const Quotation = storage.models.Quotation;
const Lead = storage.models.Lead;
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

// Vendor submits a quote
router.post("/", async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "vendor") {
      return res.status(403).json({ error: "Only verified vendors can submit quotations." });
    }
    if (!user.vendorVerified) {
      return res.status(403).json({
        error: "Your vendor account is awaiting verification by SVN Solar Admin."
      });
    }

    const {
      leadId,
      systemCapacity,
      panelDetails = "",
      inverterDetails = "",
      totalPrice,
      warrantyTerms = "",
      estimatedDays = 7,
      notes = ""
    } = req.body;

    if (!leadId || !systemCapacity || !totalPrice) {
      return res.status(400).json({
        error: "Lead ID, system capacity, and total price are required."
      });
    }

    const quoteId = "SVN-QT-" + Math.floor(100 + Math.random() * 900);

    if (storage.getMongoStatus()) {
      const quote = await Quotation.create({
        quoteId,
        leadId,
        vendor: user._id,
        vendorName: user.name,
        vendorCompanyName: user.companyName || user.name,
        vendorPhone: user.phone || "",
        systemCapacity,
        panelDetails,
        inverterDetails,
        totalPrice: Number(totalPrice),
        warrantyTerms,
        estimatedDays: Number(estimatedDays),
        notes,
        status: "Submitted"
      });

      // Update lead status to "Quotation Received"
      await Lead.findOneAndUpdate(
        { $or: [{ _id: leadId }, { leadNumber: leadId }] },
        { status: "Quotation Received" }
      );

      return res.status(201).json({ message: "Quotation submitted successfully!", quote });
    } else {
      const newQuote = {
        _id: "qt_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        quoteId,
        leadId,
        vendor: user._id,
        vendorName: user.name,
        vendorCompanyName: user.companyName || user.name,
        vendorPhone: user.phone || "",
        systemCapacity,
        panelDetails,
        inverterDetails,
        totalPrice: Number(totalPrice),
        warrantyTerms,
        estimatedDays: Number(estimatedDays),
        notes,
        status: "Submitted",
        createdAt: new Date().toISOString()
      };

      storage.fallbackStore.quotes.unshift(newQuote);

      const targetLead = storage.fallbackStore.leads.find(
        l => l._id === leadId || l.leadNumber === leadId
      );
      if (targetLead) targetLead.status = "Quotation Received";

      storage.persistFallbackStore();

      return res.status(201).json({ message: "Quotation submitted successfully!", quote: newQuote });
    }
  } catch (err) {
    next(err);
  }
});

// Get quotes for a specific lead (for Customer Quotation Comparison)
router.get("/lead/:leadId", async (req, res, next) => {
  try {
    const { leadId } = req.params;

    if (storage.getMongoStatus()) {
      const quotes = await Quotation.find({ leadId }).sort({ totalPrice: 1 });
      return res.json({ quotes });
    } else {
      const quotes = storage.fallbackStore.quotes.filter(q => q.leadId === leadId);
      quotes.sort((a, b) => a.totalPrice - b.totalPrice);
      return res.json({ quotes });
    }
  } catch (err) {
    next(err);
  }
});

// Customer accepts a quote
router.patch("/:id/accept", async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "Please log in." });

    if (storage.getMongoStatus()) {
      const quote = await Quotation.findByIdAndUpdate(
        req.params.id,
        { status: "Accepted by Customer" },
        { new: true }
      );
      if (!quote) return res.status(404).json({ error: "Quote not found." });

      await Lead.findOneAndUpdate(
        { $or: [{ _id: quote.leadId }, { leadNumber: quote.leadId }] },
        { assignedVendor: quote.vendor, status: "Installation" }
      );

      return res.json({ message: "Quotation accepted! Next step: Installation schedule.", quote });
    } else {
      const quote = storage.fallbackStore.quotes.find(
        q => q._id === req.params.id || q.quoteId === req.params.id
      );
      if (!quote) return res.status(404).json({ error: "Quote not found." });

      quote.status = "Accepted by Customer";

      const targetLead = storage.fallbackStore.leads.find(
        l => l._id === quote.leadId || l.leadNumber === quote.leadId
      );
      if (targetLead) {
        targetLead.assignedVendor = quote.vendor;
        targetLead.status = "Installation";
      }

      storage.persistFallbackStore();

      return res.json({ message: "Quotation accepted! Next step: Installation schedule.", quote });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
