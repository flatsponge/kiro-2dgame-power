import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { parseArgs, playtest, statusLabel, validateConfig } from '../skills/playtest-2d/scripts/playtest.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const html = path.join(dir, 'tiny-game.html');

test('accepts a local HTML target and rejects unsafe or ambiguous targets', () => {
  const options = parseArgs(['--file', html]);
  assert.match(options.target, /^file:\/\//);
  assert.throws(() => parseArgs(['--url', 'javascript:alert(1)']), /http\(s\)/);
  assert.throws(() => parseArgs(['--url', 'https://user:pass@example.com']), /credentials/);
  assert.throws(() => parseArgs(['--file', html, '--url', 'https://example.com']), /exactly one/);
  assert.throws(() => parseArgs(['--file', path.join(dir, 'missing.html')]), /No HTML file/);
});

test('validates safe declarative steps and bounds before opening a browser', () => {
  assert.equal(validateConfig({ steps: [{ name: 'right', action: 'key', key: 'ArrowRight', count: 3 }] }).steps.length, 1);
  assert.throws(() => validateConfig({ steps: [{ name: 'run', action: 'evaluate', code: 'location.href' }] }), /unknown field|action must be/);
  assert.throws(() => validateConfig({ steps: [{ name: 'pause', action: 'wait', ms: 60000 }] }), /0 to 5000/);
  assert.throws(() => validateConfig({ viewport: { width: 0, height: 540 } }), /width/);
  assert.throws(() => validateConfig({ steps: [{ name: 'wrong', action: 'expect', selector: '#score' }] }), /exactly one/);
});

test('a default load-only check cannot be confused with gameplay verification', () => {
  assert.deepEqual(parseArgs(['--file', html]).settings, {});
  assert.equal(statusLabel({ passed: true, coverage: { mode: 'load-only' } }), 'LOAD ONLY (no gameplay steps)');
  assert.equal(statusLabel({ passed: true, coverage: { mode: 'configured-steps' } }), 'PASS (configured steps)');
});

function runtimePlaywright() {
  try {
    const modulePath = execFileSync(process.execPath, ['-p', "require.resolve('playwright')"], { encoding: 'utf8' }).trim();
    return import(modulePath).then(module => module.default || module);
  } catch { return Promise.resolve(null); }
}

test('real browser playtest drives start, movement, restart, and mobile layout', async t => {
  const playwright = await runtimePlaywright();
  if (!playwright) return t.skip('Playwright is unavailable');
  try {
    const browser = await playwright.chromium.launch();
    await browser.close();
  } catch { return t.skip('Chromium is unavailable; run npx playwright install chromium'); }

  const temp = await mkdtemp(path.join(os.tmpdir(), 'game-playtest-'));
  try {
    const config = JSON.parse(await readFile(path.join(dir, 'example-scenario.json'), 'utf8'));
    const report = await playtest({ ...parseArgs(['--file', html]), settings: validateConfig(config), out: temp }, playwright);
    assert.equal(report.passed, true, JSON.stringify(report, null, 2));
    assert.equal(report.coverage.mode, 'configured-steps');
    assert.equal(report.steps.length, config.steps.length + 1);
    assert.equal((await readdir(temp)).filter(name => name.endsWith('.png')).length, config.steps.length + 1);
    assert.deepEqual(JSON.parse(await readFile(path.join(temp, 'report.json'), 'utf8')), report);

    const failDir = path.join(temp, 'error-run');
    const failing = await playtest({ ...parseArgs(['--file', html]), settings: validateConfig({
      steps: [{ name: 'crash', action: 'click', selector: '#error' }],
    }), out: failDir }, playwright);
    assert.equal(failing.passed, false);
    assert.match(failing.errors.page.join('\n'), /fixture game crash/);
    assert.equal((await readdir(failDir)).filter(name => name.endsWith('.png')).length, 2);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test('CLI reports invalid config without launching Chromium', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'game-playtest-config-'));
  try {
    const config = path.join(temp, 'config.json');
    await writeFile(config, '{"steps":[{"name":"bad","action":"eval"}]}');
    assert.throws(() => execFileSync(process.execPath, [
      path.join(dir, '../skills/playtest-2d/scripts/playtest.mjs'), '--file', html, '--config', config,
    ], { encoding: 'utf8', stdio: 'pipe' }), error => error.status === 2 && /action must be/.test(error.stderr));
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
