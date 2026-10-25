const express = require("express");
const bcrypt = require("bcryptjs");
const storage = require("../services/storage");
const User = storage.models.User;

const router = express.Router();

router.post("/register", async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone = "",
      password,
      role = "customer",
      companyName = "",
      serviceAreas = "",
      serviceTypes = ""
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email and password are required." });
    }
    if (String(name).trim().length > 100 || String(email).trim().length > 160) {
      return res.status(400).json({ error: "Name or email is too long." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters long." });
    }
    if (!["customer", "vendor"].includes(role)) {
      return res.status(400).json({ error: "Invalid registration role specified." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const areasArray = role === "vendor"
      ? String(serviceAreas).split(",").map(x => x.trim()).filter(Boolean).slice(0, 20)
      : [];
    const typesArray = role === "vendor"
      ? String(serviceTypes).split(",").map(x => x.trim()).filter(Boolean).slice(0, 10)
      : [];

    const passwordHash = await bcrypt.hash(password, 12);
    const engine = storage.getEngine();

    if (engine === "supabase") {
      const existing = await storage.supabaseDb.findUserByEmail(normalizedEmail);
      if (existing) {
        return res.status(409).json({ error: "This email is already registered." });
      }

      const user = await storage.supabaseDb.createUser({
        name: String(name).trim(),
        email: normalizedEmail,
        phone: String(phone).trim().slice(0, 20),
        passwordHash,
        role,
        companyName: role === "vendor" ? String(companyName).trim().slice(0, 160) : "",
        serviceAreas: areasArray,
        serviceTypes: typesArray,
        vendorVerified: false
      });

      req.session.userId = user.id;
      req.session.role = user.role;

      return res.status(201).json({
        message: role === "vendor"
          ? "Vendor account created! Work orders will be accessible once verified by SVN Solar Admin."
          : "Customer account created successfully!",
        user: storage.safeUser(user)
      });
    } else if (engine === "mongodb") {
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing) {
        return res.status(409).json({ error: "This email is already registered." });
      }

      const user = await User.create({
        name: String(name).trim(),
        email: normalizedEmail,
        phone: String(phone).trim().slice(0, 20),
        passwordHash,
        role,
        companyName: role === "vendor" ? String(companyName).trim().slice(0, 160) : "",
        serviceAreas: areasArray,
        serviceTypes: typesArray,
        vendorVerified: false
      });

      req.session.userId = user._id.toString();
      req.session.role = user.role;

      return res.status(201).json({
        message: role === "vendor"
          ? "Vendor account created! Work orders will be accessible once verified by SVN Solar Admin."
          : "Customer account created successfully!",
        user: storage.safeUser(user)
      });
    } else {
      // Fallback local store
      const existing = storage.fallbackStore.users.find(u => u.email === normalizedEmail);
      if (existing) {
        return res.status(409).json({ error: "This email is already registered." });
      }

      const newUser = {
        _id: "usr_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        name: String(name).trim(),
        email: normalizedEmail,
        phone: String(phone).trim().slice(0, 20),
        passwordHash,
        role,
        companyName: role === "vendor" ? String(companyName).trim().slice(0, 160) : "",
        serviceAreas: areasArray,
        serviceTypes: typesArray,
        vendorVerified: false,
        isActive: true,
        createdAt: new Date().toISOString()
      };

      storage.fallbackStore.users.push(newUser);
      storage.persistFallbackStore();

      req.session.userId = newUser._id;
      req.session.role = newUser.role;

      return res.status(201).json({
        message: role === "vendor"
          ? "Vendor account created! Work orders will be accessible once verified by SVN Solar Admin."
          : "Customer account created successfully!",
        user: storage.safeUser(newUser)
      });
    }
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const engine = storage.getEngine();
    let user = null;

    if (engine === "supabase") {
      user = await storage.supabaseDb.findUserByEmail(normalizedEmail);
    } else if (engine === "mongodb") {
      user = await User.findOne({ email: normalizedEmail }).select("+passwordHash");
    } else {
      user = storage.fallbackStore.users.find(u => u.email === normalizedEmail);
    }

    if (!user || user.isActive === false) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    await new Promise((resolve, reject) =>
      req.session.regenerate(err => (err ? reject(err) : resolve()))
    );

    req.session.userId = user.id || user._id.toString();
    req.session.role = user.role;

    return res.json({
      message: "Login successful!",
      user: storage.safeUser(user)
    });
  } catch (err) {
    next(err);
  }
});

router.get("/me", async (req, res, next) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not logged in." });
    }

    const engine = storage.getEngine();
    let user = null;

    if (engine === "supabase") {
      user = await storage.supabaseDb.findUserById(req.session.userId);
    } else if (engine === "mongodb") {
      user = await User.findById(req.session.userId);
    } else {
      user = storage.fallbackStore.users.find(u => u._id === req.session.userId);
    }

    if (!user || user.isActive === false) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: "Session expired or user inactive." });
    }

    return res.json({ user: storage.safeUser(user) });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: "Failed to log out." });
    res.clearCookie("svn.sid", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });
    res.json({ message: "Logout successful." });
  });
});

module.exports = router;
