const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");

console.log("create-lab-schemas: no-op (single DB mode). All labs share DB_NAME now.");
process.exit(0);

dotenv.config();

const inventoryPath = path.join(__dirname, "data", "labInventory.json");
const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));

function dbNameFromLab(lab) {
  const slug = String(lab).toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return `lab_${slug}_db`;
}

function statusFromLabStatus(labStatus) {
  return labStatus === "available" ? "available" : "maintenance";
}

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  });

  try {
    for (const [lab, items] of Object.entries(inventory)) {
      const dbName = dbNameFromLab(lab);

      await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
      await conn.query(`USE \`${dbName}\``);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS equipment (
          id INT AUTO_INCREMENT PRIMARY KEY,
          equipment_id VARCHAR(50) UNIQUE,
          equipment_name_custom VARCHAR(150) NOT NULL,
          equipment_count INT NOT NULL DEFAULT 0,
          lab_status ENUM('available','not_available') NOT NULL DEFAULT 'not_available',
          status ENUM('available','maintenance','out_of_service') NOT NULL DEFAULT 'available',
          total_quantity INT NOT NULL DEFAULT 0,
          available_quantity INT NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      await conn.query("TRUNCATE TABLE equipment");

      for (const item of (items || []).slice(0, 10)) {
        const qty = Number(item.equipment_count || 0);
        const labStatus = item.lab_status === "available" ? "available" : "not_available";
        const availableQty = labStatus === "available" ? qty : 0;
        await conn.query(
          `INSERT INTO equipment
           (equipment_id, equipment_name_custom, equipment_count, lab_status, status, total_quantity, available_quantity)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            item.equipment_id,
            item.equipment_name_custom,
            qty,
            labStatus,
            statusFromLabStatus(labStatus),
            qty,
            availableQty
          ]
        );
      }

      console.log(`Prepared database ${dbName} with 10 equipment item(s).`);
    }

    console.log("All separate lab databases are ready.");
  } finally {
    await conn.end();
  }
}

run().catch(err => {
  console.error("Create lab schemas error:", err.message);
  process.exit(1);
});
