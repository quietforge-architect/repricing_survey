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
  const browser = await chromium.launch({ headless: false, slowMo: 500 }); // Headful with slow for visibility
  const page = await browser.newPage();
  const pageUrl = `https://quietforge-architect.github.io/repricing_survey/index.html`; // Updated to live GitHub Pages survey
  console.log('[headful] opening', pageUrl);
  await page.goto(pageUrl);
  console.log('[headful] page loaded');
  await page.waitForLoadState('networkidle');
  console.log('[headful] network idle');

  // Page 1: Shelf Life & Seller Lore
  await page.waitForSelector('select[name="years_selling"]');
  console.log('[headful] selector found');
  await humanDelay(500);
  await page.selectOption('select[name="years_selling"]', 'Trilogy territory (3-5 years)').catch(()=>{});
  console.log('[headful] selected years');
  await humanDelay(500);
  await page.selectOption('select[name="selling_commitment"]', 'Full-time and living on ISBNs').catch(()=>{});
  await humanDelay(500);
  await page.fill('input[name="weekly_hours"]', '120'); // max
  await humanDelay(500);
  await page.check('input[name="sourcing_style"][value="Library sale lightning raids"]').catch(()=>{});
  await page.check('input[name="sourcing_style"][value="Estate sale archeology"]').catch(()=>{});
  await page.check('input[name="sourcing_style"][value="Other secret chapter"]').catch(()=>{});
  await humanDelay(500);
  await page.fill('input[name="non_book_inventory"]', 'A very long text to test short text input limits, perhaps up to 1000 characters or more to see if it breaks. '.repeat(10));
  await humanDelay(500);
  await page.click('#next'); // Next to page 2

  // Page 2: Daily Rituals & Tooling
  await page.waitForSelector('select[name="listing_rhythm"]');
  await humanDelay(500);
  await page.selectOption('select[name="listing_rhythm"]', 'Daily micro-sprints with a mug of something warm').catch(()=>{});
  await humanDelay(500);
  await page.fill('textarea[name="repricing_stack"]', 'Very long text for textarea to test limits. '.repeat(100) + 'End of long text.');
  await humanDelay(500);
  await page.selectOption('select[name="price_check_frequency"]', 'Multiple times a day (high caffeine mode)').catch(()=>{});
  await humanDelay(500);
  await page.check('input[name="signal_menu"][value="Sales rank mood swings"]').catch(()=>{});
  await page.check('input[name="signal_menu"][value="Buy Box tug-of-war"]').catch(()=>{});
  await page.check('input[name="signal_menu"][value="Other secret sauce"]').catch(()=>{});
  await humanDelay(500);
  await page.fill('input[name="inventory_anxiety"]', '5'); // max
  await humanDelay(500);
  await page.click('#next'); // Next to page 3

  // Page 3: Risk, Glitches & Experiments
  await page.waitForSelector('select[name="risk_posture"]');
  await humanDelay(500);
  await page.selectOption('select[name="risk_posture"]', 'Bold baron: chase upside, accept weirdness').catch(()=>{});
  await humanDelay(500);
  await page.fill('textarea[name="memorable_glitch"]', 'Long story about a glitch. '.repeat(50));
  await humanDelay(500);
  await page.check('input[name="safety_nets"][value="Hard price floors/ceilings"]').catch(()=>{});
  await page.check('input[name="safety_nets"][value="Manual review queue"]').catch(()=>{});
  await page.check('input[name="safety_nets"][value="Other contingency ritual"]').catch(()=>{});
  await humanDelay(500);
  await page.selectOption('select[name="experiment_cadence"]', 'Weekly tinkering').catch(()=>{});
  await humanDelay(500);
  await page.check('input[name="learning_sources"][value="Seller forums or Discords"]').catch(()=>{});
  await page.check('input[name="learning_sources"][value="YouTube deep dives"]').catch(()=>{});
  await page.check('input[name="learning_sources"][value="Other rabbit holes"]').catch(()=>{});
  await humanDelay(500);
  await page.click('#next'); // Next to page 4

  // Page 4: Wishlist, Community & Follow-up
  await page.waitForSelector('textarea[name="wishlist_feature"]');
  await humanDelay(500);
  await page.fill('textarea[name="wishlist_feature"]', 'Wish for something amazing. '.repeat(30));
  await humanDelay(500);
  await page.selectOption('select[name="ai_trust_temperature"]', 'Hot and ready—AI is my co-pilot').catch(()=>{});
  await humanDelay(500);
  await page.selectOption('select[name="community_interest"]', 'Yes, sign me up yesterday').catch(()=>{});
  await humanDelay(500);
  await page.fill('input[name="privacy_rating"]', '5'); // max
  await humanDelay(500);
  await page.fill('input[name="contact"]', 'test@example.com');
  await humanDelay(500);

  // Submit
  await page.click('#submitBtn');

  // Wait a bit for network
  await page.waitForTimeout(2000); // Increased for headful
  // leave browser open a few seconds so user can inspect if needed
  await page.waitForTimeout(3000); // Increased
  await browser.close();
  console.log('[headful] test completed');
}

async function main() {
  // updateFormAction(`http://localhost:${collectorPort}/submit`); // commented for live testing
  // const staticSrv = startStaticServer(); // commented for live testing
  // await new Promise(r => setTimeout(r, 700));
  try {
    await runHeadful();
  } catch (e) { console.error('[headful] error', e); }
  // staticSrv.kill();
}

main().catch(e=>{ console.error(e); process.exit(1); });
