# Bug: Late Check-in Blocks Task Access

**Status:** Fixed  
**Fixed on:** 2026-05-08

---

## Problem

Employees who checked in late (or outside the original check-in window) were **blocked from starting tasks**.

The system used a time-window guard (`canCheckIn = nowMs >= windowStart && nowMs <= windowEnd`) that prevented check-in entirely if the employee was outside the predefined window.

### Symptoms

1. `ShiftCheckInWidget` showed "Cửa sổ check-in chưa mở" or "Đã hết cửa sổ check-in".
2. CHECK-IN button was disabled — employee could not check in at all.
3. Without check-in, `activeAttendance` was null → task list was locked.
4. Employee could not start any work.

---

## Root Cause

```
my-shift-today endpoint:
  canCheckIn = !record?.check_in_at 
               && nowMs >= windowStart  ← time restriction
               && nowMs <= windowEnd    ← time restriction
```

`checkin_early_minutes = 30` → window opened only 30 min before shift start.  
At 10:00 AM, Ca Chiều (13:00) window hadn't opened yet → button disabled.

---

## Fix

**Backend (`routes/shift_management.js`):**
```js
// Before (wrong):
const canCheckIn = !record?.check_in_at && nowMs >= windowStart && nowMs <= windowEnd;

// After (correct):
const canCheckIn = !record?.check_in_at;  // No time restriction
```

**Frontend (`pages/ShiftCheckInWidget.jsx`):**
- Removed "window not open / expired" messages.
- CHECK-IN button always enabled when employee has a shift and hasn't checked in.
- Added informational status: "Ca chưa bắt đầu / đang diễn ra / đã kết thúc" (display only).

**Attendance status still recorded correctly:**
- `EARLY` if checked in before shift start.
- `ON_TIME` if within 10-minute grace period.
- `LATE` if after grace period (recorded but does NOT block anything).
