-- SEED SQL FOR PRODUCTION (MAT BAO SERVER)
-- Password for all users: 123456

SET FOREIGN_KEY_CHECKS = 0;

-- Clean existing data
DELETE FROM worklogs;
DELETE FROM tasks;
DELETE FROM project_item_mapping;
DELETE FROM project_items;
DELETE FROM projects;
DELETE FROM attendance;
DELETE FROM users;

-- 1. Create Users
-- Hash for '123456'
INSERT INTO users (id, username, password_hash, full_name, role, contract_type, standard_rate, billing_rate) VALUES 
('u_admin', 'admin', '$2a$10$UHWCTljnrbd5O0S0hL5rKem8OQvfSc7ijdS9GUUUWOhT6p4qC.1VS', 'Nguyễn Văn Quản Đốc', 'ADMIN', 'FULLTIME', 250000, 500000),
('u_acc', 'ktoan', '$2a$10$UHWCTljnrbd5O0S0hL5rKem8OQvfSc7ijdS9GUUUWOhT6p4qC.1VS', 'Trần Thị Kế Toán', 'ACCOUNTANT', 'FULLTIME', 150000, 250000),
('u_cnc1', 'thocnc1', '$2a$10$UHWCTljnrbd5O0S0hL5rKem8OQvfSc7ijdS9GUUUWOhT6p4qC.1VS', 'Lê Văn CNC (Bậc 5/7)', 'STAFF', 'FULLTIME', 120000, 220000),
('u_cnc2', 'thocnc2', '$2a$10$UHWCTljnrbd5O0S0hL5rKem8OQvfSc7ijdS9GUUUWOhT6p4qC.1VS', 'Hoàng Văn Tiện', 'STAFF', 'FULLTIME', 110000, 200000),
('u_nguoi1', 'thonguoi', '$2a$10$UHWCTljnrbd5O0S0hL5rKem8OQvfSc7ijdS9GUUUWOhT6p4qC.1VS', 'Phạm Văn Nguội (Lắp ráp)', 'STAFF', 'FULLTIME', 100000, 180000);

-- 2. Create Project Items
INSERT INTO project_items (id, name, description) VALUES 
('i_design', 'Thiết kế 3D & CAM', 'Thiết kế kỹ thuật và lập trình đường chạy dao CNC'),
('i_cnc_rough', 'Gia công phay thô CNC', 'Phay phá khối thép phôi'),
('i_edm', 'Gia công xung điện EDM/Cắt dây', 'Gia công các chi tiết hốc sâu và khe hẹp'),
('i_heat', 'Nhiệt luyện thép', 'Tôi chân không để đạt độ cứng HRC 52-55'),
('i_polish', 'Mài bóng & Đánh bóng', 'Xử lý bề mặt lòng khuôn đạt độ bóng gương'),
('i_assembly', 'Lắp ráp & Căn chỉnh', 'Lắp vỏ khuôn, hệ thống đẩy và thử kín');

-- 3. Create Projects
INSERT INTO projects (id, project_name, location_type, status) VALUES 
('p_001', 'Khuôn đúc vỏ động cơ xe máy (SKD61)', 'SITE', 'ACTIVE'),
('p_002', 'Khuôn dập chậu rửa Inox (D2)', 'WORKSHOP', 'ACTIVE'),
('p_003', 'Sửa chữa bộ khuôn đúc nắp máy (Dự án khẩn)', 'WORKSHOP', 'ACTIVE');

-- 4. Mapping Stages to Projects
INSERT INTO project_item_mapping (project_id, item_id) VALUES 
('p_001', 'i_design'), ('p_001', 'i_cnc_rough'), ('p_001', 'i_heat'), ('p_001', 'i_polish'),
('p_002', 'i_design'), ('p_002', 'i_cnc_rough'), ('p_002', 'i_assembly'),
('p_003', 'i_edm'), ('p_003', 'i_assembly');

-- 5. Create Sample Tasks
INSERT INTO tasks (id, project_id, project_item_id, assigned_to, title, status) VALUES 
('t_1', 'p_001', 'i_cnc_rough', 'u_cnc1', 'Phay thô lòng khuôn A (Mặt Cavity)', 'DOING'),
('t_2', 'p_001', 'i_design', 'u_admin', 'Thiết kế hệ thống kênh dẫn nhựa', 'DONE');

SET FOREIGN_KEY_CHECKS = 1;
