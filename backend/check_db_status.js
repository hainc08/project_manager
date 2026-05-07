const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: 'c:/Users/admin/workspace/100.web_minhhiep/300.app/backend/.env' });

async function check() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });

    console.log('--- DATABASE INFO ---');
    console.log('Host:', process.env.DB_HOST);
    console.log('Database:', process.env.DB_NAME);

    const [users] = await connection.execute('SELECT id, full_name FROM users');
    console.log('\n--- ALL USERS ---');
    users.forEach(u => console.log(`[${u.id}] ${u.full_name}`));

    const [worklogs] = await connection.execute(`
      SELECT w.id, w.user_id, u.full_name, p.project_name 
      FROM worklogs w 
      JOIN users u ON w.user_id = u.id 
      JOIN projects p ON w.project_id = p.id
      WHERE w.status = 'IN_PROGRESS'
    `);
    console.log('\n--- ACTIVE WORKLOGS ---');
    worklogs.forEach(w => console.log(`[WL:${w.id}] User: ${w.full_name} | Project: ${w.project_name}`));

    await connection.end();
  } catch (err) {
    console.error('Check Error:', err);
  }
}

check();
