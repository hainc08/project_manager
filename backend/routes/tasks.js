const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { generateId } = require('../utils/helpers');

/**
 * GET /api/tasks
 * Admin/Accountant: List all tasks with project item info
 */
  router.get('/', authenticate, authorize('ADMIN', 'ACCOUNTANT'), (req, res) => {
  const db = req.app.get('db');
  try {
    const { project_id, assigned_to, status } = req.query;
    
    let query = `
      SELECT t.*, p.project_name, u.full_name as assignee_name, pi.name as project_item_name
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN users u ON t.assigned_to = u.id
      LEFT JOIN project_items pi ON t.project_item_id = pi.id
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

    const tasks = db.prepare(query).all(...params);
    res.json(tasks);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: 'Lỗi hệ thống khi tải danh sách công việc: ' + err.message });
  }
});

/**
 * GET /api/tasks/my
 * Staff: List own assigned tasks with project item info
 */
router.get('/my', authenticate, (req, res) => {
  const db = req.app.get('db');
  const tasks = db.prepare(`
    SELECT t.*, p.project_name, pi.name as project_item_name
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    LEFT JOIN project_items pi ON t.project_item_id = pi.id
    WHERE t.assigned_to = ? AND t.status != 'DONE' AND t.status != 'CANCELLED'
    ORDER BY CASE WHEN t.status = 'DOING' THEN 0 ELSE 1 END, t.created_at DESC
  `).all(req.user.id);
  res.json(tasks);
});

/**
 * POST /api/tasks
 * Admin: Create task assignment with project item
 */
router.post('/', authenticate, authorize('ADMIN'), (req, res) => {
  const db = req.app.get('db');
  const { project_id, project_item_id, assigned_to, title, description } = req.body;

  if (!project_id || !assigned_to || !title) {
    return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin: Dự án, Người thực hiện, Tiêu đề' });
  }

  try {
    const id = generateId();
    db.prepare(`
      INSERT INTO tasks (id, project_id, project_item_id, assigned_to, title, description, status)
      VALUES (?, ?, ?, ?, ?, ?, 'TODO')
    `).run(id, project_id, project_item_id || null, assigned_to, title, description || '');

    const task = db.prepare(`
      SELECT t.*, p.project_name, u.full_name as assignee_name, pi.name as project_item_name
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN users u ON t.assigned_to = u.id
      LEFT JOIN project_items pi ON t.project_item_id = pi.id
      WHERE t.id = ?
    `).get(id);
    
    res.status(201).json(task);
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: 'Lỗi hệ thống khi tạo công việc: ' + err.message });
  }
});

/**
 * PUT /api/tasks/:id
 * Admin: Edit task
 */
router.put('/:id', authenticate, authorize('ADMIN'), (req, res) => {
  const db = req.app.get('db');
  const { id } = req.params;
  const { project_id, project_item_id, assigned_to, title, description, status } = req.body;

  const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(id);
  if (!task) return res.status(404).json({ error: 'Không tìm thấy công việc' });

  db.prepare(`
    UPDATE tasks 
    SET project_id = COALESCE(?, project_id), 
        project_item_id = ?, 
        assigned_to = COALESCE(?, assigned_to), 
        title = COALESCE(?, title), 
        description = COALESCE(?, description),
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(project_id, project_item_id || null, assigned_to, title, description, status, id);

  const updated = db.prepare(`
    SELECT t.*, p.project_name, u.full_name as assignee_name, pi.name as project_item_name
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    JOIN users u ON t.assigned_to = u.id
    LEFT JOIN project_items pi ON t.project_item_id = pi.id
    WHERE t.id = ?
  `).get(id);
  
  res.json(updated);
});

/**
 * PUT /api/tasks/:id/finish
 * Staff: Mark task as finished (waiting for approval)
 */
router.put('/:id/finish', authenticate, (req, res) => {
  const db = req.app.get('db');
  const { id } = req.params;

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!task) return res.status(404).json({ error: 'Không tìm thấy công việc' });
  
  if (task.assigned_to !== req.user.id) {
    return res.status(403).json({ error: 'Bạn không có quyền cập nhật công việc này' });
  }

  // Check if there is an active worklog for this task
  const activeLog = db.prepare("SELECT id FROM worklogs WHERE task_id = ? AND status = 'IN_PROGRESS'").get(id);
  if (activeLog) {
    return res.status(400).json({ error: 'Vui lòng kết thúc thời gian làm việc trước khi báo cáo hoàn thành task' });
  }

  db.prepare(`
    UPDATE tasks SET status = 'FINISHED_BY_STAFF', updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(id);

  res.json({ message: 'Đã gửi báo cáo hoàn thành. Đang chờ Admin duyệt.' });
});

/**
 * PUT /api/tasks/:id/approve
 * Admin: Finalize task as DONE
 */
router.put('/:id/approve', authenticate, authorize('ADMIN'), (req, res) => {
  const db = req.app.get('db');
  const { id } = req.params;

  const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(id);
  if (!task) return res.status(404).json({ error: 'Không tìm thấy công việc' });

  db.prepare(`
    UPDATE tasks SET status = 'DONE', updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(id);

  res.json({ message: 'Đã duyệt hoàn thành công việc' });
});

/**
 * DELETE /api/tasks/:id
 */
router.delete('/:id', authenticate, authorize('ADMIN'), (req, res) => {
  const db = req.app.get('db');
  const { id } = req.params;

  // Check if task has worklogs
  const hasLogs = db.prepare('SELECT id FROM worklogs WHERE task_id = ?').get(id);
  if (hasLogs) {
    return res.status(400).json({ error: 'Không thể xóa công việc đã có nhật ký làm việc. Hãy chuyển sang trạng thái CANCELLED.' });
  }

  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  res.json({ message: 'Đã xóa công việc thành công' });
});

module.exports = router;
