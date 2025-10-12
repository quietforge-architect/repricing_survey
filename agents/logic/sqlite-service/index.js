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

const MULTI_KEYS = ['model', 'features'];

app.post('/submit', (req, res) => {
  const payload = req.body || {};
  const id = 's_' + Date.now();
  const created_at = Date.now();
  const allowList = (process.env.COMPANY_ALLOWLIST || '').split(',').map(s=>s.trim()).filter(Boolean);

  // Sanitize payload (PII redaction for known keys), preserve arrays
  const sanitizedObj = {};
  for (const k of Object.keys(payload)) {
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
        const items = isArray ? rawVal : String(rawVal || '').split(/;\s*/).map(s => s.trim()).filter(Boolean);
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
  try {
    const hasV2 = tableExists('responses') && tableExists('response_values');
    if (!hasV2) return res.status(503).json({ ok:false, error:'v2 schema missing. Run init-db.' });
    const out = { generatedAt: new Date().toISOString(), totalResponses: 0, byExperience: {}, avgSatisfaction: null, glitchCounts: {}, topFeatures: [], freeTextCounts: {} };
    const tr = db.prepare('SELECT COUNT(*) as c FROM responses').get();
    out.totalResponses = (tr && tr.c) || 0;
    db.prepare("SELECT value, COUNT(*) c FROM response_values WHERE key='experience' GROUP BY value").all().forEach(r => { if (r.value) out.byExperience[r.value] = r.c; });
    const satRows = db.prepare("SELECT value FROM response_values WHERE key='satisfaction'").all();
    let sSum = 0, sCnt = 0; for (const r of satRows) { const n = Number(r.value); if (Number.isFinite(n)) { sSum += n; sCnt++; } }
    out.avgSatisfaction = sCnt ? +(sSum / sCnt).toFixed(2) : null;
    db.prepare("SELECT value, COUNT(*) c FROM response_values WHERE key='glitch' GROUP BY value").all().forEach(r => { if (r.value) out.glitchCounts[r.value] = r.c; });

    // Features from selections if present; else fallback to split
    const hasSel = tableExists('response_selections');
    const featMap = new Map();
    if (hasSel) {
      db.prepare("SELECT option_key, COUNT(*) c FROM response_selections rs JOIN questions q ON q.id=rs.question_id WHERE q.key='features' GROUP BY option_key").all()
        .forEach(r => featMap.set(String(r.option_key), r.c));
    } else {
      db.prepare("SELECT value FROM response_values WHERE key='features'").all().forEach(r => {
        const parts = String(r.value || '').split(/;\s*/).map(s => s.trim()).filter(Boolean);
        parts.forEach(p => featMap.set(p, (featMap.get(p) || 0) + 1));
      });
    }
    out.topFeatures = Array.from(featMap.entries()).sort((a,b)=>b[1]-a[1]).slice(0,15).map(([name,count])=>({name,count}));

    const freeKeys = ['painpoint','valuable_features','trust_ai_reason','feature_request','monitoring'];
    const placeholders = freeKeys.map(()=>'?').join(',');
    db.prepare(`SELECT key, COUNT(*) c FROM response_values WHERE key IN (${placeholders}) AND TRIM(COALESCE(value,''))!='' GROUP BY key`).all(...freeKeys)
      .forEach(r => { out.freeTextCounts[r.key] = r.c; });
    return res.json(out);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e && e.message) });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log('sqlite-service listening on', port));

