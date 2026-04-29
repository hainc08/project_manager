require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function applySchema() {
  console.log('🚀 Applying Shift Management Schema...');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'shift_management_schema.sql'), 'utf8');
    await connection.query(schemaSql);
    console.log('✅ Schema applied successfully!');
  } catch (err) {
    console.error('❌ Error applying schema:', err.message);
  } finally {
    await connection.end();
  }
}

applySchema();
