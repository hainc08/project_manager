const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

/**
 * POST /api/auth/login
 * TASK 01: User Authentication
 */
router.post('/login', async (req, res) => {
  try {
    const db = req.app.get('db');
    const { username, password } = req.body;

    console.log('--- LOGIN ATTEMPT ---');
    console.log('Username nhận được:', username);
    const user = await db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user) {
      console.log('=> KHÔNG tìm thấy user trong Database');
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }
    console.log('=> Đã tìm thấy user:', user.username);
    console.log('=> Hash trong DB:', user.password_hash);
    const isValid = bcrypt.compareSync(password, user.password_hash);
    console.log('=> Kết quả so khớp mật khẩu:', isValid);
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
const { authenticate } = require('../middleware/auth');
router.get('/me', authenticate, async (req, res) => {
  try {
    const db = req.app.get('db');
    const user = await db.prepare('SELECT id, username, full_name, role, contract_type, standard_rate, billing_rate FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User không tồn tại' });
    }
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
