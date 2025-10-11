#!/usr/bin/env node
// markitdown-mcp.js
// Wrapper that attempts to invoke markitdown MCP via npx with several candidate package names.
// Usage: node scripts/markitdown-mcp.js [args...]

const { spawnSync } = require('child_process');

const candidates = [
  'markitdown-mcp',
  '@markitdown/markitdown-mcp',
  // add more candidates or git urls if your org publishes under different names
];

const args = process.argv.slice(2);

for (const pkg of candidates) {
  console.log(`Trying npx ${pkg} ${args.join(' ')}`);
  const res = spawnSync('npx', ['-y', pkg, ...args], { stdio: 'inherit' });
  if (res.status === 0) {
    process.exit(0);
  }
}

// Fallback: try a local stub implementation if present
const path = require('path');
const fs = require('fs');
const stub = path.join(__dirname, 'markitdown-mcp-stub.js');
if (fs.existsSync(stub)) {
  console.log('Falling back to local stub:', stub);
  const res2 = spawnSync('node', [stub, ...args], { stdio: 'inherit' });
  process.exit(res2.status || 0);
}

console.error('All candidates failed. You can run the MCP server via the correct package name or edit this wrapper to add a candidate.');
process.exit(1);
