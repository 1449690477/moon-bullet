#!/usr/bin/env node
const fs = require('fs');
const http = require('http');
const path = require('path');
const puppeteer = require('puppeteer-core');

const ROOT = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(ROOT, 'docs');
const OUT_DIR = path.join(ROOT, 'tools', 'suiyi_boss_acceptance');
const PORT = Number(process.env.SUIYI_CAPTURE_PORT || 18769);

const SCENES = [
  ['idle', '01_idle_map_rotation.png', 45],
  ['rain', '02_code_arrow_binary_rain.png', 54],
  ['ring', '03_function_call_ring.png', 58],
  ['syntax', '04_syntax_error_window.png', 50],
  ['recursive', '05_recursive_spiral.png', 62],
  ['deadlock', '06_memory_leak_deadlock_threads.png', 56],
  ['hotfix', '07_overclock_hotfix_rewrite.png', 58],
  ['crash', '08_system_crash.png', 70],
  ['snake', '09_code_snake_binary_gate.png', 64],
  ['virus', '10_virus_lock_cross.png', 64],
  ['death_clear', '11_death_clears_binary_gate.png', 38],
  ['layering', '12_enemy_bullet_above_player.png', 8],
];

function browserExecutablePath() {
  const candidates = [process.env.PUPPETEER_EXECUTABLE_PATH, process.env.CHROME_PATH].filter(Boolean);
  if (process.platform === 'win32') {
    const pf = process.env.ProgramFiles || 'C:\\Program Files';
    const pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const local = process.env.LOCALAPPDATA || '';
    candidates.push(
      path.join(pf, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(pf86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      local && path.join(local, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(pf, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(pf86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    );
  } else if (process.platform === 'darwin') {
    candidates.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
  } else {
    candidates.push('/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser');
  }
  return candidates.find((candidate) => candidate && fs.existsSync(candidate));
}

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.json': 'application/json',
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

async function captureScene(page, scene, fileName, frames) {
  const result = await page.evaluate(async ({ scene, frames }) => {
    const cap = window.__suiyiBossCapture__;
    if (!cap) throw new Error('__suiyiBossCapture__ is not available');
    const prepared = cap.prepare(scene);
    const stepped = cap.step(frames, 1 / 60);
    const canvas = document.getElementById('game');
    return { prepared, stepped, dataUrl: canvas.toDataURL('image/png') };
  }, { scene, frames });
  const base64 = result.dataUrl.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(path.join(OUT_DIR, fileName), Buffer.from(base64, 'base64'));
  console.log(`${fileName}: scene=${scene} phase=${result.stepped.bossPhase} map=${result.stepped.map} bullets=${result.stepped.bullets} hazards=${result.stepped.hazards}`);
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
    page.on('pageerror', (err) => {
      errors.push(err.message);
      console.error(`[pageerror] ${err.message}`);
    });
    await page.setViewport({ width: 720, height: 1280, deviceScaleFactor: 1 });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForFunction(() => !!window.__suiyiBossCapture__, { timeout: 15000 });
    await new Promise((resolve) => setTimeout(resolve, 1200));

    for (const [scene, fileName, frames] of SCENES) {
      await captureScene(page, scene, fileName, frames);
    }

    if (errors.length) {
      throw new Error(`Page errors during Suiyi capture:\n${errors.slice(0, 8).join('\n')}`);
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server) await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
