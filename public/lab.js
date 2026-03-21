function bootstrapLabPage() {
  // prevent double init
  if (window.__labPageInitialized) return;
  window.__labPageInitialized = true;

  const API_BASE = window.API_BASE || window.location.origin;
  const token = localStorage.getItem("auth_token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  const params = new URLSearchParams(window.location.search);
  let lab = (params.get("lab") || "").trim();
  if (!lab) {
    // Fallback to previously selected/managed lab from admin or signup
    const storedLab = localStorage.getItem("managed_lab");
    if (storedLab) {
      lab = storedLab;
      const newUrl = `${window.location.pathname}?lab=${encodeURIComponent(lab)}`;
      window.history.replaceState({}, "", newUrl);
    }
  }

  const headerTitle = document.getElementById("lab-header-title");
  const resultsTitle = document.getElementById("lab-results-title");
  const resultsStatus = document.getElementById("lab-results-status");
  const resultsBody = document.getElementById("lab-results-body");
  const statTotalEquipment = document.getElementById("stat-total-equipment");
  const statTotalUnits = document.getElementById("stat-total-units");
  const statAvailableUnits = document.getElementById("stat-available-units");
  const statUnavailableUnits = document.getElementById("stat-unavailable-units");
  const backBtn = document.getElementById("back-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const equipmentForm = document.getElementById("equipment-form");
  const formTitle = document.getElementById("form-title");
  const equipmentIdInput = document.getElementById("equipment-id-input");
  const equipmentNameInput = document.getElementById("equipment-name-input");
  const equipmentCountInput = document.getElementById("equipment-count-input");
  const labStatusInput = document.getElementById("lab-status-input");
  const cancelEditBtn = document.getElementById("cancel-edit-btn");
  const EQUIPMENT_SYNC_KEY = "equipment_last_updated_at";
  if (!resultsBody || !equipmentForm) {
    const msg = "Page not fully loaded. Please refresh.";
    console.error(msg);
    alert(msg);
    return;
  }

  let editingEquipmentId = null;

  function resetDashboard() {
    statTotalEquipment.textContent = "0";
    statTotalUnits.textContent = "0";
    statAvailableUnits.textContent = "0";
    statUnavailableUnits.textContent = "0";
    resultsBody.innerHTML = "";
  }

  function renderDashboard(data) {
    console.log("renderDashboard items:", data.length);
    const totalEquipment = data.length;
    const totalUnits = data.reduce((sum, item) => sum + Number(item.equipment_count || 0), 0);
    const readyForExamUnits = data.reduce((sum, item) => {
      const availableRaw =
        item.available_quantity !== undefined
          ? item.available_quantity
          : item.lab_status === "available"
          ? item.equipment_count
          : 0;
      const available = Number(availableRaw || 0);
      return sum + (Number.isFinite(available) ? available : 0);
    }, 0);
    const notReadyForExamUnits = Math.max(totalUnits - readyForExamUnits, 0);

    statTotalEquipment.textContent = String(totalEquipment);
    statTotalUnits.textContent = String(totalUnits);
    statAvailableUnits.textContent = String(readyForExamUnits);
    statUnavailableUnits.textContent = String(notReadyForExamUnits);

    resultsBody.innerHTML = "";
    data.forEach(item => {
      const row = document.createElement("tr");
      const equipmentId = item.equipment_id || "-";
      const name = item.equipment_name_custom || item.equipment_name || "Unnamed Equipment";
      const labName = item.lab_name || lab || "-";
      const count = Number(item.equipment_count || 0);
      const labStatus = item.lab_status || "not_available";
      const workingCondition = item.status || labStatus || "unknown";
      const availableUnitsRaw =
        item.available_quantity !== undefined
          ? item.available_quantity
          : labStatus === "available"
          ? count
          : 0;
      const availableUnits = Number(availableUnitsRaw || 0);
      row.innerHTML = `<td>${equipmentId}</td><td>${labName}</td><td>${name}</td><td>${availableUnits}</td><td>${workingCondition}</td>`;
      row.addEventListener("click", () => {
        editingEquipmentId = item.id;
        formTitle.textContent = "Edit Equipment";
        equipmentIdInput.value = item.equipment_id || "";
        equipmentNameInput.value = item.equipment_name_custom || item.equipment_name || "";
        equipmentCountInput.value = String(count);
        labStatusInput.value = labStatus;
      });
      resultsBody.appendChild(row);
    });
  }

  function resetForm() {
    editingEquipmentId = null;
    formTitle.textContent = "Add Equipment";
    equipmentIdInput.value = "";
    equipmentNameInput.value = "";
    equipmentCountInput.value = "1";
    labStatusInput.value = "available";
  }

  async function loadLabEquipment() {
    resultsStatus.textContent = `Loading from ${API_BASE}...`;
    resetDashboard();

    try {
    const qs = lab ? `?lab=${encodeURIComponent(lab)}` : "";
    const response = await fetch(`${API_BASE}/api/equipment${qs}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const text = await response.text();
      let payload;
      try {
        payload = text ? JSON.parse(text) : {};
      } catch (e) {
        throw new Error(`Invalid JSON from API: ${text}`);
      }

      if (!response.ok || !payload.success) {
        const message = payload?.error?.message || `Request failed: ${response.status}`;
        throw new Error(message);
      }

      const data = Array.isArray(payload.data) ? payload.data : [];
      if (data.length === 0) {
        resultsStatus.textContent = "No equipment found.";
        return;
      }

      resultsStatus.textContent = `Found ${data.length} item(s)${lab ? ` for ${lab}` : ""}.`;
      renderDashboard(data);
    } catch (err) {
      console.error("loadLabEquipment error:", err);
      resultsStatus.textContent = err.message || "Failed to load equipment.";
      resetDashboard();
    }
  }

  headerTitle.textContent = lab ? `${lab} Lab Dashboard` : "All Labs Dashboard";
  resultsTitle.textContent = lab ? `${lab} Lab Equipment` : "All Lab Equipment";
  console.log("Lab dashboard boot", { lab, API_BASE, tokenPresent: !!token });

  backBtn.addEventListener("click", () => {
    window.location.href = "index.html";
  });

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_email");
    localStorage.removeItem("managed_lab");
    window.location.href = "login.html";
  });

  // Hide/disable add/edit form on this page
  if (equipmentForm) {
    equipmentForm.style.display = "none";
    equipmentForm.addEventListener("submit", e => e.preventDefault());
  }

  // Refresh when another page (e.g., admin/manage) updates equipment.
  window.addEventListener("storage", event => {
    if (event.key === EQUIPMENT_SYNC_KEY) {
      loadLabEquipment();
    }
  });

  // Refresh when the tab regains focus to ensure latest DB state.
  window.addEventListener("focus", loadLabEquipment);

  loadLabEquipment();
  resetForm();
}

// Run immediately and also on DOMContentLoaded (in case the event already fired)
bootstrapLabPage();
document.addEventListener("DOMContentLoaded", bootstrapLabPage);
