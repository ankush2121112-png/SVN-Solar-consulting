const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Lead = require("../models/Lead");
const SolarSystem = require("../models/SolarSystem");
const AMCContract = require("../models/AMCContract");
const ServiceTicket = require("../models/ServiceTicket");
const Quotation = require("../models/Quotation");
const { initSupabase, isSupabaseConfigured, db: supabaseDb } = require("./supabase");

const DATA_DIR = path.join(__dirname, "../data");
const DB_FILE = path.join(DATA_DIR, "db.json");

let isMongoActive = false;
let activeEngine = "local"; // "supabase", "mongodb", or "local"

// In-memory / file fallback store
const fallbackStore = {
  users: [],
  leads: [],
  systems: [],
  contracts: [],
  services: [],
  quotes: []
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(content);
      Object.assign(fallbackStore, parsed);
    } catch (e) {
      console.warn("Could not read local db.json, using fresh store:", e.message);
    }
  } else {
    persistFallbackStore();
  }
}

function persistFallbackStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(fallbackStore, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to persist fallback store:", e.message);
  }
}

function setMongoStatus(status) {
  isMongoActive = status;
  if (status) activeEngine = "mongodb";
}

function getMongoStatus() {
  return isMongoActive;
}

function setEngine(engine) {
  activeEngine = engine;
}

function getEngine() {
  return activeEngine;
}

// Generate random short ID for fallback mode
function genId(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

// Ensure default Admin exists across Supabase, Mongo or Fallback store
async function seedDefaultAdmin(adminName, adminEmail, adminPassword) {
  const email = (adminEmail || "admin@svnsolar.local").trim().toLowerCase();
  const password = adminPassword || "SVNAdmin#2026!";
  const name = adminName || "SVN Solar Admin";

  if (activeEngine === "supabase") {
    await supabaseDb.seedAdminAndVendors(name, email, password);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  if (activeEngine === "mongodb" && isMongoActive) {
    const existing = await User.findOne({ email });
    if (!existing) {
      await User.create({
        name,
        email,
        phone: "+91 98765 43210",
        passwordHash,
        role: "admin",
        isActive: true
      });
      console.log(`[MongoDB] Default Admin user created: ${email}`);
    } else {
      await User.updateOne({ email }, { passwordHash, role: "admin" });
    }
  } else {
    const existingIndex = fallbackStore.users.findIndex(u => u.email === email);
    if (existingIndex < 0) {
      const adminUser = {
        _id: "admin_" + Date.now(),
        name,
        email,
        phone: "+91 98765 43210",
        passwordHash,
        role: "admin",
        isActive: true,
        createdAt: new Date().toISOString()
      };
      fallbackStore.users.push(adminUser);
      persistFallbackStore();
      console.log(`[LocalStore] Default Admin user created: ${email}`);
    } else {
      fallbackStore.users[existingIndex].passwordHash = passwordHash;
      fallbackStore.users[existingIndex].role = "admin";
      persistFallbackStore();
    }
  }
}

// Safe user object for API responses
function safeUser(u) {
  if (!u) return null;
  return {
    id: u._id || u.id,
    name: u.name,
    email: u.email,
    phone: u.phone || "",
    role: u.role,
    companyName: u.companyName || u.company_name || "",
    serviceAreas: u.serviceAreas || u.service_areas || [],
    serviceTypes: u.serviceTypes || u.service_types || [],
    vendorVerified: !!(u.vendorVerified || u.vendor_verified),
    isActive: u.isActive !== false && u.is_active !== false
  };
}

module.exports = {
  ensureDataDir,
  persistFallbackStore,
  fallbackStore,
  setMongoStatus,
  getMongoStatus,
  setEngine,
  getEngine,
  seedDefaultAdmin,
  safeUser,
  genId,
  initSupabase,
  supabaseDb,
  models: {
    User,
    Lead,
    SolarSystem,
    AMCContract,
    ServiceTicket,
    Quotation
  }
};
