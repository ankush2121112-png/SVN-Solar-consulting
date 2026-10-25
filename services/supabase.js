const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");

let supabaseClient = null;

function initSupabase(url, key) {
  if (url && key) {
    supabaseClient = createClient(url, key, {
      auth: { persistSession: false }
    });
    return supabaseClient;
  }
  return null;
}

function getSupabase() {
  return supabaseClient;
}

function isSupabaseConfigured() {
  return !!supabaseClient;
}

// Convert snake_case Supabase user to standard User object
function formatUser(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || "",
    role: row.role,
    companyName: row.company_name || "",
    serviceAreas: Array.isArray(row.service_areas) ? row.service_areas : [],
    serviceTypes: Array.isArray(row.service_types) ? row.service_types : [],
    vendorVerified: !!row.vendor_verified,
    isActive: row.is_active !== false,
    passwordHash: row.password_hash,
    createdAt: row.created_at
  };
}

function formatLead(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    leadNumber: row.lead_number,
    customer: row.customer_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email || "",
    city: row.city,
    projectType: row.project_type,
    monthlyBill: row.monthly_bill || "",
    budget: row.budget || "",
    spaceAvailable: row.space_available || "",
    recommendedKw: row.recommended_kw || "",
    requirement: row.requirement || "",
    status: row.status,
    assignedVendor: row.assigned_vendor_id,
    assignedVendorDetails: row.assigned_vendor
      ? {
          name: row.assigned_vendor.name,
          companyName: row.assigned_vendor.company_name,
          email: row.assigned_vendor.email,
          phone: row.assigned_vendor.phone
        }
      : null,
    internalNotes: row.internal_notes || "",
    createdAt: row.created_at
  };
}

function formatSystem(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    systemId: row.system_id,
    customer: row.customer_id,
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    customerPhone: row.customer_phone || "",
    city: row.city,
    capacityKw: Number(row.capacity_kw),
    systemType: row.system_type,
    panelBrand: row.panel_brand,
    panelQuantity: row.panel_quantity,
    inverterBrand: row.inverter_brand,
    inverterCapacity: row.inverter_capacity,
    installationDate: row.installation_date,
    warrantyYears: row.warranty_years,
    inverterWarrantyYears: row.inverter_warranty_years,
    status: row.status,
    notes: row.notes || "",
    createdAt: row.created_at
  };
}

function formatContract(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    contractId: row.contract_id,
    customer: row.customer_id,
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    customerPhone: row.customer_phone || "",
    systemId: row.system_id,
    planName: row.plan_name,
    annualPrice: Number(row.annual_price),
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    totalVisitsQuota: row.total_visits_quota,
    completedVisits: row.completed_visits,
    assignedVendor: row.assigned_vendor_id,
    assignedVendorDetails: row.assigned_vendor
      ? {
          name: row.assigned_vendor.name,
          companyName: row.assigned_vendor.company_name,
          phone: row.assigned_vendor.phone
        }
      : null,
    vendorPayout: Number(row.vendor_payout || 0),
    paymentStatus: row.payment_status,
    notes: row.notes || "",
    createdAt: row.created_at
  };
}

function formatService(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    ticketId: row.ticket_id,
    customer: row.customer_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email || "",
    systemId: row.system_id || "",
    city: row.city || "",
    serviceType: row.service_type,
    description: row.description,
    preferredDate: row.preferred_date || "",
    status: row.status,
    assignedVendor: row.assigned_vendor_id,
    assignedVendorDetails: row.assigned_vendor
      ? {
          name: row.assigned_vendor.name,
          companyName: row.assigned_vendor.company_name,
          phone: row.assigned_vendor.phone
        }
      : null,
    technicianNotes: row.technician_notes || "",
    completedAt: row.completed_at,
    createdAt: row.created_at
  };
}

function formatQuotation(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    quoteId: row.quote_id,
    leadId: row.lead_id,
    vendor: row.vendor_id,
    vendorName: row.vendor_name,
    vendorCompanyName: row.vendor_company_name,
    vendorPhone: row.vendor_phone,
    systemCapacity: row.system_capacity,
    panelDetails: row.panel_details,
    inverterDetails: row.inverter_details,
    totalPrice: Number(row.total_price),
    warrantyTerms: row.warranty_terms,
    estimatedDays: row.estimated_days,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at
  };
}

