-- Final Clean Production Dump
SET FOREIGN_KEY_CHECKS = 0;

-- --------------------------------------------------------
-- ホスト:                          127.0.0.1
-- サーバーのバージョン:                   12.2.2-MariaDB - MariaDB Server
-- サーバー OS:                      Win64
-- HeidiSQL バージョン:               12.17.0.7270
-- --------------------------------------------------------


-- テーブル labor_management.attendance: ~3 rows (約) のデータをダンプしています

-- テーブル labor_management.attendance_events: ~0 rows (約) のデータをダンプしています

-- テーブル labor_management.attendance_records: ~9 rows (約) のデータをダンプしています

-- テーブル labor_management.customers: ~2 rows (約) のデータをダンプしています

-- テーブル labor_management.holiday_calendar: ~12 rows (約) のデータをダンプしています

-- テーブル labor_management.payroll_adjustments: ~0 rows (約) のデータをダンプしています

-- テーブル labor_management.payroll_employee_items: ~6 rows (約) のデータをダンプしています

-- テーブル labor_management.payroll_multiplier_rules: ~5 rows (約) のデータをダンプしています

-- テーブル labor_management.payroll_runs: ~2 rows (約) のデータをダンプしています

-- テーブル labor_management.project_item_mapping: ~9 rows (約) のデータをダンプしています

-- テーブル labor_management.project_items: ~7 rows (約) のデータをダンプしています

-- テーブル labor_management.projects: ~3 rows (約) のデータをダンプしています

-- テーブル labor_management.quotation_activities: ~0 rows (約) のデータをダンプしています

-- テーブル labor_management.quotation_items: ~3 rows (約) のデータをダンプしています

-- テーブル labor_management.quotations: ~0 rows (約) のデータをダンプしています

-- テーブル labor_management.salary_profiles: ~3 rows (約) のデータをダンプしています

-- テーブル labor_management.shift_assignments: ~9 rows (約) のデータをダンプしています

-- テーブル labor_management.shift_instances: ~12 rows (約) のデータをダンプしています

-- テーブル labor_management.shift_templates: ~3 rows (約) のデータをダンプしています

-- テーブル labor_management.tasks: ~8 rows (約) のデータをダンプしています

-- テーブル labor_management.users: ~5 rows (約) のデータをダンプしています

-- テーブル labor_management.work_segments: ~0 rows (約) のデータをダンプしています

-- テーブル labor_management.worklogs: ~13 rows (約) のデータをダンプしています




-- DATA SECTION --

INSERT INTO `attendance` (`id`, `user_id`, `check_in`, `check_out`, `duration_hours`, `status`, `note`, `created_at`) VALUES
	('46bd1ca5-c44f-476b-8b06-5890212599fb', 'u_nguoi1', '2026-05-06 14:45:31', '2026-05-07 11:26:11', 20.68, 'PRESENT', NULL, '2026-05-06 14:45:31'),
	('62845058-29f2-4c16-8035-1eed4d4ae094', 'u_nguoi1', '2026-05-07 11:26:12', NULL, NULL, 'PRESENT', NULL, '2026-05-07 11:26:12'),
	('att_u_cnc2_20260506', 'u_cnc2', '2026-05-06 08:02:00', '2026-05-06 15:17:59', 7.27, 'PRESENT', NULL, '2026-05-06 13:01:18'),
	('att_u_nguoi1_20260506', 'u_nguoi1', '2026-05-06 08:10:00', '2026-05-06 17:00:00', 8.83, 'PRESENT', NULL, '2026-05-06 13:01:18'),
	('fd91118b-0e6e-4218-bb89-40818f3badad', 'u_cnc2', '2026-05-07 11:24:12', NULL, NULL, 'PRESENT', NULL, '2026-05-07 11:24:12');

INSERT INTO `attendance_events` (`id`, `user_id`, `event_type`, `event_at`, `source`, `device_id`, `shift_instance_id`, `metadata`, `created_at`) VALUES
	('6ab59f52-8f77-4107-9133-e409b3f27cde', 'u_nguoi1', 'CHECK_IN', '2026-05-07 11:26:12', 'WEB', NULL, NULL, NULL, '2026-05-07 11:26:12'),
	('a1ed3d09-6656-42d3-ac96-c7b8fd7fcf6b', 'u_cnc2', 'CHECK_IN', '2026-05-07 11:24:12', 'WEB', NULL, NULL, NULL, '2026-05-07 11:24:12'),
	('c1d9b8ef-12d9-496a-baf8-d46c85cb83be', 'u_nguoi1', 'CHECK_OUT', '2026-05-07 11:26:11', 'WEB', NULL, NULL, NULL, '2026-05-07 11:26:11');

