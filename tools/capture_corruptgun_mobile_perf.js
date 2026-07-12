#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');
const puppeteer = require('puppeteer-core');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.resolve(process.env.CORRUPTGUN_MOBILE_PERF_OUT
  || path.join(ROOT, 'tools', 'corruptgun_mobile_perf'));
const PORT = Number(process.env.CORRUPTGUN_MOBILE_PERF_PORT || 18837);
const SAMPLE_FRAMES = Math.max(60, Number(process.env.CORRUPTGUN_MOBILE_PERF_FRAMES || 180) | 0);
const WARMUP_FRAMES = Math.max(20, Number(process.env.CORRUPTGUN_MOBILE_PERF_WARMUP || 60) | 0);
const SEED = Number(process.env.CORRUPTGUN_MOBILE_PERF_SEED || 0x7c0ffee) >>> 0;
const CPU_RATE = Math.max(1, Number(process.env.CORRUPTGUN_MOBILE_PERF_CPU_RATE || 1) || 1);
const VIEWPORT = Object.freeze({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const CASE_FILTER = String(process.env.CORRUPTGUN_MOBILE_PERF_CASE || '').trim();
const CASE_FILTERS = CASE_FILTER ? CASE_FILTER.split(',').map(value => value.trim()).filter(Boolean) : [];

const CASES = Object.freeze([
  Object.freeze({ id: 'clone_barrage_low', scene: 'cloneBarrage', quality: 'low', warmupFrames: WARMUP_FRAMES }),
  Object.freeze({ id: 'clone_barrage_ultra', scene: 'cloneBarrage', quality: 'ultra', warmupFrames: WARMUP_FRAMES }),
  Object.freeze({ id: 'dark_wheel_low', scene: 'darkWheel', quality: 'low', warmupFrames: Math.min(WARMUP_FRAMES, 20) }),
  Object.freeze({ id: 'dark_wheel_ultra', scene: 'darkWheel', quality: 'ultra', warmupFrames: Math.min(WARMUP_FRAMES, 20) }),
]);

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function chromePath() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  return candidates.find(candidate => fs.existsSync(candidate));
}

function mimeFor(filePath) {
  return {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.woff2': 'font/woff2',
  }[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function instrumentIndex(source) {
  const marker = '    window.__corruptgunCapture__ = {';
  if (!source.includes(marker)) throw new Error('corrupt-gun capture marker missing from index.html');
  const hook = `    // Runtime-only mobile performance hook. The source file is never modified.\n`
    + `    window.__corruptgunMobilePerfHarness__ = {\n`
    + `      setQuality(quality = 'low') {\n`
    + `        const next = quality === 'ultra' ? 'ultra' : 'low';\n`
    + `        qualityPreset = next; qualityAutoSelected = false;\n`
    + `        perfLevel = next === 'ultra' ? 3 : 2;\n`
    + `        runtimePerfStressFlag = false;\n`
    + `        draw();\n`
    + `        return this.diagnostics();\n`
    + `      },\n`
    + `      diagnostics() {\n`
    + `        return {\n`
    + `          perfLevel, qualityPreset, renderScale, targetFps,\n`
    + `          budget: { ...perfBudget() },\n`
    + `          stressed: runtimePerfStressActive(),\n`
    + `          counts: { enemies: enemies.length, enemyBullets: enemyBullets.length, playerShots: playerShots.length, particles: particles.length },\n`
    + `        };\n`
    + `      },\n`
    + `    };\n\n`;
  return source.replace(marker, `${hook}${marker}`);
}

function startServer(indexSource) {
  const instrumented = instrumentIndex(indexSource);
  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      const pathname = decodeURIComponent((request.url || '/').split('?')[0]);
      const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
      if (rel === 'index.html') {
        response.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Corruptgun-Perf-Instrumented': '1',
        });
        response.end(instrumented);
        return;
      }
      if (rel === 'asset-mobile-manifest.js') {
        response.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
        response.end('window.__PAGE_BUILD_VERSION__="";window.__AVAILABLE_ASSETS__=null;window.__MOBILE_ASSET_PATHS__={};');
        return;
      }
      const filePath = path.resolve(ROOT, rel);
      if ((!filePath.startsWith(`${ROOT}${path.sep}`) && filePath !== ROOT)) {
        response.writeHead(403); response.end('Forbidden'); return;
      }
      fs.stat(filePath, (error, stat) => {
        if (error || !stat.isFile()) { response.writeHead(404); response.end('Not Found'); return; }
        response.writeHead(200, { 'Content-Type': mimeFor(filePath), 'Cache-Control': 'no-store' });
        fs.createReadStream(filePath).pipe(response);
      });
    });
    server.once('error', reject);
    server.listen(PORT, '127.0.0.1', () => resolve({ server, instrumented }));
  });
}

