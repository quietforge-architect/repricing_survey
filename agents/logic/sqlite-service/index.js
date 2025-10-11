// Small Express + better-sqlite3 service to accept survey submissions.
// Note: install dependencies locally before running: express, better-sqlite3, body-parser, dotenv

const express = require('express');
const bodyParser = require('body-parser');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.sqlite');
if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, '');
}
const db = new Database(DB_PATH);

function sanitizeValue(v, allowList) {
  if (!v) return '';
  v = String(v).trim();
  v = v.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/ig, '<REDACTED>');
  v = v.replace(/\+?\d[\d\-\s\(\)]{6,}\d/g, '<REDACTED>');
  v = v.replace(/\b(PO Box|P\.O\. Box)\s*\d+\b/ig, '<REDACTED>');
  v = v.replace(/\b\d{1,5}\s+([A-Za-z0-9\.]{2,}\s?){1,6}\b(?:St(?:reet)?|Ave(?:nue)?|Blvd|Rd|Road|Lane|Ln|Drive|Dr|Court|Ct|Way|Terrace|Pl|Place)\b/ig, '<REDACTED>');
  // allow-list check
  for (let name of allowList) {
    if (!name) continue;
    const re = new RegExp('\\b' + name.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&') + '\\b', 'i');
    if (re.test(v)) return v;
  }
  v = v.replace(/\b([A-Z][a-z'`-]{1,30})\s+([A-Z][a-z'`-]{1,30})(?:\s+([A-Z][a-z'`-]{1,30}))?\b/g, function(m){
    if (m.length < 60) return '<REDACTED>';
    return m;
  });
  return v;
}

// init db schema
function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      created_at INTEGER,
      raw TEXT,
      sanitized TEXT,
      status TEXT
    );
  `);
}

initDb();

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.post('/submit', (req, res) => {
  const payload = req.body || {};
  const id = 's_' + Date.now();
  const created_at = Date.now();
  const raw = JSON.stringify(payload);
  const allowList = (process.env.COMPANY_ALLOWLIST || '').split(',').map(s=>s.trim()).filter(Boolean);
  const sanitizedObj = {};
  for (const k of Object.keys(payload)) {
    if (/name|email|phone|address|street|city|state|zip|postal/i.test(k)) {
      sanitizedObj[k] = sanitizeValue(payload[k], allowList);
    } else {
      sanitizedObj[k] = payload[k];
    }
  }
  const sanitized = JSON.stringify(sanitizedObj);
  const stmt = db.prepare('INSERT INTO submissions (id, created_at, raw, sanitized, status) VALUES (?, ?, ?, ?, ?)');
  stmt.run(id, created_at, raw, sanitized, 'pending');
  res.json({ success: true, id });
});

app.get('/public', (req, res) => {
  const rows = db.prepare('SELECT id, created_at, sanitized FROM submissions WHERE status = ? ORDER BY created_at DESC LIMIT 20').all('approved');
  res.json(rows);
});

app.get('/approve/:id', (req, res) => {
  const id = req.params.id;
  db.prepare('UPDATE submissions SET status = ? WHERE id = ?').run('approved', id);
  res.json({ success: true, id });
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log('sqlite-service listening on', port));
