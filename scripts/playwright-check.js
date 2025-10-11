(async () => {
  try {
    const { chromium } = require('playwright');
    console.log('playwright package loaded');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const ua = await page.evaluate(() => navigator.userAgent);
    console.log('launched chromium, userAgent:', ua);
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Playwright check failed:', err && err.message ? err.message : err);
    process.exit(2);
  }
})();
