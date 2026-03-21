const dotenv = require("dotenv");
dotenv.config();
const db = require("../db");

const sql =
  "SELECT u.id, u.name, u.faculty_id, u.department, u.email, u.status, u.created_at, " +
  "GROUP_CONCAT(fl.lab_name ORDER BY fl.lab_name SEPARATOR ', ') AS labs " +
  "FROM users u " +
  "LEFT JOIN faculty_labs fl ON fl.faculty_id = u.id " +
  "GROUP BY u.id, u.name, u.faculty_id, u.department, u.email, u.status, u.created_at " +
  "ORDER BY u.id";

db.query(sql, (err, rows) => {
  if (err) {
    console.error("List faculty error:", err.message);
    process.exit(1);
  }

  if (!rows || rows.length === 0) {
    console.log("No faculty records found.");
    process.exit(0);
  }

  console.table(rows);
  process.exit(0);
});