INSERT INTO `attendance_records` (`id`, `user_id`, `shift_instance_id`, `shift_assignment_id`, `work_date`, `check_in_at`, `check_out_at`, `regular_minutes`, `overtime_minutes`, `night_minutes`, `late_minutes`, `early_leave_minutes`, `break_minutes`, `total_work_minutes`, `status`, `location_type`, `payroll_status`, `requires_review`, `review_reason`, `created_at`, `updated_at`) VALUES
	('35a81be6-e1ce-4f68-9768-1dce31db0687', 'u_nguoi1', NULL, NULL, '2026-05-07', '2026-05-07 11:26:12', NULL, 0, 0, 0, 0, 0, 0, 0, 'ON_TIME', 'WORKSHOP', 'DRAFT', 0, NULL, '2026-05-07 11:26:12', '2026-05-07 11:26:12'),
	('46bd1ca5-c44f-476b-8b06-5890212599fb', 'u_nguoi1', NULL, NULL, '2026-05-06', '2026-05-06 14:45:31', '2026-05-07 11:26:11', 1241, 0, 0, 0, 0, 0, 1241, 'COMPLETED', 'WORKSHOP', 'DRAFT', 0, NULL, '2026-05-06 17:17:01', '2026-05-06 17:17:01'),
	('6c27cd0f-b66e-491a-bca8-94e9d3f828ae', 'u_cnc2', NULL, NULL, '2026-05-07', '2026-05-07 11:24:12', NULL, 0, 0, 0, 0, 0, 0, 0, 'ON_TIME', 'WORKSHOP', 'DRAFT', 0, NULL, '2026-05-07 11:24:12', '2026-05-07 11:24:12'),
	('ar_m0_20260504', 'u_cnc1', 'si_MORNING_20260504', 'sa_m0_20260504', '2026-05-04', '2026-05-03 23:03:00', '2026-05-04 07:00:00', 477, 0, 0, 0, 0, 0, 477, 'ON_TIME', 'WORKSHOP', 'APPROVED', 0, NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18'),
	('ar_m0_20260505', 'u_cnc1', 'si_MORNING_20260505', 'sa_m0_20260505', '2026-05-05', '2026-05-04 23:03:00', '2026-05-05 07:00:00', 477, 0, 0, 0, 0, 0, 477, 'ON_TIME', 'WORKSHOP', 'APPROVED', 0, NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18'),
	('ar_m0_20260506', 'u_cnc1', 'si_MORNING_20260506', 'sa_m0_20260506', '2026-05-06', '2026-05-05 23:03:00', '2026-05-06 07:00:00', 477, 0, 0, 0, 0, 0, 477, 'ON_TIME', 'WORKSHOP', 'APPROVED', 0, NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18'),
	('ar_m1_20260504', 'u_cnc2', 'si_MORNING_20260504', 'sa_m1_20260504', '2026-05-04', '2026-05-03 23:14:00', '2026-05-04 07:00:00', 466, 0, 0, 9, 0, 0, 466, 'LATE', 'WORKSHOP', 'APPROVED', 0, NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18'),
	('ar_m1_20260505', 'u_cnc2', 'si_MORNING_20260505', 'sa_m1_20260505', '2026-05-05', '2026-05-04 23:14:00', '2026-05-05 07:00:00', 466, 0, 0, 9, 0, 0, 466, 'LATE', 'WORKSHOP', 'APPROVED', 0, NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18'),
	('ar_m1_20260506', 'u_cnc2', 'si_MORNING_20260506', 'sa_m1_20260506', '2026-05-06', '2026-05-05 23:14:00', '2026-05-06 07:00:00', 466, 0, 0, 9, 0, 0, 466, 'LATE', 'WORKSHOP', 'APPROVED', 0, NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18'),
	('ar_m2_20260504', 'u_nguoi1', 'si_MORNING_20260504', 'sa_m2_20260504', '2026-05-04', '2026-05-03 22:58:00', '2026-05-04 08:32:00', 482, 92, 0, 0, 0, 0, 574, 'ON_TIME', 'WORKSHOP', 'APPROVED', 0, NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18'),
	('ar_m2_20260505', 'u_nguoi1', 'si_MORNING_20260505', 'sa_m2_20260505', '2026-05-05', '2026-05-04 22:58:00', '2026-05-05 08:32:00', 482, 92, 0, 0, 0, 0, 574, 'ON_TIME', 'WORKSHOP', 'APPROVED', 0, NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18'),
	('ar_m2_20260506', 'u_nguoi1', 'si_MORNING_20260506', 'sa_m2_20260506', '2026-05-06', '2026-05-05 22:58:00', '2026-05-06 08:32:00', 482, 92, 0, 0, 0, 0, 574, 'ON_TIME', 'WORKSHOP', 'APPROVED', 0, NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18');

INSERT INTO `customers` (`id`, `company_name`, `contact_name`, `phone`, `email`, `address`, `tax_code`, `source`, `note`, `created_by`, `created_at`, `updated_at`) VALUES
	('d93006bf-bcb4-4ad1-b8e5-e48438c011d6', 'Cty TNHH Cơ Khí Hải Nam (Test)', 'Anh Nam', '0912345678', 'nam@hainam.com', 'KCN Bắc Thăng Long', NULL, 'other', NULL, NULL, '2026-04-29 09:28:23', '2026-04-29 09:28:23'),
	('edd447c5-e74d-4e73-82fe-87c6ef81eaf2', 'Cty TNHH Cơ Khí Hải Nam (Test)', 'Anh Nam', '0912345678', 'nam@hainam.com', 'KCN Bắc Thăng Long', NULL, 'other', NULL, NULL, '2026-04-29 09:28:49', '2026-04-29 09:28:49');

INSERT INTO `holiday_calendar` (`id`, `holiday_date`, `name`, `day_type`, `default_multiplier`, `is_paid_day`, `note`, `created_at`, `updated_at`) VALUES
	('hol_20260101', '2026-01-01', 'Tết Dương lịch', 'PUBLIC_HOLIDAY', 1.5, 1, NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18'),
	('hol_20260216', '2026-02-16', 'Tết Nguyên đán (29 Tết)', 'PUBLIC_HOLIDAY', 1.5, 1, NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18'),
	('hol_20260217', '2026-02-17', 'Mùng 1 Tết', 'PUBLIC_HOLIDAY', 1.5, 1, NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18'),
	('hol_20260218', '2026-02-18', 'Mùng 2 Tết', 'PUBLIC_HOLIDAY', 1.5, 1, NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18'),
	('hol_20260219', '2026-02-19', 'Mùng 3 Tết', 'PUBLIC_HOLIDAY', 1.5, 1, NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18'),
	('hol_20260220', '2026-02-20', 'Mùng 4 Tết', 'PUBLIC_HOLIDAY', 1.5, 1, NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18'),
	('hol_20260221', '2026-02-21', 'Mùng 5 Tết', 'PUBLIC_HOLIDAY', 1.5, 1, NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18'),
	('hol_20260426', '2026-04-26', 'Giỗ tổ Hùng Vương', 'PUBLIC_HOLIDAY', 1.5, 1, NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18'),
	('hol_20260430', '2026-04-30', 'Giải phóng miền Nam', 'PUBLIC_HOLIDAY', 1.5, 1, NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18'),
	('hol_20260501', '2026-05-01', 'Ngày Quốc tế Lao động', 'PUBLIC_HOLIDAY', 1.5, 1, NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18'),
	('hol_20260902', '2026-09-02', 'Ngày Quốc khánh', 'PUBLIC_HOLIDAY', 1.5, 1, NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18'),
	('hol_20260903', '2026-09-03', 'Quốc khánh (bổ sung)', 'PUBLIC_HOLIDAY', 1.5, 1, NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18');

INSERT INTO `payroll_employee_items` (`id`, `payroll_run_id`, `employee_id`, `salary_profile_id`, `employee_name_snapshot`, `employee_role_snapshot`, `salary_type`, `base_salary_snapshot`, `standard_work_days`, `expected_work_days`, `payable_days`, `full_days`, `partial_days`, `paid_leave_days`, `unpaid_leave_days`, `absent_unapproved_days`, `late_count`, `early_leave_count`, `standard_work_minutes`, `actual_work_minutes`, `paid_standard_minutes`, `ot_minutes_150`, `ot_minutes_200`, `ot_minutes_300`, `night_minutes`, `night_ot_minutes`, `base_amount`, `ot_amount`, `night_amount`, `bonus_amount`, `deduction_amount`, `final_amount`, `payroll_status`, `warning_flags`, `created_at`, `updated_at`, `daily_statuses`) VALUES
	('item_run_2026_03_u_cnc1', 'run_2026_03', 'u_cnc1', NULL, 'Lê Văn CNC (Bậc 5/7)', NULL, 'monthly', 7400000.00, 22.00, 22.00, 22.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0, 0, 0, 10620, 0, 60, 0, 0, 0, 0, 7400000.00, 63068.18, 0.00, 200000.00, 0.00, 7663068.18, 'full', NULL, '2026-04-29 07:54:25', '2026-04-29 07:54:25', '[{"date":"2026-2026-01","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-02","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-03","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-04","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-05","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-06","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-07","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-08","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-09","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-10","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-11","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-12","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-13","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-14","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-15","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-16","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-17","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-18","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-19","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-20","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-21","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-22","status":"ok","tooltip":"Đúng giờ"}]'),
	('item_run_2026_03_u_cnc2', 'run_2026_03', 'u_cnc2', NULL, 'Hoàng Văn Tiện', NULL, 'monthly', 5100000.00, 22.00, 22.00, 15.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0, 0, 0, 7200, 0, 0, 0, 0, 0, 0, 3477272.73, 0.00, 0.00, 0.00, 0.00, 3477272.73, 'partial', NULL, '2026-04-29 07:54:25', '2026-04-29 07:54:25', '[{"date":"2026-2026-01","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-02","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-03","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-04","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-05","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-06","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-07","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-08","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-09","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-10","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-11","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-12","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-13","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-14","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-15","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-20","status":"absent","tooltip":"Vắng không phép"}]'),
	('item_run_2026_03_u_nguoi1', 'run_2026_03', 'u_nguoi1', NULL, 'Phạm Văn Nguội (Lắp ráp)', NULL, 'monthly', 8700000.00, 22.00, 22.00, 22.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0, 0, 0, 10680, 0, 120, 0, 0, 0, 0, 8700000.00, 148295.45, 0.00, 500000.00, 0.00, 9348295.45, 'full', NULL, '2026-04-29 07:54:25', '2026-04-29 07:54:25', '[{"date":"2026-2026-01","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-02","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-03","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-04","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-05","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-06","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-07","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-08","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-09","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-10","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-11","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-12","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-13","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-14","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-15","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-16","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-17","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-18","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-19","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-20","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-21","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-22","status":"ok","tooltip":"Đúng giờ"}]'),
	('item_run_2026_04_u_cnc1', 'run_2026_04', 'u_cnc1', NULL, 'Lê Văn CNC (Bậc 5/7)', NULL, 'monthly', 7400000.00, 22.00, 22.00, 20.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0, 0, 0, 9600, 0, 0, 0, 0, 0, 0, 6727272.73, 0.00, 0.00, 0.00, 164000.00, 6563272.73, 'full', NULL, '2026-04-29 07:54:25', '2026-04-29 07:54:25', '[{"date":"2026-2026-01","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-02","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-03","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-04","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-05","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-06","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-07","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-08","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-09","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-10","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-11","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-12","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-13","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-14","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-15","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-16","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-17","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-18","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-19","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-20","status":"ok","tooltip":"Đúng giờ"}]'),
	('item_run_2026_04_u_cnc2', 'run_2026_04', 'u_cnc2', NULL, 'Hoàng Văn Tiện', NULL, 'monthly', 5100000.00, 22.00, 22.00, 18.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0, 0, 0, 8820, 0, 180, 0, 0, 0, 0, 4172727.27, 130397.73, 0.00, 0.00, 680000.00, 3623125.00, 'partial', NULL, '2026-04-29 07:54:25', '2026-04-29 07:54:25', '[{"date":"2026-2026-01","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-02","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-03","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-04","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-05","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-06","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-07","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-08","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-09","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-10","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-11","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-12","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-13","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-14","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-15","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-16","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-17","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-18","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-20","status":"absent","tooltip":"Vắng không phép"}]'),
	('item_run_2026_04_u_nguoi1', 'run_2026_04', 'u_nguoi1', NULL, 'Phạm Văn Nguội (Lắp ráp)', NULL, 'monthly', 8700000.00, 22.00, 22.00, 21.50, 0.00, 0.00, 0.00, 0.00, 0.00, 0, 0, 0, 10710, 0, 390, 0, 0, 0, 0, 8502272.73, 481960.23, 0.00, 300000.00, 100000.00, 9184232.95, 'full', NULL, '2026-04-29 07:54:25', '2026-04-29 07:54:25', '[{"date":"2026-2026-01","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-02","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-03","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-04","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-05","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-06","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-07","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-08","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-09","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-10","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-11","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-12","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-13","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-14","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-15","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-16","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-17","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-18","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-19","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-20","status":"ok","tooltip":"Đúng giờ"},{"date":"2026-2026-21","status":"ok","tooltip":"Đúng giờ"}]');

INSERT INTO `payroll_multiplier_rules` (`id`, `code`, `name`, `day_type`, `segment_type`, `multiplier`, `minimum_legal_multiplier`, `is_default`, `is_active`, `effective_from`, `effective_to`, `created_at`, `updated_at`) VALUES
	('rule_hol', 'OT_PUBLIC_HOLIDAY', 'OT Ngày Lễ', 'PUBLIC_HOLIDAY', 'OT_PUBLIC_HOLIDAY', 1.5, 1.5, 0, 1, '2026-01-01', NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18'),
	('rule_night', 'NIGHT_REGULAR', 'Phụ cấp ca đêm', 'NORMAL_WORKDAY', 'NIGHT_REGULAR', 1.5, 1.5, 0, 1, '2026-01-01', NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18'),
	('rule_ot1', 'OT_NORMAL_DAY', 'Tăng ca 1 (17:15)', 'NORMAL_WORKDAY', 'OT_NORMAL_DAY', 1.5, 1.5, 0, 1, '2026-01-01', NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18'),
	('rule_ot2', 'OT_NIGHT', 'Tăng ca 2 (22:15)', 'NORMAL_WORKDAY', 'OT_NIGHT', 1.5, 1.5, 0, 1, '2026-01-01', NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18'),
	('rule_rest', 'OT_WEEKLY_REST', 'OT Ngày Nghỉ Tuần', 'WEEKLY_REST_DAY', 'OT_WEEKLY_REST', 1.5, 1.5, 0, 1, '2026-01-01', NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18');

INSERT INTO `payroll_runs` (`id`, `code`, `period_month`, `start_date`, `end_date`, `factory_id`, `department_id`, `status`, `standard_work_days`, `total_employees`, `total_work_minutes`, `total_base_amount`, `total_ot_amount`, `total_bonus_amount`, `total_deduction_amount`, `total_final_amount`, `warning_count`, `calculated_at`, `approved_by`, `approved_at`, `locked_by`, `locked_at`, `created_by`, `created_at`, `updated_at`) VALUES
	('run_2026_03', 'PR-2026-03', '2026-03', '2026-03-01', '2026-03-31', NULL, NULL, 'calculated', 22.00, 3, 28500, 19577272.73, 211363.63, 700000.00, 0.00, 20488636.36, 0, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-29 07:54:25', '2026-04-29 07:54:25'),
	('run_2026_04', 'PR-2026-04', '2026-04', '2026-04-01', '2026-04-30', NULL, NULL, 'calculated', 22.00, 3, 29130, 19402272.73, 612357.96, 300000.00, 944000.00, 19370630.68, 0, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-29 07:54:25', '2026-04-29 07:54:25');

INSERT INTO `project_item_mapping` (`project_id`, `item_id`) VALUES
	('p_001', 'i_cnc_rough'),
	('p_001', 'i_design'),
	('p_001', 'i_heat'),
	('p_001', 'i_polish'),
	('p_002', 'i_assembly'),
	('p_002', 'i_cnc_rough'),
	('p_002', 'i_design'),
	('p_003', 'i_assembly'),
	('p_003', 'i_edm');

INSERT INTO `project_items` (`id`, `name`, `description`, `created_at`) VALUES
	('i_assembly', 'Lắp ráp & Căn chỉnh', 'Lắp vỏ khuôn, hệ thống đẩy', '2026-05-06 13:01:18'),
	('i_cnc_rough', 'Gia công phay thô CNC', 'Phay phá khối thép phôi sa', '2026-05-06 13:01:18'),
	('i_design', 'Thiết kế 3D & CAM', 'Thiết kế kỹ thuật và lập trình CNC', '2026-05-06 13:01:18'),
	('i_edm', 'Gia công xung điện EDM', 'Gia công hốc sâu và khe hẹp', '2026-05-06 13:01:18'),
	('i_heat', 'Nhiệt luyện thép', 'Tôi chân không HRC 52-55', '2026-05-06 13:01:18'),
	('i_polish', 'Mài bóng & Đánh bóng', 'Xử lý bề mặt lòng khuôn', '2026-05-06 13:01:18');

INSERT INTO `projects` (`id`, `project_name`, `location_type`, `status`, `created_at`) VALUES
	('p_001', 'Khuôn đúc vỏ động cơ xe máy (SKD61)', 'SITE', 'ACTIVE', '2026-05-06 13:01:18'),
	('p_002', 'Khuôn dập chậu rửa Inox (D2)', 'WORKSHOP', 'ACTIVE', '2026-05-06 13:01:18'),
	('p_003', 'Sửa chữa bộ khuôn đúc nắp máy', 'WORKSHOP', 'ACTIVE', '2026-05-06 13:01:18');

INSERT INTO `quotation_items` (`id`, `quotation_id`, `group_name`, `group_order`, `item_order`, `description`, `item_type`, `quantity`, `unit`, `unit_price`, `total_price`, `category_id`, `note`, `created_at`) VALUES
	('19050b5f-c13b-4986-8887-1cf7c70dbf09', '7e26c823-178f-41c7-a380-d4c4cc7eafaf', 'I. Thiết kế', 0, 0, 'Thiết kế khuôn 3D', 'labor', 1.00, 'bộ', 15000000.00, 15000000.00, NULL, NULL, '2026-04-29 09:34:10'),
	('33755ea2-d703-4fda-b56c-38f24776e720', '7e26c823-178f-41c7-a380-d4c4cc7eafaf', 'I. Thiết kế', 0, 1, 'sắt', 'material', 3.00, 'kg', 2000.00, 6000.00, NULL, NULL, '2026-04-29 09:34:10'),
	('9db91ae1-ea8d-4137-b32e-c594399a41f2', '7e26c823-178f-41c7-a380-d4c4cc7eafaf', 'II. Vật tư', 0, 0, 'Thép SKD61', 'material', 150.00, 'kg', 120000.00, 18000000.00, NULL, NULL, '2026-04-29 09:34:10');

INSERT INTO `quotations` (`id`, `quote_number`, `customer_id`, `project_name`, `quantity_desc`, `subtotal`, `discount_percent`, `discount_amount`, `vat_percent`, `vat_amount`, `total_amount`, `internal_cost`, `margin_percent`, `payment_terms`, `delivery_days`, `valid_until`, `note`, `status`, `created_by`, `approved_by`, `approved_at`, `sent_at`, `converted_at`, `project_id`, `created_at`, `updated_at`) VALUES
	('7e26c823-178f-41c7-a380-d4c4cc7eafaf', 'BG-2604-001', 'edd447c5-e74d-4e73-82fe-87c6ef81eaf2', 'Thiết kế & Gia công khuôn đúc vỏ động cơ', NULL, 33006000.00, 5.00, 0.00, 10.00, 0.00, 0.00, 0.00, 0.00, '50_50', 30, NULL, NULL, 'DRAFT', NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-29 09:28:49', '2026-04-29 09:34:10');

INSERT INTO `salary_profiles` (`id`, `employee_id`, `salary_type`, `base_salary`, `standard_work_days`, `standard_hours_per_day`, `effective_from`, `effective_to`, `status`, `created_at`, `updated_at`) VALUES
	('prof_u_cnc1', 'u_cnc1', 'monthly', 7400000.00, 22.00, 8.00, NULL, NULL, 'active', '2026-04-29 07:54:25', '2026-04-29 07:54:25'),
	('prof_u_cnc2', 'u_cnc2', 'monthly', 5100000.00, 22.00, 8.00, NULL, NULL, 'active', '2026-04-29 07:54:25', '2026-04-29 07:54:25'),
	('prof_u_nguoi1', 'u_nguoi1', 'monthly', 8700000.00, 22.00, 8.00, NULL, NULL, 'active', '2026-04-29 07:54:25', '2026-04-29 07:54:25');

INSERT INTO `shift_assignments` (`id`, `shift_instance_id`, `user_id`, `role_name`, `status`, `assigned_by`, `assigned_at`, `note`, `created_at`, `updated_at`) VALUES
	('sa_m0_20260504', 'si_MORNING_20260504', 'u_cnc1', NULL, 'COMPLETED', NULL, '2026-05-06 13:01:18', NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18'),
	('sa_m0_20260505', 'si_MORNING_20260505', 'u_cnc1', NULL, 'COMPLETED', NULL, '2026-05-06 13:01:18', NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18'),
	('sa_m0_20260506', 'si_MORNING_20260506', 'u_cnc1', NULL, 'COMPLETED', NULL, '2026-05-06 13:01:18', NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18'),
	('sa_m1_20260504', 'si_MORNING_20260504', 'u_cnc2', NULL, 'COMPLETED', NULL, '2026-05-06 13:01:18', NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18'),
	('sa_m1_20260505', 'si_MORNING_20260505', 'u_cnc2', NULL, 'COMPLETED', NULL, '2026-05-06 13:01:18', NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18'),
	('sa_m1_20260506', 'si_MORNING_20260506', 'u_cnc2', NULL, 'COMPLETED', NULL, '2026-05-06 13:01:18', NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18'),
	('sa_m2_20260504', 'si_MORNING_20260504', 'u_nguoi1', NULL, 'COMPLETED', NULL, '2026-05-06 13:01:18', NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18'),
	('sa_m2_20260505', 'si_MORNING_20260505', 'u_nguoi1', NULL, 'COMPLETED', NULL, '2026-05-06 13:01:18', NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18'),
	('sa_m2_20260506', 'si_MORNING_20260506', 'u_nguoi1', NULL, 'COMPLETED', NULL, '2026-05-06 13:01:18', NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18');

INSERT INTO `shift_instances` (`id`, `shift_template_id`, `work_date`, `start_at`, `end_at`, `status`, `note`, `created_at`, `updated_at`) VALUES
	('si_AFTERNOON_20260504', 'st_afternoon', '2026-05-04', '2026-05-04 14:00:00', '2026-05-04 22:00:00', 'OPEN', NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18'),
	('si_AFTERNOON_20260505', 'st_afternoon', '2026-05-05', '2026-05-05 14:00:00', '2026-05-05 22:00:00', 'OPEN', NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18'),
	('si_AFTERNOON_20260506', 'st_afternoon', '2026-05-06', '2026-05-06 14:00:00', '2026-05-06 22:00:00', 'OPEN', NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18'),
	('si_AFTERNOON_20260507', 'st_afternoon', '2026-05-07', '2026-05-07 14:00:00', '2026-05-07 22:00:00', 'OPEN', NULL, '2026-05-06 14:44:59', '2026-05-06 14:44:59'),
	('si_AFTERNOON_20260508', 'st_afternoon', '2026-05-08', '2026-05-08 14:00:00', '2026-05-08 22:00:00', 'OPEN', NULL, '2026-05-07 11:53:18', '2026-05-07 11:53:18'),
	('si_AFTERNOON_20260509', 'st_afternoon', '2026-05-09', '2026-05-09 14:00:00', '2026-05-09 22:00:00', 'OPEN', NULL, '2026-05-07 11:53:23', '2026-05-07 11:53:23'),
	('si_AFTERNOON_20260510', 'st_afternoon', '2026-05-10', '2026-05-10 14:00:00', '2026-05-10 22:00:00', 'OPEN', NULL, '2026-05-07 11:53:24', '2026-05-07 11:53:24'),
	('si_MORNING_20260504', 'st_morning', '2026-05-04', '2026-05-04 06:00:00', '2026-05-04 14:00:00', 'OPEN', NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18'),
	('si_MORNING_20260505', 'st_morning', '2026-05-05', '2026-05-05 06:00:00', '2026-05-05 14:00:00', 'OPEN', NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18'),
	('si_MORNING_20260506', 'st_morning', '2026-05-06', '2026-05-06 06:00:00', '2026-05-06 14:00:00', 'OPEN', NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18'),
	('si_MORNING_20260507', 'st_morning', '2026-05-07', '2026-05-07 07:15:00', '2026-05-07 14:00:00', 'OPEN', NULL, '2026-05-06 14:44:59', '2026-05-06 14:44:59'),
	('si_MORNING_20260508', 'st_morning', '2026-05-08', '2026-05-08 07:15:00', '2026-05-08 14:00:00', 'OPEN', NULL, '2026-05-07 11:53:18', '2026-05-07 11:53:18'),
	('si_MORNING_20260509', 'st_morning', '2026-05-09', '2026-05-09 07:15:00', '2026-05-09 14:00:00', 'OPEN', NULL, '2026-05-07 11:53:23', '2026-05-07 11:53:23'),
	('si_MORNING_20260510', 'st_morning', '2026-05-10', '2026-05-10 07:15:00', '2026-05-10 14:00:00', 'OPEN', NULL, '2026-05-07 11:53:24', '2026-05-07 11:53:24'),
	('si_NIGHT_20260504', 'st_night', '2026-05-04', '2026-05-04 22:00:00', '2026-05-05 06:00:00', 'OPEN', NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18'),
	('si_NIGHT_20260505', 'st_night', '2026-05-05', '2026-05-05 22:00:00', '2026-05-06 06:00:00', 'OPEN', NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18'),
	('si_NIGHT_20260506', 'st_night', '2026-05-06', '2026-05-06 22:00:00', '2026-05-07 06:00:00', 'OPEN', NULL, '2026-05-06 13:01:18', '2026-05-06 13:01:18'),
	('si_NIGHT_20260507', 'st_night', '2026-05-07', '2026-05-07 22:00:00', '2026-05-07 06:00:00', 'OPEN', NULL, '2026-05-06 14:44:59', '2026-05-06 14:44:59'),
	('si_NIGHT_20260508', 'st_night', '2026-05-08', '2026-05-08 22:00:00', '2026-05-08 06:00:00', 'OPEN', NULL, '2026-05-07 11:53:18', '2026-05-07 11:53:18'),
	('si_NIGHT_20260509', 'st_night', '2026-05-09', '2026-05-09 22:00:00', '2026-05-09 06:00:00', 'OPEN', NULL, '2026-05-07 11:53:23', '2026-05-07 11:53:23'),
	('si_NIGHT_20260510', 'st_night', '2026-05-10', '2026-05-10 22:00:00', '2026-05-10 06:00:00', 'OPEN', NULL, '2026-05-07 11:53:24', '2026-05-07 11:53:24');

INSERT INTO `shift_templates` (`id`, `code`, `name`, `start_time`, `end_time`, `break_minutes`, `base_multiplier`, `color`, `checkin_early_minutes`, `checkin_late_minutes`, `late_grace_minutes`, `checkout_grace_minutes`, `requires_assignment`, `is_active`, `created_at`, `updated_at`, `location_type`) VALUES
	('st_afternoon', 'AFTERNOON', 'Ca Chiều', '14:00:00', '22:00:00', 30, 1, 'blue', 30, 120, 5, 5, 1, 1, '2026-05-06 13:01:18', '2026-05-06 13:01:18', 'WORKSHOP'),
	('st_morning', 'MORNING', 'Ca Sáng', '07:15:00', '14:00:00', 30, 1, 'amber', 30, 120, 5, 5, 1, 1, '2026-05-06 13:01:18', '2026-05-06 14:50:37', 'WORKSHOP'),
	('st_night', 'NIGHT', 'Ca Đêm', '22:00:00', '06:00:00', 30, 1, 'purple', 30, 120, 5, 5, 1, 1, '2026-05-06 13:01:18', '2026-05-06 14:17:10', 'WORKSHOP');

INSERT INTO `tasks` (`id`, `project_id`, `project_item_id`, `assigned_to`, `title`, `description`, `status`, `created_at`, `updated_at`, `location_type`, `target_shift_id`) VALUES
	('0791f1cd-af83-4b8a-9337-17476a64fc48', 'p_003', 'i_assembly', 'u_cnc2', 'Sửa chữa bộ khuôn đúc nắp máy', '', 'TODO', '2026-05-06 15:18:52', '2026-05-06 15:19:01', 'WORKSHOP', 'st_afternoon'),
	('9a677297-f7ab-4b9e-b850-df2adf107f92', 'p_003', 'i_edm', 'u_nguoi1', 'Sửa chữa bộ khuôn đúc nắp máy', '', 'TODO', '2026-05-06 15:18:52', '2026-05-06 15:19:07', 'WORKSHOP', 'st_afternoon'),
	('a7b96f6d-05ae-4675-a451-1ba035356dc4', 'p_002', 'i_cnc_rough', 'u_nguoi1', 'Khuôn dập chậu rửa Inox (D2) - Gia công phay thô CNC', '', 'TODO', '2026-05-07 11:26:05', '2026-05-07 11:26:05', 'SITE', 'st_afternoon'),
	('b4dde292-7598-4a44-b8c6-296ae78d6bcf', 'p_003', 'i_edm', 'u_cnc1', 'Sửa chữa bộ khuôn đúc nắp máy', '', 'DOING', '2026-05-06 15:18:52', '2026-05-06 15:19:45', 'WORKSHOP', 'st_afternoon'),
	('t_1', 'p_001', 'i_cnc_rough', 'u_cnc1', 'Phay thô lòng khuôn A (Cavity)', NULL, 'DOING', '2026-05-06 13:01:18', '2026-05-06 15:19:21', 'SITE', 'st_morning'),
	('t_2', 'p_001', 'i_design', 'u_admin', 'Thiết kế hệ thống kênh dẫn nhựa', NULL, 'DONE', '2026-05-06 13:01:18', '2026-05-06 13:01:18', 'SITE', NULL),
	('t_3', 'p_002', 'i_cnc_rough', 'u_cnc2', 'Phay thô chậu rửa Inox', NULL, 'DOING', '2026-05-06 13:01:18', '2026-05-06 13:01:18', 'WORKSHOP', NULL),
	('t_4', 'p_002', 'i_assembly', 'u_nguoi1', 'Lắp ráp bộ khuôn chậu rửa', NULL, 'TODO', '2026-05-06 13:01:18', '2026-05-06 13:01:18', 'WORKSHOP', NULL),
	('t_5', 'p_003', 'i_edm', 'u_nguoi1', 'Gia công xung điện nắp máy', NULL, 'DOING', '2026-05-06 13:01:18', '2026-05-06 13:01:18', 'WORKSHOP', NULL);

INSERT INTO `users` (`id`, `username`, `password_hash`, `full_name`, `role`, `contract_type`, `standard_rate`, `billing_rate`, `created_at`, `job_title`) VALUES
	('u_acc', 'ktoan', '$2a$10$3LTWICQZ4gvxXfju43AtYep7YT4pQQhfUahswY1tuZy2QQfAVGXFW', 'Trần Thị Kế Toán', 'ACCOUNTANT', 'FULLTIME', 150000, 250000, '2026-05-06 13:01:18', 'Kế toán'),
	('u_admin', 'admin', '$2a$10$3LTWICQZ4gvxXfju43AtYep7YT4pQQhfUahswY1tuZy2QQfAVGXFW', 'Nguyễn Văn Quản Đốc', 'ADMIN', 'FULLTIME', 250000, 500000, '2026-05-06 13:01:18', 'Quản đốc xưởng'),
	('u_cnc1', 'thocnc1', '$2a$10$3LTWICQZ4gvxXfju43AtYep7YT4pQQhfUahswY1tuZy2QQfAVGXFW', 'Lê Văn CNC (Bậc 5/7)', 'STAFF', 'FULLTIME', 120000, 220000, '2026-05-06 13:01:18', 'Thợ phay CNC'),
	('u_cnc2', 'thocnc2', '$2a$10$3LTWICQZ4gvxXfju43AtYep7YT4pQQhfUahswY1tuZy2QQfAVGXFW', 'Hoàng Văn Tiện', 'STAFF', 'FULLTIME', 110000, 200000, '2026-05-06 13:01:18', 'Thợ tiện CNC'),
	('u_nguoi1', 'thonguoi', '$2a$10$3LTWICQZ4gvxXfju43AtYep7YT4pQQhfUahswY1tuZy2QQfAVGXFW', 'Phạm Văn Nguội (Lắp ráp)', 'STAFF', 'FULLTIME', 100000, 180000, '2026-05-06 13:01:18', 'Thợ nguội lắp ráp');

INSERT INTO `worklogs` (`id`, `user_id`, `project_id`, `task_id`, `task_content`, `start_time`, `end_time`, `duration_hours`, `actual_cost`, `actual_revenue`, `status`, `standard_hours`, `ot_hours`, `location_multiplier`, `ot_multiplier`, `holiday_multiplier`, `created_at`) VALUES
	('0540edca-77ff-4b9f-9e7a-1279fde81744', 'u_cnc1', 'p_003', 'b4dde292-7598-4a44-b8c6-296ae78d6bcf', NULL, '2026-05-06 15:19:45', '2026-05-06 15:29:05', NULL, NULL, NULL, 'DONE', 0, 0, 1, 1, 1, '2026-05-06 15:19:45'),
	('22bbec87-2a22-4ca6-896a-dd4ccc96790e', 'u_cnc2', 'p_002', 't_3', NULL, '2026-05-06 13:21:01', '2026-05-06 15:17:58', 1.95, 214408.33, 390000, 'DONE', 1.95, 0, 1, 1.5, 1, '2026-05-06 13:21:01'),
	('3eedcfc8-050c-412b-84e4-1bb9c7123b73', 'u_nguoi1', 'p_003', 't_5', NULL, '2026-05-07 11:34:05', NULL, NULL, NULL, NULL, 'IN_PROGRESS', 0, 0, 1, 1, 1, '2026-05-07 11:34:05'),
	('b34bdc33-83b2-40c1-9e4a-e67f5813fbb8', 'u_nguoi1', 'p_003', 't_5', NULL, '2026-05-06 14:45:34', '2026-05-06 15:17:51', 0.54, 53805.56, 97200, 'DONE', 0.54, 0, 1, 1.5, 1, '2026-05-06 14:45:34'),
	('d1652484-8985-4a44-ba6d-98e99fde31d5', 'u_cnc2', 'p_002', 't_3', NULL, '2026-05-07 11:24:14', NULL, NULL, NULL, NULL, 'IN_PROGRESS', 0, 0, 1, 1, 1, '2026-05-07 11:24:14'),
	('wl_01', 'u_cnc1', 'p_001', 't_1', NULL, '2026-05-04 08:00:00', '2026-05-04 17:00:00', 9, 1296000, 1980000, 'DONE', 9, 0, 1.2, 1.5, 1, '2026-05-06 13:01:18'),
	('wl_02', 'u_cnc1', 'p_001', 't_1', NULL, '2026-05-04 17:30:00', '2026-05-04 19:30:00', 2, 432000, 440000, 'DONE', 0, 2, 1.2, 1.5, 1, '2026-05-06 13:01:18'),
	('wl_03', 'u_cnc2', 'p_002', 't_3', NULL, '2026-05-04 08:00:00', '2026-05-04 17:00:00', 9, 990000, 1800000, 'DONE', 9, 0, 1, 1.5, 1, '2026-05-06 13:01:18'),
	('wl_04', 'u_nguoi1', 'p_002', 't_4', NULL, '2026-05-04 08:00:00', '2026-05-04 17:15:00', 9.25, 925000, 1665000, 'DONE', 9.25, 0, 1, 1.5, 1, '2026-05-06 13:01:18'),
	('wl_05', 'u_admin', 'p_001', 't_2', NULL, '2026-05-04 08:00:00', '2026-05-04 17:00:00', 9, 2700000, 4500000, 'DONE', 9, 0, 1.2, 1.5, 1, '2026-05-06 13:01:18'),
	('wl_06', 'u_cnc1', 'p_001', 't_1', NULL, '2026-05-05 08:00:00', '2026-05-05 17:15:00', 9.25, 1332000, 2035000, 'DONE', 9.25, 0, 1.2, 1.5, 1, '2026-05-06 13:01:18'),
	('wl_07', 'u_cnc2', 'p_002', 't_3', NULL, '2026-05-05 08:00:00', '2026-05-05 20:00:00', 12, 1471250, 2400000, 'DONE', 9.25, 2.75, 1, 1.5, 1, '2026-05-06 13:01:18'),
	('wl_08', 'u_nguoi1', 'p_003', 't_5', NULL, '2026-05-05 08:00:00', '2026-05-05 17:00:00', 9, 900000, 1620000, 'DONE', 9, 0, 1, 1.5, 1, '2026-05-06 13:01:18'),
	('wl_09', 'u_cnc1', 'p_001', 't_1', NULL, '2026-05-06 08:00:00', '2026-05-06 23:00:00', 15, 2574000, 3300000, 'DONE', 9.25, 5.75, 1.2, 1.5, 1, '2026-05-06 13:01:18'),
	('wl_10', 'u_cnc2', 'p_002', 't_3', NULL, '2026-05-06 08:00:00', '2026-05-06 17:00:00', 9, 990000, 1800000, 'DONE', 9, 0, 1, 1.5, 1, '2026-05-06 13:01:18');

INSERT INTO `projects` (`id`, `project_name`, `location_type`, `status`, `created_at`) VALUES
('0d6395c1-e425-4bf5-b3b2-f3e5fcfb228b', 'Aeon Mall Hạ Long', 'WORKSHOP', 'COMPLETED', '2026-05-05 10:24:16'),
('57612cc1-84e0-46ec-8ff9-b2d2cd5aefa7', 'Aeon mall Hạ Long', 'WORKSHOP', 'ACTIVE', '2026-05-05 16:35:42'),
('74f07c2e-13d4-45f0-b4af-f97fda863e55', 'kikiki', 'WORKSHOP', 'ACTIVE', '2026-04-29 08:38:30'),
('c021d593-1dc3-43e0-96ba-4a78e4c5bb8d', 'Vietinak Hung Yen', 'WORKSHOP', 'ACTIVE', '2026-04-24 14:52:13'),
('p_001', 'Khuôn đúc vỏ động cơ xe máy (SKD61)', 'SITE', 'ACTIVE', '2026-04-24 14:37:10'),
('p_002', 'Khuôn dập chậu rửa Inox (D2)', 'WORKSHOP', 'ACTIVE', '2026-04-24 14:37:10'),
('p_003', 'Sửa chữa bộ khuôn đúc nắp máy (Dự án khẩn)', 'WORKSHOP', 'ACTIVE', '2026-04-24 14:37:10');

INSERT INTO `project_items` (`id`,
`name`, `description`, `created_at`) VALUES
('18a45b4e-c008-4a72-9d12-90f34a81138f', 'Lan can kính', 'Gia công cột', '2026-05-05 10:23:58'),
('45b5959d-5128-4ef2-b45c-59e6a53414fa', 'Nhà lưới ', '', '2026-04-24 15:09:19'),
('8055318d-19dd-416a-bc2b-513f21c0468c', 'Lan can tay vịn ', 'Lan can tay vịn thép ', '2026-05-05 16:34:37'),
('a8e94a46-8fc9-48ae-88d6-6d0a6c118581', 'Hàn Điện', 'hà cơ bản', '2026-04-24 14:44:31'),
('eae2ee18-b07f-4ff2-b3ce-b3cfc29b56df', 'Lan can tay vịn', '', '2026-04-24 15:09:39'),
('i_assembly', 'Lắp ráp & Căn chỉnh', 'Lắp vỏ khuôn, hệ thống đẩy và thử kín', '2026-04-24 14:37:10'),
('i_cnc_rough', 'Gia công phay thô CNC', 'Phay phá khối thép phôi', '2026-04-24 14:37:10'),
('i_design', 'Thiết kế 3D & CAM', 'Thiết kế kỹ thuật và lập trình đường chạy dao CNC', '2026-04-24 14:37:10'),
('i_edm', 'Gia công xung điện EDM/Cắt dây', 'Gia công các chi tiết hốc sâu và khe hẹp', '2026-04-24 14:37:10'),
('i_heat', 'Nhiệt luyện thép', 'Tôi chân không để đạt độ cứng HRC 52-55', '2026-04-24 14:37:10'),
('i_polish', 'Mài bóng & Đánh bóng', 'Xử lý bề mặt lòng khuôn đạt độ bóng gương', '2026-04-24 14:37:10');

INSERT INTO `project_item_mapping` (`project_id`, `item_id`) VALUES
('0d6395c1-e425-4bf5-b3b2-f3e5fcfb228b', '18a45b4e-c008-4a72-9d12-90f34a81138f'),
('74f07c2e-13d4-45f0-b4af-f97fda863e55', 'a8e94a46-8fc9-48ae-88d6-6d0a6c118581'),
('74f07c2e-13d4-45f0-b4af-f97fda863e55', 'eae2ee18-b07f-4ff2-b3ce-b3cfc29b56df'),
('74f07c2e-13d4-45f0-b4af-f97fda863e55', 'i_assembly'),
('74f07c2e-13d4-45f0-b4af-f97fda863e55', 'i_cnc_rough'),
('74f07c2e-13d4-45f0-b4af-f97fda863e55', 'i_edm'),
('74f07c2e-13d4-45f0-b4af-f97fda863e55', 'i_polish'),
('c021d593-1dc3-43e0-96ba-4a78e4c5bb8d', '45b5959d-5128-4ef2-b45c-59e6a53414fa'),
('c021d593-1dc3-43e0-96ba-4a78e4c5bb8d', 'eae2ee18-b07f-4ff2-b3ce-b3cfc29b56df'),
('p_001', '18a45b4e-c008-4a72-9d12-90f34a81138f'),
('p_001', 'a8e94a46-8fc9-48ae-88d6-6d0a6c118581'),
('p_001', 'i_assembly'),
('p_001', 'i_cnc_rough'),
('p_001', 'i_design'),
('p_001', 'i_edm'),
('p_001', 'i_heat'),
('p_001', 'i_polish'),
('p_002', 'a8e94a46-8fc9-48ae-88d6-6d0a6c118581'),
('p_002', 'i_assembly'),
('p_002', 'i_cnc_rough'),
('p_002', 'i_design'),
('p_002', 'i_edm'),
('p_002', 'i_heat'),
('p_002', 'i_polish'),
('p_003', 'i_assembly'),
('p_003', 'i_edm');

INSERT INTO `shift_templates` (`id`, `code`,
`name`, `start_time`, `end_time`, `break_minutes`, `base_multiplier`, `color`, `checkin_early_minutes`, `checkin_late_minutes`, `late_grace_minutes`, `checkout_grace_minutes`, `requires_assignment`, `is_active`, `created_at`, `updated_at`) VALUES
('st_1778121616815', 'C1', 'Ca 1', '07:30:00', '17:00:00', 180, 1, 'amber', 30, 120, 5, 5, 1, 1, '2026-05-07 09:40:16', '2026-05-07 09:40:16'),
('st_afternoon', 'AFTERNOON', 'Ca Chiều', '13:00:00', '17:00:00', 15, 1, 'amber', 30, 120, 5, 5, 1, 0, '2026-05-06 15:34:59', '2026-05-07 09:38:58'),
('st_morning', 'MORNING', 'Ca Sáng', '07:30:00', '11:30:00', 30, 1, 'green', 30, 120, 5, 5, 1, 0, '2026-05-06 15:34:59', '2026-05-07 09:38:56'),
('st_night', 'NIGHT', 'Ca Đêm', '18:00:00', '22:00:00', 15, 1, 'red', 30, 120, 5, 5, 1, 0, '2026-05-06 15:34:59', '2026-05-07 09:39:01');


SET FOREIGN_KEY_CHECKS = 1;
