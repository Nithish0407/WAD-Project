const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");

dotenv.config();

const inventoryPath = path.join(__dirname, "data", "labInventory.json");
const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));

function tableNameFromLab(lab) {
  return `lab_${String(lab).toLowerCase().replace(/[^a-z0-9]+/g, "_")}_equipment`;
}

function toStatus(labStatus) {
  return labStatus === "available" ? "available" : "maintenance";
}

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    const labs = Object.keys(inventory);
    for (const lab of labs) {
      const table = tableNameFromLab(lab);
      const items = inventory[lab] || [];

      await conn.query(`
        CREATE TABLE IF NOT EXISTS \`${table}\` (
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

      await conn.query(`TRUNCATE TABLE \`${table}\``);

      for (const item of items.slice(0, 10)) {
        const qty = Number(item.equipment_count || 0);
        const labStatus = item.lab_status === "available" ? "available" : "not_available";
        const available = labStatus === "available" ? qty : 0;
        await conn.query(
          `INSERT INTO \`${table}\`
           (equipment_id, equipment_name_custom, equipment_count, lab_status, status, total_quantity, available_quantity)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [item.equipment_id, item.equipment_name_custom, qty, labStatus, toStatus(labStatus), qty, available]
        );
      }

      console.log(`Prepared ${table} with ${Math.min(items.length, 10)} equipment item(s).`);
    }

    console.log("All lab-specific tables are ready.");
  } finally {
    await conn.end();
  }
}

run().catch(err => {
  console.error("Create lab databases error:", err.message);
  process.exit(1);
});
