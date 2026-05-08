# ADR-001: Flexible Check-in — No Time Window Restriction

**Date:** 2026-05-08  
**Status:** Accepted

---

## Context

The original implementation enforced a strict check-in window:
- `checkin_early_minutes` before shift start → window opens
- `checkin_late_minutes` after shift start → window closes

This caused employees to be locked out if they arrived outside the window.  
The payroll team reported that attendance status (early/late) is needed for **reporting only**, not for access control.

---

## Decision

**Remove time-window restriction from check-in entirely.**

Employees may check in at any time as long as:
1. They have a shift assignment for today.
2. They have not already checked in to that shift.

The system will still record attendance status (`EARLY` / `ON_TIME` / `LATE`) for HR/payroll reporting.

---

## Consequences

### Positive
- Employees are never blocked from working due to timing issues.
- Simpler backend logic (no window calculation).
- Widget UI is cleaner — no confusing "window" messages.

### Negative / Trade-offs
- System cannot automatically prevent check-in for genuinely absent employees (must be handled by admin/HR manually).
- `checkin_early_minutes` / `checkin_late_minutes` fields remain in schema but are unused for access control.

---

## Alternatives Considered

| Option | Rejected reason |
|---|---|
| Keep window, just widen it | Still creates edge cases; root problem is conceptual |
| Window based on task assignment | Over-complex; tasks ≠ shift schedule |
| Auto check-in when task starts | Loses distinction between shift attendance and task tracking |

---

## Related

- `payroll_multiplier_rules` UI removed in same session — see ADR-002.
- Bug: `specs/bugs/late-checkin-block-task.md`
