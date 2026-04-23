-- DỮ LIỆU MẪU NGÀNH KHUÔN ĐÚC (Mật khẩu mặc định: 123456)
-- Bcrypt hash của "123456": $2a$10$8K1p/e0qY9e0Rf3bRMqVSOe0cwvBWThecm0gN7o/UDP6dMGCkMm

SET FOREIGN_KEY_CHECKS=0;

-- 1. Nạp Danh sách Nhân sự chuyên môn
INSERT IGNORE INTO users (id, username, password_hash, full_name, role, contract_type, standard_rate, billing_rate) VALUES
('u_admin', 'admin', '$2a$10$8K1p/e0qY9e0Rf3bRMqVSOe0cwvBWThecm0gN7o/UDP6dMGCkMm', 'Nguyễn Văn Quản Đốc', 'ADMIN', 'FULLTIME', 250000, 500000),
('u_acc', 'ktoan', '$2a$10$8K1p/e0qY9e0Rf3bRMqVSOe0cwvBWThecm0gN7o/UDP6dMGCkMm', 'Trần Thị Kế Toán', 'ACCOUNTANT', 'FULLTIME', 150000, 250000),
('u_cnc1', 'thocnc1', '$2a$10$8K1p/e0qY9e0Rf3bRMqVSOe0cwvBWThecm0gN7o/UDP6dMGCkMm', 'Lê Văn CNC (Bậc 5/7)', 'STAFF', 'FULLTIME', 120000, 220000),
('u_cnc2', 'thocnc2', '$2a$10$8K1p/e0qY9e0Rf3bRMqVSOe0cwvBWThecm0gN7o/UDP6dMGCkMm', 'Hoàng Văn Tiện', 'STAFF', 'FULLTIME', 110000, 200000),
('u_nguoi1', 'thonguoi', '$2a$10$8K1p/e0qY9e0Rf3bRMqVSOe0cwvBWThecm0gN7o/UDP6dMGCkMm', 'Phạm Văn Nguội (Lắp ráp)', 'STAFF', 'FULLTIME', 100000, 180000);

-- 2. Nạp Danh mục Công đoạn (Project Items)
INSERT IGNORE INTO project_items (id, name, description) VALUES
('i_design', 'Thiết kế 3D & CAM', 'Thiết kế kỹ thuật và lập trình đường chạy dao CNC'),
('i_cnc_rough', 'Gia công phay thô CNC', 'Phay phá khối thép phôi'),
('i_edm', 'Gia công xung điện EDM/Cắt dây', 'Gia công các chi tiết hốc sâu và khe hẹp'),
('i_heat', 'Nhiệt luyện thép', 'Tôi chân không để đạt độ cứng HRC 52-55'),
('i_polish', 'Mài bóng & Đánh bóng', 'Xử lý bề mặt lòng khuôn đạt độ bóng gương'),
('i_assembly', 'Lắp ráp & Căn chỉnh', 'Lắp vỏ khuôn, hệ thống đẩy và thử kín');

-- 3. Nạp Danh sách Dự án (Đơn hàng khuôn)
INSERT IGNORE INTO projects (id, project_name, location_type, status) VALUES
('p_001', 'Khuôn đúc vỏ động cơ xe máy (SKD61)', 'SITE', 'ACTIVE'),
('p_002', 'Khuôn dập chậu rửa Inox (D2)', 'WORKSHOP', 'ACTIVE'),
('p_003', 'Sửa chữa bộ khuôn đúc nắp máy (Dự án khẩn)', 'WORKSHOP', 'ACTIVE');

-- 4. Liên kết Công đoạn vào Dự án (Mapping)
INSERT IGNORE INTO project_item_mapping (project_id, item_id) VALUES
('p_001', 'i_design'), ('p_001', 'i_cnc_rough'), ('p_001', 'i_heat'), ('p_001', 'i_polish'),
('p_002', 'i_design'), ('p_002', 'i_cnc_rough'), ('p_002', 'i_assembly'),
('p_003', 'i_edm'), ('p_003', 'i_assembly');

-- 5. Nạp các Công việc mẫu (Tasks)
INSERT IGNORE INTO tasks (id, project_id, project_item_id, assigned_to, title, status) VALUES
('t_1', 'p_001', 'i_cnc_rough', 'u_cnc1', 'Phay thô lòng khuôn A (Mặt Cavity)', 'DOING'),
('t_2', 'p_001', 'i_design', 'u_admin', 'Thiết kế hệ thống kênh dẫn nhựa', 'DONE');

SET FOREIGN_KEY_CHECKS=1;
