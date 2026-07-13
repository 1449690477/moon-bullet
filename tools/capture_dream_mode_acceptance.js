#!/usr/bin/env node
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawnSync } = require('child_process');
const puppeteer = require('puppeteer-core');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DIR = process.env.DREAM_CAPTURE_SOURCE === 'docs' ? path.join(ROOT, 'docs') : ROOT;
const OUT_DIR = path.join(ROOT, 'tools', 'dream_mode_acceptance');
const PORT = Number(process.env.DREAM_CAPTURE_PORT || 18786);
const PERF_SECONDS = Math.max(1, Number(process.env.DREAM_PERF_SECONDS || 60));
const PERF_CPU_RATE = Math.max(1, Number(process.env.DREAM_PERF_CPU_RATE || 1));
const EXPECTED = { enemyCap: 6, bulletCap: 96, warningCap: 4, laserCap: 4 };

const VIEWPORTS = [
  { id: 'desktop_1280x720', width: 1280, height: 720, mobile: false },
  { id: 'mobile_390x844', width: 390, height: 844, mobile: true },
  { id: 'mobile_430x932', width: 430, height: 932, mobile: true },
];

const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const DESKTOP_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

function chromePath() {
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
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.json': 'application/json',
  }[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-store' });
  fs.createReadStream(filePath).pipe(res);
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const requestPath = decodeURIComponent(req.url.split('?')[0]);
      const relative = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
      const filePath = path.resolve(SOURCE_DIR, relative);
      if (filePath !== SOURCE_DIR && !filePath.startsWith(`${SOURCE_DIR}${path.sep}`)) {
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

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function cleanOutput() {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function createPage(browser, viewport, diagnostics) {
  const page = await browser.newPage();
  await page.setViewport({
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    isMobile: viewport.mobile,
    hasTouch: viewport.mobile,
  });
  await page.setUserAgent(viewport.mobile ? MOBILE_UA : DESKTOP_UA);
  if (PERF_CPU_RATE > 1) await page.emulateCPUThrottling(PERF_CPU_RATE);
  if (viewport.mobile) {
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, get: () => 5 });
    });
  }
  page.on('pageerror', (error) => diagnostics.errors.push(`${viewport.id}: ${error.stack || error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') diagnostics.errors.push(`${viewport.id}: ${message.text()}`);
  });
  page.on('response', (response) => {
    if (response.status() === 404 && response.url().startsWith(`http://127.0.0.1:${PORT}/`) && !response.url().endsWith('/favicon.ico')) diagnostics.missing.push(response.url());
  });
  page.on('requestfailed', (request) => {
    if (request.url().startsWith(`http://127.0.0.1:${PORT}/`)) diagnostics.requestFailures.push(`${request.url()} :: ${request.failure()?.errorText || 'failed'}`);
  });
  await page.goto(`http://127.0.0.1:${PORT}/?dream-acceptance=1`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => window.__dreamModeCapture__ && window.__dreamModeInternals__, { timeout: 30000 });
  await page.evaluate(() => document.fonts?.ready || Promise.resolve());
  return page;
}

