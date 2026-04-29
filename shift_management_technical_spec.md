# Đặc tả kỹ thuật: Quản lý ca làm việc, chấm công theo ca và tính OT

**Mục tiêu sử dụng:** đưa file Markdown này vào Antigravity để implement chức năng mới dựa trên mockup `shift_management_mockup.html`.

**Ngày soạn:** 2026-04-29  
**Module đề xuất:** `ShiftAttendancePayroll`  
**Ngôn ngữ UI:** Tiếng Việt  
**Timezone mặc định:** `Asia/Ho_Chi_Minh`  
**Nguồn UI demo:** file HTML mockup do người dùng cung cấp.

---

## 1. Bối cảnh và vấn đề cần giải quyết

Xưởng sản xuất làm việc theo **ca cố định**, ví dụ:

- Ca Sáng: `06:00 - 14:00`
- Ca Chiều: `14:00 - 22:00`
- Ca Đêm: `22:00 - 06:00` ngày hôm sau

Hệ thống hiện tại đang cho nhân viên **check-in bất cứ lúc nào** giống mô hình văn phòng. Cách này không phù hợp với xưởng vì:

1. Không xác định được nhân viên thuộc ca nào.
2. Không phân biệt được đi muộn, về sớm, vắng ca.
3. Không tách được giờ làm trong ca và giờ làm thêm.
4. Không áp được hệ số lương khác nhau cho OT, ca đêm, ngày nghỉ, ngày lễ.
5. Khi tính lương dễ sai hoặc cần xử lý thủ công.

Cần bổ sung khái niệm **Shift / Ca làm việc** và thay đổi logic chấm công, tổng hợp công, tính lương theo ca.

---

## 2. Phạm vi chức năng

### 2.1. In scope

Implement các nhóm chức năng sau:

1. **Quản lý cấu hình ca**
   - Tạo, sửa, xóa mềm ca làm việc.
   - Cấu hình thời gian bắt đầu, kết thúc, nghỉ giữa ca, ca qua ngày.
   - Cấu hình màu hiển thị, hệ số lương mặc định, giới hạn check-in/check-out.

2. **Lịch ca theo tuần/ngày**
   - Hiển thị tuần hiện tại với số ca từng ngày.
   - Cho phép chọn ngày để xem các ca trong ngày.
   - Hiển thị badge ngày lễ/ngày nghỉ nếu có.

3. **Phân ca nhân viên**
   - Gán nhân viên vào ca cụ thể.
   - Theo dõi số người được phân, số có mặt, số muộn, số vắng, số có OT.

4. **Chấm công theo ca**
   - Check-in/check-out phải gắn với một `shift_instance` hoặc được hệ thống tự nhận diện ca gần nhất theo cấu hình.
   - Tính trạng thái đúng giờ, đi muộn, về sớm, vắng, thiếu check-out, OT.
   - Hỗ trợ ca qua ngày như `22:00 - 06:00`.

5. **Tính OT và hệ số lương**
   - Tách giờ thường trong ca, giờ OT trước ca, giờ OT sau ca.
   - Áp hệ số theo ngày thường, ngày nghỉ hằng tuần, ngày lễ, ca đêm.
   - Cho phép cấu hình rule theo chính sách công ty nhưng phải cảnh báo nếu rule thấp hơn mức tối thiểu theo luật.

6. **Giao diện theo mockup**
   - Page header: `Quản lý Ca làm việc`.
   - Tabs: `Lịch tuần`, `Danh sách ca`, `Cài đặt hệ số`.
   - Week strip: danh sách ngày trong tuần, số ca/ngày, badge ngày lễ.
   - Shift cards: tên ca, giờ ca, hệ số, số có mặt, số muộn/vắng/OT.
   - Alert banner: cảnh báo OT tự động.
   - Attendance table: chi tiết check-in/check-out/giờ làm/trạng thái.

### 2.2. Out of scope cho phase đầu

Không bắt buộc implement trong phase đầu:

- Tối ưu lịch phân ca tự động theo năng lực/máy móc.
- Xin đổi ca/phê duyệt đổi ca nhiều cấp.
- Tích hợp máy chấm công vân tay thật.
- Export bảng lương chuẩn kế toán.
- Tính phụ cấp độc hại, phụ cấp chuyên cần, thưởng sản lượng.

Nên thiết kế data model đủ mở để bổ sung các phần trên sau này.

---

## 3. Căn cứ nghiệp vụ và pháp lý cần cấu hình

> Tài liệu này chỉ mô tả logic hệ thống. Khi triển khai chính thức, team pháp chế/nhân sự cần rà soát lại chính sách lương và quy định pháp luật tại thời điểm áp dụng.

### 3.1. Default hệ số đề xuất

Theo Điều 98 Bộ luật Lao động 2019, tiền lương làm thêm giờ tối thiểu gồm:

| Loại thời gian | Hệ số tối thiểu đề xuất trong hệ thống |
|---|---:|
| Làm thêm ngày thường | `1.5x` |
| Làm thêm ngày nghỉ hằng tuần | `2.0x` |
| Làm thêm ngày lễ/tết/ngày nghỉ có hưởng lương | `3.0x`, chưa kể tiền lương ngày lễ/tết đối với người hưởng lương ngày |
| Làm việc ban đêm | cộng thêm tối thiểu `30%` so với ngày thường |
| Làm thêm vào ban đêm | ngoài OT và phụ cấp đêm, cộng thêm `20%` theo công thức hướng dẫn |

Nguồn tham khảo đưa vào tài liệu kỹ thuật:

- Bộ luật Lao động 2019, Điều 98: https://hethongphapluat.com/bo-luat-lao-dong-2019/dieu-98
- Nghị định 145/2020/NĐ-CP, Điều 55-57: https://thuvienphapluat.vn/van-ban/Lao-dong-Tien-luong/Nghi-dinh-145-2020-ND-CP-huong-dan-Bo-luat-Lao-dong-ve-dieu-kien-lao-dong-quan-he-lao-dong-459400.aspx
- Cổng văn bản Chính phủ, Bộ luật Lao động số 45/2019/QH14: https://vanban.chinhphu.vn/?classid=1&docid=198540&pageid=27160&typegroupid=3
- Cổng văn bản Chính phủ, Nghị định 145/2020/NĐ-CP: https://vanban.chinhphu.vn/?docid=201967&pageid=27160

### 3.2. Lưu ý quan trọng về mockup

Mockup có hiển thị ví dụ `Lễ 30/4 — 2x`. Khi implement, không hard-code `2x` cho ngày lễ nếu đây là rule lương chính thức. Hệ thống phải:

1. Cho phép cấu hình hệ số theo chính sách công ty.
2. Có default tối thiểu theo luật.
3. Hiển thị cảnh báo nếu admin cấu hình hệ số thấp hơn mức tối thiểu pháp lý.
4. Tách rõ `holiday_base_pay`, `holiday_overtime_pay` nếu hệ thống payroll cần đúng bản chất lương ngày lễ.

---

## 4. Thuật ngữ nghiệp vụ

