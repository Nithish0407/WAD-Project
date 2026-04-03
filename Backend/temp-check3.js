const mysql = require('mysql2');
const dotenv = require('dotenv');
dotenv.config();
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});
const q = "SELECT id, lab_name, equipment_id, equipment_name_custom, equipment_count, available_quantity FROM app_records WHERE type='equipment' AND lab_name='CSE' LIMIT 5";
db.query(q, (err, rows) => {
  if (err) { console.error(err); process.exit(1); }
  console.log(rows);
  db.end();
});
