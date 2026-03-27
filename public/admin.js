const API_BASE = window.API_BASE || window.location.origin;
const token = localStorage.getItem("auth_token");

// Debug helper: log the resolved API base and whether we have a token
console.log("Admin API_BASE:", API_BASE, "token present:", !!token);

if (!token) {
  window.location.replace("/login.html");
}

const messageEl = document.getElementById("admin-message");
const nameEl = document.getElementById("admin-name");
const emailEl = document.getElementById("admin-email");
const facultyIdEl = document.getElementById("admin-faculty-id");
const departmentEl = document.getElementById("admin-department");
const labsEl = document.getElementById("admin-labs");
const totalEquipmentsEl = document.getElementById("total-equipments");
const availableEquipmentsEl = document.getElementById("available-equipments");
const notAvailableEquipmentsEl = document.getElementById("not-available-equipments");
const labsCountEl = document.getElementById("labs-count");
const adminTable = document.getElementById("adminTable");
const logoutBtn = document.getElementById("logout-btn");
const backBtn = document.getElementById("back-btn");
const topLinks = document.querySelectorAll(".top-link");
const sideLinks = document.querySelectorAll(".side-link");
const utilityPanel = document.getElementById("utility-panel");
const utilityTitle = document.getElementById("utility-title");
const utilityContent = document.getElementById("utility-content");

const logsPanel = document.getElementById("logs-panel");
const logsTitleEl = document.getElementById("logs-title");
const logsBodyEl = document.getElementById("logs-table-body");
const logsCloseBtn = document.getElementById("logs-close-btn");

const equipmentById = new Map();
let currentUser = null;
let currentLabs = [];
let currentSummary = {};
let currentEquipments = [];
let selectedEquipmentId = null;

function selectRow(row, itemId) {
  adminTable.querySelectorAll("tr").forEach(r => r.classList.remove("row-selected"));
  row.classList.add("row-selected");
  selectedEquipmentId = Number(itemId);
  localStorage.setItem("selected_equipment_id", String(selectedEquipmentId));
}

function statusClass(labStatus) {
  return labStatus === "available" ? "available" : "inuse";
}

function statusText(labStatus) {
  return labStatus === "available" ? "Available" : "Not Available";
}

function parseLogDetails(details) {
  if (!details) return "-";
  if (typeof details === "object") return JSON.stringify(details);
  try {
    return JSON.stringify(JSON.parse(details));
  } catch {
    return String(details);
  }
}

function closeLogsPanel() {
  logsPanel.style.display = "none";
  logsBodyEl.innerHTML = "";
  logsTitleEl.textContent = "";
}

function setActiveView(view) {
  topLinks.forEach(link => {
    link.classList.toggle("active", link.dataset.view === view);
  });
  sideLinks.forEach(link => {
    link.classList.toggle("active", link.dataset.view === view);
  });
}