| Thuật ngữ | Mô tả |
|---|---|
| `Shift Template` | Mẫu ca cố định, ví dụ Ca Sáng `06:00-14:00`. |
| `Shift Instance` | Một ca cụ thể theo ngày, ví dụ Ca Sáng ngày `2026-04-29`. |
| `Shift Assignment` | Việc phân một nhân viên vào một `shift_instance`. |
| `Attendance Event` | Sự kiện check-in hoặc check-out raw từ app/máy chấm công. |
| `Attendance Record` | Bản ghi công đã xử lý cho một nhân viên trong một ca. |
| `Work Segment` | Một đoạn thời gian tính lương với loại và hệ số riêng, ví dụ `regular`, `overtime`, `night`. |
| `Payroll Multiplier` | Rule hệ số lương theo loại ngày và loại giờ. |
| `Holiday Calendar` | Danh mục ngày lễ/ngày nghỉ có hưởng lương. |
| `Grace Period` | Số phút được bỏ qua khi đánh giá muộn/sớm, ví dụ 5 phút. |
| `Check-in Window` | Khoảng thời gian cho phép check-in quanh giờ bắt đầu ca. |
| `Cross-midnight Shift` | Ca bắt đầu hôm nay và kết thúc ngày hôm sau, ví dụ `22:00-06:00`. |

---

## 5. User stories

### 5.1. Admin/HR

1. Là Admin/HR, tôi muốn tạo các ca cố định để xưởng sử dụng hằng ngày.
2. Là Admin/HR, tôi muốn cấu hình hệ số OT để hệ thống tính lương đúng chính sách.
3. Là Admin/HR, tôi muốn đánh dấu ngày lễ/ngày nghỉ để hệ thống áp hệ số tự động.
4. Là Admin/HR, tôi muốn xem lịch ca theo tuần để nắm số ca và tình trạng nhân sự.
5. Là Admin/HR, tôi muốn xem chi tiết chấm công từng ca để xử lý muộn/vắng/OT.

### 5.2. Quản đốc/Supervisor

1. Là Quản đốc, tôi muốn biết ca nào thiếu người, nhân viên nào vắng hoặc đi muộn.
2. Là Quản đốc, tôi muốn phê duyệt hoặc từ chối OT phát sinh.
3. Là Quản đốc, tôi muốn sửa/chốt công khi nhân viên quên check-out.

### 5.3. Nhân viên

1. Là Nhân viên, tôi muốn check-in/check-out theo ca được phân.
2. Là Nhân viên, tôi muốn thấy trạng thái công của mình: đúng giờ, muộn, OT, thiếu check-out.

---

## 6. Quy tắc nghiệp vụ chi tiết

### 6.1. Tạo ca làm việc

Mỗi ca cần các trường:

| Field | Kiểu | Bắt buộc | Mô tả |
|---|---:|---:|---|
| `name` | string | yes | Tên ca, ví dụ `Ca Sáng`. |
| `code` | string | yes | Mã ca duy nhất, ví dụ `MORNING`. |
| `start_time` | `HH:mm` | yes | Giờ bắt đầu theo timezone công ty. |
| `end_time` | `HH:mm` | yes | Giờ kết thúc. Nếu `end_time <= start_time` thì là ca qua ngày. |
| `break_minutes` | number | no | Tổng phút nghỉ không tính công. Default `0`. |
| `base_multiplier` | decimal | yes | Hệ số mặc định trong ca. Default `1.0`; ca đêm có thể `1.3`. |
| `color` | enum/string | no | Màu accent UI: `amber`, `blue`, `purple`, ... |
| `checkin_early_minutes` | number | yes | Cho phép check-in sớm bao nhiêu phút. Default `30`. |
| `checkin_late_minutes` | number | yes | Cho phép check-in trễ nhưng vẫn gắn ca. Default `120`. |
| `late_grace_minutes` | number | yes | Dung sai không tính muộn. Default `5`. |
| `checkout_grace_minutes` | number | yes | Dung sai về sớm. Default `5`. |
| `requires_assignment` | boolean | yes | Nếu `true`, chỉ nhân viên được phân mới check-in được ca. |
| `is_active` | boolean | yes | Xóa mềm bằng cách set `false`. |

Validation:

- `name` không rỗng, tối đa 100 ký tự.
- `code` unique, uppercase snake case.
- `start_time` và `end_time` phải đúng định dạng `HH:mm`.
- Ca có duration thực tế sau khi xử lý qua ngày phải > 0 và <= 24 giờ.
- `break_minutes` phải >= 0 và nhỏ hơn duration ca.
- `base_multiplier` phải >= 1.0.

### 6.2. Sinh ca theo ngày

Hệ thống sinh `shift_instance` từ `shift_template` cho từng ngày làm việc.

Input:

- `date`: ngày làm việc, ví dụ `2026-04-29`.
- `template_id`: mẫu ca.

Cách tính:

```text
shift_start_at = combine(date, template.start_time, timezone)
shift_end_at   = combine(date, template.end_time, timezone)

if shift_end_at <= shift_start_at:
    shift_end_at = shift_end_at + 1 day
```

Ví dụ:

```text
Ca Đêm ngày 2026-04-29
start_time = 22:00
end_time   = 06:00

shift_start_at = 2026-04-29T22:00:00+07:00
shift_end_at   = 2026-04-30T06:00:00+07:00
```

### 6.3. Phân ca

Rule:

1. Một nhân viên có thể được phân nhiều ca trong ngày nếu chính sách công ty cho phép, nhưng phải kiểm tra trùng giờ.
2. Không cho phân 2 ca có thời gian overlap nếu không có quyền override.
3. Một `shift_assignment` có thể có trạng thái:
   - `scheduled`: đã phân.
   - `checked_in`: đã vào ca.
   - `completed`: đã hoàn tất.
   - `absent`: vắng.
   - `cancelled`: hủy phân ca.
4. Nếu đến cuối ca mà không có check-in, hệ thống đánh dấu `absent` bằng job nền hoặc khi mở màn hình.

### 6.4. Check-in theo ca

Khi nhân viên check-in, hệ thống xác định ca theo thứ tự:

1. Nếu request có `shift_instance_id`: dùng ca đó sau khi validate.
2. Nếu không có `shift_instance_id`: tìm ca đã phân cho nhân viên có `check_in_at` nằm trong window.
3. Nếu có nhiều ca hợp lệ: chọn ca có `shift_start_at` gần thời điểm check-in nhất; nếu vẫn trùng, yêu cầu người dùng chọn ca.
4. Nếu không có ca hợp lệ:
   - Nếu `allow_unassigned_checkin = false`: từ chối check-in.
   - Nếu `allow_unassigned_checkin = true`: tạo bản ghi `unassigned` và yêu cầu quản lý gắn ca sau.

Công thức window:

```text
checkin_window_start = shift_start_at - checkin_early_minutes
checkin_window_end   = shift_start_at + checkin_late_minutes
```

Trạng thái check-in:

