const mysql = require('mysql2/promise');
require('dotenv').config();

async function debug() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  const [report] = await connection.execute(`
    SELECT ar.id, ar.user_id, ar.check_in_at as check_in, ar.check_out_at as check_out, 
           ar.total_work_minutes / 60.0 as duration_hours, ar.late_minutes, ar.overtime_minutes,
           ar.status, u.full_name
    FROM attendance_records ar
    JOIN users u ON ar.user_id = u.id
    ORDER BY ar.check_in_at DESC
  `);

  console.log('Attendance Report Data:');
  console.log(JSON.stringify(report, null, 2));

  const summary = report.reduce((sum, item) => {
      const val = parseFloat(item.duration_hours) || 0;
      console.log(`Adding ${item.duration_hours} (parsed: ${val}, type: ${typeof item.duration_hours}) to sum ${sum}`);
      return sum + val;
  }, 0);

  console.log('Total Hours Calculated:', summary);
  
  await connection.end();
}

debug();
