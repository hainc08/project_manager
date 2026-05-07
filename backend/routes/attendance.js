const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { generateId, calcDurationHours, getMySQLDateTime } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * POST /api/attendance/check-in
 * Start daily attendance session (Manual Check-in without shift)
 */
router.post('/check-in', authenticate, async (req, res) => {
  try {
    const db = req.app.get('db');
    
    // Check if already checked in today (and not checked out) in attendance_records
    const activeRecord = await db.prepare(`
      SELECT id FROM attendance_records 
      WHERE user_id = ? AND check_out_at IS NULL
    `).get(req.user.id);

    if (activeRecord) {
      return res.status(400).json({ error: 'Bạn đã check-in rồi.' });
    }

    const id = generateId();
    const check_in = getMySQLDateTime();

    // Insert into attendance_records directly
    await db.prepare(`
      INSERT INTO attendance_records 
        (id, user_id, work_date, check_in_at, status, payroll_status)
      VALUES (?, ?, CURRENT_DATE, ?, 'ON_TIME', 'DRAFT')
    `).run(id, req.user.id, check_in);

    // Ghi log vào attendance_events
    await db.prepare(`
      INSERT INTO attendance_events (id, user_id, event_type, event_at, source)
      VALUES (?, ?, 'CHECK_IN', ?, 'WEB')
    `).run(generateId(), req.user.id, check_in);

    res.status(201).json({ id, check_in, status: 'ON_TIME' });
  } catch (err) {
    logger.error('ATTENDANCE', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * POST /api/attendance/check-out
 * End daily attendance session
 */
router.post('/check-out', authenticate, async (req, res) => {
  try {
    const db = req.app.get('db');
    
    const activeRecord = await db.prepare(`
      SELECT * FROM attendance_records 
      WHERE user_id = ? AND check_out_at IS NULL
    `).get(req.user.id);

    if (!activeRecord) {
      return res.status(404).json({ error: 'Không tìm thấy phiên check-in đang hoạt động.' });
    }

    const check_out = getMySQLDateTime();
    const duration_hours = calcDurationHours(activeRecord.check_in_at, check_out);
    const totalMinutes = Math.round(duration_hours * 60);

    // Update attendance_records
    await db.prepare(`
      UPDATE attendance_records 
      SET check_out_at = ?, 
          total_work_minutes = ?,
          regular_minutes = ?,
          status = 'COMPLETED',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(check_out, totalMinutes, totalMinutes, activeRecord.id);

    // Ghi log vào attendance_events
    await db.prepare(`
      INSERT INTO attendance_events (id, user_id, event_type, event_at, source)
      VALUES (?, ?, 'CHECK_OUT', ?, 'WEB')
    `).run(generateId(), req.user.id, check_out);

    res.json({ check_out, duration_hours });
  } catch (err) {
    logger.error('ATTENDANCE', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * GET /api/attendance/my-status
 * Get current attendance status for the user
 */
router.get('/my-status', authenticate, async (req, res) => {
  try {
    const db = req.app.get('db');
    
    const activeRecord = await db.prepare(`
      SELECT id, check_in_at as check_in, status 
      FROM attendance_records 
      WHERE user_id = ? AND check_out_at IS NULL
    `).get(req.user.id);

    res.json({ active: activeRecord || null });
  } catch (err) {
    logger.error('ATTENDANCE', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * GET /api/attendance/my-history
 * Get attendance history for the staff
 */
router.get('/my-history', authenticate, async (req, res) => {
  try {
    const db = req.app.get('db');
    
    const history = await db.prepare(`
      SELECT id, check_in_at as check_in, check_out_at as check_out, status, total_work_minutes
      FROM attendance_records 
      WHERE user_id = ?
      ORDER BY check_in_at DESC
      LIMIT 30
    `).all(req.user.id);

    res.json(history);
  } catch (err) {
    logger.error('ATTENDANCE', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * GET /api/attendance/report
 * Admin: Get attendance report for all staff
 */
router.get('/report', authenticate, authorize('ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const db = req.app.get('db');
    const { start_date, end_date, user_id } = req.query;

    let query = `
      SELECT ar.id, ar.user_id, ar.check_in_at as check_in, ar.check_out_at as check_out, 
             CAST(ar.total_work_minutes / 60.0 AS DOUBLE) as duration_hours, ar.late_minutes, ar.overtime_minutes,
             ar.status, ar.location_type, u.full_name, st.name as shift_name
      FROM attendance_records ar
      JOIN users u ON ar.user_id = u.id
      LEFT JOIN shift_instances si ON ar.shift_instance_id = si.id
      LEFT JOIN shift_templates st ON si.shift_template_id = st.id
      WHERE 1=1
    `;
    const params = [];

    if (start_date) {
      query += ' AND ar.check_in_at >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND ar.check_in_at <= ?';
      params.push(end_date + ' 23:59:59');
    }
    if (user_id) {
      query += ' AND ar.user_id = ?';
      params.push(user_id);
    }

    query += ' ORDER BY ar.check_in_at DESC';

    const report = await db.prepare(query).all(...params);
    res.json(report);
  } catch (err) {
    logger.error('ATTENDANCE', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
