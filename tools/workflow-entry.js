#!/usr/bin/env node
/**
 * Top-level workflow entry point for survey development.
 * Provides shortcuts for live preview (human testing) and automated agent tests.
 */

const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');

const rootDir = path.resolve(__dirname, '..');
const npmCmd = process.platform === 'win32' ? 'npm' : 'npm';

function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      }
    });
    child.on('error', reject);
  });
}

async function runHumanPreview() {
  console.log('\nLaunching live preview on http://localhost:4173 (Ctrl+C to stop)...\n');
  await runCommand(npmCmd, ['run', 'preview']);
}

async function runAgentSmoke() {
  console.log('\nBuilding offline bundle before running smoke tests...\n');
  await runCommand(npmCmd, ['run', 'build:offline']);
  console.log('\nExecuting Playwright smoke test suite...\n');
  await runCommand(npmCmd, ['run', 'test:smoke']);
}

async function runBuildOnly() {
  console.log('\nBuilding offline bundle...\n');
  await runCommand(npmCmd, ['run', 'build:offline']);
}

function promptMenu() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const menu = `
Amazon Repricing Survey Workflow
--------------------------------
[1] Launch human live preview (lite-server)
[2] Build offline bundle (dist/)
[3] Run agent smoke test (build + Playwright)
[4] Build offline bundle then run agent smoke test
[0] Exit
Select an option: `;

  return new Promise((resolve) => {
    rl.question(menu, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function interactive() {
  const choice = await promptMenu();
  switch (choice) {
    case '1':
      await runHumanPreview();
      break;
    case '2':
      await runBuildOnly();
      break;
    case '3':
      await runAgentSmoke();
      break;
    case '4':
      await runBuildOnly();
      await runCommand(npmCmd, ['run', 'test:smoke']);
      break;
    case '0':
    case '':
      console.log('Goodbye!');
      break;
    default:
      console.error(`Unknown option "${choice}".`);
      process.exitCode = 1;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const modeIndex = args.findIndex((arg) => arg === '--mode');
  const modeValue = modeIndex !== -1 ? args[modeIndex + 1] : null;

  try {
    if (modeValue === 'human') {
      await runHumanPreview();
    } else if (modeValue === 'agent') {
      await runAgentSmoke();
    } else if (modeValue === 'build') {
      await runBuildOnly();
    } else {
      await interactive();
    }
  } catch (err) {
    console.error('\nWorkflow command failed:', err.message || err);
    process.exitCode = 1;
  }
}

main();
