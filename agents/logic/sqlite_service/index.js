// Small Express + better-sqlite3 service to accept survey submissions (v2 schema only)
// Note: install dependencies locally before running: express, better-sqlite3, body-parser, dotenv

const express = require('express');
const bodyParser = require('body-parser');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', '..', 'db', 'survey.sqlite');
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
const db = new Database(DB_PATH);

const ADMIN_TOKEN = (process.env.API_ADMIN_TOKEN || '').trim();
const SUBMIT_TOKEN = (process.env.API_SUBMIT_TOKEN || '').trim();

// Ensure v2 schema exists (safe to run repeatedly)
function ensureSchemaV2() {
  try {
    const localSchema = path.join(__dirname, 'schema_v2.sql');
    const repoSchema = path.join(__dirname, '..', '..', '..', 'db', 'schema_v2.sql');
    const fsPath = fs.existsSync(localSchema) ? localSchema : repoSchema;
    if (fs.existsSync(fsPath)) {
      const sql = fs.readFileSync(fsPath, 'utf8');
      db.pragma('foreign_keys = ON');
      db.exec(sql);
    }
  } catch (e) {
    console.warn('[sqlite-service] ensureSchemaV2 skipped:', e && e.message);
  }
}
ensureSchemaV2();

function sanitizeValue(v, allowList) {
  if (v == null) return '';
  v = String(v).trim();
  v = v.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/ig, '<REDACTED>');
  v = v.replace(/\+?\d[\d\-\s\(\)]{6,}\d/g, '<REDACTED>');
  v = v.replace(/\b(PO Box|P\.O\. Box)\s*\d+\b/ig, '<REDACTED>');
  v = v.replace(/\b\d{1,5}\s+([A-Za-z0-9\.]{2,}\s?){1,6}\b(?:St(?:reet)?|Ave(?:nue)?|Blvd|Rd|Road|Lane|Ln|Drive|Dr|Court|Ct|Way|Terrace|Pl|Place)\b/ig, '<REDACTED>');
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

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const MULTI_KEYS = ['sourcing_style', 'signal_menu', 'safety_nets', 'learning_sources'];
const SUMMARY_COUNT_KEYS = [
  'years_selling',
  'selling_commitment',
  'risk_posture',
  'price_check_frequency',
  'experiment_cadence',
  'ai_trust_temperature',
  'community_interest',
];
const SUMMARY_NUMERIC_KEYS = {
  weekly_hours: true,
  inventory_anxiety: true,
  privacy_rating: true,
};
const SUMMARY_TEXT_KEYS = ['repricing_stack', 'memorable_glitch', 'wishlist_feature'];
const TOKEN_FIELDS = new Set(['_submit_token', 'submit_token']);

function extractBearer(headerValue = '') {
  if (typeof headerValue !== 'string') return '';
  if (headerValue.toLowerCase().startsWith('bearer ')) return headerValue.slice(7).trim();
  return '';
}

function ensureAdmin(req, res) {
  if (!ADMIN_TOKEN) return true;
  const candidate =
    req.get('X-Admin-Token') ||
    req.get('X-Api-Key') ||
    extractBearer(req.get('Authorization'));
  if (candidate === ADMIN_TOKEN) return true;
  res.status(401).json({ ok: false, error: 'Unauthorized' });
  return false;
}

function validateSubmitToken(req, payload) {
  if (!SUBMIT_TOKEN) return true;
  let candidate =
    req.get('X-Submit-Token') ||
    req.get('X-Api-Key') ||
    extractBearer(req.get('Authorization'));
  if (!candidate && payload && typeof payload === 'object' && !Array.isArray(payload)) {
    candidate = payload._submit_token || payload.submit_token;
  }
  if (candidate === SUBMIT_TOKEN) {
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      delete payload._submit_token;
      delete payload.submit_token;
    }
    return true;
  }
  return false;
}

