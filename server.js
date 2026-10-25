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

async function setupApp() {
  storage.ensureDataDir();

  let sessionStore = null;

  // 1. Check for Supabase configuration first (Recommended for Render)
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

  if (supabaseUrl && supabaseKey) {
    storage.initSupabase(supabaseUrl, supabaseKey);
    storage.setEngine("supabase");
    console.log(`\n========================================================`);
    console.log(`Connected to Supabase PostgreSQL at: ${supabaseUrl}`);
    console.log(`Database Engine: SUPABASE (Cloud PostgreSQL)`);
    console.log(`========================================================\n`);
  } else {
    // 2. Attempt MongoDB if Supabase is not configured
    const mongoUri = process.env.MONGODB_URI;
    if (mongoUri && mongoUri.startsWith("mongodb")) {
      try {
        console.log(`Connecting to MongoDB at: ${mongoUri}...`);
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
        storage.setMongoStatus(true);
        storage.setEngine("mongodb");
        console.log("MongoDB connected successfully!");

        sessionStore = MongoStore.create({
          mongoUrl: mongoUri,
          collectionName: "sessions",
          ttl: 60 * 60 * 24
        });
      } catch (err) {
        storage.setMongoStatus(false);
        storage.setEngine("local");
        console.warn("\n========================================================");
        console.warn("MongoDB is not active or unreachable locally.");
        console.warn("Running in RESILIENT FILE-STORAGE MODE (data/db.json).");
        console.warn("All features (Auth, Leads, Systems, AMC, Services) are fully functional!");
        console.warn("========================================================\n");
      }
    } else {
      storage.setEngine("local");
      console.log("No cloud database specified. Running with local persistent storage.");
    }
  }

  app.use(
    session({
      name: "svn.sid",
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: sessionStore || undefined,
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
    const engine = storage.getEngine();
    let dbLabel = "Local Persistent Store";
    if (engine === "supabase") dbLabel = "Supabase (Cloud PostgreSQL)";
    else if (engine === "mongodb") dbLabel = "MongoDB Connected";

    res.json({
      status: "operational",
      service: "SVN Solar Consulting Platform API",
      database: dbLabel,
      engine: engine,
      timestamp: new Date().toISOString()
    });
  });

  // Global Error Handler
  app.use((err, _req, res, _next) => {
    console.error("Server Error:", err);
    if (err.code === "23505" || err.code === 11000) {
      return res.status(409).json({ error: "A record with this unique value (e.g. email) already exists." });
    }
    res.status(500).json({ error: err.message || "Internal server error. Please try again later." });
  });

  // Seed default Admin & Sample Data
  await storage.seedDefaultAdmin(
    process.env.ADMIN_NAME,
    process.env.ADMIN_EMAIL,
    process.env.ADMIN_PASSWORD
  );
  await seedLocalDemoData();
}

async function seedLocalDemoData() {
  if (storage.getEngine() !== "local") return;

  const bcrypt = require("bcryptjs");
  const defaultPw = await bcrypt.hash("SolarVendor#123", 10);

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

  storage.persistFallbackStore();
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
