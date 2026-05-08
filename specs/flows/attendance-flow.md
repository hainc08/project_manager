# Flow: Attendance Check-in / Check-out

**Last updated:** 2026-05-08

---

## Full Flow

```
Admin                       System                      Employee (Staff)
  │                            │                              │
  ├── Assign shift ────────────►│                              │
  │   (ShiftManagement UI)      │──Insert shift_assignment────►│
  │                            │                              │
  │   [Optional: assign task]   │                              │
  ├── Create task ─────────────►│                              │
  │   with target_shift_id      │──Auto-create assignment ────►│
  │                            │                              │
  │                            │          Login & open /worklog│◄──
  │                            │                              │
  │                            │◄──GET /my-shift-today────────┤
  │                            │──shift info + canCheckIn────►│
  │                            │                              │
  │                            │◄──POST /staff-check-in───────┤
  │                            │  (any time, no restriction)  │
  │                            │──Determine status:           │
  │                            │  EARLY / ON_TIME / LATE      │
  │                            │──Insert attendance_record────►│
  │                            │──Return status message───────►│
  │                            │                              │
  │                            │     [Employee works tasks]   │
  │                            │     POST /worklogs/start     │
  │                            │     POST /worklogs/stop      │
  │                            │                              │
  │                            │◄──POST /staff-check-out──────┤
  │                            │  (blocked if task running)   │
  │                            │──Calculate work minutes ─────►│
  │                            │──Update attendance_record────►│
  │                            │──Return summary──────────────►│
```

---

## Status Determination at Check-in

```
diff = now - shift_start (minutes)
grace = late_grace_minutes (default: 10)

if diff < 0      → EARLY   (arrived before shift start)
if diff <= grace → ON_TIME (within grace period)
if diff > grace  → LATE    (late_minutes = diff - grace)
```

---

## Check-out Calculation

```
total_work_minutes = floor((check_out - check_in) / 60) - break_minutes
shift_end = shift_instances.end_at
regular_minutes = min(total_work_minutes, shift_duration_minutes)
overtime_minutes = max(0, total_work_minutes - shift_duration_minutes)
```

---

## Key API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/shift-management/my-shift-today` | Get today's shift + attendance status |
| POST | `/api/shift-management/staff-check-in` | Check in to shift |
| POST | `/api/shift-management/staff-check-out` | Check out of shift |
| GET | `/api/attendance/my-status` | Check if currently checked in (gates task list) |
| GET | `/api/attendance/report` | Admin attendance report with filters |

---

## Guards

- Cannot check in twice to same shift instance.
- Cannot check out without having checked in.
- Cannot check out while a worklog is `IN_PROGRESS`.
- Admin cannot delete a shift assignment if employee has already checked in.
