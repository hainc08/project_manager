/**
 * test_calculations.js
 * Kiểm tra tất cả logic tính toán của hệ thống
 * Chạy: node backend/test_calculations.js
 */
require('dotenv').config();
const { calculateLaborCost, roundMoney } = require('./utils/helpers');

// ── Màu terminal ──────────────────────────────────────────────────────────
const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN   = '\x1b[36m';
const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';

let passed = 0, failed = 0;
const results = [];

function assert(label, actual, expected, unit = '') {
  const ok = Math.abs(actual - expected) < 0.01;
  if (ok) {
    passed++;
    console.log(`  ${GREEN}✔${RESET} ${label}: ${actual.toLocaleString()}${unit}`);
  } else {
    failed++;
    console.log(`  ${RED}✘${RESET} ${label}`);
    console.log(`    ${RED}Expected: ${expected.toLocaleString()}${unit}${RESET}`);
    console.log(`    ${RED}Actual:   ${actual.toLocaleString()}${unit}${RESET}`);
  }
  results.push({ label, ok, actual, expected });
}

function section(title) {
  console.log(`\n${BOLD}${CYAN}━━━ ${title} ━━━${RESET}`);
}

// ── Ngày không phải lễ để test ────────────────────────────────────────────
const D = '2026-05-06'; // Thứ 4, ngày thường
const HOL = '2026-05-01'; // Ngày Quốc tế Lao động — ngày lễ

// ═════════════════════════════════════════════════════════════════════════════
section('TC-01: Giờ thường — WORKSHOP (08:00 → 17:00, 9h)');
// Expected: std=9h, ot=0h, cost = 9 × 120,000 = 1,080,000đ
{
  const m = calculateLaborCost(`${D} 08:00:00`, `${D} 17:00:00`, 120000, 'WORKSHOP');
  assert('standard_hours', m.standard_hours, 9, 'h');
  assert('ot_hours',       m.ot_hours,       0, 'h');
  assert('actual_cost',    m.actual_cost, 1080000, 'đ');
  assert('location_mult',  m.location_multiplier, 1.0);
}

// ═════════════════════════════════════════════════════════════════════════════
section('TC-02: Giờ thường đến đúng 17:15 — WORKSHOP (08:00 → 17:15, 9.25h)');
// Expected: std=9.25h, ot=0, cost = 9.25 × 120,000 = 1,110,000đ
{
  const m = calculateLaborCost(`${D} 08:00:00`, `${D} 17:15:00`, 120000, 'WORKSHOP');
  assert('standard_hours', m.standard_hours, 9.25, 'h');
  assert('ot_hours',       m.ot_hours,       0,    'h');
  assert('actual_cost',    m.actual_cost, 1110000, 'đ');
}

// ═════════════════════════════════════════════════════════════════════════════
section('TC-03: Tăng ca 1 — WORKSHOP (08:00 → 20:00, std=9.25h, OT1=2.75h)');
// std = 17:15 - 08:00 = 9.25h → cost_std = 9.25 × 120,000 = 1,110,000
// ot1 = 20:00 - 17:15 = 2.75h → cost_ot1 = 2.75 × 120,000 × 1.5 = 495,000
// total cost = 1,605,000đ
{
  const m = calculateLaborCost(`${D} 08:00:00`, `${D} 20:00:00`, 120000, 'WORKSHOP');
  assert('standard_hours', m.standard_hours, 9.25, 'h');
  assert('ot1_hours',      m.ot1_hours,      2.75, 'h');
  assert('ot2_hours',      m.ot2_hours,      0,    'h');
  assert('actual_cost',    m.actual_cost, 1605000, 'đ');
}

// ═════════════════════════════════════════════════════════════════════════════
section('TC-04: Tăng ca 1 + Tăng ca 2 — WORKSHOP (08:00 → 23:00)');
// std = 9.25h → 9.25 × 120,000       = 1,110,000
// ot1 = 5h   → 5    × 120,000 × 1.5  =   900,000
// ot2 = 0.75h→ 0.75 × 120,000 × 1.5  =   135,000
// total = 2,145,000đ
{
  const m = calculateLaborCost(`${D} 08:00:00`, `${D} 23:00:00`, 120000, 'WORKSHOP');
  assert('standard_hours', m.standard_hours, 9.25, 'h');
  assert('ot1_hours',      m.ot1_hours,      5,    'h');
  assert('ot2_hours',      m.ot2_hours,      0.75, 'h');
  assert('actual_cost',    m.actual_cost, 2145000, 'đ');
}

// ═════════════════════════════════════════════════════════════════════════════
section('TC-05: SITE Location Multiplier (08:00 → 17:00, 9h, SITE)');
// cost = 9 × 120,000 × 1.2 = 1,296,000đ
{
  const m = calculateLaborCost(`${D} 08:00:00`, `${D} 17:00:00`, 120000, 'SITE');
  assert('standard_hours',   m.standard_hours, 9, 'h');
  assert('location_mult',    m.location_multiplier, 1.2);
  assert('actual_cost',      m.actual_cost, 1296000, 'đ');
}

