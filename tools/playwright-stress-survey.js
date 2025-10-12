#!/usr/bin/env node
// tools/playwright-stress-survey.js
// Fill and submit the survey form multiple times to stress test DB ingestion.
const { chromium } = require('playwright');
const url = 'http://localhost:8081/index.html';
const N = 10; // Number of submissions for stress test

async function fillSurvey(page, i) {
  await page.goto(url);
  await page.selectOption('select[name="experience"]', '5+ years').catch(()=>{});
  await page.fill('input[name="sku_count"]', String(1000 + i));
  await page.check('input[name="model"][value="Wholesale"]').catch(()=>{});
  await page.fill('textarea[name="model_other"]', 'stress test ' + i);
  await page.fill('input[name="repricer"]', 'repricer ' + i);
  await page.selectOption('select[name="keepa"]', 'Paid Plan').catch(()=>{});
  await page.fill('input[name="satisfaction"]', String((i % 5) + 1));
  await page.fill('textarea[name="painpoint"]', 'painpoint ' + i);
  await page.selectOption('select[name="glitch"]', 'Yes').catch(()=>{});
  await page.fill('textarea[name="glitch_details"]', 'glitch details ' + i);
  await page.selectOption('select[name="style"]', 'Hybrid').catch(()=>{});
  await page.check('input[name="features"][value="Speed"]').catch(()=>{});
  await page.fill('textarea[name="valuable_features"]', 'valuable features ' + i);
  await page.selectOption('select[name="ai_used"]', 'No').catch(()=>{});
  await page.selectOption('select[name="ai_improvement"]', 'No').catch(()=>{});
  await page.selectOption('select[name="trust_ai"]', 'No').catch(()=>{});
  await page.fill('textarea[name="trust_ai_reason"]', 'no trust reason ' + i);
  await page.fill('textarea[name="missing_data"]', 'missing data ' + i);
  await page.fill('textarea[name="trust_features"]', 'trust features ' + i);
  await page.selectOption('select[name="local_tool"]', 'No').catch(()=>{});
  await page.fill('input[name="privacy"]', String((i % 5) + 1));
  await page.fill('textarea[name="monitoring"]', 'monitoring ' + i);
  await page.fill('textarea[name="feature_request"]', 'feature request ' + i);
  await page.selectOption('select[name="anon_data"]', 'No').catch(()=>{});
  await page.fill('input[name="contact"]', 'stress' + i + '@example.com');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 5000 }).catch(()=>{}),
    page.click('button[type="submit"]')
  ]).catch(()=>{});
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (let i = 0; i < N; ++i) {
    await fillSurvey(page, i);
    await page.waitForTimeout(200);
    console.log('Submitted survey', i + 1);
  }
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });