const mysql = require("mysql2/promise");
require("dotenv").config();

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306)
  });

  const [rows] = await conn.query(
    "SELECT id, name, faculty_id, email, user_status, registered_at, last_login_at FROM faculty_activity ORDER BY id"
  );
  console.table(rows);
  await conn.end();
}

run().catch(err => {
  console.error("list-faculty-activity error:", err.message);
  process.exit(1);
});
