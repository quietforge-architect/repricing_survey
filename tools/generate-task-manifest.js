#!/usr/bin/env node
// Generates a manifest from agents/tasks/*.md and writes agents/tasks/task_manifest.generated.json

const fs = require('fs');
const path = require('path');

const tasksDir = path.join(__dirname, '..', 'agents', 'tasks');
const outFile = path.join(tasksDir, 'task_manifest.generated.json');

function titleFromContent(content) {
  const m = content.match(/^Task:\s*(.+)$/m);
  return m ? m[1].trim() : '';
}

function categoryFromName(name) {
  if (name.startsWith('apps_script')) return 'apps-script';
  if (name.includes('db_')) return 'db';
  if (name.includes('docs')) return 'docs';
  if (name.includes('dashboard')) return 'dashboard';
  if (name.includes('local_csv')) return 'local-backend';
  return 'general';
}

function run() {
  const files = fs.readdirSync(tasksDir).filter(f => f.endsWith('.md'));
  const now = new Date().toISOString();
  const tasks = files.map(f => {
    const p = path.join(tasksDir, f);
    const content = fs.readFileSync(p, 'utf8');
    const title = titleFromContent(content) || f.replace(/_/g, ' ').replace(/\.md$/, '');
    return {
      file: `agents/tasks/${f}`,
      title,
      category: categoryFromName(f),
      updatedAt: now
    };
  });
  const payload = { generatedAt: now, tasks };
  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2));
  console.log(`Wrote manifest: ${outFile} (${tasks.length} tasks)`);
}

run();

