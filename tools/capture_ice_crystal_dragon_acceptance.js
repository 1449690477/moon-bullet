#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');
const puppeteer = require('puppeteer-core');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_KIND = String(process.env.ICE_DRAGON_CAPTURE_SOURCE || 'root').toLowerCase();
const SOURCE_DIR = SOURCE_KIND === 'docs'
  ? path.join(ROOT, 'docs')
  : SOURCE_KIND === 'main'
    ? path.join(ROOT, 'moon-bullet-main')
    : ROOT;
const OUT_DIR = process.env.ICE_DRAGON_CAPTURE_OUT
  ? path.resolve(ROOT, process.env.ICE_DRAGON_CAPTURE_OUT)
  : path.join(ROOT, 'tools', 'ice_dragon_acceptance');
const REQUESTED_PORT = Number(process.env.ICE_DRAGON_CAPTURE_PORT || 0);
const ASSET_TIMEOUT_MS = Math.max(5000, Number(process.env.ICE_DRAGON_ASSET_TIMEOUT_MS || 45000));
const GREEN_RESIDUE_LIMIT = 0.0001;
const SPLIT_TRAJECTORY_ACCEPTANCE = Object.freeze({
  endpointMin: 190,
  endpointMax: 265,
  flightTimeMin: 0.58,
  flightTimeMax: 0.66,
  manifestLeadMin: 0.08,
  manifestLeadMax: 0.14,
  minChordDeviationRatio: 0.16,
  minCurvedProjectiles: 4,
  maxFinalRadiusError: 5,
  minEndAngleGapDeg: 64,
  maxEndAngleGapDeg: 80,
});

const CONCEPTS = Object.freeze({
  body: path.join(ROOT, '冰晶龙开发文件夹', 'concept_02_wingman_main.png'),
  projectile: path.join(ROOT, '冰晶龙开发文件夹', 'concept_01_bullet_design.png'),
});
const REFERENCE_VIDEO = path.join('/Users/wanghan/Downloads', '732d478a3b14d8538ac8fd18ef32eb3a.mp4');
const VIDEO_AUDIT = path.join(ROOT, 'tools', 'ice_dragon_video_audit', 'REPORT.md');

const VIEWPORTS = Object.freeze([
  Object.freeze({ id: 'desktop_1280x720_high', width: 1280, height: 720, dpr: 1, mobile: false, quality: 'high', qualityValue: 0 }),
  Object.freeze({ id: 'mobile_430x932_low', width: 430, height: 932, dpr: 1, mobile: true, quality: 'low', qualityValue: 2 }),
]);

const SCENES = Object.freeze([
  Object.freeze({ id: 'summon', concept: 'body', frames: [0, 10, 26, 48] }),
  Object.freeze({ id: 'orbit', concept: 'body', frames: [0, 48, 104, 168] }),
  Object.freeze({ id: 'move', concept: 'body', frames: [0, 16, 46, 104, 142] }),
  Object.freeze({ id: 'charge', concept: 'projectile', frames: [0, 3, 6, 9, 12] }),
  Object.freeze({ id: 'projectile', concept: 'projectile', frames: [0, 3, 7, 12, 18, 28, 34] }),
  Object.freeze({ id: 'impact', concept: 'projectile', frames: [0, 2, 5, 9, 14, 20, 27] }),
  Object.freeze({ id: 'split', concept: 'projectile', frames: [0, 4, 8, 12, 16, 24, 32, 36, 44, 50, 54] }),
  Object.freeze({ id: 'explosion', concept: 'projectile', frames: [0, 1, 5, 13, 26, 42, 52, 62, 82] }),
  Object.freeze({ id: 'over-body', concept: 'body', frames: [0, 52, 118] }),
  Object.freeze({ id: 'berserk', concept: 'projectile', frames: [0, 1, 6, 12, 18, 22, 28, 36, 48, 60] }),
]);

const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const DESKTOP_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

