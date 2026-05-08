# Schema: Attendance & Shift Tables

**Last updated:** 2026-05-08

---

## Table: shift_templates

Reusable shift definitions. One row per shift type.

| Column | Type | Description |
|---|---|---|
| `id` | VARCHAR(50) PK | e.g. `st_morning` |
| `code` | VARCHAR(50) UNIQUE | `MORNING`, `AFTERNOON`, `EVENING` |
| `name` | VARCHAR(100) | Display name |
| `start_time` | TIME | e.g. `07:30:00` |
| `end_time` | TIME | e.g. `11:30:00` |
| `break_minutes` | INT | Deducted from work time on check-out |
| `base_multiplier` | REAL | Base salary multiplier (1.0, 1.2 for night) |
| `color` | VARCHAR(30) | UI color: `amber`, `blue`, `purple` |
| `checkin_early_minutes` | INT | Info only — no longer blocks check-in |
| `checkin_late_minutes` | INT | Info only — no longer blocks check-in |
| `late_grace_minutes` | INT | Minutes after shift_start before LATE status |
| `checkout_grace_minutes` | INT | Minutes after shift_end before OT kicks in |
| `requires_assignment` | BOOLEAN | Must have shift_assignment to check in |
| `is_active` | BOOLEAN | Soft delete |
| `location_type` | VARCHAR(20) | `WORKSHOP` or `SITE` |

**Current values:**

| Code | Start | End | Break | Late grace | Checkout grace |
|---|---|---|---|---|---|
| MORNING | 07:30 | 11:30 | 0 | 10 min | 15 min |
| AFTERNOON | 13:00 | 17:00 | 0 | 10 min | 15 min |
| EVENING | 18:00 | 22:00 | 0 | 10 min | 15 min |

---

## Table: shift_instances

One row per (template × calendar date). Auto-generated.

| Column | Type | Description |
|---|---|---|
| `id` | VARCHAR(50) PK | `si_MORNING_20260508` |
| `shift_template_id` | VARCHAR(50) FK | → shift_templates |
| `work_date` | DATE | Calendar date |
| `start_at` | DATETIME | Actual start: `2026-05-08 07:30:00` |
| `end_at` | DATETIME | Actual end (may be next day for night shifts) |
| `status` | VARCHAR(30) | `OPEN`, `CLOSED` |

**UNIQUE constraint:** `(shift_template_id, work_date)`

---

## Table: shift_assignments

Links employees to specific shift instances.

| Column | Type | Description |
|---|---|---|
| `id` | VARCHAR(50) PK | `sa_u_hiep_si_MORNING_20260508` |
| `shift_instance_id` | VARCHAR(50) FK | → shift_instances |
| `user_id` | VARCHAR(50) FK | → users |
| `status` | VARCHAR(30) | `SCHEDULED`, `ABSENT` |
| `assigned_by` | VARCHAR(50) | Admin user ID who created the assignment |

**UNIQUE constraint:** `(shift_instance_id, user_id)`

---

## Table: attendance_records

Processed check-in/check-out records. One per employee per shift instance.

| Column | Type | Description |
|---|---|---|
| `id` | VARCHAR(50) PK | |
| `user_id` | VARCHAR(50) FK | → users |
| `shift_instance_id` | VARCHAR(50) FK | → shift_instances (nullable if freeform) |
| `shift_assignment_id` | VARCHAR(50) FK | → shift_assignments |
| `work_date` | DATE | |
| `check_in_at` | DATETIME | Actual check-in time |
| `check_out_at` | DATETIME | Actual check-out time (NULL while active) |
| `regular_minutes` | INT | Work minutes within shift time |
| `overtime_minutes` | INT | Work minutes beyond shift time |
| `night_minutes` | INT | Future use |
| `late_minutes` | INT | Minutes late after grace period |
| `early_leave_minutes` | INT | Future use |
| `break_minutes` | INT | Deducted from total |
| `total_work_minutes` | INT | `check_out - check_in - break_minutes` |
| `status` | VARCHAR(30) | `EARLY`, `ON_TIME`, `LATE`, `ABSENT`, `COMPLETED` |
| `location_type` | VARCHAR(20) | `WORKSHOP` or `SITE` |
| `payroll_status` | VARCHAR(30) | `DRAFT`, `APPROVED` |
| `requires_review` | BOOLEAN | Flag for payroll review |
| `review_reason` | TEXT | Optional note |

---

## Table: attendance_events

Raw event log (each individual check-in/check-out action).

| Column | Type | Description |
|---|---|---|
| `id` | VARCHAR(50) PK | |
| `user_id` | VARCHAR(50) FK | |
| `event_type` | VARCHAR(20) | `CHECK_IN`, `CHECK_OUT` |
| `event_at` | DATETIME | |
| `source` | VARCHAR(30) | `WEB`, `MOBILE`, `DEVICE` |
| `shift_instance_id` | VARCHAR(50) FK | Optional |

Currently populated only by basic check-in endpoints. Shift-based check-in writes directly to `attendance_records`.

---

## Relationships

```
shift_templates ──1:N──► shift_instances ──1:N──► shift_assignments
                                │                        │
                                └────────────────────────┤
                                                         │
                                              attendance_records
                                           (shift_instance_id FK)
                                           (shift_assignment_id FK)
```
