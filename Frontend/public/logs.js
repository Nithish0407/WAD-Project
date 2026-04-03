const API_BASE = window.API_BASE || window.location.origin;
const token = localStorage.getItem("auth_token");

if (!token) {
  window.location.replace("/login.html");
}

const params = new URLSearchParams(window.location.search);
const queryId = Number(params.get("id"));
const equipmentId = Number.isInteger(queryId) && queryId > 0
  ? queryId
  : (() => {
      const stored = Number(localStorage.getItem("selected_equipment_id"));
      return Number.isInteger(stored) && stored > 0 ? stored : NaN;
    })();

const messageEl = document.getElementById("logs-message");
const metaEl = document.getElementById("logs-meta");
const tableBody = document.getElementById("logs-table-body");
const logoutBtn = document.getElementById("logout-btn");

function safeStatus(details) {
  try {
    const d = typeof details === "string" ? JSON.parse(details) : details;
    if (d && (d.lab_status || d.status)) {
      const labStatus = d.lab_status ? `Lab: ${d.lab_status}` : "";
      const equipStatus = d.status ? `Status: ${d.status}` : "";
      return [labStatus, equipStatus].filter(Boolean).join(" | ") || "-";
    }
  } catch (_) {
    return "-";
  }
  return "-";
}

function renderLogs(logs) {
  if (!logs.length) {
    tableBody.innerHTML = "<tr><td colspan='5'>No logs found</td></tr>";
    return;
  }
  tableBody.innerHTML = "";
  logs.forEach(log => {
    let available = "-";
    let qty = "-";
    try {
      const d = typeof log.details === "string" ? JSON.parse(log.details) : log.details;
      if (d && typeof d === "object") {
        if (d.available_quantity !== undefined) available = d.available_quantity;
        if (d.total_quantity !== undefined) qty = d.total_quantity;
        if (d.equipment_count !== undefined) qty = d.equipment_count;
      }
    } catch (_) {
      available = "-";
      qty = "-";
    }

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${new Date(log.created_at).toLocaleDateString()}</td>
      <td>${log.action || "-"}</td>
      <td>${safeStatus(log.details)}</td>
      <td>${log.actor_faculty_id || "-"}</td>
      <td>Available: ${available} | Quantity: ${qty}</td>
    `;
    tableBody.appendChild(row);
  });
}

async function loadPage() {
  if (!equipmentId) {
    messageEl.textContent = "Missing equipment id";
    tableBody.innerHTML = "<tr><td colspan='5'>Missing equipment id</td></tr>";
    return;
  }

  try {
    const [equipmentRes, logsRes] = await Promise.all([
      fetch(`${API_BASE}/api/equipment/${equipmentId}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_BASE}/api/admin/equipment/${equipmentId}/logs`, { headers: { Authorization: `Bearer ${token}` } })
    ]);

    const equipmentPayload = await equipmentRes.json();
    const logsPayload = await logsRes.json();

    if (!equipmentRes.ok || !equipmentPayload.success) {
      throw new Error(equipmentPayload?.error?.message || "Unable to load equipment");
    }
    if (!logsRes.ok || !logsPayload.success) {
      throw new Error(logsPayload?.error?.message || "Unable to load logs");
    }

    const eq = equipmentPayload.data || {};
    const logs = logsPayload.data?.logs || [];
    const statusChanges = logs.filter(log => {
      try {
        const d = typeof log.details === "string" ? JSON.parse(log.details) : log.details;
        return d && (d.lab_status || d.status);
      } catch {
        return false;
      }
    }).length;

    metaEl.textContent = `Equipment: ${eq.equipment_name_custom || eq.equipment_name || "Unknown"} | Lab: ${eq.lab_name || "-"} | Status changes: ${statusChanges} | Total logs: ${logs.length}`;
    messageEl.textContent = "";
    renderLogs(logs);
  } catch (err) {
    messageEl.style.color = "#b42318";
    messageEl.textContent = err.message || "Unable to load logs";
    tableBody.innerHTML = "<tr><td colspan='5'>Failed to load logs</td></tr>";
  }
}

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("user_email");
  localStorage.removeItem("managed_lab");
  window.location.replace("/login.html");
});

loadPage();
