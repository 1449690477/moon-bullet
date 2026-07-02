#!/usr/bin/env node
const fs = require('fs');
const http = require('http');
const path = require('path');
const puppeteer = require('puppeteer-core');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'tools', 'tianyao_acceptance');
const PORT = Number(process.env.TIANYAO_CAPTURE_PORT || 18774);

const SCENES = [
  ['normal', '01_normal_procedural_flow.png', 48],
  ['impact', '02_normal_impact_particles.png', 36],
  ['overdrive', '03_overdrive_wide_particle_flow.png', 48],
  ['overdrive_impact', '04_overdrive_impact_particles.png', 36],
  ['chain', '05_chain_lightning_normal.png', 38],
  ['overdrive_chain', '06_chain_lightning_overdrive.png', 38],
  ['hand_warn', '07_hand_side_warning.png', 6],
  ['hand_portal', '08_hand_portal_open.png', 6],
  ['hand_emerge', '09_hand_emerge.png', 6],
  ['hand_charge', '10_hand_palm_charge.png', 6],
  ['hand_fire', '11_hand_celestial_lancer.png', 10],
  ['hand_retract', '12_hand_retract.png', 6],
];

function browserExecutablePath() {
  const candidates = [process.env.PUPPETEER_EXECUTABLE_PATH, process.env.CHROME_PATH].filter(Boolean);
  if (process.platform === 'darwin') {
    candidates.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
  } else if (process.platform === 'win32') {
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
      const filePath = path.resolve(ROOT, rel);
      if (!filePath.startsWith(ROOT)) {
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
    const cap = window.__tianyaoCapture__;
    if (!cap) throw new Error('__tianyaoCapture__ is not available');
    const prepared = cap.prepare(scene);
    const stepped = cap.step(frames, 1 / 60);
    const canvas = document.getElementById('game');
    return { prepared, stepped, dataUrl: canvas.toDataURL('image/png') };
  }, { scene, frames });
  const base64 = result.dataUrl.replace(/^data:image\/png;base64,/, '');
  const filePath = path.join(OUT_DIR, fileName);
  fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
  const size = fs.statSync(filePath).size;
  if (size < 20_000) throw new Error(`${fileName} looks too small (${size} bytes)`);
  console.log(`${fileName}: scene=${scene} units=${result.stepped.units} flows=${result.stepped.flows.join(',')} overT=${result.stepped.overT.toFixed(2)}`);
}

async function main() {
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
    await page.waitForFunction(() => !!window.__tianyaoCapture__, { timeout: 15000 });
    await new Promise(resolve => setTimeout(resolve, 1200));

    const spec = await page.evaluate(() => window.__tianyaoCapture__.beamSpec());
    if (!spec.usesProceduralBody || spec.midSectionStretchTexture) {
      throw new Error(`Unexpected Tianyao beam spec: ${JSON.stringify(spec)}`);
    }

    for (const [scene, fileName, frames] of SCENES) {
      await captureScene(page, scene, fileName, frames);
    }

    if (errors.length) {
      throw new Error(`Page errors during Tianyao capture:\n${errors.slice(0, 8).join('\n')}`);
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
