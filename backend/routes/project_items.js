const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { generateId } = require('../utils/helpers');

/**
 * GET /api/project-items
 * All authenticated users: List global categories/items
 */
router.get('/', authenticate, (req, res) => {
  const db = req.app.get('db');
  const items = db.prepare('SELECT * FROM project_items ORDER BY name ASC').all();
  res.json(items);
});

/**
 * POST /api/project-items
 * Admin: Create a new category/item
 */
router.post('/', authenticate, authorize('ADMIN'), (req, res) => {
  const db = req.app.get('db');
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Vui lòng nhập tên hạng mục' });
  }

  const id = generateId();
  try {
    db.prepare('INSERT INTO project_items (id, name, description) VALUES (?, ?, ?)')
      .run(id, name, description || '');
    
    const newItem = db.prepare('SELECT * FROM project_items WHERE id = ?').get(id);
    res.status(201).json(newItem);
  } catch (err) {
    res.status(500).json({ error: 'Không thể tạo hạng mục. Có thể tên đã tồn tại.' });
  }
});

/**
 * PUT /api/project-items/:id
 * Admin: Update category/item
 */
router.put('/:id', authenticate, authorize('ADMIN'), (req, res) => {
  const db = req.app.get('db');
  const { id } = req.params;
  const { name, description } = req.body;

  const item = db.prepare('SELECT id FROM project_items WHERE id = ?').get(id);
  if (!item) {
    return res.status(404).json({ error: 'Hạng mục không tồn tại' });
  }

  db.prepare(`
    UPDATE project_items SET name = COALESCE(?, name), description = COALESCE(?, description) WHERE id = ?
  `).run(name, description, id);

  const updated = db.prepare('SELECT * FROM project_items WHERE id = ?').get(id);
  res.json(updated);
});

/**
 * DELETE /api/project-items/:id
 * Admin: Delete category/item
 */
router.delete('/:id', authenticate, authorize('ADMIN'), (req, res) => {
  const db = req.app.get('db');
  const { id } = req.params;

  // Check if it's being used by any project
  const usage = db.prepare('SELECT project_id FROM project_item_mapping WHERE item_id = ? LIMIT 1').get(id);
  if (usage) {
    return res.status(400).json({ error: 'Không thể xóa hạng mục này vì đang được gán cho một số dự án' });
  }

  // Check if it's being used by any task
  const taskUsage = db.prepare('SELECT id FROM tasks WHERE project_item_id = ? LIMIT 1').get(id);
  if (taskUsage) {
    return res.status(400).json({ error: 'Không thể xóa hạng mục này vì đang có công việc liên kết' });
  }

  db.prepare('DELETE FROM project_items WHERE id = ?').run(id);
  res.json({ message: 'Đã xóa hạng mục thành công' });
});

module.exports = router;
