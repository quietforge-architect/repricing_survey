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
  if (typeof obj.byExperience !== 'object' || obj.byExperience === null) fail('summary.byExperience must be object');
  if (!(obj.avgSatisfaction === null || typeof obj.avgSatisfaction === 'number')) fail('summary.avgSatisfaction must be number|null');
  if (typeof obj.glitchCounts !== 'object' || obj.glitchCounts === null) fail('summary.glitchCounts must be object');
  if (!Array.isArray(obj.topFeatures)) fail('summary.topFeatures must be array');
  if (typeof obj.freeTextCounts !== 'object' || obj.freeTextCounts === null) fail('summary.freeTextCounts must be object');
  // spot-check topFeatures entries
  for (const it of obj.topFeatures) {
    if (!it) continue;
    if (typeof it.name !== 'string' || typeof it.count !== 'number') {
      fail('summary.topFeatures items must have name:string and count:number');
      break;
    }
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

