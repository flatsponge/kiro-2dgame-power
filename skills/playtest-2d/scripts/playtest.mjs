#!/usr/bin/env node

// Small, project-local browser check for 2D games. No test runner or server is bundled.
import { createRequire } from 'node:module';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const HELP = `Usage:
  node playtest.mjs --url http://localhost:5173 [--config playtest.json] [--out playtest-report]
  node playtest.mjs --file ./index.html [--config playtest.json] [--out playtest-report]

Open the report.json and screenshots in the output directory. An empty steps list is
reported as LOAD ONLY, since it does not test gameplay. Exit 0 means all configured
checks passed, 1 means a browser/game check failed, and 2 means setup or input failed.

Config example:
{
  "viewport": { "width": 960, "height": 540 },
  "readySelector": "canvas",
  "steps": [
    { "name": "start", "action": "click", "selector": "#start" },
    { "name": "move", "action": "key", "key": "ArrowRight", "count": 3, "focus": "canvas" },
    { "name": "restart", "action": "click", "selector": "#restart" },
    { "name": "score reset", "action": "expect", "selector": "#score", "text": "0" },
    { "name": "mobile", "action": "resize", "width": 390, "height": 844 }
  ]
}

Each step gets a screenshot. Optional waitMs (0..5000) lets an animation settle.
Actions: click(selector), key(key, count?, focus?), resize(width,height),
expect(selector,text? or visible?), wait(ms), screenshot.
Default checks fail on uncaught page errors, console errors, and failed/HTTP 4xx/5xx requests.
Set failOnConsoleError, failOnPageError, or failOnNetworkError to false if intentional.
`;

function plainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function allowKeys(value, allowed, label) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new Error(`${label}: unknown field ${JSON.stringify(key)}`);
  }
}

function selector(value, label) {
  if (typeof value !== 'string' || !value.trim() || value.length > 256) {
    throw new Error(`${label} must be a nonempty selector (at most 256 characters)`);
  }
}

