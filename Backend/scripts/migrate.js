const fs = require("fs");
const path = require("path");
const mysql = require("mysql2");
const dotenv = require("dotenv");

dotenv.config();

const sqlPath = path.join(__dirname, "..", "migrations.sql");
const sql = fs.readFileSync(sqlPath, "utf8");

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true
});

db.connect(err => {
  if (err) {
    console.error("DB Error:", err);
    process.exit(1);
  }

  db.query(sql, err2 => {
    if (err2) {
      console.error("Migration Error:", err2);
      process.exit(1);
    }
    console.log("Migrations applied successfully.");
    db.end();
  });
});
