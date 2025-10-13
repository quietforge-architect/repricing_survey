const path = require('path');

const DEFAULT_DATA = {
  years_selling: 'Trilogy territory (3-5 years)',
  selling_commitment: 'Full-time and living on ISBNs',
  weekly_hours: '36',
  sourcing_style: [
    'Library sale lightning raids',
    'Retail scouting with scanner in hand',
  ],
  listing_rhythm: 'Big weekly batch while the world sleeps',
  repricing_stack: 'automation plus manual review pairing',
  price_check_frequency: 'A few times a week',
  inventory_anxiety: '3',
  signal_menu: [
    'Sales rank mood swings',
    'Margins and fees reality check',
  ],
  risk_posture: 'Balanced books: happy medium',
  memorable_glitch: 'pricing bot looped after feed delay',
  safety_nets: [
    'Hard price floors/ceilings',
    'Manual review queue',
  ],
  experiment_cadence: 'Monthly tune-ups',
  learning_sources: [
    'Seller forums or Discords',
    'YouTube deep dives',
  ],
  wishlist_feature: 'Explainable repricing moves with alerts',
  ai_trust_temperature: 'Lukewarm but curious',
  community_interest: 'Maybe, depends on time and snacks',
  privacy_rating: '4',
};

async function completeSurvey(page, env, overrides = {}) {
  const data = { ...DEFAULT_DATA, ...overrides };
  if (!data.contact) {
    data.contact = `playwright-e2e-${Date.now()}@example.com`;
  }

  const pageUrl = `http://127.0.0.1:${env.staticPort}/index.html`;
  const actionUrl = `http://127.0.0.1:${env.apiPort}/submit`;

  await page.goto(pageUrl);
  await page.waitForSelector('#surveyForm');
  await page.evaluate((url) => {
    const form = document.getElementById('surveyForm');
    if (form) {
      form.dataset.action = url;
      form.setAttribute('data-action', url);
    }
  }, actionUrl);

  const status = page.locator('#status');

  // Page 0
  await page.selectOption('select[name="years_selling"]', { label: data.years_selling });
  await page.selectOption('select[name="selling_commitment"]', { label: data.selling_commitment });
  await page.fill('input[name="weekly_hours"]', data.weekly_hours);
  for (const option of data.sourcing_style) {
    await page.check(`input[name="sourcing_style"][value="${option}"]`);
  }
  await page.click('#next');
  await status.waitFor({ state: 'visible' });
  await status.filter({ hasText: 'Progress saved' }).first().waitFor({ timeout: 5000 }).catch(() => {});

  // Page 1
  await page.selectOption('select[name="listing_rhythm"]', { label: data.listing_rhythm });
  await page.fill('textarea[name="repricing_stack"]', data.repricing_stack);
  await page.selectOption('select[name="price_check_frequency"]', { label: data.price_check_frequency });
  await page.fill('input[name="inventory_anxiety"]', data.inventory_anxiety);
  for (const option of data.signal_menu) {
    await page.check(`input[name="signal_menu"][value="${option}"]`);
  }
  await page.click('#next');
  await status.filter({ hasText: 'Progress saved' }).first().waitFor({ timeout: 5000 }).catch(() => {});

  // Page 2
  await page.selectOption('select[name="risk_posture"]', { label: data.risk_posture });
  await page.fill('textarea[name="memorable_glitch"]', data.memorable_glitch);
  for (const option of data.safety_nets) {
    await page.check(`input[name="safety_nets"][value="${option}"]`);
  }
  await page.selectOption('select[name="experiment_cadence"]', { label: data.experiment_cadence });
  for (const option of data.learning_sources) {
    await page.check(`input[name="learning_sources"][value="${option}"]`);
  }
  await page.click('#next');
  await status.filter({ hasText: 'Progress saved' }).first().waitFor({ timeout: 5000 }).catch(() => {});

  // Page 3
  await page.fill('textarea[name="wishlist_feature"]', data.wishlist_feature);
  await page.selectOption('select[name="ai_trust_temperature"]', { label: data.ai_trust_temperature });
  await page.selectOption('select[name="community_interest"]', { label: data.community_interest });
  await page.fill('input[name="privacy_rating"]', data.privacy_rating);
  await page.fill('input[name="contact"]', data.contact);

  await page.click('#submitBtn');
  await status.filter({ hasText: 'Thanks! Your answers are in.' }).first().waitFor({ timeout: 7000 });

  return { data, pageUrl, actionUrl };
}

module.exports = {
  completeSurvey,
};
