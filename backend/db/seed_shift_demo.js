/**
 * Demo data seed for Shift Management testing
 * - Assigns real users (from seed.js) to today's shifts
 * - Creates realistic attendance records with on-time, late, OT, absent scenarios
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function seedDemo() {
  console.log('🎭 Seeding Shift Management DEMO data...');

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  try {
    // Get today + yesterday
    const today = new Date();
    const tz7 = (d, h = 0, m = 0) => {
      const dt = new Date(d);
      dt.setHours(h, m, 0, 0);
      return dt.toISOString().slice(0, 19).replace('T', ' ');
    };

    const dates = [];
    for (let i = -1; i <= 1; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }

    // --- Get user IDs from DB ---
    const [users] = await conn.execute('SELECT id, full_name, role FROM users LIMIT 20');
    const staffUsers = users.filter(u => u.role === 'STAFF');
    const allUsers = users;

    if (staffUsers.length === 0) {
      console.log('⚠ No STAFF users found. Run node seed.js first.');
      process.exit(1);
    }

    // --- Get shift templates ---
    const [templates] = await conn.execute('SELECT * FROM shift_templates WHERE is_active = 1');
    const morning   = templates.find(t => t.code === 'MORNING');
    const afternoon = templates.find(t => t.code === 'AFTERNOON');
    const night     = templates.find(t => t.code === 'NIGHT');

    if (!morning) { console.error('No shift templates found. Run node db/seed_shift_management.js first.'); process.exit(1); }

    // --- Clear old demo data ---
    console.log('  🧹 Clearing old demo data...');
    await conn.execute("DELETE FROM attendance_records WHERE id LIKE 'demo_%'");
    await conn.execute("DELETE FROM shift_assignments WHERE id LIKE 'demo_%'");

    // --- For each date, create instances + assignments + attendance ---
    for (const date of dates) {
      console.log(`  📅 Processing ${date}...`);

      // Ensure shift instances exist
      const shiftDefs = [
        { template: morning,   id: `si_MORNING_${date.replace(/-/g,'')}`,   startH: 6,  endH: 14, endDateOffset: 0 },
        { template: afternoon, id: `si_AFTERNOON_${date.replace(/-/g,'')}`, startH: 14, endH: 22, endDateOffset: 0 },
        { template: night,     id: `si_NIGHT_${date.replace(/-/g,'')}`,     startH: 22, endH: 6,  endDateOffset: 1 }
      ];

      for (const sd of shiftDefs) {
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + sd.endDateOffset);
        const endDateStr = endDate.toISOString().split('T')[0];

        await conn.execute(`
          INSERT IGNORE INTO shift_instances (id, shift_template_id, work_date, start_at, end_at, status)
          VALUES (?, ?, ?, ?, ?, 'OPEN')
        `, [sd.id, sd.template.id, date,
            `${date} ${String(sd.startH).padStart(2,'0')}:00:00`,
            `${endDateStr} ${String(sd.endH).padStart(2,'0')}:00:00`]);
      }

      // --- Morning shift: assign 4 users with varied attendance ---
      const morningInstance = shiftDefs[0];
      const morningUsers = staffUsers.slice(0, Math.min(4, staffUsers.length));

      const morningScenarios = [
        // [userId, assignment_status, checkin_offset_min, checkout_offset_min_from_shift_end, status, late_min, ot_min]
        // Scenario 1: Đúng giờ, check-out đúng ca
        { user: morningUsers[0], aStatus: 'COMPLETED', ciOff: 2,   coOff: 0,   recStatus: 'ON_TIME', lateMins: 0, otMins: 0 },
        // Scenario 2: Đi muộn 14p, check-out đúng ca
        { user: morningUsers[1], aStatus: 'COMPLETED', ciOff: 14,  coOff: 0,   recStatus: 'LATE',    lateMins: 9, otMins: 0 },
        // Scenario 3: Đúng giờ, OT 92 phút
        { user: morningUsers[2], aStatus: 'COMPLETED', ciOff: -2,  coOff: 92,  recStatus: 'ON_TIME', lateMins: 0, otMins: 92 },
        // Scenario 4: Vắng mặt
        morningUsers[3]
          ? { user: morningUsers[3], aStatus: 'ABSENT', ciOff: null, coOff: null, recStatus: 'ABSENT', lateMins: 0, otMins: 0 }
          : null
      ].filter(Boolean);

      for (let i = 0; i < morningScenarios.length; i++) {
        const sc = morningScenarios[i];
        const assignId = `demo_sa_m${i}_${date.replace(/-/g,'')}`;
        const recId    = `demo_ar_m${i}_${date.replace(/-/g,'')}`;

        // Assignment
        await conn.execute(`
          INSERT IGNORE INTO shift_assignments (id, shift_instance_id, user_id, status, assigned_at)
          VALUES (?, ?, ?, ?, NOW())
        `, [assignId, morningInstance.id, sc.user.id, sc.aStatus]);

        if (sc.aStatus === 'ABSENT') {
          // Attendance record for absent
          await conn.execute(`
            INSERT IGNORE INTO attendance_records
              (id, user_id, shift_instance_id, shift_assignment_id, work_date,
               regular_minutes, total_work_minutes, status, payroll_status)
            VALUES (?, ?, ?, ?, ?, 0, 0, 'ABSENT', 'DRAFT')
          `, [recId, sc.user.id, morningInstance.id, assignId, date]);
          continue;
        }

        // Calculate times: shift start 06:00
        const shiftStart = new Date(`${date}T06:00:00`);
        const checkIn  = new Date(shiftStart.getTime() + sc.ciOff * 60000);
        const shiftEnd = new Date(`${date}T14:00:00`);
        const checkOut = new Date(shiftEnd.getTime() + sc.coOff * 60000);

        const actualMin   = Math.round((checkOut - checkIn) / 60000);
        const regularMin  = Math.max(0, actualMin - sc.otMins);

        await conn.execute(`
          INSERT IGNORE INTO attendance_records
            (id, user_id, shift_instance_id, shift_assignment_id, work_date,
             check_in_at, check_out_at,
             regular_minutes, overtime_minutes, late_minutes, total_work_minutes,
             status, payroll_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED')
        `, [recId, sc.user.id, morningInstance.id, assignId, date,
            checkIn.toISOString().slice(0,19).replace('T',' '),
            checkOut.toISOString().slice(0,19).replace('T',' '),
            regularMin, sc.otMins, sc.lateMins, actualMin,
            sc.recStatus]);
      }

      // --- Afternoon shift: assign 3 users ---
      const afternoonInstance = shiftDefs[1];
      const afternoonUsers = staffUsers.slice(0, Math.min(3, staffUsers.length));
      const afternoonScenarios = [
        { user: afternoonUsers[0], aStatus: 'COMPLETED', ciOff: 1,   coOff: 0,   recStatus: 'ON_TIME', lateMins: 0, otMins: 0 },
        { user: afternoonUsers[1], aStatus: 'COMPLETED', ciOff: -3,  coOff: 90,  recStatus: 'ON_TIME', lateMins: 0, otMins: 90 },
        afternoonUsers[2]
          ? { user: afternoonUsers[2], aStatus: 'COMPLETED', ciOff: 20,  coOff: 0, recStatus: 'LATE', lateMins: 15, otMins: 0 }
          : null
      ].filter(Boolean);

      for (let i = 0; i < afternoonScenarios.length; i++) {
        const sc = afternoonScenarios[i];
        const assignId = `demo_sa_a${i}_${date.replace(/-/g,'')}`;
        const recId    = `demo_ar_a${i}_${date.replace(/-/g,'')}`;

        await conn.execute(`
          INSERT IGNORE INTO shift_assignments (id, shift_instance_id, user_id, status, assigned_at)
          VALUES (?, ?, ?, ?, NOW())
        `, [assignId, afternoonInstance.id, sc.user.id, sc.aStatus]);

        const shiftStart = new Date(`${date}T14:00:00`);
        const checkIn  = new Date(shiftStart.getTime() + sc.ciOff * 60000);
        const shiftEnd = new Date(`${date}T22:00:00`);
        const checkOut = new Date(shiftEnd.getTime() + sc.coOff * 60000);
        const actualMin  = Math.round((checkOut - checkIn) / 60000);
        const regularMin = Math.max(0, actualMin - sc.otMins);

        await conn.execute(`
          INSERT IGNORE INTO attendance_records
            (id, user_id, shift_instance_id, shift_assignment_id, work_date,
             check_in_at, check_out_at,
             regular_minutes, overtime_minutes, late_minutes, total_work_minutes,
             status, payroll_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED')
        `, [recId, sc.user.id, afternoonInstance.id, assignId, date,
            checkIn.toISOString().slice(0,19).replace('T',' '),
            checkOut.toISOString().slice(0,19).replace('T',' '),
            regularMin, sc.otMins, sc.lateMins, actualMin, sc.recStatus]);
      }

      // --- Night shift: 2 users ---
      const nightInstance = shiftDefs[2];
      const nightUsers = staffUsers.slice(0, Math.min(2, staffUsers.length));
      for (let i = 0; i < nightUsers.length; i++) {
        const assignId = `demo_sa_n${i}_${date.replace(/-/g,'')}`;
        const recId    = `demo_ar_n${i}_${date.replace(/-/g,'')}`;

        await conn.execute(`
          INSERT IGNORE INTO shift_assignments (id, shift_instance_id, user_id, status, assigned_at)
          VALUES (?, ?, ?, 'COMPLETED', NOW())
        `, [assignId, nightInstance.id, nightUsers[i].id]);

        const shiftStart = new Date(`${date}T22:00:00`);
        const ciOff = [5, -4][i] || 0;
        const checkIn = new Date(shiftStart.getTime() + ciOff * 60000);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        const checkOut = new Date(nextDay.toISOString().split('T')[0] + 'T06:00:00');
        const actualMin  = Math.round((checkOut - checkIn) / 60000);

        await conn.execute(`
          INSERT IGNORE INTO attendance_records
            (id, user_id, shift_instance_id, shift_assignment_id, work_date,
             check_in_at, check_out_at,
             regular_minutes, night_minutes, total_work_minutes,
             status, payroll_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ON_TIME', 'APPROVED')
        `, [recId, nightUsers[i].id, nightInstance.id, assignId, date,
            checkIn.toISOString().slice(0,19).replace('T',' '),
            checkOut.toISOString().slice(0,19).replace('T',' '),
            actualMin, actualMin, actualMin]);
      }
    }

    console.log('✅ Demo data seeded for dates:', dates.join(', '));
  } catch (err) {
    console.error('❌ Demo seed error:', err.message, err.stack);
  } finally {
    await conn.end();
  }
}

seedDemo();
