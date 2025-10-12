// Migration: from submissions (v1) to normalized v2 (surveys, respondents, responses, response_values)
// Usage: node migrate-v1-to-v2.js

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.sqlite');
const SCHEMA_V2_PATH = path.join(__dirname, 'schema_v2.sql');

function ensureSchema(db) {
  const sql = fs.readFileSync(SCHEMA_V2_PATH, 'utf8');
  db.pragma('foreign_keys = ON');
  db.exec(sql);
}

function hexRandom16() {
  // 16 bytes hex
  const b = Buffer.allocUnsafe(16);
  for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random()*256);
  return b.toString('hex');
}

function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error('DB not found at', DB_PATH);
    process.exit(1);
  }
  const db = new Database(DB_PATH);
  ensureSchema(db);

  const tx = db.transaction(() => {
    // Upsert survey
    const surveyName = 'Amazon_Repricing_Feedback_Survey';
    const surveyVersion = 'v1';
    const getSurvey = db.prepare('SELECT id FROM surveys WHERE name = ? AND version = ?');
    let row = getSurvey.get(surveyName, surveyVersion);
    let surveyId;
    if (!row) {
      const ins = db.prepare('INSERT INTO surveys (name, version, created_at) VALUES (?, ?, ?)');
      const info = ins.run(surveyName, surveyVersion, Date.now());
      surveyId = info.lastInsertRowid;
    } else { surveyId = row.id; }

    // Caches
    const qCache = new Map(); // key -> question_id
    const getQ = db.prepare('SELECT id FROM questions WHERE survey_id = ? AND key = ?');
    const insQ = db.prepare('INSERT OR IGNORE INTO questions (survey_id, key, label, type) VALUES (?, ?, ?, ?)');
    function ensureQuestionId(fieldKey) {
      if (qCache.has(fieldKey)) return qCache.get(fieldKey);
      insQ.run(surveyId, fieldKey, fieldKey, 'text');
      const q = getQ.get(surveyId, fieldKey);
      qCache.set(fieldKey, q.id);
      return q.id;
    }

    // Prepare statements
    const selectSubs = db.prepare('SELECT id, created_at, sanitized FROM submissions ORDER BY created_at ASC');
    const insRespnd = db.prepare('INSERT OR IGNORE INTO respondents (respondent_hash) VALUES (?)');
    const getRespnd = db.prepare('SELECT id FROM respondents WHERE respondent_hash = ?');
    const insResp = db.prepare('INSERT OR IGNORE INTO responses (survey_id, respondent_id, submitted_at, source_submission_id) VALUES (?, ?, ?, ?)');
    const getResp = db.prepare('SELECT id FROM responses WHERE source_submission_id = ?');
    const insVal = db.prepare('INSERT OR IGNORE INTO response_values (response_id, question_id, key, value) VALUES (?, ?, ?, ?)');

    const subs = selectSubs.all();
    let migrated = 0, skipped = 0;
    for (const s of subs) {
      const srcId = s.id;
      // Check if already migrated
      const existing = getResp.get(srcId);
      if (existing && existing.id) { skipped++; continue; }

      let data = {};
      try { data = JSON.parse(s.sanitized || '{}') || {}; } catch { data = {}; }
      const respondentHash = hexRandom16();
      insRespnd.run(respondentHash);
      const respondentId = getRespnd.get(respondentHash).id;
      insResp.run(surveyId, respondentId, s.created_at || Date.now(), srcId);
      const responseId = getResp.get(srcId).id;

      for (const k of Object.keys(data)) {
        if (!k) continue;
        const questionId = ensureQuestionId(k);
        const v = data[k] != null ? String(data[k]) : '';
        insVal.run(responseId, questionId, k, v);
      }
      migrated++;
    }
    return { migrated, skipped, total: subs.length };
  });

  const result = tx();
  console.log(`Migration complete: migrated=${result.migrated}, skipped=${result.skipped}, total=${result.total}`);
}

if (require.main === module) main();

