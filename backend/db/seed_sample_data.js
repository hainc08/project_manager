'use strict';
/**
 * seed_sample_data.js
 * Reset toàn bộ DB và tạo dữ liệu mẫu đủ để test toàn bộ luồng:
 *   Users → Projects → Tasks → Shifts → Assignments → Attendance → Worklogs
 *
 * Chạy: node backend/db/seed_sample_data.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { calculateLaborCost, roundMoney } = require('../utils/helpers');

// ─── Cài đặt tính lương ──────────────────────────────────────────────────────
const RULES = { ot1_multiplier: 1.5, ot2_multiplier: 2.0, holiday_multiplier: 2.0, site_multiplier: 1.2, holidays: [] };

function calcWorklog(startDt, endDt, stdRate, billRate, loc) {
  const m = calculateLaborCost(startDt, endDt, stdRate, loc, RULES);
  return {
    duration_hours:      roundMoney(m.standard_hours + m.ot_hours),
    actual_cost:         m.actual_cost,
    actual_revenue:      roundMoney((m.standard_hours + m.ot_hours) * billRate),
    standard_hours:      m.standard_hours,
    ot_hours:            m.ot_hours,
    location_multiplier: m.location_multiplier,
    ot_multiplier:       m.ot_multiplier,
    holiday_multiplier:  m.holiday_multiplier,
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  try {
    // ── 0. TRUNCATE ──────────────────────────────────────────────────────
    console.log('🗑  Truncating all tables...');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    const [tables] = await conn.query('SHOW TABLES');
    for (const t of tables) {
      await conn.query(`TRUNCATE TABLE \`${Object.values(t)[0]}\``);
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('  ✅ Done\n');

    // ── 1. USERS ─────────────────────────────────────────────────────────
    console.log('👤 Seeding users...');
    const PASS = bcrypt.hashSync('123456', 10);
    const users = [
      ['u_admin',  'admin',  PASS, 'Nguyễn Quản Lý',   'ADMIN',      'Quản đốc',   'FULLTIME',  0,      0],
      ['u_lan',    'lan',    PASS, 'Trần Thị Lan',      'ACCOUNTANT', 'Kế toán',    'FULLTIME',  0,      0],
      ['u_hiep',   'hiep',   PASS, 'Nguyễn Minh Hiệp', 'STAFF',      'Thợ CNC',    'FULLTIME',  80000,  100000],
      ['u_dung',   'dung',   PASS, 'Lê Văn Dũng',      'STAFF',      'Thợ cơ khí', 'FULLTIME',  75000,  95000],
      ['u_phuong', 'phuong', PASS, 'Phạm Thị Phương',  'STAFF',      'Thợ EDM',    'FULLTIME',  70000,  90000],
    ];
    for (const u of users) {
      await conn.execute(
        `INSERT INTO users (id, username, password_hash, full_name, role, job_title, contract_type, standard_rate, billing_rate)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, u);
    }
    console.log(`  ✅ ${users.length} users\n`);

    // ── 2. PROJECTS ──────────────────────────────────────────────────────
    console.log('📁 Seeding projects...');
    const projects = [
      ['p_001', 'Khuôn đúc vỏ động cơ xe máy (SKD61)',       'WORKSHOP', 'ACTIVE'],
      ['p_002', 'Lắp đặt dây chuyền – Cty Thành Đạt',        'SITE',     'ACTIVE'],
      ['p_003', 'Sửa chữa khuôn ép nhựa – Lô tháng 4',      'WORKSHOP', 'COMPLETED'],
    ];
    for (const p of projects) {
      await conn.execute(
        `INSERT INTO projects (id, project_name, location_type, status) VALUES (?, ?, ?, ?)`, p);
    }
    console.log(`  ✅ ${projects.length} projects\n`);

    // ── 3. PROJECT ITEMS ─────────────────────────────────────────────────
    console.log('📚 Seeding project items...');
    const items = [
      ['pi_01', 'Thiết kế 3D & CAM'],
      ['pi_02', 'Gia công CNC'],
      ['pi_03', 'EDM tia lửa điện'],
      ['pi_04', 'Lắp ráp & kiểm định'],
      ['pi_05', 'Lắp đặt thiết bị'],
      ['pi_06', 'Hàn & gia công nguội'],
    ];
    for (const i of items) {
      await conn.execute(`INSERT INTO project_items (id, name) VALUES (?, ?)`, i);
    }
    const mappings = [
      ['p_001', 'pi_01'], ['p_001', 'pi_02'], ['p_001', 'pi_03'], ['p_001', 'pi_04'],
      ['p_002', 'pi_05'], ['p_002', 'pi_02'],
      ['p_003', 'pi_02'], ['p_003', 'pi_04'], ['p_003', 'pi_06'],
    ];
    for (const m of mappings) {
      await conn.execute(`INSERT INTO project_item_mapping (project_id, item_id) VALUES (?, ?)`, m);
    }
    console.log(`  ✅ ${items.length} items, ${mappings.length} mappings\n`);

    // ── 4. SHIFT TEMPLATES ───────────────────────────────────────────────
    console.log('🕒 Seeding shift templates...');
    // checkin_late_minutes rộng (300 phút) để dễ test
    const templates = [
      ['st_morning',   'MORNING',   'Ca Sáng',  '07:30:00', '11:30:00', 0, 1.0, 'amber',  360, 360, 10, 15, 1, 'WORKSHOP'],
      ['st_afternoon', 'AFTERNOON', 'Ca Chiều', '13:00:00', '17:00:00', 0, 1.0, 'blue',   360, 360, 10, 15, 1, 'WORKSHOP'],
      ['st_evening',   'EVENING',   'Ca Tối',   '18:00:00', '22:00:00', 0, 1.2, 'purple', 360, 360, 10, 15, 1, 'WORKSHOP'],
    ];
    for (const t of templates) {
      await conn.execute(`
        INSERT INTO shift_templates
          (id, code, name, start_time, end_time, break_minutes, base_multiplier, color,
           checkin_early_minutes, checkin_late_minutes, late_grace_minutes, checkout_grace_minutes,
           requires_assignment, location_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, t);
    }
    console.log(`  ✅ ${templates.length} templates\n`);

    // ── 5. HOLIDAY CALENDAR ──────────────────────────────────────────────
    const holidays = [
      ['2026-01-01','Tết Dương lịch','PUBLIC_HOLIDAY',1],
      ['2026-02-16','Tết Nguyên đán (29 Tết)','PUBLIC_HOLIDAY',1],
      ['2026-02-17','Tết Nguyên đán (Mùng 1)','PUBLIC_HOLIDAY',1],
      ['2026-02-18','Tết Nguyên đán (Mùng 2)','PUBLIC_HOLIDAY',1],
      ['2026-02-19','Tết Nguyên đán (Mùng 3)','PUBLIC_HOLIDAY',1],
      ['2026-02-20','Tết Nguyên đán (Mùng 4)','PUBLIC_HOLIDAY',1],
      ['2026-02-21','Tết Nguyên đán (Mùng 5)','PUBLIC_HOLIDAY',1],
      ['2026-04-26','Giỗ tổ Hùng Vương','PUBLIC_HOLIDAY',1],
      ['2026-04-30','Giải phóng miền Nam','PUBLIC_HOLIDAY',1],
      ['2026-05-01','Ngày Quốc tế Lao động','PUBLIC_HOLIDAY',1],
      ['2026-09-02','Ngày Quốc khánh','PUBLIC_HOLIDAY',1],
      ['2026-09-03','Ngày Quốc khánh (bù)','PUBLIC_HOLIDAY',1],
    ];
    for (const h of holidays) {
      await conn.execute(
        `INSERT INTO holiday_calendar (id, holiday_date, name, day_type, is_paid_day) VALUES (?, ?, ?, ?, ?)`,
        ['hol_' + h[0].replace(/-/g, ''), ...h]);
    }

    // ── 6. PAYROLL RULES ─────────────────────────────────────────────────
    const pmRules = [
      ['rule_ot_normal',  'OT_NORMAL',  'OT Ngày Thường',     'NORMAL_WORKDAY',  'OVERTIME', 1.5,  '2026-01-01'],
      ['rule_ot_rest',    'OT_REST',    'OT Ngày Nghỉ Tuần',  'WEEKLY_REST_DAY', 'OVERTIME', 2.0,  '2026-01-01'],
      ['rule_ot_holiday', 'OT_HOLIDAY', 'OT Ngày Lễ',         'PUBLIC_HOLIDAY',  'OVERTIME', 3.0,  '2026-01-01'],
      ['rule_night',      'NIGHT',      'Phụ cấp Ca Đêm',     'NORMAL_WORKDAY',  'NIGHT',    1.3,  '2026-01-01'],
      ['rule_night_rest', 'NIGHT_REST', 'Đêm Ngày Nghỉ Tuần', 'WEEKLY_REST_DAY', 'NIGHT',    1.95, '2026-01-01'],
    ];
    for (const r of pmRules) {
      await conn.execute(`
        INSERT INTO payroll_multiplier_rules (id, code, name, day_type, segment_type, multiplier, is_active, effective_from)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?)
      `, r);
    }

    // ── 7. TASKS ─────────────────────────────────────────────────────────
    console.log('📝 Seeding tasks...');
    const tasks = [
      ['t_001','p_001','pi_01','u_hiep',  'Thiết kế 3D khuôn vỏ động cơ',          'WORKSHOP','st_morning',  'DONE'],
      ['t_002','p_001','pi_02','u_dung',  'Gia công CNC block thép SKD61',           'WORKSHOP','st_morning',  'DONE'],
      ['t_003','p_001','pi_03','u_phuong','EDM hốc sâu khuôn trên',                 'WORKSHOP','st_afternoon','DONE'],
      ['t_004','p_001','pi_04','u_hiep',  'Lắp ráp & kiểm định bộ khuôn',           'WORKSHOP','st_morning',  'DOING'],
      ['t_005','p_002','pi_05','u_dung',  'Lắp đặt máy CNC tại Cty Thành Đạt',      'SITE',    'st_morning',  'TODO'],
      ['t_006','p_003','pi_06','u_phuong','Hàn & gia công nguội khuôn ép nhựa SP-A3','WORKSHOP','st_afternoon','DONE'],
    ];
    for (const [id,proj,item,user,title,loc,shift,status] of tasks) {
      await conn.execute(`
        INSERT INTO tasks (id, project_id, project_item_id, assigned_to, title, location_type, target_shift_id, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [id,proj,item,user,title,loc,shift,status]);
    }
    console.log(`  ✅ ${tasks.length} tasks\n`);

    // ── 8. SHIFT INSTANCES + ASSIGNMENTS ────────────────────────────────
    console.log('📅 Seeding shift instances & assignments...');
    const today      = new Date().toISOString().split('T')[0];
    const pastDates  = ['2026-05-04','2026-05-05','2026-05-06','2026-05-07'];
    const allDates   = [...new Set([...pastDates, today])];

    for (const date of allDates) {
      for (const [tid, code, , startTime, endTime] of templates) {
        const instId = `si_${code}_${date.replace(/-/g,'')}`;
        let endDate = date;
        if (endTime <= startTime) {
          const nd = new Date(date + 'T00:00:00'); nd.setDate(nd.getDate() + 1);
          endDate = nd.toISOString().split('T')[0];
        }
        await conn.execute(`
          INSERT IGNORE INTO shift_instances (id, shift_template_id, work_date, start_at, end_at, status)
          VALUES (?, ?, ?, ?, ?, 'OPEN')
        `, [instId, tid, date, `${date} ${startTime}`, `${endDate} ${endTime}`]);
      }
      const dc = date.replace(/-/g,'');
      for (const [id, instId, userId] of [
        [`sa_hiep_${dc}`,   `si_MORNING_${dc}`,   'u_hiep'],
        [`sa_dung_${dc}`,   `si_MORNING_${dc}`,   'u_dung'],
        [`sa_phuong_${dc}`, `si_AFTERNOON_${dc}`, 'u_phuong'],
      ]) {
        await conn.execute(`
          INSERT IGNORE INTO shift_assignments (id, shift_instance_id, user_id, status, assigned_by)
          VALUES (?, ?, ?, 'SCHEDULED', 'u_admin')
        `, [id, instId, userId]);
      }
    }
    console.log(`  ✅ Instances & assignments for ${allDates.length} ngày\n`);

    // ── 9. ATTENDANCE RECORDS (chỉ 4 ngày quá khứ) ──────────────────────
    console.log('🏷  Seeding attendance records...');
    for (const date of pastDates) {
      const dc       = date.replace(/-/g,'');
      const isLate   = date === '2026-05-06'; // dung đi muộn ngày này

      // hiep – Ca Sáng, đúng giờ
      await conn.execute(`
        INSERT INTO attendance_records
          (id, user_id, shift_instance_id, shift_assignment_id, work_date,
           check_in_at, check_out_at, regular_minutes, overtime_minutes, night_minutes,
           late_minutes, early_leave_minutes, break_minutes, total_work_minutes,
           status, location_type, payroll_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 268, 0, 0, 0, 0, 0, 268, 'ON_TIME', 'WORKSHOP', 'APPROVED')
      `, [`ar_hiep_${dc}`,'u_hiep',`si_MORNING_${dc}`,`sa_hiep_${dc}`,date,
          `${date} 07:02:00`,`${date} 11:30:00`]);

      // dung – Ca Sáng (muộn ngày 06/05)
      await conn.execute(`
        INSERT INTO attendance_records
          (id, user_id, shift_instance_id, shift_assignment_id, work_date,
           check_in_at, check_out_at, regular_minutes, overtime_minutes, night_minutes,
           late_minutes, early_leave_minutes, break_minutes, total_work_minutes,
           status, location_type, payroll_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 0, 0, ?, ?, 'WORKSHOP', 'APPROVED')
      `, [`ar_dung_${dc}`,'u_dung',`si_MORNING_${dc}`,`sa_dung_${dc}`,date,
          isLate ? `${date} 07:12:00` : `${date} 07:04:00`,
          `${date} 11:30:00`,
          isLate ? 258 : 266,
          isLate ? 12 : 0,
          isLate ? 258 : 266,
          isLate ? 'LATE' : 'ON_TIME']);

      // phuong – Ca Chiều, đúng giờ
      await conn.execute(`
        INSERT INTO attendance_records
          (id, user_id, shift_instance_id, shift_assignment_id, work_date,
           check_in_at, check_out_at, regular_minutes, overtime_minutes, night_minutes,
           late_minutes, early_leave_minutes, break_minutes, total_work_minutes,
           status, location_type, payroll_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 269, 0, 0, 0, 0, 0, 269, 'ON_TIME', 'WORKSHOP', 'APPROVED')
      `, [`ar_phuong_${dc}`,'u_phuong',`si_AFTERNOON_${dc}`,`sa_phuong_${dc}`,date,
          `${date} 13:01:00`,`${date} 17:30:00`]);
    }
    console.log(`  ✅ ${pastDates.length * 3} attendance records\n`);

    // ── 10. WORKLOGS ─────────────────────────────────────────────────────
    console.log('⏱  Seeding worklogs...');
    const insertWL = async (id, userId, projId, taskId, s, e, stdRate, billRate, loc) => {
      const c = calcWorklog(s, e, stdRate, billRate, loc);
      await conn.execute(`
        INSERT INTO worklogs
          (id, user_id, project_id, task_id, start_time, end_time, duration_hours,
           actual_cost, actual_revenue, status, standard_hours, ot_hours,
           location_multiplier, ot_multiplier, holiday_multiplier)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'DONE', ?, ?, ?, ?, ?)
      `, [id,userId,projId,taskId,s,e,
          c.duration_hours, c.actual_cost, c.actual_revenue,
          c.standard_hours, c.ot_hours,
          c.location_multiplier, c.ot_multiplier, c.holiday_multiplier]);
      return c;
    };

    // task t_001: Thiết kế 3D (hiep, WORKSHOP) → DONE
    const c1 = await insertWL('wl_001','u_hiep',  'p_001','t_001','2026-05-04 07:10:00','2026-05-04 11:20:00',80000,100000,'WORKSHOP');
    const c2 = await insertWL('wl_002','u_hiep',  'p_001','t_001','2026-05-05 07:05:00','2026-05-05 11:25:00',80000,100000,'WORKSHOP');
    const c3 = await insertWL('wl_003','u_hiep',  'p_001','t_001','2026-05-06 07:08:00','2026-05-06 09:50:00',80000,100000,'WORKSHOP');

    // task t_002: Gia công CNC (dung, WORKSHOP) → DONE
    const c4 = await insertWL('wl_004','u_dung',  'p_001','t_002','2026-05-04 07:05:00','2026-05-04 11:25:00',75000,95000,'WORKSHOP');
    const c5 = await insertWL('wl_005','u_dung',  'p_001','t_002','2026-05-05 07:15:00','2026-05-05 11:30:00',75000,95000,'WORKSHOP');
    const c6 = await insertWL('wl_006','u_dung',  'p_001','t_002','2026-05-06 07:12:00','2026-05-06 10:45:00',75000,95000,'WORKSHOP');

    // task t_003: EDM (phuong, WORKSHOP) → DONE
    const c7 = await insertWL('wl_007','u_phuong','p_001','t_003','2026-05-04 13:05:00','2026-05-04 17:20:00',70000,90000,'WORKSHOP');
    const c8 = await insertWL('wl_008','u_phuong','p_001','t_003','2026-05-05 13:03:00','2026-05-05 15:50:00',70000,90000,'WORKSHOP');

    // task t_004: Lắp ráp (hiep, WORKSHOP) → DOING (còn tiếp tục hôm nay)
    const c9  = await insertWL('wl_009','u_hiep',  'p_001','t_004','2026-05-06 09:55:00','2026-05-06 11:30:00',80000,100000,'WORKSHOP');
    const c10 = await insertWL('wl_010','u_hiep',  'p_001','t_004','2026-05-07 07:05:00','2026-05-07 11:28:00',80000,100000,'WORKSHOP');

    // task t_006: Hàn (phuong, WORKSHOP, p_003 COMPLETED) → DONE
    const c11 = await insertWL('wl_011','u_phuong','p_003','t_006','2026-05-06 13:05:00','2026-05-06 17:30:00',70000,90000,'WORKSHOP');
    const c12 = await insertWL('wl_012','u_phuong','p_003','t_006','2026-05-07 13:03:00','2026-05-07 17:25:00',70000,90000,'WORKSHOP');

    const allC      = [c1,c2,c3,c4,c5,c6,c7,c8,c9,c10,c11,c12];
    const totCost   = allC.reduce((s,c) => s + c.actual_cost,    0);
    const totRev    = allC.reduce((s,c) => s + c.actual_revenue, 0);
    const totHours  = allC.reduce((s,c) => s + c.duration_hours, 0);
    console.log(`  ✅ 12 worklogs | ${roundMoney(totHours)}h | Chi phí: ${totCost.toLocaleString('vi-VN')}₫ | Doanh thu: ${totRev.toLocaleString('vi-VN')}₫\n`);

    // ── SUMMARY ──────────────────────────────────────────────────────────
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🎉  Database reset & seed HOÀN TẤT!');
    console.log('');
    console.log('📋 Tài khoản test (password: 123456)');
    console.log('   admin   – ADMIN      – Nguyễn Quản Lý');
    console.log('   lan     – ACCOUNTANT – Trần Thị Lan');
    console.log('   hiep    – STAFF      – Nguyễn Minh Hiệp  (80k₫/h, bill 100k₫/h)');
    console.log('   dung    – STAFF      – Lê Văn Dũng        (75k₫/h, bill  95k₫/h)');
    console.log('   phuong  – STAFF      – Phạm Thị Phương    (70k₫/h, bill  90k₫/h)');
    console.log('');
    console.log('📦 Dữ liệu lịch sử 04–07/05/2026:');
    console.log(`   • 12 worklogs DONE  | tổng ${roundMoney(totHours)}h | chi phí ${totCost.toLocaleString('vi-VN')}₫`);
    console.log('   • 12 attendance records (APPROVED)');
    console.log('   • 3 projects | 6 tasks (3 DONE, 1 DOING, 1 TODO, 1 DONE)');
    console.log('');
    console.log('🔵 Ca hôm nay (sẵn sàng check-in):');
    console.log('   • hiep & dung  →  Ca Sáng   07:00–11:30  (window đến 12:00)');
    console.log('   • phuong       →  Ca Chiều  13:00–17:30  (window đến 18:00)');
    console.log('');
    console.log('🧪 Luồng test đề xuất:');
    console.log('   1. admin  → Dashboard (biểu đồ + tổng chi phí)');
    console.log('   2. admin  → Shift Management → chọn hôm nay → xem phân ca');
    console.log('   3. hiep   → Check-in Ca Sáng → Start task "Lắp ráp..." → Stop');
    console.log('   4. admin  → Live Monitor (thấy hiep đang làm)');
    console.log('   5. admin  → Financial Report (filter theo dự án)');
    console.log('   6. admin  → Attendance Report (kiểm tra lịch sử + muộn)');
    console.log('═══════════════════════════════════════════════════════════════');

  } catch (err) {
    console.error('\n❌ Seed thất bại:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

main();