function downloadEquipmentCsv() {
  if (!currentEquipments.length) return;
  const headers = ["Lab", "Equipment", "Category", "Quantity", "Available", "Status"];
  const rows = currentEquipments.map(item => {
    const qty = Number(item.equipment_count || item.total_quantity || 0);
    const avail = Number(item.available_quantity || (item.lab_status === "available" ? qty : 0));
    return [
      item.lab_name || "",
      (item.equipment_name_custom || item.equipment_name || "").replace(/,/g, " "),
      item.status || "",
      qty,
      avail,
      item.lab_status || ""
    ].join(",");
  });
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "lab_equipment_report.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function showUtilityPanel(view) {
  closeLogsPanel();
  // Hide the panel entirely on the dashboard to keep the landing view clean.
  if (view === "dashboard") {
    utilityPanel.style.display = "none";
    utilityTitle.textContent = "";
    utilityContent.innerHTML = "";
    return;
  }

  utilityPanel.style.display = "block";
  if (view === "equipment") {
    utilityTitle.textContent = "Manage Equipment";
    utilityContent.innerHTML = `
      <p>Use the <strong>Manage</strong> button in the table to update equipment details.</p>
      <p>Use the <strong>View Logs</strong> button to see equipment change history.</p>
      <div class="panel-actions">
        <button class="action-btn" id="scroll-table-btn" type="button">Go To Equipment Table</button>
      </div>
    `;
    document.getElementById("scroll-table-btn").addEventListener("click", () => {
      document.querySelector(".table-box").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return;
  }

  if (view === "users") {
    utilityTitle.textContent = "Manage Users";
    const status = currentUser?.status || "active";
    utilityContent.innerHTML = `
      <div class="panel-grid">
        <div class="utility-card">
          <p><strong>Name:</strong> ${currentUser?.name || "-"}</p>
          <p><strong>Faculty ID:</strong> ${currentUser?.faculty_id || "-"}</p>
          <p><strong>Email:</strong> ${currentUser?.email || "-"}</p>
          <p><strong>Department:</strong> ${currentUser?.department || "-"}</p>
          <p><strong>Status:</strong> <span id="user-status-text">${status}</span></p>
          <div class="panel-actions">
            <button class="action-btn" id="toggle-status-btn" type="button">${status === "active" ? "Set Inactive" : "Set Active"}</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById("toggle-status-btn").addEventListener("click", async () => {
      const nextStatus = (currentUser?.status || "active") === "active" ? "inactive" : "active";
      try {
        const res = await fetch(`${API_BASE}/api/auth/status/${currentUser.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ status: nextStatus })
        });
        const payload = await res.json();
        if (!res.ok || !payload.success) throw new Error(payload?.error?.message || "Status update failed");
        currentUser.status = nextStatus;
        document.getElementById("user-status-text").textContent = nextStatus;
        document.getElementById("toggle-status-btn").textContent = nextStatus === "active" ? "Set Inactive" : "Set Active";
      } catch (err) {
        alert(err.message || "Unable to update user status");
      }
    });
    return;
  }

  if (view === "reports") {
    utilityTitle.textContent = "Generate Reports";
    utilityContent.innerHTML = `
      <div class="panel-grid">
        <div class="utility-card">
          <p><strong>Total Equipment Records:</strong> ${currentSummary.equipment_records ?? 0}</p>
          <p><strong>Available Records:</strong> ${currentSummary.available_records ?? 0}</p>
          <p><strong>Not Available Records:</strong> ${currentSummary.not_available_records ?? 0}</p>
          <p><strong>Assigned Labs:</strong> ${currentLabs.join(", ") || "-"}</p>
          <div class="panel-actions">
            <button class="action-btn" id="download-csv-btn" type="button">Download CSV Report</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById("download-csv-btn").addEventListener("click", downloadEquipmentCsv);
    return;
  }

  if (view === "settings") {
    utilityTitle.textContent = "Settings";
    utilityContent.innerHTML = `
      <div class="panel-grid">
        <div class="utility-card">
          <p><strong>Session:</strong> Active</p>
          <p><strong>API Base:</strong> ${API_BASE}</p>
          <div class="panel-actions">
            <button class="action-btn" id="refresh-dashboard-btn" type="button">Refresh Dashboard</button>
            <button class="action-btn secondary" id="clear-token-btn" type="button">Clear Session</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById("refresh-dashboard-btn").addEventListener("click", () => loadAdminSession());
    document.getElementById("clear-token-btn").addEventListener("click", () => {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user_email");
      localStorage.removeItem("managed_lab");
      window.location.replace("/login.html");
    });
    return;
  }

  utilityTitle.textContent = "Dashboard";
  utilityContent.innerHTML = `
    <div class="panel-grid">
      <div class="utility-card">
        <p><strong>Dashboard Overview</strong></p>
        <p>Use the top/left menu to open simple tools for Equipment, Users, Reports, and Settings.</p>
      </div>
    </div>
  `;
}

function getViewFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("view") || "dashboard";
}

