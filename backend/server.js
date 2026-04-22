require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const { initDB } = require('./db');

// Initialize Express
const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'https://project-manager-gilt-three.vercel.app'
].filter(Boolean);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// Make io accessible to routes
app.set('io', io);

// Initialize Database inside an async function
async function startServer() {
  try {
    const db = await initDB();
    app.set('db', db);

    // Run seed (only if users table is empty and in development)
    const userCount = await db.prepare('SELECT COUNT(*) as count FROM users').get();
    if (userCount && userCount.count === 0 && process.env.NODE_ENV === 'development') {
      // We need to hash passwords properly for seed data
      const bcrypt = require('bcryptjs');
      const hash = bcrypt.hashSync('123456', 10);
      
      const seedTransaction = db.transaction(async (tx) => {
        // Users
        await tx.prepare(`INSERT IGNORE INTO users (id, username, password_hash, full_name, role, contract_type, standard_rate, billing_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run('u1', 'admin', hash, 'Nguyen Van Admin', 'ADMIN', 'FULLTIME', 150000, 300000);
        await tx.prepare(`INSERT IGNORE INTO users (id, username, password_hash, full_name, role, contract_type, standard_rate, billing_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run('u2', 'accountant', hash, 'Tran Thi Ke Toan', 'ACCOUNTANT', 'FULLTIME', 120000, 200000);
        await tx.prepare(`INSERT IGNORE INTO users (id, username, password_hash, full_name, role, contract_type, standard_rate, billing_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run('u3', 'staff1', hash, 'Le Van Nhan Vien', 'STAFF', 'FULLTIME', 80000, 150000);
        await tx.prepare(`INSERT IGNORE INTO users (id, username, password_hash, full_name, role, contract_type, standard_rate, billing_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run('u4', 'staff2', hash, 'Pham Thi Cong Nhan', 'STAFF', 'PARTTIME', 60000, 120000);

        // Projects
        await tx.prepare(`INSERT IGNORE INTO projects (id, project_name, status) VALUES (?, ?, ?)`).run('p1', 'Website Redesign - Kosumi', 'ACTIVE');
        await tx.prepare(`INSERT IGNORE INTO projects (id, project_name, status) VALUES (?, ?, ?)`).run('p2', 'Mobile App Development', 'ACTIVE');
        await tx.prepare(`INSERT IGNORE INTO projects (id, project_name, status) VALUES (?, ?, ?)`).run('p3', 'Database Migration', 'ON_HOLD');

        // Sample worklogs
        await tx.prepare(`INSERT IGNORE INTO worklogs (id, user_id, project_id, task_content, start_time, end_time, duration_hours, actual_cost, actual_revenue, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run('w1', 'u3', 'p1', 'Thiết kế trang chủ', '2026-04-10 08:00:00', '2026-04-10 12:00:00', 4.00, 320000, 600000, 'DONE');
        await tx.prepare(`INSERT IGNORE INTO worklogs (id, user_id, project_id, task_content, start_time, end_time, duration_hours, actual_cost, actual_revenue, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run('w2', 'u3', 'p1', 'Code responsive layout', '2026-04-10 13:00:00', '2026-04-10 17:30:00', 4.50, 360000, 675000, 'DONE');
        await tx.prepare(`INSERT IGNORE INTO worklogs (id, user_id, project_id, task_content, start_time, end_time, duration_hours, actual_cost, actual_revenue, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run('w3', 'u4', 'p2', 'Setup React Native project', '2026-04-11 09:00:00', '2026-04-11 14:00:00', 5.00, 300000, 600000, 'DONE');
        await tx.prepare(`INSERT IGNORE INTO worklogs (id, user_id, project_id, task_content, start_time, end_time, duration_hours, actual_cost, actual_revenue, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run('w4', 'u3', 'p2', 'Thiết kế UI Login', '2026-04-12 08:30:00', '2026-04-12 11:30:00', 3.00, 240000, 450000, 'DONE');
        await tx.prepare(`INSERT IGNORE INTO worklogs (id, user_id, project_id, task_content, start_time, end_time, duration_hours, actual_cost, actual_revenue, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run('w5', 'u4', 'p1', 'Tối ưu hình ảnh', '2026-04-12 13:00:00', '2026-04-12 16:00:00', 3.00, 180000, 360000, 'DONE');
        await tx.prepare(`INSERT IGNORE INTO worklogs (id, user_id, project_id, task_content, start_time, end_time, duration_hours, actual_cost, actual_revenue, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run('w6', 'u3', 'p1', 'Kiểm thử cross-browser', '2026-04-13 08:00:00', '2026-04-13 12:00:00', 4.00, 320000, 600000, 'DONE');
        await tx.prepare(`INSERT IGNORE INTO worklogs (id, user_id, project_id, task_content, start_time, end_time, duration_hours, actual_cost, actual_revenue, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run('w7', 'u4', 'p2', 'Phát triển màn hình Dashboard', '2026-04-13 09:00:00', '2026-04-13 15:00:00', 6.00, 360000, 720000, 'DONE');
        await tx.prepare(`INSERT IGNORE INTO worklogs (id, user_id, project_id, task_content, start_time, end_time, duration_hours, actual_cost, actual_revenue, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run('w8', 'u3', 'p2', 'API integration', '2026-04-14 08:00:00', '2026-04-14 16:00:00', 8.00, 640000, 1200000, 'DONE');
      });

      await seedTransaction();
      console.log('✅ Database seeded with demo data');
    }

    // Routes
    app.use('/api/auth', require('./routes/auth'));
    app.use('/api/users', require('./routes/users'));
    app.use('/api/projects', require('./routes/projects'));
    app.use('/api/tasks', require('./routes/tasks'));
    app.use('/api/worklogs', require('./routes/worklogs'));
    app.use('/api/attendance', require('./routes/attendance'));
    app.use('/api/project-items', require('./routes/project_items'));

    // Health check
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Socket.io connection
    io.on('connection', (socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);
      
      socket.on('disconnect', () => {
        console.log(`❌ Client disconnected: ${socket.id}`);
      });
    });

    // Start server
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📡 Socket.io ready`);
    });

  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
