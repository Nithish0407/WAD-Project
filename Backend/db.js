const mysql = require("mysql2");

const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = Number(process.env.DB_PORT || 3306);
const DB_SSL = (process.env.DB_SSL || "").toLowerCase() === "true";

const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: DB_SSL ? { rejectUnauthorized: false } : undefined
});

// Verify connectivity at startup
pool.getConnection((err, conn) => {
  if (err) {
    console.error("DB connection failed:", err.message);
    console.error(`Tried host ${DB_HOST} port ${DB_PORT}`);
    process.exit(1);
  }
  console.log(`MySQL connected at ${DB_HOST}:${DB_PORT}`);
  conn.release();
});

module.exports = pool;
