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
      years_selling: [
        'Still cracking the first spine (0-12 months)',
        'Plot twist prologue (1-2 years)',
        'Trilogy territory (3-5 years)',
        'Encyclopedia energy (5+ years)',
      ][i % 4],
      selling_commitment: [
        'Part-time for fun (or funding more books)',
        'Full-time and living on ISBNs',
        'Seasonal snowstorm hustle',
        'Other mix of chaos',
      ][i % 4],
      weekly_hours: String(18 + i * 2),
      sourcing_style: [
        'Library sale lightning raids',
        'Estate sale archeology',
        'Retail scouting with scanner in hand',
      ].slice(0, 1 + (i % 3)),
      non_book_inventory: `board games + vinyl lot ${i}`,
      listing_rhythm: [
        'Daily micro-sprints with a mug of something warm',
        'Big weekly batch while the world sleeps',
        'Weekend warrior marathons',
        'Chaotic whenever-I-can bursts',
      ][i % 4],
      repricing_stack: `repricer combo ${i}`,
      price_check_frequency: [
        'Multiple times a day (high caffeine mode)',
        'Once a day keeps surprises away',
        'A few times a week',
        'Only when a metric screams',
      ][i % 4],
      inventory_anxiety: String((i % 5) + 1),
      signal_menu: [
        'Sales rank mood swings',
        'Buy Box tug-of-war',
        'Seasonal demand quirks',
        'Margins and fees reality check',
      ].slice(0, 2 + (i % 2)),
      risk_posture: [
        'Play-it-safe librarian: protect the floor',
        'Balanced books: happy medium',
        'Bold baron: chase upside, accept weirdness',
        'Depends on the SKU mood',
      ][i % 4],
      memorable_glitch: `memorable glitch ${i}`,
      safety_nets: [
        'Hard price floors/ceilings',
        'Manual review queue',
        'Alert storm (email/SMS/push)',
        'Pause switch or emergency stop',
      ].slice(0, 2 + (i % 2)),
      experiment_cadence: [
        'Weekly tinkering',
        'Monthly tune-ups',
        'Quarterly science fair',
        'Rarely, experiments bite',
      ][i % 4],
      learning_sources: [
        'Seller forums or Discords',
        'YouTube deep dives',
        'Podcasts or long-form interviews',
        'Industry reports and data drops',
      ].slice(0, 2 + (i % 3)),
      ai_trust_temperature: [
        'Room temperature skepticism',
        'Lukewarm but curious',
        'Comfortably warm, show me receipts',
        'Hot and ready, AI is my co-pilot',
      ][i % 4],
      community_interest: [
        'Yes, sign me up yesterday',
        'Maybe, depends on time and snacks',
        'No thanks, I prefer stealth mode',
      ][i % 3],
      privacy_rating: String(((i + 2) % 5) + 1),
      wishlist_feature: `wishlist idea ${i}`,
      contact: `smoke${i}@example.com`,
    },
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
