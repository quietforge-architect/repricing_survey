#!/usr/bin/env node
// Generate a schema JSON from survey/index.html data-* attributes

const fs = require('fs');
const path = require('path');

const SURVEY_HTML = path.join(__dirname, '..', 'survey', 'index.html');
const OUT_DIR = path.join(__dirname, '..', 'schema');
const OUT_FILE = path.join(OUT_DIR, 'survey_schema.json');

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

function normalizeType(type) {
  if (!type) return undefined;
  const map = {
    'checkbox-group': 'multiselect',
    'checkbox': 'multiselect',
    'number': 'numeric'
  };
  return map[type] || type;
}

function extractDataKeys(html) {
  const fields = new Map();
  const tagRe = /<[^>]*data-key="([^"]+)"[^>]*>/g;
  let m;
  while ((m = tagRe.exec(html))) {
    const key = m[1];
    const tag = m[0];
    const typeM = tag.match(/data-type="([^"]+)"/);
    const catM = tag.match(/data-category="([^"]+)"/);
    const type = typeM ? normalizeType(typeM[1]) : undefined;
    const category = catM ? catM[1] : undefined;
    if (!fields.has(key)) fields.set(key, { key, type, category });
  }
  return fields;
}

function inferFromNames(html, fields) {
  const inputRe = /<(input|select|textarea)[^>]*name=["']([^"']+)["'][^>]*>/g;
  const nameCount = new Map();
  const nameTags = new Map(); // name -> array of tag strings
  let m;
  while ((m = inputRe.exec(html))) {
    const name = m[2];
    nameCount.set(name, (nameCount.get(name) || 0) + 1);
    if (!nameTags.has(name)) nameTags.set(name, []);
    nameTags.get(name).push(m[0]);
  }
  for (const [name, count] of nameCount.entries()) {
    if (!fields.has(name)) {
      let type;
      // infer multiselect if many inputs share same name or any is a checkbox
      const tags = nameTags.get(name) || [];
      const hasCheckbox = tags.some(t => /type=["']checkbox["']/i.test(t));
      if (hasCheckbox || count > 1) type = 'multiselect';
      // infer numeric for number input
      else if (tags.some(t => /type=["']number["']/i.test(t))) type = 'numeric';
      else type = 'string';

      // rough category defaults for known names
      let category;
      if (name === 'model') category = 'SellerProfile';
      else if (name === 'features') category = 'RepricingExperience';

      fields.set(name, { key: name, type, category });
    } else {
      // enrich existing: if we detect checkbox pattern and no type set
      const f = fields.get(name);
      const tags = nameTags.get(name) || [];
      const hasCheckbox = tags.some(t => /type=["']checkbox["']/i.test(t));
      if (!f.type && (hasCheckbox || count > 1)) f.type = 'multiselect';
    }
  }
}

function run() {
  if (!fs.existsSync(SURVEY_HTML)) {
    console.error('survey/index.html not found');
    process.exit(1);
  }
  const html = fs.readFileSync(SURVEY_HTML, 'utf8');
  const fields = extractDataKeys(html);
  inferFromNames(html, fields);
  const out = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    fields: Array.from(fields.values()).sort((a,b) => a.key.localeCompare(b.key))
  };
  ensureDir(OUT_DIR);
  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2));
  console.log('Wrote schema:', OUT_FILE, `(${out.fields.length} fields)`);
}

run();
