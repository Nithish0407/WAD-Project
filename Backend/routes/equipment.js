const express = require("express");
const db = require("../db");
const { authenticate, ensureFacultyCanManageLab } = require("../middleware/auth");
const { validateEquipmentPayload } = require("../middleware/validate");
const { created, fail, ok } = require("../utils/response");
const { logAudit } = require("../utils/audit");
const { syncEquipmentToLabSchema, removeEquipmentFromLabSchema } = require("../utils/labSchemaSync");

const router = express.Router();

function getLabEquipment(req, res, next) {
  const lab = String(req.query.lab || "").trim();
  const status = String(req.query.status || "").trim();
  const search = String(req.query.search || "").trim();
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const offset = (page - 1) * limit;

  const where = [];
  const params = [];
  if (lab) {
    where.push("lab_name = ?");
    params.push(lab);
  }
  if (status) {
    where.push("status = ?");
    params.push(status);
  }
  if (search) {
    where.push("(equipment_name LIKE ? OR equipment_name_custom LIKE ? OR equipment_id LIKE ?)");
    params.push(`%${search}%`);
    params.push(`%${search}%`);
    params.push(`%${search}%`);
  }

  where.push("type = 'equipment'");
  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const query =
    `SELECT id, equipment_id, equipment_name_custom, equipment_count,
            CASE\n              WHEN available_quantity >= COALESCE(NULLIF(equipment_count,0), NULLIF(total_quantity,0), 1) THEN 'available'\n              ELSE 'not_available'\n            END AS lab_status,\n            lab_name, equipment_name, status, total_quantity, available_quantity, last_verified_at, verified_by, created_at, updated_at\n     FROM app_records ${whereClause}\n     ORDER BY lab_name, equipment_name\n     LIMIT ? OFFSET ?`;
  const countQuery = `SELECT COUNT(*) AS total FROM app_records ${whereClause}`;

  db.query(countQuery, params, (countErr, countRows) => {
    if (countErr) return next(countErr);
    db.query(query, [...params, limit, offset], (err, rows) => {
      if (err) return next(err);
      return ok(res, rows, { page, limit, total: countRows[0].total });
    });
  });
}

// Public read access so dashboards still work even if token issues occur.
router.get("/equipment", getLabEquipment);

// Public read access to single equipment
router.get("/equipment/:id", (req, res, next) => {
  const query =
    "SELECT *, CASE WHEN available_quantity >= COALESCE(NULLIF(equipment_count,0), NULLIF(total_quantity,0), 1) THEN 'available' ELSE 'not_available' END AS lab_status " +
    "FROM app_records WHERE type = 'equipment' AND id = ?";
  db.query(query, [req.params.id], (err, rows) => {
    if (err) return next(err);
    if (!rows || rows.length === 0) return fail(res, 404, "not found");
    return ok(res, rows[0]);
  });
});

router.post("/equipment", authenticate, validateEquipmentPayload, ensureFacultyCanManageLab, (req, res, next) => {
  const { lab_name, equipment_id, equipment_name, equipment_name_custom, equipment_count, status, total_quantity, available_quantity } = req.body;
  const resolvedName = equipment_name_custom || equipment_name;
  const resolvedCount = equipment_count !== undefined ? Number(equipment_count) : Number(total_quantity || 1);
  const total = Number(total_quantity || 1);
  const available = available_quantity === undefined ? total : Number(available_quantity);
  const required = resolvedCount > 0 ? resolvedCount : 1;
  const resolvedLabStatus = available >= required ? "available" : "not_available";

  const query =
    "INSERT INTO app_records (type, equipment_id, equipment_name_custom, equipment_count, lab_status, lab_name, equipment_name, status, total_quantity, available_quantity, last_verified_at, verified_by) VALUES ('equipment', ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)";

  db.query(
    query,
    [
      equipment_id || null,
      resolvedName,
      resolvedCount,
      resolvedLabStatus,
      lab_name,
      resolvedName,
      status || "available",
      total,
      available,
      req.user.id
    ],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") return fail(res, 409, "equipment already exists in this lab");
        return next(err);
      }

      logAudit({
        actorUserId: req.user.id,
        actorFacultyId: req.user.faculty_id,
        action: "equipment.create",
        entityType: "equipment",
        entityId: result.insertId,
        details: {
          equipment_id: equipment_id || null,
          equipment_name_custom: resolvedName,
          equipment_count: resolvedCount,
          lab_status: resolvedLabStatus,
          lab_name,
          status: status || "available",
          total_quantity: total,
          available_quantity: available
        }
      });
      syncEquipmentToLabSchema({
        equipment_id: equipment_id || null,
        equipment_name_custom: resolvedName,
        equipment_count: resolvedCount,
        lab_status: resolvedLabStatus,
        lab_name,
        equipment_name: resolvedName,
        status: status || "available",
        total_quantity: total,
        available_quantity: available
      }).catch(syncErr => console.error("Lab schema sync(create) failed:", syncErr.message));

      return created(res, {
        id: result.insertId,
        equipment_id: equipment_id || null,
        equipment_name_custom: resolvedName,
        equipment_count: resolvedCount,
        lab_status: resolvedLabStatus,
        lab_name,
        equipment_name: resolvedName,
        status: status || "available",
        total_quantity: total,
        available_quantity: available
      });
    }
  );
});

