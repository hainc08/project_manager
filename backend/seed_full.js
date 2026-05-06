require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { calculateLaborCost, roundMoney } = require('./utils/helpers');

// ── helper: Vietnam local date string ─────────────────────────────────────
function vnDate(daysOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d - off).toISOString().split('T')[0];
}
function vnDT(dateStr, h, m = 0) {
  return `${dateStr} ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`;
}

async function seed() {
  console.log('🏗️  FULL SEED bắt đầu...');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  try {
    const hash = await bcrypt.hash('123456', 10);

    // ── 1. CLEAN ───────────────────────────────────────────────────────────
    console.log('🧹 Dọn dữ liệu cũ...');
    await conn.execute('SET FOREIGN_KEY_CHECKS=0');
    for (const t of [
      'work_segments','attendance_records','attendance_events',
      'shift_assignments','shift_instances',
      'payroll_multiplier_rules','holiday_calendar','shift_templates',
      'attendance','worklogs','tasks',
      'project_item_mapping','project_items','projects','users'
    ]) await conn.execute(`TRUNCATE TABLE ${t}`);
    await conn.execute('SET FOREIGN_KEY_CHECKS=1');

    // ── 2. USERS ───────────────────────────────────────────────────────────
    console.log('👤 Tạo users...');
    const users = [
      ['u_admin',  'admin',    hash, 'Nguyễn Văn Quản Đốc',      'ADMIN',      'Quản đốc xưởng',    'FULLTIME',  250000, 500000],
      ['u_acc',    'ktoan',    hash, 'Trần Thị Kế Toán',          'ACCOUNTANT', 'Kế toán',           'FULLTIME',  150000, 250000],
      ['u_cnc1',   'thocnc1',  hash, 'Lê Văn CNC (Bậc 5/7)',     'STAFF',      'Thợ phay CNC',      'FULLTIME',  120000, 220000],
      ['u_cnc2',   'thocnc2',  hash, 'Hoàng Văn Tiện',           'STAFF',      'Thợ tiện CNC',      'FULLTIME',  110000, 200000],
      ['u_nguoi1', 'thonguoi', hash, 'Phạm Văn Nguội (Lắp ráp)', 'STAFF',      'Thợ nguội lắp ráp', 'FULLTIME',  100000, 180000],
    ];
    for (const u of users) {
      await conn.execute(
        `INSERT INTO users (id,username,password_hash,full_name,role,job_title,contract_type,standard_rate,billing_rate) VALUES (?,?,?,?,?,?,?,?,?)`,
        u
      );
    }

    // ── 3. PROJECT ITEMS ───────────────────────────────────────────────────
    console.log('⚙️  Tạo project items...');
    const items = [
      ['i_design',   'Thiết kế 3D & CAM',          'Thiết kế kỹ thuật và lập trình CNC'],
      ['i_cnc_rough','Gia công phay thô CNC',        'Phay phá khối thép phôi'],
      ['i_edm',      'Gia công xung điện EDM',       'Gia công hốc sâu và khe hẹp'],
      ['i_heat',     'Nhiệt luyện thép',             'Tôi chân không HRC 52-55'],
      ['i_polish',   'Mài bóng & Đánh bóng',        'Xử lý bề mặt lòng khuôn'],
      ['i_assembly', 'Lắp ráp & Căn chỉnh',         'Lắp vỏ khuôn, hệ thống đẩy'],
    ];
    for (const i of items)
      await conn.execute(`INSERT INTO project_items (id,name,description) VALUES (?,?,?)`, i);

    // ── 4. PROJECTS ────────────────────────────────────────────────────────
    console.log('📁 Tạo projects...');
    const projects = [
      ['p_001','Khuôn đúc vỏ động cơ xe máy (SKD61)','SITE',     'ACTIVE'],
      ['p_002','Khuôn dập chậu rửa Inox (D2)',        'WORKSHOP', 'ACTIVE'],
      ['p_003','Sửa chữa bộ khuôn đúc nắp máy',      'WORKSHOP', 'ACTIVE'],
    ];
    for (const p of projects)
      await conn.execute(`INSERT INTO projects (id,project_name,location_type,status) VALUES (?,?,?,?)`, p);

    // ── 5. MAPPINGS ────────────────────────────────────────────────────────
    const mappings = [
      ['p_001','i_design'],['p_001','i_cnc_rough'],['p_001','i_heat'],['p_001','i_polish'],
      ['p_002','i_design'],['p_002','i_cnc_rough'],['p_002','i_assembly'],
      ['p_003','i_edm'],['p_003','i_assembly'],
    ];
    for (const m of mappings)
      await conn.execute(`INSERT INTO project_item_mapping (project_id,item_id) VALUES (?,?)`, m);

    // ── 6. TASKS ───────────────────────────────────────────────────────────
    console.log('📝 Tạo tasks...');
    const tasks = [
      ['t_1','p_001','i_cnc_rough','u_cnc1',  'Phay thô lòng khuôn A (Cavity)','SITE',    'DOING'],
      ['t_2','p_001','i_design',   'u_admin', 'Thiết kế hệ thống kênh dẫn nhựa','SITE',   'DONE'],
      ['t_3','p_002','i_cnc_rough','u_cnc2',  'Phay thô chậu rửa Inox',         'WORKSHOP','DOING'],
      ['t_4','p_002','i_assembly', 'u_nguoi1','Lắp ráp bộ khuôn chậu rửa',      'WORKSHOP','TODO'],
      ['t_5','p_003','i_edm',      'u_nguoi1','Gia công xung điện nắp máy',      'WORKSHOP','DOING'],
    ];
    for (const t of tasks)
      await conn.execute(
        `INSERT INTO tasks (id,project_id,project_item_id,assigned_to,title,location_type,status) VALUES (?,?,?,?,?,?,?)`, t
      );

    // ── 7. WORKLOGS ────────────────────────────────────────────────────────
    console.log('⏱️  Tạo worklogs...');
    const mon = vnDate(-2); // Thứ 2 (2 ngày trước)
    const tue = vnDate(-1); // Thứ 3 (1 ngày trước)
    const wed = vnDate(0);  // Thứ 4 (hôm nay)

    const wlDefs = [
      // id, user_id, project_id, task_id, start, end, location
      // --- Thứ 2 ---
      { id:'wl_01', uid:'u_cnc1',   pid:'p_001', tid:'t_1', s:vnDT(mon,8),  e:vnDT(mon,17),     loc:'SITE'    },
      { id:'wl_02', uid:'u_cnc1',   pid:'p_001', tid:'t_1', s:vnDT(mon,17,30),e:vnDT(mon,19,30), loc:'SITE'    },
      { id:'wl_03', uid:'u_cnc2',   pid:'p_002', tid:'t_3', s:vnDT(mon,8),  e:vnDT(mon,17),     loc:'WORKSHOP'},
      { id:'wl_04', uid:'u_nguoi1', pid:'p_002', tid:'t_4', s:vnDT(mon,8),  e:vnDT(mon,17,15),  loc:'WORKSHOP'},
      { id:'wl_05', uid:'u_admin',  pid:'p_001', tid:'t_2', s:vnDT(mon,8),  e:vnDT(mon,17),     loc:'SITE'    },
      // --- Thứ 3 ---
      { id:'wl_06', uid:'u_cnc1',   pid:'p_001', tid:'t_1', s:vnDT(tue,8),  e:vnDT(tue,17,15),  loc:'SITE'    },
      { id:'wl_07', uid:'u_cnc2',   pid:'p_002', tid:'t_3', s:vnDT(tue,8),  e:vnDT(tue,20),     loc:'WORKSHOP'},
      { id:'wl_08', uid:'u_nguoi1', pid:'p_003', tid:'t_5', s:vnDT(tue,8),  e:vnDT(tue,17),     loc:'WORKSHOP'},
      // --- Thứ 4 (hôm nay, đã xong) ---
      { id:'wl_09', uid:'u_cnc1',   pid:'p_001', tid:'t_1', s:vnDT(wed,8),  e:vnDT(wed,23),     loc:'SITE'    },
      { id:'wl_10', uid:'u_cnc2',   pid:'p_002', tid:'t_3', s:vnDT(wed,8),  e:vnDT(wed,17),     loc:'WORKSHOP'},
    ];

    // Rate map
    const rates = { u_admin:250000, u_acc:150000, u_cnc1:120000, u_cnc2:110000, u_nguoi1:100000 };
    const billing = { u_admin:500000, u_acc:250000, u_cnc1:220000, u_cnc2:200000, u_nguoi1:180000 };

    for (const w of wlDefs) {
      const rate = rates[w.uid];
      const bill = billing[w.uid];
      const m = calculateLaborCost(w.s, w.e, rate, w.loc);
      const durationH = roundMoney((new Date(w.e) - new Date(w.s)) / 3600000);
      const revenue   = roundMoney(durationH * bill);

      await conn.execute(`
        INSERT INTO worklogs
          (id,user_id,project_id,task_id,start_time,end_time,
           duration_hours,actual_cost,actual_revenue,status,
           standard_hours,ot_hours,location_multiplier,ot_multiplier,holiday_multiplier)
        VALUES (?,?,?,?,?,?,?,?,?,'DONE',?,?,?,?,?)
      `, [
        w.id, w.uid, w.pid, w.tid, w.s, w.e,
        durationH, m.actual_cost, revenue,
        m.standard_hours, m.ot_hours,
        m.location_multiplier, m.ot_multiplier, m.holiday_multiplier
      ]);

      console.log(`  ✔ ${w.id} | ${w.uid} | ${w.s.slice(5,16)}→${w.e.slice(11,16)} | std=${m.standard_hours}h ot=${m.ot_hours}h | cost=${m.actual_cost.toLocaleString()}đ`);
    }

    // ── 8. ATTENDANCE (old table) ──────────────────────────────────────────
    console.log('📋 Tạo attendance (hệ thống cũ)...');
    for (const [uid, ci, co] of [
      ['u_cnc1',   vnDT(wed,7,55), vnDT(wed,17,5)],
      ['u_cnc2',   vnDT(wed,8,2),  null],           // chưa check-out (đang làm)
      ['u_nguoi1', vnDT(wed,8,10), vnDT(wed,17,0)],
    ]) {
      const id = `att_${uid}_${wed.replace(/-/g,'')}`;
      if (co) {
        const dur = roundMoney((new Date(co) - new Date(ci)) / 3600000);
        await conn.execute(
          `INSERT INTO attendance (id,user_id,check_in,check_out,duration_hours,status) VALUES (?,?,?,?,?,'PRESENT')`,
          [id, uid, ci, co, dur]
        );
      } else {
        await conn.execute(
          `INSERT INTO attendance (id,user_id,check_in,status) VALUES (?,?,?,'PRESENT')`,
          [id, uid, ci]
        );
      }
    }

    // ── 9. SHIFT TEMPLATES ─────────────────────────────────────────────────
    console.log('🕐 Tạo shift templates...');
    await conn.execute(`
      INSERT IGNORE INTO shift_templates
        (id,code,name,start_time,end_time,break_minutes,base_multiplier,color,
         checkin_early_minutes,checkin_late_minutes,late_grace_minutes,checkout_grace_minutes,requires_assignment)
      VALUES
        ('st_morning',  'MORNING',  'Ca Sáng', '06:00:00','14:00:00',30,1.0,'amber', 30,120,5,5,1),
        ('st_afternoon','AFTERNOON','Ca Chiều','14:00:00','22:00:00',30,1.0,'blue',  30,120,5,5,1),
        ('st_night',    'NIGHT',    'Ca Đêm',  '22:00:00','06:00:00',30,1.5,'purple',30,120,5,5,1)
    `);

    // ── 10. MULTIPLIER RULES ───────────────────────────────────────────────
    console.log('📐 Tạo multiplier rules...');
    await conn.execute(`
      INSERT IGNORE INTO payroll_multiplier_rules
        (id,code,name,day_type,segment_type,multiplier,minimum_legal_multiplier,effective_from)
      VALUES
        ('rule_ot1',   'OT_NORMAL_DAY',    'Tăng ca 1 (17:15)',   'NORMAL_WORKDAY',  'OT_NORMAL_DAY',    1.5,1.5,'2026-01-01'),
        ('rule_ot2',   'OT_NIGHT',         'Tăng ca 2 (22:15)',   'NORMAL_WORKDAY',  'OT_NIGHT',         1.5,1.5,'2026-01-01'),
        ('rule_rest',  'OT_WEEKLY_REST',   'OT Ngày Nghỉ Tuần',   'WEEKLY_REST_DAY', 'OT_WEEKLY_REST',   1.5,1.5,'2026-01-01'),
        ('rule_hol',   'OT_PUBLIC_HOLIDAY','OT Ngày Lễ',          'PUBLIC_HOLIDAY',  'OT_PUBLIC_HOLIDAY',1.5,1.5,'2026-01-01'),
        ('rule_night', 'NIGHT_REGULAR',    'Phụ cấp ca đêm',      'NORMAL_WORKDAY',  'NIGHT_REGULAR',    1.5,1.5,'2026-01-01')
    `);

    // ── 11. HOLIDAYS ───────────────────────────────────────────────────────
    console.log('🎌 Tạo holidays 2026...');
    const holidays = [
      ['2026-01-01','Tết Dương lịch'],
      ['2026-02-16','Tết Nguyên đán (29 Tết)'],['2026-02-17','Mùng 1 Tết'],
      ['2026-02-18','Mùng 2 Tết'],['2026-02-19','Mùng 3 Tết'],
      ['2026-02-20','Mùng 4 Tết'],['2026-02-21','Mùng 5 Tết'],
      ['2026-04-26','Giỗ tổ Hùng Vương'],
      ['2026-04-30','Giải phóng miền Nam'],
      ['2026-05-01','Ngày Quốc tế Lao động'],
      ['2026-09-02','Ngày Quốc khánh'],['2026-09-03','Quốc khánh (bổ sung)'],
    ];
    for (const [date, name] of holidays) {
      const id = 'hol_' + date.replace(/-/g,'');
      await conn.execute(
        `INSERT IGNORE INTO holiday_calendar (id,holiday_date,name,day_type,default_multiplier) VALUES (?,?,?,'PUBLIC_HOLIDAY',1.5)`,
        [id, date, name]
      );
    }

    // ── 12. SHIFT INSTANCES (3 ngày) ──────────────────────────────────────
    console.log('📅 Tạo shift instances...');
    for (const [dOff, dLabel] of [[-2,'mon'],[-1,'tue'],[0,'wed']]) {
      const d = vnDate(dOff);
      const nextD = vnDate(dOff + 1);
      const shifts = [
        { tmpl:'st_morning',   id:`si_MORNING_${d.replace(/-/g,'')}`,   s:`${d} 06:00:00`, e:`${d} 14:00:00`   },
        { tmpl:'st_afternoon', id:`si_AFTERNOON_${d.replace(/-/g,'')}`, s:`${d} 14:00:00`, e:`${d} 22:00:00`   },
        { tmpl:'st_night',     id:`si_NIGHT_${d.replace(/-/g,'')}`,     s:`${d} 22:00:00`, e:`${nextD} 06:00:00`},
      ];
      for (const sh of shifts) {
        await conn.execute(
          `INSERT IGNORE INTO shift_instances (id,shift_template_id,work_date,start_at,end_at,status) VALUES (?,?,?,?,?,'OPEN')`,
          [sh.id, sh.tmpl, d, sh.s, sh.e]
        );
      }
    }

    // ── 13. SHIFT ASSIGNMENTS + ATTENDANCE RECORDS ─────────────────────────
    console.log('👥 Tạo shift assignments & attendance records...');

    const staffList = ['u_cnc1','u_cnc2','u_nguoi1'];

    for (const [dOff] of [[-2],[-1],[0]]) {
      const d = vnDate(dOff);
      const morningId = `si_MORNING_${d.replace(/-/g,'')}`;

      // Kịch bản điểm danh buổi sáng: 3 nhân viên
      const scenarios = [
        { uid:'u_cnc1',   aStatus:'COMPLETED', ciMin:3,   coMin:480,  recStatus:'ON_TIME', lateMin:0,  otMin:0  },
        { uid:'u_cnc2',   aStatus:'COMPLETED', ciMin:14,  coMin:480,  recStatus:'LATE',    lateMin:9,  otMin:0  },
        { uid:'u_nguoi1', aStatus:'COMPLETED', ciMin:-2,  coMin:572,  recStatus:'ON_TIME', lateMin:0,  otMin:92 },
      ];

      for (let i = 0; i < scenarios.length; i++) {
        const sc = scenarios[i];
        const assignId = `sa_m${i}_${d.replace(/-/g,'')}`;
        const recId    = `ar_m${i}_${d.replace(/-/g,'')}`;

        await conn.execute(
          `INSERT IGNORE INTO shift_assignments (id,shift_instance_id,user_id,status,assigned_at) VALUES (?,?,?,?,NOW())`,
          [assignId, morningId, sc.uid, sc.aStatus]
        );

        const shiftStartMs = new Date(`${d}T06:00:00`).getTime();
        const checkIn  = new Date(shiftStartMs + sc.ciMin  * 60000);
        const checkOut = new Date(shiftStartMs + sc.coMin  * 60000);
        const totalMin = Math.round((checkOut - checkIn) / 60000);
        const regMin   = Math.max(0, totalMin - sc.otMin);

        await conn.execute(`
          INSERT IGNORE INTO attendance_records
            (id,user_id,shift_instance_id,shift_assignment_id,work_date,
             check_in_at,check_out_at,
             regular_minutes,overtime_minutes,late_minutes,total_work_minutes,
             status,payroll_status)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'APPROVED')
        `, [
          recId, sc.uid, morningId, assignId, d,
          checkIn.toISOString().slice(0,19).replace('T',' '),
          checkOut.toISOString().slice(0,19).replace('T',' '),
          regMin, sc.otMin, sc.lateMin, totalMin, sc.recStatus
        ]);
      }
    }

    console.log('\n✅ SEED HOÀN TẤT! Tóm tắt:');
    const [[{c:uCount}]] = await conn.execute('SELECT COUNT(*) c FROM users');
    const [[{c:pCount}]] = await conn.execute('SELECT COUNT(*) c FROM projects');
    const [[{c:tCount}]] = await conn.execute('SELECT COUNT(*) c FROM tasks');
    const [[{c:wCount}]] = await conn.execute('SELECT COUNT(*) c FROM worklogs');
    const [[{c:arCount}]] = await conn.execute('SELECT COUNT(*) c FROM attendance_records');
    console.log(`  👤 Users: ${uCount}  📁 Projects: ${pCount}  📝 Tasks: ${tCount}`);
    console.log(`  ⏱️  Worklogs: ${wCount}  📋 Attendance records: ${arCount}`);

    const [[totals]] = await conn.execute(
      `SELECT SUM(actual_cost) total_cost, SUM(actual_revenue) total_rev, SUM(duration_hours) total_h FROM worklogs WHERE status='DONE'`
    );
    console.log(`\n  💰 Tổng chi phí: ${Math.round(totals.total_cost).toLocaleString()}đ`);
    console.log(`  💵 Tổng doanh thu: ${Math.round(totals.total_rev).toLocaleString()}đ`);
    console.log(`  🕐 Tổng giờ công: ${totals.total_h}h`);

  } catch (err) {
    console.error('❌ Lỗi:', err.message);
    throw err;
  } finally {
    await conn.end();
  }
}

seed().catch(() => process.exit(1));
