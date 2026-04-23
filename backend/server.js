require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { initDB } = require('./db');

const app = express();
const server = http.createServer(app);

// 1. Middleware (Phải đặt đầu tiên)
app.use(cors());
app.use(express.json());

// 2. Health check
// file: backend/server.js

app.get('/api/health', async (req, res) => {
  try {
    const db = req.app.get('db');
    // Thử truy vấn 1 câu lệnh đơn giản
    await db.prepare('SELECT 1').get();

    res.json({
      status: 'ok',
      database: 'Connected',
      message: 'Backend & Database are running!',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      database: 'Disconnected',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});


// 3. Đăng ký các API Routes (Đưa ra ngoài để nhận ngay lập tức)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/worklogs', require('./routes/worklogs'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/project-items', require('./routes/project_items'));

// 4. Phục vụ file tĩnh Frontend
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// 5. Fallback cho Frontend
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    const indexPath = path.join(__dirname, '../frontend/dist/index.html');
    res.sendFile(indexPath, (err) => {
      // Nếu không tìm thấy file dist (khi chạy dev), trả về 404 cho route này
      if (err) res.status(404).send("Frontend build not found. This is normal in dev mode.");
    });
  }
});

// 6. Khởi tạo Database và Socket.io
async function startServer() {
  try {
    console.log('📦 Initializing Database...');
    const db = await initDB();
    app.set('db', db);
    console.log('✅ Database connected');

    const io = new Server(server, { cors: { origin: "*" } });
    app.set('io', io);

    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      console.log(`🚀 Server ready on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
  }
}

startServer();