router.put("/equipment/:id", authenticate, validateEquipmentPayload, ensureFacultyCanManageLab, (req, res, next) => {
  const { id } = req.params;
  const { lab_name, equipment_id, equipment_name, equipment_name_custom, equipment_count, status, total_quantity, available_quantity } = req.body;
  const resolvedName = equipment_name_custom || equipment_name;
  const resolvedCount = equipment_count !== undefined ? Number(equipment_count) : Number(total_quantity || 1);
  const total = Number(total_quantity || 1);
  const available = available_quantity === undefined ? total : Number(available_quantity);
  const required = resolvedCount > 0 ? resolvedCount : 1;
  const resolvedLabStatus = available >= required ? "available" : "not_available";

  const query =
    "UPDATE app_records SET equipment_id = ?, equipment_name_custom = ?, equipment_count = ?, lab_status = ?, lab_name = ?, equipment_name = ?, status = ?, total_quantity = ?, available_quantity = ?, last_verified_at = NOW(), verified_by = ? WHERE type = 'equipment' AND id = ?";
  db.query(
    query,
    [equipment_id || null, resolvedName, resolvedCount, resolvedLabStatus, lab_name, resolvedName, status || "available", total, available, req.user.id, id],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") return fail(res, 409, "equipment already exists in this lab");
        return next(err);
      }
      if (result.affectedRows === 0) return fail(res, 404, "not found");

      logAudit({
        actorUserId: req.user.id,
        actorFacultyId: req.user.faculty_id,
        action: "equipment.update",
        entityType: "equipment",
        entityId: Number(id),
        details: {
          equipment_id: equipment_id || null,
          equipment_name_custom: resolvedName,
          equipment_count: resolvedCount,
          lab_status: resolvedLabStatus,
          lab_name,
          status: status || "available",
          total_quantity: total,
          available_quantity: available
        }
      });
      syncEquipmentToLabSchema({
        equipment_id: equipment_id || null,
        equipment_name_custom: resolvedName,
        equipment_count: resolvedCount,
        lab_status: resolvedLabStatus,
        lab_name,
        equipment_name: resolvedName,
        status: status || "available",
        total_quantity: total,
        available_quantity: available
      }).catch(syncErr => console.error("Lab schema sync(update) failed:", syncErr.message));

      return ok(res, {
        id: Number(id),
        equipment_id: equipment_id || null,
        equipment_name_custom: resolvedName,
        equipment_count: resolvedCount,
        lab_status: resolvedLabStatus,
        lab_name,
        equipment_name: resolvedName,
        status: status || "available",
        total_quantity: total,
        available_quantity: available
      });
    }
  );
});

