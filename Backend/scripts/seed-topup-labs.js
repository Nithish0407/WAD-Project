/**
 * Ensure every lab has at least 10 equipment rows.
 * Uses existing labs in faculty_labs and inserts placeholder items if needed.
 */
const mysql = require("mysql2/promise");
require("dotenv").config();

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306)
  });

  const [labs] = await conn.query("SELECT DISTINCT lab_name FROM faculty_labs");

  for (const row of labs) {
    const lab = row.lab_name;
    const [countRows] = await conn.query("SELECT COUNT(*) AS c FROM equipment WHERE lab_name = ?", [lab]);
    const current = countRows[0].c || 0;
    if (current >= 10) continue;

    const toAdd = 10 - current;
    for (let i = 1; i <= toAdd; i++) {
      const eqName = `Auto Item ${current + i}`;
      const eqId = `${lab.substring(0, 3).toUpperCase()}-AUTO-${current + i}`.replace(/\\s+/g, "-");
      await conn.query(
        "INSERT INTO equipment (equipment_id, equipment_name_custom, equipment_count, lab_status, lab_name, equipment_name, status, total_quantity, available_quantity, last_verified_at, verified_by) VALUES (?, ?, ?, 'available', ?, ?, 'available', ?, ?, NOW(), NULL)",
        [eqId, eqName, 1, lab, eqName, 1, 1]
      );
    }
    console.log(`Lab ${lab}: added ${toAdd} auto items (now 10).`);
  }

  await conn.end();
  console.log("Top-up complete.");
}

main().catch(err => {
  console.error("Top-up error:", err.message);
  process.exit(1);
});
