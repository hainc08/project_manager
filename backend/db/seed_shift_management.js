require('dotenv').config();
const mysql = require('mysql2/promise');


async function seedShiftData() {
  console.log('🌱 Seeding Shift Management Data...');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  try {
    // 1. Shift Templates
    console.log('  - Seeding Shift Templates...');
    const templates = [
      ['MORNING', 'Ca Sáng', '06:00:00', '14:00:00', 0, 1.0, 'amber'],
      ['AFTERNOON', 'Ca Chiều', '14:00:00', '22:00:00', 0, 1.0, 'blue'],
      ['NIGHT', 'Ca Đêm', '22:00:00', '06:00:00', 0, 1.3, 'purple']
    ];
    for (const t of templates) {
      const id = 'st_' + t[0].toLowerCase();
      await connection.execute(
        `INSERT IGNORE INTO shift_templates (id, code, name, start_time, end_time, break_minutes, base_multiplier, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, ...t]
      );
    }

    // 2. Multiplier Rules
    console.log('  - Seeding Multiplier Rules...');
    const rules = [
      ['OT_NORMAL_DAY', 'OT Ngày Thường', 'NORMAL_WORKDAY', 'OT_NORMAL_DAY', 1.5, 1.5],
      ['OT_WEEKLY_REST', 'OT Ngày Nghỉ Tuần', 'WEEKLY_REST_DAY', 'OT_WEEKLY_REST', 2.0, 2.0],
      ['OT_PUBLIC_HOLIDAY', 'OT Ngày Lễ', 'PUBLIC_HOLIDAY', 'OT_PUBLIC_HOLIDAY', 3.0, 3.0],
      ['NIGHT_REGULAR', 'Phụ Cấp Đêm', 'NORMAL_WORKDAY', 'NIGHT_REGULAR', 1.3, 1.3]
    ];
    for (const r of rules) {
      const id = 'rule_' + r[0].toLowerCase();
      await connection.execute(
        `INSERT IGNORE INTO payroll_multiplier_rules (id, code, name, day_type, segment_type, multiplier, minimum_legal_multiplier, effective_from) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, ...r, '2026-01-01']
      );
    }

    // 3. Holidays
    console.log('  - Seeding Holidays...');
    const holidays = [
      ['2026-01-01', 'Tết Dương lịch', 'PUBLIC_HOLIDAY', 3.0],
      ['2026-02-16', 'Tết Nguyên đán (29 Tết)', 'PUBLIC_HOLIDAY', 3.0],
      ['2026-02-17', 'Tết Nguyên đán (Mùng 1)', 'PUBLIC_HOLIDAY', 3.0],
      ['2026-02-18', 'Tết Nguyên đán (Mùng 2)', 'PUBLIC_HOLIDAY', 3.0],
      ['2026-02-19', 'Tết Nguyên đán (Mùng 3)', 'PUBLIC_HOLIDAY', 3.0],
      ['2026-02-20', 'Tết Nguyên đán (Mùng 4)', 'PUBLIC_HOLIDAY', 3.0],
      ['2026-02-21', 'Tết Nguyên đán (Mùng 5)', 'PUBLIC_HOLIDAY', 3.0],
      ['2026-04-26', 'Giỗ tổ Hùng Vương', 'PUBLIC_HOLIDAY', 3.0],
      ['2026-04-30', 'Giải phóng miền Nam', 'PUBLIC_HOLIDAY', 3.0],
      ['2026-05-01', 'Ngày Quốc tế Lao động', 'PUBLIC_HOLIDAY', 3.0],
      ['2026-09-02', 'Ngày Quốc khánh', 'PUBLIC_HOLIDAY', 3.0],
      ['2026-09-03', 'Ngày Quốc khánh (Bổ sung)', 'PUBLIC_HOLIDAY', 3.0]
    ];
    for (const h of holidays) {
      const id = 'hol_' + h[0].replace(/-/g, '');
      await connection.execute(
        `INSERT IGNORE INTO holiday_calendar (id, holiday_date, name, day_type, default_multiplier) VALUES (?, ?, ?, ?, ?)`,
        [id, ...h]
      );
    }

    console.log('✅ Seeding completed!');
  } catch (err) {
    console.error('❌ Error seeding data:', err.message);
  } finally {
    await connection.end();
  }
}

seedShiftData();
