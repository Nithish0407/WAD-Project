const jwt = require("jsonwebtoken");
const db = require("../Backend/db");
const { fail } = require("../utils/response");

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return fail(res, 401, "Unauthorized");
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return fail(res, 401, "Invalid token");
  }

  const query = "SELECT id, faculty_id, department, email, name, user_status AS status FROM app_records WHERE type = 'user' AND id = ?";
  return db.query(query, [payload.id], (err, rows) => {
    if (err) return next(err);
    if (!rows || rows.length === 0) return fail(res, 401, "Unauthorized");
    if (rows[0].status !== "active") return fail(res, 403, "Account is inactive");

    req.user = rows[0];
    return next();
  });
}

function ensureFacultyCanManageLab(req, res, next) {
  const labName = (req.body.lab_name || req.query.lab_name || "").trim();
  if (!labName) return fail(res, 400, "lab_name is required");

  const query = "SELECT 1 FROM app_records WHERE type = 'lab_map' AND ref_user_id = ? AND lab_name = ? LIMIT 1";
  return db.query(query, [req.user.id, labName], (err, rows) => {
    if (err) return next(err);
    if (!rows || rows.length === 0) return fail(res, 403, "No access to manage this lab");
    req.managedLab = labName;
    return next();
  });
}

module.exports = { authenticate, ensureFacultyCanManageLab };
