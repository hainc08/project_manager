-- Shift Management Module Schema
-- Adapted for compatibility with existing project database conventions

-- Disable foreign key checks for table creation
SET FOREIGN_KEY_CHECKS=0;

-- 1. Shift Templates: Master definitions of shifts
CREATE TABLE IF NOT EXISTS shift_templates (
  id VARCHAR(50) PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INT NOT NULL DEFAULT 0,
  base_multiplier REAL NOT NULL DEFAULT 1.00,
  color VARCHAR(30) NULL,
  checkin_early_minutes INT NOT NULL DEFAULT 30,
  checkin_late_minutes INT NOT NULL DEFAULT 120,
  late_grace_minutes INT NOT NULL DEFAULT 5,
  checkout_grace_minutes INT NOT NULL DEFAULT 5,
  requires_assignment BOOLEAN NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Shift Instances: Specific shifts generated for a date
CREATE TABLE IF NOT EXISTS shift_instances (
  id VARCHAR(50) PRIMARY KEY,
  shift_template_id VARCHAR(50) NOT NULL,
  work_date DATE NOT NULL,
  start_at DATETIME NOT NULL,
  end_at DATETIME NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
  note TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shift_template_id) REFERENCES shift_templates(id),
  UNIQUE (shift_template_id, work_date)
);

-- 3. Shift Assignments: Assigning users to shift instances
CREATE TABLE IF NOT EXISTS shift_assignments (
  id VARCHAR(50) PRIMARY KEY,
  shift_instance_id VARCHAR(50) NOT NULL,
  user_id VARCHAR(50) NOT NULL,
  role_name VARCHAR(100) NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED',
  assigned_by VARCHAR(50) NULL,
  assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  note TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shift_instance_id) REFERENCES shift_instances(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE (shift_instance_id, user_id)
);

-- 4. Attendance Events: Raw check-in/out logs
CREATE TABLE IF NOT EXISTS attendance_events (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  event_type VARCHAR(20) NOT NULL, -- CHECK_IN, CHECK_OUT
  event_at DATETIME NOT NULL,
  source VARCHAR(30) NOT NULL, -- WEB, MOBILE, DEVICE
  device_id VARCHAR(100) NULL,
  shift_instance_id VARCHAR(50) NULL,
  metadata TEXT NULL, -- JSON string
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (shift_instance_id) REFERENCES shift_instances(id)
);

-- 5. Attendance Records: Processed attendance per shift
CREATE TABLE IF NOT EXISTS attendance_records (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  shift_instance_id VARCHAR(50) NULL,
  shift_assignment_id VARCHAR(50) NULL,
  work_date DATE NOT NULL,
  check_in_at DATETIME NULL,
  check_out_at DATETIME NULL,
  regular_minutes INT NOT NULL DEFAULT 0,
  overtime_minutes INT NOT NULL DEFAULT 0,
  night_minutes INT NOT NULL DEFAULT 0,
  late_minutes INT NOT NULL DEFAULT 0,
  early_leave_minutes INT NOT NULL DEFAULT 0,
  break_minutes INT NOT NULL DEFAULT 0,
  total_work_minutes INT NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL,
  payroll_status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  requires_review BOOLEAN NOT NULL DEFAULT 0,
  review_reason TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (shift_instance_id) REFERENCES shift_instances(id),
  FOREIGN KEY (shift_assignment_id) REFERENCES shift_assignments(id)
);

-- 6. Work Segments: Breakdown of hours for payroll
CREATE TABLE IF NOT EXISTS work_segments (
  id VARCHAR(50) PRIMARY KEY,
  attendance_record_id VARCHAR(50) NOT NULL,
  segment_type VARCHAR(50) NOT NULL,
  start_at DATETIME NOT NULL,
  end_at DATETIME NOT NULL,
  minutes INT NOT NULL,
  multiplier REAL NOT NULL,
  pay_amount REAL NULL,
  approval_status VARCHAR(30) NOT NULL DEFAULT 'AUTO_APPROVED',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (attendance_record_id) REFERENCES attendance_records(id)
);

-- 7. Payroll Multiplier Rules
CREATE TABLE IF NOT EXISTS payroll_multiplier_rules (
  id VARCHAR(50) PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  day_type VARCHAR(30) NOT NULL, -- NORMAL_WORKDAY, WEEKLY_REST_DAY, PUBLIC_HOLIDAY
  segment_type VARCHAR(50) NOT NULL,
  multiplier REAL NOT NULL,
  minimum_legal_multiplier REAL NULL,
  is_default BOOLEAN NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT 1,
  effective_from DATE NOT NULL,
  effective_to DATE NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. Holiday Calendar
CREATE TABLE IF NOT EXISTS holiday_calendar (
  id VARCHAR(50) PRIMARY KEY,
  holiday_date DATE NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  day_type VARCHAR(30) NOT NULL,
  default_multiplier REAL NULL,
  is_paid_day BOOLEAN NOT NULL DEFAULT 1,
  note TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS=1;
