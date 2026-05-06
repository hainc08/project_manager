const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function seedShifts() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'labor_management',
  });

  try {
    console.log('Seeding Shift Templates...');
    
    // Ca 1
    await pool.query(`
      INSERT INTO shift_templates (id, code, name, start_time, end_time, base_multiplier, color)
      VALUES ('st_ca1', 'CA1', 'Ca 1', '07:30:00', '11:30:00', 1.0, 'blue')
      ON DUPLICATE KEY UPDATE name='Ca 1', start_time='07:30:00', end_time='11:30:00';
    `);

    // Ca 2
    await pool.query(`
      INSERT INTO shift_templates (id, code, name, start_time, end_time, base_multiplier, color)
      VALUES ('st_ca2', 'CA2', 'Ca 2', '13:00:00', '17:00:00', 1.0, 'green')
      ON DUPLICATE KEY UPDATE name='Ca 2', start_time='13:00:00', end_time='17:00:00';
    `);

    // Tăng ca
    await pool.query(`
      INSERT INTO shift_templates (id, code, name, start_time, end_time, base_multiplier, color)
      VALUES ('st_ot', 'OT', 'Tăng ca', '17:30:00', '21:00:00', 1.5, 'amber')
      ON DUPLICATE KEY UPDATE name='Tăng ca', start_time='17:30:00', end_time='21:00:00', base_multiplier=1.5;
    `);

    console.log('Shift Templates seeded successfully!');
  } catch (err) {
    console.error('Seed failed:', err);
  } finally {
    await pool.end();
  }
}

seedShifts();
