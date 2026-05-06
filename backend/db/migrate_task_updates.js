const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function migrate() {
  console.log('Starting migration for Tasks and Users...');
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'labor_management',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    // 1. Add location_type to tasks
    try {
      await pool.query("ALTER TABLE tasks ADD COLUMN location_type VARCHAR(20) NOT NULL DEFAULT 'WORKSHOP'");
      console.log('Added location_type to tasks');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('location_type already exists in tasks');
      else throw e;
    }

    // 2. Add target_shift_id to tasks
    try {
      await pool.query("ALTER TABLE tasks ADD COLUMN target_shift_id VARCHAR(50) NULL");
      console.log('Added target_shift_id to tasks');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('target_shift_id already exists in tasks');
      else throw e;
    }

    // 3. Add job_title to users
    try {
      await pool.query("ALTER TABLE users ADD COLUMN job_title VARCHAR(100) NULL");
      console.log('Added job_title to users');
      
      // Update existing users based on role
      await pool.query("UPDATE users SET job_title = 'Quản đốc' WHERE role = 'ADMIN'");
      await pool.query("UPDATE users SET job_title = 'Kế toán' WHERE role = 'ACCOUNTANT'");
      await pool.query("UPDATE users SET job_title = 'Thợ phụ' WHERE role = 'STAFF' AND job_title IS NULL");
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('job_title already exists in users');
      else throw e;
    }

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

migrate();
