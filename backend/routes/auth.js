const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

/**
 * POST /api/auth/login
 * TASK 01: User Authentication
 */
router.post('/login', (req, res) => {
  const db = req.app.get('db');
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
  }

  const isValid = bcrypt.compareSync(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
  }

  // Generate JWT
  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      full_name: user.full_name
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  // Return user profile without password
  const { password_hash, ...userProfile } = user;

  res.json({
    token,
    user: userProfile
  });
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
const { authenticate } = require('../middleware/auth');
router.get('/me', authenticate, (req, res) => {
  const db = req.app.get('db');
  const user = db.prepare('SELECT id, username, full_name, role, contract_type, standard_rate, billing_rate FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User không tồn tại' });
  }
  res.json(user);
});

module.exports = router;
