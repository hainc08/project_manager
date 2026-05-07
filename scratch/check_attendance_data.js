const path = require('path');
const mysql = require(path.join(__dirname, '../backend/node_modules/mysql2/promise'));
require(path.join(__dirname, '../backend/node_modules/dotenv')).config({ path: path.join(__dirname, '../backend/.env') });

async function checkData() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'labor_management'
  });

  try {
    console.log('--- Attendance Records (Last 10) ---');
    const [rows] = await connection.query('SELECT * FROM attendance_records ORDER BY check_in_at DESC LIMIT 10');
    console.table(rows);

    console.log('--- Row Count in attendance_records ---');
    const [count] = await connection.query('SELECT COUNT(*) as total FROM attendance_records');
    console.log('Total records:', count[0].total);

    console.log('--- Filter Test (2026-05-02 to 2026-05-08) ---');
    const [filtered] = await connection.query(
      'SELECT id, user_id, work_date, check_in_at, status FROM attendance_records WHERE check_in_at >= "2026-05-02" AND check_in_at <= "2026-05-08 23:59:59"'
    );
    console.log('Filtered records count:', filtered.length);
    if (filtered.length > 0) console.table(filtered);

    console.log('--- Legacy Attendance Data (Check if sync is needed) ---');
    try {
        const [oldRows] = await connection.query('SELECT * FROM attendance LIMIT 5');
        console.table(oldRows);
        const [oldCount] = await connection.query('SELECT COUNT(*) as total FROM attendance');
        console.log('Total legacy records:', oldCount[0].total);
    } catch(e) {
        console.log('attendance table might be gone or inaccessible');
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await connection.end();
  }
}

checkData().catch(console.error);