function chromePath() {
  const candidates = [process.env.PUPPETEER_EXECUTABLE_PATH, process.env.CHROME_PATH].filter(Boolean);
  if (process.platform === 'darwin') {
    candidates.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
  } else if (process.platform === 'win32') {
    const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const programFiles86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    candidates.push(
      path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(programFiles86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    );
  } else {
    candidates.push('/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser');
  }
  return candidates.find((candidate) => candidate && fs.existsSync(candidate));
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function relativeToRoot(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join('/');
}

function relativeToReport(filePath) {
  return path.relative(OUT_DIR, filePath).split(path.sep).join('/');
}

function contentType(filePath) {
  return {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
  }[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function serveFile(filePath, request, response) {
  response.writeHead(200, {
    'Content-Type': contentType(filePath),
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  });
  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  fs.createReadStream(filePath).pipe(response);
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      let requestPath;
      try {
        requestPath = decodeURIComponent(String(request.url || '/').split('?')[0]);
      } catch {
        response.writeHead(400);
        response.end('Bad Request');
        return;
      }
      const relative = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
      if (relative === 'favicon.ico') {
        response.writeHead(204, { 'Cache-Control': 'no-store' });
        response.end();
        return;
      }
      if (relative === 'sw.js') {
        response.writeHead(200, {
          'Content-Type': 'application/javascript; charset=utf-8',
          'Cache-Control': 'no-store',
          'Service-Worker-Allowed': '/',
        });
        response.end('/* Ice Crystal Dragon acceptance: capture-only no-op service worker. */\n');
        return;
      }

      const filePath = path.resolve(SOURCE_DIR, relative);
      const insideSource = filePath === SOURCE_DIR || filePath.startsWith(`${SOURCE_DIR}${path.sep}`);
      if (!insideSource) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
      }
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        serveFile(filePath, request, response);
        return;
      }

      // Root captures may still reference generated mobile variants.  Serve the
      // docs copy only for that generated tree, never as a general 404 fallback.
      if (relative.startsWith('assets_mobile/')) {
        const mobilePath = path.resolve(ROOT, 'docs', relative);
        const docsRoot = path.resolve(ROOT, 'docs');
        if (mobilePath.startsWith(`${docsRoot}${path.sep}`)
            && fs.existsSync(mobilePath) && fs.statSync(mobilePath).isFile()) {
          serveFile(mobilePath, request, response);
          return;
        }
      }
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end('Not Found');
    });
    server.once('error', reject);
    server.listen(REQUESTED_PORT, '127.0.0.1', () => {
      const address = server.address();
      resolve({ server, port: typeof address === 'object' && address ? address.port : REQUESTED_PORT });
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createDiagnostics() {
  return {
    pageErrors: [],
    consoleErrors: [],
    requestFailures: [],
    notFound: [],
  };
}

function isLocalUrl(url, port) {
  return url.startsWith(`http://127.0.0.1:${port}/`);
}

function attachDiagnostics(page, viewport, diagnostics, port) {
  page.on('pageerror', (error) => {
    diagnostics.pageErrors.push({ viewport: viewport.id, message: error.stack || error.message || String(error) });
  });
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    // Desktop preload reports unrelated Dream-mode procedural fallbacks as
    // console.error. Preserve them in diagnostics, but do not make an Ice
    // Dragon-only acceptance fail when its own asset contract is clean.
    const ignored = /^\[Dream\].*(?:素材加载失败|后备)/.test(text);
    diagnostics.consoleErrors.push({ viewport: viewport.id, message: text, ignored });
  });
  page.on('requestfailed', (request) => {
    const reason = request.failure()?.errorText || 'request failed';
    if (reason === 'net::ERR_ABORTED') return;
    diagnostics.requestFailures.push({
      viewport: viewport.id,
      url: request.url(),
      local: isLocalUrl(request.url(), port),
      reason,
    });
  });
  page.on('response', (response) => {
    if (response.status() !== 404) return;
    diagnostics.notFound.push({
      viewport: viewport.id,
      url: response.url(),
      local: isLocalUrl(response.url(), port),
    });
  });
}

async function waitForCaptureApi(page) {
  await page.waitForFunction(
    () => !!window.__iceDragonCapture__ && !!window.__iceDragonInternals__
      && typeof window.__iceDragonCapture__.setup === 'function'
      && typeof window.__iceDragonCapture__.step === 'function'
      && typeof window.__iceDragonCapture__.snapshot === 'function'
      && typeof window.__iceDragonCapture__.readyKeys === 'function'
      && typeof window.__iceDragonInternals__.assetSpec === 'function',
    { timeout: 30000 },
  );
}

async function prepareScene(page, scene, quality) {
  return page.evaluate(({ scene, quality }) => {
    const cap = window.__iceDragonCapture__;
    const internals = window.__iceDragonInternals__ || {};
    const setupScene = scene === 'explosion' ? 'split' : scene;
    let snapshot = cap.setup(setupScene, { quality });
    let explosionPriming = null;
    if (scene === 'explosion') {
      const hookOwners = [cap, cap.debug, internals].filter(Boolean);
      const hookNames = [
        'debugPrimeSplitForExplosion',
        'primeSplitForExplosion',
        'debugSetSplitProgress',
        'setSplitProgressForCapture',
      ];
      let hook = null;
      let hookOwner = null;
      for (const owner of hookOwners) {
        for (const name of hookNames) {
          if (typeof owner[name] === 'function') {
            hook = owner[name];
            hookOwner = owner;
            break;
          }
        }
        if (hook) break;
      }

      if (hook) {
        const result = hook.call(hookOwner, {
          progress: 0.985,
          preferFlightTime: true,
          scene: 'explosion',
        });
        snapshot = result?.snapshot || cap.snapshot();
        explosionPriming = { mode: 'debug-hook', hook: hook.name || 'anonymous' };
      } else {
        // Compatibility path for the current runtime and older mirrors. It
        // advances the real split simulation instead of writing x/y or the
        // obsolete straight-line travelled field. A future debug hook can set
        // flightT/duration directly and bypass this loop.
        let advancedFrames = 0;
        for (; advancedFrames < 180; advancedFrames++) {
          snapshot = cap.snapshot();
          const splits = snapshot?.splitShots || [];
          const progress = splits.map((split) => {
            if (Number.isFinite(Number(split.progress))) return Number(split.progress);
            const flightT = Number(split.flightT);
            const duration = Number(split.flightDuration ?? split.duration);
            if (Number.isFinite(flightT) && Number.isFinite(duration) && duration > 0) return flightT / duration;
            const travelled = Number(split.travelled);
            const targetDistance = Number(split.targetDistance);
            return Number.isFinite(travelled) && Number.isFinite(targetDistance) && targetDistance > 0
              ? travelled / targetDistance
              : 0;
          });
          if (Number(snapshot?.explosions) > 0 || (progress.length === 5 && Math.min(...progress) >= 0.94)) break;
          cap.step(1, 1 / 60, false);
        }
        snapshot = cap.snapshot();
        explosionPriming = { mode: 'simulation-fallback', advancedFrames };
      }
    }
    let deterministicLock = false;
    if (window.__iceDragonRafControl) {
      window.__iceDragonRafControl.locked = true;
      deterministicLock = window.__iceDragonRafControl.locked === true;
    }
    if (typeof dreamRun !== 'undefined' && dreamRun) {
      dreamRun.captureLocked = true;
      deterministicLock = deterministicLock || dreamRun.captureLocked === true;
    }
    return { snapshot, deterministicLock, explosionPriming };
  }, { scene, quality });
}

async function captureContract(page) {
  return page.evaluate(() => ({
    registration: window.__iceDragonInternals__.registrationSpec(),
    assets: window.__iceDragonInternals__.assetSpec(),
    cadence: window.__iceDragonInternals__.cadenceSpec(),
    visual: window.__iceDragonInternals__.visualSpec(),
    performance: window.__iceDragonInternals__.performanceSpec(),
  }));
}

function sameKeySet(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
  const a = [...left].sort();
  const b = [...right].sort();
  return a.every((key, index) => key === b[index]);
}

async function waitForAssets(page, expectedKeys, viewportId) {
  const deadline = Date.now() + ASSET_TIMEOUT_MS;
  let last = null;
  while (Date.now() < deadline) {
    last = await page.evaluate(() => ({
      readyKeys: window.__iceDragonCapture__.readyKeys(),
      status: window.__iceDragonCapture__.assetStatus(),
    }));
    const status = last.status || {};
    if ((status.failed || []).length || (status.missing || []).length) {
      throw new Error(`${viewportId}: required asset failure: ${JSON.stringify(status)}`);
    }
    const exactReadyCount = last.readyKeys.length === expectedKeys.length;
    const exactReadySet = sameKeySet(last.readyKeys, expectedKeys);
    const exactStatusCount = (status.ready || []).length === expectedKeys.length;
    const noPending = !(status.pending || []).length;
    if (exactReadyCount && exactReadySet && exactStatusCount && noPending) return last;
    await sleep(50);
  }
  throw new Error(`${viewportId}: assets did not reach exact readiness contract: expected=${expectedKeys.length} last=${JSON.stringify(last)}`);
}

async function browserAssetPixelAudit(page, contract) {
  return page.evaluate(async ({ keys, runtimeFiles }) => {
    async function inspect(entry) {
      let actualSource = '';
      try {
        if (typeof assets !== 'undefined' && assets?.[entry.key]) {
          actualSource = assets[entry.key].currentSrc || assets[entry.key].src || '';
        }
      } catch {
        actualSource = '';
      }
      const source = actualSource || entry.declared;
      const image = new Image();
      image.decoding = 'async';
      image.src = new URL(source, window.location.href).href;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let visible = 0;
      let greenResidue = 0;
      let greenExcess = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        const r = pixels[index];
        const g = pixels[index + 1];
        const b = pixels[index + 2];
        const a = pixels[index + 3];
        if (a <= 12) continue;
        visible += 1;
        const maxRB = Math.max(r, b);
        if (g > 1.45 * Math.max(maxRB, 1) && maxRB < 110) greenResidue += 1;
        if (g > maxRB + 8) greenExcess += 1;
      }
      return {
        key: entry.key,
        declared: entry.declared,
        actualSource: image.currentSrc || image.src,
        width: image.naturalWidth,
        height: image.naturalHeight,
        visiblePixels: visible,
        greenResiduePixels: greenResidue,
        greenResidueRatio: greenResidue / Math.max(1, visible),
        greenExcessPixels: greenExcess,
        greenExcessRatio: greenExcess / Math.max(1, visible),
      };
    }

    const entries = keys.map((key, index) => ({ key, declared: runtimeFiles[index] }));
    const results = [];
    for (const entry of entries) results.push(await inspect(entry));
    return results;
  }, { keys: contract.keys, runtimeFiles: contract.runtimeFiles });
}