function percentile(sorted, ratio) {
  if (!sorted.length) return 0;
  const index = Math.max(0, Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1));
  return sorted[index];
}

function summarize(values, includeFps = false) {
  const clean = values.filter(Number.isFinite);
  const sorted = [...clean].sort((a, b) => a - b);
  const mean = clean.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : 0;
  const result = {
    samples: clean.length,
    mean: Number(mean.toFixed(3)),
    p95: Number(percentile(sorted, 0.95).toFixed(3)),
    p99: Number(percentile(sorted, 0.99).toFixed(3)),
    max: Number((sorted.at(-1) || 0).toFixed(3)),
  };
  if (includeFps) {
    result.averageFps = Number((1000 / Math.max(0.001, result.mean)).toFixed(1));
    result.onePercentLowFps = Number((1000 / Math.max(0.001, result.p99)).toFixed(1));
  }
  return result;
}

function dataUrlBuffer(dataUrl) {
  return Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
}

function writeHtmlReport(report) {
  const rows = report.cases.map(entry => `
    <section>
      <h2>${entry.id}</h2>
      <p>perfLevel ${entry.snapshot.perfLevel} | bullets ${entry.snapshot.enemyBullets} | clones ${entry.snapshot.clones.length} | ultimate ${entry.snapshot.ultimate.phase}</p>
      <p>CPU ms: mean ${entry.metrics.cpu.mean}, p95 ${entry.metrics.cpu.p95}, p99 ${entry.metrics.cpu.p99}, max ${entry.metrics.cpu.max}</p>
      <p>rAF ms: mean ${entry.metrics.raf.mean}, p95 ${entry.metrics.raf.p95}, p99 ${entry.metrics.raf.p99}, max ${entry.metrics.raf.max}</p>
      <p>visible ${(entry.visibility.visibleRatio * 100).toFixed(1)}% | red ${(entry.visibility.redRatio * 100).toFixed(1)}% | hash ${entry.visibility.hash}</p>
      <div><img src="${entry.files.viewport}"><img src="${entry.files.canvas}"></div>
    </section>`).join('\n');
  const html = `<!doctype html><meta charset="utf-8"><title>7号战机移动端性能回归</title>
<style>body{margin:24px;background:#08050d;color:#f7dce6;font:15px system-ui}h1,h2{color:#ff5b84}section{border-top:1px solid #6e1738;padding:18px 0}div{display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap}img{width:390px;max-width:100%;height:auto;border:1px solid #8d2449;background:#050308}</style>
<h1>7号战机 390x844 移动端性能回归</h1><p>source ${report.source.sha256.slice(0, 12)} | Chrome ${report.runtime.chrome} | CPU ${report.runtime.cpuThrottlingRate}x</p>${rows}`;
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), html);
}

async function waitForAssets(page) {
  await page.evaluate(() => window.__corruptgunCapture__.setup('idle'));
  const expected = await page.evaluate(() => window.__corruptgunInternals__.assetSpec().keys.length);
  await page.waitForFunction(count => window.__corruptgunCapture__.readyKeys().length === count, { timeout: 60000 }, expected);
  return expected;
}

async function prepareCase(page, testCase, seed) {
  return page.evaluate(({ testCase: current, seed: nextSeed }) => {
    window.__resetCorruptgunPerfRandom(nextSeed);
    const cap = window.__corruptgunCapture__;
    const harness = window.__corruptgunMobilePerfHarness__;
    cap.setup('overdrive_clone_stress');
    if (current.scene === 'cloneBarrage') {
      // Reuse the ultimate capture helper to seed a deterministic dense bullet
      // field, then remove the ultimate while preserving the three clones.
      cap.setUltimatePhase('spin', 0.2, 0, false, 150);
      cap.cleanupUltimate(false);
    } else {
      cap.setUltimatePhase('spin', 1.4, 80, false, 150);
    }
    const quality = harness.setQuality(current.quality);
    return { quality, snapshot: cap.snapshot() };
  }, { testCase, seed });
}