function count(snapshot, names) {
  for (const name of names) {
    const value = snapshot?.[name];
    if (Array.isArray(value)) return value.length;
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

function validateSnapshot(snapshot, label) {
  const failures = [];
  const enemies = count(snapshot, ['enemyCount', 'enemies']);
  const bullets = count(snapshot, ['logicalBulletCount', 'enemyBulletCount', 'enemyBullets', 'bullets']);
  const warnings = count(snapshot, ['warningCount', 'warnings']);
  const lasers = count(snapshot, ['laserCount', 'lasers']);
  if (enemies > EXPECTED.enemyCap) failures.push(`${label}: enemies ${enemies} > ${EXPECTED.enemyCap}`);
  if (bullets > EXPECTED.bulletCap) failures.push(`${label}: bullets ${bullets} > ${EXPECTED.bulletCap}`);
  if (warnings > EXPECTED.warningCap) failures.push(`${label}: warnings ${warnings} > ${EXPECTED.warningCap}`);
  if (lasers > EXPECTED.laserCap) failures.push(`${label}: lasers ${lasers} > ${EXPECTED.laserCap}`);
  if (Array.isArray(snapshot?.layoutIssues) && snapshot.layoutIssues.length) {
    failures.push(`${label}: UI layout issues: ${snapshot.layoutIssues.join(', ')}`);
  }
  if (snapshot?.fallbacks?.length) failures.push(`${label}: visual fallbacks active: ${snapshot.fallbacks.join(', ')}`);
  return { failures, counts: { enemies, bullets, warnings, lasers } };
}

async function canvasMetrics(page) {
  return page.evaluate(() => {
    const canvas = document.getElementById('game') || document.querySelector('canvas');
    if (!canvas) throw new Error('game canvas missing');
    const ctx = canvas.getContext('2d');
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const stride = Math.max(1, Math.floor(Math.min(canvas.width, canvas.height) / 120));
    let samples = 0;
    let visible = 0;
    let bright = 0;
    let darkOutline = 0;
    let hash = 2166136261 >>> 0;
    for (let y = 0; y < canvas.height; y += stride) {
      for (let x = 0; x < canvas.width; x += stride) {
        const i = (y * canvas.width + x) * 4;
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const a = pixels[i + 3];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        samples += 1;
        if (a > 16 && max > 24) visible += 1;
        if (a > 80 && max > 205) bright += 1;
        if (a > 80 && max < 54 && min < 30) darkOutline += 1;
        hash ^= r; hash = Math.imul(hash, 16777619) >>> 0;
        hash ^= g; hash = Math.imul(hash, 16777619) >>> 0;
        hash ^= b; hash = Math.imul(hash, 16777619) >>> 0;
      }
    }
    const rect = canvas.getBoundingClientRect();
    return {
      canvas: { width: canvas.width, height: canvas.height },
      client: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      visibleRatio: samples ? visible / samples : 0,
      brightRatio: samples ? bright / samples : 0,
      darkRatio: samples ? darkOutline / samples : 0,
      pixelHash: hash.toString(16).padStart(8, '0'),
    };
  });
}

async function screenshotCanvas(page, fileName) {
  const canvas = await page.$('#game, canvas');
  if (!canvas) throw new Error('game canvas missing');
  await canvas.screenshot({ path: path.join(OUT_DIR, fileName) });
}

async function prepare(page, scene, options = {}) {
  return page.evaluate(({ scene, options }) => {
    const cap = window.__dreamModeCapture__;
    const prepared = cap.prepare(scene, options);
    return prepared || cap.snapshot();
  }, { scene, options });
}

async function step(page, frames, dt = 1 / 60) {
  return page.evaluate(({ frames, dt }) => {
    const cap = window.__dreamModeCapture__;
    const stepped = cap.step(frames, dt);
    return stepped || cap.snapshot();
  }, { frames, dt });
}

async function captureTimeline(page, viewport, scene, options, framePoints, report, filePrefix = scene) {
  await prepare(page, scene, options);
  let previous = 0;
  for (const frame of framePoints) {
    if (frame > previous) await step(page, frame - previous);
    previous = frame;
    const snapshot = await page.evaluate(() => window.__dreamModeCapture__.snapshot());
    const label = `${viewport.id}/${filePrefix}/f${frame}`;
    const validation = validateSnapshot(snapshot, label);
    report.failures.push(...validation.failures);
    const file = `${viewport.id}_${filePrefix}_f${String(frame).padStart(3, '0')}.png`;
    await screenshotCanvas(page, file);
    const visual = await canvasMetrics(page);
    if (visual.visibleRatio < 0.02) report.failures.push(`${label}: canvas is visually blank (${visual.visibleRatio})`);
    report.frames.push({ label, file, scene, options, frame, snapshot, counts: validation.counts, visual });
  }
}

async function captureQualityParity(page, report) {
  const samples = [];
  for (const quality of ['high', 'medium', 'low', 'ultra']) {
    const snapshot = await prepare(page, 'wave', { wave: 9, elapsed: 12.5, quality });
    const settled = await step(page, 1);
    samples.push({
      quality,
      logicalCount: count(settled || snapshot, ['logicalBulletCount', 'enemyBulletCount', 'enemyBullets', 'bullets']),
      logicHash: (settled || snapshot).logicHash || (settled || snapshot).bulletLogicHash,
    });
  }
  const expected = samples[0];
  for (const sample of samples.slice(1)) {
    if (sample.logicalCount !== expected.logicalCount) report.failures.push(`quality ${sample.quality}: logical count ${sample.logicalCount} != ${expected.logicalCount}`);
    if (!sample.logicHash || sample.logicHash !== expected.logicHash) report.failures.push(`quality ${sample.quality}: logic hash ${sample.logicHash} != ${expected.logicHash}`);
  }
  report.qualityParity = samples;
}

function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1))];
}

