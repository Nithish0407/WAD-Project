const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
dotenv.config();
const db = require("../db");

const facultyFile = path.join(__dirname, "..", "public", "faculty.json");

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

function normalizeDepartment(value) {
  return String(value || "").trim() || "General";
}

async function upsertFaculty(record) {
  const facultyId = String(record.facultyId || "").trim();
  const name = String(record.name || "").trim();
  const department = normalizeDepartment(record.department);
  const email = String(record.email || "").trim().toLowerCase();
  const password = String(record.password || "");

  if (!facultyId || !name || !email || !password) {
    throw new Error(`Invalid faculty record: ${JSON.stringify(record)}`);
  }

  if (!email.endsWith("@bvrit.ac.in")) {
    throw new Error(`Email domain is not allowed: ${email}`);
  }

  const passwordHash = bcrypt.hashSync(password, 10);

  await query(
    "INSERT INTO users (name, faculty_id, department, email, password_hash, status) VALUES (?, ?, ?, ?, ?, 'active') " +
      "ON DUPLICATE KEY UPDATE name = VALUES(name), department = VALUES(department), password_hash = VALUES(password_hash), status = 'active'",
    [name, facultyId, department, email, passwordHash]
  );

  const users = await query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
  if (!users || users.length === 0) {
    throw new Error(`Unable to resolve inserted user id for ${email}`);
  }

  await query(
    "INSERT INTO faculty_labs (faculty_id, lab_name) VALUES (?, ?) ON DUPLICATE KEY UPDATE lab_name = VALUES(lab_name)",
    [users[0].id, department]
  );
}

async function run() {
  try {
    const data = JSON.parse(fs.readFileSync(facultyFile, "utf8"));
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("public/faculty.json is empty or invalid");
    }

    for (const record of data) {
      await upsertFaculty(record);
    }

    console.log(`Seeded faculty records: ${data.length}`);
    process.exit(0);
  } catch (err) {
    console.error("Seed faculty error:", err.message);
    process.exit(1);
  }
}

run();
