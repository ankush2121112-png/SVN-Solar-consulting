require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

const storage = require("./services/storage");
const authRoutes = require("./routes/auth");
const leadRoutes = require("./routes/leads");
const systemRoutes = require("./routes/systems");
const amcRoutes = require("./routes/amc");
const serviceRoutes = require("./routes/services");
const quoteRoutes = require("./routes/quotes");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === "production";
const SESSION_SECRET = process.env.SESSION_SECRET || "svn-solar-consulting-fallback-secret-2026-key";

app.disable("x-powered-by");
if (isProduction) app.set("trust proxy", 1);

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: false // Allow inline scripts and styles for modern single-page dashboard
  })
);

app.use(express.json({ limit: "200kb" }));
app.use(express.urlencoded({ extended: false, limit: "200kb" }));

// Rate limiter for authentication
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 150,
  message: { error: "Too many authentication attempts, please try again in a few minutes." }
});

// Configure session middleware
async function setupApp() {
  storage.ensureDataDir();

  let sessionStore = null;

  // Attempt MongoDB connection
  const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/svn_solar";
  try {
    console.log(`Connecting to MongoDB at: ${mongoUri}...`);
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
    storage.setMongoStatus(true);
    console.log("MongoDB connected successfully!");

    sessionStore = MongoStore.create({
      mongoUrl: mongoUri,
      collectionName: "sessions",
      ttl: 60 * 60 * 24
    });
  } catch (err) {
    storage.setMongoStatus(false);
    console.warn("\n========================================================");
    console.warn("MongoDB is not active or unreachable locally.");
    console.warn("Running in RESILIENT FILE-STORAGE MODE (data/db.json).");
    console.warn("All features (Auth, Leads, Systems, AMC, Services) are fully functional!");
    console.warn("========================================================\n");
  }

  app.use(
    session({
      name: "svn.sid",
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: sessionStore || undefined, // Fallbacks to in-memory store if MongoStore not active
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: isProduction,
        maxAge: 1000 * 60 * 60 * 24 // 24 hours
      }
    })
  );

  // Serve static assets
  app.use(express.static(path.join(__dirname, "public")));

  // API Routes
  app.use("/api/auth", authLimiter, authRoutes);
  app.use("/api/leads", leadRoutes);
  app.use("/api/systems", systemRoutes);
  app.use("/api/amc", amcRoutes);
  app.use("/api/services", serviceRoutes);
  app.use("/api/quotes", quoteRoutes);
  app.use("/api/admin", adminRoutes);

  // Health and Status API
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "operational",
      service: "SVN Solar Consulting Platform API",
      database: storage.getMongoStatus() ? "MongoDB Connected" : "Local Persistent Store",
      timestamp: new Date().toISOString()
    });
  });

  // Global Error Handler
  app.use((err, _req, res, _next) => {
    console.error("Server Error:", err);
    if (err.code === 11000) {
      return res.status(409).json({ error: "A record with this unique value already exists." });
    }
    res.status(500).json({ error: err.message || "Internal server error. Please try again later." });
  });

  // Seed default Admin & Sample Data
  await storage.seedDefaultAdmin(
    process.env.ADMIN_NAME,
    process.env.ADMIN_EMAIL,
    process.env.ADMIN_PASSWORD
  );
  await seedDemoData();
}