async function stepCapture(page, frames, dt = 1 / 60) {
  return page.evaluate(({ frames, dt }) => window.__iceDragonCapture__.step(frames, dt, true), { frames, dt });
}

async function canvasMetrics(page) {
  return page.evaluate(() => {
    const canvas = document.getElementById('game') || document.querySelector('canvas');
    if (!canvas) throw new Error('game canvas missing');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const totalPixels = canvas.width * canvas.height;
    const stride = Math.max(1, Math.ceil(Math.sqrt(totalPixels / 180000)));
    let samples = 0;
    let nonBlack = 0;
    let greenResidue = 0;
    let lumaSum = 0;
    let lumaSquaredSum = 0;
    let hash = 2166136261 >>> 0;
    const colors = new Set();
    for (let y = 0; y < canvas.height; y += stride) {
      for (let x = 0; x < canvas.width; x += stride) {
        const index = (y * canvas.width + x) * 4;
        const r = pixels[index];
        const g = pixels[index + 1];
        const b = pixels[index + 2];
        const a = pixels[index + 3];
        const maximum = Math.max(r, g, b);
        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        samples += 1;
        if (a > 18 && maximum > 18) nonBlack += 1;
        if (a > 12 && g > 1.45 * Math.max(r, b, 1) && Math.max(r, b) < 110) greenResidue += 1;
        lumaSum += luma;
        lumaSquaredSum += luma * luma;
        hash ^= r; hash = Math.imul(hash, 16777619) >>> 0;
        hash ^= g; hash = Math.imul(hash, 16777619) >>> 0;
        hash ^= b; hash = Math.imul(hash, 16777619) >>> 0;
        if (colors.size < 4096) colors.add(`${r >> 3},${g >> 3},${b >> 3},${a >> 5}`);
      }
    }
    const mean = lumaSum / Math.max(1, samples);
    const variance = Math.max(0, lumaSquaredSum / Math.max(1, samples) - mean * mean);
    const rect = canvas.getBoundingClientRect();
    return {
      canvas: { width: canvas.width, height: canvas.height },
      client: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio || 1 },
      sampleStride: stride,
      sampledPixels: samples,
      nonBlackPixels: nonBlack,
      nonBlackRatio: nonBlack / Math.max(1, samples),
      meanLuma: mean,
      lumaStdDev: Math.sqrt(variance),
      distinctQuantizedColors: colors.size,
      greenResiduePixels: greenResidue,
      greenResidueRatio: greenResidue / Math.max(1, samples),
      pixelHash: hash.toString(16).padStart(8, '0'),
    };
  });
}

