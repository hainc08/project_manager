const path = require('path');
const mysql = require(path.join(__dirname, '../backend/node_modules/mysql2/promise'));
require(path.join(__dirname, '../backend/node_modules/dotenv')).config({ path: path.join(__dirname, '../backend/.env') });

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'labor_management'
  });

  try {
    console.log('Checking shift_templates...');
    const [cols1] = await connection.query('SHOW COLUMNS FROM shift_templates LIKE "location_type"');
    if (cols1.length === 0) {
        console.log('Adding location_type to shift_templates...');
        await connection.query('ALTER TABLE shift_templates ADD COLUMN location_type VARCHAR(20) NOT NULL DEFAULT "WORKSHOP"');
    }

    console.log('Checking attendance_records...');
    const [cols2] = await connection.query('SHOW COLUMNS FROM attendance_records LIKE "location_type"');
    if (cols2.length === 0) {
        console.log('Adding location_type to attendance_records...');
        await connection.query('ALTER TABLE attendance_records ADD COLUMN location_type VARCHAR(20) NOT NULL DEFAULT "WORKSHOP" AFTER status');
    }

    console.log('Migration complete!');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await connection.end();
  }
}

migrate().catch(console.error);
