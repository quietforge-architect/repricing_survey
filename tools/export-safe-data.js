#!/usr/bin/env node
// Export safe JSON aggregates from local CSV submissions (no external deps)

const fs = require('fs');
const path = require('path');

const INPUT = path.join(__dirname, '..', 'agents', 'logic', 'local-collector', 'data', 'submissions.csv');
const OUT_DIR = path.join(__dirname, '..', 'public', 'export');
const OUT_SUMMARY = path.join(OUT_DIR, 'survey_summary.json');
const OUT_RESPONSES = path.join(OUT_DIR, 'survey_responses.json');

const EXCLUDE_FIELDS = new Set(['contact', 'email', 'phone']);
const MULTI_DELIM = /;\s*/; // matches "; "

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function parseCsv(text) {
  const rows = [];
  let i = 0, field = '', row = [], inQuotes = false;
  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => { if (row.length) rows.push(row); row = []; };
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else { field += c; }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { pushField(); }
      else if (c === '\n') { pushField(); pushRow(); }
      else if (c === '\r') { /* skip */ }
      else { field += c; }
    }
    i++;
  }
  // trailing field/row
  if (field.length || row.length) { pushField(); pushRow(); }
  return rows;
}

function rowsToObjects(rows) {
  if (!rows.length) return [];
  const header = rows[0];
  return rows.slice(1).filter(r => r.some(v => String(v).trim() !== '')).map(r => {
    const o = {};
    for (let i = 0; i < header.length; i++) {
      const key = header[i];
      o[key] = r[i] == null ? '' : r[i];
    }
    return o;
  });
}

function safeResponses(objs) {
  return objs.map(o => {
    const s = {};
    for (const k of Object.keys(o)) {
      if (EXCLUDE_FIELDS.has(k)) continue;
      s[k] = o[k];
    }
    return s;
  });
}

function toNumber(x) {
  const n = Number(String(x).trim());
  return Number.isFinite(n) ? n : null;
}

function aggregate(objs) {
  const out = {
    generatedAt: new Date().toISOString(),
    totalResponses: objs.length,
    byExperience: {},
    avgSatisfaction: null,
    glitchCounts: {},
    topFeatures: [],
    freeTextCounts: {}
  };

  let satSum = 0, satCount = 0;
  const features = new Map();
  const freeTextFields = ['painpoint', 'valuable_features', 'trust_ai_reason', 'feature_request', 'monitoring'];

  for (const o of objs) {
    const exp = (o.experience || '').trim();
    if (exp) out.byExperience[exp] = (out.byExperience[exp] || 0) + 1;

    const sat = toNumber(o.satisfaction);
    if (sat != null) { satSum += sat; satCount++; }

    const glitch = (o.glitch || o.glitch_details ? (o.glitch || 'Unknown') : '').trim();
    if (glitch) out.glitchCounts[glitch] = (out.glitchCounts[glitch] || 0) + 1;

    if (o.features) {
      String(o.features).split(MULTI_DELIM).map(s => s.trim()).filter(Boolean).forEach(f => {
        features.set(f, (features.get(f) || 0) + 1);
      });
    }

    for (const f of freeTextFields) {
      if (o[f] && String(o[f]).trim()) {
        out.freeTextCounts[f] = (out.freeTextCounts[f] || 0) + 1;
      }
    }
  }

  if (satCount) out.avgSatisfaction = +(satSum / satCount).toFixed(2);
  out.topFeatures = Array.from(features.entries()).sort((a,b)=>b[1]-a[1]).slice(0, 15).map(([name,count])=>({name,count}));
  return out;
}

function main() {
  if (!fs.existsSync(INPUT)) {
    console.error(`No CSV found at ${INPUT}. Run the local collector and submit the form first.`);
    process.exit(1);
  }
  const raw = fs.readFileSync(INPUT, 'utf8');
  const rows = parseCsv(raw);
  const objects = rowsToObjects(rows);
  const safe = safeResponses(objects);
  const summary = aggregate(safe);
  ensureDir(OUT_DIR);
  fs.writeFileSync(OUT_SUMMARY, JSON.stringify(summary, null, 2));
  fs.writeFileSync(OUT_RESPONSES, JSON.stringify({ generatedAt: summary.generatedAt, items: safe }, null, 2));
  console.log(`Wrote ${OUT_SUMMARY} and ${OUT_RESPONSES}`);
}

if (require.main === module) main();

