const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

async function seedShiftData() {
  console.log('🌱 Seeding Shift Management Data...');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'labor_management',
    multipleStatements: true
  });

  try {
    // ── 1. SHIFT TEMPLATES ───────────────────────────────────────────────
    console.log('  📋 Seeding Shift Templates...');
    const templates = [
      // [id, code, name, start_time, end_time, break_minutes, base_multiplier, color,
      //  checkin_early_min, checkin_late_min, late_grace_min, checkout_grace_min, requires_assignment, location_type]
      ['st_morning',   'MORNING',   'Ca Sáng',   '06:00:00', '14:00:00', 30, 1.0, 'amber',  30, 60, 10, 10, 1, 'WORKSHOP'],
      ['st_afternoon', 'AFTERNOON', 'Ca Chiều',  '14:00:00', '22:00:00', 30, 1.0, 'blue',   30, 60, 10, 10, 1, 'WORKSHOP'],
      ['st_night',     'NIGHT',     'Ca Đêm',    '22:00:00', '06:00:00', 30, 1.3, 'purple', 30, 60, 10, 10, 1, 'WORKSHOP'],
    ];

    for (const t of templates) {
      await connection.execute(`
        INSERT INTO shift_templates
          (id, code, name, start_time, end_time, break_minutes, base_multiplier, color,
           checkin_early_minutes, checkin_late_minutes, late_grace_minutes, checkout_grace_minutes,
           requires_assignment, location_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name=VALUES(name), start_time=VALUES(start_time), end_time=VALUES(end_time),
          base_multiplier=VALUES(base_multiplier), color=VALUES(color)
      `, t);
    }
    console.log(`  ✅ ${templates.length} shift templates seeded.`);

    // ── 2. PAYROLL MULTIPLIER RULES ──────────────────────────────────────
    // Schema: id, code, name, day_type, segment_type, multiplier, is_active, effective_from
    console.log('  💰 Seeding Payroll Multiplier Rules...');
    const rules = [
      // [id, code, name, day_type, segment_type, multiplier, effective_from]
      ['rule_ot_normal',   'OT_NORMAL',   'OT Ngày Thường',      'NORMAL_WORKDAY',  'OVERTIME',   1.5, '2026-01-01'],
      ['rule_ot_rest',     'OT_REST',     'OT Ngày Nghỉ Tuần',   'WEEKLY_REST_DAY', 'OVERTIME',   2.0, '2026-01-01'],
      ['rule_ot_holiday',  'OT_HOLIDAY',  'OT Ngày Lễ',          'PUBLIC_HOLIDAY',  'OVERTIME',   3.0, '2026-01-01'],
      ['rule_night',       'NIGHT',       'Phụ cấp Ca Đêm',      'NORMAL_WORKDAY',  'NIGHT',      1.3, '2026-01-01'],
      ['rule_night_rest',  'NIGHT_REST',  'Đêm Ngày Nghỉ Tuần',  'WEEKLY_REST_DAY', 'NIGHT',      1.95,'2026-01-01'],
    ];
    for (const r of rules) {
      await connection.execute(`
        INSERT INTO payroll_multiplier_rules
          (id, code, name, day_type, segment_type, multiplier, is_active, effective_from)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?)
        ON DUPLICATE KEY UPDATE
          name=VALUES(name), multiplier=VALUES(multiplier)
      `, r);
    }
    console.log(`  ✅ ${rules.length} multiplier rules seeded.`);

    // ── 3. HOLIDAY CALENDAR (2026) ────────────────────────────────────────
    // Schema: id, holiday_date, name, day_type, is_paid_day
    console.log('  🗓  Seeding Holiday Calendar...');
    const holidays = [
      // [date, name, day_type, is_paid_day]
      ['2026-01-01', 'Tết Dương lịch',              'PUBLIC_HOLIDAY', 1],
      ['2026-02-16', 'Tết Nguyên đán (29 Tết)',      'PUBLIC_HOLIDAY', 1],
      ['2026-02-17', 'Tết Nguyên đán (Mùng 1)',      'PUBLIC_HOLIDAY', 1],
      ['2026-02-18', 'Tết Nguyên đán (Mùng 2)',      'PUBLIC_HOLIDAY', 1],
      ['2026-02-19', 'Tết Nguyên đán (Mùng 3)',      'PUBLIC_HOLIDAY', 1],
      ['2026-02-20', 'Tết Nguyên đán (Mùng 4)',      'PUBLIC_HOLIDAY', 1],
      ['2026-02-21', 'Tết Nguyên đán (Mùng 5)',      'PUBLIC_HOLIDAY', 1],
      ['2026-04-26', 'Giỗ tổ Hùng Vương',            'PUBLIC_HOLIDAY', 1],
      ['2026-04-30', 'Giải phóng miền Nam',           'PUBLIC_HOLIDAY', 1],
      ['2026-05-01', 'Ngày Quốc tế Lao động',        'PUBLIC_HOLIDAY', 1],
      ['2026-09-02', 'Ngày Quốc khánh',              'PUBLIC_HOLIDAY', 1],
      ['2026-09-03', 'Ngày Quốc khánh (bù)',         'PUBLIC_HOLIDAY', 1],
    ];
    for (const h of holidays) {
      const id = 'hol_' + h[0].replace(/-/g, '');
      await connection.execute(`
        INSERT INTO holiday_calendar (id, holiday_date, name, day_type, is_paid_day)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE name=VALUES(name), day_type=VALUES(day_type), is_paid_day=VALUES(is_paid_day)
      `, [id, ...h]);
    }
    console.log(`  ✅ ${holidays.length} holidays seeded.`);

    console.log('\n🎉 Shift data seeding COMPLETE!');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    throw err;
  } finally {
    await connection.end();
  }
}

seedShiftData();