async function runPerformance(page, report) {
  await prepare(page, 'performance', { wave: 10, quality: 'ultra', enemies: 6, bullets: 96, warnings: 4, lasers: 4 });
  const sample = await page.evaluate(async ({ seconds }) => {
    const cap = window.__dreamModeCapture__;
    const intervals = [];
    const cpu = [];
    const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    let previous = await nextFrame();
    const deadline = performance.now() + seconds * 1000;
    while (performance.now() < deadline) {
      const start = performance.now();
      cap.step(1, 1 / 60);
      cpu.push(Math.max(0.001, performance.now() - start));
      const now = await nextFrame();
      intervals.push(Math.max(0.001, now - previous));
      previous = now;
    }
    return { intervals, cpu, snapshot: cap.snapshot() };
  }, { seconds: PERF_SECONDS });
  const averageMs = sample.intervals.reduce((sum, value) => sum + value, 0) / Math.max(1, sample.intervals.length);
  const p99Ms = percentile(sample.intervals, 0.99);
  const cpuAverage = sample.cpu.reduce((sum, value) => sum + value, 0) / Math.max(1, sample.cpu.length);
  report.performance = {
    durationSeconds: PERF_SECONDS,
    cpuThrottlingRate: PERF_CPU_RATE,
    samples: sample.intervals.length,
    averageFps: Number((1000 / Math.max(0.001, averageMs)).toFixed(1)),
    onePercentLowFps: Number((1000 / Math.max(0.001, p99Ms)).toFixed(1)),
    averageCpuMs: Number(cpuAverage.toFixed(3)),
    p99FrameMs: Number(p99Ms.toFixed(3)),
    snapshot: sample.snapshot,
  };
  const validation = validateSnapshot(sample.snapshot, 'mobile performance');
  report.failures.push(...validation.failures);
  if (report.performance.averageFps < 58) report.failures.push(`performance average ${report.performance.averageFps} FPS < 58`);
  if (report.performance.onePercentLowFps < 45) report.failures.push(`performance 1% low ${report.performance.onePercentLowFps} FPS < 45`);
}

function buildGif(prefix, frameFiles) {
  const listPath = path.join(OUT_DIR, `${prefix}.ffconcat`);
  const lines = ['ffconcat version 1.0'];
  for (const file of frameFiles) {
    lines.push(`file '${file.replaceAll("'", "'\\''")}'`);
    lines.push('duration 0.12');
  }
  if (frameFiles.length) lines.push(`file '${frameFiles.at(-1).replaceAll("'", "'\\''")}'`);
  fs.writeFileSync(listPath, `${lines.join('\n')}\n`);
  const result = spawnSync('ffmpeg', [
    '-y', '-f', 'concat', '-safe', '0', '-i', listPath,
    '-vf', 'fps=12,scale=720:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=192[p];[s1][p]paletteuse=dither=sierra2_4a',
    '-loop', '0', path.join(OUT_DIR, `${prefix}.gif`),
  ], { encoding: 'utf8' });
  fs.rmSync(listPath, { force: true });
  if (result.error?.code === 'ENOENT') return { built: false, reason: 'ffmpeg not installed' };
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'ffmpeg failed');
  return { built: true, file: `${prefix}.gif` };
}

function writeHtml(report) {
  const sections = report.frames.map((entry) => `
    <figure>
      <img src="${entry.file}" alt="${entry.label}">
      <figcaption><b>${entry.label}</b><br>enemy ${entry.counts.enemies} · bullet ${entry.counts.bullets} · warning ${entry.counts.warnings} · laser ${entry.counts.lasers}<br>hash ${entry.visual.pixelHash}</figcaption>
    </figure>`).join('\n');
  const performance = report.performance ? `<p>Performance ${report.performance.durationSeconds}s: average <b>${report.performance.averageFps} FPS</b>, 1% low <b>${report.performance.onePercentLowFps} FPS</b>, CPU ${report.performance.averageCpuMs}ms</p>` : '';
  const html = `<!doctype html><meta charset="utf-8"><title>梦境模式第一关视觉验收</title>
<style>body{margin:24px;background:#0d1024;color:#eef2ff;font:15px system-ui}h1,h2{color:#ffb8e7}p{line-height:1.7}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px}figure{margin:0;padding:10px;background:#171b36;border:1px solid #7784c7;border-radius:8px}img{display:block;width:100%;height:auto;background:#050713}figcaption{padding:9px 2px 2px;line-height:1.5}.bad{color:#ff849a}.good{color:#9dffd8}</style>
<h1>梦境模式第一关「堕辉圣域」视觉验收</h1>
<p>Source ${report.source.file} · ${report.source.sha256.slice(0, 12)} · Chrome ${report.runtime.chrome}</p>
${performance}
<p class="${report.failures.length ? 'bad' : 'good'}">${report.failures.length ? `${report.failures.length} failures: ${report.failures.join(' | ')}` : 'All automated visual, resource, logic-cap and performance gates passed.'}</p>
<div class="grid">${sections}</div>`;
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), html);
}

