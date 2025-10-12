#!/usr/bin/env node
// tools/notion-mcp.js
// Local-first wrapper to invoke @notionhq/notion-mcp-server CLI from node_modules/.bin or fall back to npx.
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const pkg = '@notionhq/notion-mcp-server';
const bin = 'notion-mcp-server';
const projectRoot = path.resolve(__dirname, '..');
const localBin = path.join(projectRoot, 'node_modules', '.bin', process.platform === 'win32' ? bin + '.cmd' : bin);

function tryRun(command, argv, opts = {}) {
  try {
    const res = spawnSync(command, argv, Object.assign({ stdio: 'inherit', shell: true }, opts));
    return res && res.status === 0;
  } catch (e) {
    return false;
  }
}

console.log(`Attempting to run Notion MCP via local bin: ${localBin}`);
if (fs.existsSync(localBin)) {
  if (tryRun(localBin, args)) process.exit(0);
}

console.log(`Trying local command ${bin} (shell resolution)`);
if (tryRun(bin, args)) process.exit(0);

console.log(`Falling back to npx ${pkg}`);
if (tryRun('npx', ['-y', pkg + '@latest', ...args])) process.exit(0);

console.error('Failed to run Notion MCP. Ensure @notionhq/notion-mcp-server is installed locally or run npx manually.');
process.exit(1);
