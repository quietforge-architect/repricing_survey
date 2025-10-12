#!/usr/bin/env node
// Usage: node tools/post-sample.js <URL>
// Posts a sample payload to an Apps Script /exec or local /submit endpoint.

const url = process.argv[2];
if (!url) {
  console.error('Provide a URL, e.g.: node tools/post-sample.js http://localhost:3000/submit');
  process.exit(1);
}

const params = new URLSearchParams();
params.set('experience', '1–3 years');
params.set('sku_count', '500');
params.append('model', 'Books (FBA)');
params.append('model', 'Retail/Online Arbitrage');
params.set('repricer', 'Aura');
params.set('keepa', 'Paid Plan');
params.set('satisfaction', '4');
params.set('painpoint', 'Price wars on commodity SKUs, need better throttling.');
params.set('glitch', 'No');
params.set('style', 'Hybrid');
params.append('features', 'Speed');
params.append('features', 'Reporting');
params.set('valuable_features', 'Alerts + BuyBox stability');
params.set('ai_used', 'Yes');
params.set('ai_improvement', 'Unsure');
params.set('trust_ai', 'Maybe');
params.set('trust_ai_reason', 'If transparent + explainable.');
params.set('missing_data', 'Inbound estimates + true OOS windows.');
params.set('trust_features', 'Simulation + rollback + audit log.');
params.set('local_tool', 'Yes');
params.set('privacy', '5');
params.set('monitoring', 'Dashboards + CSV audits.');
params.set('feature_request', 'Dynamic thresholds from Keepa volatility.');
params.set('anon_data', 'Maybe, depends on details');
params.set('contact', 'tester@example.com');

(async () => {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
  const text = await resp.text();
  console.log('Status:', resp.status);
  console.log(text);
})();

