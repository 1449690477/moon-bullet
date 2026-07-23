#!/usr/bin/env node
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const puppeteer = require('puppeteer-core');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_KIND = String(process.env.ICE_DRAGON_ULT_CAPTURE_SOURCE || 'root').toLowerCase();
const SOURCE_DIR = SOURCE_KIND === 'docs'
  ? path.join(ROOT, 'docs')
  : SOURCE_KIND === 'main' ? path.join(ROOT, 'moon-bullet-main') : ROOT;
const OUT_DIR = process.env.ICE_DRAGON_ULT_CAPTURE_OUT
  ? path.resolve(ROOT, process.env.ICE_DRAGON_ULT_CAPTURE_OUT)
  : path.join(ROOT, 'tools', 'ice_dragon_ultimate_acceptance');
const VIEWPORTS = [
  { id: 'desktop_1280x720_high', width: 1280, height: 720, mobile: false, quality: 'high' },
  { id: 'mobile_430x932_low', width: 430, height: 932, mobile: true, quality: 'low' },
];
const SCENES = [
  { id: 'summon', frames: [0, 8, 18] },
  { id: 'ingress', frames: [0, 8, 18] },
  { id: 'charge', frames: [0, 6, 12] },
  { id: 'breath-launch', frames: [0, 5, 10] },
  { id: 'breath-contact', frames: [0, 4, 8], slowCheck: true },
  { id: 'breath-grow', frames: [0, 8, 18], slowCheck: true },
  { id: 'breath-mid', frames: [0, 5, 10, 15, 20], slowCheck: true },
  { id: 'breath-late', frames: [0, 8, 16], slowCheck: true },
  { id: 'telegraph', frames: [0, 8, 18] },
  { id: 'meteor', frames: [0, 4, 10, 18] },
  { id: 'impact', frames: [0, 2, 6, 14, 26] },
  { id: 'aftermath', frames: [0, 12, 28] },
];

function chromePath() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].filter(Boolean);
  return candidates.find(fs.existsSync);
}

