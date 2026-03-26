const express = require("express");
const db = require("../db");
const { authenticate } = require("../middleware/auth");
const { validateReservationPayload } = require("../middleware/validate");
const { created, fail, ok } = require("../utils/response");
const { logAudit } = require("../utils/audit");

const router = express.Router();

router.post("/reservations", authenticate, validateReservationPayload, (req, res, next) => {
  const { equipment_id, quantity, start_at, end_at } = req.body;
  const qty = Number(quantity || 1);

  const q =
    "INSERT INTO app_records (type, ref_user_id, ref_equipment_id, res_quantity, status, start_at, end_at) VALUES ('reservation', ?, ?, ?, 'pending', ?, ?)";
  db.query(q, [req.user.id, equipment_id, qty, start_at, end_at], (err, result) => {
    if (err) return next(err);

    logAudit({
      actorUserId: req.user.id,
      actorFacultyId: req.user.faculty_id,
      action: "reservation.create",
      entityType: "reservation",
      entityId: result.insertId,
      details: { equipment_id: Number(equipment_id), quantity: qty, start_at, end_at }
    });

    return created(res, {
      id: result.insertId,
      user_id: req.user.id,
      equipment_id: Number(equipment_id),
      quantity: qty,
      status: "pending",
      start_at,
      end_at
    });
  });
});

router.get("/reservations", authenticate, (req, res, next) => {
  const status = String(req.query.status || "").trim();
  const where = [];
  const params = [];
  if (status) {
    where.push("r.status = ?");
    params.push(status);
  }
  where.push("r.type = 'reservation'");
  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const q =
    "SELECT r.id, r.status, r.res_quantity AS quantity, r.ref_equipment_id AS equipment_id, r.ref_user_id AS user_id, r.start_at, r.end_at, e.equipment_name, e.lab_name, u.name AS user_name, u.faculty_id " +
    "FROM app_records r " +
    "JOIN app_records e ON e.type = 'equipment' AND r.ref_equipment_id = e.id " +
    "JOIN app_records u ON u.type = 'user' AND r.ref_user_id = u.id " +
    `${whereClause} ORDER BY r.id DESC`;

  db.query(q, params, (err, rows) => {
    if (err) return next(err);
    return ok(res, rows);
  });
});

router.get("/reservations/me", authenticate, (req, res, next) => {
  const q =
    "SELECT r.id, r.status, r.res_quantity AS quantity, r.ref_equipment_id AS equipment_id, r.start_at, r.end_at, e.equipment_name, e.lab_name " +
    "FROM app_records r " +
    "JOIN app_records e ON e.type = 'equipment' AND r.ref_equipment_id = e.id " +
    "WHERE r.type = 'reservation' AND r.ref_user_id = ? ORDER BY r.id DESC";
  db.query(q, [req.user.id], (err, rows) => {
    if (err) return next(err);
    return ok(res, rows);
  });
});

function updateReservationStatus(targetStatus) {
  return (req, res, next) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return fail(res, 400, "invalid reservation id");

    const findQuery =
      "SELECT r.id, r.status, r.res_quantity AS quantity, r.ref_equipment_id AS equipment_id, e.lab_name, e.available_quantity, e.total_quantity " +
      "FROM app_records r JOIN app_records e ON r.ref_equipment_id = e.id AND e.type = 'equipment' WHERE r.type = 'reservation' AND r.id = ?";

    db.query(findQuery, [id], (findErr, rows) => {
      if (findErr) return next(findErr);
      if (!rows || rows.length === 0) return fail(res, 404, "not found");

      const reservation = rows[0];
      const permQuery = "SELECT 1 FROM app_records WHERE type = 'lab_map' AND ref_user_id = ? AND lab_name = ? LIMIT 1";
      db.query(permQuery, [req.user.id, reservation.lab_name], (permErr, permRows) => {
        if (permErr) return next(permErr);
        if (!permRows || permRows.length === 0) return fail(res, 403, "No access to manage this lab");

        if (reservation.status !== "pending") {
          return fail(res, 400, "Only pending reservations can be updated");
        }

        if (targetStatus === "approved" && reservation.available_quantity < reservation.quantity) {
          return fail(res, 400, "Insufficient available quantity");
        }

        db.beginTransaction(txErr => {
          if (txErr) return next(txErr);

          const updateReservation = "UPDATE app_records SET status = ? WHERE type = 'reservation' AND id = ?";
          db.query(updateReservation, [targetStatus, id], (upErr) => {
            if (upErr) {
              return db.rollback(() => next(upErr));
            }

            const finalize = () => {
              db.commit(commitErr => {
                if (commitErr) return db.rollback(() => next(commitErr));

                logAudit({
                  actorUserId: req.user.id,
                  actorFacultyId: req.user.faculty_id,
                  action: `reservation.${targetStatus}`,
                  entityType: "reservation",
                  entityId: id,
                  details: { equipment_id: reservation.equipment_id, quantity: reservation.quantity }
                });

                return ok(res, { id, status: targetStatus });
              });
            };

            if (targetStatus === "approved") {
              const updateEquipment =
                "UPDATE app_records SET available_quantity = available_quantity - ? WHERE type = 'equipment' AND id = ? AND available_quantity >= ?";
              db.query(updateEquipment, [reservation.quantity, reservation.equipment_id, reservation.quantity], (eqErr, eqRes) => {
                if (eqErr) return db.rollback(() => next(eqErr));
                if (!eqRes || eqRes.affectedRows === 0) {
                  return db.rollback(() => fail(res, 400, "Insufficient available quantity"));
                }
                return finalize();
              });
            } else {
              return finalize();
            }
          });
        });
      });
    });
  };
}

router.put("/reservations/:id/approve", authenticate, updateReservationStatus("approved"));
router.put("/reservations/:id/reject", authenticate, updateReservationStatus("rejected"));

router.put("/reservations/:id/cancel", authenticate, (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return fail(res, 400, "invalid reservation id");

  const q =
    "UPDATE app_records SET status = 'cancelled' WHERE type = 'reservation' AND id = ? AND ref_user_id = ? AND status = 'pending'";
  db.query(q, [id, req.user.id], (err, result) => {
    if (err) return next(err);
    if (!result || result.affectedRows === 0) return fail(res, 404, "not found");

    logAudit({
      actorUserId: req.user.id,
      actorFacultyId: req.user.faculty_id,
      action: "reservation.cancel",
      entityType: "reservation",
      entityId: id,
      details: {}
    });

    return ok(res, { id, status: "cancelled" });
  });
});

module.exports = router;