function integer(value, min, max, label) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${label} must be an integer from ${min} to ${max}`);
  }
}

function viewport(value, label) {
  if (!plainObject(value)) throw new Error(`${label} must be an object`);
  allowKeys(value, ['width', 'height'], label);
  integer(value.width, 200, 4096, `${label}.width`);
  integer(value.height, 200, 4096, `${label}.height`);
}

export function validateConfig(value) {
  if (!plainObject(value)) throw new Error('config must be a JSON object');
  allowKeys(value, ['viewport', 'readySelector', 'steps', 'failOnConsoleError', 'failOnPageError', 'failOnNetworkError'], 'config');
  if (value.viewport !== undefined) viewport(value.viewport, 'viewport');
  if (value.readySelector !== undefined) selector(value.readySelector, 'readySelector');
  for (const flag of ['failOnConsoleError', 'failOnPageError', 'failOnNetworkError']) {
    if (value[flag] !== undefined && typeof value[flag] !== 'boolean') {
      throw new Error(`${flag} must be true or false`);
    }
  }
  if (value.steps !== undefined && (!Array.isArray(value.steps) || value.steps.length > 40)) {
    throw new Error('steps must be an array with at most 40 entries');
  }

  (value.steps || []).forEach((step, index) => {
    const label = `steps[${index}]`;
    if (!plainObject(step)) throw new Error(`${label} must be an object`);
    allowKeys(step, ['name', 'action', 'selector', 'key', 'count', 'focus', 'width', 'height', 'visible', 'text', 'ms', 'waitMs'], label);
    if (typeof step.name !== 'string' || !step.name.trim() || step.name.length > 80) {
      throw new Error(`${label}.name must be 1..80 characters`);
    }
    if (step.waitMs !== undefined) integer(step.waitMs, 0, 5000, `${label}.waitMs`);
    switch (step.action) {
      case 'click':
        selector(step.selector, `${label}.selector`);
        break;
      case 'key':
        if (typeof step.key !== 'string' || !/^[\w+ -]{1,48}$/.test(step.key)) {
          throw new Error(`${label}.key must be a Playwright key such as ArrowLeft or Space`);
        }
        if (step.count !== undefined) integer(step.count, 1, 20, `${label}.count`);
        if (step.focus !== undefined) selector(step.focus, `${label}.focus`);
        break;
      case 'resize':
        viewport({ width: step.width, height: step.height }, label);
        break;
      case 'expect':
        selector(step.selector, `${label}.selector`);
        if ((step.text === undefined) === (step.visible === undefined)) {
          throw new Error(`${label} requires exactly one of text or visible`);
        }
        if (step.text !== undefined && typeof step.text !== 'string') {
          throw new Error(`${label}.text must be a string`);
        }
        if (step.visible !== undefined && typeof step.visible !== 'boolean') {
          throw new Error(`${label}.visible must be true or false`);
        }
        break;
      case 'wait':
        integer(step.ms, 0, 5000, `${label}.ms`);
        break;
      case 'screenshot':
        break;
      default:
        throw new Error(`${label}.action must be click, key, resize, expect, wait, or screenshot`);
    }
  });

  return value;
}

export function parseArgs(args) {
  const options = {};
  const flags = { '--url': 'url', '--file': 'file', '--config': 'config', '--out': 'out' };
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (flag === '--help' || flag === '-h') return { help: true };
    const key = flags[flag];
    if (!key) throw new Error(`Unknown option ${flag}; use --help`);
    if (options[key] !== undefined) throw new Error(`${flag} was supplied twice`);
    const value = args[++index];
    if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value`);
    options[key] = value;
  }
  if (Boolean(options.url) === Boolean(options.file)) {
    throw new Error('Pass exactly one of --url or --file');
  }
  if (options.url) {
    let url;
    try { url = new URL(options.url); } catch { throw new Error('--url must be a valid http:// or https:// URL'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      throw new Error('--url must be http(s) and must not contain credentials');
    }
    options.target = url.href;
  } else {
    const file = path.resolve(options.file);
    if (!existsSync(file) || !statSync(file).isFile()) throw new Error(`No HTML file at ${file}`);
    if (path.extname(file).toLowerCase() !== '.html') throw new Error('--file must point to an .html file');
    options.target = pathToFileURL(file).href;
  }
  options.out = path.resolve(options.out || 'playtest-report');
  if (options.config) {
    const configPath = path.resolve(options.config);
    if (!existsSync(configPath) || !statSync(configPath).isFile()) throw new Error(`No config file at ${configPath}`);
    try { options.settings = validateConfig(JSON.parse(readFileSync(configPath, 'utf8'))); }
    catch (error) { throw new Error(`Invalid config ${configPath}: ${error.message}`); }
  } else options.settings = validateConfig({});
  return options;
}

function projectPlaywright() {
  const projectRequire = createRequire(path.join(process.cwd(), 'package.json'));
  try { return projectRequire('playwright'); }
  catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
  }
  try { return createRequire(import.meta.url)('playwright'); }
  catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
    throw new Error('Playwright is unavailable. In your game project run: npm install -D playwright && npx playwright install chromium');
  }
}

function safeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'step';
}

async function act(page, step) {
  switch (step.action) {
    case 'click':
      await page.locator(step.selector).click({ timeout: 5000 });
      break;
    case 'key':
      if (step.focus) await page.locator(step.focus).focus({ timeout: 5000 });
      for (let i = 0; i < (step.count || 1); i++) await page.keyboard.press(step.key);
      break;
    case 'resize':
      await page.setViewportSize({ width: step.width, height: step.height });
      break;
    case 'expect': {
      const item = page.locator(step.selector);
      if (step.text !== undefined) {
        const deadline = Date.now() + 5000;
        let actual;
        do {
          try { actual = (await item.textContent({ timeout: Math.min(500, Math.max(1, deadline - Date.now())) }))?.trim(); }
          catch { actual = undefined; }
          if (actual === step.text) break;
          if (Date.now() < deadline) await page.waitForTimeout(50);
        } while (Date.now() < deadline);
        if (actual !== step.text) throw new Error(`Expected ${step.selector} text ${JSON.stringify(step.text)}, got ${JSON.stringify(actual)}`);
      } else {
        await item.waitFor({ state: step.visible ? 'visible' : 'hidden', timeout: 5000 });
      }
      break;
    }
    case 'wait':
      await page.waitForTimeout(step.ms);
      break;
    case 'screenshot':
      break;
  }
  await page.waitForTimeout(step.waitMs ?? (step.action === 'wait' ? 0 : 200));
}

