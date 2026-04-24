const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { generateId } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * GET /api/projects
 * All authenticated users: List projects with categories
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const db = req.app.get('db');
    
    // Get all projects
    const projects = await db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
    
    // For each project, fetch its items
    const projectsWithItems = [];
    for (const p of projects) {
      const items = await db.prepare(`
        SELECT pi.* FROM project_items pi
        JOIN project_item_mapping pim ON pi.id = pim.item_id
        WHERE pim.project_id = ?
      `).all(p.id);
      projectsWithItems.push({ ...p, items });
    }

    res.json(projectsWithItems);
  } catch (err) {
    logger.error('PROJECTS', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * GET /api/projects/:id
 * Get single project with categories
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const db = req.app.get('db');
    const project = await db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Dự án không tồn tại' });
    }

    const items = await db.prepare(`
      SELECT pi.* FROM project_items pi
      JOIN project_item_mapping pim ON pi.id = pim.item_id
      WHERE pim.project_id = ?
    `).all(project.id);

    res.json({ ...project, items });
  } catch (err) {
    logger.error('PROJECTS', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * POST /api/projects
 * Admin: Create project with categories
 */
router.post('/', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const db = req.app.get('db');
    const { project_name, status, item_ids } = req.body;

    if (!project_name) {
      return res.status(400).json({ error: 'Vui lòng nhập tên dự án' });
    }

    const id = generateId();
    
    // Use transaction to ensure data integrity
    const createProject = db.transaction(async (tx, pId, name, pStatus, items) => {
      await tx.prepare('INSERT INTO projects (id, project_name, status) VALUES (?, ?, ?)')
        .run(pId, name, pStatus || 'ACTIVE');

      if (items && Array.isArray(items)) {
        const insertMapping = tx.prepare('INSERT INTO project_item_mapping (project_id, item_id) VALUES (?, ?)');
        for (const itemId of items) {
          await insertMapping.run(pId, itemId);
        }
      }
    });

    await createProject(id, project_name, status, item_ids);

    const project = await db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    const items = await db.prepare(`
      SELECT pi.* FROM project_items pi
      JOIN project_item_mapping pim ON pi.id = pim.item_id
      WHERE pim.project_id = ?
    `).all(id);

    res.status(201).json({ ...project, items });
  } catch (err) {
    logger.error('PROJECTS', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * PUT /api/projects/:id
 * Admin: Update project and categories
 */
router.put('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const db = req.app.get('db');
    const { id } = req.params;
    const { project_name, status, item_ids } = req.body;

    const project = await db.prepare('SELECT id FROM projects WHERE id = ?').get(id);
    if (!project) {
      return res.status(404).json({ error: 'Dự án không tồn tại' });
    }

    const updateProject = db.transaction(async (tx, pId, name, pStatus, items) => {
      await tx.prepare(`
        UPDATE projects SET project_name = COALESCE(?, project_name), status = COALESCE(?, status) WHERE id = ?
      `).run(name, pStatus, pId);

      if (items && Array.isArray(items)) {
        // Clear existing mappings and re-insert
        await tx.prepare('DELETE FROM project_item_mapping WHERE project_id = ?').run(pId);
        const insertMapping = tx.prepare('INSERT INTO project_item_mapping (project_id, item_id) VALUES (?, ?)');
        for (const itemId of items) {
          await insertMapping.run(pId, itemId);
        }
      }
    });

    await updateProject(id, project_name, status, item_ids);

    const updated = await db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    const items = await db.prepare(`
      SELECT pi.* FROM project_items pi
      JOIN project_item_mapping pim ON pi.id = pim.item_id
      WHERE pim.project_id = ?
    `).all(id);

    res.json({ ...updated, items });
  } catch (err) {
    logger.error('PROJECTS', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * DELETE /api/projects/:id
 * Admin: Delete project
 */
router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const db = req.app.get('db');
    const { id } = req.params;

    // Check for active worklogs
    const activeLog = await db.prepare("SELECT id FROM worklogs WHERE project_id = ? AND status = 'IN_PROGRESS'").get(id);
    if (activeLog) {
      return res.status(400).json({ error: 'Không thể xóa dự án có công việc đang thực hiện' });
    }

    await db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    res.json({ message: 'Đã xóa dự án thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
