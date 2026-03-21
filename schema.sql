-- Full schema for Lab Equipment Availability Checker

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  faculty_id VARCHAR(50) NOT NULL UNIQUE,
  department VARCHAR(100) NOT NULL DEFAULT 'General',
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS faculty_labs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  faculty_id INT NOT NULL,
  lab_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_faculty_lab (faculty_id, lab_name),
  CONSTRAINT fk_faculty_labs_user FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS equipment (
  id INT AUTO_INCREMENT PRIMARY KEY,
  equipment_id VARCHAR(50) NULL UNIQUE,
  equipment_name_custom VARCHAR(150) NULL,
  equipment_count INT NOT NULL DEFAULT 1,
  lab_status ENUM('available','not_available') NOT NULL DEFAULT 'not_available',
  lab_name VARCHAR(100) NOT NULL,
  equipment_name VARCHAR(150) NOT NULL,
  status ENUM('available','maintenance','out_of_service') NOT NULL DEFAULT 'available',
  total_quantity INT NOT NULL DEFAULT 1,
  available_quantity INT NOT NULL DEFAULT 1,
  last_verified_at DATETIME NULL,
  verified_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_lab_equipment (lab_name, equipment_name),
  CONSTRAINT fk_equipment_verified_by FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS reservations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  equipment_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  status ENUM('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
  start_at DATETIME NOT NULL,
  end_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reservations_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_reservations_equipment FOREIGN KEY (equipment_id) REFERENCES equipment(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  actor_user_id INT NULL,
  actor_faculty_id VARCHAR(50) NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id INT NULL,
  details JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO users (name, faculty_id, email, password_hash, status)
VALUES ('Faculty', 'FAC001', 'faculty@bvrit.ac.in', '$2a$10$e0MYzXyjpJS7Pd0RVvHwHeFx7E2S6sBX0Xw8ZL1h4qW2xkJcMgnfS', 'active')
ON DUPLICATE KEY UPDATE status = VALUES(status);
