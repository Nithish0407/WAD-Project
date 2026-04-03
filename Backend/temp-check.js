const mysql = require("mysql2");
require("dotenv").config();
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  ssl: { rejectUnauthorized: false, minVersion: "TLSv1.2" }
});

db.query(
  "SELECT id, lab_name, equipment_id, equipment_name_custom, equipment_count, available_quantity, total_quantity FROM app_records WHERE type='equipment' AND lab_name='CSE'",
  (err, rows) => {
    if (err) { console.error("query error", err); process.exit(1); }
    console.log(rows);
    db.end();
  }
);
