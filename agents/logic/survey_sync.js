#!/usr/bin/env node
// survey_sync.js - Agent stub to simulate backing up Google Sheet responses to Drive
const fs = require('fs');
const path = require('path');

function run() {
  console.log('survey_sync: starting dry-run backup...');
  const src = path.resolve(__dirname, '..', '..', 'src', 'html', 'survey.html');
  const destDir = path.resolve(__dirname, '..', '..', 'agents', 'logs');
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  const out = path.join(destDir, `survey_backup_${Date.now()}.html`);
  fs.copyFileSync(src, out);
  console.log('survey_sync: copied survey.html to', out);
}

if (require.main === module) run();
module.exports = { run };
