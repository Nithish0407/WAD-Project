const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config();
const db = require("../db");

const labName = process.env.SEED_COMPUTER_LAB_NAME || "CSE";
const facultyEmail = process.env.SEED_FACULTY_EMAIL || "faculty@bvrit.ac.in";
const itemsPath = path.join(__dirname, "data", "computerLabItems.json");
const items = JSON.parse(fs.readFileSync(itemsPath, "utf8"));

function upsertItem(userId, item) {
  return new Promise((resolve, reject) => {
    const status = item.lab_status === "available" ? "available" : "maintenance";
    const total = Number(item.equipment_count || 0);
    const available = item.lab_status === "available" ? total : 0;

    const query =
      "INSERT INTO equipment (equipment_id, equipment_name_custom, equipment_count, lab_status, lab_name, equipment_name, status, total_quantity, available_quantity, last_verified_at, verified_by) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?) " +
      "ON DUPLICATE KEY UPDATE " +
      "equipment_name_custom = VALUES(equipment_name_custom), " +
      "equipment_count = VALUES(equipment_count), " +
      "lab_status = VALUES(lab_status), " +
      "lab_name = VALUES(lab_name), " +
      "equipment_name = VALUES(equipment_name), " +
      "status = VALUES(status), " +
      "total_quantity = VALUES(total_quantity), " +
      "available_quantity = VALUES(available_quantity), " +
      "last_verified_at = NOW(), " +
      "verified_by = VALUES(verified_by)";

    db.query(
      query,
      [
        item.equipment_id,
        item.equipment_name_custom,
        total,
        item.lab_status,
        labName,
        item.equipment_name_custom,
        status,
        total,
        available,
        userId
      ],
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });
}

function assignLab(userId) {
  return new Promise((resolve, reject) => {
    db.query(
      "INSERT INTO faculty_labs (faculty_id, lab_name) VALUES (?, ?) ON DUPLICATE KEY UPDATE lab_name = VALUES(lab_name)",
      [userId, labName],
      (err) => (err ? reject(err) : resolve())
    );
  });
}

function getFacultyUser() {
  return new Promise((resolve, reject) => {
    db.query("SELECT id, email FROM users WHERE email = ? LIMIT 1", [facultyEmail], (err, rows) => {
      if (err) return reject(err);
      if (!rows || rows.length === 0) {
        return reject(new Error(`Faculty user not found for email: ${facultyEmail}`));
      }
      resolve(rows[0]);
    });
  });
}

async function run() {
  try {
    const user = await getFacultyUser();
    await assignLab(user.id);
    for (const item of items) {
      await upsertItem(user.id, item);
    }
    console.log(`Seeded ${items.length} computer lab items into lab '${labName}' for ${user.email}`);
    process.exit(0);
  } catch (err) {
    console.error("Computer lab seed error:", err.message);
    process.exit(1);
  }
}

run();
