const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function resetDatabase() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'labor_management',
    multipleStatements: true
  };

  console.log(`🔌 Connecting to local DB: ${config.database}...`);
  const connection = await mysql.createConnection(config);

  try {
    console.log('🗑 Dropping existing tables...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    const [tables] = await connection.query('SHOW TABLES');
    for (let table of tables) {
        const tableName = Object.values(table)[0];
        await connection.query(`DROP TABLE IF EXISTS \`${tableName}\``);
    }
    console.log('✅ All tables dropped.');

    console.log('🏗 Applying new schema from schema.sql...');
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await connection.query(schema);
    console.log('✅ New schema applied successfully.');

    console.log('🌱 Seeding sample data...');
    // 1. Seed Users
    const users = [
        ['admin-uuid-001', 'admin', 'admin123', 'System Administrator', 'Quản lý', 'ADMIN'],
        ['user-uuid-001', 'hiep', 'hiep123', 'Nguyễn Minh Hiệp', 'Kỹ thuật', 'STAFF'],
        ['user-uuid-002', 'lan', 'lan123', 'Trần Thị Lan', 'Kế toán', 'ACCOUNTANT'],
        ['user-uuid-003', 'dung', 'dung123', 'Lê Văn Dũng', 'Công nhân', 'STAFF']
    ];

    for (const u of users) {
        await connection.query(`
            INSERT INTO users (id, username, password_hash, full_name, job_title, role)
            VALUES (?, ?, ?, ?, ?, ?)
        `, u);
    }

    // 2. Seed some Attendance Records for the last 5 days
    const today = new Date();
    for (let i = 0; i < 5; i++) {
        const workDate = new Date();
        workDate.setDate(today.getDate() - i);
        const dateStr = workDate.toISOString().split('T')[0];

        // Seed check-in for hiep and dung
        const attendanceData = [
            ['user-uuid-001', '08:00:00', '17:00:00', 480, 'ON_TIME', 'WORKSHOP'],
            ['user-uuid-003', '08:15:00', '17:30:00', 495, 'LATE', 'SITE']
        ];

        for (const [uid, checkIn, checkOut, mins, status, loc] of attendanceData) {
            const id = `att-${uid}-${dateStr}`;
            await connection.query(`
                INSERT INTO attendance_records 
                (id, user_id, work_date, check_in_at, check_out_at, total_work_minutes, regular_minutes, status, location_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                id, uid, dateStr, 
                `${dateStr} ${checkIn}`, 
                `${dateStr} ${checkOut}`, 
                mins, mins, status, loc
            ]);
        }
    }
    
    console.log('🚀 Local database is READY with sample data.');
  } catch (err) {
    console.error('❌ Database reset failed:', err.message);
  } finally {
    await connection.end();
  }
}

resetDatabase();
