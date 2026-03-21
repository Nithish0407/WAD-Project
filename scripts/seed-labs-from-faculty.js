const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
dotenv.config();
const db = require("../db");

const facultyPath = path.join(__dirname, "..", "public", "faculty.json");
const inventoryPath = path.join(__dirname, "data", "labInventory.json");

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

function statusToEquipmentStatus(labStatus) {
  return labStatus === "available" ? "available" : "maintenance";
}

function resolveAssignedLab(department) {
  const value = String(department || "").trim().toLowerCase();
  if (["csd", "cse", "aids", "computer", "computer science"].includes(value)) return "Computer Lab";
  if (value === "chemical") return "Chemical";
  if (value === "civil") return "Civil";
  if (value === "mechanical") return "Mechanical";
  if (value === "eee") return "EEE";
  if (value === "ece") return "ECE";
  return "Others";
}

async function upsertFaculty(faculty) {
  const facultyId = String(faculty.facultyId || "").trim();
  const name = String(faculty.name || "").trim();
  const department = String(faculty.department || "").trim();
  const email = String(faculty.email || "").trim().toLowerCase();
  const password = String(faculty.password || "");

  if (!facultyId || !name || !department || !email || !password) {
    throw new Error(`Invalid faculty record: ${JSON.stringify(faculty)}`);
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  await query(
    "INSERT INTO users (name, faculty_id, department, email, password_hash, status) VALUES (?, ?, ?, ?, ?, 'active') " +
      "ON DUPLICATE KEY UPDATE name = VALUES(name), department = VALUES(department), password_hash = VALUES(password_hash), status = 'active'",
    [name, facultyId, department, email, passwordHash]
  );

  const users = await query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
  if (!users || users.length === 0) {
    throw new Error(`Could not fetch user id for ${email}`);
  }
  return { id: users[0].id, department };
}

async function assignLabToFaculty(userId, labName) {
  await query("DELETE FROM faculty_labs WHERE faculty_id = ?", [userId]);
  await query("INSERT INTO faculty_labs (faculty_id, lab_name) VALUES (?, ?)", [userId, labName]);
}

async function upsertEquipmentForLab(userId, labName, item) {
  const count = Number(item.equipment_count || 0);
  const labStatus = item.lab_status === "available" ? "available" : "not_available";
  const status = statusToEquipmentStatus(labStatus);
  const availableQty = labStatus === "available" ? count : 0;
  const eqName = item.equipment_name_custom;

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
      eqName,
      count,
      labStatus,
      labName,
      eqName,
      status,
      count,
      availableQty,
      userId
    ]
  );
}

async function run() {
  try {
    const facultyList = JSON.parse(fs.readFileSync(facultyPath, "utf8"));
    const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
    if (!Array.isArray(facultyList) || facultyList.length === 0) {
      throw new Error("public/faculty.json is empty or invalid");
    }

    let totalLabsSeeded = 0;
    let totalItemsSeeded = 0;

    for (const faculty of facultyList) {
      const user = await upsertFaculty(faculty);
      const labName = resolveAssignedLab(user.department);
      const items = inventory[labName] || [];

      await assignLabToFaculty(user.id, labName);
      totalLabsSeeded += 1;

      for (const item of items) {
        await upsertEquipmentForLab(user.id, labName, item);
      }

      totalItemsSeeded += items.length;
      console.log(`Seeded ${items.length} item(s) for '${labName}' (faculty: ${faculty.email})`);
    }

    console.log(`Done: labs mapped ${totalLabsSeeded}, equipment records processed ${totalItemsSeeded}`);
    process.exit(0);
  } catch (err) {
    console.error("Seed labs error:", err.message);
    process.exit(1);
  }
}

run();