function mime(file) {
  return {
    '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
  }[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      const requestPath = decodeURIComponent(String(request.url || '/').split('?')[0]);
      const relative = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
      if (relative === 'favicon.ico') { response.writeHead(204); response.end(); return; }
      if (relative === 'sw.js') {
        response.writeHead(200, { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-store' });
        response.end('/* capture no-op */'); return;
      }
      let file = path.resolve(SOURCE_DIR, relative);
      if (!file.startsWith(`${SOURCE_DIR}${path.sep}`) && file !== SOURCE_DIR) {
        response.writeHead(403); response.end('Forbidden'); return;
      }
      if (!fs.existsSync(file) && relative.startsWith('assets_mobile/')) file = path.resolve(ROOT, 'docs', relative);
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
        response.writeHead(404, { 'Cache-Control': 'no-store' }); response.end('Not Found'); return;
      }
      response.writeHead(200, { 'Content-Type': mime(file), 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' });
      fs.createReadStream(file).pipe(response);
    });
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

async function canvasMetrics(page) {
  return page.evaluate(() => {
    const canvas = document.getElementById('game');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const stride = Math.max(1, Math.ceil(Math.sqrt(canvas.width * canvas.height / 160000)));
    let sampled = 0, nonBlack = 0, cold = 0, luma = 0, luma2 = 0;
    for (let y = 0; y < canvas.height; y += stride) {
      for (let x = 0; x < canvas.width; x += stride) {
        const offset = (y * canvas.width + x) * 4;
        const r = pixels[offset], g = pixels[offset + 1], b = pixels[offset + 2];
        const value = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        sampled++; luma += value; luma2 += value * value;
        if (Math.max(r, g, b) > 18) nonBlack++;
        if (b > r * 1.12 && g > r * 0.82 && b > 70) cold++;
      }
    }
    const mean = luma / Math.max(1, sampled);
    return {
      canvas: [canvas.width, canvas.height], sampled,
      nonBlackRatio: nonBlack / Math.max(1, sampled),
      coldPixelRatio: cold / Math.max(1, sampled),
      meanLuma: mean,
      lumaStdDev: Math.sqrt(Math.max(0, luma2 / Math.max(1, sampled) - mean * mean)),
    };
  });
}

async function run() {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const executablePath = chromePath();
  if (!executablePath) throw new Error('Chrome executable not found');
  const { server, port } = await startServer();
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-background-timer-throttling', '--autoplay-policy=no-user-gesture-required'],
  });
  const report = { source: SOURCE_KIND, captures: [], slowChecks: [], diagnostics: { pageErrors: [], consoleErrors: [], notFound: [], failedRequests: [] }, failures: [] };
  try {
    for (const viewport of VIEWPORTS) {
      const page = await browser.newPage();
      await page.evaluateOnNewDocument(() => {
        const nativeRequestAnimationFrame = window.requestAnimationFrame.bind(window);
        const control = { locked: false };
        window.__iceDragonRafControl = control;
        window.requestAnimationFrame = function controlledRequestAnimationFrame(callback) {
          return nativeRequestAnimationFrame((timestamp) => {
            if (control.locked && callback && callback.name === 'loop') {
              window.requestAnimationFrame(callback);
              return;
            }
            callback(timestamp);
          });
        };
      });
      await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1, isMobile: viewport.mobile, hasTouch: viewport.mobile });
      if (viewport.mobile) await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1');
      page.on('pageerror', error => report.diagnostics.pageErrors.push({ viewport: viewport.id, message: error.stack || error.message }));
      page.on('console', message => {
        if (message.type() === 'error') report.diagnostics.consoleErrors.push({ viewport: viewport.id, message: message.text() });
      });
      page.on('response', response => {
        if (response.status() === 404) report.diagnostics.notFound.push({ viewport: viewport.id, url: response.url() });
      });
      page.on('requestfailed', request => {
        if (request.failure()?.errorText !== 'net::ERR_ABORTED') report.diagnostics.failedRequests.push({ viewport: viewport.id, url: request.url(), reason: request.failure()?.errorText });
      });
      await page.goto(`http://127.0.0.1:${port}/?${viewport.mobile ? 'mobile=1' : 'desktop=1'}&perf=0`, { waitUntil: 'networkidle0', timeout: 60000 });
      await page.waitForFunction(() => window.__iceDragonUltimateCapture__?.setup && window.__iceDragonUltimateInternals__?.spec, { timeout: 30000 });
      await page.evaluate(() => window.__iceDragonUltimateCapture__.preload());
      await page.waitForFunction(() => {
        const status = window.__iceDragonUltimateCapture__.assetStatus();
        return status.pending.length === 0 && status.failed.length === 0 && status.missing.length === 0;
      }, { timeout: 30000 });
      const viewportDir = path.join(OUT_DIR, viewport.id);
      fs.mkdirSync(viewportDir, { recursive: true });
      for (const scene of SCENES) {
        let previousFrame = 0;
        let snapshot = await page.evaluate(({ sceneId, quality }) => {
          if (window.__iceDragonRafControl) window.__iceDragonRafControl.locked = true;
          return window.__iceDragonUltimateCapture__.setup(sceneId, { quality });
        }, { sceneId: scene.id, quality: viewport.quality });
        const initialBullets = new Map((snapshot.captureBullets || []).map(bullet => [bullet.id, bullet]));
        for (const frame of scene.frames) {
          const delta = frame - previousFrame;
          if (delta > 0) snapshot = await page.evaluate(frames => window.__iceDragonUltimateCapture__.step(frames, 1 / 60, true), delta);
          previousFrame = frame;
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          const metrics = await canvasMetrics(page);
          const fileName = `${scene.id}_f${String(frame).padStart(3, '0')}.png`;
          const file = path.join(viewportDir, fileName);
          const canvas = await page.$('#game');
          await canvas.screenshot({ path: file, type: 'png', omitBackground: false });
          await canvas.dispose();
          const bytes = fs.statSync(file).size;
          const item = { viewport: viewport.id, scene: scene.id, frame, file: path.relative(OUT_DIR, file), bytes, metrics, snapshot };
          report.captures.push(item);
          if (bytes < 5000 || metrics.nonBlackRatio < 0.01 || metrics.lumaStdDev < 2) report.failures.push(`${viewport.id}/${scene.id}/${frame}: blank capture`);
          if ((snapshot.assetStatus?.failed || []).length || (snapshot.assetStatus?.missing || []).length || (snapshot.assetStatus?.fallbacks || []).length) {
            report.failures.push(`${viewport.id}/${scene.id}/${frame}: asset failure/fallback ${JSON.stringify(snapshot.assetStatus)}`);
          }
        }
        const sceneCaptures = report.captures.filter(capture => (
          capture.viewport === viewport.id && capture.scene === scene.id
        ));
        if (scene.id === 'charge') {
          if (sceneCaptures.some(capture => (
            capture.snapshot.breath?.front > 0.001
            || capture.snapshot.breath?.contact > 0.001
            || capture.snapshot.breath?.growth > 0.001
          ))) report.failures.push(`${viewport.id}/${scene.id}: impact state appeared during charge`);
        }
        if (scene.id === 'breath-launch') {
          if (sceneCaptures.some(capture => capture.snapshot.breath?.contact > 0.001)) {
            report.failures.push(`${viewport.id}/${scene.id}: impact appeared before breath contact`);
          }
          if (!(sceneCaptures.at(-1)?.snapshot.breath?.front > 0.30
            && sceneCaptures.at(-1)?.snapshot.breath?.front < 1)) {
            report.failures.push(`${viewport.id}/${scene.id}: advancing front was not captured`);
          }
        }
        if (scene.id === 'breath-contact' && !(sceneCaptures.at(-1)?.snapshot.breath?.contact > 0.30)) {
          report.failures.push(`${viewport.id}/${scene.id}: contact envelope did not open`);
        }
        if (scene.id === 'breath-grow' && !(sceneCaptures.at(-1)?.snapshot.breath?.growth > 0.30)) {
          report.failures.push(`${viewport.id}/${scene.id}: frost field did not visibly enter growth phase`);
        }
        if (scene.slowCheck) {
          const finalBullets = new Map((snapshot.captureBullets || []).map(bullet => [bullet.id, bullet]));
          const initialInside = initialBullets.get('inside');
          const initialOutside = initialBullets.get('outside');
          const finalInside = finalBullets.get('inside');
          const finalOutside = finalBullets.get('outside');
          if (!initialInside || !initialOutside || !finalInside || !finalOutside) {
            report.failures.push(`${viewport.id}/${scene.id}: seeded slow-check bullets missing`);
          } else {
            const insideMove = Math.hypot(finalInside.x - initialInside.x, finalInside.y - initialInside.y);
            const outsideMove = Math.hypot(finalOutside.x - initialOutside.x, finalOutside.y - initialOutside.y);
            const ratio = insideMove / Math.max(0.001, outsideMove);
            report.slowChecks.push({ viewport: viewport.id, scene: scene.id, insideMove, outsideMove, ratio, locked: snapshot.breath?.locked, radius: snapshot.breath?.radius });
            if (!snapshot.breath?.locked || snapshot.breath?.radius !== 330 || ratio > 0.32 || ratio < 0.16) {
              report.failures.push(`${viewport.id}/${scene.id}: frost slow ratio ${ratio.toFixed(3)} (expected 0.16..0.32), locked=${snapshot.breath?.locked}, radius=${snapshot.breath?.radius}`);
            }
          }
        }
      }
      const status = await page.evaluate(() => ({
        spec: window.__iceDragonUltimateInternals__.spec(),
        assets: window.__iceDragonUltimateCapture__.assetStatus(),
        readyKeys: window.__iceDragonUltimateCapture__.readyKeys(),
      }));
      report[viewport.id] = status;
      if (status.readyKeys.length !== status.spec.assets.keys.length) report.failures.push(`${viewport.id}: only ${status.readyKeys.length}/${status.spec.assets.keys.length} assets ready`);
      await page.close();
    }
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
  if (report.diagnostics.pageErrors.length || report.diagnostics.notFound.length || report.diagnostics.failedRequests.length) {
    report.failures.push(`browser diagnostics: ${JSON.stringify(report.diagnostics)}`);
  }
  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  const lines = [
    '# Ice Crystal Dragon Ultimate Visual Acceptance', '',
    `- Source: ${SOURCE_KIND}`,
    `- Captures: ${report.captures.length}`,
    `- Failures: ${report.failures.length}`,
    `- Reference contact sheet: ../../assets/companions/ice_crystal_dragon/ultimate/contact_sheet_black.png`, '',
    '## Key Frames', '',
  ];
  for (const viewport of VIEWPORTS) {
    lines.push(`### ${viewport.id}`, '');
    for (const scene of ['summon', 'charge', 'breath-launch', 'breath-contact', 'breath-grow', 'breath-mid', 'meteor', 'impact', 'aftermath']) {
      const item = report.captures.find(capture => capture.viewport === viewport.id && capture.scene === scene && capture.frame === SCENES.find(entry => entry.id === scene).frames.at(-1));
      if (item) lines.push(`![${viewport.id} ${scene}](${item.file})`, '');
    }
  }
  if (report.failures.length) lines.push('## Failures', '', ...report.failures.map(failure => `- ${failure}`), '');
  fs.writeFileSync(path.join(OUT_DIR, 'REPORT.md'), `${lines.join('\n')}\n`);
  console.log(`captures=${report.captures.length}`);
  console.log(`report=${path.relative(ROOT, path.join(OUT_DIR, 'REPORT.md'))}`);
  if (report.failures.length) throw new Error(report.failures.join('\n'));
}

run().catch(error => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
