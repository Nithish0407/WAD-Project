const mysql = require('mysql2');
const dotenv = require('dotenv');
dotenv.config();
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});
db.query("SELECT COUNT(*) AS c FROM app_records WHERE type='equipment'", (err, rows) => {
  if (err) { console.error(err); db.end(); process.exit(1); }
  console.log(rows);
  db.end();
});
