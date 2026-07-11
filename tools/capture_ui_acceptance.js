#!/usr/bin/env node
const fs = require('fs');
const http = require('http');
const path = require('path');
const puppeteer = require('puppeteer-core');

const ROOT = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(ROOT, 'docs');
const OUT_DIR = path.join(ROOT, 'tools', 'ui_acceptance');
const PORT = Number(process.env.UI_CAPTURE_PORT || 18774);

const DESKTOP_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

function browserExecutablePath() {
  const candidates = [process.env.PUPPETEER_EXECUTABLE_PATH, process.env.CHROME_PATH].filter(Boolean);
  if (process.platform === 'darwin') candidates.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
  else if (process.platform === 'win32') {
    const pf = process.env.ProgramFiles || 'C:\\Program Files';
    const pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const local = process.env.LOCALAPPDATA || '';
    candidates.push(
      path.join(pf, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(pf86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      local && path.join(local, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(pf, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    );
  } else candidates.push('/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser');
  return candidates.find((candidate) => candidate && fs.existsSync(candidate));
}

function serveFile(filePath, res) {
  const mime = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.json': 'application/json',
  }[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime });
  fs.createReadStream(filePath).pipe(res);
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const requestPath = decodeURIComponent(req.url.split('?')[0]);
      const rel = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
      const filePath = path.resolve(DOCS_DIR, rel);
      if (!filePath.startsWith(DOCS_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      fs.stat(filePath, (error, stat) => {
        if (error || !stat.isFile()) {
          res.writeHead(404);
          res.end('Not Found');
          return;
        }
        serveFile(filePath, res);
      });
    });
    server.once('error', reject);
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

async function createPage(browser, config) {
  const page = await browser.newPage();
  const errors = [];
  const missing = [];
  await page.setViewport({ width: config.width, height: config.height, deviceScaleFactor: 1, isMobile: !!config.mobile, hasTouch: !!config.mobile });
  await page.setUserAgent(config.mobile ? MOBILE_UA : DESKTOP_UA);
  if (config.mobile) {
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, get: () => 5 });
    });
  }
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() === 404) missing.push(response.url());
  });
  await page.goto(`http://127.0.0.1:${PORT}/?ui-acceptance=1`, { waitUntil: 'networkidle0', timeout: 45000 });
  await page.waitForFunction(() => !!window.__leaderboardCapture__, { timeout: 15000 });
  await page.evaluate(() => document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve());
  await page.evaluate(() => window.__leaderboardCapture__.prepare('title'));
  await page.evaluate(() => window.__leaderboardCapture__.step(12, 1 / 60));

  const metrics = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const rect = canvas.getBoundingClientRect();
    const probe = document.createElement('canvas').getContext('2d');
    probe.font = '900 72px "M PLUS Rounded 1c", "PingFang SC", sans-serif';
    return {
      canvas: { width: Math.round(rect.width), height: Math.round(rect.height) },
      scale: Number((rect.width / canvas.width).toFixed(3)),
      fontProbe: probe.font,
      mobile: !!window.__mobileRuntimeInfo__?.isMobile,
    };
  });
  if (!metrics.fontProbe.includes('72px')) errors.push(`Canvas font shorthand rejected: ${metrics.fontProbe}`);
  if (metrics.mobile !== !!config.mobile) errors.push(`Runtime mode mismatch: expected mobile=${!!config.mobile}, got ${metrics.mobile}`);
  return { page, errors, missing, metrics };
}

async function screenshotCanvas(page, name) {
  await page.screenshot({ path: path.join(OUT_DIR, `${name}_page.png`), fullPage: true });
  const canvas = await page.$('canvas');
  if (!canvas) throw new Error('Canvas element missing');
  await canvas.screenshot({ path: path.join(OUT_DIR, `${name}.png`) });
}

async function clickCanvasLogical(page, x, y) {
  const canvas = await page.$('canvas');
  if (!canvas) throw new Error('Canvas element missing');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas bounding box missing');
  await page.mouse.click(box.x + x / 720 * box.width, box.y + y / 1280 * box.height);
}

async function verifyDesktopStartHitArea(page) {
  const dialogVisible = () => page.evaluate(() => {
    const confirm = document.querySelector('.hell-confirm');
    const backdrop = confirm && confirm.closest('.leaderboard-dialog-backdrop');
    return !!backdrop && getComputedStyle(backdrop).display !== 'none';
  });
  await clickCanvasLogical(page, 10, 1000);
  await new Promise((resolve) => setTimeout(resolve, 80));
  if (await dialogVisible()) throw new Error('Desktop blank title area incorrectly triggered Start');
  await clickCanvasLogical(page, 360, 1068);
  await new Promise((resolve) => setTimeout(resolve, 80));
  if (!(await dialogVisible())) throw new Error('Desktop Start CTA did not open the mode dialog');
  await page.evaluate(() => window.__leaderboardCapture__.prepare('title'));
}

async function captureScenario(browser, config) {
  const result = await createPage(browser, config);
  const { page, errors, missing, metrics } = result;
  try {
    await screenshotCanvas(page, `${config.prefix}_title_start`);
    await page.evaluate(() => window.__leaderboardCapture__.step(60, 1 / 60));
    await screenshotCanvas(page, `${config.prefix}_title_motion`);

    if (config.extra === 'panel') {
      await verifyDesktopStartHitArea(page);
      await page.evaluate(() => window.__leaderboardCapture__.prepare('panel'));
      await screenshotCanvas(page, `${config.prefix}_leaderboard`);
    } else if (config.extra === 'profile') {
      await page.evaluate(() => window.__leaderboardCapture__.prepare('name'));
      await page.screenshot({ path: path.join(OUT_DIR, `${config.prefix}_profile_dialog.png`), fullPage: true });
    } else if (config.extra === 'battle') {
      await page.keyboard.press('Enter');
      await new Promise((resolve) => setTimeout(resolve, 120));
      await page.keyboard.press('Enter');
      await new Promise((resolve) => setTimeout(resolve, 900));
      await screenshotCanvas(page, `${config.prefix}_battle_hud`);
    }
  } finally {
    await page.close();
  }
  if (missing.length) errors.push(`404 resources: ${missing.slice(0, 8).join(', ')}`);
  if (errors.length) throw new Error(`${config.prefix} failed:\n${errors.join('\n')}`);
  console.log(`${config.prefix}: canvas=${metrics.canvas.width}x${metrics.canvas.height} scale=${metrics.scale} mobile=${metrics.mobile}`);
}

async function main() {
  if (!fs.existsSync(path.join(DOCS_DIR, 'index.html'))) throw new Error('docs/index.html missing. Run npm run build:pages first.');
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const file of fs.readdirSync(OUT_DIR)) {
    if (file.endsWith('.png')) fs.rmSync(path.join(OUT_DIR, file), { force: true });
  }
  const executablePath = browserExecutablePath();
  if (!executablePath) throw new Error('Chrome or Edge executable not found.');

  let server;
  let browser;
  try {
    server = await startServer();
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required'],
    });
    await captureScenario(browser, { prefix: '01_desktop_1280x720', width: 1280, height: 720, mobile: false, extra: 'panel' });
    await captureScenario(browser, { prefix: '02_mobile_390x844', width: 390, height: 844, mobile: true, extra: 'profile' });
    await captureScenario(browser, { prefix: '03_mobile_battle_390x844', width: 390, height: 844, mobile: true, extra: 'battle' });
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server) await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