export async function playtest(options, playwright = projectPlaywright()) {
  const settings = options.settings;
  const report = {
    target: options.target,
    startedAt: new Date().toISOString(),
    viewport: settings.viewport || { width: 960, height: 540 },
    coverage: { mode: (settings.steps || []).length ? 'configured-steps' : 'load-only', configuredSteps: (settings.steps || []).length },
    steps: [],
    errors: { page: [], console: [], network: [] },
    passed: false,
  };
  await mkdir(options.out, { recursive: true });
  let browser;
  try {
    try { browser = await playwright.chromium.launch({ headless: true }); }
    catch (error) {
      throw new Error(`Could not launch Chromium: ${error.message.split('\n')[0]}. Run: npx playwright install chromium`);
    }
    const context = await browser.newContext({ viewport: report.viewport });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.page.push(String(error)));
    page.on('crash', () => report.errors.page.push('Browser page crashed'));
    page.on('console', message => {
      if (message.type() === 'error') report.errors.console.push(message.text());
    });
    page.on('requestfailed', request => {
      report.errors.network.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText || 'failed'}`);
    });
    page.on('response', response => {
      if (response.status() >= 400) report.errors.network.push(`${response.status()} ${response.url()}`);
    });

    const checks = [{ name: 'initial', action: 'load' }, ...(settings.steps || [])];
    for (let index = 0; index < checks.length; index++) {
      const step = checks[index];
      const entry = { name: step.name, action: step.action, passed: false };
      report.steps.push(entry);
      try {
        if (index === 0) {
          const response = await page.goto(options.target, { waitUntil: 'domcontentloaded', timeout: 15000 });
          if (response && response.status() >= 400) throw new Error(`Navigation returned HTTP ${response.status()}`);
          if (settings.readySelector) await page.locator(settings.readySelector).waitFor({ state: 'visible', timeout: 10000 });
          await page.waitForTimeout(250);
        } else await act(page, step);
        entry.passed = true;
      } catch (error) {
        entry.error = error.message;
      }
      const file = `${String(index).padStart(2, '0')}-${safeName(step.name)}.png`;
      try {
        await page.screenshot({ path: path.join(options.out, file), fullPage: false, timeout: 5000 });
        entry.screenshot = file;
      } catch (error) {
        entry.passed = false;
        entry.error = [entry.error, `Screenshot failed: ${error.message.split('\n')[0]}`].filter(Boolean).join('; ');
      }
      if (!entry.passed) break;
    }
    report.passed = report.steps.every(step => step.passed)
      && (settings.failOnPageError === false || report.errors.page.length === 0)
      && (settings.failOnConsoleError === false || report.errors.console.length === 0)
      && (settings.failOnNetworkError === false || report.errors.network.length === 0);
    report.finishedAt = new Date().toISOString();
    await writeFile(path.join(options.out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    return report;
  } finally {
    if (browser) await browser.close();
  }
}

export function statusLabel(report) {
  if (!report.passed) return 'FAIL';
  return report.coverage.mode === 'load-only' ? 'LOAD ONLY (no gameplay steps)' : 'PASS (configured steps)';
}

async function main() {
  let options;
  try { options = parseArgs(process.argv.slice(2)); }
  catch (error) { console.error(`Input error: ${error.message}`); process.exitCode = 2; return; }
  if (options.help) { console.log(HELP); return; }
  try {
    const report = await playtest(options);
    console.log(`${statusLabel(report)}: ${path.join(options.out, 'report.json')}`);
    for (const step of report.steps.filter(value => !value.passed)) console.error(`${step.name}: ${step.error}`);
    for (const [kind, errors] of Object.entries(report.errors)) {
      for (const message of errors) console.error(`${kind}: ${message}`);
    }
    if (!report.passed) process.exitCode = 1;
  } catch (error) {
    console.error(`Setup error: ${error.message}`);
    process.exitCode = 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
