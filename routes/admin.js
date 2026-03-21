const express = require("express");
const db = require("../db");
const { authenticate } = require("../middleware/auth");
const { fail, ok } = require("../utils/response");

const router = express.Router();

router.get("/admin/user/activity", authenticate, (req, res, next) => {
  const userId = req.user.id;
  const loginQuery = "SELECT COUNT(*) AS logins FROM audit_logs WHERE action = 'auth.login' AND actor_user_id = ?";
  const equipmentQuery =
    "SELECT COUNT(*) AS equipment_actions FROM audit_logs WHERE actor_user_id = ? AND entity_type = 'equipment'";
  const latestLoginQuery =
    "SELECT created_at FROM audit_logs WHERE action = 'auth.login' AND actor_user_id = ? ORDER BY created_at DESC LIMIT 1";

  db.query(loginQuery, [userId], (loginErr, loginRows) => {
    if (loginErr) return next(loginErr);
    db.query(equipmentQuery, [userId], (eqErr, eqRows) => {
      if (eqErr) return next(eqErr);
      db.query(latestLoginQuery, [userId], (latestErr, latestRows) => {
        if (latestErr) return next(latestErr);

        const logins = loginRows?.[0]?.logins || 0;
        const equipmentActions = eqRows?.[0]?.equipment_actions || 0;
        const latestLogin = latestRows?.[0]?.created_at || null;

        return ok(res, {
          user: req.user,
          activity: {
            logins,
            equipment_actions: equipmentActions,
            latest_login_at: latestLogin
          }
        });
      });
    });
  });
});

router.get("/admin/dashboard", authenticate, (req, res, next) => {
  const labsQuery = "SELECT lab_name FROM faculty_labs WHERE faculty_id = ? ORDER BY lab_name";
  db.query(labsQuery, [req.user.id], (labsErr, labRows) => {
    if (labsErr) return next(labsErr);

    const labs = (labRows || []).map(r => r.lab_name);
    if (labs.length === 0) {
      return ok(res, {
        user: req.user,
        labs: [],
        summary: {
          labs_count: 0,
          equipment_records: 0,
          equipment_total_count: 0,
          available_records: 0,
          not_available_records: 0
        },
        equipments: []
      });
    }

    const placeholders = labs.map(() => "?").join(", ");
    const equipmentQuery =
      `SELECT id, equipment_id, equipment_name_custom, equipment_name, equipment_count, lab_status, lab_name, status,
              total_quantity, available_quantity, updated_at
       FROM equipment
       WHERE lab_name IN (${placeholders})
       ORDER BY updated_at DESC
       LIMIT 500`;

    db.query(equipmentQuery, labs, (eqErr, eqRows) => {
      if (eqErr) return next(eqErr);

      const equipments = eqRows || [];
      const equipmentTotalCount = equipments.reduce((sum, row) => sum + Number(row.equipment_count || row.total_quantity || 0), 0);
      const availableRecords = equipments.filter(row => row.lab_status === "available").length;
      const notAvailableRecords = equipments.filter(row => row.lab_status === "not_available").length;

      return ok(res, {
        user: req.user,
        labs,
        summary: {
          labs_count: labs.length,
          equipment_records: equipments.length,
          equipment_total_count: equipmentTotalCount,
          available_records: availableRecords,
          not_available_records: notAvailableRecords
        },
        equipments
      });
    });
  });
});

router.get("/admin/equipment/:id/logs", authenticate, (req, res, next) => {
  const equipmentId = Number(req.params.id);
  if (!Number.isInteger(equipmentId) || equipmentId <= 0) {
    return fail(res, 400, "invalid equipment id");
  }

  const equipmentQuery = "SELECT id, lab_name FROM equipment WHERE id = ? LIMIT 1";
  db.query(equipmentQuery, [equipmentId], (eqErr, eqRows) => {
    if (eqErr) return next(eqErr);
    if (!eqRows || eqRows.length === 0) return fail(res, 404, "equipment not found");

    const labName = eqRows[0].lab_name;
    const accessQuery = "SELECT 1 FROM faculty_labs WHERE faculty_id = ? AND lab_name = ? LIMIT 1";
    db.query(accessQuery, [req.user.id, labName], (permErr, permRows) => {
      if (permErr) return next(permErr);
      if (!permRows || permRows.length === 0) return fail(res, 403, "No access to this equipment");

      const logsQuery =
        "SELECT id, action, actor_faculty_id, details, created_at " +
        "FROM audit_logs WHERE entity_type = 'equipment' AND entity_id = ? " +
        "ORDER BY created_at DESC";
      db.query(logsQuery, [equipmentId], (logErr, logRows) => {
        if (logErr) return next(logErr);
        return ok(res, { equipment_id: equipmentId, lab_name: labName, logs: logRows || [] });
      });
    });
  });
});

module.exports = router;
