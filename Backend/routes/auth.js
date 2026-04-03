const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { authenticate } = require("../../middleware/auth");
const { validateLogin, validateRegister } = require("../../middleware/validate");
const { created, fail, ok } = require("../utils/response");
const { logAudit } = require("../utils/audit");

const router = express.Router();

function isAllowedDomain(email) {
  const domain = (email || "").split("@")[1] || "";
  return domain.toLowerCase() === "bvrit.ac.in";
}

router.post("/auth/register", validateRegister, (req, res, next) => {
  const { name, faculty_id, department, email, password } = req.body;

  if (!isAllowedDomain(email)) {
    return fail(res, 403, "email domain not allowed");
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const query =
    "INSERT INTO app_records (type, name, faculty_id, department, email, password_hash, user_status) VALUES ('user', ?, ?, ?, ?, ?, 'active')";
  return db.query(query, [name, faculty_id, department, email, passwordHash], (err, result) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") return fail(res, 409, "faculty_id or email already exists");
      return next(err);
    }

    logAudit({
      actorUserId: result.insertId,
      actorFacultyId: faculty_id,
      action: "auth.register",
      entityType: "user",
      entityId: result.insertId,
      details: { email }
    });

    return created(res, { id: result.insertId, name, faculty_id, department, email, status: "active" });
  });
});

router.post("/auth/login", validateLogin, (req, res, next) => {
  const { email, password } = req.body;

  if (!isAllowedDomain(email)) {
    return fail(res, 403, "email domain not allowed");
  }

  const query =
    "SELECT id, name, faculty_id, department, email, password_hash, user_status AS status FROM app_records WHERE type = 'user' AND email = ?";
  return db.query(query, [email], (err, results) => {
    if (err) return next(err);
    if (!results || results.length === 0) return fail(res, 401, "invalid credentials");

    const user = results[0];
    if (user.status !== "active") return fail(res, 403, "account is inactive");

    const okPassword = bcrypt.compareSync(password, user.password_hash);
    if (!okPassword) return fail(res, 401, "invalid credentials");

    const token = jwt.sign(
      {
        id: user.id,
        faculty_id: user.faculty_id,
        department: user.department,
        email: user.email,
        name: user.name
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "2h" }
    );

    logAudit({
      actorUserId: user.id,
      actorFacultyId: user.faculty_id,
      action: "auth.login",
      entityType: "user",
      entityId: user.id,
      details: {}
    });

    return ok(res, { token });
  });
});

router.get("/auth/me", authenticate, (req, res, next) => {
  const q = "SELECT lab_name FROM app_records WHERE type = 'lab_map' AND ref_user_id = ? ORDER BY lab_name";
  return db.query(q, [req.user.id], (err, rows) => {
    if (err) return next(err);
    const labs = (rows || []).map(r => r.lab_name);
    return ok(res, { user: req.user, labs });
  });
});

router.patch("/auth/status/:userId", authenticate, (req, res, next) => {
  const { userId } = req.params;
  const { status } = req.body || {};
  if (!["active", "inactive"].includes(status)) return fail(res, 400, "status must be active or inactive");
  if (Number(userId) !== Number(req.user.id)) return fail(res, 403, "you can only change your own status");

  const q = "UPDATE app_records SET user_status = ? WHERE type = 'user' AND id = ?";
  return db.query(q, [status, userId], (err, r) => {
    if (err) return next(err);
    if (r.affectedRows === 0) return fail(res, 404, "user not found");

    logAudit({
      actorUserId: req.user.id,
      actorFacultyId: req.user.faculty_id,
      action: "user.status.change",
      entityType: "user",
      entityId: Number(userId),
      details: { status }
    });

    return ok(res, { id: Number(userId), status });
  });
});

module.exports = router;
