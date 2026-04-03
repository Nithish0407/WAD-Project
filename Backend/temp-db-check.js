const mysql = require("mysql2");
require("dotenv").config();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  ssl: { rejectUnauthorized: false, minVersion: "TLSv1.2" } // relax SSL for now
});

db.query(
  "SELECT lab_name, COUNT(*) AS items FROM app_records WHERE type='equipment' GROUP BY lab_name",
  (err, rows) => {
    if (err) { console.error("query error", err); process.exit(1); }
    console.log(rows);
    db.end();
  }
);