// ═════════════════════════════════════════════════════════════════════════════
section('TC-06: SITE + Tăng ca 1 (17:30 → 20:00, 2.5h OT1, SITE)');
// ot1 = 2.5h → 2.5 × 120,000 × 1.2 × 1.5 = 540,000đ
{
  const m = calculateLaborCost(`${D} 17:30:00`, `${D} 20:00:00`, 120000, 'SITE');
  assert('standard_hours', m.standard_hours, 0,   'h');
  assert('ot1_hours',      m.ot1_hours,      2.5, 'h');
  assert('actual_cost',    m.actual_cost, 540000, 'đ');
}

// ═════════════════════════════════════════════════════════════════════════════
section('TC-07: Ngày lễ (01/05, 08:00 → 17:00, 9h) — 1.5x');
// cost = 9 × 120,000 × 1.5 = 1,620,000đ
{
  const m = calculateLaborCost(`${HOL} 08:00:00`, `${HOL} 17:00:00`, 120000, 'WORKSHOP');
  assert('holiday_multiplier', m.holiday_multiplier, 1.5);
  assert('ot_hours',           m.ot_hours,           9,   'h'); // tất cả là OT lễ
  assert('actual_cost',        m.actual_cost, 1620000, 'đ');
}

// ═════════════════════════════════════════════════════════════════════════════
section('TC-08: Check-in đúng giờ — Ca Sáng 06:00, grace 5p, vào 06:03');
// diffMin = 3, grace = 5 → lateMins = max(0, 3-5) = 0 → ON_TIME
{
  const shiftStart = new Date(`${D}T06:00:00`);
  const checkIn    = new Date(`${D}T06:03:00`);
  const grace = 5;
  const diffMin  = Math.floor((checkIn - shiftStart) / 60000);
  const lateMins = Math.max(0, diffMin - grace);
  const status   = lateMins > 0 ? 'LATE' : 'ON_TIME';

  assert('late_minutes',  lateMins, 0);
  const okStatus = status === 'ON_TIME';
  if (okStatus) { passed++; console.log(`  ${GREEN}✔${RESET} status: ON_TIME`); }
  else          { failed++; console.log(`  ${RED}✘${RESET} status: ${status} (expected ON_TIME)`); }
}

// ═════════════════════════════════════════════════════════════════════════════
section('TC-09: Check-in muộn — Ca Sáng 06:00, grace 5p, vào 06:15');
// diffMin = 15, grace = 5 → lateMins = 10 → LATE
{
  const shiftStart = new Date(`${D}T06:00:00`);
  const checkIn    = new Date(`${D}T06:15:00`);
  const grace = 5;
  const diffMin  = Math.floor((checkIn - shiftStart) / 60000);
  const lateMins = Math.max(0, diffMin - grace);
  const status   = lateMins > 0 ? 'LATE' : 'ON_TIME';

  assert('late_minutes', lateMins, 10, 'p');
  const okStatus = status === 'LATE';
  if (okStatus) { passed++; console.log(`  ${GREEN}✔${RESET} status: LATE`); }
  else          { failed++; console.log(`  ${RED}✘${RESET} status: ${status} (expected LATE)`); }
}

// ═════════════════════════════════════════════════════════════════════════════
section('TC-10: Check-out OT — Ca Sáng 06:00→14:00, break 30p, out 15:32');
// checkIn=06:00, checkOut=15:32, break=30p
// totalMin = (15:32 - 06:00) = 572p - 30p = 542p
// shiftMin = (14:00 - 06:00) - 30p = 450p
// regular = min(542,450) = 450p = 7.5h
// ot = 542 - 450 = 92p ≈ 1.53h
{
  const checkIn   = new Date(`${D}T06:00:00`);
  const checkOut  = new Date(`${D}T15:32:00`);
  const shiftEnd  = new Date(`${D}T14:00:00`);
  const breakMin  = 30;
  const totalMin  = Math.max(0, Math.floor((checkOut - checkIn) / 60000) - breakMin);
  const shiftMin  = Math.max(0, Math.floor((shiftEnd - checkIn) / 60000) - breakMin);
  const regularMin= Math.min(totalMin, shiftMin);
  const otMin     = Math.max(0, totalMin - shiftMin);

  assert('total_minutes',   totalMin,    542, 'p');
  assert('regular_minutes', regularMin,  450, 'p');
  assert('overtime_minutes',otMin,        92, 'p');
}

// ═════════════════════════════════════════════════════════════════════════════
// TỔNG KẾT
console.log(`\n${BOLD}${'═'.repeat(50)}${RESET}`);
const totalTests = passed + failed;
if (failed === 0) {
  console.log(`${GREEN}${BOLD}🎉 TẤT CẢ ${totalTests} TEST ĐỀU PASS!${RESET}`);
} else {
  console.log(`${YELLOW}${BOLD}⚠️  KẾT QUẢ: ${passed}/${totalTests} PASS — ${failed} FAIL${RESET}`);
}
console.log(`${'═'.repeat(50)}\n`);

if (failed > 0) process.exit(1);
