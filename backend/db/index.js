const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

class MySQLWrapper {
  constructor(pool) {
    this.pool = pool;
  }

  prepare(sql) {
    return {
      all: async (...params) => {
        const [rows] = await this.pool.execute(sql, params);
        return rows;
      },
      get: async (...params) => {
        const [rows] = await this.pool.execute(sql, params);
        return rows[0];
      },
      run: async (...params) => {
        const [result] = await this.pool.execute(sql, params);
        return result;
      }
    };
  }

  // Support for transactions
  transaction(fn) {
    return async (...args) => {
      const connection = await this.pool.getConnection();
      await connection.beginTransaction();
      try {
        const connWrapper = new MySQLWrapper(connection);
        // We pass connWrapper as the first argument, followed by any other args
        const result = await fn(connWrapper, ...args);
        await connection.commit();
        return result;
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    };
  }

  exec(sql) {
    return this.pool.query(sql);
  }
}

async function initDB() {
  const useMySQL = process.env.DB_HOST && process.env.DB_USER;

  if (useMySQL) {
    console.log(`📦 Connecting to MySQL/MariaDB at ${process.env.DB_HOST}...`);
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      multipleStatements: true
    });
    return new MySQLWrapper(pool);
  } else {
    // Fallback to SQLite
    const dbPath = process.env.DB_PATH 
      ? path.resolve(__dirname, '..', process.env.DB_PATH) 
      : path.join(__dirname, 'database.sqlite');
    
    console.log(`📦 Connecting to SQLite at ${dbPath}...`);
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    let Database;
    try {
      Database = require('better-sqlite3');
    } catch (err) {
      console.error('Lỗi: Không tìm thấy better-sqlite3. Vui lòng cài đặt module này hoặc cấu hình DB_HOST để dùng MySQL.');
      process.exit(1);
    }

    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    
    const asyncWrapper = {
      prepare: (sql) => {
        const stmt = db.prepare(sql);
        return {
          all: async (...params) => stmt.all(...params),
          get: async (...params) => stmt.get(...params),
          run: async (...params) => stmt.run(...params)
        };
      },
      // Pass asyncWrapper as the first arg to mimic MySQL connection wrapper
      transaction: (fn) => async (...args) => {
        const tx = db.transaction((...innerArgs) => {
          // Note: we can't easily await inside a sync better-sqlite3 transaction callback.
          // BUT since we are using await db.prepare().run() which actually resolves synchronously,
          // it works if we return it or just execute it.
          // However, better-sqlite3 transaction callback MUST be synchronous.
          // If fn is async, better-sqlite3 will NOT wait for it if it suspends.
          // To be truly safe with better-sqlite3, we just run the queries sequentially
          // since they resolve immediately. BUT an async function returns a Promise.
          // This is a known limitation: better-sqlite3 transactions + async functions don't mix perfectly.
          // Luckily, our asyncWrapper's all/get/run resolve immediately, so it technically completes in the same tick.
        });
        
        // Actually, for SQLite, we can just run the queries natively, or rely on BEGIN/COMMIT natively.
        db.prepare('BEGIN').run();
        try {
          const result = await fn(asyncWrapper, ...args);
          db.prepare('COMMIT').run();
          return result;
        } catch (err) {
          db.prepare('ROLLBACK').run();
          throw err;
        }
      },
      exec: async (sql) => db.exec(sql)
    };
    
    return asyncWrapper;
  }
}

module.exports = { initDB };
