const dotenv = require("dotenv");
dotenv.config();
const db = require("../db");

const facultyEmail = process.env.SEED_FACULTY_EMAIL || "faculty@bvrit.ac.in";
const labName = process.env.SEED_LAB_NAME || "CSE";

const findUser = "SELECT id, faculty_id FROM users WHERE email = ? LIMIT 1";
db.query(findUser, [facultyEmail], (err, rows) => {
  if (err) {
    console.error("Seed error:", err.message);
    process.exit(1);
  }
  if (!rows || rows.length === 0) {
    console.error(`Seed error: user not found for email ${facultyEmail}`);
    process.exit(1);
  }

  const user = rows[0];
  const assign = "INSERT INTO faculty_labs (faculty_id, lab_name) VALUES (?, ?)";
  db.query(assign, [user.id, labName], (assignErr) => {
    if (assignErr && assignErr.code !== "ER_DUP_ENTRY") {
      console.error("Seed error:", assignErr.message);
      process.exit(1);
    }

    console.log(`Seeded: ${facultyEmail} -> ${labName}`);
    process.exit(0);
  });
});
