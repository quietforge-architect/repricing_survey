#!/usr/bin/env node
// tools/markitdown-mcp.js
// Wrapper that attempts to invoke markitdown MCP via npx with several candidate package names.
// Usage: node tools/markitdown-mcp.js [args...]

const { spawnSync } = require('child_process');

const candidates = [
  // The registry package name 'markitdown' exists (v0.0.4) and should be tried.
  'markitdown',
  'markitdown-mcp',
  '@markitdown/markitdown-mcp',
  // add more candidates or git urls if your org publishes under different names
];

const args = process.argv.slice(2);

for (const pkg of candidates) {
  // First try to run an installed binary with the same name (helps use global installs)
  const binName = pkg.includes('/') ? pkg.split('/').pop() : pkg;
  console.log(`Trying command ${binName} ${args.join(' ')}`);
  try {
    // Use a shell on Windows so .cmd/.bat shims are resolved correctly
    const direct = spawnSync(binName, args, { stdio: 'inherit', shell: true });
    if (direct && direct.status === 0) {
      process.exit(0);
    }
  } catch (e) {
    // ignore and try npx next
  }

  // Fall back to npx (downloads or runs local install)
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
