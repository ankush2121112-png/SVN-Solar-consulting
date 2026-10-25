// SVN Solar Consulting - Portal Dashboard (Customer, Vendor, Admin)

let activeUser = null;

document.addEventListener("DOMContentLoaded", async () => {
  activeUser = await checkAuth();
  if (!activeUser) {
    showAuthView();
  } else {
    showPortalView();
  }
});

function showAuthView() {
  document.getElementById("auth-view").style.display = "block";
  document.getElementById("portal-view").style.display = "none";
}

function showPortalView() {
  document.getElementById("auth-view").style.display = "none";
  document.getElementById("portal-view").style.display = "block";

  // Setup user header
  document.getElementById("portal-user-name").textContent = activeUser.name;
  document.getElementById("portal-user-email").textContent = activeUser.email;

  const roleBadge = document.getElementById("portal-user-role");
  if (activeUser.role === "admin") {
    roleBadge.textContent = "SVN Operations Admin";
    roleBadge.className = "badge badge-danger";
  } else if (activeUser.role === "vendor") {
    const verified = activeUser.vendorVerified;
    roleBadge.textContent = verified ? "Verified Solar Vendor" : "Vendor (Pending Verification)";
    roleBadge.className = verified ? "badge badge-success" : "badge badge-warning";
  } else {
    roleBadge.textContent = "Solar Customer";
    roleBadge.className = "badge badge-info";
  }

  // Setup role-based navigation tabs
  setupRoleTabs(activeUser.role);
}

function setupRoleTabs(role) {
  const tabsContainer = document.getElementById("portal-tabs-nav");
  tabsContainer.innerHTML = "";

  let tabs = [];
  if (role === "customer") {
    tabs = [
      { id: "cust-leads", label: "📋 My Solar Requests & Quotes", func: loadCustomerLeads },
      { id: "cust-system", label: "☀ My Solar System & Warranty", func: loadCustomerSystems },
      { id: "cust-amc", label: "🛡️ AMC Plans & Contracts", func: loadCustomerAMC },
      { id: "cust-service", label: "🔧 Book Service & Cleaning", func: loadCustomerServices }
    ];
  } else if (role === "vendor") {
    tabs = [
      { id: "vend-leads", label: "📥 Assigned Customer Leads", func: loadVendorLeads },
      { id: "vend-services", label: "🛠️ Service & AMC Jobs", func: loadVendorServices },
      { id: "vend-profile", label: "🏢 Vendor Profile & Areas", func: loadVendorProfile }
    ];
  } else if (role === "admin") {
    tabs = [
      { id: "admin-overview", label: "📊 Operations Overview", func: loadAdminOverview },
      { id: "admin-leads", label: "📑 All Leads & Assignment", func: loadAdminLeads },
      { id: "admin-vendors", label: "🏢 Vendor Management", func: loadAdminVendors },
      { id: "admin-systems", label: "☀ Customer Solar Files", func: loadAdminSystems },
      { id: "admin-amc", label: "🛡️ AMC Contract Activations", func: loadAdminAMC },
      { id: "admin-services", label: "🔧 Service Tickets Oversight", func: loadAdminServices }
    ];
  }

  tabs.forEach((tab, index) => {
    const btn = document.createElement("button");
    btn.className = `tab-btn ${index === 0 ? "active" : ""}`;
    btn.textContent = tab.label;
    btn.onclick = () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      tab.func();
    };
    tabsContainer.appendChild(btn);
  });

  // Load first tab
  if (tabs.length > 0) tabs[0].func();
}

