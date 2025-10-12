#!/usr/bin/env node
// tools/playwright-mcp.js
// Local-first wrapper to invoke Playwright CLI from node_modules/.bin or fall back to npx.
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const cmd = 'playwright';
const projectRoot = path.resolve(__dirname, '..');
const localBin = path.join(projectRoot, 'node_modules', '.bin', process.platform === 'win32' ? cmd + '.cmd' : cmd);

function tryRun(command, argv, opts = {}) {
  try {
    const res = spawnSync(command, argv, Object.assign({ stdio: 'inherit', shell: true }, opts));
    return res && res.status === 0;
  } catch (e) {
    return false;
  }
}

console.log(`Attempting to run Playwright via local bin: ${localBin}`);
if (fs.existsSync(localBin)) {
  if (tryRun(localBin, args)) process.exit(0);
}

console.log(`Trying local command ${cmd} (shell resolution)`);
if (tryRun(cmd, args)) process.exit(0);

console.log(`Falling back to npx @playwright/mcp`);
if (tryRun('npx', ['-y', '@playwright/mcp@latest', ...args])) process.exit(0);

console.error('Failed to run Playwright MCP. Ensure Playwright is installed (npm install) or run npx manually.');
process.exit(1);
