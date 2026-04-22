require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { initDB } = require('./db');

const app = express();
const server = http.createServer(app);

// Middleware cơ bản
app.use(cors());
app.use(express.json());

// Kiểm tra sức khỏe (Health check)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running!', timestamp: new Date().toISOString() });
});

// Phục vụ giao diện Frontend
app.use(express.static(path.join(__dirname, '../frontend/dist')));

async function startServer() {
  try {
    const db = await initDB();
    app.set('db', db);

    // Socket.io
    const io = new Server(server, { cors: { origin: "*" } });
    app.set('io', io);

    // Đăng ký Routes
    app.use('/api/auth', require('./routes/auth'));
    app.use('/api/users', require('./routes/users'));
    app.use('/api/projects', require('./routes/projects'));
    app.use('/api/tasks', require('./routes/tasks'));
    app.use('/api/worklogs', require('./routes/worklogs'));
    app.use('/api/attendance', require('./routes/attendance'));
    app.use('/api/project-items', require('./routes/project_items'));

    // Trả về Frontend cho các đường dẫn khác
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
      }
    });

    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      console.log(`🚀 Server ready on port ${PORT}`);
    });

  } catch (err) {
    console.error('Failed to start server:', err);
  }
}

startServer();
