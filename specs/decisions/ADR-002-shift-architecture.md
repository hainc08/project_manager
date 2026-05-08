# ADR-002: Shift Architecture — Templates, Instances, Assignments

**Date:** 2026-05-08  
**Status:** Accepted

---

## Context

The system needed a shift management model that supports:
- Reusable shift definitions (e.g., "Ca Sáng" always starts at 07:30)
- Day-specific instances (each day has its own Ca Sáng occurrence)
- Per-employee assignments to specific days

---

## Decision

**Three-layer shift model:**

```
shift_templates  →  shift_instances  →  shift_assignments
(reusable def)       (one per day)        (per employee)
```

### shift_templates
Defines the "shape" of a shift: code, name, start_time, end_time, multipliers, grace periods.  
Examples: `st_morning`, `st_afternoon`, `st_evening`.

### shift_instances
Auto-generated each day per active template (via `INSERT IGNORE` in `GET /days/:date/shifts`).  
ID format: `si_MORNING_20260508`.  
Stores actual `start_at` and `end_at` datetime for that calendar day.

### shift_assignments
Links a `user_id` to a `shift_instance_id`.  
Created by:
- Admin manually via ShiftManagement UI (Phân ca nhân viên panel)
- Auto-created when admin assigns a task with `target_shift_id` (today only)

---

## Consequences

### Positive
- Instances auto-generate — admin doesn't need to "create" shifts daily.
- Assignments are explicit — clear audit trail of who was scheduled for what.
- Supports future features: absence tracking, schedule planning ahead of time.

### Negative / Trade-offs
- Two-step process for new employees (assign task + optionally assign shift).
- Auto-assignment only covers today — future date assignments require manual work.
- `payroll_multiplier_rules` management UI temporarily removed to simplify scope.

---

## Auto-generate Logic

```
On GET /api/shift-management/days/:date/shifts:
  For each active shift_template:
    INSERT IGNORE INTO shift_instances (si_CODE_YYYYMMDD, ...)
```

This ensures instances exist before they're queried — no manual setup needed.

---

## Related

- Feature: `specs/features/attendance-checkin.md`
- ADR-001: `specs/decisions/ADR-001-checkin-logic.md`
