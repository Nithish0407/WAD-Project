const mysql = require("mysql2/promise");

function dbNameFromLab(labName) {
  const slug = String(labName || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `lab_${slug}_db`;
}

async function withLabDb(labName, fn) {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: dbNameFromLab(labName)
  });
  try {
    return await fn(connection);
  } finally {
    await connection.end();
  }
}

async function syncEquipmentToLabSchema(record) {
  if (!record || !record.lab_name) return;

  const equipmentName = record.equipment_name_custom || record.equipment_name || "";
  const equipmentCount = Number(record.equipment_count ?? record.total_quantity ?? 0);
  const totalQuantity = Number(record.total_quantity ?? equipmentCount);
  const availableQuantity = Number(record.available_quantity ?? 0);
  const labStatus = record.lab_status === "available" ? "available" : "not_available";
  const status = ["available", "maintenance", "out_of_service"].includes(record.status)
    ? record.status
    : labStatus === "available"
      ? "available"
      : "maintenance";

  await withLabDb(record.lab_name, async connection => {
    const [existing] = await connection.query(
      "SELECT id FROM equipment WHERE equipment_id = ? OR equipment_name_custom = ? LIMIT 1",
      [record.equipment_id || "", equipmentName]
    );
    if (existing && existing.length > 0) {
      await connection.query(
        "UPDATE equipment SET equipment_id = ?, equipment_name_custom = ?, equipment_count = ?, lab_status = ?, status = ?, total_quantity = ?, available_quantity = ? WHERE id = ?",
        [record.equipment_id || null, equipmentName, equipmentCount, labStatus, status, totalQuantity, availableQuantity, existing[0].id]
      );
      return;
    }

    await connection.query(
      "INSERT INTO equipment (equipment_id, equipment_name_custom, equipment_count, lab_status, status, total_quantity, available_quantity) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [null, equipmentName, equipmentCount, labStatus, status, totalQuantity, availableQuantity]
    );
  });
}

async function removeEquipmentFromLabSchema(record) {
  if (!record || !record.lab_name) return;
  const equipmentName = record.equipment_name_custom || record.equipment_name || "";

  await withLabDb(record.lab_name, async connection => {
    await connection.query(
      "DELETE FROM equipment WHERE equipment_id = ? OR equipment_name_custom = ?",
      [record.equipment_id || "", equipmentName]
    );
  });
}

module.exports = { syncEquipmentToLabSchema, removeEquipmentFromLabSchema };
