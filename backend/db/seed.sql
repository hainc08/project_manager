-- Seed Users (password: "123456" for all)
-- bcrypt hash of "123456": $2a$10$8K1p/e0qY9e0Rf3bRMqVSOe0cwvBWThecm0gN7o/UDP6dM\GCkMm

INSERT OR IGNORE INTO users (id, username, password_hash, full_name, role, contract_type, standard_rate, billing_rate) VALUES
('u1', 'admin', '$2a$10$8K1p/e0qY9e0Rf3bRMqVSOe0cwvBWThecm0gN7o/UDP6dMGCkMm', 'Nguyen Van Admin', 'ADMIN', 'FULLTIME', 150000, 300000),
('u2', 'accountant', '$2a$10$8K1p/e0qY9e0Rf3bRMqVSOe0cwvBWThecm0gN7o/UDP6dMGCkMm', 'Tran Thi Ke Toan', 'ACCOUNTANT', 'FULLTIME', 120000, 200000),
('u3', 'staff1', '$2a$10$8K1p/e0qY9e0Rf3bRMqVSOe0cwvBWThecm0gN7o/UDP6dMGCkMm', 'Le Van Nhan Vien', 'STAFF', 'FULLTIME', 80000, 150000),
('u4', 'staff2', '$2a$10$8K1p/e0qY9e0Rf3bRMqVSOe0cwvBWThecm0gN7o/UDP6dMGCkMm', 'Pham Thi Cong Nhan', 'STAFF', 'PARTTIME', 60000, 120000);

-- Seed Projects
INSERT OR IGNORE INTO projects (id, project_name, status) VALUES
('p1', 'Website Redesign - Kosumi', 'ACTIVE'),
('p2', 'Mobile App Development', 'ACTIVE'),
('p3', 'Database Migration', 'ON_HOLD');

-- Seed some completed WorkLogs for reports
INSERT OR IGNORE INTO worklogs (id, user_id, project_id, task_content, start_time, end_time, duration_hours, actual_cost, actual_revenue, status) VALUES
('w1', 'u3', 'p1', 'Thiết kế trang chủ', '2026-04-10 08:00:00', '2026-04-10 12:00:00', 4.00, 320000, 600000, 'DONE'),
('w2', 'u3', 'p1', 'Code responsive layout', '2026-04-10 13:00:00', '2026-04-10 17:30:00', 4.50, 360000, 675000, 'DONE'),
('w3', 'u4', 'p2', 'Setup React Native project', '2026-04-11 09:00:00', '2026-04-11 14:00:00', 5.00, 300000, 600000, 'DONE'),
('w4', 'u3', 'p2', 'Thiết kế UI Login', '2026-04-12 08:30:00', '2026-04-12 11:30:00', 3.00, 240000, 450000, 'DONE'),
('w5', 'u4', 'p1', 'Tối ưu hình ảnh', '2026-04-12 13:00:00', '2026-04-12 16:00:00', 3.00, 180000, 360000, 'DONE'),
('w6', 'u3', 'p1', 'Kiểm thử cross-browser', '2026-04-13 08:00:00', '2026-04-13 12:00:00', 4.00, 320000, 600000, 'DONE'),
('w7', 'u4', 'p2', 'Phát triển màn hình Dashboard', '2026-04-13 09:00:00', '2026-04-13 15:00:00', 6.00, 360000, 720000, 'DONE'),
('w8', 'u3', 'p2', 'API integration', '2026-04-14 08:00:00', '2026-04-14 16:00:00', 8.00, 640000, 1200000, 'DONE');
