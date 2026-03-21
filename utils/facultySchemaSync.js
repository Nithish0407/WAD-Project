const mysql = require("mysql2/promise");

const FACULTY_DB_NAME = process.env.FACULTY_DB_NAME || "faculty_registry_db";

async function withFacultyDb(fn) {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: FACULTY_DB_NAME
  });
  try {
    return await fn(connection);
  } finally {
    await connection.end();
  }
}

async function upsertFacultyUser(record) {
  if (!record) return;
  await withFacultyDb(async connection => {
    await connection.query(
      "INSERT INTO faculty_users (main_user_id, name, faculty_id, department, email, status) VALUES (?, ?, ?, ?, ?, ?) " +
        "ON DUPLICATE KEY UPDATE name = VALUES(name), faculty_id = VALUES(faculty_id), department = VALUES(department), email = VALUES(email), status = VALUES(status)",
      [
        Number(record.main_user_id || 0) || null,
        record.name || "",
        record.faculty_id || "",
        record.department || "General",
        record.email || "",
        record.status || "active"
      ]
    );
  });
}

async function updateFacultyStatus(mainUserId, status) {
  if (!mainUserId) return;
  await withFacultyDb(async connection => {
    await connection.query(
      "UPDATE faculty_users SET status = ? WHERE main_user_id = ?",
      [status, Number(mainUserId)]
    );
  });
}

module.exports = { upsertFacultyUser, updateFacultyStatus };