```text
late_minutes_raw = max(0, minutes_between(check_in_at, shift_start_at))
late_minutes = max(0, late_minutes_raw - late_grace_minutes)

if late_minutes == 0:
    checkin_status = ON_TIME
else:
    checkin_status = LATE
```

Ví dụ Ca Sáng `06:00-14:00`, `late_grace_minutes = 5`:

| Check-in | Raw late | Late sau grace | Status |
|---|---:|---:|---|
| `05:58` | 0 | 0 | `ON_TIME` |
| `06:02` | 2 | 0 | `ON_TIME` |
| `06:14` | 14 | 9 | `LATE` |

### 6.5. Check-out theo ca

Khi check-out:

1. Tìm attendance record đang mở của nhân viên.
2. Ghi `check_out_at`.
3. Tính tổng giờ làm thực tế.
4. Tách giờ trong ca và giờ ngoài ca.
5. Xác định `early_leave_minutes`, `overtime_minutes`.

Công thức cơ bản:

```text
actual_work_minutes = minutes_between(check_in_at, check_out_at) - break_minutes_applied

regular_interval = intersection([check_in_at, check_out_at], [shift_start_at, shift_end_at])
regular_minutes = duration(regular_interval) - break_minutes_applied_inside_regular

ot_before_minutes = max(0, minutes_between(check_in_at, min(check_out_at, shift_start_at)))
ot_after_minutes  = max(0, minutes_between(max(check_in_at, shift_end_at), check_out_at))

early_leave_raw = max(0, minutes_between(check_out_at, shift_end_at))
early_leave_minutes = max(0, early_leave_raw - checkout_grace_minutes)
```

Rule OT:

- OT chỉ tính lương nếu `overtime_minutes > 0` và thỏa chính sách phê duyệt.
- Default phase đầu: cho phép auto-detect OT, trạng thái `PENDING_APPROVAL` nếu công ty yêu cầu duyệt.
- Nếu công ty không yêu cầu duyệt, OT được tính tự động nhưng vẫn ghi audit log.

### 6.6. Vắng mặt

Một nhân viên được phân ca nhưng không có check-in hợp lệ sau `absence_cutoff_minutes` kể từ giờ bắt đầu hoặc sau khi ca kết thúc thì trạng thái là `ABSENT`.

Config đề xuất:

```text
absence_cutoff_mode = AFTER_SHIFT_END
absence_cutoff_minutes = 0
```

Hoặc nếu muốn cảnh báo sớm:

```text
absence_cutoff_mode = AFTER_SHIFT_START
absence_cutoff_minutes = 120
```

### 6.7. Thiếu check-out

Nếu nhân viên check-in nhưng không check-out:

- Status: `MISSING_CHECKOUT`.
- Không chốt payroll tự động.
- Quản lý có quyền bổ sung check-out thủ công.
- Audit log phải ghi người sửa, thời điểm sửa, lý do sửa.

### 6.8. Ca đêm và ngày tính công

Ca đêm `22:00-06:00` thuộc `work_date` là ngày bắt đầu ca.

Ví dụ:

```text
work_date = 2026-04-29
shift_start_at = 2026-04-29 22:00
shift_end_at   = 2026-04-30 06:00
```

Khi hiển thị trên lịch tuần:

- Ca đêm nằm ở ngày `2026-04-29`.
- Chi tiết attendance vẫn hiển thị check-out ngày hôm sau.
- Khi tính lương, phải có khả năng tách segment theo ngày nếu ca đi qua ngày lễ/ngày nghỉ.

### 6.9. Ngày lễ/ngày nghỉ

Hệ thống cần bảng `holiday_calendar` để đánh dấu ngày:

- `PUBLIC_HOLIDAY`
- `COMPANY_HOLIDAY`
- `WEEKLY_REST_DAY`
- `NORMAL_WORKDAY`

Khi một work segment cắt qua nhiều loại ngày, phải tách segment theo mốc 00:00.

Ví dụ:

```text
Ca Đêm 2026-04-29 22:00 -> 2026-04-30 06:00
Nếu 2026-04-30 là ngày lễ:
- Segment 1: 2026-04-29 22:00 -> 2026-04-30 00:00, loại ngày 2026-04-29
- Segment 2: 2026-04-30 00:00 -> 2026-04-30 06:00, loại ngày lễ
```

---

## 7. Logic tính công và tính lương

### 7.1. Loại segment cần sinh

Sau mỗi lần check-out hoặc khi recalculation, tạo các `work_segments`:

| Segment type | Mô tả | Ví dụ hệ số |
|---|---|---:|
| `REGULAR` | Giờ làm trong ca ngày thường | `1.0x` |
| `NIGHT_REGULAR` | Giờ làm trong ca thuộc khung ban đêm | `1.3x` hoặc cấu hình theo rule |
| `OT_NORMAL_DAY` | OT ngày thường | `1.5x` |
| `OT_WEEKLY_REST` | OT ngày nghỉ hằng tuần | `2.0x` |
| `OT_PUBLIC_HOLIDAY` | OT ngày lễ | `3.0x` default pháp lý |
| `OT_NIGHT_NORMAL_DAY` | OT ban đêm ngày thường | tính theo component rule |
| `OT_NIGHT_WEEKLY_REST` | OT ban đêm ngày nghỉ | tính theo component rule |
| `OT_NIGHT_PUBLIC_HOLIDAY` | OT ban đêm ngày lễ | tính theo component rule |
| `UNPAID_BREAK` | Nghỉ giữa ca không tính lương | `0x` |
| `PENDING_APPROVAL` | Segment cần duyệt trước khi tính lương | chưa tính/chờ duyệt |

### 7.2. Khung giờ ban đêm

Default:

```text
night_start_time = 22:00
night_end_time = 06:00
```

Do khung đêm qua ngày, function kiểm tra phải xử lý:

```pseudo
function isNightTime(localTime):
  return localTime >= 22:00 OR localTime < 06:00
```

### 7.3. Công thức tính pay theo segment

Dùng cách tính theo segment để dễ audit:

```text
segment_pay = base_hourly_rate * segment_hours * effective_multiplier
```

Trong đó:

- `base_hourly_rate`: lương giờ thực trả hoặc đơn giá giờ được payroll cung cấp.
- `segment_hours`: số giờ segment, làm tròn theo policy.
- `effective_multiplier`: hệ số cuối cùng sau khi áp rule.

### 7.4. Rounding policy

Cần cấu hình cách làm tròn:

| Config | Default | Mô tả |
|---|---:|---|
| `rounding_unit_minutes` | `1` | Làm tròn đến phút. |
| `rounding_mode` | `NEAREST` | `NEAREST`, `FLOOR`, `CEIL`. |
| `minimum_ot_minutes` | `15` | OT dưới ngưỡng này không tính hoặc cần duyệt. |
| `display_hours_precision` | `2` | Hiển thị `7.97h`. |

### 7.5. Ví dụ tính từ mockup

Ca Sáng `06:00-14:00`, nhân viên check-in `05:58`, check-out `15:32`:

