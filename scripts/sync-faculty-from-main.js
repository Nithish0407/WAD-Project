const dotenv = require("dotenv");
const mysql = require("mysql2/promise");

dotenv.config();

const FACULTY_DB_NAME = process.env.FACULTY_DB_NAME || "faculty_registry_db";

async function run() {
  const main = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  const faculty = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: FACULTY_DB_NAME
  });

  try {
    const [users] = await main.query(
      "SELECT id, name, faculty_id, department, email, status FROM users ORDER BY id"
    );

    for (const u of users) {
      await faculty.query(
        "INSERT INTO faculty_users (main_user_id, name, faculty_id, department, email, status) VALUES (?, ?, ?, ?, ?, ?) " +
          "ON DUPLICATE KEY UPDATE name = VALUES(name), faculty_id = VALUES(faculty_id), department = VALUES(department), email = VALUES(email), status = VALUES(status)",
        [u.id, u.name, u.faculty_id, u.department || "General", u.email, u.status || "active"]
      );
    }

    console.log(`Synced faculty users: ${users.length}`);
  } finally {
    await main.end();
    await faculty.end();
  }
}

run().catch(err => {
  console.error("Sync faculty error:", err.message);
  process.exit(1);
});
