const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { generateId, roundMoney, calcDurationHours } = require('../utils/helpers');
const XLSX = require('xlsx');

/**
 * POST /api/worklogs/start
 * TASK 02: Start a task (Staff)
 * Business Rule #1: Cannot have 2 tasks running simultaneously
 */
router.post('/start', authenticate, (req, res) => {
  const db = req.app.get('db');
  const io = req.app.get('io');
  const { task_id } = req.body;

  if (!task_id) {
    return res.status(400).json({ error: 'Vui lòng chọn công việc (Task) được giao' });
  }

  // Business Rule #1: Check for active task
  const activeTask = db.prepare(
    "SELECT id, project_id FROM worklogs WHERE user_id = ? AND status = 'IN_PROGRESS'"
  ).get(req.user.id);

  if (activeTask) {
    return res.status(409).json({
      error: 'Bạn đang có một công việc chưa hoàn thành. Vui lòng kết thúc trước khi bắt đầu công việc mới.',
      active_task_id: activeTask.id
    });
  }

  // Mandatory Check-in check
  const activeAttendance = db.prepare(`
    SELECT id FROM attendance 
    WHERE user_id = ? AND check_out IS NULL
  `).get(req.user.id);

  if (!activeAttendance) {
    return res.status(403).json({ 
      error: 'Yêu cầu vào ca (Check-in) trước khi bắt đầu ghi nhận công việc.' 
    });
  }

  // Check task exists and is assigned to user
  const task = db.prepare(`
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
    db.prepare("UPDATE tasks SET status = 'DOING', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(task_id);
  }

  db.prepare(`
    INSERT INTO worklogs (id, user_id, project_id, task_id, start_time, status)
    VALUES (?, ?, ?, ?, ?, 'IN_PROGRESS')
  `).run(id, req.user.id, task.project_id, task_id, start_time);

  const worklog = db.prepare(`
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
});

/**
 * POST /api/worklogs/stop
 * TASK 02: Stop current task
 */
router.post('/stop', authenticate, (req, res) => {
  const db = req.app.get('db');
  const io = req.app.get('io');

  // Find active task for this user
  const activeTask = db.prepare(
    "SELECT w.*, u.standard_rate, u.billing_rate FROM worklogs w JOIN users u ON w.user_id = u.id WHERE w.user_id = ? AND w.status = 'IN_PROGRESS'"
  ).get(req.user.id);

  if (!activeTask) {
    return res.status(404).json({ error: 'Không tìm thấy công việc đang thực hiện' });
  }

  const end_time = new Date().toISOString();
  const duration_hours = calcDurationHours(activeTask.start_time, end_time);
  const actual_cost = roundMoney(duration_hours * activeTask.standard_rate);
  const actual_revenue = roundMoney(duration_hours * activeTask.billing_rate);

  db.prepare(`
    UPDATE worklogs SET end_time = ?, duration_hours = ?, actual_cost = ?, actual_revenue = ?, status = 'DONE'
    WHERE id = ?
  `).run(end_time, duration_hours, actual_cost, actual_revenue, activeTask.id);

  const worklog = db.prepare(`
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
});

/**
 * GET /api/worklogs/active
 * TASK 04: Live Monitor - Get all active tasks
 */
router.get('/active', authenticate, (req, res) => {
  const db = req.app.get('db');
  const activeTasks = db.prepare(`
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
});

/**
 * GET /api/worklogs/my
 * Staff: Get own worklogs history
 */
router.get('/my', authenticate, (req, res) => {
  const db = req.app.get('db');
  const worklogs = db.prepare(`
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
});

/**
 * GET /api/worklogs/report
 * TASK 04: Financial Report with filters
 */
router.get('/report', authenticate, authorize('ADMIN', 'ACCOUNTANT'), (req, res) => {
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

  const worklogs = db.prepare(query).all(...params);

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

  itemSummaryQuery += ' GROUP BY COALESCE(pi.name, "Chưa phân loại") ORDER BY total_revenue DESC';
  
  const item_summary = db.prepare(itemSummaryQuery).all(...itemParams).map(item => ({
    ...item,
    profit: roundMoney(item.total_revenue - item.total_cost),
    total_hours: roundMoney(item.total_hours),
    total_cost: roundMoney(item.total_cost),
    total_revenue: roundMoney(item.total_revenue)
  }));

  res.json({ worklogs, summary, item_summary });
});

/**
 * GET /api/worklogs/export
 * Export to Excel
 */
router.get('/export', authenticate, authorize('ADMIN', 'ACCOUNTANT'), (req, res) => {
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

  const data = db.prepare(query).all(...params);

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
});

/**
 * PUT /api/worklogs/:id
 * Business Rule #2: Only Admin can edit worklogs
 */
router.put('/:id', authenticate, authorize('ADMIN'), (req, res) => {
  const db = req.app.get('db');
  const { id } = req.params;
  const { start_time, end_time, task_content } = req.body;

  const worklog = db.prepare(
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

  db.prepare(`
    UPDATE worklogs SET start_time = ?, end_time = ?, task_content = COALESCE(?, task_content),
    duration_hours = ?, actual_cost = ?, actual_revenue = ?
    WHERE id = ?
  `).run(newStart, newEnd, task_content, duration_hours, actual_cost, actual_revenue, id);

  const updated = db.prepare(`
    SELECT w.*, u.full_name, p.project_name
    FROM worklogs w
    JOIN users u ON w.user_id = u.id
    JOIN projects p ON w.project_id = p.id
    WHERE w.id = ?
  `).get(id);

  res.json(updated);
});

/**
 * GET /api/worklogs/dashboard
 * Dashboard summary data
 */
router.get('/dashboard', authenticate, authorize('ADMIN', 'ACCOUNTANT'), (req, res) => {
  const db = req.app.get('db');

  // Active staff count
  const activeStaff = db.prepare(
    "SELECT COUNT(DISTINCT user_id) as count FROM worklogs WHERE status = 'IN_PROGRESS'"
  ).get();

  // Total stats (all time)
  const totals = db.prepare(`
    SELECT 
      COALESCE(SUM(actual_cost), 0) as total_cost,
      COALESCE(SUM(actual_revenue), 0) as total_revenue,
      COALESCE(SUM(duration_hours), 0) as total_hours,
      COUNT(*) as total_tasks
    FROM worklogs WHERE status = 'DONE'
  `).get();

  // Monthly revenue for chart (last 6 months)
  const monthlyData = db.prepare(`
    SELECT 
      strftime('%Y-%m', start_time) as month,
      COALESCE(SUM(actual_cost), 0) as cost,
      COALESCE(SUM(actual_revenue), 0) as revenue
    FROM worklogs WHERE status = 'DONE'
    GROUP BY strftime('%Y-%m', start_time)
    ORDER BY month DESC
    LIMIT 6
  `).all().reverse();

  // Revenue by project
  const projectData = db.prepare(`
    SELECT 
      p.project_name,
      COALESCE(SUM(w.actual_cost), 0) as cost,
      COALESCE(SUM(w.actual_revenue), 0) as revenue,
      COALESCE(SUM(w.duration_hours), 0) as hours
    FROM worklogs w
    JOIN projects p ON w.project_id = p.id
    WHERE w.status = 'DONE'
    GROUP BY w.project_id
  `).all();

  res.json({
    active_staff: activeStaff.count,
    totals: {
      ...totals,
      profit: roundMoney(totals.total_revenue - totals.total_cost)
    },
    monthly_data: monthlyData,
    project_data: projectData
  });
});

module.exports = router;
