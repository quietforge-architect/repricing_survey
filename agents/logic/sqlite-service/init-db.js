const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'data.sqlite');
const db = new Database(dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY,
    created_at INTEGER,
    raw TEXT,
    sanitized TEXT,
    status TEXT
  );
`);
console.log('Initialized DB at', dbPath);
