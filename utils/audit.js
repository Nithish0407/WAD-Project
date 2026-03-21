const db = require("../db");

function logAudit({ actorUserId, actorFacultyId, action, entityType, entityId, details }) {
  const query =
    "INSERT INTO audit_logs (actor_user_id, actor_faculty_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)";
  const payload = details ? JSON.stringify(details) : null;

  db.query(query, [actorUserId || null, actorFacultyId || null, action, entityType, entityId || null, payload], () => {
    // audit logging must not break request flow
  });
}

module.exports = { logAudit };
