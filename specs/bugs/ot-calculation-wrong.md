# Bug: OT Calculation Using Wrong Rule Codes

**Status:** Fixed  
**Fixed on:** 2026-05-08

---

## Problem

The `worklogs/stop` endpoint fetched payroll multiplier rules from the `payroll_multiplier_rules` table but used **incorrect rule code keys**, causing all multipliers to fall back to hardcoded defaults.

---

## Root Cause

DB stores rules with codes: `OT_NORMAL`, `OT_REST`, `OT_HOLIDAY`, `NIGHT`, `NIGHT_REST`

But the code looked up:
```js
ruleMap['OT_NORMAL_DAY']     // ← wrong key, doesn't exist
ruleMap['OT_NIGHT']          // ← wrong key, doesn't exist
ruleMap['OT_PUBLIC_HOLIDAY'] // ← wrong key, doesn't exist
```

Result: `ruleMap[key]` always returned `undefined`, so all multipliers used hardcoded defaults (1.5, 1.5, 1.5). Holiday multiplier was 1.5 instead of 2.0.

---

## Fix

Removed the DB fetch entirely. Used hardcoded correct values directly:

```js
const dynamicRules = {
  ot1_multiplier:     1.5,   // OT (17:15 – 22:15)
  ot2_multiplier:     2.0,   // Night OT (after 22:15)
  holiday_multiplier: 2.0,   // Holiday / Tet
  site_multiplier:    1.2,   // Construction site
  holidays: holidayList,     // Still fetched from holiday_calendar table
};
```

`payroll_multiplier_rules` table is kept in DB for future use when the multiplier management UI is rebuilt.

---

## Related

- See `specs/decisions/ADR-001-checkin-logic.md` for the decision to temporarily remove multiplier rules management.
- `payroll_multiplier_rules` UI (MultiplierSettings.jsx) was removed from ShiftManagement tabs.