// ----------------- Auth handlers -----------------
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  try {
    const res = await loginUser(email, password);
    showToast(res.message || "Logged in successfully!", "success");
    activeUser = res.user;
    showPortalView();
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const role = document.getElementById("reg-role").value;
  const payload = {
    name: document.getElementById("reg-name").value,
    email: document.getElementById("reg-email").value,
    phone: document.getElementById("reg-phone").value,
    password: document.getElementById("reg-password").value,
    role,
    companyName: document.getElementById("reg-company").value,
    serviceAreas: document.getElementById("reg-areas").value,
    serviceTypes: document.getElementById("reg-types").value
  };

  try {
    const res = await registerUser(payload);
    showToast(res.message, "success");
    activeUser = res.user;
    showPortalView();
  } catch (err) {
    showToast(err.message, "error");
  }
}

function quickFillAdmin() {
  document.getElementById("login-email").value = "admin@svnsolar.local";
  document.getElementById("login-password").value = "SVNAdmin#2026!";
  showToast("Admin credentials filled! Click Login.", "info");
}

function toggleVendorRegisterFields() {
  const role = document.getElementById("reg-role").value;
  const vendorFields = document.getElementById("vendor-specific-fields");
  if (vendorFields) {
    vendorFields.style.display = role === "vendor" ? "block" : "none";
  }
}

