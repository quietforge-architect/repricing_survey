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
const COUNT_KEYS = [
  'years_selling',
  'selling_commitment',
  'risk_posture',
  'price_check_frequency',
  'experiment_cadence',
  'ai_trust_temperature',
  'community_interest',
];
const NUMERIC_KEYS = ['weekly_hours', 'inventory_anxiety', 'privacy_rating'];
const MULTI_KEYS = ['sourcing_style', 'signal_menu', 'safety_nets', 'learning_sources'];
const TEXT_KEYS = ['repricing_stack', 'memorable_glitch', 'wishlist_feature'];

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
  const summary = {
    generatedAt: new Date().toISOString(),
    totalResponses: objs.length,
    counts: Object.fromEntries(COUNT_KEYS.map((k) => [k, {}])),
    averages: Object.fromEntries(NUMERIC_KEYS.map((k) => [k, { mean: null, count: 0 }])),
    multiSelectTop: Object.fromEntries(MULTI_KEYS.map((k) => [k, []])),
    textResponseCounts: Object.fromEntries(TEXT_KEYS.map((k) => [k, 0])),
  };

  const numericStats = new Map(NUMERIC_KEYS.map((k) => [k, { sum: 0, count: 0 }]));
  const multiCounters = new Map(MULTI_KEYS.map((k) => [k, new Map()]));

  for (const o of objs) {
    for (const key of COUNT_KEYS) {
      const raw = (o[key] || '').trim();
      if (!raw) continue;
      const bucket = summary.counts[key];
      bucket[raw] = (bucket[raw] || 0) + 1;
    }

    for (const key of NUMERIC_KEYS) {
      const num = toNumber(o[key]);
      if (num == null) continue;
      const stat = numericStats.get(key);
      stat.sum += num;
      stat.count += 1;
    }

    for (const key of TEXT_KEYS) {
      const raw = o[key];
      if (raw && String(raw).trim()) {
        summary.textResponseCounts[key] += 1;
      }
    }

    for (const key of MULTI_KEYS) {
      const raw = o[key];
      if (!raw) continue;
      const values = Array.isArray(raw)
        ? raw
        : String(raw)
            .split(MULTI_DELIM)
            .map((s) => s.trim())
            .filter(Boolean);
      if (!values.length) continue;
      const counter = multiCounters.get(key);
      for (const val of values) {
        counter.set(val, (counter.get(val) || 0) + 1);
      }
    }
  }

  for (const [key, stat] of numericStats.entries()) {
    summary.averages[key] = stat.count
      ? { mean: +(stat.sum / stat.count).toFixed(2), count: stat.count }
      : { mean: null, count: 0 };
  }

  for (const [key, counter] of multiCounters.entries()) {
    const sorted = Array.from(counter.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([name, count]) => ({ name, count }));
    summary.multiSelectTop[key] = sorted;
  }

  return summary;
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
