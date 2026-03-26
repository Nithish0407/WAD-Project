const mysql = require("mysql2");

const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = Number(process.env.DB_PORT || 3306);

const db = mysql.createConnection({
  host: DB_HOST,
  port: DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect(err => {
  if (err) {
    console.error("DB Error:", err);
    console.error(`Tried host ${DB_HOST} port ${DB_PORT}`);
    return;
  }
  console.log(`MySQL Connected at ${DB_HOST}:${DB_PORT}`);
});

module.exports = db;
