const { chromium } = require('playwright');

async function test() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('https://quietforge-architect.github.io/repricing_survey/index.html');
  console.log('Page loaded');
  const title = await page.title();
  console.log('Title:', title);
  const selector = await page.locator('select[name="years_selling"]').count();
  console.log('Selector count:', selector);
  await browser.close();
}

test().catch(console.error);