async function seedDemoData() {
  const bcrypt = require("bcryptjs");
  const defaultPw = await bcrypt.hash("SolarVendor#123", 10);

  // Sample verified vendors if none exist
  const vendors = [
    {
      name: "Rewa Solar Tech Solutions",
      email: "rewa.solar@svnsolar.local",
      phone: "+91 94251 77201",
      companyName: "Rewa Solar Power Pvt Ltd",
      serviceAreas: ["Rewa", "Satna", "Sidhi", "Maihar"],
      serviceTypes: ["Residential Rooftop", "Commercial", "Solar Agricultural Pump", "AMC"],
      vendorVerified: true
    },
    {
      name: "Vindhya Renewable Energy",
      email: "vindhya.energy@svnsolar.local",
      phone: "+91 98263 11890",
      companyName: "Vindhya Green Power LLP",
      serviceAreas: ["Satna", "Panna", "Katni", "Jabalpur"],
      serviceTypes: ["Residential Rooftop", "Solar Water Pump", "Repair / AMC"],
      vendorVerified: true
    }
  ];

  if (storage.getMongoStatus()) {
    const User = storage.models.User;
    for (const v of vendors) {
      const exists = await User.findOne({ email: v.email });
      if (!exists) {
        await User.create({
          ...v,
          passwordHash: defaultPw,
          role: "vendor",
          isActive: true
        });
        console.log(`[MongoDB] Demo Vendor created: ${v.email}`);
      }
    }
  } else {
    for (const v of vendors) {
      const exists = storage.fallbackStore.users.find(u => u.email === v.email);
      if (!exists) {
        storage.fallbackStore.users.push({
          _id: "vnd_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
          ...v,
          passwordHash: defaultPw,
          role: "vendor",
          isActive: true,
          createdAt: new Date().toISOString()
        });
      }
    }

    // Seed sample showcase lead & system if empty
    if (storage.fallbackStore.leads.length === 0) {
      storage.fallbackStore.leads.push({
        _id: "ld_demo_1",
        leadNumber: "SVN-LD-1001",
        customerName: "Vikash Sharma",
        customerPhone: "+91 98930 12345",
        customerEmail: "vikash.sharma@example.com",
        city: "Satna",
        projectType: "Residential Rooftop",
        monthlyBill: "₹3,500 - ₹5,000",
        budget: "₹1.5 - 2.5 Lakhs",
        spaceAvailable: "350 sq ft",
        recommendedKw: "3.3 kW",
        requirement: "Looking for On-Grid solar installation under PM Surya Ghar Muft Bijli Yojana with subsidy assistance.",
        status: "Reviewed",
        assignedVendor: null,
        internalNotes: "Pre-qualified lead. Roof has shadow-free south orientation.",
        createdAt: new Date().toISOString()
      });
    }

    if (storage.fallbackStore.systems.length === 0) {
      storage.fallbackStore.systems.push({
        _id: "sys_demo_1",
        systemId: "SVN-SYS-101",
        customerEmail: "vikash.sharma@example.com",
        customerName: "Vikash Sharma",
        customerPhone: "+91 98930 12345",
        city: "Satna",
        capacityKw: 3.3,
        systemType: "Residential Rooftop",
        panelBrand: "Waaree 540W Mono PERC Bifacial",
        panelQuantity: 6,
        inverterBrand: "Growatt MIN 3300TL-X",
        inverterCapacity: "3.3 kW",
        installationDate: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString(),
        warrantyYears: 25,
        inverterWarrantyYears: 5,
        status: "Active",
        notes: "Commissioned with DISCOM net-meter.",
        createdAt: new Date().toISOString()
      });
    }

    if (storage.fallbackStore.contracts.length === 0) {
      const start = new Date(Date.now() - 30 * 24 * 3600 * 1000);
      const end = new Date(Date.now() + 335 * 24 * 3600 * 1000);
      storage.fallbackStore.contracts.push({
        _id: "amc_demo_1",
        contractId: "SVN-AMC-201",
        customerEmail: "vikash.sharma@example.com",
        customerName: "Vikash Sharma",
        customerPhone: "+91 98930 12345",
        systemId: "SVN-SYS-101",
        planName: "Silver Standard",
        annualPrice: 5999,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        status: "Active",
        totalVisitsQuota: 4,
        completedVisits: 1,
        vendorPayout: 4000,
        paymentStatus: "Paid",
        notes: "Quarterly panel wash and quarterly earthing diagnostics.",
        createdAt: new Date().toISOString()
      });
    }

    storage.persistFallbackStore();
  }
}

setupApp()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n========================================================`);
      console.log(`☀ SVN Solar Consulting Web App is live!`);
      console.log(`Main Website & AI Assistant: http://localhost:${PORT}`);
      console.log(`Portal (Customer/Vendor/Admin): http://localhost:${PORT}/portal.html`);
      console.log(`Default Admin: ${process.env.ADMIN_EMAIL || "admin@svnsolar.local"}`);
      console.log(`Default Admin Password: ${process.env.ADMIN_PASSWORD || "SVNAdmin#2026!"}`);
      console.log(`========================================================\n`);
    });
  })
  .catch(err => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
