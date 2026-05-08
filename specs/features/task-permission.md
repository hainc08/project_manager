# Feature: Task Access & Permissions

**Status:** Implemented  
**Last updated:** 2026-05-08

---

## Task Lifecycle

```
TODO → DOING → FINISHED_BY_STAFF → DONE
                                  ↓
                               CANCELLED
```

| Status | Meaning | Who sets it |
|---|---|---|
| `TODO` | Assigned, not started | Admin (on create) |
| `DOING` | First worklog started | System (auto) |
| `FINISHED_BY_STAFF` | Staff marked complete | Staff |
| `DONE` | Approved by admin | Admin |
| `CANCELLED` | Cancelled | Admin |

---

## Permission Matrix

| Action | ADMIN | ACCOUNTANT | STAFF |
|---|---|---|---|
| View all tasks | ✅ | ✅ | ❌ |
| View own tasks | ✅ | ✅ | ✅ |
| Create task | ✅ | ❌ | ❌ |
| Edit task | ✅ | ❌ | ❌ |
| Delete task (no worklogs) | ✅ | ❌ | ❌ |
| Start task (worklog) | — | — | ✅ (own) |
| Stop task (worklog) | — | — | ✅ (own) |
| Mark FINISHED | — | — | ✅ (own) |
| Approve → DONE | ✅ | ❌ | ❌ |

---

## Task Start Prerequisites

Employee must meet ALL conditions to start a task:

1. **Checked in** to a shift today (`attendance_records` with `check_out_at IS NULL`).
2. **No other task** is currently `IN_PROGRESS` (one task at a time rule).
3. **Task is assigned** to the employee (`assigned_to = user_id`).
4. **Task status** is `TODO` or `DOING` (not `DONE`, `FINISHED_BY_STAFF`, `CANCELLED`).
5. **Project is ACTIVE**.

Late check-in does **NOT** block task access.

---

## Auto Shift Assignment on Task Create

When admin creates a task with `target_shift_id`:
- System checks if today's shift instance exists for that template.
- If yes → automatically creates `shift_assignment` for the assigned employee.
- Employee can immediately check in without a separate manual assignment step.

---

## Implementation

| Layer | File | Endpoint |
|---|---|---|
| Backend | `routes/tasks.js` | `GET /tasks`, `GET /tasks/my`, `POST /tasks`, `PUT /:id`, `PUT /:id/finish`, `PUT /:id/approve` |
| Backend | `routes/worklogs.js` | `POST /start`, `POST /stop` |
| Frontend | `pages/TaskManagement.jsx` | Admin task CRUD |
| Frontend | `pages/StaffWorklog.jsx` | Staff task start/stop |
