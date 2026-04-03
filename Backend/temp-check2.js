const mysql = require('mysql2');
const dotenv = require('dotenv');
dotenv.config();
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});
const q = "SELECT lab_name, COUNT(*) AS items FROM app_records WHERE type='equipment' GROUP BY lab_name ORDER BY lab_name";
db.query(q, (err, rows) => {
  if (err) { console.error(err); process.exit(1); }
  console.log(rows);
  db.end();
});
