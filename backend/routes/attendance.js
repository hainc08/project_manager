const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');


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