app.post('/submit', (req, res) => {
  const payload = (req.body && typeof req.body === 'object') ? { ...req.body } : {};
  if (!validateSubmitToken(req, payload)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  const id = 's_' + Date.now();
  const created_at = Date.now();
  const allowList = (process.env.COMPANY_ALLOWLIST || '').split(',').map(s=>s.trim()).filter(Boolean);

  // Sanitize payload (PII redaction for known keys), preserve arrays
  const sanitizedObj = {};
  for (const k of Object.keys(payload)) {
    if (TOKEN_FIELDS.has(k)) continue;
    const val = payload[k];
    if (/name|email|phone|address|street|city|state|zip|postal/i.test(k)) {
      if (Array.isArray(val)) sanitizedObj[k] = val.map(v => sanitizeValue(v, allowList));
      else sanitizedObj[k] = sanitizeValue(val, allowList);
    } else {
      sanitizedObj[k] = val;
    }
  }

  try {
    db.pragma('foreign_keys = ON');
    const hasResponses = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='responses'").get();
    const hasValues = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='response_values'").get();
    if (!hasResponses || !hasValues) {
      console.warn('[sqlite-service] v2 tables missing; run init-db.');
      return res.status(503).json({ success: false, error: 'v2 schema missing. Run init-db.' });
    }

    // Upsert survey
    const surveyName = process.env.SURVEY_NAME || 'Amazon_Repricing_Feedback_Survey';
    const surveyVersion = process.env.SURVEY_VERSION || 'v1';
    const getSurvey = db.prepare('SELECT id FROM surveys WHERE name = ? AND version = ?');
    let srow = getSurvey.get(surveyName, surveyVersion);
    let surveyId;
    if (!srow) {
      const ins = db.prepare('INSERT INTO surveys (name, version, created_at) VALUES (?, ?, ?)');
      const info = ins.run(surveyName, surveyVersion, created_at);
      surveyId = info.lastInsertRowid;
    } else { surveyId = srow.id; }

    // Respondent
    const respondentHash = Buffer.from(String(Math.random())).toString('hex').slice(0, 16);
    db.prepare('INSERT OR IGNORE INTO respondents (respondent_hash) VALUES (?)').run(respondentHash);
    const respondentId = db.prepare('SELECT id FROM respondents WHERE respondent_hash = ?').get(respondentHash).id;

    // Response
    db.prepare('INSERT OR IGNORE INTO responses (survey_id, respondent_id, submitted_at, source_submission_id) VALUES (?, ?, ?, ?)')
      .run(surveyId, respondentId, created_at, id);
    const responseId = db.prepare('SELECT id FROM responses WHERE source_submission_id = ?').get(id).id;

    // Questions + Values + Selections
    const getQ = db.prepare('SELECT id FROM questions WHERE survey_id = ? AND key = ?');
    const insQ = db.prepare('INSERT OR IGNORE INTO questions (survey_id, key, label, type) VALUES (?, ?, ?, ?)');
    const insV = db.prepare('INSERT OR IGNORE INTO response_values (response_id, question_id, key, value) VALUES (?, ?, ?, ?)');
    const insSel = db.prepare('INSERT OR IGNORE INTO response_selections (response_id, question_id, option_key, option_label) VALUES (?, ?, ?, ?)');

    for (const key of Object.keys(sanitizedObj)) {
      if (!key) continue;
      insQ.run(surveyId, key, key, 'text');
      const qid = getQ.get(surveyId, key).id;

      const rawVal = sanitizedObj[key];
      const isArray = Array.isArray(rawVal);
      const valueForStore = isArray ? rawVal.join('; ') : (rawVal == null ? '' : String(rawVal));
      insV.run(responseId, qid, key, valueForStore);

      if (MULTI_KEYS.includes(key)) {
        const items = isArray
          ? rawVal
          : String(rawVal || '')
              .split(/;\s*/)
              .map((s) => s.trim())
              .filter(Boolean);
        for (const it of items) {
          insSel.run(responseId, qid, String(it), null);
        }
      }
    }

    res.json({ success: true, id });
  } catch (e) {
    console.warn('[sqlite-service] v2 insert failed:', e && e.message);
    return res.status(500).json({ success: false, error: 'Insert failed' });
  }
});

// Deprecated v1 endpoint
app.get('/public', (req, res) => {
  res.status(410).json({ deprecated: true, message: 'Use /api/v2/responses and /api/v2/summary.' });
});

// Health
app.get('/api/health', (req, res) => {
  try { const ok = db.prepare('SELECT 1').get(); res.json({ ok: true, db: !!ok }); }
  catch (e) { res.status(500).json({ ok: false, error: String(e && e.message) }); }
});

function tableExists(name) {
  try { const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name); return !!(row && row.name); }
  catch (_) { return false; }
}

function toISO(ms) { try { return new Date(ms).toISOString(); } catch (_) { return String(ms); } }

// v2: list responses
app.get('/api/v2/responses', (req, res) => {
  if (!ensureAdmin(req, res)) return;
  try {
    const limit = Math.max(1, Math.min(1000, parseInt(req.query.limit || '100', 10)));
    const offset = Math.max(0, parseInt(req.query.offset || '0', 10));
    const hasV2 = tableExists('responses') && tableExists('response_values');
    if (!hasV2) return res.status(503).json({ ok:false, error:'v2 schema missing. Run init-db.' });
    const ids = db.prepare('SELECT id FROM responses ORDER BY id DESC LIMIT ? OFFSET ?').all(limit, offset).map(r => r.id);
    if (ids.length === 0) return res.json({ items: [], count: 0, limit, offset });
    const placeholders = ids.map(() => '?').join(',');
    const rows = db.prepare(`
      SELECT r.id AS response_id, r.submitted_at, v.key, v.value
      FROM responses r
      JOIN response_values v ON v.response_id = r.id
      WHERE r.id IN (${placeholders})
      ORDER BY r.id DESC
    `).all(...ids);
    const map = new Map();
    for (const row of rows) {
      const id = row.response_id;
      if (!map.has(id)) map.set(id, { Timestamp: toISO(row.submitted_at) });
      map.get(id)[row.key] = row.value == null ? '' : String(row.value);
    }
    const items = Array.from(map.values());
    return res.json({ items, count: items.length, limit, offset });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e && e.message) });
  }
});

