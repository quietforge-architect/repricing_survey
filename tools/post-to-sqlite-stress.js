#!/usr/bin/env node
// tools/post-to-sqlite-stress.js
// POST form-encoded survey submissions directly to sqlite-service /submit
const http = require('http');
const querystring = require('querystring');

const targetPort = process.env.PORT || process.env.TARGET_PORT || '8020';
const host = 'localhost';
const N = parseInt(process.env.N || '30', 10);
const concurrency = parseInt(process.env.CONC || '5', 10);

function postOne(i) {
  return new Promise((resolve, reject) => {
    const postData = querystring.stringify({
      experience: ['1–3 years','3–5 years','5+ years'][i % 3],
      sku_count: String(500 + i),
      model: 'Wholesale',
      model_other: 'stress ' + i,
      repricer: 'stress-repricer-' + i,
      keepa: 'Paid Plan',
      satisfaction: String((i % 5) + 1),
      painpoint: 'pain ' + i,
      glitch: 'No',
      glitch_details: 'none',
      style: 'Hybrid',
      features: ['Speed','Profit'][i % 2],
      valuable_features: 'valuable ' + i,
      ai_used: 'No',
      ai_improvement: 'No',
      trust_ai: 'Maybe',
      trust_ai_reason: 'reason ' + i,
      missing_data: 'missing ' + i,
      trust_features: 'audit log',
      local_tool: 'Maybe',
      privacy: String((i % 5) + 1),
      monitoring: 'monitor ' + i,
      feature_request: 'request ' + i,
      anon_data: 'Yes',
      contact: `stress${i}@example.com`
    });

    const opts = {
      hostname: host,
      port: targetPort,
      path: '/submit',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(opts, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', d => raw += d);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve({i, status: res.statusCode, body: raw});
        else reject(new Error(`Status ${res.statusCode}: ${raw}`));
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function run() {
  console.log(`[poster] target http://${host}:${targetPort}/submit  N=${N} conc=${concurrency}`);
  let inFlight = 0;
  let next = 0;
  let succeeded = 0;
  let failed = 0;

  const results = [];

  async function pump() {
    while (next < N) {
      if (inFlight >= concurrency) {
        await new Promise(r => setTimeout(r, 50));
        continue;
      }
      const i = next++;
      inFlight++;
      postOne(i).then(r => { results.push(r); succeeded++; }).catch(e => { results.push({i, error: String(e)}); failed++; }).finally(()=>{ inFlight--; });
    }
    // wait for remaining
    while (inFlight > 0) await new Promise(r => setTimeout(r, 50));
  }

  await pump();
  console.log('[poster] done. succeeded=', succeeded, 'failed=', failed);
  if (failed) process.exitCode = 2;
}

run().catch(e => { console.error('[poster] error', e); process.exit(1); });
