const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config();
const db = require("../db");

const facultyEmail = process.env.SEED_FACULTY_EMAIL || "faculty@bvrit.ac.in";
const itemsPath = path.join(__dirname, "data", "allLabItems.json");
const allLabItems = JSON.parse(fs.readFileSync(itemsPath, "utf8"));

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

async function getFacultyUser() {
  const rows = await query("SELECT id, email FROM users WHERE email = ? LIMIT 1", [facultyEmail]);
  if (!rows || rows.length === 0) {
    throw new Error(`Faculty user not found for email: ${facultyEmail}`);
  }
  return rows[0];
}

async function assignLab(userId, labName) {
  await query(
    "INSERT INTO faculty_labs (faculty_id, lab_name) VALUES (?, ?) ON DUPLICATE KEY UPDATE lab_name = VALUES(lab_name)",
    [userId, labName]
  );
}

async function upsertItem(userId, labName, item) {
  const status = item.lab_status === "available" ? "available" : "maintenance";
  const total = Number(item.equipment_count || 0);
  const available = item.lab_status === "available" ? total : 0;

  await query(
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
      "verified_by = VALUES(verified_by)",
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
    ]
  );
}

async function run() {
  try {
    const user = await getFacultyUser();
    const labs = Object.keys(allLabItems);
    let totalItems = 0;

    for (const labName of labs) {
      const items = allLabItems[labName] || [];
      await assignLab(user.id, labName);
      for (const item of items) {
        await upsertItem(user.id, labName, item);
      }
      totalItems += items.length;
      console.log(`Seeded ${items.length} item(s) for lab '${labName}'`);
    }

    console.log(`Completed: ${labs.length} labs, ${totalItems} items, faculty ${user.email}`);
    process.exit(0);
  } catch (err) {
    console.error("Seed all labs error:", err.message);
    process.exit(1);
  }
}

run();
