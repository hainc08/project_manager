const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { generateId } = require('../utils/helpers');

/**
 * GET /api/projects
 * All authenticated users: List projects with categories
 */
router.get('/', authenticate, (req, res) => {
  const db = req.app.get('db');
  
  // Get all projects
  const projects = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
  
  // For each project, fetch its items
  const projectsWithItems = projects.map(p => {
    const items = db.prepare(`
      SELECT pi.* FROM project_items pi
      JOIN project_item_mapping pim ON pi.id = pim.item_id
      WHERE pim.project_id = ?
    `).all(p.id);
    return { ...p, items };
  });

  res.json(projectsWithItems);
});

/**
 * GET /api/projects/:id
 * Get single project with categories
 */
router.get('/:id', authenticate, (req, res) => {
  const db = req.app.get('db');
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Dự án không tồn tại' });
  }

  const items = db.prepare(`
    SELECT pi.* FROM project_items pi
    JOIN project_item_mapping pim ON pi.id = pim.item_id
    WHERE pim.project_id = ?
  `).all(project.id);

  res.json({ ...project, items });
});

/**
 * POST /api/projects
 * Admin: Create project with categories
 */
router.post('/', authenticate, authorize('ADMIN'), (req, res) => {
  const db = req.app.get('db');
  const { project_name, status, item_ids } = req.body;

  if (!project_name) {
    return res.status(400).json({ error: 'Vui lòng nhập tên dự án' });
  }

  const id = generateId();
  
  // Use transaction to ensure data integrity
  const createProject = db.transaction((pId, name, pStatus, items) => {
    db.prepare('INSERT INTO projects (id, project_name, status) VALUES (?, ?, ?)')
      .run(pId, name, pStatus || 'ACTIVE');

    if (items && Array.isArray(items)) {
      const insertMapping = db.prepare('INSERT INTO project_item_mapping (project_id, item_id) VALUES (?, ?)');
      for (const itemId of items) {
        insertMapping.run(pId, itemId);
      }
    }
  });

  createProject(id, project_name, status, item_ids);

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  const items = db.prepare(`
    SELECT pi.* FROM project_items pi
    JOIN project_item_mapping pim ON pi.id = pim.item_id
    WHERE pim.project_id = ?
  `).all(id);

  res.status(201).json({ ...project, items });
});

/**
 * PUT /api/projects/:id
 * Admin: Update project and categories
 */
router.put('/:id', authenticate, authorize('ADMIN'), (req, res) => {
  const db = req.app.get('db');
  const { id } = req.params;
  const { project_name, status, item_ids } = req.body;

  const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(id);
  if (!project) {
    return res.status(404).json({ error: 'Dự án không tồn tại' });
  }

  const updateProject = db.transaction((pId, name, pStatus, items) => {
    db.prepare(`
      UPDATE projects SET project_name = COALESCE(?, project_name), status = COALESCE(?, status) WHERE id = ?
    `).run(name, pStatus, pId);

    if (items && Array.isArray(items)) {
      // Clear existing mappings and re-insert
      db.prepare('DELETE FROM project_item_mapping WHERE project_id = ?').run(pId);
      const insertMapping = db.prepare('INSERT INTO project_item_mapping (project_id, item_id) VALUES (?, ?)');
      for (const itemId of items) {
        insertMapping.run(pId, itemId);
      }
    }
  });

  updateProject(id, project_name, status, item_ids);

  const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  const items = db.prepare(`
    SELECT pi.* FROM project_items pi
    JOIN project_item_mapping pim ON pi.id = pim.item_id
    WHERE pim.project_id = ?
  `).all(id);

  res.json({ ...updated, items });
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