async function runFrames(page, warmupFrames, sampleFrames) {
  return page.evaluate(async ({ warmupFrames: warmupCount, sampleFrames: sampleCount }) => {
    const cap = window.__corruptgunCapture__;
    const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
    let previous = await nextFrame();
    for (let frame = 0; frame < warmupCount; frame++) {
      cap.advance(1, 1 / 60, false);
      previous = await nextFrame();
    }
    const cpu = [], raf = [];
    for (let frame = 0; frame < sampleCount; frame++) {
      const started = performance.now();
      cap.advance(1, 1 / 60, false);
      cpu.push(Math.max(0.001, performance.now() - started));
      const current = await nextFrame();
      raf.push(Math.max(0.001, current - previous));
      previous = current;
    }
    const canvas = document.getElementById('game');
    const context = canvas.getContext('2d');
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const stride = Math.max(4, Math.floor(Math.min(canvas.width, canvas.height) / 96));
    let total = 0, visible = 0, red = 0, bright = 0, hash = 2166136261 >>> 0;
    let minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1;
    for (let y = 0; y < canvas.height; y += stride) {
      for (let x = 0; x < canvas.width; x += stride) {
        const index = (y * canvas.width + x) * 4;
        const r = pixels[index], g = pixels[index + 1], b = pixels[index + 2];
        const sum = r + g + b;
        total++;
        if (sum > 54) { visible++; minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
        if (r > 54 && r > g * 1.24 && r > b * 0.82) red++;
        if (Math.max(r, g, b) > 205) bright++;
        hash ^= r; hash = Math.imul(hash, 16777619) >>> 0;
        hash ^= g; hash = Math.imul(hash, 16777619) >>> 0;
        hash ^= b; hash = Math.imul(hash, 16777619) >>> 0;
      }
    }
    const rect = canvas.getBoundingClientRect();
    return {
      cpu, raf,
      snapshot: cap.snapshot(),
      diagnostics: window.__corruptgunMobilePerfHarness__.diagnostics(),
      visibility: {
        sampleStride: stride, totalSamples: total, visibleSamples: visible, redSamples: red, brightSamples: bright,
        visibleRatio: total ? visible / total : 0, redRatio: total ? red / total : 0, brightRatio: total ? bright / total : 0,
        bounds: maxX >= 0 ? { minX, minY, maxX, maxY } : null,
        hash: hash.toString(16).padStart(8, '0'),
        canvas: { width: canvas.width, height: canvas.height, clientWidth: rect.width, clientHeight: rect.height },
      },
      canvasDataUrl: canvas.toDataURL('image/png'),
    };
  }, { warmupFrames, sampleFrames });
}

function validateCase(entry) {
  const expectedPerfLevel = entry.quality === 'ultra' ? 3 : 2;
  const failures = [];
  if (entry.snapshot.perfLevel !== expectedPerfLevel) failures.push(`perfLevel ${entry.snapshot.perfLevel} != ${expectedPerfLevel}`);
  if (entry.snapshot.clones.length !== 3) failures.push(`clone count ${entry.snapshot.clones.length} != 3`);
  if (!(entry.snapshot.player.berserk > 0)) failures.push('overdrive is inactive');
  if (entry.scene === 'cloneBarrage' && entry.snapshot.enemyBullets < 80) failures.push(`dense barrage too small: ${entry.snapshot.enemyBullets}`);
  if (entry.scene === 'darkWheel' && (!entry.snapshot.ultimate.active || entry.snapshot.ultimate.phase !== 'spin')) failures.push(`ultimate phase is ${entry.snapshot.ultimate.phase}`);
  if (entry.visibility.visibleRatio < 0.03) failures.push(`canvas visibility too low: ${entry.visibility.visibleRatio}`);
  if (entry.visibility.redRatio < 0.001) failures.push(`red VFX visibility too low: ${entry.visibility.redRatio}`);
  if (!entry.metrics.cpu.samples || !entry.metrics.raf.samples) failures.push('performance samples missing');
  return failures;
}

async function main() {
  const sourcePath = path.join(ROOT, 'index.html');
  if (!fs.existsSync(sourcePath)) throw new Error(`${sourcePath} missing`);
  const source = fs.readFileSync(sourcePath, 'utf8');
  const noticeVersion = source.match(/const UPDATE_NOTICE_VERSION\s*=\s*'([^']+)'/)?.[1] || '';
  const executablePath = chromePath();
  if (!executablePath) throw new Error('Chrome executable not found; set CHROME_PATH or PUPPETEER_EXECUTABLE_PATH');
  const selectedCases = CASE_FILTERS.length ? CASES.filter(entry => CASE_FILTERS.includes(entry.id)) : [...CASES];
  const unknownCases = CASE_FILTERS.filter(id => !CASES.some(entry => entry.id === id));
  if (!selectedCases.length || unknownCases.length) {
    throw new Error(`unknown CORRUPTGUN_MOBILE_PERF_CASE=${unknownCases.join(',') || CASE_FILTER}`);
  }

  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browserErrors = [], missing = [], requestFailures = [];
  let server;
  let browser;
  try {
    ({ server } = await startServer(source));
    const args = [
      '--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required',
      '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding', '--force-device-scale-factor=1',
    ];
    if (process.env.CORRUPTGUN_MOBILE_PERF_SWIFTSHADER === '1') args.push('--use-angle=swiftshader');
    browser = await puppeteer.launch({ executablePath, headless: true, args });
    const page = await browser.newPage();
    await page.setViewport(VIEWPORT);
    if (CPU_RATE > 1) await page.emulateCPUThrottling(CPU_RATE);
    page.on('pageerror', error => browserErrors.push(String(error && (error.stack || error.message) || error)));
    page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()); });
    page.on('response', response => {
      if (response.status() === 404 && !response.url().endsWith('/favicon.ico')) missing.push(response.url());
    });
    page.on('requestfailed', request => requestFailures.push(`${request.url()} :: ${request.failure()?.errorText || 'failed'}`));
    await page.evaluateOnNewDocument(({ initialSeed, currentNoticeVersion }) => {
      let state = initialSeed >>> 0;
      window.__resetCorruptgunPerfRandom = value => { state = Number(value) >>> 0; };
      Math.random = () => {
        state += 0x6D2B79F5;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
      };
      if (currentNoticeVersion) localStorage.setItem('moonBulletSeenUpdateNotice', currentNoticeVersion);
      localStorage.setItem('moonBulletTargetFps', '60');
    }, { initialSeed: SEED, currentNoticeVersion: noticeVersion });
    await page.goto(`http://127.0.0.1:${PORT}/?mobile=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => window.__corruptgunCapture__
      && window.__corruptgunInternals__
      && window.__corruptgunMobilePerfHarness__, { timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 520));
    await page.evaluate(() => document.querySelector('.update-notice-close')?.click());
    const expectedAssets = await waitForAssets(page);

    const report = {
      generatedAt: new Date().toISOString(),
      source: { file: 'index.html', sha256: sha256(source), runtimeInstrumentation: 'quality-setter-only; source file unchanged' },
      runtime: {
        node: process.version,
        chrome: await browser.version(),
        executablePath,
        userAgent: await page.evaluate(() => navigator.userAgent),
        viewport: VIEWPORT,
        sampleFrames: SAMPLE_FRAMES,
        warmupFrames: WARMUP_FRAMES,
        seed: SEED,
        cpuThrottlingRate: CPU_RATE,
        swiftShaderForced: process.env.CORRUPTGUN_MOBILE_PERF_SWIFTSHADER === '1',
      },
      expectedAssets,
      cases: [],
      browserErrors,
      missing,
      requestFailures,
    };

    for (const testCase of selectedCases) {
      const sceneSeed = (SEED ^ (testCase.scene === 'darkWheel' ? 0x6d2b79f5 : 0x9e3779b9)) >>> 0;
      await prepareCase(page, testCase, sceneSeed);
      const result = await runFrames(page, testCase.warmupFrames, SAMPLE_FRAMES);
      const viewportFile = `${testCase.id}_viewport.png`;
      const canvasFile = `${testCase.id}_canvas.png`;
      await page.screenshot({ path: path.join(OUT_DIR, viewportFile), fullPage: false });
      fs.writeFileSync(path.join(OUT_DIR, canvasFile), dataUrlBuffer(result.canvasDataUrl));
      const entry = {
        ...testCase,
        metrics: { cpu: summarize(result.cpu), raf: summarize(result.raf, true) },
        visibility: result.visibility,
        diagnostics: result.diagnostics,
        snapshot: result.snapshot,
        files: { viewport: viewportFile, canvas: canvasFile },
      };
      entry.failures = validateCase(entry);
      report.cases.push(entry);
      console.log(`[mobile-perf] ${entry.id} @${CPU_RATE}x CPU: cpu p95=${entry.metrics.cpu.p95}ms, rAF p95=${entry.metrics.raf.p95}ms, bullets=${entry.snapshot.enemyBullets}, visible=${(entry.visibility.visibleRatio * 100).toFixed(1)}%`);
    }

    report.source.sha256AtEnd = sha256(fs.readFileSync(sourcePath));
    report.source.changedDuringRun = report.source.sha256AtEnd !== report.source.sha256;
    report.failures = [
      ...report.cases.flatMap(entry => entry.failures.map(failure => `${entry.id}: ${failure}`)),
      ...browserErrors.map(error => `browser: ${error}`),
      ...missing.map(url => `404: ${url}`),
      ...requestFailures.map(error => `request: ${error}`),
    ];
    if (report.source.changedDuringRun) {
      report.failures.push(`source changed during run: ${report.source.sha256} -> ${report.source.sha256AtEnd}`);
    }
    fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
    writeHtmlReport(report);
    if (report.failures.length) throw new Error(`mobile performance regression failed:\n${report.failures.join('\n')}`);
    console.log(`[mobile-perf] report: ${path.relative(ROOT, path.join(OUT_DIR, 'report.json'))}`);
  } finally {
    if (browser) await browser.close();
    if (server) {
      if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    }
  }
}

main().catch(error => {
  console.error(error && (error.stack || error.message) || error);
  process.exitCode = 1;
});
