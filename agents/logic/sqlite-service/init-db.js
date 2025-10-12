const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const defaultDb = path.join(__dirname, '..', '..', '..', 'db', 'survey.sqlite');
const dbPath = process.env.DB_PATH || defaultDb;
const schemaCandidates = [
  path.join(__dirname, 'schema_v2.sql'),
  path.join(__dirname, '..', '..', '..', 'db', 'schema_v2.sql'),
];

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

let schema = null;
for (const p of schemaCandidates) {
  if (fs.existsSync(p)) { schema = fs.readFileSync(p, 'utf8'); break; }
}
if (!schema) throw new Error('schema_v2.sql not found');

db.exec(schema);
console.log('Initialized v2 schema at', dbPath);
