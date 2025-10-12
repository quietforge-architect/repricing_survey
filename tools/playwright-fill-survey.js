#!/usr/bin/env node
// tools/playwright-fill-survey.js
// Start local collector, ensure survey form posts to it, serve survey, run Playwright to fill and submit.
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');

const projectRoot = path.resolve(__dirname, '..');
const surveyHtml = path.join(projectRoot, 'survey', 'index.html');
const collectorServer = path.join(projectRoot, 'agents', 'logic', 'local-collector', 'server.js');

const collectorPort = process.env.COLLECTOR_PORT || '3000';
const staticPort = process.env.STATIC_PORT || '8081';

function updateFormAction(url) {
  let html = fs.readFileSync(surveyHtml, 'utf8');
  if (!html.includes('action="' + url + '"')) {
    html = html.replace(/action="ACTION_URL"/g, `action="${url}"`);
    fs.writeFileSync(surveyHtml, html, 'utf8');
    console.log('[playwright-fill-survey] Updated form action to', url);
  } else {
    console.log('[playwright-fill-survey] Form action already set to', url);
  }
}

function startCollector() {
  const child = spawn(process.execPath, [collectorServer, `--port=${collectorPort}`], { stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', d => process.stdout.write('[collector] ' + d));
  child.stderr.on('data', d => process.stderr.write('[collector] ' + d));
  child.on('exit', () => console.log('[collector] exited'));
  return child;
}

function startStaticServer() {
  // Reuse existing tools/static-serve.js
  const staticServe = path.join(projectRoot, 'tools', 'static-serve.js');
  const child = spawn(process.execPath, [staticServe, path.join(projectRoot, 'survey'), staticPort], { stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', d => process.stdout.write('[static] ' + d));
  child.stderr.on('data', d => process.stderr.write('[static] ' + d));
  child.on('exit', () => console.log('[static] exited'));
  return child;
}

async function runPlaywright() {
  // Use Playwright from node_modules via npx if needed
  const { chromium } = require('playwright');
  const pageUrl = `http://localhost:${staticPort}/index.html`;
  console.log('[playwright] visiting', pageUrl);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(pageUrl);

  // Fill fields with lorem
  await page.selectOption('select[name="experience"]', '1–3 years').catch(()=>{});
  await page.fill('input[name="sku_count"]', '123');
  // check a couple of checkbox options
  await page.check('input[name="model"][value="Retail / Online Arbitrage"]').catch(()=>{});
  await page.fill('textarea[name="model_other"]', 'lorem ipsum');
  await page.fill('input[name="repricer"]', 'lorem repricer');
  await page.selectOption('select[name="keepa"]', 'Paid Plan').catch(()=>{});
  await page.fill('input[name="satisfaction"]', '4');
  await page.fill('textarea[name="painpoint"]', 'lorem ipsum dolor sit amet');
  await page.selectOption('select[name="glitch"]', 'No').catch(()=>{});
  await page.fill('textarea[name="glitch_details"]', 'n/a');
  await page.selectOption('select[name="style"]', 'Hybrid').catch(()=>{});
  await page.check('input[name="features"][value="Speed"]').catch(()=>{});
  await page.check('input[name="features"][value="Profit"]').catch(()=>{});
  await page.fill('textarea[name="valuable_features"]', 'lorem valuable features');
  await page.selectOption('select[name="ai_used"]', 'Yes').catch(()=>{});
  await page.selectOption('select[name="ai_improvement"]', 'Yes').catch(()=>{});
  await page.selectOption('select[name="trust_ai"]', 'Maybe').catch(()=>{});
  await page.fill('textarea[name="trust_ai_reason"]', 'lorem reason');
  await page.fill('textarea[name="missing_data"]', 'lorem missing data');
  await page.fill('textarea[name="trust_features"]', 'lorem trust features');
  await page.selectOption('select[name="local_tool"]', 'Maybe').catch(()=>{});
  await page.fill('input[name="privacy"]', '3');
  await page.fill('textarea[name="monitoring"]', 'manual checks');
  await page.fill('textarea[name="feature_request"]', 'magic wand: lorem');
  await page.selectOption('select[name="anon_data"]', 'Yes').catch(()=>{});
  await page.fill('input[name="contact"]', 'lorem@example.com');

  // Submit
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 5000 }).catch(()=>{}),
    page.click('button[type="submit"]')
  ]).catch(()=>{});

  // Give collector a moment
  await page.waitForTimeout(500);
  await browser.close();
}

async function main() {
  updateFormAction(`http://localhost:${collectorPort}/submit`);
  const collector = startCollector();
  const staticSrv = startStaticServer();

  // Wait for servers to be up
  await new Promise(r => setTimeout(r, 800));
  try {
    await runPlaywright();
    console.log('[playwright-fill-survey] Playwright finished');
  } catch (e) {
    console.error('[playwright-fill-survey] Error during Playwright run', e);
  }

  // Print collector output files
  const dataDir = path.join(path.dirname(collectorServer), 'data');
  const csv = path.join(dataDir, 'submissions.csv');
  const jsonl = path.join(dataDir, 'submissions.jsonl');
  console.log('[playwright-fill-survey] Waiting briefly for collector writes...');
  await new Promise(r => setTimeout(r, 400));
  if (fs.existsSync(csv)) console.log('[collector output]', csv, '\n', fs.readFileSync(csv, 'utf8'));
  if (fs.existsSync(jsonl)) console.log('[collector output]', jsonl, '\n', fs.readFileSync(jsonl, 'utf8'));

  // Teardown
  collector.kill();
  staticSrv.kill();
}

main().catch(e=>{ console.error(e); process.exit(1); });
