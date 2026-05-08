require('dotenv').config();
const { initDB } = require('../db');

async function updateShifts() {
  const db = await initDB();
  console.log('Resetting shift templates...');

  // 1. Delete existing templates to be clean
  await db.exec('SET FOREIGN_KEY_CHECKS = 0');
  await db.prepare('DELETE FROM shift_templates').run();
  await db.exec('SET FOREIGN_KEY_CHECKS = 1');

  // 2. Insert the 3 requested shifts
  const shifts = [
    {
      id: 'st_morning',
      code: 'MORNING',
      name: 'Ca Sáng',
      start_time: '07:30:00',
      end_time: '11:30:00',
      break_minutes: 0, // 1.5h lunch break is after this shift
      base_multiplier: 1.0,
      color: 'amber'
    },
    {
      id: 'st_afternoon',
      code: 'AFTERNOON',
      name: 'Ca Chiều',
      start_time: '13:00:00',
      end_time: '17:00:00',
      break_minutes: 15,
      base_multiplier: 1.0,
      color: 'blue'
    },
    {
      id: 'st_evening',
      code: 'EVENING',
      name: 'Ca Tối',
      start_time: '18:00:00',
      end_time: '22:00:00',
      break_minutes: 15,
      base_multiplier: 1.0,
      color: 'purple'
    }
  ];

  for (const s of shifts) {
    await db.prepare(`
      INSERT INTO shift_templates 
        (id, code, name, start_time, end_time, break_minutes, base_multiplier, color, 
         checkin_early_minutes, checkin_late_minutes, late_grace_minutes, checkout_grace_minutes, requires_assignment)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 30, 60, 10, 10, 1)
    `).run(s.id, s.code, s.name, s.start_time, s.end_time, s.break_minutes, s.base_multiplier, s.color);
  }

  console.log('Shifts updated successfully.');
  process.exit(0);
}

updateShifts().catch(err => {
  console.error(err);
  process.exit(1);
});
