// Minimal local collector (no external deps)
// Accepts POST /submit with application/x-www-form-urlencoded or application/json
// Appends to data/submissions.csv and data/submissions.jsonl

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt((process.argv.find(a => a.startsWith('--port=')) || '').split('=')[1] || process.env.PORT || '3000', 10);
const DATA_DIR = path.join(__dirname, 'data');
const CSV_PATH = path.join(DATA_DIR, 'submissions.csv');
const JSONL_PATH = path.join(DATA_DIR, 'submissions.jsonl');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function readCsvHeader() {
  if (!fs.existsSync(CSV_PATH)) return null;
  const firstLine = fs.readFileSync(CSV_PATH, 'utf8').split(/\r?\n/)[0] || '';
  if (!firstLine.trim()) return null;
  return firstLine.split(',').map(s => s.trim());
}

function writeCsvHeader(headers) {
  fs.writeFileSync(CSV_PATH, headers.join(',') + '\n', 'utf8');
}

function appendCsvRow(headers, rowMap) {
  const vals = headers.map(h => csvEscape(rowMap[h] || ''));
  fs.appendFileSync(CSV_PATH, vals.join(',') + '\n', 'utf8');
}

function csvEscape(s) {
  const str = String(s);
  if (/[",\n]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function nowIso() { return new Date().toISOString(); }

function parseFormBody(raw) {
  const params = new URLSearchParams(raw);
  const out = {};
  for (const [key, value] of params.entries()) {
    if (Object.prototype.hasOwnProperty.call(out, key)) {
      if (Array.isArray(out[key])) out[key].push(value);
      else out[key] = [out[key], value];
    } else {
      out[key] = value;
    }
  }
  return out;
}

function normalizeBody(contentType, raw) {
  if (!raw) return {};
  if ((contentType || '').includes('application/json')) {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  if ((contentType || '').includes('application/x-www-form-urlencoded')) {
    return parseFormBody(raw);
  }
  // Default: try URL-encoded
  try { return parseFormBody(raw); } catch { return {}; }
}

function ensureHeaders(existing, incomingKeys) {
  const base = existing && existing.length ? existing.slice() : ['Timestamp'];
  const set = new Set(base);
  for (const k of incomingKeys) {
    if (!set.has(k) && k !== 'Timestamp') { base.push(k); set.add(k); }
  }
  return base;
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/submit') {
    let raw = '';
    req.on('data', chunk => { raw += chunk; if (raw.length > 1024 * 1024) req.destroy(); });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      const payload = normalizeBody(ct, raw);
      const map = { ...payload };
      // Build/extend headers
      const existing = readCsvHeader();
      const keys = Object.keys(map);
      const headers = ensureHeaders(existing, keys);
      if (!existing) writeCsvHeader(headers);
      else if (headers.length !== existing.length) writeCsvHeader(headers); // simple header refresh
      // Build row map in header order
      const rowMap = {};
      for (const h of headers) {
        if (h === 'Timestamp') {
          rowMap[h] = nowIso();
          continue;
        }
        const val = map[h];
        if (Array.isArray(val)) rowMap[h] = val.join('; ');
        else if (val == null) rowMap[h] = '';
        else rowMap[h] = String(val);
      }
      appendCsvRow(headers, rowMap);
      fs.appendFileSync(JSONL_PATH, JSON.stringify({ ts: nowIso(), data: map }) + '\n', 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Success');
    });
    return;
  }
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`[local-collector] listening on http://localhost:${PORT}`);
});
