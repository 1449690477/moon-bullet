#!/usr/bin/env node
const fs = require('fs');
const http = require('http');
const path = require('path');
const puppeteer = require('puppeteer-core');

const ROOT = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(ROOT, 'docs');
const OUT_DIR = path.join(ROOT, 'tools', 'mother_hive_crystal_acceptance');
const PORT = Number(process.env.MHR_CRYSTAL_CAPTURE_PORT || 18769);

function browserExecutablePath() {
  const candidates = [process.env.PUPPETEER_EXECUTABLE_PATH, process.env.CHROME_PATH].filter(Boolean);
  if (process.platform === 'darwin') {
    candidates.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
  } else if (process.platform === 'win32') {
    const pf = process.env.ProgramFiles || 'C:\\Program Files';
    const pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    candidates.push(
      path.join(pf, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(pf86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(pf, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(pf86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    );
  } else {
    candidates.push('/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser');
  }
  return candidates.find(candidate => candidate && fs.existsSync(candidate));
}

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
  }[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime });
  fs.createReadStream(filePath).pipe(res);
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const rel = req.url === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
      const filePath = path.resolve(DOCS_DIR, rel);
      if (!filePath.startsWith(DOCS_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      fs.stat(filePath, (err, stat) => {
        if (err || !stat.isFile()) {
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

async function capturePhase(page, phase, fileName, frames) {
  const result = await page.evaluate(async ({ phase, frames }) => {
    const cap = window.__motherHiveCrystalCapture__;
    if (!cap) throw new Error('__motherHiveCrystalCapture__ is not available');
    const prepared = cap.prepare(phase);
    const stepped = cap.step(1 / 60, frames);
    const canvas = document.getElementById('game');
    return { prepared, stepped, dataUrl: canvas.toDataURL('image/png') };
  }, { phase, frames });
  const base64 = result.dataUrl.replace(/^data:image\/png;base64,/, '');
  const filePath = path.join(OUT_DIR, fileName);
  fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
  const size = fs.statSync(filePath).size;
  if (size < 20_000) throw new Error(`${fileName} looks too small (${size} bytes)`);
  console.log(`${fileName}: phase=${phase} shots=${result.stepped.shots} marks=${result.stepped.marks} berserk=${result.stepped.berserk}`);
}

async function main() {
  if (!fs.existsSync(path.join(DOCS_DIR, 'index.html'))) {
    throw new Error('docs/index.html missing. Run npm run build:pages first.');
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const file of fs.readdirSync(OUT_DIR)) {
    if (/^\d{2}_.+\.png$/.test(file)) fs.rmSync(path.join(OUT_DIR, file), { force: true });
  }
  const executablePath = browserExecutablePath();
  if (!executablePath) throw new Error('Chrome or Edge executable not found.');

  let server;
  let browser;
  const errors = [];
  try {
    server = await startServer();
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required'],
    });
    const page = await browser.newPage();
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        errors.push(text);
        console.error(`[page error] ${text}`);
      }
    });
    page.on('pageerror', err => errors.push(err.message));
    await page.setViewport({ width: 720, height: 1280, deviceScaleFactor: 1 });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForFunction(() => !!window.__motherHiveCrystalCapture__, { timeout: 15000 });
    await new Promise(resolve => setTimeout(resolve, 1500));

    await capturePhase(page, 'normal_left', '01_normal_left_crystal_fire.png', 24);
    await capturePhase(page, 'normal_right', '02_normal_right_crystal_fire.png', 24);
    await capturePhase(page, 'normal_coverage', '03_normal_half_coverage.png', 28);
    await capturePhase(page, 'berserk_full', '04_berserk_full_firepower.png', 18);
    await capturePhase(page, 'life_mark', '05_life_mark_attached.png', 8);
    await capturePhase(page, 'life_burst', '06_life_mark_ribbon_burst.png', 6);

    if (errors.length) {
      throw new Error(`Page errors during capture:\n${errors.slice(0, 6).join('\n')}`);
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server) await new Promise(resolve => server.close(resolve));
  }
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
