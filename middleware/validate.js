const { fail } = require("../utils/response");

function isEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateRegister(req, res, next) {
  const { name, faculty_id, department, email, password } = req.body || {};
  if (!name || !faculty_id || !department || !email || !password) {
    return fail(res, 400, "name, faculty_id, department, email, password are required");
  }
  if (!/^[A-Za-z0-9_-]{3,30}$/.test(String(faculty_id))) {
    return fail(res, 400, "faculty_id format is invalid");
  }
  if (!isEmail(email)) {
    return fail(res, 400, "email format is invalid");
  }
  if (String(department).trim().length < 2) {
    return fail(res, 400, "department is invalid");
  }
  if (String(password).length < 6) {
    return fail(res, 400, "password must be at least 6 characters");
  }
  return next();
}

function validateLogin(req, res, next) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return fail(res, 400, "email and password are required");
  }
  if (!isEmail(email)) {
    return fail(res, 400, "email format is invalid");
  }
  return next();
}

function validateEquipmentPayload(req, res, next) {
  const {
    lab_name,
    equipment_name,
    equipment_name_custom,
    equipment_id,
    equipment_count,
    lab_status,
    status,
    total_quantity,
    available_quantity
  } = req.body || {};
  const allowedStatus = ["available", "maintenance", "out_of_service"];
  const allowedLabStatus = ["available", "not_available"];

  if (!lab_name) {
    return fail(res, 400, "lab_name is required");
  }
  if (!equipment_name && !equipment_name_custom) {
    return fail(res, 400, "equipment_name or equipment_name_custom is required");
  }
  if (equipment_id !== undefined && String(equipment_id).trim() === "") {
    return fail(res, 400, "equipment_id cannot be empty");
  }
  if (lab_status && !allowedLabStatus.includes(lab_status)) {
    return fail(res, 400, "lab_status is invalid");
  }
  if (equipment_count !== undefined && (!Number.isInteger(Number(equipment_count)) || Number(equipment_count) < 0)) {
    return fail(res, 400, "equipment_count must be a non-negative integer");
  }
  if (status && !allowedStatus.includes(status)) {
    return fail(res, 400, "status is invalid");
  }
  if (total_quantity !== undefined && (!Number.isInteger(Number(total_quantity)) || Number(total_quantity) < 0)) {
    return fail(res, 400, "total_quantity must be a non-negative integer");
  }
  if (
    available_quantity !== undefined &&
    (!Number.isInteger(Number(available_quantity)) || Number(available_quantity) < 0)
  ) {
    return fail(res, 400, "available_quantity must be a non-negative integer");
  }
  if (
    total_quantity !== undefined &&
    available_quantity !== undefined &&
    Number(available_quantity) > Number(total_quantity)
  ) {
    // Previously enforced; now allow overruns per updated requirements.
  }
  return next();
}

function validateReservationPayload(req, res, next) {
  const { equipment_id, quantity, start_at, end_at } = req.body || {};
  if (!equipment_id || !start_at || !end_at) {
    return fail(res, 400, "equipment_id, start_at, end_at are required");
  }
  const qty = Number(quantity || 1);
  if (!Number.isInteger(qty) || qty <= 0) {
    return fail(res, 400, "quantity must be a positive integer");
  }
  if (new Date(start_at).toString() === "Invalid Date" || new Date(end_at).toString() === "Invalid Date") {
    return fail(res, 400, "start_at and end_at must be valid datetimes");
  }
  if (new Date(start_at) >= new Date(end_at)) {
    return fail(res, 400, "end_at must be after start_at");
  }
  return next();
}

module.exports = {
  validateRegister,
  validateLogin,
  validateEquipmentPayload,
  validateReservationPayload
};
