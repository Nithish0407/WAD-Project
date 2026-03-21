/**
 * Sync equipment rows from the standalone Computer Lab database into the main lab_db.
 * - Source DB: lab_computer_lab_db
 * - Destination DB: lab_db
 * Upserts by equipment_id: updates existing rows, inserts new ones.
 */

const mysql = require("mysql2/promise");

// DB creds (same host/user/pass; only DB name differs)
const HOST = "localhost";
const USER = "root";
const PASSWORD = "Nithish@070";
const SOURCE_DB = "lab_computer_lab_db";
const DEST_DB = "lab_db";

async function main() {
  const src = await mysql.createConnection({ host: HOST, user: USER, password: PASSWORD, database: SOURCE_DB });
  const dst = await mysql.createConnection({ host: HOST, user: USER, password: PASSWORD, database: DEST_DB });

  const [rows] = await src.execute(
    "SELECT equipment_id, equipment_name_custom, equipment_count, total_quantity, available_quantity, lab_status, status FROM equipment"
  );

  let inserted = 0;
  let updated = 0;

  for (const row of rows) {
    const equipmentId = row.equipment_id || null;
    const name = row.equipment_name_custom || "Unnamed Equipment";
    const equipmentCount = Number(row.equipment_count ?? row.total_quantity ?? 0);
    const totalQuantity = Number(row.total_quantity ?? equipmentCount);
    const availableQuantity = Number(
      row.available_quantity ?? (row.lab_status === "available" ? totalQuantity : 0)
    );
    const labStatus = ["available", "not_available"].includes(row.lab_status) ? row.lab_status : "available";
    const status = ["available", "maintenance", "out_of_service"].includes(row.status) ? row.status : "available";
    const labName = "Computer Lab";

    // Upsert by equipment_id if present; otherwise always insert.
    let existing = [];
    if (equipmentId) {
      [existing] = await dst.execute("SELECT id FROM equipment WHERE equipment_id = ? LIMIT 1", [equipmentId]);
    }

    if (existing.length) {
      const id = existing[0].id;
      await dst.execute(
        "UPDATE equipment SET lab_name=?, equipment_name=?, equipment_name_custom=?, equipment_count=?, total_quantity=?, available_quantity=?, total=?, available=?, quantity=?, lab_status=?, status=?, updated_at=NOW() WHERE id=?",
        [
          labName,
          name,
          name,
          equipmentCount,
          totalQuantity,
          availableQuantity,
          totalQuantity,
          availableQuantity,
          totalQuantity,
          labStatus,
          status,
          id
        ]
      );
      updated += 1;
    } else {
      await dst.execute(
        "INSERT INTO equipment (lab_name, equipment_name, equipment_name_custom, equipment_id, equipment_count, total_quantity, available_quantity, total, available, quantity, lab_status, status, last_verified_at, verified_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?, NOW(), 1, NOW(), NOW())",
        [
          labName,
          name,
          name,
          equipmentId,
          equipmentCount,
          totalQuantity,
          availableQuantity,
          totalQuantity,
          availableQuantity,
          totalQuantity,
          labStatus,
          status
        ]
      );
      inserted += 1;
    }
  }

  console.log(`Synced ${rows.length} rows from ${SOURCE_DB}. Inserted: ${inserted}, Updated: ${updated}`);

  await src.end();
  await dst.end();
}

main().catch(err => {
  console.error("Sync failed:", err);
  process.exit(1);
});
