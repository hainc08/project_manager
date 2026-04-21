const Database = require('better-sqlite3');
const db = new Database('backend/db/database.sqlite');
try {
  const query = `
    SELECT t.*, p.project_name, u.full_name as assignee_name, pi.name as project_item_name
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    JOIN users u ON t.assigned_to = u.id
    LEFT JOIN project_items pi ON t.project_item_id = pi.id
    WHERE 1=1
  `;
  const tasks = db.prepare(query).all();
  console.log('Tasks count:', tasks.length);
} catch (err) {
  console.error('SQL Error:', err.message);
}
db.close();
