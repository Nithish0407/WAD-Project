const API_BASE = window.API_BASE || window.location.origin;
const token = localStorage.getItem("auth_token");

if (!token) {
  window.location.replace("/login.html");
}

const pageMessageEl = document.getElementById("manage-page-message");
const manageForm = document.getElementById("manage-form");
const manageMessageEl = document.getElementById("manage-message");
const manageCancelBtn = document.getElementById("manage-cancel-btn");
const logoutBtn = document.getElementById("logout-btn");

const manageRowIdEl = document.getElementById("manage-equipment-row-id");
const manageEquipmentIdEl = document.getElementById("manage-equipment-id");
const manageLabNameEl = document.getElementById("manage-lab-name");
const manageEquipmentNameEl = document.getElementById("manage-equipment-name");
const manageCategoryEl = document.getElementById("manage-category");
const manageQuantityEl = document.getElementById("manage-quantity");
const manageAvailableEl = document.getElementById("manage-available");
const manageLabStatusEl = document.getElementById("manage-lab-status");
const availableIncBtn = document.getElementById("available-increment");
const availableDecBtn = document.getElementById("available-decrement");

function getEquipmentIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const qsId = Number(params.get("id"));
  if (Number.isInteger(qsId) && qsId > 0) return qsId;
  const stored = Number(localStorage.getItem("selected_equipment_id"));
  return Number.isInteger(stored) && stored > 0 ? stored : NaN;
}

function fillForm(item) {
  manageRowIdEl.value = String(item.id);
  manageEquipmentIdEl.value = item.equipment_id || "";
  manageLabNameEl.value = item.lab_name || "";
  manageEquipmentNameEl.value = item.equipment_name_custom || item.equipment_name || "";
  const qty = Number(item.equipment_count || item.total_quantity || 0);
  const available = Number(item.available_quantity || 0);
  manageQuantityEl.value = String(qty);
  manageAvailableEl.value = String(available);
  const status = ["available", "maintenance", "out_of_service"].includes(item.status) ? item.status : "available";
  const labStatus = ["available", "not_available"].includes(item.lab_status) ? item.lab_status : "available";
  manageCategoryEl.value = status;
  manageLabStatusEl.value = labStatus;
}

async function loadEquipment() {
  const id = getEquipmentIdFromUrl();
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid equipment id");
  }

  const res = await fetch(`${API_BASE}/api/equipment/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const payload = await res.json();
  if (!res.ok || !payload.success || !payload.data) {
    throw new Error(payload?.error?.message || "Unable to load equipment");
  }
  fillForm(payload.data);
}

manageForm.addEventListener("submit", async event => {
  event.preventDefault();
  const id = Number(manageRowIdEl.value);
  let qty = Number(manageQuantityEl.value);
  let available = Number(manageAvailableEl.value);

  if (!Number.isInteger(qty) || qty < 0) {
    manageMessageEl.style.color = "#b42318";
    manageMessageEl.textContent = "Quantity must be a non-negative integer.";
    return;
  }
  if (!Number.isInteger(available) || available < 0) {
    manageMessageEl.style.color = "#b42318";
    manageMessageEl.textContent = "Available Units must be a non-negative integer.";
    return;
  }

  // Respect administrator selections for status values.
  const selectedStatus = manageCategoryEl.value || "available";
  const selectedLabStatus = manageLabStatusEl.value || "available";

  const body = {
    lab_name: manageLabNameEl.value.trim(),
    equipment_id: manageEquipmentIdEl.value.trim() || null,
    equipment_name_custom: manageEquipmentNameEl.value.trim(),
    equipment_count: qty,
    lab_status: selectedLabStatus,
    status: selectedStatus,
    total_quantity: qty,
    available_quantity: available
  };

  try {
    const res = await fetch(`${API_BASE}/api/equipment/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });
    const payload = await res.json();
    if (!res.ok || !payload.success) {
      throw new Error(payload?.error?.message || "Unable to update equipment");
    }
    // Mark equipment data as updated so other tabs (e.g., lab dashboards) refresh.
    localStorage.setItem("equipment_last_updated_at", String(Date.now()));
    manageMessageEl.style.color = "#067647";
    manageMessageEl.textContent = "Equipment updated successfully. Redirecting...";
    setTimeout(() => {
      window.location.href = "/admin.html";
    }, 900);
  } catch (err) {
    manageMessageEl.style.color = "#b42318";
    manageMessageEl.textContent = err.message || "Update failed.";
  }
});

manageCancelBtn.addEventListener("click", () => {
  window.location.href = "/admin.html";
});

function clampAvailable() {
  let available = Number(manageAvailableEl.value);
  if (!Number.isFinite(available) || available < 0) available = 0;
  manageAvailableEl.value = String(available);
}

availableIncBtn.addEventListener("click", () => {
  clampAvailable();
  manageAvailableEl.value = String(Number(manageAvailableEl.value) + 1);
});

availableDecBtn.addEventListener("click", () => {
  clampAvailable();
  manageAvailableEl.value = String(Math.max(0, Number(manageAvailableEl.value) - 1));
});

manageAvailableEl.addEventListener("input", clampAvailable);

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("user_email");
  localStorage.removeItem("managed_lab");
  window.location.replace("/login.html");
});

loadEquipment().catch(err => {
  pageMessageEl.style.color = "#b42318";
  pageMessageEl.textContent = err.message || "Unable to load page";
});
