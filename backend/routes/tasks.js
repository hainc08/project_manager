const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { generateId, getMySQLDateTime } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * GET /api/tasks
 * Admin/Accountant: List all tasks with project item info
 */
  router.get('/', authenticate, authorize('ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const db = req.app.get('db');
    const { project_id, assigned_to, status } = req.query;
    
    let query = `
      SELECT t.*, p.project_name, u.full_name as assignee_name, pi.name as project_item_name, st.name as target_shift_name
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN users u ON t.assigned_to = u.id
      LEFT JOIN project_items pi ON t.project_item_id = pi.id
      LEFT JOIN shift_templates st ON t.target_shift_id = st.id
      WHERE 1=1
    `;
    const params = [];

    if (project_id) {
      query += ' AND t.project_id = ?';
      params.push(project_id);
    }
    if (assigned_to) {
      query += ' AND t.assigned_to = ?';
      params.push(assigned_to);
    }
    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }

    query += ' ORDER BY t.created_at DESC';

    const tasks = await db.prepare(query).all(...params);
    res.json(tasks);
  } catch (err) {
    logger.error('TASKS', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * GET /api/tasks/my
 * Staff: List own assigned tasks with project item info
 */
router.get('/my', authenticate, async (req, res) => {
  try {
    const db = req.app.get('db');
    const tasks = await db.prepare(`
      SELECT t.*, p.project_name, pi.name as project_item_name, st.name as target_shift_name
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      LEFT JOIN project_items pi ON t.project_item_id = pi.id
      LEFT JOIN shift_templates st ON t.target_shift_id = st.id
      WHERE t.assigned_to = ? AND t.status != 'DONE' AND t.status != 'CANCELLED'
      ORDER BY CASE WHEN t.status = 'DOING' THEN 0 ELSE 1 END, t.created_at DESC
    `).all(req.user.id);
    res.json(tasks);
  } catch (err) {
    logger.error('TASKS', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * POST /api/tasks
 * Admin: Create task assignment with project item
 */
router.post('/', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const db = req.app.get('db');
    const { project_id, project_item_id, assignee_ids, title, description, location_type, target_shift_id } = req.body;

    if (!project_id || !assignee_ids || !Array.isArray(assignee_ids) || assignee_ids.length === 0) {
      return res.status(400).json({ error: 'Vui lòng chọn Dự án và ít nhất 1 Nhân viên' });
    }

    const project = await db.prepare('SELECT project_name FROM projects WHERE id = ?').get(project_id);
    if (!project) return res.status(400).json({ error: 'Dự án không tồn tại' });
    
    let item_name = '';
    if (project_item_id) {
      const item = await db.prepare('SELECT name FROM project_items WHERE id = ?').get(project_item_id);
      if (item) item_name = item.name;
    }
    
    // Auto generate title if not provided
    const generatedTitle = title || `${project.project_name}${item_name ? ' - ' + item_name : ''}`;

    const tasks = [];
    const todayDate = getMySQLDateTime().split(' ')[0];

    for (const assigned_to of assignee_ids) {
      const id = generateId();
      await db.prepare(`
        INSERT INTO tasks (id, project_id, project_item_id, assigned_to, title, description, status, location_type, target_shift_id)
        VALUES (?, ?, ?, ?, ?, ?, 'TODO', COALESCE(?, 'WORKSHOP'), ?)
      `).run(id, project_id, project_item_id || null, assigned_to, generatedTitle, description || '', location_type, target_shift_id || null);

      // Auto-tạo shift assignment cho hôm nay nếu task có target_shift_id
      if (target_shift_id) {
        try {
          const instance = await db.prepare(`
            SELECT id FROM shift_instances
            WHERE shift_template_id = ? AND work_date = ?
          `).get(target_shift_id, todayDate);

          if (instance) {
            const saId = `sa_${assigned_to}_${instance.id}`;
            await db.prepare(`
              INSERT IGNORE INTO shift_assignments (id, shift_instance_id, user_id, status, assigned_by)
              VALUES (?, ?, ?, 'SCHEDULED', ?)
            `).run(saId, instance.id, assigned_to, req.user.id);
            logger.info('TASKS', `Auto shift assign: user ${assigned_to} → instance ${instance.id}`);
          }
        } catch (e) {
          logger.warn('TASKS', `Auto shift assign skipped: ${e.message}`);
        }
      }

      const task = await db.prepare(`
        SELECT t.*, p.project_name, u.full_name as assignee_name, pi.name as project_item_name, st.name as target_shift_name
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        JOIN users u ON t.assigned_to = u.id
        LEFT JOIN project_items pi ON t.project_item_id = pi.id
        LEFT JOIN shift_templates st ON t.target_shift_id = st.id
        WHERE t.id = ?
      `).get(id);

      tasks.push(task);
    }

    res.status(201).json(tasks);
  } catch (err) {
    logger.error('TASKS', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * PUT /api/tasks/:id
 * Admin: Edit task
 */
router.put('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const db = req.app.get('db');
    const { id } = req.params;
    const { project_id, project_item_id, assigned_to, title, description, status, location_type, target_shift_id } = req.body;

    const task = await db.prepare('SELECT id FROM tasks WHERE id = ?').get(id);
    if (!task) return res.status(404).json({ error: 'Không tìm thấy công việc' });

    await db.prepare(`
      UPDATE tasks 
      SET project_id = COALESCE(?, project_id), 
          project_item_id = ?, 
          assigned_to = COALESCE(?, assigned_to), 
          title = COALESCE(?, title), 
          description = COALESCE(?, description),
          status = COALESCE(?, status),
          location_type = COALESCE(?, location_type),
          target_shift_id = COALESCE(?, target_shift_id),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      project_id ?? null, 
      project_item_id ?? null, 
      assigned_to ?? null, 
      title ?? null, 
      description ?? null, 
      status ?? null, 
      location_type ?? null,
      target_shift_id ?? null,
      id
    );

    const updated = await db.prepare(`
      SELECT t.*, p.project_name, u.full_name as assignee_name, pi.name as project_item_name, st.name as target_shift_name
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN users u ON t.assigned_to = u.id
      LEFT JOIN project_items pi ON t.project_item_id = pi.id
      LEFT JOIN shift_templates st ON t.target_shift_id = st.id
      WHERE t.id = ?
    `).get(id);
    
    res.json(updated);
  } catch (err) {
    logger.error('TASKS', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * PUT /api/tasks/:id/finish
 * Staff: Mark task as finished (waiting for approval)
 */
router.put('/:id/finish', authenticate, async (req, res) => {
  try {
    const db = req.app.get('db');
    const { id } = req.params;

    const task = await db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!task) return res.status(404).json({ error: 'Không tìm thấy công việc' });
    
    if (task.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'Bạn không có quyền cập nhật công việc này' });
    }

    // Check if there is an active worklog for this task
    const activeLog = await db.prepare("SELECT id FROM worklogs WHERE task_id = ? AND status = 'IN_PROGRESS'").get(id);
    if (activeLog) {
      return res.status(400).json({ error: 'Vui lòng kết thúc thời gian làm việc trước khi báo cáo hoàn thành task' });
    }

    await db.prepare(`
      UPDATE tasks SET status = 'FINISHED_BY_STAFF', updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(id);

    res.json({ message: 'Đã gửi báo cáo hoàn thành. Đang chờ Admin duyệt.' });
  } catch (err) {
    logger.error('TASKS', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * PUT /api/tasks/:id/approve
 * Admin: Finalize task as DONE
 */
router.put('/:id/approve', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const db = req.app.get('db');
    const { id } = req.params;

    const task = await db.prepare('SELECT id FROM tasks WHERE id = ?').get(id);
    if (!task) return res.status(404).json({ error: 'Không tìm thấy công việc' });

    await db.prepare(`
      UPDATE tasks SET status = 'DONE', updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(id);

    res.json({ message: 'Đã duyệt hoàn thành công việc' });
  } catch (err) {
    logger.error('TASKS', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * DELETE /api/tasks/:id
 */
router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const db = req.app.get('db');
    const { id } = req.params;

    // Check if task has worklogs
    const hasLogs = await db.prepare('SELECT id FROM worklogs WHERE task_id = ?').get(id);
    if (hasLogs) {
      return res.status(400).json({ error: 'Không thể xóa công việc đã có nhật ký làm việc. Hãy chuyển sang trạng thái CANCELLED.' });
    }

    await db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    res.json({ message: 'Đã xóa công việc thành công' });
  } catch (err) {
    logger.error('TASKS', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
