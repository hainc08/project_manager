const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { authenticate } = require('../middleware/auth');
const { getMySQLDateTime } = require('../utils/helpers');

const getDB = (req) => req.app.get('db');

// Helper: tính ngày đầu tuần (thứ Hai) theo giờ địa phương
function getWeekStart(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0=CN
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

// ============================================================
// WEEK SUMMARY
// ============================================================
router.get('/week', async (req, res) => {
  try {
    const db = getDB(req);
    const today = getMySQLDateTime().split(' ')[0];
    const rawStart = req.query.startDate || today;
    const weekStart = getWeekStart(rawStart);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart + 'T00:00:00');
      d.setDate(d.getDate() + i);
      
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayName = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()];

      const holiday = await db.prepare(
        'SELECT name, day_type, is_paid_day FROM holiday_calendar WHERE holiday_date = ?'
      ).get(dStr);

      const countRow = await db.prepare(
        'SELECT COUNT(DISTINCT shift_template_id) as count FROM shift_instances WHERE work_date = ?'
      ).get(dStr);

      let badge, dayType, holidayName;
      if (holiday) {
        dayType = holiday.day_type;
        badge = holiday.is_paid_day ? 'Lễ có lương' : 'Lễ';
        holidayName = holiday.name;
      } else if (d.getDay() === 0) {
        dayType = 'WEEKLY_REST_DAY';
        badge = 'Nghỉ CN';
      } else {
        dayType = 'NORMAL_WORKDAY';
        badge = `${countRow?.count || 0} ca`;
      }

      days.push({ 
        date: dStr, 
        dayName, 
        isToday: dStr === today, 
        dayType, 
        badge, 
        holidayName,
        shiftCount: countRow?.count || 0 
      });
    }

    res.json({ weekStart, weekEnd: days[6].date, days, selectedDate: today });
  } catch (err) {
    logger.error('SHIFT_WEEK', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// DAILY SHIFTS  (auto-create instances if missing)
// ============================================================
router.get('/days/:date/shifts', async (req, res) => {
  try {
    const { date } = req.params;
    const db = getDB(req);
    const templates = await db.prepare('SELECT * FROM shift_templates WHERE is_active = 1').all();

    // Auto-generate instances
    for (const t of templates) {
      const id = `si_${t.code}_${date.replace(/-/g, '')}`;
      let endDate = date;
      if (t.end_time <= t.start_time) {
        const nd = new Date(date + 'T00:00:00');
        nd.setDate(nd.getDate() + 1);
        endDate = nd.toISOString().split('T')[0];
      }
      await db.prepare(`
        INSERT IGNORE INTO shift_instances (id, shift_template_id, work_date, start_at, end_at, status)
        VALUES (?, ?, ?, ?, ?, 'OPEN')
      `).run(id, t.id, date, `${date} ${t.start_time}`, `${endDate} ${t.end_time}`);
    }

    const shifts = await db.prepare(`
      SELECT si.*, st.name, st.code, st.color, st.base_multiplier,
             st.start_time as t_start, st.end_time as t_end
      FROM shift_instances si
      JOIN shift_templates st ON si.shift_template_id = st.id
      WHERE si.work_date = ?
      ORDER BY st.start_time
    `).all(date);

    const COLORS = ['blue', 'green', 'amber', 'purple'];

    const enriched = await Promise.all(shifts.map(async (s) => {
      const assignments = await db.prepare(`
        SELECT sa.id, sa.status, sa.user_id, u.full_name
        FROM shift_assignments sa JOIN users u ON sa.user_id = u.id
        WHERE sa.shift_instance_id = ?
      `).all(s.id);

      const records = await db.prepare(`
        SELECT ar.*
        FROM attendance_records ar
        WHERE ar.shift_instance_id = ?
      `).all(s.id);

      const stats = {
        assigned: assignments.length,
        present: records.filter(r => r.check_in_at).length,
        onTime:  records.filter(r => r.status === 'ON_TIME').length,
        late:    records.filter(r => r.status === 'LATE').length,
        absent:  records.filter(r => r.status === 'ABSENT').length
                 + assignments.filter(a => a.status === 'ABSENT').length,
        overtime: records.filter(r => r.overtime_minutes > 0).length
      };

      const avatars = assignments.slice(0, 5).map((a, i) => ({
        initials: a.full_name.split(' ').slice(-2).map(n => n[0]).join('').toUpperCase(),
        color: COLORS[i % COLORS.length]
      }));

      const pills = [
        { type: 'ok', label: `${stats.onTime} đúng giờ` },
        stats.late    > 0 ? { type: 'warn',   label: `${stats.late} đi muộn` }   : null,
        stats.absent  > 0 ? { type: 'absent', label: `${stats.absent} vắng` }    : null,
        stats.overtime> 0 ? { type: 'ot',     label: `${stats.overtime} OT` }    : null
      ].filter(Boolean);

      return {
        ...s,
        displayTime: `${s.t_start.slice(0,5)} — ${s.t_end.slice(0,5)}`,
        assignments,
        stats, employeeAvatars: avatars, statusPills: pills
      };
    }));

    res.json({ date, shifts: enriched });
  } catch (err) {
    logger.error('SHIFT_DAY', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// DAILY ATTENDANCE (All shifts for a date)
// ============================================================
router.get('/days/:date/attendance', async (req, res) => {
  try {
    const { date } = req.params;
    const db = getDB(req);

    const records = await db.prepare(`
      SELECT ar.*, u.full_name, u.role as user_role, st.name as shift_name
      FROM attendance_records ar
      JOIN users u ON ar.user_id = u.id
      LEFT JOIN shift_instances si ON ar.shift_instance_id = si.id
      LEFT JOIN shift_templates st ON si.shift_template_id = st.id
      WHERE ar.work_date = ?
         OR si.work_date = ?
      ORDER BY ar.check_in_at
    `).all(date, date);

    const fmt = (dt) => dt
      ? new Date(dt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
      : '---';

    res.json(records.map(r => ({
      id: r.id,
      name: r.full_name,
      role: r.user_role,
      shiftName: r.shift_name || 'Không thuộc ca',
      checkIn:  fmt(r.check_in_at),
      checkOut: fmt(r.check_out_at),
      hours: r.total_work_minutes > 0 ? (r.total_work_minutes / 60).toFixed(2) + 'h' : '---',
      status: r.status,
      lateMinutes:    r.late_minutes || 0,
      overtimeMinutes: r.overtime_minutes || 0,
      isOT: r.overtime_minutes > 0,
      payrollStatus: r.payroll_status
    })));
  } catch (err) {
    logger.error('DAY_ATT', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// ATTENDANCE DETAIL for a shift
// ============================================================
router.get('/shifts/:id/attendance', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDB(req);

    const records = await db.prepare(`
      SELECT ar.*, u.full_name, u.role as user_role
      FROM attendance_records ar
      JOIN users u ON ar.user_id = u.id
      WHERE ar.shift_instance_id = ?
      ORDER BY ar.check_in_at
    `).all(id);

    const fmt = (dt) => dt
      ? new Date(dt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
      : '---';

    res.json(records.map(r => ({
      id: r.id,
      name: r.full_name,
      role: r.user_role,
      checkIn:  fmt(r.check_in_at),
      checkOut: fmt(r.check_out_at),
      hours: r.total_work_minutes > 0 ? (r.total_work_minutes / 60).toFixed(2) + 'h' : '---',
      status: r.status,
      lateMinutes:    r.late_minutes || 0,
      overtimeMinutes: r.overtime_minutes || 0,
      isOT: r.overtime_minutes > 0,
      payrollStatus: r.payroll_status
    })));
  } catch (err) {
    logger.error('SHIFT_ATT', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// SHIFT TEMPLATES CRUD
// ============================================================
router.get('/templates', async (req, res) => {
  try {
    const db = getDB(req);
    const rows = await db.prepare('SELECT * FROM shift_templates WHERE is_active = 1 ORDER BY start_time').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/templates', async (req, res) => {
  try {
    const db = getDB(req);
    const {
      code, name, startTime, endTime, breakMinutes = 0,
      baseMultiplier = 1.0, color = 'blue',
      checkinEarlyMinutes = 30, checkinLateMinutes = 120,
      lateGraceMinutes = 5, checkoutGraceMinutes = 5,
      requiresAssignment = true
    } = req.body;

    if (!code || !name || !startTime || !endTime)
      return res.status(400).json({ error: 'Thiếu trường bắt buộc: code, name, startTime, endTime' });

    const id = `st_${Date.now()}`;
    await db.prepare(`
      INSERT INTO shift_templates
        (id, code, name, start_time, end_time, break_minutes, base_multiplier, color,
         checkin_early_minutes, checkin_late_minutes, late_grace_minutes, checkout_grace_minutes,
         requires_assignment)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, code.toUpperCase(), name, startTime, endTime, breakMinutes,
           baseMultiplier, color, checkinEarlyMinutes, checkinLateMinutes,
           lateGraceMinutes, checkoutGraceMinutes, requiresAssignment ? 1 : 0);

    res.status(201).json({ id, message: 'Tạo ca thành công' });
  } catch (err) {
    logger.error('SHIFT_CREATE', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/templates/:id', async (req, res) => {
  try {
    const db = getDB(req);
    const { id } = req.params;
    const {
      name, startTime, endTime, breakMinutes, baseMultiplier,
      color, checkinEarlyMinutes, checkinLateMinutes,
      lateGraceMinutes, checkoutGraceMinutes, requiresAssignment
    } = req.body;

    await db.prepare(`
      UPDATE shift_templates SET
        name=?, start_time=?, end_time=?, break_minutes=?, base_multiplier=?, color=?,
        checkin_early_minutes=?, checkin_late_minutes=?, late_grace_minutes=?,
        checkout_grace_minutes=?, requires_assignment=?, updated_at=NOW()
      WHERE id=?
    `).run(name, startTime, endTime, breakMinutes, baseMultiplier, color,
           checkinEarlyMinutes, checkinLateMinutes, lateGraceMinutes,
           checkoutGraceMinutes, requiresAssignment ? 1 : 0, id);

    res.json({ message: 'Cập nhật thành công' });
  } catch (err) {
    logger.error('SHIFT_UPDATE', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/templates/:id', async (req, res) => {
  try {
    const db = getDB(req);
    await db.prepare('UPDATE shift_templates SET is_active = 0, updated_at = NOW() WHERE id = ?').run(req.params.id);
    res.json({ message: 'Xóa ca thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// HOLIDAYS CRUD
// ============================================================
router.get('/holidays', async (req, res) => {
  try {
    const db = getDB(req);
    const rows = await db.prepare('SELECT * FROM holiday_calendar ORDER BY holiday_date').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/holidays', async (req, res) => {
  try {
    const db = getDB(req);
    const { holidayDate, name, dayType = 'PUBLIC_HOLIDAY', isPaidDay = true } = req.body;
    const id = 'hol_' + holidayDate.replace(/-/g, '');
    await db.prepare(`
      INSERT INTO holiday_calendar (id, holiday_date, name, day_type, is_paid_day)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE name=VALUES(name), day_type=VALUES(day_type), is_paid_day=VALUES(is_paid_day)
    `).run(id, holidayDate, name, dayType, isPaidDay ? 1 : 0);
    res.status(201).json({ id, message: 'Đã lưu ngày lễ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/holidays/:id', async (req, res) => {
  try {
    const db = getDB(req);
    await db.prepare('DELETE FROM holiday_calendar WHERE id = ?').run(req.params.id);
    res.json({ message: 'Đã xóa ngày lễ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ============================================================
// SHIFT ASSIGNMENTS MANAGEMENT
// ============================================================

/**
 * POST /api/shift-management/shifts/:instanceId/assign
 * Admin: Assign a user to a shift instance
 */
router.post('/shifts/:instanceId/assign', authenticate, async (req, res) => {
  try {
    const db = getDB(req);
    const { instanceId } = req.params;
    const { userId } = req.body;

    if (!userId) return res.status(400).json({ error: 'Thiếu userId' });

    const instance = await db.prepare('SELECT id FROM shift_instances WHERE id = ?').get(instanceId);
    if (!instance) return res.status(404).json({ error: 'Ca không tồn tại' });

    const user = await db.prepare('SELECT id, full_name FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ error: 'Nhân viên không tồn tại' });

    const id = `sa_${userId}_${instanceId}`;
    try {
      await db.prepare(`
        INSERT INTO shift_assignments (id, shift_instance_id, user_id, status, assigned_by)
        VALUES (?, ?, ?, 'SCHEDULED', ?)
      `).run(id, instanceId, userId, req.user.id);
      res.status(201).json({ id, userId, fullName: user.full_name, message: `Đã phân ${user.full_name} vào ca` });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY' || err.message?.includes('UNIQUE')) {
        return res.status(409).json({ error: 'Nhân viên đã được phân vào ca này rồi' });
      }
      throw err;
    }
  } catch (err) {
    logger.error('SHIFT_ASSIGN', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/shift-management/assignments/:id
 * Admin: Remove a user from a shift
 */
router.delete('/assignments/:id', authenticate, async (req, res) => {
  try {
    const db = getDB(req);

    const existing = await db.prepare(`
      SELECT sa.id, u.full_name FROM shift_assignments sa
      JOIN users u ON sa.user_id = u.id
      WHERE sa.id = ?
    `).get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Không tìm thấy phân ca' });

    const hasCheckin = await db.prepare(
      'SELECT id FROM attendance_records WHERE shift_assignment_id = ? AND check_in_at IS NOT NULL'
    ).get(req.params.id);
    if (hasCheckin) return res.status(400).json({ error: 'Không thể xóa vì nhân viên đã check-in ca này' });

    await db.prepare('DELETE FROM shift_assignments WHERE id = ?').run(req.params.id);
    res.json({ message: `Đã xóa phân ca của ${existing.full_name}` });
  } catch (err) {
    logger.error('SHIFT_UNASSIGN', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// STAFF: Ca hôm nay + Check-in / Check-out theo ca
// ============================================================

/**
 * GET /api/shift-management/my-shift-today
 * Trả về ca hôm nay của nhân viên đang đăng nhập
 */
router.get('/my-shift-today', authenticate, async (req, res) => {
  try {
    const db = getDB(req);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Chưa đăng nhập' });

    const todayStr = getMySQLDateTime().split(' ')[0];

    // Tìm shift assignment hôm nay - dùng CURDATE() của MySQL để tránh timezone mismatch
    const assignment = await db.prepare(`
      SELECT sa.*, si.work_date, si.start_at, si.end_at, si.shift_template_id, si.status as instance_status,
             st.name as shift_name, st.code, st.base_multiplier, st.color,
             st.start_time, st.end_time, st.break_minutes,
             st.checkin_early_minutes, st.checkin_late_minutes,
             st.late_grace_minutes, st.checkout_grace_minutes,
             DATE_FORMAT(si.work_date, '%Y-%m-%d') as work_date_str
      FROM shift_assignments sa
      JOIN shift_instances si ON sa.shift_instance_id = si.id
      JOIN shift_templates st ON si.shift_template_id = st.id
      WHERE sa.user_id = ? AND DATE(si.work_date) = CURDATE() AND sa.status != 'ABSENT'
      ORDER BY
        CASE
          WHEN NOW() BETWEEN si.start_at AND si.end_at THEN 0
          WHEN si.start_at > NOW() THEN 1
          ELSE 2
        END,
        si.start_at
      LIMIT 1
    `).get(userId);

    if (!assignment) {
      return res.json({ hasShift: false, message: 'Hôm nay chưa được phân ca' });
    }

    const shiftStart = new Date(assignment.start_at);
    const shiftEnd   = new Date(assignment.end_at);

    // Tìm attendance record
    const record = await db.prepare(`
      SELECT * FROM attendance_records
      WHERE user_id = ? AND shift_instance_id = ?
    `).get(userId, assignment.shift_instance_id);

    // Check-in được phép bất kỳ lúc nào — không giới hạn cửa sổ thời gian
    const canCheckIn  = !record?.check_in_at;
    const canCheckOut = !!record?.check_in_at && !record?.check_out_at;

    // Thông tin trạng thái ca (chỉ để hiển thị, không chặn check-in)
    const nowMs       = Date.now();
    const shiftStarted = nowMs >= shiftStart.getTime();
    const shiftEnded   = nowMs >= shiftEnd.getTime();

    res.json({
      hasShift: true,
      shift: {
        instanceId:       assignment.shift_instance_id,
        assignmentId:     assignment.id,
        name:             assignment.shift_name,
        code:             assignment.code,
        color:            assignment.color,
        displayTime:      `${assignment.start_time.slice(0,5)} — ${assignment.end_time.slice(0,5)}`,
        startAt:          assignment.start_at,
        endAt:            assignment.end_at,
        baseMultiplier:   assignment.base_multiplier,
        breakMinutes:     assignment.break_minutes,
        lateGraceMinutes: assignment.late_grace_minutes,
        shiftStarted,
        shiftEnded,
      },
      attendance: {
        id:               record?.id || null,
        checkInAt:        record?.check_in_at  || null,
        checkOutAt:       record?.check_out_at || null,
        status:           record?.status       || 'PENDING',
        lateMinutes:      record?.late_minutes || 0,
        overtimeMinutes:  record?.overtime_minutes || 0,
        totalWorkMinutes: record?.total_work_minutes || 0,
        canCheckIn,
        canCheckOut,
      }
    });
  } catch (err) {
    logger.error('MY_SHIFT', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/shift-management/staff-check-in
 */
router.post('/staff-check-in', authenticate, async (req, res) => {
  try {
    const db = getDB(req);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Chưa đăng nhập' });

    const { shiftInstanceId } = req.body;
    if (!shiftInstanceId) return res.status(400).json({ error: 'Thiếu shiftInstanceId' });

    const todayStr = getMySQLDateTime().split(' ')[0];

    // Kiểm tra assignment
    const assignment = await db.prepare(`
      SELECT sa.id FROM shift_assignments sa
      WHERE sa.user_id = ? AND sa.shift_instance_id = ?
    `).get(userId, shiftInstanceId);
    if (!assignment) return res.status(403).json({ error: 'Bạn chưa được phân vào ca này' });

    // Kiểm tra đã check-in chưa
    const existing = await db.prepare(
      'SELECT id, check_in_at FROM attendance_records WHERE user_id = ? AND shift_instance_id = ?'
    ).get(userId, shiftInstanceId);
    if (existing?.check_in_at) return res.status(400).json({ error: 'Bạn đã check-in ca này rồi' });

    // Lấy thông tin shift để tính muộn
    const instance = await db.prepare(`
      SELECT si.*, st.late_grace_minutes, st.start_time
      FROM shift_instances si JOIN shift_templates st ON si.shift_template_id = st.id
      WHERE si.id = ?
    `).get(shiftInstanceId);

    const now        = new Date();
    const shiftStart = new Date(instance.start_at);
    const diffMin    = Math.floor((now - shiftStart) / 60000); // âm = vào sớm, dương = muộn
    const grace      = instance.late_grace_minutes || 5;

    let status   = 'ON_TIME';
    let lateMins = 0;
    if (diffMin < 0) {
      status = 'EARLY';                     // Vào trước giờ ca
    } else if (diffMin <= grace) {
      status = 'ON_TIME';                   // Trong biên độ cho phép
    } else {
      status   = 'LATE';
      lateMins = diffMin - grace;           // Số phút trễ sau grace
    }

    const checkInStr = getMySQLDateTime();
    const recId      = `ar_${userId}_${shiftInstanceId}_${Date.now()}`;

    if (existing) {
      await db.prepare(`
        UPDATE attendance_records
        SET check_in_at=?, status=?, late_minutes=?, payroll_status='DRAFT'
        WHERE id=?
      `).run(checkInStr, status, lateMins, existing.id);
    } else {
      await db.prepare(`
        INSERT INTO attendance_records
          (id, user_id, shift_instance_id, shift_assignment_id, work_date,
           check_in_at, status, late_minutes, payroll_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT')
      `).run(recId, userId, shiftInstanceId, assignment.id, todayStr,
             checkInStr, status, lateMins);
    }

    const msgMap = {
      EARLY:   'Check-in thành công — Vào sớm ✓',
      ON_TIME: 'Check-in thành công — Đúng giờ ✓',
      LATE:    `Check-in thành công — Muộn ${lateMins} phút`,
    };
    res.json({ message: msgMap[status], checkInAt: checkInStr, status, lateMinutes: lateMins });
  } catch (err) {
    logger.error('STAFF_CHECKIN', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/shift-management/staff-check-out
 */
router.post('/staff-check-out', authenticate, async (req, res) => {
  try {
    const db = getDB(req);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Chưa đăng nhập' });

    const { shiftInstanceId } = req.body;
    if (!shiftInstanceId) return res.status(400).json({ error: 'Thiếu shiftInstanceId' });

    const record = await db.prepare(`
      SELECT ar.*, si.end_at, st.break_minutes
      FROM attendance_records ar
      JOIN shift_instances si ON ar.shift_instance_id = si.id
      JOIN shift_templates st ON si.shift_template_id = st.id
      WHERE ar.user_id = ? AND ar.shift_instance_id = ?
    `).get(userId, shiftInstanceId);

    if (!record?.check_in_at)  return res.status(400).json({ error: 'Bạn chưa check-in ca này' });
    if (record?.check_out_at)  return res.status(400).json({ error: 'Bạn đã check-out rồi' });

    const now       = new Date();
    const checkIn   = new Date(record.check_in_at);
    const shiftEnd  = new Date(record.end_at);
    const breakMin  = record.break_minutes || 0;

    const totalMin   = Math.max(0, Math.floor((now - checkIn) / 60000) - breakMin);
    const shiftMin   = Math.max(0, Math.floor((shiftEnd - checkIn) / 60000) - breakMin);
    const regularMin = Math.min(totalMin, shiftMin);
    const otMin      = Math.max(0, totalMin - shiftMin);

    const checkOutStr = getMySQLDateTime();

    await db.prepare(`
      UPDATE attendance_records
      SET check_out_at=?, total_work_minutes=?, regular_minutes=?, overtime_minutes=?,
          payroll_status='DRAFT'
      WHERE id=?
    `).run(checkOutStr, totalMin, regularMin, otMin, record.id);

    res.json({
      message: otMin > 0
        ? `Check-out thành công — Tổng: ${(totalMin/60).toFixed(1)}h (OT: ${(otMin/60).toFixed(1)}h)`
        : `Check-out thành công — Tổng: ${(totalMin/60).toFixed(1)}h`,
      checkOutAt: checkOutStr,
      totalWorkMinutes: totalMin,
      regularMinutes:   regularMin,
      overtimeMinutes:  otMin,
    });
  } catch (err) {
    logger.error('STAFF_CHECKOUT', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

