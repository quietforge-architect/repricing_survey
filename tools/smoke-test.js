#!/usr/bin/env node
// Orchestrates an end-to-end smoke test of the survey pipeline

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..');
const DB_PATH = path.join(ROOT, 'db', 'survey.sqlite');
const EXPORT_DIR = path.join(ROOT, 'public', 'export');

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed with code ${result.status}`);
  }
}

function ensureFileExists(p) {
  if (!fs.existsSync(p)) throw new Error(`Expected file missing: ${p}`);
}

async function main() {
  console.log('--- Smoke Test: schema generation ---');
  run('node', [path.join('tools', 'generate-schema-from-html.js')], { cwd: ROOT });

  console.log('--- Smoke Test: DB init ---');
  run('python', [path.join('tools', 'init_survey_db.py')], { cwd: ROOT });

  console.log('--- Smoke Test: load sample items ---');
  const tmpCsv = path.join(os.tmpdir(), `items-smoke-${Date.now()}.csv`);
  fs.writeFileSync(tmpCsv, 'SKU,ASIN,Title,Condition,Fulfillment,Rank,Price\nSKU123,ASIN123,Sample Item 1,New,FBA,12345,19.99\nSKU456,ASIN456,Sample Item 2,Used,FBM,54321,9.49\n');
  run('python', [path.join('agents', 'logic', 'load_items.py'), tmpCsv], { cwd: ROOT });

  console.log('--- Smoke Test: import sample responses ---');
  const tmpJsonl = path.join(os.tmpdir(), `submissions-smoke-${Date.now()}.jsonl`);
  const sample = (i) => ({
    ts: new Date(Date.now() - i * 60000).toISOString(),
    data: {
      experience: ['1-3 years','3-5 years','5+ years'][i % 3],
      sku_count: String(500 + i),
      model: ['Wholesale','Retail/Online Arbitrage','Bulk'][i % 3],
      repricer: `smoke-${i}`,
      keepa: 'Paid Plan',
      satisfaction: String((i % 5) + 1),
      painpoint: `pain ${i}`,
      glitch: 'No',
      glitch_details: 'none',
      style: 'Hybrid',
      features: ['Speed; Profit', 'Reporting; Custom Rules'][i % 2],
      valuable_features: `valuable ${i}`,
      ai_used: 'No',
      ai_improvement: 'No',
      trust_ai: 'Maybe',
      trust_ai_reason: `reason ${i}`,
      missing_data: 'missing pieces',
      trust_features: 'audit log',
      local_tool: 'Maybe',
      privacy: String((i % 5) + 1),
      monitoring: `monitor ${i}`,
      feature_request: `request ${i}`,
      anon_data: 'Yes',
      contact: `smoke${i}@example.com`
    }
  });
  const lines = Array.from({ length: 5 }, (_, i) => JSON.stringify(sample(i)));
  fs.writeFileSync(tmpJsonl, lines.join('\n'));
  run('python', [path.join('tools', 'import_collector_jsonl_to_db.py'), tmpJsonl], { cwd: ROOT });

  console.log('--- Smoke Test: exports ---');
  run('python', [path.join('tools', 'export_safe_from_db.py')], { cwd: ROOT });
  run('python', [path.join('tools', 'export_typed_from_db.py')], { cwd: ROOT });

  console.log('--- Smoke Test: validations ---');
  run('node', [path.join('tools', 'validate-exports.js')], { cwd: ROOT });
  run('node', [path.join('tools', 'spec_validate.js')], { cwd: ROOT });

  console.log('--- Smoke Test: artifact checks ---');
  ensureFileExists(path.join(EXPORT_DIR, 'survey_summary.json'));
  ensureFileExists(path.join(EXPORT_DIR, 'survey_responses.json'));
  ensureFileExists(path.join(EXPORT_DIR, 'survey_typed_summary.json'));
  ensureFileExists(path.join(EXPORT_DIR, 'survey_typed_responses.json'));

  console.log('Smoke test completed successfully.');
}

main().catch(err => {
  console.error('Smoke test failed:', err.message);
  process.exitCode = 1;
});
