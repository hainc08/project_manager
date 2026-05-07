require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { initDB } = require('./db');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);

// 1. Middleware (Phải đặt đầu tiên)
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const userStr = req.user ? `[User:${req.user.id}]` : '[Guest]';
    logger.info('HTTP', `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms ${userStr}`);
  });
  next();
});

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
app.use('/api/shift-management', require('./routes/shift_management'));


// 4. Phục vụ file tĩnh Frontend
app.use(express.static(path.join(__dirname, '../frontend/dist')));


// 5. Fallback cho Frontend
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    const indexPath = path.join(__dirname, '../frontend/dist/index.html');

    res.sendFile(indexPath, (err) => {
      // Nếu không tìm thấy file dist (khi chạy dev), trả về 404 cho route này
      if (err) res.status(404).send("Frontend build not found. Please run 'npm run build' in the frontend directory.");
    });
  }
});

// 6. Khởi tạo Database và Socket.io
async function startServer() {
  try {
    console.log('📦 Initializing Database...');
    const db = await initDB();
    app.set('db', db);
    console.log(`✅ Database connected to: ${process.env.DB_NAME || 'SQLite'} on ${process.env.DB_HOST || 'local'}`);

    const io = new Server(server, { cors: { origin: "*" } });
    app.set('io', io);

    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      logger.info('SYSTEM', `🚀 Server ready on port ${PORT}`);
    });

    // Auto-checkout cron job
    setInterval(async () => {
      try {
        const autoCheckOutRecords = await db.prepare(`
          SELECT ar.id, ar.check_in_at, si.end_at, st.break_minutes
          FROM attendance_records ar
          JOIN shift_instances si ON ar.shift_instance_id = si.id
          JOIN shift_templates st ON si.shift_template_id = st.id
          WHERE ar.check_in_at IS NOT NULL 
            AND ar.check_out_at IS NULL
            AND NOW() >= si.end_at
        `).all();

        for (const record of autoCheckOutRecords) {
          const checkIn   = new Date(record.check_in_at);
          const shiftEnd  = new Date(record.end_at);
          const breakMin  = record.break_minutes || 0;

          const totalMin   = Math.max(0, Math.floor((shiftEnd - checkIn) / 60000) - breakMin);
          const regularMin = totalMin;
          const otMin      = 0;

          await db.prepare(`
            UPDATE attendance_records
            SET check_out_at = ?, total_work_minutes = ?, regular_minutes = ?, overtime_minutes = ?,
                payroll_status = 'DRAFT'
            WHERE id = ?
          `).run(record.end_at, totalMin, regularMin, otMin, record.id);
          
          logger.info('AUTO_CHECKOUT', `Auto checked out record ${record.id} at shift end ${record.end_at}`);
        }
      } catch (e) {
        logger.error('CRON', 'Auto checkout failed: ' + e.message);
      }
    }, 60 * 1000); // runs every 1 minute

  } catch (err) {
    logger.error('SYSTEM', `❌ Failed to start server: ${err.message}`);
    process.exit(1);
  }
}

// Global Error Handler
app.use((err, req, res, next) => {
  logger.error('EXCEPTION', err);
  res.status(500).json({ error: 'Lỗi server nội bộ' });
});

startServer();
