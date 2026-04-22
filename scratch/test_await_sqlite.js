const Database = require('better-sqlite3');
const db = new Database(':memory:');

db.exec('CREATE TABLE users (id INT, name TEXT)');
db.prepare('INSERT INTO users VALUES (?, ?)').run(1, 'Alice');

async function test() {
  const users = await db.prepare('SELECT * FROM users').all();
  console.log(users);
}

test();
