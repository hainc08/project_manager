const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { generateId } = require('../utils/helpers');

/**
 * GET /api/projects
 * All authenticated users: List projects
 */
router.get('/', authenticate, (req, res) => {
  const db = req.app.get('db');
  const projects = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
  res.json(projects);
});

/**
 * GET /api/projects/:id
 * Get single project
 */
router.get('/:id', authenticate, (req, res) => {
  const db = req.app.get('db');
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Dự án không tồn tại' });
  }
  res.json(project);
});

/**
 * POST /api/projects
 * Admin: Create project
 */
router.post('/', authenticate, authorize('ADMIN'), (req, res) => {
  const db = req.app.get('db');
  const { project_name, status } = req.body;

  if (!project_name) {
    return res.status(400).json({ error: 'Vui lòng nhập tên dự án' });
  }

  const id = generateId();
  db.prepare('INSERT INTO projects (id, project_name, status) VALUES (?, ?, ?)')
    .run(id, project_name, status || 'ACTIVE');

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  res.status(201).json(project);
});

/**
 * PUT /api/projects/:id
 * Admin: Update project
 */
router.put('/:id', authenticate, authorize('ADMIN'), (req, res) => {
  const db = req.app.get('db');
  const { id } = req.params;
  const { project_name, status } = req.body;

  const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(id);
  if (!project) {
    return res.status(404).json({ error: 'Dự án không tồn tại' });
  }

  db.prepare(`
    UPDATE projects SET project_name = COALESCE(?, project_name), status = COALESCE(?, status) WHERE id = ?
  `).run(project_name, status, id);

  const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  res.json(updated);
});

/**
 * DELETE /api/projects/:id
 * Admin: Delete project
 */
router.delete('/:id', authenticate, authorize('ADMIN'), (req, res) => {
  const db = req.app.get('db');
  const { id } = req.params;

  // Check for active worklogs
  const activeLog = db.prepare("SELECT id FROM worklogs WHERE project_id = ? AND status = 'IN_PROGRESS'").get(id);
  if (activeLog) {
    return res.status(400).json({ error: 'Không thể xóa dự án có công việc đang thực hiện' });
  }

  db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  res.json({ message: 'Đã xóa dự án thành công' });
});

module.exports = router;
