#!/usr/bin/env node
// Usage: node tools/set-form-action.js "https://script.google.com/macros/s/AKfycbx.../exec"

const fs = require('fs');
const path = require('path');

const url = process.argv[2];
if (!url) {
  console.error('Provide a URL argument (Apps Script /exec or local collector).');
  process.exit(1);
}

const file = path.join(__dirname, '..', 'survey', 'index.html');
let html = fs.readFileSync(file, 'utf8');
html = html.replace(/action="ACTION_URL"/g, `action="${url}"`);
fs.writeFileSync(file, html);
console.log('Updated survey/index.html form action to:', url);

