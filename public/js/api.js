// SVN Solar Consulting - API Client & Session Helper

async function api(url, method = "GET", body = null) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "same-origin"
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

// User state cache
let currentUser = null;

async function checkAuth() {
  try {
    const res = await api("/api/auth/me");
    currentUser = res.user;
    return currentUser;
  } catch (err) {
    currentUser = null;
    return null;
  }
}

async function loginUser(email, password) {
  const res = await api("/api/auth/login", "POST", { email, password });
  currentUser = res.user;
  return res;
}

async function registerUser(payload) {
  const res = await api("/api/auth/register", "POST", payload);
  currentUser = res.user;
  return res;
}

async function logoutUser() {
  await api("/api/auth/logout", "POST");
  currentUser = null;
  window.location.href = "/";
}

function formatCurrency(num) {
  if (num === null || num === undefined || isNaN(num)) return "₹0";
  return "₹" + Number(num).toLocaleString("en-IN");
}

function formatDate(isoStr) {
  if (!isoStr) return "N/A";
  const d = new Date(isoStr);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function showToast(message, type = "info") {
  let toastEl = document.getElementById("svn-toast");
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.id = "svn-toast";
    toastEl.style.position = "fixed";
    toastEl.style.bottom = "24px";
    toastEl.style.right = "24px";
    toastEl.style.zIndex = "9999";
    toastEl.style.maxWidth = "400px";
    toastEl.style.padding = "14px 20px";
    toastEl.style.borderRadius = "10px";
    toastEl.style.fontSize = "0.95rem";
    toastEl.style.fontWeight = "600";
    toastEl.style.boxShadow = "0 10px 25px -5px rgba(0,0,0,0.3)";
    toastEl.style.transition = "all 0.3s ease";
    document.body.appendChild(toastEl);
  }

  if (type === "success") {
    toastEl.style.background = "#15803d";
    toastEl.style.color = "white";
  } else if (type === "error") {
    toastEl.style.background = "#dc2626";
    toastEl.style.color = "white";
  } else {
    toastEl.style.background = "#0f172a";
    toastEl.style.color = "white";
  }

  toastEl.textContent = message;
  toastEl.style.display = "block";
  toastEl.style.opacity = "1";

  clearTimeout(window._toastTimeout);
  window._toastTimeout = setTimeout(() => {
    toastEl.style.opacity = "0";
    setTimeout(() => {
      toastEl.style.display = "none";
    }, 300);
  }, 4000);
}