// ----------------- Customer View Handlers -----------------
async function loadCustomerLeads() {
  const container = document.getElementById("portal-content");
  container.innerHTML = `<div class="card"><p>Loading your requests...</p></div>`;

  try {
    const data = await api("/api/leads/mine");
    const leads = data.leads || [];

    let html = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2>My Solar Project Requests (${leads.length})</h2>
        <button class="btn btn-primary btn-sm" onclick="openNewLeadModal()">+ Submit New Solar Request</button>
      </div>
    `;

    if (leads.length === 0) {
      html += `
        <div class="card" style="text-align: center; padding: 40px;">
          <p class="muted">No solar requests found under your account.</p>
          <button class="btn btn-primary" style="margin-top: 14px;" onclick="openNewLeadModal()">Request Free Solar Sizing</button>
        </div>
      `;
    } else {
      html += `
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Lead ID</th>
                <th>Type</th>
                <th>City</th>
                <th>Recommended</th>
                <th>Status</th>
                <th>Date</th>
                <th>Quotations</th>
              </tr>
            </thead>
            <tbody>
              ${leads.map(l => `
                <tr>
                  <td><b>${l.leadNumber}</b></td>
                  <td>${l.projectType}</td>
                  <td>${l.city}</td>
                  <td>${l.recommendedKw || "TBD"}</td>
                  <td><span class="badge ${getStatusBadgeClass(l.status)}">${l.status}</span></td>
                  <td>${formatDate(l.createdAt)}</td>
                  <td>
                    <button class="btn btn-outline btn-sm" onclick="viewLeadQuotations('${l.leadNumber || l._id}')">
                      View Quotes
                    </button>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        <div id="quotes-comparison-area" style="margin-top: 30px;"></div>
      `;
    }

    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div class="card"><p style="color:red">Error: ${err.message}</p></div>`;
  }
}

async function viewLeadQuotations(leadId) {
  const area = document.getElementById("quotes-comparison-area");
  if (!area) return;
  area.innerHTML = `<div class="card"><p>Loading quotations for ${leadId}...</p></div>`;

  try {
    const res = await api(`/api/quotes/lead/${encodeURIComponent(leadId)}`);
    const quotes = res.quotes || [];

    if (quotes.length === 0) {
      area.innerHTML = `
        <div class="card">
          <h3>Quotations for ${leadId}</h3>
          <p class="muted" style="margin-top: 8px;">
            No installer quotations received yet. SVN Solar has assigned verified installers who will submit technical quotes shortly.
          </p>
        </div>
      `;
      return;
    }

    area.innerHTML = `
      <div class="card">
        <h3>Installer Quotation Comparison (${quotes.length}) - ${leadId}</h3>
        <p class="muted" style="margin-bottom: 16px;">
          Compare installer bids side-by-side. Check hardware specifications, warranties, and pricing.
        </p>
        <div class="grid-3">
          ${quotes.map(q => `
            <div class="plan-card ${q.status.includes('Accepted') ? 'featured' : ''}">
              ${q.status.includes('Accepted') ? '<span class="plan-badge">Selected Quote</span>' : ''}
              <h3>${q.vendorCompanyName || q.vendorName}</h3>
              <p class="muted">System: ${q.systemCapacity}</p>
              <div class="plan-price">${formatCurrency(q.totalPrice)}</div>
              <ul class="plan-features">
                <li><b>Panels:</b> ${q.panelDetails || "Tier-1 Mono PERC"}</li>
                <li><b>Inverter:</b> ${q.inverterDetails || "Grid-Tied String Inverter"}</li>
                <li><b>Warranty:</b> ${q.warrantyTerms || "25y Panel, 5y Inverter"}</li>
                <li><b>Est. Completion:</b> ${q.estimatedDays || 7} Days</li>
              </ul>
              ${q.status === 'Submitted' ? `
                <button class="btn btn-primary btn-sm" style="width: 100%;" onclick="acceptQuote('${q._id}')">
                  Accept Quotation
                </button>
              ` : `
                <span class="badge badge-success">Accepted</span>
              `}
            </div>
          `).join("")}
        </div>
      </div>
    `;
  } catch (err) {
    area.innerHTML = `<div class="card"><p style="color:red">Error: ${err.message}</p></div>`;
  }
}

async function acceptQuote(quoteId) {
  if (!confirm("Are you sure you want to accept this quotation? SVN Solar will initiate the installation schedule.")) return;
  try {
    const res = await api(`/api/quotes/${quoteId}/accept`, "PATCH");
    showToast(res.message, "success");
    loadCustomerLeads();
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function loadCustomerSystems() {
  const container = document.getElementById("portal-content");
  container.innerHTML = `<div class="card"><p>Loading solar systems...</p></div>`;

  try {
    const res = await api("/api/systems/mine");
    const systems = res.systems || [];

    let html = `<h2>My Solar System & Warranty Records (Digital Solar File)</h2>`;

    if (systems.length === 0) {
      html += `
        <div class="card" style="text-align: center; padding: 40px; margin-top: 16px;">
          <p class="muted">No installed solar system recorded under your email yet.</p>
          <p class="muted" style="font-size: 0.85rem; margin-top: 6px;">
            Once your solar plant is commissioned by an SVN certified installer, your digital warranty file, serial numbers, and maintenance schedule will appear here.
          </p>
        </div>
      `;
    } else {
      html += `
        <div class="grid-3" style="margin-top: 20px;">
          ${systems.map(s => `
            <div class="card">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                <div>
                  <span class="badge badge-success">${s.status}</span>
                  <h3 style="margin-top: 8px;">${s.systemId}</h3>
                  <p class="muted">${s.systemType} · ${s.capacityKw} kW</p>
                </div>
              </div>
              <ul class="plan-features">
                <li><b>Location:</b> ${s.city}</li>
                <li><b>Panels:</b> ${s.panelBrand} (${s.panelQuantity} Nos)</li>
                <li><b>Inverter:</b> ${s.inverterBrand} (${s.inverterCapacity})</li>
                <li><b>Panel Warranty:</b> ${s.warrantyYears} Years</li>
                <li><b>Inverter Warranty:</b> ${s.inverterWarrantyYears} Years</li>
                <li><b>Installed:</b> ${formatDate(s.installationDate)}</li>
              </ul>
              <div style="margin-top: 16px; display: flex; gap: 8px;">
                <button class="btn btn-outline btn-sm" style="flex: 1;" onclick="openServiceModal('${s.systemId}')">
                  🔧 Book Service
                </button>
                <button class="btn btn-primary btn-sm" style="flex: 1;" onclick="openAmcModalFromSystem('${s.systemId}')">
                  🛡️ Get AMC
                </button>
              </div>
            </div>
          `).join("")}
        </div>
      `;
    }

    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div class="card"><p style="color:red">Error: ${err.message}</p></div>`;
  }
}

async function loadCustomerAMC() {
  const container = document.getElementById("portal-content");
  container.innerHTML = `<div class="card"><p>Loading AMC plans & contracts...</p></div>`;

  try {
    const [plansRes, contractsRes] = await Promise.all([
      api("/api/amc/plans"),
      api("/api/amc/mine")
    ]);

    const plans = plansRes.plans || [];
    const contracts = contractsRes.contracts || [];

    let html = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2>Annual Maintenance Contracts (AMC)</h2>
      </div>
    `;

    // Active contracts section
    if (contracts.length > 0) {
      html += `
        <h3 style="margin-bottom: 14px;">Your AMC Coverage</h3>
        <div class="table-responsive" style="margin-bottom: 30px;">
          <table class="table">
            <thead>
              <tr>
                <th>Contract ID</th>
                <th>System ID</th>
                <th>Plan Name</th>
                <th>Annual Fee</th>
                <th>Visits Used</th>
                <th>Validity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${contracts.map(c => `
                <tr>
                  <td><b>${c.contractId}</b></td>
                  <td>${c.systemId}</td>
                  <td>${c.planName}</td>
                  <td>${formatCurrency(c.annualPrice)}</td>
                  <td>${c.completedVisits || 0} / ${c.totalVisitsQuota || 4}</td>
                  <td>${c.startDate ? `${formatDate(c.startDate)} to ${formatDate(c.endDate)}` : 'Awaiting Activation'}</td>
                  <td><span class="badge ${c.status === 'Active' ? 'badge-success' : 'badge-warning'}">${c.status}</span></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `;
    }

    // Available plans section
    html += `
      <h3 style="margin-bottom: 14px;">Choose an AMC Protection Plan</h3>
      <div class="grid-3">
        ${plans.map(p => `
          <div class="plan-card ${p.id === 'silver' ? 'featured' : ''}">
            <span class="plan-badge">${p.badge}</span>
            <h3>${p.name}</h3>
            <div class="plan-price">${formatCurrency(p.price)}<span>/year</span></div>
            <ul class="plan-features">
              ${p.features.map(f => `<li>✓ ${f}</li>`).join("")}
            </ul>
            <button class="btn btn-primary" style="width: 100%;" onclick="openRequestAmcModal('${p.name}', ${p.price})">
              Request ${p.name}
            </button>
          </div>
        `).join("")}
      </div>
    `;

    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div class="card"><p style="color:red">Error: ${err.message}</p></div>`;
  }
}

async function loadCustomerServices() {
  const container = document.getElementById("portal-content");
  container.innerHTML = `<div class="card"><p>Loading service history...</p></div>`;

  try {
    const res = await api("/api/services/mine");
    const tickets = res.tickets || [];

    let html = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2>Service & Cleaning Requests (${tickets.length})</h2>
        <button class="btn btn-primary btn-sm" onclick="openServiceModal()">+ Book Service Visit</button>
      </div>
    `;

    if (tickets.length === 0) {
      html += `
        <div class="card" style="text-align: center; padding: 40px;">
          <p class="muted">No service requests booked yet.</p>
          <button class="btn btn-primary" style="margin-top: 14px;" onclick="openServiceModal()">Book Panel Wash / Diagnostics</button>
        </div>
      `;
    } else {
      html += `
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Service Type</th>
                <th>System ID</th>
                <th>Description</th>
                <th>Preferred Date</th>
                <th>Status</th>
                <th>Technician Notes</th>
              </tr>
            </thead>
            <tbody>
              ${tickets.map(t => `
                <tr>
                  <td><b>${t.ticketId}</b></td>
                  <td>${t.serviceType}</td>
                  <td>${t.systemId || "General"}</td>
                  <td>${t.description}</td>
                  <td>${t.preferredDate || "Anytime"}</td>
                  <td><span class="badge ${getStatusBadgeClass(t.status)}">${t.status}</span></td>
                  <td>${t.technicianNotes || "Pending dispatch"}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `;
    }

    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div class="card"><p style="color:red">Error: ${err.message}</p></div>`;
  }
}

// ----------------- Vendor View Handlers -----------------
async function loadVendorLeads() {
  const container = document.getElementById("portal-content");
  container.innerHTML = `<div class="card"><p>Loading assigned customer leads...</p></div>`;

  try {
    const res = await api("/api/leads/mine");
    const leads = res.leads || [];

    let html = `<h2>Assigned Customer Project Leads (${leads.length})</h2>`;

    if (!activeUser.vendorVerified) {
      html += `
        <div class="card" style="background: #fffbeb; border-color: #fde68a; margin-top: 16px;">
          <h3 style="color: #b45309;">Verification Pending</h3>
          <p class="muted">
            Your vendor account is pending review by SVN Solar Admin. Once verified, active installation leads in your service areas will be routed to your dashboard.
          </p>
        </div>
      `;
      container.innerHTML = html;
      return;
    }

    if (leads.length === 0) {
      html += `
        <div class="card" style="text-align: center; padding: 40px; margin-top: 16px;">
          <p class="muted">No leads currently assigned to your company. New leads from your service areas will appear here.</p>
        </div>
      `;
    } else {
      html += `
        <div class="table-responsive" style="margin-top: 16px;">
          <table class="table">
            <thead>
              <tr>
                <th>Lead ID</th>
                <th>Customer</th>
                <th>Phone</th>
                <th>City</th>
                <th>Project Type</th>
                <th>Capacity</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${leads.map(l => `
                <tr>
                  <td><b>${l.leadNumber}</b></td>
                  <td>${l.customerName}</td>
                  <td>${l.customerPhone}</td>
                  <td>${l.city}</td>
                  <td>${l.projectType}</td>
                  <td>${l.recommendedKw || "N/A"}</td>
                  <td><span class="badge ${getStatusBadgeClass(l.status)}">${l.status}</span></td>
                  <td>
                    <button class="btn btn-primary btn-sm" onclick="openSubmitQuoteModal('${l.leadNumber || l._id}', '${l.recommendedKw || '3 kW'}')">
                      Submit Quote
                    </button>
                    <button class="btn btn-outline btn-sm" style="margin-left: 6px;" onclick="openUpdateLeadStatusModal('${l._id}')">
                      Update Status
                    </button>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `;
    }

    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div class="card"><p style="color:red">Error: ${err.message}</p></div>`;
  }
}

async function loadVendorServices() {
  const container = document.getElementById("portal-content");
  container.innerHTML = `<div class="card"><p>Loading service jobs...</p></div>`;

  try {
    const res = await api("/api/services/mine");
    const tickets = res.tickets || [];

    let html = `<h2>Service & AMC Field Work Orders (${tickets.length})</h2>`;

    if (tickets.length === 0) {
      html += `
        <div class="card" style="text-align: center; padding: 40px; margin-top: 16px;">
          <p class="muted">No field service jobs assigned to your team currently.</p>
        </div>
      `;
    } else {
      html += `
        <div class="table-responsive" style="margin-top: 16px;">
          <table class="table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Customer</th>
                <th>Contact</th>
                <th>Service Type</th>
                <th>System ID</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${tickets.map(t => `
                <tr>
                  <td><b>${t.ticketId}</b></td>
                  <td>${t.customerName}</td>
                  <td>${t.customerPhone}</td>
                  <td>${t.serviceType}</td>
                  <td>${t.systemId || "General"}</td>
                  <td><span class="badge ${getStatusBadgeClass(t.status)}">${t.status}</span></td>
                  <td>
                    <button class="btn btn-primary btn-sm" onclick="openUpdateServiceStatusModal('${t._id}', '${t.status}')">
                      Update Progress / Notes
                    </button>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `;
    }

    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div class="card"><p style="color:red">Error: ${err.message}</p></div>`;
  }
}

function loadVendorProfile() {
  const container = document.getElementById("portal-content");
  container.innerHTML = `
    <h2>Vendor Profile & Operations Coverage</h2>
    <div class="card" style="margin-top: 16px; max-width: 600px;">
      <div style="margin-bottom: 16px;">
        <span class="badge ${activeUser.vendorVerified ? 'badge-success' : 'badge-warning'}">
          ${activeUser.vendorVerified ? 'Verified Installer' : 'Pending Verification'}
        </span>
      </div>
      <p><b>Company Name:</b> ${activeUser.companyName || activeUser.name}</p>
      <p><b>Contact Person:</b> ${activeUser.name}</p>
      <p><b>Registered Email:</b> ${activeUser.email}</p>
      <p><b>Phone:</b> ${activeUser.phone || "Not set"}</p>
      <p><b>Service Districts:</b> ${(activeUser.serviceAreas || []).join(", ") || "Satna, Rewa"}</p>
      <p><b>Specializations:</b> ${(activeUser.serviceTypes || []).join(", ") || "Residential, Commercial, Solar Pump, AMC"}</p>
    </div>
  `;
}

// ----------------- Admin View Handlers -----------------
async function loadAdminOverview() {
  const container = document.getElementById("portal-content");
  container.innerHTML = `<div class="card"><p>Loading operations dashboard...</p></div>`;

  try {
    const stats = await api("/api/admin/stats");

    container.innerHTML = `
      <h2>SVN Solar Operations Dashboard</h2>
      <p class="muted" style="margin-bottom: 24px;">Centralized monitoring of customer leads, installer network, and active AMC contracts.</p>

      <div class="stats-row">
        <div class="stat-box">
          <div class="stat-box-num">${stats.totalLeads}</div>
          <div class="stat-box-lbl">Total Customer Leads</div>
        </div>
        <div class="stat-box">
          <div class="stat-box-num">${stats.totalSystems}</div>
          <div class="stat-box-lbl">Registered Solar Systems</div>
        </div>
        <div class="stat-box">
          <div class="stat-box-num">${stats.activeAmcs}</div>
          <div class="stat-box-lbl">Active AMC Contracts</div>
        </div>
        <div class="stat-box">
          <div class="stat-box-num">${stats.openTickets}</div>
          <div class="stat-box-lbl">Open Service Tickets</div>
        </div>
        <div class="stat-box">
          <div class="stat-box-num">${stats.totalVendors}</div>
          <div class="stat-box-lbl">Partner Installers</div>
        </div>
        <div class="stat-box">
          <div class="stat-box-num">${formatCurrency(stats.totalAmcRevenue)}</div>
          <div class="stat-box-lbl">Active AMC Revenue</div>
        </div>
      </div>

      <div class="card">
        <h3>Database Mode: <span class="badge badge-info">${stats.dbMode}</span></h3>
        <p class="muted" style="margin-top: 8px;">
          The system is running with automatic resilience. If MongoDB Atlas or local daemon is connected, it uses full Mongoose storage; otherwise it safely operates on local file store.
        </p>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="card"><p style="color:red">Error: ${err.message}</p></div>`;
  }
}

async function loadAdminLeads() {
  const container = document.getElementById("portal-content");
  container.innerHTML = `<div class="card"><p>Loading all leads...</p></div>`;

  try {
    const [leadsRes, vendorsRes] = await Promise.all([
      api("/api/leads/mine"),
      api("/api/admin/vendors")
    ]);

    const leads = leadsRes.leads || [];
    window._allVendors = vendorsRes.vendors || [];

    let html = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2>All Solar Leads & Vendor Assignment (${leads.length})</h2>
      </div>
    `;

    if (leads.length === 0) {
      html += `<div class="card"><p class="muted">No leads currently in system.</p></div>`;
    } else {
      html += `
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Lead ID</th>
                <th>Customer</th>
                <th>City</th>
                <th>Project Type</th>
                <th>Bill / Budget</th>
                <th>Assigned Vendor</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${leads.map(l => {
                const vendorName = l.assignedVendor?.companyName || l.assignedVendor?.name ||
                  (l.assignedVendorDetails ? l.assignedVendorDetails.companyName : "Unassigned");
                return `
                  <tr>
                    <td><b>${l.leadNumber}</b></td>
                    <td>${l.customerName}<br><small class="muted">${l.customerPhone}</small></td>
                    <td>${l.city}</td>
                    <td>${l.projectType}</td>
                    <td>${l.monthlyBill || "—"}</td>
                    <td><b>${vendorName}</b></td>
                    <td><span class="badge ${getStatusBadgeClass(l.status)}">${l.status}</span></td>
                    <td>
                      <button class="btn btn-primary btn-sm" onclick="openAssignVendorModal('${l._id}')">
                        Assign Vendor
                      </button>
                    </td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      `;
    }

    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div class="card"><p style="color:red">Error: ${err.message}</p></div>`;
  }
}

async function loadAdminVendors() {
  const container = document.getElementById("portal-content");
  container.innerHTML = `<div class="card"><p>Loading vendor directory...</p></div>`;

  try {
    const res = await api("/api/admin/vendors");
    const vendors = res.vendors || [];

    let html = `<h2>Partner Solar Vendors & Installers (${vendors.length})</h2>`;

    html += `
      <div class="table-responsive" style="margin-top: 16px;">
        <table class="table">
          <thead>
            <tr>
              <th>Company / Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Service Areas</th>
              <th>Verification Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${vendors.map(v => `
              <tr>
                <td><b>${v.companyName || v.name}</b><br><small class="muted">${v.name}</small></td>
                <td>${v.email}</td>
                <td>${v.phone || "—"}</td>
                <td>${(v.serviceAreas || []).join(", ") || "All Areas"}</td>
                <td><span class="badge ${v.vendorVerified ? 'badge-success' : 'badge-warning'}">${v.vendorVerified ? 'Verified' : 'Pending Verification'}</span></td>
                <td>
                  <button class="btn ${v.vendorVerified ? 'btn-outline' : 'btn-primary'} btn-sm" onclick="toggleVendorVerification('${v.id || v._id}', ${!v.vendorVerified})">
                    ${v.vendorVerified ? 'Revoke Verification' : 'Verify Vendor'}
                  </button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div class="card"><p style="color:red">Error: ${err.message}</p></div>`;
  }
}

async function toggleVendorVerification(vendorId, newStatus) {
  try {
    const res = await api(`/api/admin/vendors/${vendorId}/verify`, "PATCH", { verified: newStatus });
    showToast(res.message, "success");
    loadAdminVendors();
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function loadAdminSystems() {
  const container = document.getElementById("portal-content");
  container.innerHTML = `<div class="card"><p>Loading customer solar records...</p></div>`;

  try {
    const res = await api("/api/systems/mine");
    const systems = res.systems || [];

    let html = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2>Customer Solar Installation Files (${systems.length})</h2>
        <button class="btn btn-primary btn-sm" onclick="openCreateSolarFileModal()">+ Create Customer Solar File</button>
      </div>
    `;

    if (systems.length === 0) {
      html += `<div class="card"><p class="muted">No solar systems registered yet.</p></div>`;
    } else {
      html += `
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>System ID</th>
                <th>Customer</th>
                <th>City</th>
                <th>Capacity</th>
                <th>Panels & Inverter</th>
                <th>Warranty</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${systems.map(s => `
                <tr>
                  <td><b>${s.systemId}</b></td>
                  <td>${s.customerName}<br><small class="muted">${s.customerEmail}</small></td>
                  <td>${s.city}</td>
                  <td>${s.capacityKw} kW (${s.systemType})</td>
                  <td>${s.panelBrand} · ${s.inverterBrand}</td>
                  <td>${s.warrantyYears} Years</td>
                  <td><span class="badge badge-success">${s.status}</span></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `;
    }

    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div class="card"><p style="color:red">Error: ${err.message}</p></div>`;
  }
}

async function loadAdminAMC() {
  const container = document.getElementById("portal-content");
  container.innerHTML = `<div class="card"><p>Loading AMC contract requests...</p></div>`;

  try {
    const res = await api("/api/amc/mine");
    const contracts = res.contracts || [];

    let html = `<h2>AMC Contract Requests & Activations (${contracts.length})</h2>`;

    if (contracts.length === 0) {
      html += `<div class="card" style="margin-top: 16px;"><p class="muted">No AMC contracts requested yet.</p></div>`;
    } else {
      html += `
        <div class="table-responsive" style="margin-top: 16px;">
          <table class="table">
            <thead>
              <tr>
                <th>Contract ID</th>
                <th>System ID</th>
                <th>Customer</th>
                <th>Plan Name</th>
                <th>Annual Fee</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${contracts.map(c => `
                <tr>
                  <td><b>${c.contractId}</b></td>
                  <td>${c.systemId}</td>
                  <td>${c.customerName}<br><small class="muted">${c.customerEmail}</small></td>
                  <td>${c.planName}</td>
                  <td>${formatCurrency(c.annualPrice)}</td>
                  <td><span class="badge ${c.status === 'Active' ? 'badge-success' : 'badge-warning'}">${c.status}</span></td>
                  <td>
                    ${c.status !== 'Active' ? `
                      <button class="btn btn-primary btn-sm" onclick="openActivateAmcModal('${c._id}')">
                        Activate AMC
                      </button>
                    ` : `
                      <span class="badge badge-success">Active Coverage</span>
                    `}
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `;
    }

    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div class="card"><p style="color:red">Error: ${err.message}</p></div>`;
  }
}

async function loadAdminServices() {
  const container = document.getElementById("portal-content");
  container.innerHTML = `<div class="card"><p>Loading all service tickets...</p></div>`;

  try {
    const res = await api("/api/services/mine");
    const tickets = res.tickets || [];

    let html = `<h2>Field Service & Maintenance Tickets (${tickets.length})</h2>`;

    if (tickets.length === 0) {
      html += `<div class="card" style="margin-top: 16px;"><p class="muted">No service complaints or tickets open.</p></div>`;
    } else {
      html += `
        <div class="table-responsive" style="margin-top: 16px;">
          <table class="table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Customer</th>
                <th>Type</th>
                <th>Description</th>
                <th>Assigned To</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${tickets.map(t => {
                const vendorName = t.assignedVendor?.companyName || t.assignedVendor?.name ||
                  (t.assignedVendorDetails ? t.assignedVendorDetails.companyName : "Unassigned");
                return `
                  <tr>
                    <td><b>${t.ticketId}</b></td>
                    <td>${t.customerName}<br><small class="muted">${t.customerPhone}</small></td>
                    <td>${t.serviceType}</td>
                    <td>${t.description}</td>
                    <td><b>${vendorName}</b></td>
                    <td><span class="badge ${getStatusBadgeClass(t.status)}">${t.status}</span></td>
                    <td>
                      <button class="btn btn-primary btn-sm" onclick="openAssignServiceModal('${t._id}')">
                        Assign Technician
                      </button>
                    </td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      `;
    }

    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div class="card"><p style="color:red">Error: ${err.message}</p></div>`;
  }
}

// ----------------- Helper UI & Modals -----------------
function getStatusBadgeClass(status) {
  if (["Completed", "Active", "Verified"].includes(status)) return "badge-success";
  if (["New", "Reviewed", "Quotation Received", "Submitted"].includes(status)) return "badge-info";
  if (["Vendor Assigned", "Site Visit", "In Progress"].includes(status)) return "badge-warning";
  if (["Cancelled", "Declined"].includes(status)) return "badge-danger";
  return "badge-info";
}

// Global modal helpers
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("active");
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("active");
}
