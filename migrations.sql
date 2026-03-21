-- Incremental migration for existing databases

SET @db = DATABASE();

-- users table and new status column
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

SET @stmt = (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='faculty_id'),
    'SELECT 1',
    'ALTER TABLE users ADD COLUMN faculty_id VARCHAR(50) NOT NULL UNIQUE'
  )
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='department'),
    'SELECT 1',
    "ALTER TABLE users ADD COLUMN department VARCHAR(100) NOT NULL DEFAULT 'General'"
  )
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='status'),
    'SELECT 1',
    "ALTER TABLE users ADD COLUMN status ENUM('active','inactive') NOT NULL DEFAULT 'active'"
  )
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='role'),
    'ALTER TABLE users DROP COLUMN role',
    'SELECT 1'
  )
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- faculty_labs table
CREATE TABLE IF NOT EXISTS faculty_labs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  faculty_id INT NOT NULL,
  lab_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_faculty_lab (faculty_id, lab_name),
  CONSTRAINT fk_faculty_labs_user FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE CASCADE
);

-- equipment table compatibility + required fields
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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

SET @stmt = (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='equipment' AND COLUMN_NAME='equipment_id'),
    'SELECT 1',
    'ALTER TABLE equipment ADD COLUMN equipment_id VARCHAR(50) NULL UNIQUE'
  )
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='equipment' AND COLUMN_NAME='equipment_name_custom'),
    'SELECT 1',
    'ALTER TABLE equipment ADD COLUMN equipment_name_custom VARCHAR(150) NULL'
  )
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='equipment' AND COLUMN_NAME='equipment_count'),
    'SELECT 1',
    'ALTER TABLE equipment ADD COLUMN equipment_count INT NOT NULL DEFAULT 1'
  )
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='equipment' AND COLUMN_NAME='lab_status'),
    'SELECT 1',
    "ALTER TABLE equipment ADD COLUMN lab_status ENUM('available','not_available') NOT NULL DEFAULT 'not_available'"
  )
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- Transition existing enum values if database had old labels
ALTER TABLE equipment
  MODIFY COLUMN lab_status ENUM('ready_for_exam','not_ready_for_exam','available','not_available') NOT NULL DEFAULT 'not_available';

SET @stmt = (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='equipment' AND COLUMN_NAME='total_quantity'),
    'SELECT 1',
    'ALTER TABLE equipment ADD COLUMN total_quantity INT NOT NULL DEFAULT 1'
  )
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='equipment' AND COLUMN_NAME='available_quantity'),
    'SELECT 1',
    'ALTER TABLE equipment ADD COLUMN available_quantity INT NOT NULL DEFAULT 1'
  )
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='equipment' AND COLUMN_NAME='last_verified_at'),
    'SELECT 1',
    'ALTER TABLE equipment ADD COLUMN last_verified_at DATETIME NULL'
  )
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='equipment' AND COLUMN_NAME='verified_by'),
    'SELECT 1',
    'ALTER TABLE equipment ADD COLUMN verified_by INT NULL'
  )
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='equipment' AND COLUMN_NAME='status'),
    "ALTER TABLE equipment MODIFY COLUMN status ENUM('available','maintenance','out_of_service') NOT NULL DEFAULT 'available'",
    "ALTER TABLE equipment ADD COLUMN status ENUM('available','maintenance','out_of_service') NOT NULL DEFAULT 'available'"
  )
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='equipment' AND INDEX_NAME='uq_lab_equipment'),
    'SELECT 1',
    'CREATE UNIQUE INDEX uq_lab_equipment ON equipment(lab_name, equipment_name)'
  )
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

UPDATE equipment
SET total_quantity = CASE
  WHEN total_quantity IS NULL OR total_quantity < 0 THEN 1
  ELSE total_quantity
END;

UPDATE equipment
SET available_quantity = CASE
  WHEN available_quantity IS NULL OR available_quantity < 0 THEN total_quantity
  WHEN available_quantity > total_quantity THEN total_quantity
  ELSE available_quantity
END;

UPDATE equipment
SET equipment_name_custom = equipment_name
WHERE equipment_name_custom IS NULL OR equipment_name_custom = '';

UPDATE equipment
SET equipment_count = CASE
  WHEN equipment_count IS NULL OR equipment_count <= 0 THEN total_quantity
  ELSE equipment_count
END;

UPDATE equipment
SET lab_status = CASE
  WHEN lab_status = 'ready_for_exam' THEN 'available'
  WHEN lab_status = 'not_ready_for_exam' THEN 'not_available'
  WHEN status = 'available' THEN 'available'
  ELSE 'not_available'
END
WHERE lab_status IS NULL OR lab_status = '';

UPDATE equipment
SET lab_status = 'available'
WHERE lab_status = 'ready_for_exam';

UPDATE equipment
SET lab_status = 'not_available'
WHERE lab_status = 'not_ready_for_exam';

ALTER TABLE equipment
  MODIFY COLUMN lab_status ENUM('available','not_available') NOT NULL DEFAULT 'not_available';

-- reservations table
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

-- audit logs
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
