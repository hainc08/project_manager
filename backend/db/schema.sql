-- Disable foreign key checks temporarily in case of existing tables dropping/recreating
SET FOREIGN_KEY_CHECKS=0;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK(role IN ('ADMIN', 'ACCOUNTANT', 'STAFF')),
    contract_type VARCHAR(20) NOT NULL DEFAULT 'FULLTIME' CHECK(contract_type IN ('FULLTIME', 'PARTTIME', 'FREELANCER')),
    standard_rate REAL NOT NULL DEFAULT 0.00,
    billing_rate REAL NOT NULL DEFAULT 0.00,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(50) PRIMARY KEY,
    project_name VARCHAR(255) NOT NULL,
    location_type VARCHAR(20) NOT NULL DEFAULT 'WORKSHOP' CHECK(location_type IN ('WORKSHOP', 'SITE')),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'COMPLETED', 'ON_HOLD')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Project Items Table (Global Categories)
CREATE TABLE IF NOT EXISTS project_items (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Project Item Mapping (Linking projects to multiple items)
CREATE TABLE IF NOT EXISTS project_item_mapping (
    project_id VARCHAR(50) NOT NULL,
    item_id VARCHAR(50) NOT NULL,
    PRIMARY KEY (project_id, item_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES project_items(id) ON DELETE CASCADE
);

-- Tasks Table (Assigned work)
CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(50) PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL,
    project_item_id VARCHAR(50), -- Link to specific project category/item
    assigned_to VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'TODO' CHECK(status IN ('TODO', 'DOING', 'FINISHED_BY_STAFF', 'DONE', 'CANCELLED')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (project_item_id) REFERENCES project_items(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
);

-- WorkLogs Table (Real-time Tracking)
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

-- Attendance Table (Daily presence)
CREATE TABLE IF NOT EXISTS attendance (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    check_in DATETIME NOT NULL,
    check_out DATETIME,
    duration_hours REAL,
    status VARCHAR(20) NOT NULL DEFAULT 'PRESENT',
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_worklogs_user_id ON worklogs(user_id);
CREATE INDEX IF NOT EXISTS idx_worklogs_project_id ON worklogs(project_id);
CREATE INDEX IF NOT EXISTS idx_worklogs_status ON worklogs(status);
CREATE INDEX IF NOT EXISTS idx_worklogs_start_time ON worklogs(start_time);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_check_in ON attendance(check_in);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_worklogs_task_id ON worklogs(task_id);

SET FOREIGN_KEY_CHECKS=1;