router.put("/equipment/:id/availability", authenticate, (req, res, next) => {
  const { id } = req.params;
  const { status, available_quantity, reason } = req.body || {};
  if (!["available", "maintenance", "out_of_service"].includes(status)) {
    return fail(res, 400, "status is invalid");
  }
  if (!Number.isInteger(Number(available_quantity)) || Number(available_quantity) < 0) {
    return fail(res, 400, "available_quantity must be a non-negative integer");
  }

  const q = "SELECT * FROM app_records WHERE type = 'equipment' AND id = ?";
  db.query(q, [id], (err, rows) => {
    if (err) return next(err);
    if (!rows || rows.length === 0) return fail(res, 404, "not found");

    const current = rows[0];
    const { lab_name, total_quantity } = current;
    if (Number(available_quantity) > Number(total_quantity)) {
      return fail(res, 400, "available_quantity cannot exceed total_quantity");
    }

    const check = "SELECT 1 FROM app_records WHERE type = 'lab_map' AND ref_user_id = ? AND lab_name = ? LIMIT 1";
    db.query(check, [req.user.id, lab_name], (permErr, permRows) => {
      if (permErr) return next(permErr);
      if (!permRows || permRows.length === 0) return fail(res, 403, "No access to manage this lab");

      const required = Number(current.equipment_count || current.total_quantity || 1);
      const availNum = Number(available_quantity);
      const derivedLabStatus = availNum >= (required > 0 ? required : 1) ? "available" : "not_available";
      const update =
        "UPDATE app_records SET status = ?, available_quantity = ?, lab_status = ?, last_verified_at = NOW(), verified_by = ? WHERE type = 'equipment' AND id = ?";
      db.query(update, [status, Number(available_quantity), derivedLabStatus, req.user.id, id], updateErr => {
        if (updateErr) return next(updateErr);

        logAudit({
          actorUserId: req.user.id,
          actorFacultyId: req.user.faculty_id,
          action: "equipment.availability.update",
          entityType: "equipment",
          entityId: Number(id),
          details: { status, available_quantity: Number(available_quantity), reason: reason || null }
        });
        syncEquipmentToLabSchema({
          ...current,
          status,
          lab_status: derivedLabStatus,
          available_quantity: Number(available_quantity),
          total_quantity: Number(total_quantity),
          equipment_count: Number(current.equipment_count ?? total_quantity)
        }).catch(syncErr => console.error("Lab schema sync(availability) failed:", syncErr.message));

        return ok(res, { id: Number(id), status, available_quantity: Number(available_quantity) });
      });
    });
  });
});

router.delete("/equipment/:id", authenticate, (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return fail(res, 400, "invalid id");

  db.query("SELECT lab_name, equipment_id, equipment_name_custom, equipment_name FROM app_records WHERE type = 'equipment' AND id = ?", [id], (readErr, rows) => {
    if (readErr) return next(readErr);
    if (!rows || rows.length === 0) return fail(res, 404, "not found");

    const row = rows[0];
    const labName = row.lab_name;
    const perm = "SELECT 1 FROM app_records WHERE type = 'lab_map' AND ref_user_id = ? AND lab_name = ? LIMIT 1";
    db.query(perm, [req.user.id, labName], (permErr, permRows) => {
      if (permErr) return next(permErr);
      if (!permRows || permRows.length === 0) return fail(res, 403, "No access to manage this lab");

      db.query("DELETE FROM app_records WHERE type = 'equipment' AND id = ?", [id], (delErr, delRes) => {
        if (delErr) return next(delErr);
        if (delRes.affectedRows === 0) return fail(res, 404, "not found");

        logAudit({
          actorUserId: req.user.id,
          actorFacultyId: req.user.faculty_id,
          action: "equipment.delete",
          entityType: "equipment",
          entityId: id,
          details: { lab_name: labName }
        });
        removeEquipmentFromLabSchema(row).catch(syncErr => console.error("Lab schema sync(delete) failed:", syncErr.message));

        return ok(res, { id, deleted: true });
      });
    });
  });
});

router.post("/labs/assign", authenticate, (req, res, next) => {
  const { user_id, lab_name } = req.body || {};
  if (!user_id || !lab_name) return fail(res, 400, "user_id and lab_name are required");
  if (Number(user_id) !== Number(req.user.id)) return fail(res, 403, "you can only assign labs to your own account");

  const query = "INSERT INTO app_records (type, ref_user_id, lab_name) VALUES ('lab_map', ?, ?)";
  db.query(query, [user_id, lab_name], (err, result) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") return fail(res, 409, "already assigned");
      return next(err);
    }

    logAudit({
      actorUserId: req.user.id,
      actorFacultyId: req.user.faculty_id,
      action: "faculty.lab.assign",
      entityType: "faculty_labs",
      entityId: result.insertId,
      details: { user_id: Number(user_id), lab_name }
    });

    return created(res, { id: result.insertId, user_id: Number(user_id), lab_name });
  });
});

module.exports = router;
module.exports.getLabEquipment = getLabEquipment;
