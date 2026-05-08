# Feature: Attendance Check-in

**Status:** Implemented  
**Last updated:** 2026-05-08

---

## Overview

Employees check in/out via the **ShiftCheckInWidget** on the Staff Worklog page.  
Check-in is tied to a **shift assignment** — admin must assign employees to a shift before they can check in.

---

## Rules

### 1. Check-in is always allowed

The system does **not** restrict check-in based on time windows.  
Employees can check in at any time as long as they have a shift assignment for today.

| Scenario | Allowed | Status recorded |
|---|---|---|
| Check-in before shift start | ✅ Yes | EARLY |
| Check-in within grace period (10 min) | ✅ Yes | ON_TIME |
| Check-in after grace period | ✅ Yes | LATE |
| Check-in after shift ends | ✅ Yes | LATE |

### 2. Attendance Status

| Status | Condition |
|---|---|
| `EARLY` | `now < shift_start` |
| `ON_TIME` | `0 <= (now - shift_start) <= late_grace_minutes (10)` |
| `LATE` | `(now - shift_start) > late_grace_minutes` |

`late_minutes` = actual minutes late after grace period (only for LATE status).

### 3. Check-out rules

- Employee must have checked in to the same shift instance.
- Employee must stop all active worklogs before checking out.
- Check-out calculates `total_work_minutes`, `regular_minutes`, `overtime_minutes`.

### 4. Auto shift assignment

When admin creates a task with `target_shift_id`, the system automatically creates a `shift_assignment` for that employee in today's shift instance.

---

## Implementation

| Layer | File | Function |
|---|---|---|
| Backend | `routes/shift_management.js` | `GET /my-shift-today`, `POST /staff-check-in`, `POST /staff-check-out` |
| Frontend | `pages/ShiftCheckInWidget.jsx` | Widget UI |
| Frontend | `pages/StaffWorklog.jsx` | Hosts widget, gates task list |

---

## Constraints

- Attendance status is for **tracking/reporting only** — it does NOT block task access.
- `activeAttendance` state in `StaffWorklog` gates the task list (must be checked in to start tasks).
- A user can only have one active (unchecked-out) attendance record per shift instance.
