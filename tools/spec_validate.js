#!/usr/bin/env node
// Validate schema/survey_schema.json and (optionally) typed exports

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SCHEMA = path.join(ROOT, 'schema', 'survey_schema.json');
const TYPED_RESP = path.join(ROOT, 'public', 'export', 'survey_typed_responses.json');
const TYPED_SUM = path.join(ROOT, 'public', 'export', 'survey_typed_summary.json');
const PIPELINE = path.join(ROOT, 'schema', 'pipeline.json');

function fail(msg) { console.error(msg); process.exitCode = 1; }
function exists(p) { try { return fs.existsSync(p); } catch { return false; } }

const allowedTypes = new Set(['string','text_long','numeric','ordinal','multiselect']);

function validateSchema(obj) {
  if (!obj || typeof obj !== 'object') return fail('schema: not an object');
  if (typeof obj.version !== 'string') fail('schema.version must be string');
  if (!Array.isArray(obj.fields)) fail('schema.fields must be array');
  const seen = new Set();
  for (const f of obj.fields) {
    if (!f || typeof f !== 'object') { fail('schema.fields contains non-object'); break; }
    if (typeof f.key !== 'string' || !f.key.trim()) { fail('field.key must be non-empty string'); break; }
    if (seen.has(f.key)) { fail('duplicate field key: ' + f.key); break; }
    seen.add(f.key);
    if (f.type && !allowedTypes.has(f.type)) { fail(`invalid type for ${f.key}: ${f.type}`); }
  }
  return Array.from(seen);
}

function validateTyped(responses, keys) {
  if (!responses || typeof responses !== 'object') return fail('typed responses: not an object');
  if (!Array.isArray(responses.items)) return fail('typed responses.items must be array');
  for (const it of responses.items) {
    if (typeof it !== 'object') { fail('typed response item not object'); break; }
    for (const k of Object.keys(it)) {
      if (k === 'Timestamp') continue;
      if (!keys.includes(k)) { console.warn('typed item has unknown key (not in schema):', k); }
    }
  }
}

function main() {
  if (!exists(SCHEMA)) { console.log('No schema file found; skipping spec validation.'); return; }
  const schema = JSON.parse(fs.readFileSync(SCHEMA, 'utf8'));
  const keys = validateSchema(schema);
  console.log('Schema OK with', keys.length, 'fields');
  if (exists(PIPELINE)) {
    const pipeline = JSON.parse(fs.readFileSync(PIPELINE, 'utf8'));
    if (!Array.isArray(pipeline.stages) || !pipeline.stages.length) {
      fail('pipeline.stages must be a non-empty array');
    } else {
      for (const stage of pipeline.stages) {
        if (typeof stage.name !== 'string') fail('pipeline stage missing name');
        if (!stage.outputs || !stage.outputs.length) fail('pipeline stage missing outputs');
      }
      console.log('Pipeline spec OK with', pipeline.stages.length, 'stages');
    }
  } else {
    console.log('No pipeline.json found; skipping pipeline validation.');
  }
  if (exists(TYPED_RESP)) {
    const resp = JSON.parse(fs.readFileSync(TYPED_RESP, 'utf8'));
    validateTyped(resp, keys);
    console.log('Typed responses basic validation OK');
  } else {
    console.log('No typed responses found; skipping typed validation.');
  }
  if (exists(TYPED_SUM)) {
    const sum = JSON.parse(fs.readFileSync(TYPED_SUM, 'utf8'));
    if (typeof sum.totalResponses !== 'number') fail('typed summary: totalResponses must be number');
    console.log('Typed summary basic validation OK');
  } else {
    console.log('No typed summary found; skipping.');
  }
}

main();
