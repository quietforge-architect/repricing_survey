#!/usr/bin/env node
// Validate exported JSON structure if present (non-fatal if missing)

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'export');
const SUMMARY_PATH = path.join(OUT_DIR, 'survey_summary.json');
const RESPONSES_PATH = path.join(OUT_DIR, 'survey_responses.json');

function exists(p) { try { return fs.existsSync(p); } catch { return false; } }

function fail(msg) { console.error(msg); process.exitCode = 1; }

function validateSummary(obj) {
  if (typeof obj !== 'object' || !obj) return fail('summary: not an object');
  if (typeof obj.generatedAt !== 'string') fail('summary.generatedAt must be string');
  if (typeof obj.totalResponses !== 'number') fail('summary.totalResponses must be number');
  if (typeof obj.counts !== 'object' || obj.counts === null) fail('summary.counts must be object');
  if (typeof obj.averages !== 'object' || obj.averages === null) fail('summary.averages must be object');
  if (typeof obj.multiSelectTop !== 'object' || obj.multiSelectTop === null) fail('summary.multiSelectTop must be object');
  if (typeof obj.textResponseCounts !== 'object' || obj.textResponseCounts === null) fail('summary.textResponseCounts must be object');

  for (const [key, bucket] of Object.entries(obj.counts)) {
    if (!bucket || typeof bucket !== 'object') { fail(`summary.counts.${key} must be object`); break; }
    for (const [name, value] of Object.entries(bucket)) {
      if (typeof value !== 'number') { fail(`summary.counts.${key}.${name} must be number`); break; }
    }
  }

  for (const [key, data] of Object.entries(obj.averages)) {
    if (!data || typeof data !== 'object') { fail(`summary.averages.${key} must be object`); break; }
    if (!('mean' in data) || !('count' in data)) { fail(`summary.averages.${key} must include mean and count`); break; }
    if (!(data.mean === null || typeof data.mean === 'number')) fail(`summary.averages.${key}.mean must be number|null`);
    if (typeof data.count !== 'number') fail(`summary.averages.${key}.count must be number`);
  }

  for (const [key, arr] of Object.entries(obj.multiSelectTop)) {
    if (!Array.isArray(arr)) { fail(`summary.multiSelectTop.${key} must be array`); break; }
    for (const entry of arr) {
      if (!entry) continue;
      if (typeof entry.name !== 'string' || typeof entry.count !== 'number') {
        fail(`summary.multiSelectTop.${key} items must have name:string and count:number`);
        break;
      }
    }
  }

  for (const [key, value] of Object.entries(obj.textResponseCounts)) {
    if (typeof value !== 'number') { fail(`summary.textResponseCounts.${key} must be number`); break; }
  }
}

function validateResponses(obj) {
  if (typeof obj !== 'object' || !obj) return fail('responses: not an object');
  if (typeof obj.generatedAt !== 'string') fail('responses.generatedAt must be string');
  if (!Array.isArray(obj.items)) fail('responses.items must be array');
  const forbidden = new Set(['contact','email','phone']);
  // light pass
  for (const item of obj.items) {
    if (typeof item !== 'object' || !item) { fail('responses.items contains non-object'); break; }
    for (const k of Object.keys(item)) {
      if (forbidden.has(k)) { fail(`responses.items contains forbidden key: ${k}`); break; }
    }
  }
}

function main() {
  if (!exists(OUT_DIR)) {
    console.log('No public/export directory; skipping export validation.');
    return;
  }
  if (exists(SUMMARY_PATH)) {
    const summary = JSON.parse(fs.readFileSync(SUMMARY_PATH, 'utf8'));
    validateSummary(summary);
    console.log('Validated survey_summary.json');
  } else {
    console.log('survey_summary.json not found; skipping.');
  }
  if (exists(RESPONSES_PATH)) {
    const responses = JSON.parse(fs.readFileSync(RESPONSES_PATH, 'utf8'));
    validateResponses(responses);
    console.log('Validated survey_responses.json');
  } else {
    console.log('survey_responses.json not found; skipping.');
  }
}

main();
