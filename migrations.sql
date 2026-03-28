-- Migration for LabTrack: single-table schema for all entities.
-- Idempotent: safe to run multiple times.

-- Ensure the target database exists. If your DB_NAME differs, adjust or create it manually.
-- CREATE DATABASE IF NOT EXISTS `bdgfndssjryalvrnsdmo` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE `bdgfndssjryalvrnsdmo`;

CREATE TABLE IF NOT EXISTS app_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('user','lab_map','equipment','reservation','audit') NOT NULL,

  -- user fields
  name VARCHAR(150),
  faculty_id VARCHAR(50),
  department VARCHAR(100),
  email VARCHAR(150),
  password_hash VARCHAR(255),
  user_status ENUM('active','inactive') DEFAULT 'active',

  -- lab mapping
  lab_name VARCHAR(100),

  -- equipment fields
  equipment_id VARCHAR(50),
  equipment_name VARCHAR(150),
  equipment_name_custom VARCHAR(150),
  equipment_count INT,
  lab_status ENUM('available','not_available') DEFAULT 'not_available',
  status VARCHAR(30),
  total_quantity INT,
  available_quantity INT,
  last_verified_at DATETIME,
  verified_by INT,

  -- reservation fields
  ref_user_id INT,
  ref_equipment_id INT,
  res_quantity INT,
  start_at DATETIME,
  end_at DATETIME,

  -- audit fields
  actor_user_id INT,
  actor_faculty_id VARCHAR(50),
  action VARCHAR(120),
  entity_type VARCHAR(80),
  entity_id INT,
  details JSON,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_user_email (type, email),
  UNIQUE KEY uq_user_faculty (type, faculty_id),
  UNIQUE KEY uq_equipment_id (type, equipment_id),
  UNIQUE KEY uq_lab_equipment (type, lab_name, equipment_name),
  UNIQUE KEY uq_lab_assignment (type, ref_user_id, lab_name),
  KEY idx_type (type),
  KEY idx_res_user (type, ref_user_id),
  KEY idx_res_equipment (type, ref_equipment_id)
);