async function main() {
  const sourceFile = path.join(SOURCE_DIR, 'index.html');
  if (!fs.existsSync(sourceFile)) throw new Error(`${sourceFile} missing`);
  const executablePath = chromePath();
  if (!executablePath) throw new Error('Chrome executable not found; set CHROME_PATH or PUPPETEER_EXECUTABLE_PATH');
  cleanOutput();
  const report = {
    generatedAt: new Date().toISOString(),
    source: { file: path.relative(ROOT, sourceFile) || 'index.html', sha256: sha256(sourceFile) },
    runtime: { node: process.version, chrome: '', executablePath },
    frames: [],
    qualityParity: [],
    performance: null,
    gifs: [],
    failures: [],
  };
  const diagnostics = { errors: [], missing: [], requestFailures: [] };
  let server;
  let browser;
  try {
    server = await startServer();
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: [
        '--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required',
        '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding', '--force-device-scale-factor=1',
      ],
    });
    report.runtime.chrome = await browser.version();

    for (const viewport of VIEWPORTS) {
      const page = await createPage(browser, viewport, diagnostics);
      try {
        await captureTimeline(page, viewport, 'lobby', { level: 1 }, [0, 20, 60], report, 'lobby');
        await captureTimeline(page, viewport, 'wave', { wave: 1, quality: viewport.mobile ? 'ultra' : 'high' }, [0, 30, 90], report, 'wave01');
        await captureTimeline(page, viewport, 'wave', { wave: 10, quality: viewport.mobile ? 'ultra' : 'high' }, [0, 30, 90], report, 'wave10');
        await captureTimeline(page, viewport, 'boss', { phase: 4, quality: viewport.mobile ? 'ultra' : 'high' }, [0, 45, 120], report, 'boss05');
        await captureTimeline(page, viewport, 'result', { stars: 3, elapsedMs: 390000 }, [0, 30, 90], report, 'result_3star');
        await captureTimeline(page, viewport, 'result', { stars: 0, elapsedMs: 450000 }, [0, 30, 90], report, 'result_0star');
        if (!viewport.mobile) {
          await captureTimeline(page, viewport, 'leaderboard', { level: 1 }, [0, 30, 90], report, 'leaderboard');
          for (let wave = 2; wave <= 9; wave += 1) {
            await captureTimeline(page, viewport, 'wave', { wave, quality: 'high' }, [45], report, `wave${String(wave).padStart(2, '0')}`);
          }
          for (let phase = 0; phase < 4; phase += 1) {
            await captureTimeline(page, viewport, 'boss', { phase, quality: 'high' }, [0, 45, 120], report, `boss${String(phase + 1).padStart(2, '0')}`);
          }
          for (let hits = 0; hits <= 3; hits += 1) {
            await captureTimeline(page, viewport, 'stars', { hits }, [0, 12, 60], report, `stars_hits${hits}`);
          }
          await captureTimeline(page, viewport, 'fail', { hits: 4 }, [0, 30, 90], report, 'fail_4hits');
          await captureQualityParity(page, report);
        }
      } finally {
        await page.close();
      }
    }

    const performancePage = await createPage(browser, VIEWPORTS[1], diagnostics);
    try {
      await runPerformance(performancePage, report);
      await screenshotCanvas(performancePage, 'mobile_390x844_performance_final.png');
    } finally {
      await performancePage.close();
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server) await new Promise((resolve) => server.close(resolve));
  }

  report.failures.push(...diagnostics.errors);
  if (diagnostics.missing.length) report.failures.push(`404 resources: ${[...new Set(diagnostics.missing)].join(', ')}`);
  if (diagnostics.requestFailures.length) report.failures.push(`request failures: ${[...new Set(diagnostics.requestFailures)].join(', ')}`);

  const numberedFrames = (kind) => report.frames
    .filter((entry) => entry.label.startsWith(`desktop_1280x720/${kind}`) && entry.frame !== 0)
    .sort((a, b) => {
      const an = Number(a.label.match(new RegExp(`${kind}(\\d+)`))?.[1] || 0);
      const bn = Number(b.label.match(new RegExp(`${kind}(\\d+)`))?.[1] || 0);
      return an - bn || a.frame - b.frame;
    })
    .map((entry) => entry.file);
  const waveFrames = numberedFrames('wave');
  const bossFrames = numberedFrames('boss');
  report.gifs.push(buildGif('dream_wave_patterns', waveFrames));
  report.gifs.push(buildGif('dream_seraph_phases', bossFrames));

  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
  writeHtml(report);
  console.log(`Dream acceptance report: ${path.join(OUT_DIR, 'index.html')}`);
  console.log(`Frames: ${report.frames.length}; average ${report.performance?.averageFps || 0} FPS; 1% low ${report.performance?.onePercentLowFps || 0} FPS`);
  if (report.failures.length) throw new Error(`Dream acceptance failed:\n${report.failures.slice(0, 20).join('\n')}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
