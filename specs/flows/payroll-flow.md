# Flow: Payroll / Labor Cost Calculation

**Last updated:** 2026-05-08

---

## Trigger

Labor cost is calculated **at worklog stop** (`POST /api/worklogs/stop`).  
Also recalculated when admin edits a worklog (`PUT /api/worklogs/:id`).

---

## Calculation Flow

```
Employee stops task
        │
        ▼
Fetch task.location_type (WORKSHOP / SITE)
        │
        ▼
Fetch holiday_calendar from DB
        │
        ▼
calculateLaborCost(start_time, end_time, standard_rate, location_type, rules)
        │
        ├─ Is work_date a public holiday?
        │       YES → all hours × rate × 2.0 (holiday_multiplier)
        │       NO  → segment by time of day:
        │
        ├─ Before 17:15 → standard hours × rate × location_mult
        ├─ 17:15–22:15  → OT1 hours × rate × 1.5
        └─ After 22:15  → OT2 hours × rate × 2.0
        │
        ▼
actual_cost    = sum of all segments
actual_revenue = total_hours × user.billing_rate
        │
        ▼
UPDATE worklogs SET actual_cost, actual_revenue, standard_hours, ot_hours, ...
```

---

## Location Multiplier

| location_type | Normal | OT |
|---|---|---|
| `WORKSHOP` | 1.0x | 1.5x |
| `SITE` | 1.2x | max(1.2, 1.5) = 1.5x |

SITE OT does not stack: uses 1.5x, not 1.2 × 1.5 = 1.8x.

---

## Holiday Check

Holiday dates are stored in `holiday_calendar` table.  
The system also checks hardcoded Vietnamese holidays (fallback in `isVietnameseHoliday()`).

If `work_date` is a holiday:
- **All** hours treated as OT at `holiday_multiplier` (2.0x).
- `standard_hours = 0`, `ot_hours = total_hours`.

---

## Data Stored per Worklog

| Column | Description |
|---|---|
| `duration_hours` | standard_hours + ot_hours |
| `actual_cost` | Calculated labor cost |
| `actual_revenue` | total_hours × billing_rate |
| `standard_hours` | Hours within standard time (before 17:15) |
| `ot_hours` | Hours in OT segments |
| `location_multiplier` | 1.0 (workshop) or 1.2 (site) |
| `ot_multiplier` | Weighted average OT multiplier |
| `holiday_multiplier` | 1.0 or 2.0 |

---

## Dashboard Aggregation

```
GET /api/worklogs/dashboard

→ SUM(actual_cost)    per project, per month
→ SUM(duration_hours) per project
→ SUM(ot_hours)       per project
→ COUNT(worklogs)     total tasks completed
```

Only counts worklogs with `status = 'DONE'`.

---

## Key Files

| File | Role |
|---|---|
| `utils/helpers.js` → `calculateLaborCost()` | Core calculation logic |
| `routes/worklogs.js` → `POST /stop` | Triggers calculation |
| `routes/worklogs.js` → `GET /dashboard` | Aggregation queries |
| `routes/worklogs.js` → `GET /report` | Financial report with filters |
| `db/seed_sample_data.js` | Seeds realistic test worklogs |