// v2: summary aggregates
app.get('/api/v2/summary', (req, res) => {
  if (!ensureAdmin(req, res)) return;
  try {
    const hasV2 = tableExists('responses') && tableExists('response_values');
    if (!hasV2) return res.status(503).json({ ok:false, error:'v2 schema missing. Run init-db.' });

    const responses = new Map();
    const ensureResponse = (id, submittedAt) => {
      if (!responses.has(id)) {
        responses.set(id, {
          submittedAt,
          values: Object.create(null),
          multi: Object.create(null),
        });
      }
      return responses.get(id);
    };

    const valueRows = db.prepare(`
      SELECT r.id AS response_id, r.submitted_at, v.key, v.value
      FROM responses r
      JOIN response_values v ON v.response_id = r.id
    `).all();

    valueRows.forEach((row) => {
      const record = ensureResponse(row.response_id, row.submitted_at);
      record.values[row.key] = row.value;
    });

    if (tableExists('response_selections')) {
      db.prepare(`
        SELECT rs.response_id, q.key AS question_key, rs.option_key
        FROM response_selections rs
        JOIN questions q ON q.id = rs.question_id
      `).all().forEach((row) => {
        if (!MULTI_KEYS.includes(row.question_key)) return;
        const record = ensureResponse(row.response_id, null);
        if (!record.multi[row.question_key]) record.multi[row.question_key] = new Set();
        record.multi[row.question_key].add(row.option_key);
      });
    }

    const summary = {
      generatedAt: new Date().toISOString(),
      totalResponses: responses.size,
      counts: {},
      averages: {},
      multiSelectTop: {},
      textResponseCounts: {},
    };

    SUMMARY_COUNT_KEYS.forEach((key) => { summary.counts[key] = {}; });
    Object.keys(SUMMARY_NUMERIC_KEYS).forEach((key) => {
      summary.averages[key] = { mean: null, count: 0 };
    });
    SUMMARY_TEXT_KEYS.forEach((key) => { summary.textResponseCounts[key] = 0; });
    MULTI_KEYS.forEach((key) => { summary.multiSelectTop[key] = []; });

    const multiTally = new Map();
    MULTI_KEYS.forEach((key) => multiTally.set(key, new Map()));

    const numericStats = new Map();
    Object.keys(SUMMARY_NUMERIC_KEYS).forEach((key) => numericStats.set(key, { sum: 0, count: 0 }));

    responses.forEach((record) => {
      const values = record.values;
      SUMMARY_COUNT_KEYS.forEach((key) => {
        const raw = (values[key] || '').trim();
        if (!raw) return;
        const bucket = summary.counts[key];
        bucket[raw] = (bucket[raw] || 0) + 1;
      });

      Object.keys(SUMMARY_NUMERIC_KEYS).forEach((key) => {
        const raw = values[key];
        if (raw == null || raw === '') return;
        const num = Number(raw);
        if (Number.isFinite(num)) {
          const stat = numericStats.get(key);
          stat.sum += num;
          stat.count += 1;
        }
      });

      SUMMARY_TEXT_KEYS.forEach((key) => {
        const raw = values[key];
        if (typeof raw === 'string' && raw.trim()) {
          summary.textResponseCounts[key] += 1;
        }
      });

      MULTI_KEYS.forEach((key) => {
        const selections = record.multi[key];
        let items = selections ? Array.from(selections) : [];
        if (!items.length) {
          const fallback = values[key];
          if (fallback) {
            items = String(fallback)
              .split(/;\s*/)
              .map((s) => s.trim())
              .filter(Boolean);
          }
        }
        if (!items.length) return;
        const tally = multiTally.get(key);
        items.forEach((item) => {
          const name = String(item);
          tally.set(name, (tally.get(name) || 0) + 1);
        });
      });
    });

    Object.entries(Object.fromEntries(numericStats)).forEach(([key, stat]) => {
      if (stat.count) {
        summary.averages[key] = {
          mean: Number((stat.sum / stat.count).toFixed(2)),
          count: stat.count,
        };
      } else {
        summary.averages[key] = { mean: null, count: 0 };
      }
    });

    MULTI_KEYS.forEach((key) => {
      const tally = multiTally.get(key);
      const sorted = Array.from(tally.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([name, count]) => ({ name, count }));
      summary.multiSelectTop[key] = sorted;
    });

    return res.json(summary);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e && e.message) });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log('sqlite-service listening on', port));
