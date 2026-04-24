const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { generateId, roundMoney, calcDurationHours, calculateLaborCost } = require('../utils/helpers');
const XLSX = require('xlsx');
const logger = require('../utils/logger');

/**
 * POST /api/worklogs/start
 * TASK 02: Start a task (Staff)
 * Business Rule #1: Cannot have 2 tasks running simultaneously
 */
router.post('/start', authenticate, async (req, res) => {
  try {
    const db = req.app.get('db');
    const io = req.app.get('io');
    const { task_id } = req.body;

    if (!task_id) {
      return res.status(400).json({ error: 'Vui lòng chọn công việc (Task) được giao' });
    }

    // Business Rule #1: Check for active task
    const activeTask = await db.prepare(
      "SELECT id, project_id FROM worklogs WHERE user_id = ? AND status = 'IN_PROGRESS'"
    ).get(req.user.id);

    if (activeTask) {
      return res.status(409).json({
        error: 'Bạn đang có một công việc chưa hoàn thành. Vui lòng kết thúc trước khi bắt đầu công việc mới.',
        active_task_id: activeTask.id
      });
    }

    // Mandatory Check-in check
    const activeAttendance = await db.prepare(`
      SELECT id FROM attendance 
      WHERE user_id = ? AND check_out IS NULL
    `).get(req.user.id);

    if (!activeAttendance) {
      return res.status(403).json({ 
        error: 'Yêu cầu vào ca (Check-in) trước khi bắt đầu ghi nhận công việc.' 
      });
    }

    // Check task exists and is assigned to user
    const task = await db.prepare(`
      SELECT t.*, p.status as project_status 
      FROM tasks t 
      JOIN projects p ON t.project_id = p.id 
      WHERE t.id = ?
    `).get(task_id);

    if (!task) {
      return res.status(404).json({ error: 'Công việc không tồn tại' });
    }

    if (task.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'Bạn không được giao thực hiện công việc này' });
    }

    if (task.status === 'DONE' || task.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Công việc này đã hoàn thành hoặc bị hủy' });
    }

    if (task.project_status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Dự án liên quan không còn hoạt động' });
    }

    const id = generateId();
    const start_time = new Date().toISOString();

    // If task is TODO, update to DOING
    if (task.status === 'TODO') {
      await db.prepare("UPDATE tasks SET status = 'DOING', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(task_id);
    }

    await db.prepare(`
      INSERT INTO worklogs (id, user_id, project_id, task_id, start_time, status)
      VALUES (?, ?, ?, ?, ?, 'IN_PROGRESS')
    `).run(id, req.user.id, task.project_id, task_id, start_time);

    const worklog = await db.prepare(`
      SELECT w.*, u.full_name, u.standard_rate, u.billing_rate, p.project_name, 
             t.title as task_title, pi.name as project_item_name
      FROM worklogs w
      JOIN users u ON w.user_id = u.id
      JOIN projects p ON w.project_id = p.id
      LEFT JOIN tasks t ON w.task_id = t.id
      LEFT JOIN project_items pi ON t.project_item_id = pi.id
      WHERE w.id = ?
    `).get(id);

    // Broadcast to all connected clients (Live Monitor)
    io.emit('task:started', worklog);

    res.status(201).json(worklog);
  } catch (err) {
    logger.error('WORKLOGS', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * POST /api/worklogs/stop
 * TASK 02: Stop current task
 */
router.post('/stop', authenticate, async (req, res) => {
  try {
    const db = req.app.get('db');
    const io = req.app.get('io');

    // Find active task for this user
    const activeTask = await db.prepare(
      "SELECT w.*, u.standard_rate, u.billing_rate FROM worklogs w JOIN users u ON w.user_id = u.id WHERE w.user_id = ? AND w.status = 'IN_PROGRESS'"
    ).get(req.user.id);

    if (!activeTask) {
      return res.status(404).json({ error: 'Không tìm thấy công việc đang thực hiện' });
    }

    const end_time = new Date().toISOString();
    
    // Get project info for location_type
    const project = await db.prepare("SELECT location_type FROM projects WHERE id = ?").get(activeTask.project_id);
    
    const metrics = calculateLaborCost(activeTask.start_time, end_time, activeTask.standard_rate, project.location_type);

    await db.prepare(`
      UPDATE worklogs SET 
        end_time = ?, 
        duration_hours = ?, 
        actual_cost = ?, 
        actual_revenue = ?, 
        status = 'DONE',
        standard_hours = ?,
        ot_hours = ?,
        location_multiplier = ?,
        ot_multiplier = ?,
        holiday_multiplier = ?
      WHERE id = ?
    `).run(
      end_time, 
      roundMoney(metrics.standard_hours + metrics.ot_hours), 
      metrics.actual_cost, 
      roundMoney((metrics.standard_hours + metrics.ot_hours) * activeTask.billing_rate), // Revenue remains simple duration * rate
      metrics.standard_hours,
      metrics.ot_hours,
      metrics.location_multiplier,
      metrics.ot_multiplier,
      metrics.holiday_multiplier,
      activeTask.id
    );

    const worklog = await db.prepare(`
      SELECT w.*, u.full_name, p.project_name, t.title as task_title, pi.name as project_item_name
      FROM worklogs w
      JOIN users u ON w.user_id = u.id
      JOIN projects p ON w.project_id = p.id
      LEFT JOIN tasks t ON w.task_id = t.id
      LEFT JOIN project_items pi ON t.project_item_id = pi.id
      WHERE w.id = ?
    `).get(activeTask.id);

    // Broadcast to all connected clients
    io.emit('task:stopped', worklog);

    res.json(worklog);
  } catch (err) {
    logger.error('WORKLOGS', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * GET /api/worklogs/active
 * TASK 04: Live Monitor - Get all active tasks
 */
router.get('/active', authenticate, async (req, res) => {
  try {
    const db = req.app.get('db');
    const activeTasks = await db.prepare(`
      SELECT w.*, u.full_name, u.standard_rate, u.billing_rate, p.project_name, 
             t.title as task_title, pi.name as project_item_name
      FROM worklogs w
      JOIN users u ON w.user_id = u.id
      JOIN projects p ON w.project_id = p.id
      LEFT JOIN tasks t ON w.task_id = t.id
      LEFT JOIN project_items pi ON t.project_item_id = pi.id
      WHERE w.status = 'IN_PROGRESS'
      ORDER BY w.start_time DESC
    `).all();
    res.json(activeTasks);
  } catch (err) {
    logger.error('WORKLOGS', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * GET /api/worklogs/my
 * Staff: Get own worklogs history
 */
router.get('/my', authenticate, async (req, res) => {
  try {
    const db = req.app.get('db');
    const worklogs = await db.prepare(`
      SELECT w.*, p.project_name, t.title as task_title, pi.name as project_item_name
      FROM worklogs w
      JOIN projects p ON w.project_id = p.id
      LEFT JOIN tasks t ON w.task_id = t.id
      LEFT JOIN project_items pi ON t.project_item_id = pi.id
      WHERE w.user_id = ?
      ORDER BY w.start_time DESC
      LIMIT 50
    `).all(req.user.id);
    res.json(worklogs);
  } catch (err) {
    logger.error('WORKLOGS', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * GET /api/worklogs/report
 * TASK 04: Financial Report with filters
 */
router.get('/report', authenticate, authorize('ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const db = req.app.get('db');
    const { start_date, end_date, project_id, user_id } = req.query;

    let query = `
      SELECT w.*, u.full_name, u.standard_rate, u.billing_rate, p.project_name, 
             t.title as task_title, pi.name as project_item_name
      FROM worklogs w
      JOIN users u ON w.user_id = u.id
      JOIN projects p ON w.project_id = p.id
      LEFT JOIN tasks t ON w.task_id = t.id
      LEFT JOIN project_items pi ON t.project_item_id = pi.id
      WHERE w.status = 'DONE'
    `;
    const params = [];

    if (start_date) {
      query += ' AND w.start_time >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND w.start_time <= ?';
      params.push(end_date + ' 23:59:59');
    }
    if (project_id) {
      query += ' AND w.project_id = ?';
      params.push(project_id);
    }
    if (user_id) {
      query += ' AND w.user_id = ?';
      params.push(user_id);
    }

    query += ' ORDER BY w.start_time DESC';

    const worklogs = await db.prepare(query).all(...params);

    // Calculate summary
    const summary = {
      total_cost: roundMoney(worklogs.reduce((sum, w) => sum + (w.actual_cost || 0), 0)),
      total_revenue: roundMoney(worklogs.reduce((sum, w) => sum + (w.actual_revenue || 0), 0)),
      total_hours: roundMoney(worklogs.reduce((sum, w) => sum + (w.duration_hours || 0), 0)),
      total_records: worklogs.length
    };
    summary.profit = roundMoney(summary.total_revenue - summary.total_cost);

    // NEW: Calculate summary by project item
    let itemSummaryQuery = `
      SELECT 
        COALESCE(pi.name, 'Chưa phân loại') as item_name,
        SUM(w.duration_hours) as total_hours,
        SUM(w.actual_cost) as total_cost,
        SUM(w.actual_revenue) as total_revenue
      FROM worklogs w
      LEFT JOIN tasks t ON w.task_id = t.id
      LEFT JOIN project_items pi ON t.project_item_id = pi.id
      WHERE w.status = 'DONE'
    `;
    const itemParams = [];

    if (start_date) {
      itemSummaryQuery += ' AND w.start_time >= ?';
      itemParams.push(start_date);
    }
    if (end_date) {
      itemSummaryQuery += ' AND w.start_time <= ?';
      itemParams.push(end_date + ' 23:59:59');
    }
    if (project_id) {
      itemSummaryQuery += ' AND w.project_id = ?';
      itemParams.push(project_id);
    }
    if (user_id) {
      itemSummaryQuery += ' AND w.user_id = ?';
      itemParams.push(user_id);
    }

    itemSummaryQuery += " GROUP BY COALESCE(pi.name, 'Chưa phân loại') ORDER BY total_revenue DESC";
    
    const rawItemSummary = await db.prepare(itemSummaryQuery).all(...itemParams);
    const item_summary = rawItemSummary.map(item => ({
      ...item,
      profit: roundMoney(item.total_revenue - item.total_cost),
      total_hours: roundMoney(item.total_hours),
      total_cost: roundMoney(item.total_cost),
      total_revenue: roundMoney(item.total_revenue)
    }));

    res.json({ worklogs, summary, item_summary });
  } catch (err) {
    logger.error('WORKLOGS', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * GET /api/worklogs/export
 * Export to Excel
 */
router.get('/export', authenticate, authorize('ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const db = req.app.get('db');
    const { start_date, end_date, project_id } = req.query;

    let query = `
      SELECT w.start_time as 'Bắt đầu', w.end_time as 'Kết thúc', 
             u.full_name as 'Nhân viên', p.project_name as 'Dự án',
             w.task_content as 'Công việc', w.duration_hours as 'Số giờ',
             w.actual_cost as 'Chi phí (VND)', w.actual_revenue as 'Doanh thu (VND)'
      FROM worklogs w
      JOIN users u ON w.user_id = u.id
      JOIN projects p ON w.project_id = p.id
      WHERE w.status = 'DONE'
    `;
    const params = [];

    if (start_date) {
      query += ' AND w.start_time >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND w.start_time <= ?';
      params.push(end_date + ' 23:59:59');
    }
    if (project_id) {
      query += ' AND w.project_id = ?';
      params.push(project_id);
    }

    query += ' ORDER BY w.start_time DESC';

    const data = await db.prepare(query).all(...params);

    // Create Excel workbook
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Báo cáo');

    // Set column widths
    ws['!cols'] = [
      { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 30 },
      { wch: 40 }, { wch: 10 }, { wch: 15 }, { wch: 15 }
    ];

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=bao-cao-${new Date().toISOString().slice(0, 10)}.xlsx`);
    res.send(buffer);
  } catch (err) {
    logger.error('WORKLOGS', err);
    res.status(500).send('Lỗi server');
  }
});

/**
 * PUT /api/worklogs/:id
 * Business Rule #2: Only Admin can edit worklogs
 */
router.put('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const db = req.app.get('db');
    const { id } = req.params;
    const { start_time, end_time, task_content } = req.body;

    const worklog = await db.prepare(
      "SELECT w.*, u.standard_rate, u.billing_rate FROM worklogs w JOIN users u ON w.user_id = u.id WHERE w.id = ?"
    ).get(id);

    if (!worklog) {
      return res.status(404).json({ error: 'Không tìm thấy bản ghi' });
    }

    const newStart = start_time || worklog.start_time;
    const newEnd = end_time || worklog.end_time;

    let duration_hours = worklog.duration_hours;
    let actual_cost = worklog.actual_cost;
    let actual_revenue = worklog.actual_revenue;

    // Recalculate if times changed and task is DONE
    if (newEnd && worklog.status === 'DONE') {
      duration_hours = calcDurationHours(newStart, newEnd);
      actual_cost = roundMoney(duration_hours * worklog.standard_rate);
      actual_revenue = roundMoney(duration_hours * worklog.billing_rate);
    }

    await db.prepare(`
      UPDATE worklogs SET start_time = ?, end_time = ?, task_content = COALESCE(?, task_content),
      duration_hours = ?, actual_cost = ?, actual_revenue = ?
      WHERE id = ?
    `).run(newStart, newEnd, task_content, duration_hours, actual_cost, actual_revenue, id);

    const updated = await db.prepare(`
      SELECT w.*, u.full_name, p.project_name
      FROM worklogs w
      JOIN users u ON w.user_id = u.id
      JOIN projects p ON w.project_id = p.id
      WHERE w.id = ?
    `).get(id);

    res.json(updated);
  } catch (err) {
    logger.error('WORKLOGS', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * GET /api/worklogs/dashboard
 * Dashboard summary data
 */
router.get('/dashboard', authenticate, authorize('ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const db = req.app.get('db');

    // Active staff count
    const activeStaff = await db.prepare(
      "SELECT COUNT(DISTINCT user_id) as count FROM worklogs WHERE status = 'IN_PROGRESS'"
    ).get();

    // Total stats (all time)
    const totals = await db.prepare(`
      SELECT 
        COALESCE(SUM(actual_cost), 0) as total_cost,
        COALESCE(SUM(actual_revenue), 0) as total_revenue,
        COALESCE(SUM(duration_hours), 0) as total_hours,
        COUNT(*) as total_tasks
      FROM worklogs WHERE status = 'DONE'
    `).get();

    // Monthly revenue for chart (last 6 months)
    const monthlyDataRaw = await db.prepare(`
      SELECT 
        strftime('%Y-%m', start_time) as month,
        COALESCE(SUM(actual_cost), 0) as cost,
        COALESCE(SUM(actual_revenue), 0) as revenue
      FROM worklogs WHERE status = 'DONE'
      GROUP BY strftime('%Y-%m', start_time)
      ORDER BY month DESC
      LIMIT 6
    `).all();
    const monthlyData = monthlyDataRaw.reverse();

    // Labor Cost by project
    const projectData = await db.prepare(`
      SELECT 
        p.project_name,
        p.status,
        COALESCE(SUM(w.actual_cost), 0) as cost,
        COALESCE(SUM(w.actual_revenue), 0) as revenue,
        COALESCE(SUM(w.duration_hours), 0) as hours
      FROM projects p
      LEFT JOIN worklogs w ON p.id = w.project_id AND w.status = 'DONE'
      WHERE p.status = 'ACTIVE'
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `).all();

    res.json({
      active_staff: activeStaff ? activeStaff.count : 0,
      totals: {
        ...totals,
        profit: totals ? roundMoney(totals.total_revenue - totals.total_cost) : 0
      },
      monthly_data: monthlyData,
      project_data: projectData
    });
  } catch (err) {
    logger.error('WORKLOGS', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
