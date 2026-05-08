-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS=0;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK(role IN ('ADMIN', 'ACCOUNTANT', 'STAFF')),
    job_title VARCHAR(100),
    contract_type VARCHAR(20) NOT NULL DEFAULT 'FULLTIME' CHECK(contract_type IN ('FULLTIME', 'PARTTIME', 'FREELANCER')),
    standard_rate REAL NOT NULL DEFAULT 0.00,
    billing_rate REAL NOT NULL DEFAULT 0.00,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(50) PRIMARY KEY,
    project_name VARCHAR(255) NOT NULL,
    location_type VARCHAR(20) NOT NULL DEFAULT 'WORKSHOP' CHECK(location_type IN ('WORKSHOP', 'SITE')),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'COMPLETED', 'ON_HOLD')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Project Items Table (Global Categories)
CREATE TABLE IF NOT EXISTS project_items (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Project Item Mapping
CREATE TABLE IF NOT EXISTS project_item_mapping (
    project_id VARCHAR(50) NOT NULL,
    item_id VARCHAR(50) NOT NULL,
    PRIMARY KEY (project_id, item_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES project_items(id) ON DELETE CASCADE
);

-- 5. Shift Templates
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
  location_type VARCHAR(20) NOT NULL DEFAULT 'WORKSHOP',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. Shift Instances
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

-- 7. Shift Assignments
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

-- 8. Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(50) PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL,
    project_item_id VARCHAR(50),
    assigned_to VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    description TEXT,
    location_type VARCHAR(20) NOT NULL DEFAULT 'WORKSHOP',
    target_shift_id VARCHAR(50),
    status VARCHAR(30) NOT NULL DEFAULT 'TODO' CHECK(status IN ('TODO', 'DOING', 'FINISHED_BY_STAFF', 'DONE', 'CANCELLED')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (project_item_id) REFERENCES project_items(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (target_shift_id) REFERENCES shift_templates(id)
);

-- 9. Attendance Events (Raw logs)
CREATE TABLE IF NOT EXISTS attendance_events (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  event_type VARCHAR(20) NOT NULL, -- CHECK_IN, CHECK_OUT
  event_at DATETIME NOT NULL,
  source VARCHAR(30) NOT NULL, -- WEB, MOBILE, DEVICE
  device_id VARCHAR(100) NULL,
  shift_instance_id VARCHAR(50) NULL,
  metadata TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (shift_instance_id) REFERENCES shift_instances(id)
);

-- 10. Attendance Records (Processed)
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
  status VARCHAR(30) NOT NULL, -- ON_TIME, LATE, COMPLETED, ABSENT, etc.
  location_type VARCHAR(20) NOT NULL DEFAULT 'WORKSHOP',
  payroll_status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  requires_review BOOLEAN NOT NULL DEFAULT 0,
  review_reason TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (shift_instance_id) REFERENCES shift_instances(id),
  FOREIGN KEY (shift_assignment_id) REFERENCES shift_assignments(id)
);

-- 11. WorkLogs Table (Real-time Task Tracking)
CREATE TABLE IF NOT EXISTS worklogs (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    project_id VARCHAR(50) NOT NULL,
    task_id VARCHAR(50),
    task_content TEXT,
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    duration_hours REAL,
    actual_cost REAL,
    actual_revenue REAL,
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS' CHECK(status IN ('IN_PROGRESS', 'DONE')),
    standard_hours REAL DEFAULT 0,
    ot_hours REAL DEFAULT 0,
    location_multiplier REAL DEFAULT 1.0,
    ot_multiplier REAL DEFAULT 1.0,
    holiday_multiplier REAL DEFAULT 1.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- 12. Payroll Multiplier Rules
CREATE TABLE IF NOT EXISTS payroll_multiplier_rules (
  id VARCHAR(50) PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  day_type VARCHAR(30) NOT NULL,
  segment_type VARCHAR(50) NOT NULL,
  multiplier REAL NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT 1,
  effective_from DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 13. Holiday Calendar
CREATE TABLE IF NOT EXISTS holiday_calendar (
  id VARCHAR(50) PRIMARY KEY,
  holiday_date DATE NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  day_type VARCHAR(30) NOT NULL,
  is_paid_day BOOLEAN NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_worklogs_user_id ON worklogs(user_id);
CREATE INDEX IF NOT EXISTS idx_worklogs_status ON worklogs(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_attendance_records_user_date ON attendance_records(user_id, work_date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_status ON attendance_records(status);

SET FOREIGN_KEY_CHECKS=1;

-- ============================================================
-- DEFAULT SEED DATA
-- ============================================================

-- Safety: Add missing columns on existing production databases
-- (These are no-ops if columns already exist)
ALTER TABLE shift_templates ADD COLUMN IF NOT EXISTS location_type VARCHAR(20) NOT NULL DEFAULT 'WORKSHOP';
ALTER TABLE shift_templates ADD COLUMN IF NOT EXISTS checkin_early_minutes INT NOT NULL DEFAULT 30;
ALTER TABLE shift_templates ADD COLUMN IF NOT EXISTS checkin_late_minutes INT NOT NULL DEFAULT 120;
ALTER TABLE shift_templates ADD COLUMN IF NOT EXISTS late_grace_minutes INT NOT NULL DEFAULT 5;
ALTER TABLE shift_templates ADD COLUMN IF NOT EXISTS checkout_grace_minutes INT NOT NULL DEFAULT 5;
ALTER TABLE shift_templates ADD COLUMN IF NOT EXISTS requires_assignment BOOLEAN NOT NULL DEFAULT 1;
ALTER TABLE holiday_calendar ADD COLUMN IF NOT EXISTS is_paid_day BOOLEAN NOT NULL DEFAULT 1;
ALTER TABLE payroll_multiplier_rules ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT 1;
ALTER TABLE payroll_multiplier_rules ADD COLUMN IF NOT EXISTS segment_type VARCHAR(30) NULL;

-- Shift Templates (Ca làm việc mặc định)
INSERT IGNORE INTO shift_templates
  (id, code, name, start_time, end_time, break_minutes, base_multiplier, color,
   checkin_early_minutes, checkin_late_minutes, late_grace_minutes, checkout_grace_minutes,
   requires_assignment)
VALUES
  ('st_morning',   'MORNING',   'Ca Sáng',  '06:00:00', '14:00:00', 30, 1.0, 'amber',  30, 60, 10, 10, 1),
  ('st_afternoon', 'AFTERNOON', 'Ca Chiều', '14:00:00', '22:00:00', 30, 1.0, 'blue',   30, 60, 10, 10, 1),
  ('st_night',     'NIGHT',     'Ca Đêm',   '22:00:00', '06:00:00', 30, 1.3, 'purple', 30, 60, 10, 10, 1);

-- Payroll Multiplier Rules (Hệ số lương mặc định theo luật VN)
INSERT IGNORE INTO payroll_multiplier_rules
  (id, code, name, day_type, segment_type, multiplier, is_active, effective_from)
VALUES
  ('rule_ot_normal',  'OT_NORMAL',  'OT Ngày Thường',      'NORMAL_WORKDAY',  'OVERTIME', 1.5,  1, '2026-01-01'),
  ('rule_ot_rest',    'OT_REST',    'OT Ngày Nghỉ Tuần',   'WEEKLY_REST_DAY', 'OVERTIME', 2.0,  1, '2026-01-01'),
  ('rule_ot_holiday', 'OT_HOLIDAY', 'OT Ngày Lễ',          'PUBLIC_HOLIDAY',  'OVERTIME', 3.0,  1, '2026-01-01'),
  ('rule_night',      'NIGHT',      'Phụ cấp Ca Đêm',      'NORMAL_WORKDAY',  'NIGHT',    1.3,  1, '2026-01-01'),
  ('rule_night_rest', 'NIGHT_REST', 'Đêm Ngày Nghỉ Tuần',  'WEEKLY_REST_DAY', 'NIGHT',    1.95, 1, '2026-01-01');

-- Holiday Calendar 2026 (Lịch ngày lễ Việt Nam)
INSERT IGNORE INTO holiday_calendar (id, holiday_date, name, day_type, is_paid_day)
VALUES
  ('hol_20260101', '2026-01-01', 'Tết Dương lịch',              'PUBLIC_HOLIDAY', 1),
  ('hol_20260216', '2026-02-16', 'Tết Nguyên đán (29 Tết)',      'PUBLIC_HOLIDAY', 1),
  ('hol_20260217', '2026-02-17', 'Tết Nguyên đán (Mùng 1)',      'PUBLIC_HOLIDAY', 1),
  ('hol_20260218', '2026-02-18', 'Tết Nguyên đán (Mùng 2)',      'PUBLIC_HOLIDAY', 1),
  ('hol_20260219', '2026-02-19', 'Tết Nguyên đán (Mùng 3)',      'PUBLIC_HOLIDAY', 1),
  ('hol_20260220', '2026-02-20', 'Tết Nguyên đán (Mùng 4)',      'PUBLIC_HOLIDAY', 1),
  ('hol_20260221', '2026-02-21', 'Tết Nguyên đán (Mùng 5)',      'PUBLIC_HOLIDAY', 1),
  ('hol_20260426', '2026-04-26', 'Giỗ tổ Hùng Vương',            'PUBLIC_HOLIDAY', 1),
  ('hol_20260430', '2026-04-30', 'Giải phóng miền Nam',           'PUBLIC_HOLIDAY', 1),
  ('hol_20260501', '2026-05-01', 'Ngày Quốc tế Lao động',        'PUBLIC_HOLIDAY', 1),
  ('hol_20260902', '2026-09-02', 'Ngày Quốc khánh',              'PUBLIC_HOLIDAY', 1),
  ('hol_20260903', '2026-09-03', 'Ngày Quốc khánh (bù)',         'PUBLIC_HOLIDAY', 1);
