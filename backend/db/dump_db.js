const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function dumpDB() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'labor_management',
    multipleStatements: true
  };

  console.log(`🚀 Starting dump for database: ${config.database}...`);
  const connection = await mysql.createConnection(config);

  try {
    let sqlDump = `-- Antigravity DB Dump\n-- Date: ${new Date().toISOString()}\n\nSET FOREIGN_KEY_CHECKS=0;\n\n`;

    // Get all tables
    const [tables] = await connection.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);

    for (const tableName of tableNames) {
      if (tableName === 'attendance') continue; // Skip legacy table if requested

      console.log(`📦 Dumping table: ${tableName}...`);
      
      // Get Create Table statement
      const [createRes] = await connection.query(`SHOW CREATE TABLE \`${tableName}\``);
      const createSql = createRes[0]['Create Table'];
      sqlDump += `DROP TABLE IF EXISTS \`${tableName}\`;\n${createSql};\n\n`;

      // Get Data
      const [rows] = await connection.query(`SELECT * FROM \`${tableName}\``);
      if (rows.length > 0) {
        const columns = Object.keys(rows[0]);
        const values = rows.map(row => {
          return '(' + columns.map(col => {
            const val = row[col];
            if (val === null) return 'NULL';
            if (typeof val === 'number') return val;
            if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
            return `'${val.toString().replace(/'/g, "''")}'`;
          }).join(', ') + ')';
        }).join(',\n');

        sqlDump += `INSERT INTO \`${tableName}\` (\`${columns.join('`, `')}\`) VALUES\n${values};\n\n`;
      }
    }

    sqlDump += 'SET FOREIGN_KEY_CHECKS=1;\n';

    const outputPath = path.join(__dirname, 'production_ready_dump.sql');
    fs.writeFileSync(outputPath, sqlDump);
    console.log(`✅ Dump completed! File saved at: ${outputPath}`);

  } catch (err) {
    console.error('❌ Dump failed:', err);
  } finally {
    await connection.end();
  }
}

dumpDB();
