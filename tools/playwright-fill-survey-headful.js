#!/usr/bin/env node
// tools/playwright-fill-survey-headful.js
// Like playwright-fill-survey.js but launches a visible browser with slow interactions.
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const surveyHtml = path.join(projectRoot, 'survey', 'index.html');
const collectorServer = path.join(projectRoot, 'agents', 'logic', 'local-collector', 'server.js');
const collectorPort = process.env.COLLECTOR_PORT || '3001';
const staticPort = process.env.STATIC_PORT || '8081';

function updateFormAction(url) {
  let html = fs.readFileSync(surveyHtml, 'utf8');
  if (!html.includes('action="' + url + '"')) {
    html = html.replace(/action="ACTION_URL"/g, `action="${url}"`);
    fs.writeFileSync(surveyHtml, html, 'utf8');
    console.log('[headful] Updated form action to', url);
  }
}

function startStaticServer() {
  const staticServe = path.join(projectRoot, 'tools', 'static-serve.js');
  const child = spawn(process.execPath, [staticServe, path.join(projectRoot, 'survey'), staticPort], { stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', d => process.stdout.write('[static] ' + d));
  child.stderr.on('data', d => process.stderr.write('[static] ' + d));
  return child;
}

async function humanDelay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runHeadful() {
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const page = await browser.newPage();
  const pageUrl = `http://localhost:${staticPort}/index.html`;
  console.log('[headful] opening', pageUrl);
  await page.goto(pageUrl);

  // Page 1: About You
  await page.waitForSelector('select[name="experience"]');
  await humanDelay(100);
  await page.selectOption('select[name="experience"]', '1–3 years').catch(()=>{});
  await humanDelay(50);
  await page.fill('input[name="sku_count"]', '987');
  await humanDelay(50);
  await page.click('input[name="model"][value="Retail / Online Arbitrage"]').catch(()=>{});
  await humanDelay(50);
  await page.fill('textarea[name="model_other"]', 'lorem headful');
  await humanDelay(50);
  await page.fill('input[name="repricer"]', 'headful repricer');
  await humanDelay(50);
  await page.selectOption('select[name="keepa"]', 'Paid Plan').catch(()=>{});
  await humanDelay(50);
  await page.click('#next'); // Next to page 2

  // Page 2: Repricing Experience
  await page.waitForSelector('input[name="satisfaction"]');
  await humanDelay(50);
  await page.fill('input[name="satisfaction"]', '5');
  await humanDelay(50);
  await page.fill('textarea[name="painpoint"]', 'headful lorem painpoint');
  await humanDelay(50);
  await page.selectOption('select[name="glitch"]', 'Not sure').catch(()=>{});
  await humanDelay(50);
  await page.fill('textarea[name="glitch_details"]', 'maybe once');
  await humanDelay(50);
  await page.selectOption('select[name="style"]', 'Hybrid').catch(()=>{});
  await humanDelay(50);
  await page.check('input[name="features"][value="Reporting"]').catch(()=>{});
  await humanDelay(50);
  await page.fill('textarea[name="valuable_features"]', 'headful valuable features');
  await humanDelay(50);
  await page.click('#next'); // Next to page 3

  // Page 3: AI, Data & Trust
  await page.waitForSelector('select[name="ai_used"]');
  await humanDelay(50);
  await page.selectOption('select[name="ai_used"]', 'Yes').catch(()=>{});
  await humanDelay(50);
  await page.selectOption('select[name="ai_improvement"]', 'Unsure').catch(()=>{});
  await humanDelay(50);
  await page.selectOption('select[name="trust_ai"]', 'Maybe').catch(()=>{});
  await humanDelay(50);
  await page.fill('textarea[name="trust_ai_reason"]', 'hesitant but curious');
  await humanDelay(50);
  await page.fill('textarea[name="missing_data"]', 'faster inventory signals');
  await humanDelay(50);
  await page.click('#next'); // Next to page 4

  // Page 4: Wishlist & Privacy
  await page.waitForSelector('textarea[name="trust_features"]');
  await humanDelay(50);
  await page.fill('textarea[name="trust_features"]', 'audit logs, rollback');
  await humanDelay(50);
  await page.selectOption('select[name="local_tool"]', 'Yes').catch(()=>{});
  await humanDelay(50);
  await page.fill('input[name="privacy"]', '4');
  await humanDelay(50);
  await page.fill('textarea[name="monitoring"]', 'alerts and csvs');
  await humanDelay(50);
  await page.fill('textarea[name="feature_request"]', 'undo button for bad reprices');
  await humanDelay(50);
  await page.selectOption('select[name="anon_data"]', 'Maybe, depends on details').catch(()=>{});
  await humanDelay(50);
  await page.fill('input[name="contact"]', 'human@example.com');

  // Submit
  await page.click('#submitBtn');

  // Wait a bit for network
  await page.waitForTimeout(300);
  // leave browser open a few seconds so user can inspect if needed
  await page.waitForTimeout(500);
  await browser.close();
}

async function main() {
  updateFormAction(`http://localhost:${collectorPort}/submit`);
  const staticSrv = startStaticServer();
  await new Promise(r => setTimeout(r, 700));
  try {
    await runHeadful();
  } catch (e) { console.error('[headful] error', e); }
  staticSrv.kill();
}

main().catch(e=>{ console.error(e); process.exit(1); });