```text
actual = 9h34m = 574 phút = 9.57h
regular window = 06:00-14:00 = 480 phút = 8.00h
pre-shift time = 05:58-06:00 = 2 phút, mặc định không tính OT nếu dưới minimum_ot_minutes
post-shift OT = 14:00-15:32 = 92 phút = 1.53h
status = OT
multiplier OT ngày thường = 1.5x
```

UI hiển thị:

```text
Check-in: 05:58
Check-out: 15:32 OT
Giờ làm: 9.57h
Trạng thái: OT 1.5x
```

---

## 8. Data model đề xuất

> Tên bảng có thể đổi theo convention hiện tại của dự án. Ưu tiên dùng UUID nếu hệ thống đã dùng UUID; nếu không thì dùng bigint identity.

### 8.1. `shift_templates`

```sql
CREATE TABLE shift_templates (
  id UUID PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INT NOT NULL DEFAULT 0,
  base_multiplier DECIMAL(5,2) NOT NULL DEFAULT 1.00,
  color VARCHAR(30) NULL,
  checkin_early_minutes INT NOT NULL DEFAULT 30,
  checkin_late_minutes INT NOT NULL DEFAULT 120,
  late_grace_minutes INT NOT NULL DEFAULT 5,
  checkout_grace_minutes INT NOT NULL DEFAULT 5,
  requires_assignment BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  deleted_at TIMESTAMP NULL
);
```

### 8.2. `shift_instances`

```sql
CREATE TABLE shift_instances (
  id UUID PRIMARY KEY,
  shift_template_id UUID NOT NULL REFERENCES shift_templates(id),
  work_date DATE NOT NULL,
  start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  end_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
  note TEXT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  UNIQUE (shift_template_id, work_date)
);
```

`status` enum:

```text
OPEN | LOCKED | PAYROLL_CLOSED | CANCELLED
```

### 8.3. `shift_assignments`

```sql
CREATE TABLE shift_assignments (
  id UUID PRIMARY KEY,
  shift_instance_id UUID NOT NULL REFERENCES shift_instances(id),
  employee_id UUID NOT NULL,
  role_name VARCHAR(100) NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED',
  assigned_by UUID NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL,
  note TEXT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  UNIQUE (shift_instance_id, employee_id)
);
```

`status` enum:

```text
SCHEDULED | CHECKED_IN | COMPLETED | ABSENT | CANCELLED
```

### 8.4. `attendance_events`

Raw events, không sửa/xóa vật lý.

```sql
CREATE TABLE attendance_events (
  id UUID PRIMARY KEY,
  employee_id UUID NOT NULL,
  event_type VARCHAR(20) NOT NULL,
  event_at TIMESTAMP WITH TIME ZONE NOT NULL,
  source VARCHAR(30) NOT NULL,
  device_id VARCHAR(100) NULL,
  shift_instance_id UUID NULL REFERENCES shift_instances(id),
  metadata JSONB NULL,
  created_at TIMESTAMP NOT NULL
);
```

`event_type`:

```text
CHECK_IN | CHECK_OUT
```

`source`:

```text
WEB | MOBILE | DEVICE | ADMIN_ADJUSTMENT | IMPORT
```

### 8.5. `attendance_records`

Bản ghi đã xử lý theo ca.

```sql
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY,
  employee_id UUID NOT NULL,
  shift_instance_id UUID NULL REFERENCES shift_instances(id),
  shift_assignment_id UUID NULL REFERENCES shift_assignments(id),
  work_date DATE NOT NULL,
  check_in_at TIMESTAMP WITH TIME ZONE NULL,
  check_out_at TIMESTAMP WITH TIME ZONE NULL,
  regular_minutes INT NOT NULL DEFAULT 0,
  overtime_minutes INT NOT NULL DEFAULT 0,
  night_minutes INT NOT NULL DEFAULT 0,
  late_minutes INT NOT NULL DEFAULT 0,
  early_leave_minutes INT NOT NULL DEFAULT 0,
  break_minutes INT NOT NULL DEFAULT 0,
  total_work_minutes INT NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL,
  payroll_status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  requires_review BOOLEAN NOT NULL DEFAULT FALSE,
  review_reason TEXT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
```

`status` enum:

```text
ON_TIME | LATE | EARLY_LEAVE | LATE_AND_EARLY_LEAVE | ABSENT | MISSING_CHECKOUT | OT | UNASSIGNED | MANUAL_ADJUSTED
```

`payroll_status` enum:

```text
DRAFT | PENDING_APPROVAL | APPROVED | REJECTED | LOCKED
```

### 8.6. `work_segments`

```sql
CREATE TABLE work_segments (
  id UUID PRIMARY KEY,
  attendance_record_id UUID NOT NULL REFERENCES attendance_records(id),
  segment_type VARCHAR(50) NOT NULL,
  start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  end_at TIMESTAMP WITH TIME ZONE NOT NULL,
  minutes INT NOT NULL,
  multiplier DECIMAL(5,2) NOT NULL,
  pay_amount DECIMAL(18,2) NULL,
  approval_status VARCHAR(30) NOT NULL DEFAULT 'AUTO_APPROVED',
  rule_id UUID NULL,
  created_at TIMESTAMP NOT NULL
);
```

`approval_status` enum:

```text
AUTO_APPROVED | PENDING | APPROVED | REJECTED
```

### 8.7. `payroll_multiplier_rules`

```sql
CREATE TABLE payroll_multiplier_rules (
  id UUID PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  day_type VARCHAR(30) NOT NULL,
  segment_type VARCHAR(50) NOT NULL,
  multiplier DECIMAL(5,2) NOT NULL,
  minimum_legal_multiplier DECIMAL(5,2) NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  effective_from DATE NOT NULL,
  effective_to DATE NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
```

`day_type`:

```text
NORMAL_WORKDAY | WEEKLY_REST_DAY | PUBLIC_HOLIDAY | COMPANY_HOLIDAY
```

Seed default:

```text
NORMAL_WORKDAY + OT_NORMAL_DAY = 1.50
WEEKLY_REST_DAY + OT_WEEKLY_REST = 2.00
PUBLIC_HOLIDAY + OT_PUBLIC_HOLIDAY = 3.00
NORMAL_WORKDAY + NIGHT_REGULAR = 1.30
```

### 8.8. `holiday_calendar`

```sql
CREATE TABLE holiday_calendar (
  id UUID PRIMARY KEY,
  holiday_date DATE NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  day_type VARCHAR(30) NOT NULL,
  default_multiplier DECIMAL(5,2) NULL,
  is_paid_day BOOLEAN NOT NULL DEFAULT TRUE,
  note TEXT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
```

### 8.9. `attendance_audit_logs`

```sql
CREATE TABLE attendance_audit_logs (
  id UUID PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  old_value JSONB NULL,
  new_value JSONB NULL,
  reason TEXT NULL,
  actor_id UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL
);
```

---

## 9. API contract đề xuất

### 9.1. Lấy dữ liệu lịch tuần

```http
GET /api/shift-management/week?startDate=2026-04-28
```

Response:

