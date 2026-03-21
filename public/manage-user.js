const API_BASE = window.API_BASE || window.location.origin;
const token = localStorage.getItem("auth_token");

if (!token) {
  window.location.replace("/login.html");
}

const msgEl = document.getElementById("user-page-message");
const logoutBtn = document.getElementById("logout-btn");
const nameEl = document.getElementById("mu-name");
const facultyEl = document.getElementById("mu-faculty");
const emailEl = document.getElementById("mu-email");
const deptEl = document.getElementById("mu-dept");
const statusEl = document.getElementById("mu-status");
const loginsEl = document.getElementById("mu-logins");
const eqActionsEl = document.getElementById("mu-eq-actions");
const latestEl = document.getElementById("mu-latest");

function formatDate(val) {
  if (!val) return "-";
  try {
    return new Date(val).toLocaleDateString();
  } catch {
    return String(val);
  }
}

async function loadUserActivity() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/user/activity`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const payload = await res.json();
    if (!res.ok || !payload.success) throw new Error(payload?.error?.message || "Unable to load user activity");

    const user = payload.data.user || {};
    const act = payload.data.activity || {};

    nameEl.textContent = user.name || "-";
    facultyEl.textContent = user.faculty_id || "-";
    emailEl.textContent = user.email || "-";
    deptEl.textContent = user.department || "-";
    loginsEl.textContent = act.logins ?? 0;
    eqActionsEl.textContent = act.equipment_actions ?? 0;
    latestEl.textContent = formatDate(act.latest_login_at);

    msgEl.textContent = "";
  } catch (err) {
    msgEl.style.color = "#b42318";
    msgEl.textContent = err.message || "Unable to load page";
  }
}

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("user_email");
  localStorage.removeItem("managed_lab");
  window.location.replace("/login.html");
});

loadUserActivity();
