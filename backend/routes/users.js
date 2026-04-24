const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { authenticate, authorize } = require('../middleware/auth');
const { generateId } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * GET /api/users
 * Admin: List all users
 */
router.get('/', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const db = req.app.get('db');
    const users = await db.prepare(
      'SELECT id, username, full_name, role, contract_type, standard_rate, billing_rate, created_at FROM users ORDER BY created_at DESC'
    ).all();
    res.json(users);
  } catch (err) {
    logger.error('USERS', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * POST /api/users
 * Admin: Create new user
 */
router.post('/', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const db = req.app.get('db');
    const { username, password, full_name, role, contract_type, standard_rate, billing_rate } = req.body;

    if (!username || !password || !full_name || !role) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }

    // Check if username exists
    const existing = await db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(409).json({ error: 'Tên đăng nhập đã tồn tại' });
    }

    const id = generateId();
    const password_hash = bcrypt.hashSync(password, 10);

    await db.prepare(`
      INSERT INTO users (id, username, password_hash, full_name, role, contract_type, standard_rate, billing_rate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, username, password_hash, full_name, role, contract_type || 'FULLTIME', standard_rate || 0, billing_rate || 0);

    const user = await db.prepare(
      'SELECT id, username, full_name, role, contract_type, standard_rate, billing_rate, created_at FROM users WHERE id = ?'
    ).get(id);

    res.status(201).json(user);
  } catch (err) {
    logger.error('USERS', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * PUT /api/users/:id
 * Admin: Update user info
 */
router.put('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const db = req.app.get('db');
    const { id } = req.params;
    const { full_name, role, contract_type, standard_rate, billing_rate } = req.body;

    const user = await db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User không tồn tại' });
    }

    await db.prepare(`
      UPDATE users SET full_name = COALESCE(?, full_name), role = COALESCE(?, role),
      contract_type = COALESCE(?, contract_type), standard_rate = COALESCE(?, standard_rate),
      billing_rate = COALESCE(?, billing_rate) WHERE id = ?
    `).run(full_name, role, contract_type, standard_rate, billing_rate, id);

    const updated = await db.prepare(
      'SELECT id, username, full_name, role, contract_type, standard_rate, billing_rate, created_at FROM users WHERE id = ?'
    ).get(id);

    res.json(updated);
  } catch (err) {
    logger.error('USERS', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * PUT /api/users/:id/rate
 * TASK 03: Admin Set Rate
 */
router.put('/:id/rate', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const db = req.app.get('db');
    const { id } = req.params;
    const { standard_rate, billing_rate } = req.body;

    if (standard_rate == null) {
      return res.status(400).json({ error: 'Vui lòng nhập chi phí lương' });
    }

    const user = await db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User không tồn tại' });
    }

    await db.prepare('UPDATE users SET standard_rate = ?, billing_rate = COALESCE(?, billing_rate) WHERE id = ?')
      .run(standard_rate, billing_rate || 0, id);

    const updated = await db.prepare(
      'SELECT id, username, full_name, role, contract_type, standard_rate, billing_rate FROM users WHERE id = ?'
    ).get(id);

    res.json(updated);
  } catch (err) {
    logger.error('USERS', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * DELETE /api/users/:id
 * Admin: Delete user
 */
router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const db = req.app.get('db');
    const { id } = req.params;

    // Prevent self-delete
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Không thể xóa chính mình' });
    }

    const user = await db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User không tồn tại' });
    }

    await db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ message: 'Đã xóa user thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
