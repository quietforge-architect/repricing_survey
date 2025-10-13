const { test: base, expect } = require('@playwright/test');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../..');

async function waitForHttp(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch (_) {
      // ignore until timeout
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function spawnNode(scriptPath, args = [], env = {}) {
  const child = spawn(process.execPath, [scriptPath, ...args], {
    env: { ...process.env, ...env },
    cwd: rootDir,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (process.env.E2E_DEBUG) {
    child.stdout.on('data', (data) => process.stdout.write(`[child:${path.basename(scriptPath)}] ${data}`));
    child.stderr.on('data', (data) => process.stderr.write(`[child:${path.basename(scriptPath)}] ${data}`));
  }
  return child;
}

function stopProcess(child) {
  if (!child || child.killed) return;
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', child.pid, '/T', '/F']);
  } else {
    child.kill('SIGTERM');
  }
}

const test = base.extend({
  surveyEnv: async ({}, use, workerInfo) => {
    const apiPort = 3301 + workerInfo.workerIndex;
    const staticPort = 4173 + workerInfo.workerIndex;
    const tmpDir = path.join(rootDir, 'tmp', `e2e-${Date.now()}-${workerInfo.workerIndex}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    const dbPath = path.join(tmpDir, 'survey.sqlite');

    const apiScript = path.join(rootDir, 'agents', 'logic', 'sqlite_service', 'index.js');
    const apiProc = spawnNode(apiScript, [], {
      PORT: String(apiPort),
      DB_PATH: dbPath,
    });
    await waitForHttp(`http://127.0.0.1:${apiPort}/api/health`);

    const staticScript = path.join(rootDir, 'tools', 'static-serve.js');
    const staticProc = spawnNode(staticScript, [path.join(rootDir, 'survey'), String(staticPort)]);
    await waitForHttp(`http://127.0.0.1:${staticPort}/index.html`);

    try {
      await use({ apiPort, staticPort, dbPath, tmpDir });
    } finally {
      stopProcess(staticProc);
      stopProcess(apiProc);
      await new Promise((resolve) => setTimeout(resolve, 300));
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  },
});

module.exports = { test, expect };