```json
{
  "weekStart": "2026-04-28",
  "weekEnd": "2026-05-04",
  "days": [
    {
      "date": "2026-04-29",
      "dayName": "T3",
      "isToday": true,
      "dayType": "NORMAL_WORKDAY",
      "badge": "3 ca",
      "shiftCount": 3
    },
    {
      "date": "2026-04-30",
      "dayName": "T4",
      "dayType": "PUBLIC_HOLIDAY",
      "badge": "Lễ 30/4 — 3x",
      "shiftCount": 3
    }
  ],
  "selectedDate": "2026-04-29",
  "shifts": [],
  "alerts": []
}
```

### 9.2. Lấy ca trong ngày

```http
GET /api/shift-management/days/2026-04-29/shifts
```

Response:

```json
{
  "date": "2026-04-29",
  "shifts": [
    {
      "id": "shift-instance-id",
      "templateId": "template-id",
      "name": "Ca Sáng",
      "code": "MORNING",
      "startAt": "2026-04-29T06:00:00+07:00",
      "endAt": "2026-04-29T14:00:00+07:00",
      "displayTime": "06:00 — 14:00",
      "color": "amber",
      "baseMultiplier": 1.0,
      "stats": {
        "assigned": 7,
        "present": 6,
        "onTime": 6,
        "late": 1,
        "absent": 0,
        "overtime": 0
      },
      "employeeAvatars": [
        { "employeeId": "e1", "initials": "BH", "color": "blue" }
      ],
      "statusPills": [
        { "type": "ok", "label": "6 đúng giờ" },
        { "type": "warn", "label": "1 muộn 12 phút" }
      ]
    }
  ]
}
```

### 9.3. CRUD shift template

```http
GET /api/shift-templates
POST /api/shift-templates
PUT /api/shift-templates/{id}
DELETE /api/shift-templates/{id}
```

POST body:

```json
{
  "code": "MORNING",
  "name": "Ca Sáng",
  "startTime": "06:00",
  "endTime": "14:00",
  "breakMinutes": 0,
  "baseMultiplier": 1.0,
  "color": "amber",
  "checkinEarlyMinutes": 30,
  "checkinLateMinutes": 120,
  "lateGraceMinutes": 5,
  "checkoutGraceMinutes": 5,
  "requiresAssignment": true
}
```

### 9.4. Generate shift instances

```http
POST /api/shift-instances/generate
```

Body:

```json
{
  "fromDate": "2026-04-28",
  "toDate": "2026-05-04",
  "templateIds": ["morning-template-id", "afternoon-template-id", "night-template-id"],
  "skipWeeklyRestDays": false,
  "overwriteExisting": false
}
```

### 9.5. Gán nhân viên vào ca

```http
POST /api/shift-instances/{shiftInstanceId}/assignments
```

Body:

```json
{
  "employeeIds": ["employee-id-1", "employee-id-2"],
  "roleName": "Thợ CNC"
}
```

### 9.6. Check-in

```http
POST /api/attendance/check-in
```

Body:

```json
{
  "employeeId": "employee-id",
  "shiftInstanceId": "shift-instance-id-optional",
  "eventAt": "2026-04-29T06:02:00+07:00",
  "source": "WEB"
}
```

Response:

```json
{
  "attendanceRecordId": "record-id",
  "shiftInstanceId": "shift-id",
  "status": "ON_TIME",
  "lateMinutes": 0,
  "message": "Check-in thành công cho Ca Sáng"
}
```

Error examples:

```json
{
  "code": "SHIFT_NOT_FOUND_FOR_CHECKIN_TIME",
  "message": "Không tìm thấy ca phù hợp với thời điểm check-in. Vui lòng chọn ca hoặc liên hệ quản lý."
}
```

```json
{
  "code": "EMPLOYEE_NOT_ASSIGNED_TO_SHIFT",
  "message": "Nhân viên chưa được phân vào ca này."
}
```

### 9.7. Check-out

```http
POST /api/attendance/check-out
```

Body:

```json
{
  "employeeId": "employee-id",
  "attendanceRecordId": "record-id-optional",
  "eventAt": "2026-04-29T15:32:00+07:00",
  "source": "WEB"
}
```

Response:

```json
{
  "attendanceRecordId": "record-id",
  "status": "OT",
  "totalWorkMinutes": 574,
  "regularMinutes": 480,
  "overtimeMinutes": 92,
  "segments": [
    {
      "type": "REGULAR",
      "minutes": 480,
      "multiplier": 1.0
    },
    {
      "type": "OT_NORMAL_DAY",
      "minutes": 92,
      "multiplier": 1.5,
      "approvalStatus": "PENDING"
    }
  ],
  "message": "Check-out thành công. Có 1.53 giờ OT cần duyệt."
}
```

### 9.8. Chi tiết chấm công theo ca

```http
GET /api/shift-instances/{shiftInstanceId}/attendance
```

Response:

```json
{
  "shift": {
    "id": "shift-id",
    "name": "Ca Sáng",
    "displayDate": "29/04",
    "displayTime": "06:00 — 14:00"
  },
  "records": [
    {
      "employeeId": "e1",
      "employeeName": "Nguyễn Văn Bình",
      "roleName": "Thợ CNC",
      "checkInDisplay": "06:02",
      "checkOutDisplay": "14:00",
      "workHoursDisplay": "7.97h",
      "status": "ON_TIME",
      "statusLabel": "Đúng giờ",
      "statusPillType": "ok",
      "lateTag": null,
      "otTag": null
    },
    {
      "employeeId": "e2",
      "employeeName": "Trần Thị Linh",
      "roleName": "Thợ hàn",
      "checkInDisplay": "06:14",
      "checkOutDisplay": "14:00",
      "workHoursDisplay": "7.77h",
      "status": "LATE",
      "statusLabel": "Muộn 14p",
      "statusPillType": "warn",
      "lateTag": "+14p",
      "otTag": null
    }
  ]
}
```

### 9.9. Cài đặt hệ số

```http
GET /api/payroll-multiplier-rules
PUT /api/payroll-multiplier-rules/{id}
```

Validation khi update:

```pseudo
if new_multiplier < minimum_legal_multiplier:
  return warning or block depending config
```

Response warning:

```json
{
  "saved": false,
  "warningCode": "BELOW_LEGAL_MINIMUM",
  "message": "Hệ số 2.0x thấp hơn mức tối thiểu 3.0x cho OT ngày lễ. Cần quyền override pháp lý để lưu."
}
```

### 9.10. Payroll preview

```http
GET /api/payroll/preview?fromDate=2026-04-01&toDate=2026-04-30&employeeId=optional
```

Response:

```json
{
  "period": {
    "fromDate": "2026-04-01",
    "toDate": "2026-04-30"
  },
  "employees": [
    {
      "employeeId": "e1",
      "employeeName": "Nguyễn Văn Bình",
      "regularHours": 176.0,
      "overtimeHours": 12.5,
      "nightHours": 24.0,
      "holidayHours": 8.0,
      "grossPayPreview": 14500000,
      "recordsNeedReview": 1
    }
  ]
}
```

---

## 10. Frontend implementation spec

### 10.1. Page route

