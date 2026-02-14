#!/usr/bin/env node
// tools/markitdown-mcp-stub.js
// Minimal local stub that simulates a markitdown MCP server for development and testing.

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log('markitdown-mcp stub\n\nUsage: markitdown-mcp [options]\n\nOptions:\n  --help, -h    Show this help message\n');
  process.exit(0);
}

console.log('markitdown-mcp stub starting... (this is a noop stub)');
process.exit(0);
