const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function testImport() {
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
    const sql = fs.readFileSync(path.join(__dirname, 'production_ready_dump.sql'), 'utf8');
    console.log('⏳ Running SQL dump locally...');
    await connection.query(sql);
    console.log('✅ Local import SUCCESSFUL! Schema and data are valid.');
    
    // Check some data
    const [rows] = await connection.query('SELECT COUNT(*) as count FROM attendance_records');
    console.log(`📊 Current records in attendance_records: ${rows[0].count}`);
    
  } catch (err) {
    console.error('❌ Local import FAILED:', err.message);
    if (err.sql) {
        console.error('Offending SQL snippet:', err.sql.substring(0, 200));
    }
  } finally {
    await connection.end();
  }
}

testImport();