Đề xuất route:

```text
/shift-management
```

Hoặc nếu dự án có module HR:

```text
/hr/shift-management
```

### 10.2. Component tree

```text
ShiftManagementPage
├── PageHeader
│   ├── title: Quản lý Ca làm việc
│   ├── subtitle: Tuần {weekNumber} — {startDate} đến {endDate}
│   ├── Button: Cài đặt ca
│   └── Button: + Thêm ca
├── ShiftTabs
│   ├── Lịch tuần
│   ├── Danh sách ca
│   └── Cài đặt hệ số
├── WeekStrip
│   └── DayCell[]
├── OTAlertBanner[]
├── ShiftCardsArea
│   └── ShiftCard[]
└── AttendanceDetailTable
    └── AttendanceRow[]
```

### 10.3. UI states

Page cần xử lý các state:

```text
LOADING_WEEK
LOADING_DAY_SHIFTS
LOADING_ATTENDANCE
EMPTY_NO_SHIFT
EMPTY_NO_ASSIGNMENT
ERROR_FETCH_FAILED
READY
```

### 10.4. Visual design theo mockup

Dùng dark theme theo demo:

```css
--bg: #0f1117;
--bg2: #161b27;
--bg3: #1e2435;
--bg4: #252d42;
--border: #2a3350;
--border2: #374060;
--text: #e2e8f8;
--text2: #8b96b8;
--text3: #4a5578;
--blue: #4f8ef7;
--green: #22c87a;
--amber: #f5a623;
--red: #f0506e;
--purple: #a78bfa;
```

Font:

```text
Primary: Be Vietnam Pro
Mono: IBM Plex Mono
```

Nếu dự án không dùng Google Fonts, dùng fallback:

```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

### 10.5. Tab: Lịch tuần

Yêu cầu:

- Hiển thị week strip từ `weekStart` đến `weekEnd`.
- Click vào ngày để load ca của ngày đó.
- Ngày hiện tại có style `today`.
- Ngày lễ hiển thị badge, ví dụ `Lễ 30/4 — 3x` hoặc theo cấu hình.
- Ngày nghỉ không có ca hiển thị badge `Nghỉ`.
- Shift cards hiển thị theo thứ tự `start_at` tăng dần.

### 10.6. Shift card

Mỗi card hiển thị:

- Accent color theo ca.
- Tên ca.
- Giờ ca dạng `HH:mm — HH:mm`.
- Hệ số lương base.
- Stats:
  - `{present}/{assigned} có mặt`
  - `{late} đi muộn`
  - `{absent} vắng không phép`
- Avatar initials tối đa 4 người + `+N`.
- Status pills:
  - `ok`: đúng giờ.
  - `warn`: muộn.
  - `absent`: vắng.
  - `ot`: OT.

Click card:

- Set ca đang chọn.
- Load bảng chi tiết chấm công bên dưới.

### 10.7. OT alert banner

Hiển thị khi có record có `overtime_minutes >= minimum_ot_minutes` hoặc cần duyệt.

Nội dung mẫu:

```text
⚠ Nguyễn Văn Bình đã làm việc 9.5 giờ — vượt 1.5 giờ OT. Ca chiều hôm nay đang tự động áp hệ số 1.5x. Xem chi tiết →
```

Click `Xem chi tiết`:

- Scroll đến attendance row tương ứng hoặc mở drawer chi tiết.

### 10.8. Attendance detail table

Columns:

| Column | Mô tả |
|---|---|
| Nhân viên | Tên nhân viên + role. |
| Check-in | Giờ check-in, tag muộn nếu có. |
| Check-out | Giờ check-out, tag OT nếu có. |
| Giờ làm | Tổng giờ làm, 2 chữ số thập phân. |
| Trạng thái | Pill trạng thái. |

Rules hiển thị màu:

| Status | Pill | Màu |
|---|---|---|
| `ON_TIME` | `Đúng giờ` | xanh lá |
| `LATE` | `Muộn {n}p` | amber |
| `ABSENT` | `Vắng` | đỏ |
| `OT` | `OT {multiplier}x` | tím |
| `MISSING_CHECKOUT` | `Thiếu check-out` | amber/đỏ tùy severity |

### 10.9. Tab: Danh sách ca

Hiển thị bảng cấu hình shift templates:

Columns:

- Mã ca
- Tên ca
- Giờ bắt đầu
- Giờ kết thúc
- Qua ngày
- Nghỉ giữa ca
- Hệ số base
- Check-in window
- Grace muộn
- Trạng thái
- Actions: sửa, xóa mềm, nhân bản

Actions:

- `Thêm ca`: mở modal tạo ca.
- `Sửa`: mở modal với dữ liệu hiện tại.
- `Nhân bản`: tạo ca mới từ ca hiện tại.
- `Xóa`: soft delete nếu chưa có payroll locked.

### 10.10. Tab: Cài đặt hệ số

Hiển thị:

1. Bảng multiplier rules.
2. Form chỉnh hệ số.
3. Holiday calendar.
4. Warning nếu thấp hơn mức tối thiểu.

Columns multiplier:

- Loại ngày
- Loại giờ
- Hệ số đang áp dụng
- Mức tối thiểu pháp lý
- Hiệu lực từ
- Hiệu lực đến
- Trạng thái
- Actions

---

## 11. Service layer / domain functions

Nên tách business logic thành pure functions để dễ test.

### 11.1. `resolveShiftForCheckIn`

```ts
type ResolveShiftInput = {
  employeeId: string;
  eventAt: string;
  explicitShiftInstanceId?: string;
};

type ResolveShiftResult = {
  shiftInstanceId: string | null;
  assignmentId: string | null;
  resolution: 'EXPLICIT' | 'AUTO_MATCHED' | 'MULTIPLE_MATCHES' | 'NOT_FOUND';
  candidates: ShiftCandidate[];
};
```

### 11.2. `calculateAttendanceRecord`

```ts
type CalculateAttendanceInput = {
  shiftStartAt: string;
  shiftEndAt: string;
  checkInAt: string;
  checkOutAt?: string;
  breakMinutes: number;
  lateGraceMinutes: number;
  checkoutGraceMinutes: number;
  minimumOtMinutes: number;
  timezone: string;
};

