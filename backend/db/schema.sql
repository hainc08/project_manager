-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('ADMIN', 'ACCOUNTANT', 'STAFF')),
    contract_type TEXT NOT NULL DEFAULT 'FULLTIME' CHECK(contract_type IN ('FULLTIME', 'PARTTIME', 'FREELANCER')),
    standard_rate REAL NOT NULL DEFAULT 0.00,
    billing_rate REAL NOT NULL DEFAULT 0.00,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    project_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'COMPLETED', 'ON_HOLD')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- WorkLogs Table (Real-time Tracking)
CREATE TABLE IF NOT EXISTS worklogs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    task_content TEXT,
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    duration_hours REAL,
    actual_cost REAL,
    actual_revenue REAL,
    status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK(status IN ('IN_PROGRESS', 'DONE')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_worklogs_user_id ON worklogs(user_id);
CREATE INDEX IF NOT EXISTS idx_worklogs_project_id ON worklogs(project_id);
CREATE INDEX IF NOT EXISTS idx_worklogs_status ON worklogs(status);
CREATE INDEX IF NOT EXISTS idx_worklogs_start_time ON worklogs(start_time);
