require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function migrateQuotations() {
  console.log('🚀 Starting Quotation Schema Migration...');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  try {
    const schemaPath = path.join(__dirname, 'quotation_schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('  - Executing quotation_schema.sql...');
    await connection.query(schemaSql);
    
    console.log('✅ Quotation schema migration completed successfully!');
  } catch (err) {
    console.error('❌ Error during quotation schema migration:', err);
  } finally {
    await connection.end();
  }
}

migrateQuotations();
