const dotenv = require("dotenv");
const mysql = require("mysql2/promise");

dotenv.config();

const FACULTY_DB_NAME = process.env.FACULTY_DB_NAME || "faculty_registry_db";

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  });

  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${FACULTY_DB_NAME}\``);
    await conn.query(`USE \`${FACULTY_DB_NAME}\``);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS faculty_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        main_user_id INT UNIQUE,
        name VARCHAR(100) NOT NULL,
        faculty_id VARCHAR(50) NOT NULL UNIQUE,
        department VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        status ENUM('active','inactive') NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log(`Faculty database ready: ${FACULTY_DB_NAME}.faculty_users`);
  } finally {
    await conn.end();
  }
}

run().catch(err => {
  console.error("Create faculty database error:", err.message);
  process.exit(1);
});
