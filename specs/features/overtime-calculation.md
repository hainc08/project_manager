# Feature: Overtime & Salary Calculation

**Status:** Implemented  
**Last updated:** 2026-05-08

---

## Shift Schedule

| Shift | Start | End | Break |
|---|---|---|---|
| Ca Sáng (Morning) | 07:30 | 11:30 | — |
| Ca Chiều (Afternoon) | 13:00 | 17:00 | — |
| Ca Tối (Night) | 18:00 | 22:00 | — |

**Lunch break:** 11:30 – 13:00 (1.5h gap between Ca Sáng and Ca Chiều — not deducted from any shift).

---

## Overtime Cutoff Times

| Segment | Time Range | Multiplier |
|---|---|---|
| Standard | Before 17:15 | 1.0x |
| OT1 (Afternoon OT) | 17:15 – 22:15 | 1.5x |
| OT2 (Night OT) | After 22:15 | 2.0x |

OT starts 15 minutes after Ca Chiều ends (17:00 + 15min = 17:15) as a grace period.

---

## Salary Multipliers

### Factory / Workshop Work

| Type | Multiplier |
|---|---|
| Normal work | 1.0x base salary |
| Overtime (OT1) | 1.5x base salary |
| Night overtime (OT2) | 2.0x base salary |
| Holiday / Tet work | 2.0x base salary |

### Construction Site Work

| Type | Multiplier |
|---|---|
| Administrative / normal work | 1.2x base salary |
| Overtime at site | 1.5x base salary (takes max of 1.2 and 1.5) |

---

## Calculation Formula

```
actual_cost = (standard_hours × rate × location_mult)
            + (ot1_hours × rate × 1.5)
            + (ot2_hours × rate × 2.0)

actual_revenue = total_hours × billing_rate
```

**Holiday override:** If work date is a public holiday, entire session = `total_hours × rate × 2.0`.

---

## Implementation

| Layer | File | Function |
|---|---|---|
| Backend | `utils/helpers.js` | `calculateLaborCost()` |
| Backend | `routes/worklogs.js` | `POST /stop`, `PUT /:id` |
| Config | `db/` | `holiday_calendar` table, `payroll_multiplier_rules` table |

---

## Notes

- `payroll_multiplier_rules` table exists in DB but the UI to manage it has been temporarily removed (planned for future rebuild).
- Holiday list is fetched from `holiday_calendar` table and passed into `calculateLaborCost()`.
- SITE multiplier uses `Math.max(1.2, ot_multiplier)` — does not stack multiplicatively.
