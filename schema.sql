-- Single-table schema for all entities
CREATE TABLE IF NOT EXISTS app_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('user','lab_map','equipment','reservation','audit') NOT NULL,

  -- user fields
  name VARCHAR(150) NULL,
  faculty_id VARCHAR(50) NULL,
  department VARCHAR(100) NULL,
  email VARCHAR(150) NULL,
  password_hash VARCHAR(255) NULL,
  user_status ENUM('active','inactive') DEFAULT 'active',

  -- lab mapping
  lab_name VARCHAR(100) NULL,

  -- equipment fields
  equipment_id VARCHAR(50) NULL,
  equipment_name VARCHAR(150) NULL,
  equipment_name_custom VARCHAR(150) NULL,
  equipment_count INT NULL,
  lab_status ENUM('available','not_available') DEFAULT 'not_available',
  status VARCHAR(30) NULL,
  total_quantity INT NULL,
  available_quantity INT NULL,
  last_verified_at DATETIME NULL,
  verified_by INT NULL,

  -- reservation fields
  ref_user_id INT NULL,
  ref_equipment_id INT NULL,
  res_quantity INT NULL,
  start_at DATETIME NULL,
  end_at DATETIME NULL,

  -- audit fields
  actor_user_id INT NULL,
  actor_faculty_id VARCHAR(50) NULL,
  action VARCHAR(120) NULL,
  entity_type VARCHAR(80) NULL,
  entity_id INT NULL,
  details JSON NULL,

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
