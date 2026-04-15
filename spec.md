# System Specification: Real-time Labor & Project Management App

## 1. Project Overview
Hệ thống quản lý nhân công thời gian thực, cho phép theo dõi hoạt động của nhân sự, tính toán chi phí (Cost) và doanh thu (Revenue) dựa trên đơn giá giờ tùy chỉnh.

- **Platform:** React Native (Mobile cho Nhân viên), ReactJS (Web cho Admin/Kế toán).
- **Architecture:** Client-Server với Real-time Database (Firebase hoặc WebSocket).

---

## 2. User Roles & Permissions (RBAC)

| Role | Access Level | Key Responsibilities |
| :--- | :--- | :--- |
| **Admin** | Full Access | Quản lý User, thiết lập Đơn giá (Hourly Rate), Loại hợp đồng. |
| **Accountant** | Financial Access | Xem Dashboard doanh thu/chi phí, xuất báo cáo lương, lọc dữ liệu theo thời gian. |
| **Staff** | Task Access | Check-in/Check-out công việc, xem lịch sử cá nhân trên Mobile. |

---

## 3. Data Schema (Entity Definition)

### 3.1. Users Table
- `id`: UUID (Primary Key)
- `username`: String (Unique)
- `password_hash`: String
- `full_name`: String
- `role`: Enum [ADMIN, ACCOUNTANT, STAFF]
- `contract_type`: Enum [FULLTIME, PARTTIME, FREELANCER]
- `standard_rate`: Decimal (Chi phí trả cho nhân viên/giờ)
- `billing_rate`: Decimal (Đơn giá thu của khách hàng/giờ)

### 3.2. Projects Table
- `id`: UUID
- `project_name`: String
- `status`: Enum [ACTIVE, COMPLETED, ON_HOLD]
- `created_at`: Timestamp

### 3.3. WorkLogs Table (Real-time Tracking)
- `id`: UUID
- `user_id`: Reference(Users.id)
- `project_id`: Reference(Projects.id)
- `task_content`: Text
- `start_time`: DateTime
- `end_time`: DateTime (Nullable)
- `duration_hours`: Decimal (Computed: end - start)
- `actual_cost`: Decimal (Computed: duration * standard_rate)
- `actual_revenue`: Decimal (Computed: duration * billing_rate)
- `status`: Enum [IN_PROGRESS, DONE]

---

## 4. Task Definitions (Logic Nghiệp vụ)

### TASK 01: User Authentication (All Platforms)
- **Input:** `username`, `password`
- **Output:** JWT Token & User Profile (Role)
- **Logic:** Phân hướng người dùng sau login: Staff vào Mobile App, Admin/Kế toán vào Web Dashboard.

### TASK 02: Real-time Tracking (React Native Mobile)
- **Action: START_TASK**
    - Input: `project_id`, `task_content`
    - Logic: Kiểm tra nếu User có task `IN_PROGRESS` thì không cho start. Lưu `start_time` hiện tại.
- **Action: STOP_TASK**
    - Logic: Cập nhật `end_time`. Tính toán `duration_hours`, `actual_cost`, và `actual_revenue` ngay lập tức. Đổi status sang `DONE`.

### TASK 03: Admin Management (ReactJS Web)
- **Action: SET_RATE**
    - Input: `user_id`, `new_standard_rate`, `new_billing_rate`
    - Logic: Cập nhật đơn giá cho các tác vụ tương lai.

### TASK 04: Accountant Dashboard (ReactJS Web)
- **View: Live Monitor**
    - Query: `SELECT * FROM WorkLogs WHERE status = 'IN_PROGRESS'`
    - Display: Tên NV, Dự án, Thời gian đã trôi qua.
- **View: Financial Report**
    - Filter: `DateRange` (Ngày/Tháng/Năm), `Project_ID`.
    - Calculation: 
        - Total Cost = SUM(actual_cost)
        - Total Revenue = SUM(actual_revenue)
        - Profit = Total Revenue - Total Cost

---

## 5. UI/UX Requirements

### Mobile (React Native)
- Giao diện đơn giản: Danh sách dự án -> Nút "Bắt đầu" (To, màu xanh) -> Nút "Kết thúc" (To, màu đỏ).
- Notification: Nhắc nhở nếu nhân viên quên tắt task sau 8 tiếng.

### Web (ReactJS)
- Dashboard sử dụng Chart.js hoặc Recharts để vẽ biểu đồ tăng trưởng doanh thu.
- Bảng dữ liệu (Data Table) có tính năng lọc, tìm kiếm và xuất file Excel cho kế toán.

---

## 6. Business Rules (Ràng buộc hệ thống)
1. Một nhân viên không thể làm 2 dự án cùng một lúc (Time-collision prevent).
2. Nhân viên không được tự ý sửa `start_time` và `end_time` (Tránh gian lận). Chỉ Admin mới có quyền điều chỉnh log nếu có sai sót.
3. Toàn bộ tiền tệ được làm tròn đến 2 chữ số thập phân.