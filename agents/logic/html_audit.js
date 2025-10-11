#!/usr/bin/env node
// html_audit.js - Agent stub to validate survey.html fields and schema (basic checks)
const fs = require('fs');
const path = require('path');

function run() {
  console.log('html_audit: running basic checks...');
  const file = path.resolve(__dirname, '..', '..', 'src', 'html', 'survey.html');
  const html = fs.readFileSync(file, 'utf8');
  const missingMeta = [];
  html.replace(/<input|<select|<textarea/g, (m, idx) => {
    // naive: check for data-meta attribute nearby
    const snippet = html.substr(idx, 120);
    if (!/data-meta=/.test(snippet)) missingMeta.push(snippet.split('>').shift());
  });
  console.log('html_audit: found', missingMeta.length, 'inputs without data-meta (first 3):');
  console.log(missingMeta.slice(0,3));
}

if (require.main === module) run();
module.exports = { run };
