const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { generateId, roundMoney, calcDurationHours, calculateLaborCost, getMySQLDateTime } = require('../utils/helpers');
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

    const attendance = await db.prepare(
      "SELECT id FROM attendance_records WHERE user_id = ? AND check_in_at IS NOT NULL AND check_out_at IS NULL AND work_date = DATE(NOW())"
    ).get(req.user.id);

    if (!attendance) {
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
    const start_time = getMySQLDateTime();

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
             t.title as task_title, t.location_type, pi.name as project_item_name
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

    const end_time = getMySQLDateTime();
    
    // Get location_type from task (since we moved location to tasks)
    const taskData = await db.prepare("SELECT location_type FROM tasks WHERE id = ?").get(activeTask.task_id);
    const locationType = taskData?.location_type || 'WORKSHOP';

    // Fetch holidays from DB
    const dbHolidays = await db.prepare("SELECT holiday_date FROM holiday_calendar").all();
    const holidayList = dbHolidays
      ? dbHolidays.map(h => (typeof h.holiday_date === 'string' ? h.holiday_date.split('T')[0] : new Date(h.holiday_date).toISOString().split('T')[0]))
      : [];

    const dynamicRules = {
      ot1_multiplier: 1.5,
      ot2_multiplier: 2.0,
      holiday_multiplier: 2.0,
      site_multiplier: 1.2,
      holidays: holidayList
    };
    
    const metrics = calculateLaborCost(activeTask.start_time, end_time, activeTask.standard_rate, locationType, dynamicRules);

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
             t.title as task_title, t.location_type, pi.name as project_item_name,
             st.name as active_shift_name,
             ar.check_in_at as attendance_check_in,
             CASE
               WHEN ar.check_in_at IS NULL THEN 'PENDING'
               WHEN TIMESTAMPDIFF(MINUTE, si.start_at, ar.check_in_at) < 0 THEN 'EARLY'
               WHEN TIMESTAMPDIFF(MINUTE, si.start_at, ar.check_in_at) <= COALESCE(st.late_grace_minutes, 10) THEN 'ON_TIME'
               ELSE 'LATE'
             END AS attendance_status,
             CASE
               WHEN TIMESTAMPDIFF(MINUTE, si.start_at, ar.check_in_at) < 0
                 THEN ABS(TIMESTAMPDIFF(MINUTE, si.start_at, ar.check_in_at))
               WHEN TIMESTAMPDIFF(MINUTE, si.start_at, ar.check_in_at) > COALESCE(st.late_grace_minutes, 10)
                 THEN TIMESTAMPDIFF(MINUTE, si.start_at, ar.check_in_at) - COALESCE(st.late_grace_minutes, 10)
               ELSE 0
             END AS attendance_diff_minutes
      FROM worklogs w
      JOIN users u ON w.user_id = u.id
      JOIN projects p ON w.project_id = p.id
      LEFT JOIN tasks t ON w.task_id = t.id
      LEFT JOIN project_items pi ON t.project_item_id = pi.id
      LEFT JOIN attendance_records ar ON ar.user_id = w.user_id AND ar.check_out_at IS NULL
      LEFT JOIN shift_instances si ON ar.shift_instance_id = si.id
      LEFT JOIN shift_templates st ON si.shift_template_id = st.id
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
      SELECT w.*, p.project_name, t.title as task_title, t.location_type, pi.name as project_item_name,
             st.name as target_shift_name
      FROM worklogs w
      JOIN projects p ON w.project_id = p.id
      LEFT JOIN tasks t ON w.task_id = t.id
      LEFT JOIN project_items pi ON t.project_item_id = pi.id
      LEFT JOIN shift_templates st ON t.target_shift_id = st.id
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
    const { project_id, project_item_id, user_id } = req.query;

    let query = `
      SELECT w.*, u.full_name, u.standard_rate, u.billing_rate, p.project_name, 
             t.title as task_title, t.location_type, pi.name as project_item_name,
             st.name as target_shift_name
      FROM worklogs w
      JOIN users u ON w.user_id = u.id
      JOIN projects p ON w.project_id = p.id
      LEFT JOIN tasks t ON w.task_id = t.id
      LEFT JOIN project_items pi ON t.project_item_id = pi.id
      LEFT JOIN shift_templates st ON t.target_shift_id = st.id
      WHERE w.status = 'DONE'
    `;
    const params = [];

    if (project_id) {
      query += ' AND w.project_id = ?';
      params.push(project_id);
    }
    if (project_item_id) {
      query += ' AND t.project_item_id = ?';
      params.push(project_item_id);
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

    if (project_id) {
      itemSummaryQuery += ' AND w.project_id = ?';
      itemParams.push(project_id);
    }
    if (project_item_id) {
      itemSummaryQuery += ' AND t.project_item_id = ?';
      itemParams.push(project_item_id);
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
    const { project_id, project_item_id } = req.query;

    let query = `
      SELECT w.start_time as 'Bắt đầu', w.end_time as 'Kết thúc', 
             u.full_name as 'Nhân viên', p.project_name as 'Dự án',
             COALESCE(pi.name, '') as 'Hạng mục',
             w.task_content as 'Công việc', w.duration_hours as 'Số giờ',
             w.actual_cost as 'Chi phí (VND)', w.actual_revenue as 'Doanh thu (VND)'
      FROM worklogs w
      JOIN users u ON w.user_id = u.id
      JOIN projects p ON w.project_id = p.id
      LEFT JOIN tasks t ON w.task_id = t.id
      LEFT JOIN project_items pi ON t.project_item_id = pi.id
      WHERE w.status = 'DONE'
    `;
    const params = [];

    if (project_id) {
      query += ' AND w.project_id = ?';
      params.push(project_id);
    }
    if (project_item_id) {
      query += ' AND t.project_item_id = ?';
      params.push(project_item_id);
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
      const taskData = await db.prepare("SELECT location_type FROM tasks WHERE id = ?").get(worklog.task_id);
      const locationType = taskData?.location_type || 'WORKSHOP';

      const dbHolidays = await db.prepare("SELECT holiday_date FROM holiday_calendar").all();
      const holidayList = dbHolidays
        ? dbHolidays.map(h => (typeof h.holiday_date === 'string' ? h.holiday_date.split('T')[0] : new Date(h.holiday_date).toISOString().split('T')[0]))
        : [];

      const dynamicRules = {
        ot1_multiplier: 1.5,
        ot2_multiplier: 2.0,
        holiday_multiplier: 2.0,
        site_multiplier: 1.2,
        holidays: holidayList
      };

      const metrics = calculateLaborCost(newStart, newEnd, worklog.standard_rate, locationType, dynamicRules);
      duration_hours = roundMoney(metrics.standard_hours + metrics.ot_hours);
      actual_cost = metrics.actual_cost;
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
        ROUND(COALESCE(SUM(actual_cost), 0), 2) as total_cost,
        ROUND(COALESCE(SUM(actual_revenue), 0), 2) as total_revenue,
        ROUND(COALESCE(SUM(duration_hours), 0), 2) as total_hours,
        COUNT(*) as total_tasks
      FROM worklogs WHERE status = 'DONE'
    `).get();

    // Task Summary for Dashboard (X / Y)
    // X = Doing, Y = Total Uncompleted (not DONE, not CANCELLED)
    const tasksStats = await db.prepare(`
      SELECT 
        COUNT(CASE WHEN status = 'DOING' THEN 1 END) as doing_tasks,
        COUNT(CASE WHEN status NOT IN ('DONE', 'CANCELLED') THEN 1 END) as uncompleted_tasks
      FROM tasks
    `).get();

    // Monthly revenue for chart (last 6 months)
    const monthlyDataRaw = await db.prepare(`
      SELECT 
        DATE_FORMAT(start_time, '%Y-%m') as month,
        ROUND(COALESCE(SUM(actual_cost), 0), 2) as cost,
        ROUND(COALESCE(SUM(actual_revenue), 0), 2) as revenue
      FROM worklogs WHERE status = 'DONE'
      GROUP BY DATE_FORMAT(start_time, '%Y-%m')
      ORDER BY month DESC
      LIMIT 6
    `).all();
    const monthlyData = monthlyDataRaw.reverse();

    // Project status count
    const projectStatusCount = await db.prepare(
      "SELECT status, COUNT(*) as count FROM projects GROUP BY status"
    ).all();

    // Labor Cost by project
    const projectData = await db.prepare(`
      SELECT 
        p.id as project_id,
        p.project_name,
        p.status,
        ROUND(COALESCE(SUM(w.actual_cost), 0), 2) as cost,
        ROUND(COALESCE(SUM(w.duration_hours), 0), 2) as hours,
        ROUND(COALESCE(SUM(w.standard_hours), 0), 2) as standard_hours,
        ROUND(COALESCE(SUM(w.ot_hours), 0), 2) as ot_hours,
        ROUND(COALESCE(SUM(w.ot_hours * u.standard_rate * w.ot_multiplier * w.location_multiplier * w.holiday_multiplier), 0), 2) as ot_cost
      FROM projects p
      LEFT JOIN worklogs w ON p.id = w.project_id AND w.status = 'DONE'
      LEFT JOIN users u ON w.user_id = u.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `).all();

    // Item stats by project — join qua tasks để lấy project_item_id
    const projectItemData = await db.prepare(`
      SELECT 
        w.project_id,
        COALESCE(pi.name, 'Chưa phân loại') as item_name,
        ROUND(COALESCE(SUM(w.standard_hours), 0), 2) as standard_hours,
        ROUND(COALESCE(SUM(w.ot_hours), 0), 2) as ot_hours,
        ROUND(COALESCE(SUM(w.actual_cost), 0), 2) as total_cost
      FROM worklogs w
      LEFT JOIN tasks t ON w.task_id = t.id
      LEFT JOIN project_items pi ON t.project_item_id = pi.id
      WHERE w.status = 'DONE'
      GROUP BY w.project_id, pi.id
    `).all();

    // attach items to projects
    projectData.forEach(p => {
      p.items = projectItemData.filter(i => i.project_id === p.project_id);
    });

    res.json({
      active_staff: activeStaff ? activeStaff.count : 0,
      tasks_stats: tasksStats,
      totals: {
        ...totals,
        profit: totals ? roundMoney(totals.total_revenue - totals.total_cost) : 0
      },
      monthly_data: monthlyData,
      project_data: projectData,
      project_status_count: projectStatusCount
    });
  } catch (err) {
    logger.error('WORKLOGS', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
