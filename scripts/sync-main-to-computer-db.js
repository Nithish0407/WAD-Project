/**
 * Sync Computer Lab equipment from main lab_db into the legacy lab_computer_lab_db.
 * - Source: lab_db.equipment (lab_name = 'Computer Lab')
 * - Destination: lab_computer_lab_db.equipment (schema without lab_name)
 * The destination table is truncated before insert.
 */

const mysql = require("mysql2/promise");

const HOST = "localhost";
const USER = "root";
const PASSWORD = "Nithish@070";
const SOURCE_DB = "lab_db";
const DEST_DB = "lab_computer_lab_db";

async function main() {
  const src = await mysql.createConnection({ host: HOST, user: USER, password: PASSWORD, database: SOURCE_DB });
  const dst = await mysql.createConnection({ host: HOST, user: USER, password: PASSWORD, database: DEST_DB });

  const [rows] = await src.execute(
    "SELECT equipment_id, equipment_name_custom, equipment_count, lab_status, status, total_quantity, available_quantity FROM equipment WHERE lab_name = 'Computer Lab'"
  );

  await dst.execute("TRUNCATE TABLE equipment");

  let inserted = 0;
  for (const row of rows) {
    const equipmentId = row.equipment_id || null;
    const name = row.equipment_name_custom || "Unnamed Equipment";
    const count = Number(row.equipment_count ?? row.total_quantity ?? 0);
    const totalQuantity = Number(row.total_quantity ?? count);
    const availableQuantity = Number(
      row.available_quantity ?? (row.lab_status === "available" ? totalQuantity : 0)
    );
    const labStatus = ["available", "not_available"].includes(row.lab_status)
      ? row.lab_status
      : "available";
    const status = row.status || "available";

    await dst.execute(
      "INSERT INTO equipment (equipment_id, equipment_name_custom, equipment_count, lab_status, status, total_quantity, available_quantity, created_at, updated_at) VALUES (?,?,?,?,?,?,?, NOW(), NOW())",
      [equipmentId, name, count, labStatus, status, totalQuantity, availableQuantity]
    );
    inserted += 1;
  }

  console.log(`Synced ${inserted} Computer Lab rows into ${DEST_DB}.`);
  await src.end();
  await dst.end();
}

main().catch(err => {
  console.error("Sync failed:", err);
  process.exit(1);
});