async function settleCompositor(page) {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function captureFrame(page, viewport, scene, frame, sequence, snapshot, failures) {
  await settleCompositor(page);
  const metrics = await canvasMetrics(page);
  const viewportDir = path.join(OUT_DIR, viewport.id);
  fs.mkdirSync(viewportDir, { recursive: true });
  const fileName = `${String(sequence).padStart(2, '0')}_${scene.id}_f${String(frame).padStart(3, '0')}.png`;
  const outputPath = path.join(viewportDir, fileName);
  const canvas = await page.$('#game, canvas');
  if (!canvas) throw new Error(`${viewport.id}/${scene.id}: canvas element not found`);
  await canvas.screenshot({ path: outputPath, type: 'png', omitBackground: false });
  await canvas.dispose();
  const bytes = fs.statSync(outputPath).size;
  const nonEmpty = bytes > 5000
    && metrics.nonBlackRatio > 0.01
    && metrics.lumaStdDev > 2
    && metrics.distinctQuantizedColors > 24;
  if (!nonEmpty) {
    failures.push(`${viewport.id}/${scene.id}/f${frame}: blank or low-information screenshot (${JSON.stringify(metrics)})`);
  }
  if (snapshot.quality !== viewport.qualityValue) {
    failures.push(`${viewport.id}/${scene.id}/f${frame}: quality=${snapshot.quality}, expected=${viewport.qualityValue}`);
  }
  if ((snapshot.fallbacks || []).length || (snapshot.assetStatus?.fallbacks || []).length) {
    failures.push(`${viewport.id}/${scene.id}/f${frame}: fallback used: ${JSON.stringify(snapshot.fallbacks || snapshot.assetStatus?.fallbacks)}`);
  }
  return {
    viewport: viewport.id,
    scene: scene.id,
    concept: scene.concept,
    frame,
    file: relativeToReport(outputPath),
    bytes,
    sha256: sha256File(outputPath),
    nonEmpty,
    metrics,
    snapshot,
  };
}

function finitePoint(value) {
  const point = value?.position || value?.head || value;
  const x = Number(point?.x);
  const y = Number(point?.y);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

function normalizeAngle(value) {
  const angle = Number(value);
  return Number.isFinite(angle) ? ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) : NaN;
}

function endpointAngleGapsDeg(values) {
  const angles = values.map(normalizeAngle).filter(Number.isFinite).sort((a, b) => a - b);
  if (angles.length !== 5) return [];
  return angles.map((angle, index) => {
    const next = angles[(index + 1) % angles.length] + (index === angles.length - 1 ? Math.PI * 2 : 0);
    return (next - angle) * 180 / Math.PI;
  });
}

function maxChordDeviationForSamples(values) {
  const samples = (values || []).map(finitePoint).filter(Boolean);
  if (samples.length < 3) return NaN;
  const start = samples[0];
  const end = samples.at(-1);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const chordLength = Math.hypot(dx, dy);
  if (chordLength < 1e-6) return NaN;
  return Math.max(...samples.slice(1, -1).map((point) => (
    Math.abs(dx * (point.y - start.y) - dy * (point.x - start.x)) / chordLength
  )));
}

function curveHandednessForSamples(values) {
  const samples = (values || []).map(finitePoint).filter(Boolean);
  if (samples.length < 3) return 0;
  const start = samples[0];
  const end = samples.at(-1);
  let strongestCross = 0;
  for (const point of samples.slice(1, -1)) {
    const cross = (end.x - start.x) * (point.y - start.y)
      - (end.y - start.y) * (point.x - start.x);
    if (Math.abs(cross) > Math.abs(strongestCross)) strongestCross = cross;
  }
  return Math.abs(strongestCross) > 1e-6 ? Math.sign(strongestCross) : 0;
}

function splitTrajectoryContract(visual) {
  const raw = visual?.split?.trajectoryContract ?? visual?.split?.trajectory ?? {};
  return typeof raw === 'string' ? { kind: raw } : (raw || {});
}

function splitMetricSources(contract) {
  const values = contract.trajectories || contract.projectiles || contract.entries || [];
  return Array.isArray(values) ? values : [];
}

function numericArray(value) {
  return Array.isArray(value) ? value.map(Number).filter(Number.isFinite) : [];
}

function collectSplitTrajectoryRecords(snapshots, trajectoryContract) {
  const records = new Map();
  const contractEntries = splitMetricSources(trajectoryContract);
  for (const snapshot of snapshots) {
    const splits = snapshot.splitShots || [];
    splits.forEach((split, index) => {
      const key = String(split.id ?? split.projectileId ?? split.splitId ?? index);
      const entry = contractEntries[index] || {};
      let record = records.get(key);
      if (!record) {
        record = { key, index, samples: [], progress: -Infinity, finalRadiusError: NaN };
        records.set(key, record);
      }
      const point = finitePoint(split);
      if (point) record.samples.push(point);
      const origin = finitePoint(split.origin || entry.origin || {
        x: split.originX ?? entry.originX,
        y: split.originY ?? entry.originY,
      });
      if (origin) record.origin = origin;
      const targetDistance = Number(split.targetDistance ?? entry.targetDistance
        ?? trajectoryContract.endpointDistances?.[index]);
      if (Number.isFinite(targetDistance)) record.targetDistance = targetDistance;
      const endAngle = Number(split.endAngle ?? split.targetAngle ?? entry.endAngle
        ?? trajectoryContract.endAngles?.[index] ?? split.angle);
      if (Number.isFinite(endAngle)) record.endAngle = endAngle;

      const duration = Number(split.flightDuration ?? split.duration ?? entry.flightTime
        ?? trajectoryContract.flightTime);
      const flightT = Number(split.flightT);
      const travelled = Number(split.travelled);
      const explicitProgress = Number(split.progress ?? entry.progress);
      const progress = Number.isFinite(explicitProgress)
        ? explicitProgress
        : Number.isFinite(flightT) && Number.isFinite(duration) && duration > 0
          ? flightT / duration
          : Number.isFinite(travelled) && Number.isFinite(targetDistance) && targetDistance > 0
            ? travelled / targetDistance
            : NaN;
      if (Number.isFinite(progress)) record.progress = Math.max(record.progress, progress);

      const finalRadiusError = Number(split.finalRadiusError ?? entry.finalRadiusError
        ?? trajectoryContract.finalRadiusErrors?.[index]);
      if (Number.isFinite(finalRadiusError)
          && (!Number.isFinite(record.finalRadiusError) || progress >= record.finalErrorProgress)) {
        record.finalRadiusError = Math.abs(finalRadiusError);
        record.finalErrorProgress = Number.isFinite(progress) ? progress : 0;
      }
      const maxChordDeviation = Number(split.maxChordDeviation ?? entry.maxChordDeviation
        ?? trajectoryContract.maxChordDeviations?.[index]);
      if (Number.isFinite(maxChordDeviation)) {
        record.maxChordDeviation = Math.max(Number(record.maxChordDeviation) || 0, maxChordDeviation);
      }
      const handedness = Number(split.arcHandedness ?? split.curveSign ?? split.handedness
        ?? entry.arcHandedness ?? entry.curveSign ?? entry.handedness);
      if (Number.isFinite(handedness) && handedness !== 0) record.handedness = Math.sign(handedness);
    });
  }

  const recordsByIndex = [...records.values()].sort((a, b) => a.index - b.index);
  for (const record of recordsByIndex) {
    const sampledDeviation = maxChordDeviationForSamples(record.samples);
    if (Number.isFinite(sampledDeviation)) {
      record.maxChordDeviation = Math.max(Number(record.maxChordDeviation) || 0, sampledDeviation);
    }
    if (!record.handedness) record.handedness = curveHandednessForSamples(record.samples);
    if (!Number.isFinite(record.finalRadiusError) && record.origin
        && record.samples.length && Number.isFinite(record.targetDistance)) {
      const origin = record.origin;
      const last = record.samples.at(-1);
      record.finalRadiusError = Math.abs(Math.hypot(last.x - origin.x, last.y - origin.y) - record.targetDistance);
    }
  }
  return recordsByIndex;
}

function hasCentralDragonApparition(snapshot) {
  const direct = snapshot.centralDragonApparition ?? snapshot.splitManifestation ?? snapshot.dragonApparition;
  if (direct === true || direct?.visible === true || direct?.active === true || Number(direct?.life) > 0) return true;
  return (snapshot.effects || []).some((effect) => (
    effect.centralDragonApparition === true
    || effect.apparition === true
    || (/(?:central[- ]?dragon|manifest|apparition)/i.test(`${effect.type || ''} ${effect.visualRole || ''}`)
      && Number(effect.life ?? 1) > 0)
  ));
}

async function runViewport(browser, viewport, port, diagnostics, failures) {
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
  attachDiagnostics(page, viewport, diagnostics, port);
  await page.setViewport({
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.dpr,
    isMobile: viewport.mobile,
    hasTouch: viewport.mobile,
  });
  await page.setUserAgent(viewport.mobile ? MOBILE_UA : DESKTOP_UA);
  await page.goto(`http://127.0.0.1:${port}/?ice-dragon-acceptance=1`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await waitForCaptureApi(page);
  await page.evaluate(() => Promise.race([
    document.fonts?.ready || Promise.resolve(),
    new Promise((resolve) => setTimeout(resolve, 5000)),
  ]));

  const contract = await captureContract(page);
  if (!Array.isArray(contract.assets?.keys) || !contract.assets.keys.length) {
    throw new Error(`${viewport.id}: assetSpec.keys is missing or empty`);
  }
  if (!Array.isArray(contract.assets.runtimeFiles)
      || contract.assets.runtimeFiles.length !== contract.assets.keys.length
      || contract.assets.runtimeFiles.some((file) => !file)) {
    throw new Error(`${viewport.id}: assetSpec.runtimeFiles must map one-to-one with keys`);
  }
  if (new Set(contract.assets.keys).size !== contract.assets.keys.length) {
    throw new Error(`${viewport.id}: assetSpec.keys contains duplicates`);
  }
  if (contract.assets.referenceSheetsRuntime !== false || !/procedural Canvas/i.test(contract.assets.pipeline || '')) {
    failures.push(`${viewport.id}: reference soft-effect sheets must remain out of the runtime contract`);
  }
  const visual = contract.visual || {};
  const projectile = visual.projectile || {};
  const normalSize = projectile.normalSize || [];
  if (projectile.headTexture !== 'icdBulletMain' || projectile.fullProjectileTexture !== false
      || projectile.proceduralEnvelope !== true || projectile.genericComet !== false
      || Number(projectile.targetSilhouetteRatio) < 5.7
      || Number(normalSize[0]) / Math.max(1, Number(normalSize[1])) < 5) {
    failures.push(`${viewport.id}: main projectile must use a separated dragon head plus procedural long envelope: ${JSON.stringify(projectile)}`);
  }
  const proceduralLayers = new Set(projectile.proceduralLayers || []);
  for (const layer of ['volume ribbon', 'crystal facets', 'animated fracture veins', 'moving reflections', 'ice mist', 'detached particles']) {
    if (!proceduralLayers.has(layer)) failures.push(`${viewport.id}: procedural projectile layer missing: ${layer}`);
  }
  const split = visual.split || {};
  const trajectory = splitTrajectoryContract(visual);
  const trajectoryKind = String(trajectory.kind ?? trajectory.mode ?? trajectory.shape ?? split.trajectory ?? '');
  const flightTime = Number(trajectory.flightTime ?? split.flightTime ?? split.flightDuration);
  const manifestLead = Number(trajectory.manifestLead ?? split.manifestLead ?? visual.impact?.manifestLead);
  const endpointRange = numericArray(trajectory.endpointRange ?? trajectory.travelRange
    ?? split.endpointRange ?? split.travelRange);
  const angleGapRange = numericArray(trajectory.endAngleGapRangeDeg ?? trajectory.endpointAngleGapRangeDeg
    ?? split.endAngleGapRangeDeg);
  const handednessContract = trajectory.unifiedHandedness ?? trajectory.sameHandedness
    ?? split.unifiedHandedness ?? split.unifiedSpinDirection ?? trajectory.handedness;
  const unifiedHandedness = handednessContract === true
    || (Number.isFinite(Number(handednessContract)) && Number(handednessContract) !== 0)
    || /^(?:unified|same|clockwise|counterclockwise|cw|ccw)$/i.test(String(handednessContract || ''));
  const minChordDeviationRatio = Number(trajectory.minChordDeviationRatio ?? split.minChordDeviationRatio
    ?? split.maxChordDeviationRatio);
  const minCurvedProjectiles = Number(trajectory.minCurvedProjectiles ?? split.minCurvedProjectiles);
  const maxFinalRadiusError = Number(trajectory.maxFinalRadiusError ?? split.maxFinalRadiusError);
  if (split.count !== 5 || split.headTexture !== 'icdBulletSplit'
      || split.genericStar !== false || split.proceduralEnvelope !== true
      || Number(split.normalSize?.[0]) < 88 || Number(split.normalSize?.[1]) < 30
      || Number(split.lengthRange?.[0]) > 42 || Number(split.originGap) < 44
      || Number(split.trailNodeCap) > 16 || Number(split.headSize?.[0]) < 76
      || Number(split.headSize?.[0]) / Math.max(1, Number(split.headSize?.[1])) < 2.5) {
    failures.push(`${viewport.id}: split contract must be five independent procedural dragon shots`);
  }
  if (!/(?:curved|petal|arc)/i.test(trajectoryKind) || !unifiedHandedness
      || !Number.isFinite(flightTime)
      || flightTime < SPLIT_TRAJECTORY_ACCEPTANCE.flightTimeMin
      || flightTime > SPLIT_TRAJECTORY_ACCEPTANCE.flightTimeMax
      || !Number.isFinite(manifestLead)
      || manifestLead < SPLIT_TRAJECTORY_ACCEPTANCE.manifestLeadMin
      || manifestLead > SPLIT_TRAJECTORY_ACCEPTANCE.manifestLeadMax
      || endpointRange.length !== 2
      || endpointRange[0] < SPLIT_TRAJECTORY_ACCEPTANCE.endpointMin
      || endpointRange[1] > SPLIT_TRAJECTORY_ACCEPTANCE.endpointMax
      || !Number.isFinite(minChordDeviationRatio)
      || minChordDeviationRatio < SPLIT_TRAJECTORY_ACCEPTANCE.minChordDeviationRatio
      || !Number.isFinite(minCurvedProjectiles)
      || minCurvedProjectiles < SPLIT_TRAJECTORY_ACCEPTANCE.minCurvedProjectiles
      || !Number.isFinite(maxFinalRadiusError)
      || maxFinalRadiusError > SPLIT_TRAJECTORY_ACCEPTANCE.maxFinalRadiusError
      || angleGapRange.length !== 2
      || angleGapRange[0] < SPLIT_TRAJECTORY_ACCEPTANCE.minEndAngleGapDeg
      || angleGapRange[1] > SPLIT_TRAJECTORY_ACCEPTANCE.maxEndAngleGapDeg) {
    failures.push(`${viewport.id}: split trajectory contract must declare one-handed curved petals, timing, endpoints, curvature, radius error, and 64-80deg endpoint gaps: ${JSON.stringify(trajectory)}`);
  }
  const centralApparition = visual.impact?.centralDragonApparition ?? visual.impact?.dragonApparition
    ?? split.centralDragonApparition;
  if (!(centralApparition === true || centralApparition?.enabled === true || centralApparition?.visible === true)) {
    failures.push(`${viewport.id}: impact contract must declare a visible central dragon apparition before the five petals manifest`);
  }
  if (visual.impact?.procedural !== true || visual.impact?.textureFrames !== 0 || visual.impact?.genericRing !== false
      || visual.explosion?.procedural !== true || visual.explosion?.textureFrames !== 0 || visual.explosion?.duration < 1
      || visual.explosion?.genericRing !== false) {
    failures.push(`${viewport.id}: procedural impact/explosion lifecycle contract is incomplete`);
  }
  if (!visual.bodyMaterials?.metalReflection || !visual.bodyMaterials?.crystalRefraction
      || !visual.bodyMaterials?.singleEnergyCore || !visual.bodyMaterials?.proceduralTailRibbon
      || !visual.bodyMaterials?.tailMistParticles) {
    failures.push(`${viewport.id}: companion body material layering contract is incomplete`);
  }
  if (contract.cadence?.berserkSecondDelay < 0.33 || contract.cadence?.berserkSecondDelay > 0.39) {
    failures.push(`${viewport.id}: berserk shot spacing must match the 0.34-0.39s video pulse`);
  }

  const initial = await prepareScene(page, 'orbit', viewport.quality);
  if (!initial.deterministicLock) failures.push(`${viewport.id}: deterministic capture lock was not enabled`);
  const readiness = await waitForAssets(page, contract.assets.keys, viewport.id);
  if (!sameKeySet(readiness.readyKeys, contract.assets.keys)) {
    failures.push(`${viewport.id}: readyKeys set differs from assetSpec.keys`);
  }
  if ((readiness.status.fallbacks || []).length) {
    failures.push(`${viewport.id}: fallback present after asset load: ${JSON.stringify(readiness.status.fallbacks)}`);
  }

  const assetPixelAudit = await browserAssetPixelAudit(page, contract.assets);
  for (const asset of assetPixelAudit) {
    if (asset.greenResidueRatio > GREEN_RESIDUE_LIMIT) {
      failures.push(`${viewport.id}/${asset.key}: green residue ${(asset.greenResidueRatio * 100).toFixed(6)}% exceeds ${(GREEN_RESIDUE_LIMIT * 100).toFixed(6)}%`);
    }
    if (!(asset.width > 0 && asset.height > 0 && asset.visiblePixels > 0)) {
      failures.push(`${viewport.id}/${asset.key}: decoded image is empty`);
    }
  }

  const captures = [];
  const sceneSummaries = [];
  let sequence = 0;
  for (const scene of SCENES) {
    const prepared = await prepareScene(page, scene.id, viewport.quality);
    if (!prepared.deterministicLock) failures.push(`${viewport.id}/${scene.id}: deterministic capture lock was not enabled`);
    let previousFrame = 0;
    const sceneCaptures = [];
    for (const frame of scene.frames) {
      const delta = Math.max(0, frame - previousFrame);
      const snapshot = await stepCapture(page, delta, 1 / 60);
      previousFrame = frame;
      const capture = await captureFrame(page, viewport, scene, frame, ++sequence, snapshot, failures);
      captures.push(capture);
      sceneCaptures.push(capture);
    }
    const hashes = [...new Set(sceneCaptures.map((capture) => capture.metrics.pixelHash))];
    if (hashes.length < 2) {
      failures.push(`${viewport.id}/${scene.id}: multi-frame pixel hashes did not change`);
    }
    const snapshots = sceneCaptures.map((capture) => capture.snapshot);
    if (scene.id === 'orbit' || scene.id === 'move' || scene.id === 'over-body') {
      if (snapshots.some((snapshot) => (snapshot.spine || []).length !== 12)) {
        failures.push(`${viewport.id}/${scene.id}: articulated spine must stay at 12 sampled parts`);
      }
    }
    if (scene.id === 'charge' && Math.max(...snapshots.map((snapshot) => Number(snapshot.charge) || 0)) < 0.72) {
      failures.push(`${viewport.id}/charge: runtime charge envelope never became visibly active`);
    }
    if (scene.id === 'projectile') {
      const shots = snapshots.flatMap((snapshot) => snapshot.mainShots || []);
      const maxAge = Math.max(0, ...shots.map((shot) => Number(shot.age) || 0));
      const ratios = shots.map((shot) => Number(shot.visualLength) / Math.max(1, Number(shot.visualWidth)));
      if (maxAge < 0.25 || !ratios.length || Math.min(...ratios) < 5) {
        failures.push(`${viewport.id}/projectile: authored dragon body did not reach its full readable formation`);
      }
    }
    if (scene.id === 'impact') {
      const directEvents = snapshots.flatMap((snapshot) => snapshot.damageEvents || []).filter((event) => event.type === 'direct');
      const uniqueDirect = new Set(directEvents.map((event) => `${event.projectileId}:${event.targetId}`));
      if (uniqueDirect.size !== 1 || Math.max(...snapshots.map((snapshot) => Number(snapshot.splitBursts) || 0)) !== 1) {
        failures.push(`${viewport.id}/impact: expected one direct settlement and one split burst`);
      }
      if (!snapshots.some(hasCentralDragonApparition)) {
        failures.push(`${viewport.id}/impact: central dragon apparition was not exposed or visible before the five split petals`);
      }
    }
    if (scene.id === 'split') {
      const maxSplits = Math.max(...snapshots.map((snapshot) => (snapshot.splitShots || []).length));
      const splitDistances = snapshots.flatMap((snapshot) => snapshot.splitShots || []).map((split) => Number(split.targetDistance));
      const trajectoryRecords = collectSplitTrajectoryRecords(snapshots, trajectory);
      if (maxSplits !== 5 || Math.max(...snapshots.map((snapshot) => Number(snapshot.splitBursts) || 0)) !== 1) {
        failures.push(`${viewport.id}/split: runtime burst must contain exactly five split projectiles`);
      }
      if (!splitDistances.length || splitDistances.some((distance) => (
        !Number.isFinite(distance)
        || distance < SPLIT_TRAJECTORY_ACCEPTANCE.endpointMin
        || distance > SPLIT_TRAJECTORY_ACCEPTANCE.endpointMax
      ))) {
        failures.push(`${viewport.id}/split: each dragon petal endpoint must stay within ${SPLIT_TRAJECTORY_ACCEPTANCE.endpointMin}-${SPLIT_TRAJECTORY_ACCEPTANCE.endpointMax}px`);
      }
      if (trajectoryRecords.length !== 5) {
        failures.push(`${viewport.id}/split: expected five stable trajectory records, got ${trajectoryRecords.length}`);
      } else {
        const curved = trajectoryRecords.filter((record) => (
          Number.isFinite(record.maxChordDeviation)
          && Number.isFinite(record.targetDistance)
          && record.maxChordDeviation >= SPLIT_TRAJECTORY_ACCEPTANCE.minChordDeviationRatio * record.targetDistance
        ));
        if (curved.length < SPLIT_TRAJECTORY_ACCEPTANCE.minCurvedProjectiles) {
          failures.push(`${viewport.id}/split: only ${curved.length}/5 petals reached maxChordDeviation >= ${SPLIT_TRAJECTORY_ACCEPTANCE.minChordDeviationRatio}R`);
        }
        const progress = trajectoryRecords.map((record) => Number(record.progress));
        if (progress.some((value) => !Number.isFinite(value) || value < 0.8)) {
          failures.push(`${viewport.id}/split: trajectory progress was not exposed through the readable flight phase: ${JSON.stringify(progress)}`);
        }
        const finalRadiusErrors = trajectoryRecords.map((record) => Number(record.finalRadiusError));
        if (finalRadiusErrors.some((value) => !Number.isFinite(value)
            || Math.abs(value) > SPLIT_TRAJECTORY_ACCEPTANCE.maxFinalRadiusError)) {
          failures.push(`${viewport.id}/split: final radius error must be <=${SPLIT_TRAJECTORY_ACCEPTANCE.maxFinalRadiusError}px: ${JSON.stringify(finalRadiusErrors)}`);
        }
        const angleGaps = endpointAngleGapsDeg(trajectoryRecords.map((record) => record.endAngle));
        if (angleGaps.length !== 5 || angleGaps.some((gap) => (
          gap < SPLIT_TRAJECTORY_ACCEPTANCE.minEndAngleGapDeg
          || gap > SPLIT_TRAJECTORY_ACCEPTANCE.maxEndAngleGapDeg
        ))) {
          failures.push(`${viewport.id}/split: adjacent endpoint angles must stay within ${SPLIT_TRAJECTORY_ACCEPTANCE.minEndAngleGapDeg}-${SPLIT_TRAJECTORY_ACCEPTANCE.maxEndAngleGapDeg}deg: ${JSON.stringify(angleGaps)}`);
        }
        const handedness = trajectoryRecords.map((record) => Number(record.handedness));
        if (handedness.some((value) => !Number.isFinite(value) || value === 0)
            || new Set(handedness.map(Math.sign)).size !== 1) {
          failures.push(`${viewport.id}/split: all five petal curves must use one visible handedness: ${JSON.stringify(handedness)}`);
        }
      }
    }
    if (scene.id === 'explosion') {
      if (Math.max(...snapshots.map((snapshot) => Number(snapshot.explosions) || 0)) !== 5) {
        failures.push(`${viewport.id}/explosion: runtime split chain must settle exactly five explosions`);
      }
      const lateSnapshots = sceneCaptures.filter((capture) => capture.frame >= 62 && capture.frame <= 82).map((capture) => capture.snapshot);
      if (!lateSnapshots.some((snapshot) => (snapshot.effects || []).some((effect) => effect.type === 'explosion' && effect.life > 0))) {
        failures.push(`${viewport.id}/explosion: textured explosion did not persist into the late violet-mist phase`);
      }
    }
    if (scene.id === 'berserk') {
      const spawnTimes = snapshots.at(-1)?.mainSpawnTimes || [];
      const spacing = spawnTimes.length >= 2 ? spawnTimes[1] - spawnTimes[0] : Infinity;
      const maxMainShots = Math.max(...snapshots.map((snapshot) => (snapshot.mainShots || []).length));
      if (spawnTimes.length !== 2 || maxMainShots < 2 || spacing < 0.33 || spacing > 0.39) {
        failures.push(`${viewport.id}/berserk: expected two live shots spaced near 360ms, got ${JSON.stringify(spawnTimes)}`);
      }
    }
    sceneSummaries.push({
      scene: scene.id,
      frames: [...scene.frames],
      explosionPriming: prepared.explosionPriming,
      captureCount: sceneCaptures.length,
      uniquePixelHashes: hashes,
      maxScreenshotGreenResidueRatio: Math.max(...sceneCaptures.map((capture) => capture.metrics.greenResidueRatio)),
      fallbacks: [...new Set(sceneCaptures.flatMap((capture) => capture.snapshot.fallbacks || []))],
    });
  }

  const finalStatus = await page.evaluate(() => window.__iceDragonCapture__.assetStatus());
  if ((finalStatus.pending || []).length || (finalStatus.failed || []).length
      || (finalStatus.missing || []).length || (finalStatus.fallbacks || []).length) {
    failures.push(`${viewport.id}: final asset status not clean: ${JSON.stringify(finalStatus)}`);
  }
  await page.close();
  return {
    viewport,
    contract,
    readiness,
    finalStatus,
    assetPixelAudit,
    sceneSummaries,
    captures,
  };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function diagnosticsFailures(diagnostics) {
  return [
    ...diagnostics.pageErrors.map((item) => `${item.viewport}: pageerror: ${item.message}`),
    ...diagnostics.consoleErrors.filter((item) => !item.ignored).map((item) => `${item.viewport}: console error: ${item.message}`),
    ...diagnostics.requestFailures.map((item) => `${item.viewport}: requestfailed: ${item.url} :: ${item.reason}`),
    ...diagnostics.notFound.map((item) => `${item.viewport}: HTTP 404: ${item.url}`),
  ];
}

function conceptRecord(filePath) {
  return {
    file: relativeToRoot(filePath),
    reportRelative: path.relative(OUT_DIR, filePath).split(path.sep).join('/'),
    exists: fs.existsSync(filePath),
    sha256: fs.existsSync(filePath) ? sha256File(filePath) : null,
  };
}

function writeMarkdown(report) {
  const lines = [
    '# Ice Crystal Dragon Browser Acceptance',
    '',
    `**Status:** ${report.passed ? 'PASS' : 'FAIL'}`,
    '',
    '## Concept Comparison',
    '',
    '| Wingman body concept | Projectile concept |',
    '| --- | --- |',
    `| ![body concept](${report.concepts.body.reportRelative}) | ![projectile concept](${report.concepts.projectile.reportRelative}) |`,
    '',
    '## Gates',
    '',
    `- Source index SHA-256: \`${report.sourceIndex.sha256}\``,
    `- Frame-by-frame video reference: ${report.referenceVideo.available ? `\`${report.referenceVideo.sha256}\`` : 'not present on this machine'}`,
    `- Video audit: ${report.referenceVideo.auditReport || 'not present'}`,
    `- Viewports: ${report.viewports.map((entry) => `${entry.viewport.id} (${entry.viewport.quality})`).join(', ')}`,
    `- Captures: ${report.summary.captureCount}`,
    `- Required asset keys: ${report.summary.requiredAssetCount}`,
    `- Maximum browser asset green residue: ${(report.summary.maxAssetGreenResidueRatio * 100).toFixed(6)}%`,
    `- Screenshot non-empty failures: ${report.summary.blankCaptureCount}`,
    `- Fallbacks: ${report.summary.fallbacks.length ? report.summary.fallbacks.join(', ') : 'none'}`,
    `- Captured diagnostics: ${report.summary.capturedDiagnosticCount} (${report.summary.ignoredDiagnosticCount} unrelated Dream preload messages ignored, ${report.summary.diagnosticFailureCount} strict failures)`,
    '',
  ];
  if (report.failures.length) {
    lines.push('## Failures', '');
    for (const failure of report.failures) lines.push(`- ${failure.replace(/\n/g, ' ')}`);
    lines.push('');
  }
  for (const viewport of report.viewports) {
    lines.push(`## ${viewport.viewport.id}`, '');
    lines.push('| Scene | Frames | Unique hashes | Max screenshot green | First capture |');
    lines.push('| --- | ---: | ---: | ---: | --- |');
    for (const scene of viewport.sceneSummaries) {
      const first = viewport.captures.find((capture) => capture.scene === scene.scene);
      lines.push(`| ${scene.scene} | ${scene.frames.join(', ')} | ${scene.uniquePixelHashes.length} | ${(scene.maxScreenshotGreenResidueRatio * 100).toFixed(5)}% | [PNG](${first.file}) |`);
    }
    lines.push('');
  }
  fs.writeFileSync(path.join(OUT_DIR, 'report.md'), `${lines.join('\n')}\n`);
}

function writeHtml(report) {
  const failures = report.failures.length
    ? `<ul>${report.failures.map((failure) => `<li>${escapeHtml(failure)}</li>`).join('')}</ul>`
    : '<p class="pass">No strict gate failures.</p>';
  const groups = [
    { id: 'body', title: 'Wingman body, orbit and overdrive', concept: report.concepts.body },
    { id: 'projectile', title: 'Charge, homing, split and explosion', concept: report.concepts.projectile },
  ].map((group) => {
    const captures = report.viewports.flatMap((viewport) => viewport.captures)
      .filter((capture) => capture.concept === group.id);
    const cards = captures.map((capture) => `
      <figure>
        <img loading="lazy" src="${escapeHtml(capture.file)}" alt="${escapeHtml(`${capture.viewport} ${capture.scene} frame ${capture.frame}`)}">
        <figcaption>${escapeHtml(capture.viewport)} / ${escapeHtml(capture.scene)} / f${capture.frame}<br>
          hash ${capture.metrics.pixelHash} / green ${(capture.metrics.greenResidueRatio * 100).toFixed(5)}%</figcaption>
      </figure>`).join('');
    return `
      <section>
        <h2>${escapeHtml(group.title)}</h2>
        <div class="comparison">
          <figure class="concept"><img src="${escapeHtml(group.concept.reportRelative)}" alt="concept reference"><figcaption>Supplied concept reference</figcaption></figure>
          <div class="gallery">${cards}</div>
        </div>
      </section>`;
  }).join('');
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ice Crystal Dragon Acceptance</title>
<style>
  :root{color-scheme:dark;font-family:system-ui,sans-serif;background:#070b16;color:#edf5ff}body{margin:0;padding:24px}h1,h2{letter-spacing:0}header{max-width:1200px;margin:auto}.status{font-weight:800;color:${report.passed ? '#7fffc1' : '#ff8f9e'}}.pass{color:#7fffc1}section{border-top:1px solid #35466b;margin:28px auto 0;padding-top:20px;max-width:1500px}.comparison{display:grid;grid-template-columns:minmax(280px,38%) 1fr;gap:20px;align-items:start}.concept{position:sticky;top:16px}.concept img{width:100%;height:auto}.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}figure{margin:0;background:#11182a;border:1px solid #314466;padding:8px}figure img{display:block;width:100%;height:auto;background:#02040a}figcaption{font-size:12px;line-height:1.45;color:#b8cae8;padding-top:7px;overflow-wrap:anywhere}code{color:#b9d8ff}li{margin:6px 0}@media(max-width:820px){body{padding:12px}.comparison{grid-template-columns:1fr}.concept{position:static}.gallery{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style></head><body>
<header><h1>Ice Crystal Dragon Browser Acceptance</h1><p class="status">${report.passed ? 'PASS' : 'FAIL'}</p>
<p>${report.summary.captureCount} PNG captures, ${report.summary.requiredAssetCount} exact-ready assets, max asset green residue ${(report.summary.maxAssetGreenResidueRatio * 100).toFixed(6)}%.</p><p>Source index SHA-256: <code>${escapeHtml(report.sourceIndex.sha256)}</code></p>
<h2>Strict gate output</h2>${failures}<p><a href="report.json">JSON report</a> / <a href="report.md">Markdown report</a></p></header>
${groups}</body></html>`;
  fs.writeFileSync(path.join(OUT_DIR, 'report.html'), html);
}

function finalizeReport(report) {
  const allCaptures = report.viewports.flatMap((entry) => entry.captures || []);
  const allAssetAudits = report.viewports.flatMap((entry) => entry.assetPixelAudit || []);
  const allFallbacks = report.viewports.flatMap((entry) => entry.finalStatus?.fallbacks || []);
  report.failures = [...new Set([...report.failures, ...diagnosticsFailures(report.diagnostics)])];
  report.passed = report.failures.length === 0;
  report.summary = {
    captureCount: allCaptures.length,
    requiredAssetCount: report.viewports[0]?.contract?.assets?.keys?.length || 0,
    maxAssetGreenResidueRatio: Math.max(0, ...allAssetAudits.map((item) => item.greenResidueRatio)),
    maxScreenshotGreenResidueRatio: Math.max(0, ...allCaptures.map((item) => item.metrics.greenResidueRatio)),
    blankCaptureCount: allCaptures.filter((item) => !item.nonEmpty).length,
    fallbacks: [...new Set(allFallbacks)],
    diagnosticFailureCount: diagnosticsFailures(report.diagnostics).length,
    capturedDiagnosticCount: report.diagnostics.pageErrors.length
      + report.diagnostics.consoleErrors.length
      + report.diagnostics.requestFailures.length
      + report.diagnostics.notFound.length,
    ignoredDiagnosticCount: report.diagnostics.consoleErrors.filter((item) => item.ignored).length,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  writeMarkdown(report);
  writeHtml(report);
}

async function main() {
  if (!fs.existsSync(path.join(SOURCE_DIR, 'index.html'))) {
    throw new Error(`capture source index missing: ${path.join(SOURCE_DIR, 'index.html')}`);
  }
  for (const [name, conceptPath] of Object.entries(CONCEPTS)) {
    if (!fs.existsSync(conceptPath)) throw new Error(`${name} concept missing: ${conceptPath}`);
  }
  const executablePath = chromePath();
  if (!executablePath) throw new Error('Chrome, Edge, or Chromium executable not found');

  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const diagnostics = createDiagnostics();
  const report = {
    schema: 'ice-crystal-dragon-browser-acceptance-v1',
    source: SOURCE_KIND,
    sourceDirectory: relativeToRoot(SOURCE_DIR),
    sourceIndex: {
      file: relativeToRoot(path.join(SOURCE_DIR, 'index.html')),
      bytes: fs.statSync(path.join(SOURCE_DIR, 'index.html')).size,
      sha256: sha256File(path.join(SOURCE_DIR, 'index.html')),
    },
    chromeExecutable: executablePath,
    concepts: { body: conceptRecord(CONCEPTS.body), projectile: conceptRecord(CONCEPTS.projectile) },
    referenceVideo: {
      file: REFERENCE_VIDEO,
      available: fs.existsSync(REFERENCE_VIDEO),
      bytes: fs.existsSync(REFERENCE_VIDEO) ? fs.statSync(REFERENCE_VIDEO).size : 0,
      sha256: fs.existsSync(REFERENCE_VIDEO) ? sha256File(REFERENCE_VIDEO) : null,
      auditReport: fs.existsSync(VIDEO_AUDIT) ? relativeToRoot(VIDEO_AUDIT) : null,
    },
    diagnostics,
    failures: [],
    viewports: [],
  };

  let server;
  let browser;
  try {
    const started = await startServer();
    server = started.server;
    report.localUrl = `http://127.0.0.1:${started.port}/`;
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--autoplay-policy=no-user-gesture-required',
        '--force-color-profile=srgb',
      ],
    });
    for (const viewport of VIEWPORTS) {
      report.viewports.push(await runViewport(browser, viewport, started.port, diagnostics, report.failures));
    }
  } catch (error) {
    report.failures.push(error.stack || error.message || String(error));
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server) await new Promise((resolve) => server.close(resolve));
  }

  finalizeReport(report);
  console.log(`${report.passed ? 'PASS' : 'FAIL'}: ${relativeToRoot(path.join(OUT_DIR, 'report.md'))}`);
  console.log(`HTML: ${relativeToRoot(path.join(OUT_DIR, 'report.html'))}`);
  console.log(`JSON: ${relativeToRoot(path.join(OUT_DIR, 'report.json'))}`);
  console.log(`captures=${report.summary.captureCount} assets=${report.summary.requiredAssetCount} maxAssetGreen=${(report.summary.maxAssetGreenResidueRatio * 100).toFixed(6)}%`);
  if (report.failures.length) {
    for (const failure of report.failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