async function openLogsPanel(item) {
  logsPanel.style.display = "block";
  logsTitleEl.textContent = `Loading logs for ${item.equipment_name_custom || item.equipment_name || item.id}...`;
  logsBodyEl.innerHTML = "";

  try {
    const res = await fetch(`${API_BASE}/api/admin/equipment/${item.id}/logs`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const payload = await res.json();
    if (!res.ok || !payload.success) {
      throw new Error(payload?.error?.message || "Unable to load logs");
    }

    const logs = payload.data?.logs || [];
    const statusChanges = logs.filter(log => {
      try {
        const d = typeof log.details === "string" ? JSON.parse(log.details) : log.details;
        return d && (d.lab_status || d.status);
      } catch {
        return false;
      }
    }).length;

    logsTitleEl.textContent = `Logs for ${item.equipment_name_custom || item.equipment_name || item.id} (status changes: ${statusChanges})`;
    if (logs.length === 0) {
      logsBodyEl.innerHTML = "<tr><td colspan='4'>No logs found</td></tr>";
      return;
    }

    logs.forEach(log => {
      let statusTextValue = "-";
      try {
        const d = typeof log.details === "string" ? JSON.parse(log.details) : log.details;
        if (d && (d.lab_status || d.status)) {
          const labStatus = d.lab_status ? `Lab: ${d.lab_status}` : "";
          const equipStatus = d.status ? `Status: ${d.status}` : "";
          statusTextValue = [labStatus, equipStatus].filter(Boolean).join(" | ") || "-";
        }
      } catch {
        statusTextValue = "-";
      }

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${new Date(log.created_at).toLocaleString()}</td>
        <td>${log.action || "-"}</td>
        <td>${statusTextValue}</td>
        <td>${log.actor_faculty_id || "-"}</td>
        <td>${parseLogDetails(log.details)}</td>
      `;
      logsBodyEl.appendChild(row);
    });
  } catch (err) {
    logsTitleEl.textContent = err.message || "Unable to load logs";
    logsBodyEl.innerHTML = "<tr><td colspan='4'>Failed to load logs</td></tr>";
  }
}

function renderRows(items) {
  // Hide Oscilloscope entries from the table view.
  items = (items || []).filter(item => {
    const name = (item.equipment_name_custom || item.equipment_name || "").trim().toLowerCase();
    return name !== "oscilloscope";
  });

  adminTable.innerHTML = "";
  equipmentById.clear();
  selectedEquipmentId = null;

  if (!items || items.length === 0) {
    adminTable.innerHTML = "<tr><td colspan='7'>No equipment found</td></tr>";
    return;
  }

  let firstRow = null;
  let firstId = null;
  items.slice(0, 100).forEach(item => {
    equipmentById.set(Number(item.id), item);
    const row = document.createElement("tr");
    const qty = Number(item.equipment_count || item.total_quantity || 0);
    const avail = Number(item.available_quantity || (item.lab_status === "available" ? qty : 0));
    const eqName = item.equipment_name_custom || item.equipment_name || "-";
    const category = item.status || "general";
    const eqId = item.equipment_id || item.id || "-";

    row.innerHTML = `
      <td>${eqId}</td>
      <td>${item.lab_name || "-"}</td>
      <td>${eqName}</td>
      <td>${category}</td>
      <td>${qty}</td>
      <td>${avail}</td>
      <td><span class="status ${statusClass(item.lab_status)}">${statusText(item.lab_status)}</span></td>
    `;
    adminTable.appendChild(row);
    if (firstRow === null) {
      firstRow = row;
      firstId = item.id;
    }

    row.addEventListener("click", () => {
      selectRow(row, item.id);
    });
  });

  if (firstRow && firstId && !selectedEquipmentId) {
    selectRow(firstRow, firstId);
  }
}

async function loadAdminSession() {
  console.log("Fetching dashboard from", `${API_BASE}/api/admin/dashboard`);

  const res = await fetch(`${API_BASE}/api/admin/dashboard`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  let payload;
  try {
    payload = await res.json();
  } catch (err) {
    throw new Error(`Dashboard JSON parse failed (status ${res.status})`);
  }
  if (!res.ok || !payload.success || !payload.data) {
    const message = payload?.error?.message || `Dashboard failed (status ${res.status})`;
    throw new Error(message);
  }

  const user = payload.data.user || {};
  const labs = payload.data.labs || [];
  const summary = payload.data.summary || {};
  const equipments = payload.data.equipments || [];
  currentUser = user;
  currentLabs = labs;
  currentSummary = summary;
  currentEquipments = equipments;

  nameEl.textContent = user.name || "-";
  emailEl.textContent = user.email || "-";
  facultyIdEl.textContent = user.faculty_id || "-";
  departmentEl.textContent = user.department || "-";
  labsEl.textContent = labs.length ? labs.join(", ") : "-";
  // Persist first lab for cross-page lab dashboard fallback
  if (labs.length) {
    localStorage.setItem("managed_lab", labs[0]);
  }

  totalEquipmentsEl.textContent = String(summary.equipment_records ?? 0);
  availableEquipmentsEl.textContent = String(summary.available_records ?? 0);
  notAvailableEquipmentsEl.textContent = String(summary.not_available_records ?? 0);
  labsCountEl.textContent = String(summary.labs_count ?? 0);
  renderRows(equipments);
  const view = getViewFromUrl();
  setActiveView(view);
  showUtilityPanel(view === "reports" ? "dashboard" : view);
  messageEl.textContent = "";
}

[...topLinks, ...sideLinks].forEach(link => {
  link.addEventListener("click", event => {
    event.preventDefault();
    const view = link.dataset.view || "dashboard";
    if (view === "equipment-manage") {
      const storedId = localStorage.getItem("selected_equipment_id");
      window.location.href = storedId ? `/manage.html?id=${storedId}` : "/manage.html";
      return;
    }
    if (view === "equipment-logs") {
      const storedId = localStorage.getItem("selected_equipment_id");
      window.location.href = storedId ? `/logs.html?id=${storedId}` : "/logs.html";
      return;
    }
    if (view === "users") {
      window.location.href = "/manage-user.html";
      return;
    }
    window.location.href = `/admin.html?view=${encodeURIComponent(view)}`;
  });
});

logsCloseBtn.addEventListener("click", closeLogsPanel);

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("user_email");
  localStorage.removeItem("managed_lab");
  window.location.replace("/login.html");
});

if (backBtn) {
  backBtn.addEventListener("click", () => {
    // Go back if possible, otherwise take user to public homepage
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/index.html";
    }
  });
}

loadAdminSession().catch(err => {
  console.error("Dashboard load error:", err);
  messageEl.style.color = "#b42318";
  messageEl.textContent = err.message || "Unable to load dashboard";
  // Do NOT immediately clear the token or redirect; leave the error visible for debugging.
});