// ----------------- Supabase Database Operations -----------------
const db = {
  // Users
  async findUserByEmail(email) {
    const { data, error } = await supabaseClient
      .from("users")
      .select("*")
      .eq("email", String(email).trim().toLowerCase())
      .maybeSingle();
    if (error) throw error;
    return formatUser(data);
  },

  async findUserById(id) {
    const { data, error } = await supabaseClient
      .from("users")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return formatUser(data);
  },

  async createUser(u) {
    const payload = {
      name: u.name,
      email: u.email,
      phone: u.phone || "",
      password_hash: u.passwordHash,
      role: u.role,
      company_name: u.companyName || "",
      service_areas: u.serviceAreas || [],
      service_types: u.serviceTypes || [],
      vendor_verified: !!u.vendorVerified,
      is_active: u.isActive !== false
    };
    const { data, error } = await supabaseClient
      .from("users")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return formatUser(data);
  },

  async updateUser(id, fields) {
    const payload = {};
    if (fields.name !== undefined) payload.name = fields.name;
    if (fields.phone !== undefined) payload.phone = fields.phone;
    if (fields.companyName !== undefined) payload.company_name = fields.companyName;
    if (fields.serviceAreas !== undefined) payload.service_areas = fields.serviceAreas;
    if (fields.serviceTypes !== undefined) payload.service_types = fields.serviceTypes;
    if (fields.vendorVerified !== undefined) payload.vendor_verified = fields.vendorVerified;
    if (fields.isActive !== undefined) payload.is_active = fields.isActive;
    if (fields.passwordHash !== undefined) payload.password_hash = fields.passwordHash;

    const { data, error } = await supabaseClient
      .from("users")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return formatUser(data);
  },

  async getVendors() {
    const { data, error } = await supabaseClient
      .from("users")
      .select("*")
      .eq("role", "vendor")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(formatUser);
  },

  // Leads
  async createLead(lead) {
    const payload = {
      lead_number: lead.leadNumber,
      customer_id: lead.customer || null,
      customer_name: lead.customerName,
      customer_phone: lead.customerPhone,
      customer_email: lead.customerEmail || "",
      city: lead.city,
      project_type: lead.projectType,
      monthly_bill: lead.monthlyBill || "",
      budget: lead.budget || "",
      space_available: lead.spaceAvailable || "",
      recommended_kw: lead.recommendedKw || "",
      requirement: lead.requirement || "",
      status: lead.status || "New",
      assigned_vendor_id: lead.assignedVendor || null,
      internal_notes: lead.internalNotes || ""
    };
    const { data, error } = await supabaseClient
      .from("leads")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return formatLead(data);
  },

  async getLeads(filter = {}) {
    let query = supabaseClient
      .from("leads")
      .select("*, assigned_vendor:users!assigned_vendor_id(*)")
      .order("created_at", { ascending: false });

    if (filter.customerId && filter.customerEmail) {
      query = query.or(`customer_id.eq.${filter.customerId},customer_email.eq.${filter.customerEmail}`);
    } else if (filter.customerId) {
      query = query.eq("customer_id", filter.customerId);
    } else if (filter.assignedVendorId) {
      query = query.eq("assigned_vendor_id", filter.assignedVendorId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(formatLead);
  },

  async updateLead(id, updates) {
    const payload = {};
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.assignedVendor !== undefined) payload.assigned_vendor_id = updates.assignedVendor;
    if (updates.internalNotes !== undefined) payload.internal_notes = updates.internalNotes;

    const { data, error } = await supabaseClient
      .from("leads")
      .update(payload)
      .or(`id.eq.${id},lead_number.eq.${id}`)
      .select()
      .single();
    if (error) throw error;
    return formatLead(data);
  },

  // Solar Systems
  async createSolarSystem(sys) {
    const payload = {
      system_id: sys.systemId,
      customer_id: sys.customer || null,
      customer_email: sys.customerEmail,
      customer_name: sys.customerName,
      customer_phone: sys.customerPhone || "",
      city: sys.city,
      capacity_kw: sys.capacityKw,
      system_type: sys.systemType || "Residential Rooftop",
      panel_brand: sys.panelBrand,
      panel_quantity: sys.panelQuantity,
      inverter_brand: sys.inverterBrand,
      inverter_capacity: sys.inverterCapacity,
      warranty_years: sys.warrantyYears,
      inverter_warranty_years: sys.inverterWarrantyYears,
      status: sys.status || "Active",
      notes: sys.notes || ""
    };
    const { data, error } = await supabaseClient
      .from("solar_systems")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return formatSystem(data);
  },

  async getSolarSystems(filter = {}) {
    let query = supabaseClient
      .from("solar_systems")
      .select("*")
      .order("created_at", { ascending: false });

    if (filter.customerId && filter.customerEmail) {
      query = query.or(`customer_id.eq.${filter.customerId},customer_email.eq.${filter.customerEmail}`);
    } else if (filter.customerId) {
      query = query.eq("customer_id", filter.customerId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(formatSystem);
  },

  // AMC Contracts
  async createAMCContract(c) {
    const payload = {
      contract_id: c.contractId,
      customer_id: c.customer || null,
      customer_email: c.customerEmail,
      customer_name: c.customerName,
      customer_phone: c.customerPhone || "",
      system_id: c.systemId,
      plan_name: c.planName,
      annual_price: c.annualPrice,
      status: c.status || "Pending Approval",
      total_visits_quota: c.totalVisitsQuota || 4,
      completed_visits: c.completedVisits || 0,
      assigned_vendor_id: c.assignedVendor || null,
      vendor_payout: c.vendorPayout || 0,
      payment_status: c.paymentStatus || "Pending",
      notes: c.notes || ""
    };
    const { data, error } = await supabaseClient
      .from("amc_contracts")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return formatContract(data);
  },

  async getAMCContracts(filter = {}) {
    let query = supabaseClient
      .from("amc_contracts")
      .select("*, assigned_vendor:users!assigned_vendor_id(*)")
      .order("created_at", { ascending: false });

    if (filter.customerId && filter.customerEmail) {
      query = query.or(`customer_id.eq.${filter.customerId},customer_email.eq.${filter.customerEmail}`);
    } else if (filter.customerId) {
      query = query.eq("customer_id", filter.customerId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(formatContract);
  },

  async updateAMCContract(id, updates) {
    const payload = {};
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.startDate !== undefined) payload.start_date = updates.startDate;
    if (updates.endDate !== undefined) payload.end_date = updates.endDate;
    if (updates.assignedVendor !== undefined) payload.assigned_vendor_id = updates.assignedVendor;
    if (updates.vendorPayout !== undefined) payload.vendor_payout = updates.vendorPayout;
    if (updates.paymentStatus !== undefined) payload.payment_status = updates.paymentStatus;
    if (updates.completedVisits !== undefined) payload.completed_visits = updates.completedVisits;

    const { data, error } = await supabaseClient
      .from("amc_contracts")
      .update(payload)
      .or(`id.eq.${id},contract_id.eq.${id}`)
      .select()
      .single();
    if (error) throw error;
    return formatContract(data);
  },

  // Service Tickets
  async createServiceTicket(t) {
    const payload = {
      ticket_id: t.ticketId,
      customer_id: t.customer || null,
      customer_name: t.customerName,
      customer_phone: t.customerPhone,
      customer_email: t.customerEmail || "",
      system_id: t.systemId || "",
      city: t.city || "",
      service_type: t.serviceType,
      description: t.description,
      preferred_date: t.preferredDate || "",
      status: t.status || "Booked",
      assigned_vendor_id: t.assignedVendor || null,
      technician_notes: t.technicianNotes || ""
    };
    const { data, error } = await supabaseClient
      .from("service_tickets")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return formatService(data);
  },

  async getServiceTickets(filter = {}) {
    let query = supabaseClient
      .from("service_tickets")
      .select("*, assigned_vendor:users!assigned_vendor_id(*)")
      .order("created_at", { ascending: false });

    if (filter.customerId && filter.customerEmail) {
      query = query.or(`customer_id.eq.${filter.customerId},customer_email.eq.${filter.customerEmail}`);
    } else if (filter.customerId) {
      query = query.eq("customer_id", filter.customerId);
    } else if (filter.assignedVendorId) {
      query = query.eq("assigned_vendor_id", filter.assignedVendorId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(formatService);
  },

  async updateServiceTicket(id, updates) {
    const payload = {};
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.assignedVendor !== undefined) payload.assigned_vendor_id = updates.assignedVendor;
    if (updates.technicianNotes !== undefined) payload.technician_notes = updates.technicianNotes;
    if (updates.completedAt !== undefined) payload.completed_at = updates.completedAt;

    const { data, error } = await supabaseClient
      .from("service_tickets")
      .update(payload)
      .or(`id.eq.${id},ticket_id.eq.${id}`)
      .select()
      .single();
    if (error) throw error;
    return formatService(data);
  },

  // Quotations
  async createQuotation(q) {
    const payload = {
      quote_id: q.quoteId,
      lead_id: q.leadId,
      vendor_id: q.vendor,
      vendor_name: q.vendorName,
      vendor_company_name: q.vendorCompanyName || "",
      vendor_phone: q.vendorPhone || "",
      system_capacity: q.systemCapacity,
      panel_details: q.panelDetails || "",
      inverter_details: q.inverterDetails || "",
      total_price: q.totalPrice,
      warranty_terms: q.warrantyTerms || "",
      estimated_days: q.estimatedDays || 7,
      status: q.status || "Submitted",
      notes: q.notes || ""
    };
    const { data, error } = await supabaseClient
      .from("quotations")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return formatQuotation(data);
  },

  async getQuotationsByLead(leadId) {
    const { data, error } = await supabaseClient
      .from("quotations")
      .select("*")
      .eq("lead_id", leadId)
      .order("total_price", { ascending: true });
    if (error) throw error;
    return (data || []).map(formatQuotation);
  },

  async updateQuotation(id, updates) {
    const payload = {};
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.notes !== undefined) payload.notes = updates.notes;

    const { data, error } = await supabaseClient
      .from("quotations")
      .update(payload)
      .or(`id.eq.${id},quote_id.eq.${id}`)
      .select()
      .single();
    if (error) throw error;
    return formatQuotation(data);
  },

  // Admin Stats
  async getAdminStats() {
    const [leadsRes, systemsRes, amcRes, servicesRes, vendorsRes] = await Promise.all([
      supabaseClient.from("leads").select("id", { count: "exact", head: true }),
      supabaseClient.from("solar_systems").select("id", { count: "exact", head: true }),
      supabaseClient.from("amc_contracts").select("id, annual_price").eq("status", "Active"),
      supabaseClient.from("service_tickets").select("id", { count: "exact", head: true }).neq("status", "Completed"),
      supabaseClient.from("users").select("id", { count: "exact", head: true }).eq("role", "vendor")
    ]);

    const activeContracts = amcRes.data || [];
    const totalAmcRevenue = activeContracts.reduce((sum, c) => sum + Number(c.annual_price || 0), 0);

    return {
      totalLeads: leadsRes.count || 0,
      totalSystems: systemsRes.count || 0,
      activeAmcs: activeContracts.length,
      openTickets: servicesRes.count || 0,
      totalVendors: vendorsRes.count || 0,
      totalAmcRevenue,
      dbMode: "Supabase (PostgreSQL)"
    };
  },

  // Seed default Admin & Verified Demo Vendors
  async seedAdminAndVendors(adminName, adminEmail, adminPassword) {
    const email = (adminEmail || "admin@svnsolar.local").trim().toLowerCase();
    const existing = await this.findUserByEmail(email);
    const passwordHash = await bcrypt.hash(adminPassword || "SVNAdmin#2026!", 12);

    if (!existing) {
      await this.createUser({
        name: adminName || "SVN Solar Admin",
        email,
        phone: "+91 98765 43210",
        passwordHash,
        role: "admin",
        isActive: true
      });
      console.log(`[Supabase] Default Admin user created: ${email}`);
    } else {
      await this.updateUser(existing.id, { passwordHash });
    }

    // Seed sample verified vendors if none exist
    const vendors = await this.getVendors();
    if (vendors.length === 0) {
      const vendorPw = await bcrypt.hash("SolarVendor#123", 10);
      await this.createUser({
        name: "Rewa Solar Tech Solutions",
        email: "rewa.solar@svnsolar.local",
        phone: "+91 94251 77201",
        companyName: "Rewa Solar Power Pvt Ltd",
        serviceAreas: ["Rewa", "Satna", "Sidhi", "Maihar"],
        serviceTypes: ["Residential Rooftop", "Commercial", "Solar Agricultural Pump", "AMC"],
        vendorVerified: true,
        passwordHash: vendorPw,
        role: "vendor",
        isActive: true
      });
      await this.createUser({
        name: "Vindhya Renewable Energy",
        email: "vindhya.energy@svnsolar.local",
        phone: "+91 98263 11890",
        companyName: "Vindhya Green Power LLP",
        serviceAreas: ["Satna", "Panna", "Katni", "Jabalpur"],
        serviceTypes: ["Residential Rooftop", "Solar Water Pump", "Repair / AMC"],
        vendorVerified: true,
        passwordHash: vendorPw,
        role: "vendor",
        isActive: true
      });
      console.log("[Supabase] Seeded demo verified solar vendors");
    }
  }
};

module.exports = {
  initSupabase,
  getSupabase,
  isSupabaseConfigured,
  db
};
