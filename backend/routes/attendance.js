const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { generateId, calcDurationHours } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * POST /api/attendance/check-in
 * Start daily attendance session
 */
router.post('/check-in', authenticate, async (req, res) => {
  try {
    const db = req.app.get('db');
    
    // Check if already checked in today (and not checked out)
    const activeAttendance = await db.prepare(`
      SELECT id FROM attendance 
      WHERE user_id = ? AND check_out IS NULL
    `).get(req.user.id);

    if (activeAttendance) {
      return res.status(400).json({ error: 'Bạn đã check-in rồi.' });
    }

    const id = generateId();
    const check_in = new Date().toISOString();

    await db.prepare(`
      INSERT INTO attendance (id, user_id, check_in, status)
      VALUES (?, ?, ?, 'PRESENT')
    `).run(id, req.user.id, check_in);

    res.status(201).json({ id, check_in, status: 'PRESENT' });
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
    
    const activeAttendance = await db.prepare(`
      SELECT * FROM attendance 
      WHERE user_id = ? AND check_out IS NULL
    `).get(req.user.id);

    if (!activeAttendance) {
      return res.status(404).json({ error: 'Không tìm thấy phiên check-in đang hoạt động.' });
    }

    const check_out = new Date().toISOString();
    const duration_hours = calcDurationHours(activeAttendance.check_in, check_out);

    await db.prepare(`
      UPDATE attendance 
      SET check_out = ?, duration_hours = ?
      WHERE id = ?
    `).run(check_out, duration_hours, activeAttendance.id);

    res.json({ ...activeAttendance, check_out, duration_hours });
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
    
    const activeAttendance = await db.prepare(`
      SELECT * FROM attendance 
      WHERE user_id = ? AND check_out IS NULL
    `).get(req.user.id);

    res.json({ active: activeAttendance || null });
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
      SELECT * FROM attendance 
      WHERE user_id = ?
      ORDER BY check_in DESC
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
      SELECT a.*, u.full_name
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (start_date) {
      query += ' AND a.check_in >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND a.check_in <= ?';
      params.push(end_date + ' 23:59:59');
    }
    if (user_id) {
      query += ' AND a.user_id = ?';
      params.push(user_id);
    }

    query += ' ORDER BY a.check_in DESC';

    const report = await db.prepare(query).all(...params);
    res.json(report);
  } catch (err) {
    logger.error('ATTENDANCE', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