type CalculateAttendanceResult = {
  regularMinutes: number;
  overtimeMinutes: number;
  nightMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  totalWorkMinutes: number;
  status: AttendanceStatus;
  segments: WorkSegmentDraft[];
};
```

### 11.3. `splitWorkSegmentsByRules`

```ts
type SplitWorkSegmentsInput = {
  actualStartAt: string;
  actualEndAt: string;
  shiftStartAt: string;
  shiftEndAt: string;
  holidays: Holiday[];
  rules: PayrollMultiplierRule[];
  nightWindow: { startTime: string; endTime: string };
};
```

Function này cần:

1. Cắt theo boundary: shift start/end, midnight, night start/end, holiday dates.
2. Gán segment type.
3. Gán multiplier.
4. Trả về danh sách segment không overlap.

### 11.4. `validateMultiplierRule`

```ts
type ValidateMultiplierRuleResult = {
  valid: boolean;
  severity: 'OK' | 'WARNING' | 'BLOCKING';
  code?: 'BELOW_LEGAL_MINIMUM' | 'INVALID_DATE_RANGE' | 'DUPLICATED_RULE';
  message?: string;
};
```

---

## 12. Permission/RBAC

| Role | Quyền |
|---|---|
| `ADMIN` | Toàn quyền cấu hình ca, hệ số, ngày lễ, sửa công, chốt payroll. |
| `HR_MANAGER` | Quản lý ca, phân ca, xem/tính công, cấu hình hệ số nếu được cấp quyền. |
| `SUPERVISOR` | Xem ca thuộc xưởng/tổ, duyệt OT, sửa check-out có lý do. |
| `EMPLOYEE` | Check-in/check-out, xem công cá nhân. |
| `PAYROLL_ACCOUNTANT` | Xem/chốt payroll, không sửa raw attendance nếu không có quyền. |

Rule:

- Mọi sửa công thủ công phải ghi audit log.
- Không cho sửa record khi `payroll_status = LOCKED`, trừ Admin mở khóa bằng action riêng.

---

## 13. Validation và error handling

### 13.1. Validation nghiệp vụ

| Case | Xử lý |
|---|---|
| Check-in ngoài mọi ca | Từ chối hoặc tạo `UNASSIGNED` theo config. |
| Check-in ca chưa được phân | Từ chối nếu `requires_assignment = true`. |
| Check-in trùng record đang mở | Trả record đang mở, không tạo mới. |
| Check-out khi chưa check-in | Báo lỗi `NO_OPEN_ATTENDANCE_RECORD`. |
| Check-out trước check-in | Báo lỗi `CHECKOUT_BEFORE_CHECKIN`. |
| Sửa ca đã chốt payroll | Không cho sửa thời gian, chỉ cho inactive cho tương lai. |
| Rule hệ số thấp hơn luật | Warning/block theo config. |
| Phân ca trùng giờ | Từ chối hoặc cần quyền override. |

### 13.2. Error codes

```text
SHIFT_TEMPLATE_CODE_DUPLICATED
SHIFT_DURATION_INVALID
SHIFT_INSTANCE_ALREADY_EXISTS
EMPLOYEE_NOT_ASSIGNED_TO_SHIFT
SHIFT_NOT_FOUND_FOR_CHECKIN_TIME
MULTIPLE_SHIFT_CANDIDATES
NO_OPEN_ATTENDANCE_RECORD
CHECKOUT_BEFORE_CHECKIN
ATTENDANCE_RECORD_LOCKED
MULTIPLIER_BELOW_LEGAL_MINIMUM
HOLIDAY_DATE_DUPLICATED
```

---

## 14. Background jobs

### 14.1. Generate daily shift instances

Job chạy hằng ngày hoặc theo tuần:

```text
Job: GenerateShiftInstances
Schedule: mỗi ngày 00:05 hoặc khi HR tạo lịch tuần
Input: date range
Output: shift_instances cho các template active
```

### 14.2. Mark absent

```text
Job: MarkAbsentAssignments
Schedule: mỗi 30 phút
Logic: với assignment SCHEDULED mà ca đã kết thúc và không có attendance_record -> ABSENT
```

### 14.3. Recalculate attendance

```text
Job: RecalculateAttendanceRecords
Trigger: thay đổi shift, holiday calendar, multiplier rules hoặc manual adjustment
```

Cần tránh recalculation cho payroll locked records.

---

## 15. Migration từ hệ thống chấm công cũ

### 15.1. Migration database

1. Tạo các bảng mới.
2. Seed 3 shift templates mặc định:
   - `MORNING`: `06:00-14:00`, multiplier `1.0`, color `amber`.
   - `AFTERNOON`: `14:00-22:00`, multiplier `1.0`, color `blue`.
   - `NIGHT`: `22:00-06:00`, multiplier `1.3`, color `purple`.
3. Seed multiplier rules default.
4. Seed holiday calendar cho năm hiện tại nếu HR cung cấp.

### 15.2. Backfill dữ liệu cũ

Nếu dữ liệu cũ chỉ có check-in/check-out tự do:

1. Import vào `attendance_events` với `source = IMPORT`.
2. Thử auto-match ca theo giờ.
3. Nếu không match, tạo `attendance_records.status = UNASSIGNED`.
4. Không tự chốt payroll cho dữ liệu backfill nếu chưa review.

---

## 16. Test cases bắt buộc

### 16.1. Unit tests cho ca thường

| Case | Input | Expected |
|---|---|---|
| Đúng giờ trong grace | Ca `06:00-14:00`, check-in `06:02`, grace `5` | `ON_TIME`, `late=0` |
| Muộn ngoài grace | Ca `06:00-14:00`, check-in `06:14`, grace `5` | `LATE`, `late=9` nếu tính sau grace; UI có thể hiển thị raw `+14p` theo config |
| Về sớm | Check-out `13:40`, checkout grace `5` | `EARLY_LEAVE`, `early_leave=15` |
| OT sau ca | Check-out `15:32` | `OT`, `overtime=92` |
| Thiếu check-out | Có check-in, không checkout | `MISSING_CHECKOUT` |

### 16.2. Unit tests cho ca qua ngày

| Case | Input | Expected |
|---|---|---|
| Ca đêm bình thường | `22:00-06:00`, check-in `21:55`, checkout `06:00` | shift end là ngày hôm sau |
| Check-out sau nửa đêm | `22:00-06:00`, checkout `06:30` | OT sau ca `30 phút` |
| Split ngày lễ | `22:00-06:00`, ngày sau là lễ | Tách segment tại `00:00` |

### 16.3. Unit tests cho multiplier

| Case | Expected |
|---|---|
| OT ngày thường | `1.5x` |
| OT ngày nghỉ hằng tuần | `2.0x` |
| OT ngày lễ default | `3.0x` |
| Ca đêm trong giờ `22:00-06:00` | Có night segment |
| Rule thấp hơn minimum | Warning/block |

### 16.4. API integration tests

1. Tạo shift template thành công.
2. Generate shift instances cho 1 tuần.
3. Gán nhân viên vào ca.
4. Check-in đúng giờ.
5. Check-out có OT.
6. Lấy attendance detail thấy đúng status và giờ.
7. Payroll preview tính đúng tổng giờ.
8. Không thể sửa attendance đã locked.

### 16.5. UI acceptance tests

1. Mở `/shift-management` thấy header, tabs, week strip.
2. Click ngày khác load shift cards mới.
3. Card Ca Sáng hiển thị `06:00 — 14:00`, hệ số `1.0x`.
4. Card Ca Đêm hiển thị `22:00 — 06:00`, hệ số `1.3x`.
5. Alert OT hiển thị khi có record OT.
6. Bảng chi tiết hiển thị tag `+14p` cho nhân viên muộn.
7. Bảng chi tiết hiển thị tag `OT` và pill `OT 1.5x` cho nhân viên làm thêm.
8. Tab `Cài đặt hệ số` cảnh báo khi nhập hệ số ngày lễ thấp hơn default pháp lý.

---

## 17. Acceptance criteria tổng thể

Feature được coi là hoàn thành khi:

1. Admin tạo/sửa/xóa mềm được shift template.
2. Hệ thống sinh được shift instances theo ngày/tuần.
3. Nhân viên check-in/check-out được gắn với ca hợp lệ.
4. Check-in ngoài ca không còn được chấp nhận tự do, trừ khi config cho phép `UNASSIGNED`.
5. Hệ thống tính đúng:
   - tổng giờ làm,
   - giờ trong ca,
   - giờ OT,
   - đi muộn,
   - về sớm,
   - vắng,
   - thiếu check-out.
6. Ca qua ngày `22:00-06:00` hoạt động đúng.
7. Payroll segments được sinh với multiplier đúng rule.
8. UI khớp mockup chính: header, tabs, week strip, shift cards, alert banner, attendance table.
9. Có audit log cho mọi thao tác sửa công/hệ số/ngày lễ.
10. Có test tự động cho calculation và API chính.

---

## 18. Gợi ý thứ tự implement cho Antigravity

Thực hiện theo thứ tự sau để giảm rủi ro:

### Step 1: Database migration và seed data

- Thêm các bảng trong mục Data model.
- Seed shift templates mặc định.
- Seed multiplier rules.

### Step 2: Domain calculation functions

- Implement `buildShiftDateTime`.
- Implement `resolveShiftForCheckIn`.
- Implement `calculateAttendanceRecord`.
- Implement `splitWorkSegmentsByRules`.
- Viết unit tests trước khi nối API.

### Step 3: API backend

- CRUD shift templates.
- Generate shift instances.
- Assign employees.
- Check-in/check-out.
- Attendance detail.
- Multiplier settings.

### Step 4: Frontend page theo mockup

- Tạo route `/shift-management`.
- Implement layout dark theme.
- Implement tabs.
- Implement WeekStrip.
- Implement ShiftCard.
- Implement OTAlertBanner.
- Implement AttendanceDetailTable.
- Nối API thật; nếu API chưa xong thì dùng mock adapter có cùng contract.

### Step 5: Payroll preview và approval

- Sinh work segments.
- Preview tổng giờ/lương.
- Approval workflow cho OT nếu cần.

### Step 6: Hardening

- RBAC.
- Audit log.
- Locked payroll protection.
- E2E tests.

---

## 19. Pseudocode lõi

### 19.1. Build shift start/end

```ts
function buildShiftDateTime(workDate, startTime, endTime, timezone) {
  const startAt = zonedDateTime(workDate, startTime, timezone);
  let endAt = zonedDateTime(workDate, endTime, timezone);

  if (endAt <= startAt) {
    endAt = addDays(endAt, 1);
  }

  return { startAt, endAt };
}
```

### 19.2. Check-in matching

```ts
async function resolveShiftForCheckIn(input) {
  if (input.explicitShiftInstanceId) {
    return validateExplicitShift(input.employeeId, input.explicitShiftInstanceId, input.eventAt);
  }

  const candidates = await findAssignedShiftsAroundTime(input.employeeId, input.eventAt);
  const valid = candidates.filter(candidate => {
    const windowStart = addMinutes(candidate.startAt, -candidate.checkinEarlyMinutes);
    const windowEnd = addMinutes(candidate.startAt, candidate.checkinLateMinutes);
    return input.eventAt >= windowStart && input.eventAt <= windowEnd;
  });

  if (valid.length === 0) return { resolution: 'NOT_FOUND', shiftInstanceId: null, candidates: [] };
  if (valid.length === 1) return { resolution: 'AUTO_MATCHED', shiftInstanceId: valid[0].id, candidates: valid };

  valid.sort((a, b) => absDiff(input.eventAt, a.startAt) - absDiff(input.eventAt, b.startAt));
  return { resolution: 'AUTO_MATCHED', shiftInstanceId: valid[0].id, candidates: valid };
}
```

### 19.3. Attendance calculation

```ts
function calculateAttendanceRecord(input) {
  const totalMinutes = diffMinutes(input.checkInAt, input.checkOutAt) - input.breakMinutes;

  const regularOverlap = overlapMinutes(
    input.checkInAt,
    input.checkOutAt,
    input.shiftStartAt,
    input.shiftEndAt
  );

  const regularMinutes = Math.max(0, regularOverlap - input.breakMinutes);
  const otBefore = Math.max(0, diffMinutes(input.checkInAt, min(input.checkOutAt, input.shiftStartAt)));
  const otAfter = Math.max(0, diffMinutes(max(input.checkInAt, input.shiftEndAt), input.checkOutAt));
  const overtimeRaw = otBefore + otAfter;
  const overtimeMinutes = overtimeRaw >= input.minimumOtMinutes ? overtimeRaw : 0;

  const lateRaw = Math.max(0, diffMinutes(input.shiftStartAt, input.checkInAt));
  const lateMinutes = Math.max(0, lateRaw - input.lateGraceMinutes);

  const earlyRaw = Math.max(0, diffMinutes(input.checkOutAt, input.shiftEndAt));
  const earlyLeaveMinutes = Math.max(0, earlyRaw - input.checkoutGraceMinutes);

  const status = deriveAttendanceStatus({ lateMinutes, earlyLeaveMinutes, overtimeMinutes });

  return {
    totalWorkMinutes: totalMinutes,
    regularMinutes,
    overtimeMinutes,
    lateMinutes,
    earlyLeaveMinutes,
    status
  };
}
```

---

## 20. Open questions cần xác nhận với nghiệp vụ

1. Công ty muốn **hiển thị số phút muộn raw** hay **số phút muộn sau grace**? Mockup hiển thị `+14p`, nên UI có thể hiển thị raw, còn payroll/kỷ luật dùng sau grace.
2. OT có cần quản lý duyệt trước khi tính lương không?
3. OT trước ca có tính không, hay chỉ tính OT sau ca?
4. Nghỉ giữa ca là cố định hay nhân viên phải check-out/check-in nghỉ?
5. Một nhân viên có được làm 2 ca liên tục trong cùng ngày không?
6. Ngày lễ trong mockup đang hiển thị `2x`; công ty có rule nội bộ riêng hay cần chuyển về default pháp lý `3x` cho OT ngày lễ?
7. Lương ca đêm `1.3x` áp cho toàn bộ ca đêm hay chỉ giờ nằm trong khung `22:00-06:00`?
8. Khi check-in ngoài ca, hệ thống nên từ chối hay cho tạo `UNASSIGNED` để quản lý xử lý sau?

---

## 21. Definition of Done

- Code build pass.
- Unit tests calculation pass.
- API tests pass.
- UI render đúng dark mockup ở desktop width.
- Không có check-in tự do không gắn ca trừ config `allow_unassigned_checkin`.
- Audit log hoạt động cho sửa công và sửa hệ số.
- Tài liệu API và seed data được cập nhật.
- Có migration rollback hoặc script revert an toàn.
