#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawnSync } = require('child_process');
const puppeteer = require('puppeteer-core');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_KIND = String(process.env.DREAM_CAPTURE_SOURCE || 'root').toLowerCase();
const SOURCE_DIR = SOURCE_KIND === 'docs'
  ? path.join(ROOT, 'docs')
  : SOURCE_KIND === 'main'
    ? path.join(ROOT, 'moon-bullet-main')
    : ROOT;
const OUT_DIR = process.env.DREAM_STAGE3_V2_OUT
  ? path.resolve(ROOT, process.env.DREAM_STAGE3_V2_OUT)
  : path.join(ROOT, 'tools', 'dream_level3_visual_v2_acceptance');
const PORT = Number(process.env.DREAM_STAGE3_V2_PORT || 18793);
const STRICT = String(process.env.DREAM_STAGE3_V2_STRICT || '0') === '1';
const SHARK_ONLY = String(process.env.DREAM_STAGE3_SHARK_ONLY || '0') === '1';

const VIEWPORTS = Object.freeze([
  Object.freeze({ id: 'desktop_1280x720', width: 1280, height: 720, dpr: 1, mobile: false, quality: 'high' }),
  Object.freeze({ id: 'mobile_390x844_dpr3', width: 390, height: 844, dpr: 3, mobile: true, quality: 'ultra' }),
  Object.freeze({ id: 'mobile_430x932_dpr3', width: 430, height: 932, dpr: 3, mobile: true, quality: 'low' }),
]);
const VIEWPORT_FILTER = new Set(String(process.env.DREAM_STAGE3_V2_VIEWPORTS || '')
  .split(',').map((value) => value.trim()).filter(Boolean));
const ACTIVE_VIEWPORTS = VIEWPORT_FILTER.size
  ? VIEWPORTS.filter((viewport) => VIEWPORT_FILTER.has(viewport.id))
  : VIEWPORTS;
if (!ACTIVE_VIEWPORTS.length) throw new Error('DREAM_STAGE3_V2_VIEWPORTS did not match a known viewport');

const PLUSH_MOBS = Object.freeze(['leafcat', 'penguin', 'graydoll', 'bluefish', 'starpillow']);
const PLUSH_STATIC_PHASES = Object.freeze(['idle', 'cast']);
const PLUSH_EFFECT_PHASES = Object.freeze(['fire', 'impact']);
const PLUSH_EFFECT_SAMPLES = Object.freeze([
  Object.freeze({ label: 't000', frame: 0, moment: '出现' }),
  Object.freeze({ label: 'peak_f007', frame: 7, moment: '峰值' }),
  Object.freeze({ label: 'decay_f020', frame: 20, moment: '衰减' }),
]);
const PHRASE_PHASES = Object.freeze([
  Object.freeze({ phase: 'cue', phraseTime: 0.62 }),
  Object.freeze({ phase: 'dual', phraseTime: 4.44 }),
  Object.freeze({ phase: 'release', phraseTime: 10.78 }),
]);
const MOTION_SAMPLES = Object.freeze([
  Object.freeze({ policy: 'locked-linear', wave: 1, elapsed: 1.02 }),
  Object.freeze({ policy: 'brake-hold-release', wave: 1, elapsed: 4.38 }),
  Object.freeze({ policy: 'orbit-release', wave: 3, elapsed: 1.02 }),
  Object.freeze({ policy: 'turn-once', wave: 4, elapsed: 1.02 }),
  Object.freeze({ policy: 'bezier-lane', wave: 6, elapsed: 1.02 }),
  Object.freeze({ policy: 'analytic-wave-lane', wave: 7, elapsed: 4.38 }),
]);
const MOTION_FRAMES = Object.freeze([0, 8, 18, 36]);
const EXPECTED_MATERIAL_PHASE_COUNT = 8;
const STAGE3_MATERIAL_SKIN_COUNT = 21;
const MATERIAL_CLOSEUP_SAMPLES = Object.freeze([
  Object.freeze({ label: 't000', ms: 0, frame: 0 }),
  Object.freeze({ label: 't080', ms: 80, frame: 5 }),
  Object.freeze({ label: 't160', ms: 160, frame: 10 }),
  Object.freeze({ label: 't240', ms: 240, frame: 15 }),
  Object.freeze({ label: 't640', ms: 640, frame: 40 }),
  Object.freeze({ label: 't720', ms: 720, frame: 45 }),
]);
const BERSERK_DROP_SAMPLES = Object.freeze([
  Object.freeze({ phase: 'floating', moment: '暴走掉落悬浮' }),
  Object.freeze({ phase: 'attract', moment: '进入玩家吸附轨迹' }),
  Object.freeze({ phase: 'pickup', moment: '拾取瞬间与提示' }),
  Object.freeze({ phase: 'active', moment: '暴走状态生效' }),
]);
const STAGE3_RUNTIME_POLICY_EXPECTATIONS = Object.freeze({
  plushLeafBlade: ['locked-linear', 'bezier-lane'], plushLeafSeed: ['analytic-wave-lane', 'brake-hold-release'], plushLeafBud: ['brake-hold-release', 'bezier-lane'],
  plushIceShard: ['locked-linear', 'brake-hold-release'], plushSnowball: ['brake-hold-release', 'orbit-release'], plushIceSpear: ['locked-linear', 'orbit-release'],
  plushCrystalShard: ['orbit-release', 'turn-once'], plushDollOrb: ['brake-hold-release', 'orbit-release'], plushDollSigil: ['brake-hold-release', 'turn-once'],
  plushWaterDrop: ['analytic-wave-lane', 'turn-once'], plushFishbone: ['turn-once', 'orbit-release'], plushBubblePearl: ['analytic-wave-lane', 'orbit-release'],
  plushStarShot: ['orbit-release', 'brake-hold-release'], plushMeteorStar: ['brake-hold-release', 'analytic-wave-lane'], plushConstellationNode: ['orbit-release', 'brake-hold-release'],
  sharkIceSpear: ['brake-hold-release'], sharkIceShard: ['locked-linear', 'analytic-wave-lane', 'bezier-lane', 'orbit-release'], sharkSnowball: ['analytic-wave-lane', 'locked-linear', 'turn-once'],
  sharkBubble: ['analytic-wave-lane', 'orbit-release', 'turn-once'], sharkWaveCrescent: ['brake-hold-release', 'turn-once'], sharkVoidOrb: ['analytic-wave-lane', 'orbit-release', 'brake-hold-release'],
});
const SHARK_CAPTURE_DEFAULT_SCENES = Object.freeze({
  entry: 'stage3-shark-entry',
  phase: 'stage3-shark-phase',
  hp: 'stage3-shark-hp',
  hit: 'stage3-shark-hit',
  transition: 'stage3-shark-transition',
  death: 'stage3-shark-death',
  performance: 'stage3-shark-performance',
});
const SHARK_BOSS_ASSET_KEYS = Object.freeze([
  'dreamPlushSharkIdle', 'dreamPlushSharkAttack', 'dreamPlushSharkIce', 'dreamPlushSharkRage',
  'dreamPlushSharkVoid', 'dreamPlushSharkHit', 'dreamPlushSharkDeath',
].flatMap((key) => [key, `${key}Glow`]));
const SHARK_BULLET_ASSET_KEYS = Object.freeze([
  'dreamPlushSharkIceSpear', 'dreamPlushSharkIceShard', 'dreamPlushSharkSnowball',
  'dreamPlushSharkBubble', 'dreamPlushSharkWaveCrescent', 'dreamPlushSharkVoidOrb',
].flatMap((key) => [key, `${key}Glow`]));
const SHARK_VFX_ASSET_KEYS = Object.freeze([
  'dreamPlushSharkMuzzle', 'dreamPlushSharkIceBurst', 'dreamPlushSharkWhirlpool',
  'dreamPlushSharkWave', 'dreamPlushSharkVoidBurst', 'dreamPlushSharkShield',
].flatMap((key) => [key, `${key}Glow`]));
const SHARK_UI_ASSET_KEYS = Object.freeze([
  'dreamPlushSharkPortrait', 'dreamPlushSharkBossBarFrame', 'dreamPlushSharkBossBarEmpty',
  'dreamPlushSharkBossBarFill', 'dreamPlushSharkBossBarCritical', 'dreamPlushSharkBossBarGloss',
]);
const SHARK_REQUIRED_ASSET_KEYS = Object.freeze([
  ...SHARK_BOSS_ASSET_KEYS, ...SHARK_BULLET_ASSET_KEYS, ...SHARK_VFX_ASSET_KEYS, ...SHARK_UI_ASSET_KEYS,
]);
const SHARK_ENTRY_FRAMES = Object.freeze([0, 12, 28, 48, 72]);
const SHARK_PHASE_SAMPLES = Object.freeze([
  Object.freeze({ label: 'windup', moment: 'windup', elapsed: 0.12, frame: 0 }),
  Object.freeze({ label: 'active', moment: 'active', elapsed: 1.18, frame: 18 }),
  Object.freeze({ label: 'release', moment: 'release', elapsed: 2.42, frame: 42 }),
]);
const SHARK_HP_SAMPLES = Object.freeze([1, 0.60, 0.30, 0.08]);
const SHARK_EVENT_FRAMES = Object.freeze([0, 8, 20, 36]);
const SHARK_DEATH_FRAMES = Object.freeze([0, 12, 30, 60, 90]);
const SHARK_PERF_FRAMES = Math.max(30, Math.min(600, Number(process.env.DREAM_STAGE3_SHARK_PERF_FRAMES || 120) | 0));
const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const DESKTOP_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

function chromePath() {
  const candidates = [process.env.PUPPETEER_EXECUTABLE_PATH, process.env.CHROME_PATH].filter(Boolean);
  if (process.platform === 'darwin') candidates.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
  else candidates.push('/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser');
  return candidates.find((candidate) => candidate && fs.existsSync(candidate));
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function serveFile(filePath, res) {
  const mime = {
    '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.json': 'application/json',
    '.ogg': 'audio/ogg', '.wav': 'audio/wav',
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
        res.writeHead(403); res.end('Forbidden'); return;
      }
      // The root checkout intentionally has no generated service worker. Serve a
      // capture-only no-op script instead of weakening 404 checks for real assets.
      if (SOURCE_KIND === 'root' && relative === 'sw.js') {
        res.writeHead(200, {
          'Content-Type': 'application/javascript; charset=utf-8',
          'Cache-Control': 'no-store',
          'Service-Worker-Allowed': '/',
        });
        res.end('/* Dream Stage 3 visual capture: intentionally empty service worker. */\n');
        return;
      }
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        serveFile(filePath, res); return;
      }
      const builtMobile = relative.startsWith('assets_mobile/') ? path.resolve(ROOT, 'docs', relative) : '';
      if (builtMobile && builtMobile.startsWith(`${path.join(ROOT, 'docs')}${path.sep}`)
          && fs.existsSync(builtMobile) && fs.statSync(builtMobile).isFile()) {
        serveFile(builtMobile, res); return;
      }
      res.writeHead(404); res.end('Not Found');
    });
    server.once('error', reject);
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

async function createPage(browser, viewport, diagnostics) {
  const page = await browser.newPage();
  await page.setViewport({
    width: viewport.width, height: viewport.height, deviceScaleFactor: viewport.dpr,
    isMobile: viewport.mobile, hasTouch: viewport.mobile,
  });
  await page.setUserAgent(viewport.mobile ? MOBILE_UA : DESKTOP_UA);
  page.on('pageerror', (error) => diagnostics.errors.push(`${viewport.id}: ${error.stack || error.message}`));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const value = message.text();
    if (/404 \(Not Found\)|net::ERR_INTERNET_DISCONNECTED/i.test(value)) return;
    diagnostics.errors.push(`${viewport.id}: ${value}`);
  });
  page.on('response', (response) => {
    if (response.status() === 404 && response.url().startsWith(`http://127.0.0.1:${PORT}/`)
        && !response.url().endsWith('/favicon.ico')) diagnostics.missing.push(response.url());
  });
  page.on('requestfailed', (request) => {
    if (!request.url().startsWith(`http://127.0.0.1:${PORT}/`)) return;
    const reason = request.failure()?.errorText || 'failed';
    if (reason === 'net::ERR_ABORTED') return;
    diagnostics.requestFailures.push(`${viewport.id}: ${request.url()} :: ${reason}`);
  });
  await page.goto(`http://127.0.0.1:${PORT}/?dream-stage3-visual-v2=1`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => window.__dreamModeCapture__ && window.__dreamModeInternals__, { timeout: 30000 });
  await page.evaluate(() => document.fonts?.ready || Promise.resolve());
  await prepare(page, 'room', { quality: viewport.quality });
  diagnostics.stage3Assets = diagnostics.stage3Assets || {};
  diagnostics.stage3Assets[viewport.id] = await waitForStage3Assets(page, viewport);
  return page;
}

async function waitForStage3Assets(page, viewport) {
  const stageId = 'dream-03-plush-room';
  const deadline = Date.now() + 30000;
  let status = null;
  while (Date.now() < deadline) {
    status = await page.evaluate((id) => window.__dreamModeInternals__.bulletAssetStatus(id), stageId);
    const failed = [
      ...(status?.missing || []), ...(status?.decodeFailed || []),
      ...(status?.materialMissing || []), ...(status?.materialDecodeFailed || []),
      ...(status?.stageVisualMissing || []), ...(status?.stageVisualDecodeFailed || []),
    ];
    if (failed.length) {
      throw new Error(`${viewport.id}: Stage 3 asset decode/missing failure: ${[...new Set(failed)].join(', ')}`);
    }
    const pending = [
      ...(status?.pending || []), ...(status?.materialPending || []),
      ...(status?.stageVisualPending || []),
    ];
    if (!pending.length && Number(status?.loaded?.length || 0) === Number(status?.expected || 0)) return status;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const pending = [
    ...(status?.pending || []), ...(status?.materialPending || []),
    ...(status?.stageVisualPending || []),
  ];
  throw new Error(`${viewport.id}: Stage 3 assets did not settle: ${[...new Set(pending)].join(', ')}`);
}

async function capabilities(page) {
  return page.evaluate(() => {
    const cap = window.__dreamModeCapture__;
    const internals = window.__dreamModeInternals__;
    const spec = typeof internals?.stage3VisualCaptureSpec === 'function'
      ? internals.stage3VisualCaptureSpec()
      : null;
    const scenes = Array.isArray(spec?.scenes) ? spec.scenes : [];
    const sharkSpec = typeof internals?.stage3SharkCaptureSpec === 'function'
      ? internals.stage3SharkCaptureSpec()
      : (typeof internals?.sharkBossCaptureSpec === 'function' ? internals.sharkBossCaptureSpec() : null);
    const sharkAssetSpec = typeof internals?.stage3SharkAssetSpec === 'function'
      ? internals.stage3SharkAssetSpec()
      : (sharkSpec?.assets || sharkSpec?.assetKeys || null);
    const sharkAssetStatus = typeof internals?.stage3SharkAssetStatus === 'function'
      ? internals.stage3SharkAssetStatus()
      : null;
    return {
      captureApi: !!cap && typeof cap.prepare === 'function' && typeof cap.step === 'function',
      snapshotApi: !!cap && typeof cap.snapshot === 'function',
      exactPlushVfx: scenes.includes('plush-vfx-lab') || spec?.plushVfx === true,
      exactPhrase: scenes.includes('stage3-phrase') || spec?.phrase === true,
      exactMotion: scenes.includes('stage3-motion-lab') || spec?.motion === true,
      exactMaterialCloseup: scenes.includes('material-closeup') || spec?.materialCloseup === true,
      exactDreamBerserkDrop: scenes.includes('dream-berserk-drop') || spec?.dreamBerserkDrop === true,
      exactSharkBoss: !!sharkSpec,
      sharkSpec,
      sharkAssetSpec,
      sharkAssetStatus,
      materialSpec: typeof internals?.bulletMaterialSpec === 'function' ? internals.bulletMaterialSpec() : null,
      materialSkins: typeof internals?.bulletSkinSpec === 'function' ? internals.bulletSkinSpec('dream-03-plush-room') : [],
      visualSpec: spec,
    };
  });
}

async function prepare(page, scene, options = {}) {
  return page.evaluate(({ scene, options }) => {
    const cap = window.__dreamModeCapture__;
    return cap.prepare(scene, { stage: 3, ...options }) || cap.snapshot();
  }, { scene, options });
}

async function step(page, frames, dt = 1 / 60) {
  return page.evaluate(({ frames, dt }) => {
    const cap = window.__dreamModeCapture__;
    return cap.step(frames, dt) || cap.snapshot();
  }, { frames, dt });
}

async function canvasMetrics(page) {
  return page.evaluate(() => {
    const canvas = document.getElementById('game') || document.querySelector('canvas');
    if (!canvas) throw new Error('game canvas missing');
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const stride = Math.max(1, Math.floor(Math.min(canvas.width, canvas.height) / 120));
    let samples = 0; let visible = 0; let highlight = 0; let dark = 0; let hash = 2166136261 >>> 0;
    for (let y = 0; y < canvas.height; y += stride) {
      for (let x = 0; x < canvas.width; x += stride) {
        const i = (y * canvas.width + x) * 4;
        const r = pixels[i]; const g = pixels[i + 1]; const b = pixels[i + 2]; const a = pixels[i + 3];
        const max = Math.max(r, g, b); const min = Math.min(r, g, b);
        samples += 1;
        if (a > 18 && max > 22) visible += 1;
        if (a > 72 && max > 210) highlight += 1;
        if (a > 72 && max < 58 && min < 32) dark += 1;
        hash ^= r; hash = Math.imul(hash, 16777619) >>> 0;
        hash ^= g; hash = Math.imul(hash, 16777619) >>> 0;
        hash ^= b; hash = Math.imul(hash, 16777619) >>> 0;
      }
    }
    return {
      canvas: { width: canvas.width, height: canvas.height },
      client: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio || 1 },
      visibleRatio: samples ? visible / samples : 0,
      highlightRatio: samples ? highlight / samples : 0,
      darkRatio: samples ? dark / samples : 0,
      pixelHash: hash.toString(16).padStart(8, '0'),
    };
  });
}

async function screenshotBulletCloseup(page, bullet, fileName) {
  const capture = await page.evaluate(({ bullet, outputSize }) => {
    const canvas = document.getElementById('game') || document.querySelector('canvas');
    if (!canvas) throw new Error('game canvas missing');
    const logicalWidth = typeof W === 'number' && W > 0 ? W : canvas.width;
    const logicalHeight = typeof H === 'number' && H > 0 ? H : canvas.height;
    const scaleX = canvas.width / logicalWidth;
    const scaleY = canvas.height / logicalHeight;
    const logicalSize = Math.max(144, Math.min(184, Number(bullet.drawDiameter || 0) * 2.5));
    const sourceWidth = logicalSize * scaleX;
    const sourceHeight = logicalSize * scaleY;
    const centerX = Number(bullet.x) * scaleX;
    const centerY = Number(bullet.y) * scaleY;
    const sourceX = Math.max(0, Math.min(canvas.width - sourceWidth, centerX - sourceWidth * 0.5));
    const sourceY = Math.max(0, Math.min(canvas.height - sourceHeight, centerY - sourceHeight * 0.5));
    const closeup = document.createElement('canvas');
    closeup.width = outputSize;
    closeup.height = outputSize;
    const ctx = closeup.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, outputSize, outputSize);
    const pixels = ctx.getImageData(0, 0, outputSize, outputSize).data;
    const inset = Math.floor(outputSize * 0.24);
    let minLum = 255;
    let maxLum = 0;
    let bright = 0;
    let dark = 0;
    let samples = 0;
    for (let y = inset; y < outputSize - inset; y += 3) {
      for (let x = inset; x < outputSize - inset; x += 3) {
        const i = (y * outputSize + x) * 4;
        const lum = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
        minLum = Math.min(minLum, lum);
        maxLum = Math.max(maxLum, lum);
        if (lum >= 150) bright += 1;
        if (lum <= 58) dark += 1;
        samples += 1;
      }
    }
    return {
      dataUrl: closeup.toDataURL('image/png'),
      source: { x: sourceX, y: sourceY, width: sourceWidth, height: sourceHeight, logicalSize },
      metrics: {
        minLuminance: minLum,
        maxLuminance: maxLum,
        luminanceRange: maxLum - minLum,
        brightRatio: samples ? bright / samples : 0,
        darkRatio: samples ? dark / samples : 0,
      },
    };
  }, { bullet, outputSize: 480 });
  const buffer = Buffer.from(capture.dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
  fs.writeFileSync(path.join(OUT_DIR, fileName), buffer);
  return {
    width: buffer.subarray(12, 16).toString('ascii') === 'IHDR' ? buffer.readUInt32BE(16) : 0,
    height: buffer.subarray(12, 16).toString('ascii') === 'IHDR' ? buffer.readUInt32BE(20) : 0,
    source: capture.source,
    metrics: capture.metrics,
  };
}

function sanitize(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]+/g, '_');
}

function pushIssue(report, kind, message) {
  if (kind === 'missing-interface') report.missingInterfaces.push(message);
  else report.failures.push(message);
}

async function record(page, viewport, report, group, phase, metadata = {}) {
  const snapshot = await page.evaluate(() => window.__dreamModeCapture__.snapshot());
  const file = `${viewport.id}_${sanitize(group)}_${sanitize(phase)}.png`;
  const buffer = Buffer.from(await page.screenshot({ captureBeyondViewport: false, fullPage: false }));
  fs.writeFileSync(path.join(OUT_DIR, file), buffer);
  const width = buffer.subarray(12, 16).toString('ascii') === 'IHDR' ? buffer.readUInt32BE(16) : 0;
  const height = buffer.subarray(12, 16).toString('ascii') === 'IHDR' ? buffer.readUInt32BE(20) : 0;
  const visual = await canvasMetrics(page);
  const label = `${viewport.id}/${group}/${phase}`;
  const expectedWidth = viewport.width * viewport.dpr;
  const expectedHeight = viewport.height * viewport.dpr;
  if (width !== expectedWidth || height !== expectedHeight) report.failures.push(`${label}: screenshot ${width}x${height} != ${expectedWidth}x${expectedHeight}`);
  const right = visual.client.x + visual.client.width;
  const bottom = visual.client.y + visual.client.height;
  if (visual.client.x < -1 || visual.client.y < -1 || right > visual.viewport.width + 1 || bottom > visual.viewport.height + 1) {
    report.failures.push(`${label}: canvas shifted or clipped`);
  }
  if (visual.visibleRatio < 0.02) report.failures.push(`${label}: canvas visually blank`);
  if ((snapshot?.fallbacks || []).length) report.failures.push(`${label}: visual fallbacks ${snapshot.fallbacks.join(', ')}`);
  if (Number(snapshot?.logicalBulletCount || 0) > 96) report.failures.push(`${label}: ${snapshot.logicalBulletCount} bullets > 96`);
  report.frames.push({ label, file, group, phase, metadata, snapshot, visual, screenshot: { width, height } });
  return snapshot;
}

function collectSharkAssetKeys(value, result = new Set()) {
  if (typeof value === 'string') {
    if (value.startsWith('dreamPlushShark')) result.add(value);
    return result;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectSharkAssetKeys(item, result));
    return result;
  }
  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => {
      if (key.startsWith('dreamPlushShark')) result.add(key);
      collectSharkAssetKeys(item, result);
    });
  }
  return result;
}

function sharkScene(caps, kind) {
  const spec = caps?.sharkSpec || {};
  const scenes = spec.scenes;
  if (scenes && !Array.isArray(scenes) && typeof scenes[kind] === 'string') return scenes[kind];
  if (typeof spec[`${kind}Scene`] === 'string') return spec[`${kind}Scene`];
  if (typeof spec.scene === 'string') return spec.scene;
  if (Array.isArray(scenes)) {
    if (scenes.includes(SHARK_CAPTURE_DEFAULT_SCENES[kind])) return SHARK_CAPTURE_DEFAULT_SCENES[kind];
    const shared = scenes.find((scene) => /shark/i.test(String(scene)));
    if (shared) return shared;
  }
  return SHARK_CAPTURE_DEFAULT_SCENES[kind];
}

async function prepareShark(page, caps, kind, options = {}) {
  return prepare(page, sharkScene(caps, kind), {
    captureKind: kind,
    mode: kind,
    ...options,
  });
}

function sharkBossState(snapshot) {
  return snapshot?.sharkBoss || snapshot?.bossSnapshot || snapshot?.boss || null;
}

function sharkBossUiState(snapshot) {
  return snapshot?.sharkBossUi || snapshot?.bossUi || snapshot?.bossBar || null;
}

function finiteRate(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function sharkHpRate(snapshot) {
  const bossState = sharkBossState(snapshot) || {};
  const direct = finiteRate(bossState.hpRate, bossState.healthRate, snapshot?.bossHpRate);
  if (direct != null) return direct;
  const hp = Number(bossState.hp ?? snapshot?.bossHp);
  const maxHp = Number(bossState.maxHp ?? snapshot?.bossMaxHp);
  return Number.isFinite(hp) && Number.isFinite(maxHp) && maxHp > 0 ? hp / maxHp : null;
}

function sharkUiFillRate(snapshot) {
  const ui = sharkBossUiState(snapshot) || {};
  return finiteRate(ui.fillRate, ui.hpRate, ui.displayRate, snapshot?.bossUiFillRate);
}

function sharkPhaseMatches(snapshot, expectedPhase) {
  const bossState = sharkBossState(snapshot) || {};
  const actual = Number(bossState.phase ?? snapshot?.bossPhase);
  return Number.isInteger(actual) && (actual === expectedPhase || actual === expectedPhase + 1);
}

async function auditSharkAssets(page, viewport, report, caps) {
  const declared = collectSharkAssetKeys(caps.sharkAssetSpec);
  const missingContract = SHARK_REQUIRED_ASSET_KEYS.filter((key) => !declared.has(key));
  const status = await page.evaluate(() => {
    const internals = window.__dreamModeInternals__;
    if (typeof internals?.stage3SharkAssetStatus === 'function') return internals.stage3SharkAssetStatus();
    return null;
  });
  const unresolved = [...new Set([
    ...(status?.missing || []), ...(status?.decodeFailed || []), ...(status?.fallbacks || []),
    ...(status?.stageVisualMissing || []), ...(status?.stageVisualDecodeFailed || []),
  ])];
  const pending = [...new Set([...(status?.pending || []), ...(status?.stageVisualPending || [])])];
  const loaded = new Set([...(status?.loaded || []), ...(status?.stageVisualLoaded || [])]);
  const notLoaded = loaded.size ? SHARK_REQUIRED_ASSET_KEYS.filter((key) => !loaded.has(key)) : [];
  report.sharkAssets[viewport.id] = {
    expected: SHARK_REQUIRED_ASSET_KEYS.length,
    declared: [...declared].sort(),
    missingContract,
    notLoaded,
    status,
  };
  if (!declared.size) {
    pushIssue(report, 'missing-interface', `${viewport.id}: stage3SharkAssetSpec or shark capture assetKeys is required`);
  } else if (missingContract.length) {
    report.failures.push(`${viewport.id}/shark-assets: contract keys missing: ${missingContract.join(', ')}`);
  }
  if (!status) {
    pushIssue(report, 'missing-interface', `${viewport.id}: stage3SharkAssetStatus is required for decode/fallback acceptance`);
  } else {
    if (pending.length) report.failures.push(`${viewport.id}/shark-assets: still pending: ${pending.join(', ')}`);
    if (unresolved.length) report.failures.push(`${viewport.id}/shark-assets: missing/decode/fallback: ${unresolved.join(', ')}`);
    if (notLoaded.length) report.failures.push(`${viewport.id}/shark-assets: required keys not decoded: ${notLoaded.join(', ')}`);
  }
}

async function captureSharkEventTimeline(page, viewport, report, caps, kind, options, frames, group) {
  if (kind === 'entry') {
    const snapshots = [];
    for (const frame of frames) {
      await prepareShark(page, caps, kind, { quality: viewport.quality, ...options, frame });
      snapshots.push(await record(page, viewport, report, group, `f${String(frame).padStart(3, '0')}`, {
        exact: true, captureKind: kind, frame, ...options,
      }));
    }
    return snapshots;
  }
  await prepareShark(page, caps, kind, { quality: viewport.quality, ...options });
  let previous = 0;
  const snapshots = [];
  for (const frame of frames) {
    if (frame > previous) await step(page, frame - previous);
    previous = frame;
    const snapshot = await record(page, viewport, report, group, `f${String(frame).padStart(3, '0')}`, {
      exact: true, captureKind: kind, frame, ...options,
    });
    snapshots.push(snapshot);
  }
  return snapshots;
}

async function captureSharkBoss(page, viewport, report, caps) {
  if (!caps.exactSharkBoss) {
    pushIssue(report, 'missing-interface', `${viewport.id}: stage3SharkCaptureSpec is required for exact shark boss acceptance`);
    return;
  }
  await auditSharkAssets(page, viewport, report, caps);

  const entrySnapshots = await captureSharkEventTimeline(
    page, viewport, report, caps, 'entry', { phase: 0 }, SHARK_ENTRY_FRAMES, 'shark_entry',
  );
  if (!entrySnapshots.some((snapshot) => {
    const state = sharkBossState(snapshot) || {};
    return state.entering === true || Number(state.entryT || 0) > 0;
  })) report.failures.push(`${viewport.id}/shark-entry: no readable in-progress entrance state`);

  for (let phase = 0; phase < 5; phase += 1) {
    for (const sample of SHARK_PHASE_SAMPLES) {
      await prepareShark(page, caps, 'phase', {
        phase, moment: sample.moment, elapsed: sample.elapsed, quality: viewport.quality,
      });
      if (sample.frame > 0) await step(page, sample.frame);
      const snapshot = await record(page, viewport, report, `shark_phase${phase + 1}`, sample.label, {
        exact: true, phase, moment: sample.moment, elapsed: sample.elapsed, frame: sample.frame,
      });
      if (!sharkBossState(snapshot)) report.failures.push(`${viewport.id}/shark-phase${phase + 1}/${sample.label}: boss snapshot missing`);
      else if (!sharkPhaseMatches(snapshot, phase)) report.failures.push(`${viewport.id}/shark-phase${phase + 1}/${sample.label}: wrong boss phase`);
    }
  }

  for (const hpRate of SHARK_HP_SAMPLES) {
    await prepareShark(page, caps, 'hp', { hpRate, phase: hpRate <= 0.20 ? 4 : (hpRate <= 0.40 ? 3 : (hpRate <= 0.60 ? 2 : 0)), quality: viewport.quality });
    const label = `${Math.round(hpRate * 100)}pct`;
    const snapshot = await record(page, viewport, report, 'shark_hp_ui', label, { exact: true, hpRate });
    const actualHpRate = sharkHpRate(snapshot);
    const uiRate = sharkUiFillRate(snapshot);
    const uiState = sharkBossUiState(snapshot);
    if (actualHpRate == null || Math.abs(actualHpRate - hpRate) > 0.015) {
      report.failures.push(`${viewport.id}/shark-hp/${label}: boss HP rate ${actualHpRate} does not match ${hpRate}`);
    }
    if (uiRate == null || Math.abs(uiRate - hpRate) > 0.015) {
      report.failures.push(`${viewport.id}/shark-hp/${label}: UI fill rate ${uiRate} does not match real boss HP ${hpRate}`);
    }
    if (!uiState || uiState.visible === false) report.failures.push(`${viewport.id}/shark-hp/${label}: dedicated boss HP UI is not visible`);
    if (uiState?.linkedToBossHp !== true) report.failures.push(`${viewport.id}/shark-hp/${label}: UI does not declare a live boss.hp/maxHp linkage`);
    if (hpRate <= 0.08 && uiState?.critical !== true) report.failures.push(`${viewport.id}/shark-hp/${label}: critical HP layer is not active`);
  }

  const hitSnapshots = await captureSharkEventTimeline(
    page, viewport, report, caps, 'hit', { phase: 2, hpRate: 0.52 }, SHARK_EVENT_FRAMES, 'shark_hit',
  );
  if (!hitSnapshots.some((snapshot) => {
    const state = sharkBossState(snapshot) || {};
    return /hit/i.test(String(state.pose || state.form || ''))
      || /hit/i.test(String(state.visualKey || ''))
      || Number(state.hitFlash || state.hitT || 0) > 0;
  })) report.failures.push(`${viewport.id}/shark-hit: hit pose/flash never became visible`);

  for (let phase = 1; phase < 5; phase += 1) {
    const transitionSnapshots = await captureSharkEventTimeline(
      page, viewport, report, caps, 'transition', { phase, fromPhase: phase - 1, toPhase: phase },
      SHARK_EVENT_FRAMES, `shark_transition_${phase}_${phase + 1}`,
    );
    if (!transitionSnapshots.some((snapshot) => {
      const state = sharkBossState(snapshot) || {};
      return state.transitioning === true || Number(state.transitionT || state.phaseTransitionT || 0) > 0;
    })) report.failures.push(`${viewport.id}/shark-transition-${phase}-${phase + 1}: transition envelope never became visible`);
  }

  const deathSnapshots = await captureSharkEventTimeline(
    page, viewport, report, caps, 'death', { phase: 4, hpRate: 0 }, SHARK_DEATH_FRAMES, 'shark_death',
  );
  if (!deathSnapshots.some((snapshot) => {
    const state = sharkBossState(snapshot) || {};
    return state.dying === true || state.dead === true || /death/i.test(String(state.pose || state.form || ''));
  })) report.failures.push(`${viewport.id}/shark-death: death state never became visible`);

  await prepare(page, 'result', { stage: 3, stars: 3, elapsedMs: 687000, quality: viewport.quality });
  let previousResultFrame = 0;
  for (const frame of [0, 30, 90]) {
    if (frame > previousResultFrame) await step(page, frame - previousResultFrame);
    previousResultFrame = frame;
    await record(page, viewport, report, 'shark_result', `f${String(frame).padStart(3, '0')}`, { exact: true, stars: 3, frame });
  }
}

function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1))];
}

async function measureSharkFrameCost(page, viewport, report, caps) {
  if (!caps.exactSharkBoss) return;
  await prepareShark(page, caps, 'performance', {
    phase: 4, moment: 'active', elapsed: 2.42, quality: viewport.quality,
  });
  const sample = await page.evaluate(async ({ frames }) => {
    const cap = window.__dreamModeCapture__;
    const intervals = [];
    const cpu = [];
    const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    let previous = await nextFrame();
    for (let frame = 0; frame < frames; frame += 1) {
      const started = performance.now();
      cap.step(1, 1 / 60, false);
      cpu.push(Math.max(0.001, performance.now() - started));
      const now = await nextFrame();
      intervals.push(Math.max(0.001, now - previous));
      previous = now;
    }
    return { intervals, cpu, snapshot: cap.snapshot() };
  }, { frames: SHARK_PERF_FRAMES });
  const average = (values) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
  const averageIntervalMs = average(sample.intervals);
  const cpuP95Ms = percentile(sample.cpu, 0.95);
  const budgetSpec = caps.sharkSpec?.frameBudgetMs;
  const cpuBudgetMs = Number(typeof budgetSpec === 'number'
    ? budgetSpec
    : (viewport.mobile ? budgetSpec?.mobile : budgetSpec?.desktop)) || (viewport.mobile ? 20 : 12);
  report.sharkPerformance[viewport.id] = {
    frames: SHARK_PERF_FRAMES,
    averageFps: Number((1000 / Math.max(0.001, averageIntervalMs)).toFixed(1)),
    averageIntervalMs: Number(averageIntervalMs.toFixed(3)),
    p99IntervalMs: Number(percentile(sample.intervals, 0.99).toFixed(3)),
    averageCpuMs: Number(average(sample.cpu).toFixed(3)),
    p95CpuMs: Number(cpuP95Ms.toFixed(3)),
    maxCpuMs: Number(Math.max(...sample.cpu).toFixed(3)),
    cpuBudgetMs,
    snapshot: sample.snapshot,
  };
  if (cpuP95Ms > cpuBudgetMs) {
    report.failures.push(`${viewport.id}/shark-performance: p95 CPU ${cpuP95Ms.toFixed(2)}ms > ${cpuBudgetMs}ms`);
  }
  if ((sample.snapshot?.fallbacks || []).length) {
    report.failures.push(`${viewport.id}/shark-performance: visual fallbacks ${sample.snapshot.fallbacks.join(', ')}`);
  }
}

async function capturePlush(page, viewport, report, caps) {
  for (const mob of PLUSH_MOBS) {
    if (caps.exactPlushVfx) {
      for (const phase of PLUSH_STATIC_PHASES) {
        await prepare(page, 'plush-vfx-lab', { mob, phase, quality: viewport.quality });
        const snapshot = await record(page, viewport, report, `plush_${mob}`, phase, { exact: true });
        const enemy = snapshot?.enemies?.[0];
        if (!enemy) report.failures.push(`${viewport.id}/plush_${mob}/${phase}: plush missing`);
        if (phase === 'cast' && !enemy?.castPhase && !(enemy?.castT > 0)) report.failures.push(`${viewport.id}/plush_${mob}/cast: cast envelope not exposed`);
      }
      for (const phase of PLUSH_EFFECT_PHASES) {
        await prepare(page, 'plush-vfx-lab', { mob, phase, quality: viewport.quality });
        let previousFrame = 0;
        for (const sample of PLUSH_EFFECT_SAMPLES) {
          if (sample.frame > previousFrame) await step(page, sample.frame - previousFrame);
          previousFrame = sample.frame;
          const snapshot = await record(page, viewport, report, `plush_${mob}`, `${phase}_${sample.label}`, {
            exact: true, effect: phase, frame: sample.frame, moment: sample.moment,
          });
          const enemy = snapshot?.enemies?.[0];
          if (!enemy) report.failures.push(`${viewport.id}/plush_${mob}/${phase}_${sample.label}: plush missing`);
          if (phase === 'fire' && sample.frame === 7 && enemy?.castPhase !== 'fire') {
            report.failures.push(`${viewport.id}/plush_${mob}/fire_peak_f007: fire envelope is not active at the visual peak`);
          }
          if (phase === 'impact' && sample.frame <= 7 && Number(snapshot?.impactFxCount || 0) < 1) {
            report.failures.push(`${viewport.id}/plush_${mob}/${phase}_${sample.label}: no local impact effect`);
          }
        }
      }
      continue;
    }

    await prepare(page, 'plush-material-lab', { mob, attackFlash: 0, quality: viewport.quality });
    await record(page, viewport, report, `plush_${mob}`, 'idle', { exact: false, fallback: 'plush-material-lab' });
    await prepare(page, 'plush-material-lab', { mob, attackFlash: 0.34, quality: viewport.quality });
    await record(page, viewport, report, `plush_${mob}`, 'cast', { exact: false, fallback: 'attackFlash' });
    await step(page, 8);
    await record(page, viewport, report, `plush_${mob}`, 'fire', { exact: false, fallback: 'attackFlash-step' });
  }
  if (!caps.exactPlushVfx) pushIssue(report, 'missing-interface', `${viewport.id}: exact plush idle/cast/fire/impact capture requires plush-vfx-lab`);
}

async function captureWavePhrases(page, viewport, report, caps) {
  for (let wave = 1; wave <= 10; wave += 1) {
    for (const sample of PHRASE_PHASES) {
      const scene = caps.exactPhrase ? 'stage3-phrase' : 'wave';
      const options = caps.exactPhrase
        ? { wave, phraseTime: sample.phraseTime, routeX: 360, quality: viewport.quality }
        : { wave, elapsed: sample.phraseTime, quality: viewport.quality };
      await prepare(page, scene, options);
      const snapshot = await record(page, viewport, report, `wave${String(wave).padStart(2, '0')}`, sample.phase, {
        exact: caps.exactPhrase, phraseTime: sample.phraseTime,
      });
      if (caps.exactPhrase) {
        const conductor = snapshot?.conductor || snapshot?.stage3Conductor;
        if (!conductor) report.failures.push(`${viewport.id}/wave${wave}/${sample.phase}: conductor state missing`);
        if (sample.phase === 'release' && conductor && conductor.releaseWindow !== true) report.failures.push(`${viewport.id}/wave${wave}/release: not in release window`);
        if (sample.phase === 'dual') {
          if (!Array.isArray(snapshot?.activeVisualVoices)) {
            report.failures.push(`${viewport.id}/wave${wave}/dual: activeVisualVoices missing from snapshot`);
          } else if (snapshot.activeVisualVoices.length > 2) {
            report.failures.push(`${viewport.id}/wave${wave}/dual: more than two visible voices (${snapshot.activeVisualVoices.join(', ')})`);
          }
        }
      }
    }
  }
  if (!caps.exactPhrase) pushIssue(report, 'missing-interface', `${viewport.id}: exact cue/dual/release conductor capture requires stage3-phrase`);
}

async function captureLiveBatches(page, viewport, report) {
  for (let wave = 1; wave <= 10; wave += 1) {
    await prepare(page, 'stage3-live-wave', { wave, elapsed: 10.20, quality: viewport.quality });
    const snapshot = await record(page, viewport, report, `live_wave${String(wave).padStart(2, '0')}`, 'all_batches', {
      exact: true, elapsed: 10.20,
    });
    const active = snapshot?.activeVisualVoices;
    if (!Array.isArray(active)) {
      report.failures.push(`${viewport.id}/live-wave${wave}: activeVisualVoices missing`);
    } else if (active.length > 2) {
      report.failures.push(`${viewport.id}/live-wave${wave}: more than two live voices (${active.join(', ')})`);
    }
    if ((snapshot?.enemyCount || 0) !== 8) report.failures.push(`${viewport.id}/live-wave${wave}: expected all 8 enemies after batch three`);
  }
}

async function captureDreamBerserkDrop(page, viewport, report, caps) {
  if (!caps.exactDreamBerserkDrop) {
    pushIssue(report, 'missing-interface', `${viewport.id}: exact Dream berserk drop capture requires dream-berserk-drop`);
    return;
  }
  for (const sample of BERSERK_DROP_SAMPLES) {
    await prepare(page, 'dream-berserk-drop', { phase: sample.phase, quality: viewport.quality });
    const snapshot = await record(page, viewport, report, 'berserk_drop', sample.phase, {
      exact: true, moment: sample.moment, frame: 0,
    });
    const drops = Array.isArray(snapshot?.drops) ? snapshot.drops : [];
    if (sample.phase === 'floating' && !(drops.length === 1 && drops[0]?.type === 'berserk')) {
      report.failures.push(`${viewport.id}/berserk-drop/floating: gold berserk drop is not visible`);
    }
    if (sample.phase === 'attract' && !(drops.length === 1 && drops[0]?.attract === true)) {
      report.failures.push(`${viewport.id}/berserk-drop/attract: attraction state is not active`);
    }
    if (sample.phase === 'attract' && drops.length === 1) {
      const moved = Math.hypot(Number(drops[0].x) - Number(drops[0].spawnX), Number(drops[0].y) - Number(drops[0].spawnY));
      const startDistance = Math.hypot(Number(drops[0].spawnX) - Number(snapshot?.playerPosition?.x), Number(drops[0].spawnY) - Number(snapshot?.playerPosition?.y));
      const currentDistance = Math.hypot(Number(drops[0].x) - Number(snapshot?.playerPosition?.x), Number(drops[0].y) - Number(snapshot?.playerPosition?.y));
      if (moved < 4 || currentDistance >= startDistance) {
        report.failures.push(`${viewport.id}/berserk-drop/attract: drop did not move toward the player across updateItems frames`);
      }
    }
    if ((sample.phase === 'pickup' || sample.phase === 'active') && Number(snapshot?.berserkSeconds || 0) < 5) {
      report.failures.push(`${viewport.id}/berserk-drop/${sample.phase}: pickup did not activate the six-second berserk timer`);
    }
    if (sample.phase === 'pickup' && !String(snapshot?.pickupToast || '').includes('暴走')) {
      report.failures.push(`${viewport.id}/berserk-drop/pickup: pickup feedback toast is missing`);
    }
    if ((sample.phase === 'pickup' || sample.phase === 'active') && Number(snapshot?.berserkDamageMultiplier || 1) !== 1.6) {
      report.failures.push(`${viewport.id}/berserk-drop/${sample.phase}: live damage multiplier is not 1.6`);
    }
  }
}

function bulletPolicy(bullet) {
  return bullet?.policy || bullet?.dreamPolicy || bullet?.motionPolicy || '';
}

async function captureMotionPolicies(page, viewport, report, caps) {
  for (const sample of MOTION_SAMPLES) {
    if (caps.exactMotion) await prepare(page, 'stage3-motion-lab', { policy: sample.policy, elapsed: 0, quality: viewport.quality });
    else await prepare(page, 'wave', { wave: sample.wave, elapsed: sample.elapsed, quality: viewport.quality });
    let previous = 0;
    const observedPositions = new Map();
    for (const frame of MOTION_FRAMES) {
      if (frame > previous) await step(page, frame - previous);
      previous = frame;
      const snapshot = await record(page, viewport, report, `motion_${sample.policy}`, `f${String(frame).padStart(3, '0')}`, {
        exact: caps.exactMotion, wave: sample.wave, startElapsed: sample.elapsed,
      });
      for (const bullet of snapshot?.bullets || []) {
        if (caps.exactMotion && bulletPolicy(bullet) !== sample.policy) continue;
        const id = bullet.id || `${bullet.emitter}:${bullet.assetKey}:${bullet.skin}`;
        if (!observedPositions.has(id)) observedPositions.set(id, []);
        observedPositions.get(id).push([Number(bullet.x), Number(bullet.y)]);
      }
      if (caps.exactMotion && !(snapshot?.bullets || []).some((bullet) => bulletPolicy(bullet) === sample.policy)) {
        report.failures.push(`${viewport.id}/motion-${sample.policy}/f${frame}: requested policy missing`);
      }
    }
    if (caps.exactMotion && ![...observedPositions.values()].some((positions) => positions.length >= 3)) {
      report.failures.push(`${viewport.id}/motion-${sample.policy}: no bullet remained visible across three samples`);
    }
  }
  if (!caps.exactMotion) pushIssue(report, 'missing-interface', `${viewport.id}: exact policy-isolated motion capture requires stage3-motion-lab and policy fields`);
}

async function captureMaterialCloseups(page, viewport, report, caps) {
  if (viewport.mobile) return;
  const skins = Array.isArray(caps.materialSkins) ? caps.materialSkins : [];
  const expectedKeys = new Set(skins.map((skin) => String(skin.key || '')).filter(Boolean));
  const phaseBySkin = new Map([...expectedKeys].map((key) => [key, new Set()]));
  const frameCountBySkin = new Map([...expectedKeys].map((key) => [key, 0]));
  const allPhases = new Set();

  if (skins.length !== STAGE3_MATERIAL_SKIN_COUNT || expectedKeys.size !== STAGE3_MATERIAL_SKIN_COUNT) {
    report.failures.push(`${viewport.id}/material-closeup: expected ${STAGE3_MATERIAL_SKIN_COUNT} unique Stage 3 skins, got ${skins.length}/${expectedKeys.size}`);
  }
  if (Number(caps.materialSpec?.phaseCount || 0) !== EXPECTED_MATERIAL_PHASE_COUNT) {
    report.failures.push(`${viewport.id}/material-closeup: expected ${EXPECTED_MATERIAL_PHASE_COUNT} material phases, got ${caps.materialSpec?.phaseCount || 0}`);
  }
  if (caps.materialSpec?.transientTrails !== true || caps.materialSpec?.trailDamaging !== false || Number(caps.materialSpec?.trailCollisionRadius || 0) !== 0) {
    report.failures.push(`${viewport.id}/material-closeup: global trail policy is not transient and presentation-only`);
  }
  if (!caps.exactMaterialCloseup) {
    pushIssue(report, 'missing-interface', `${viewport.id}: isolated material close-ups require material-closeup`);
    return;
  }

  for (const skin of skins) {
    const key = String(skin.key || '');
    let snapshot = await prepare(page, 'material-closeup', { skin: key, quality: viewport.quality });
    let previousFrame = 0;
    for (const sample of MATERIAL_CLOSEUP_SAMPLES) {
      if (sample.frame > previousFrame) snapshot = await step(page, sample.frame - previousFrame, 0.016);
      previousFrame = sample.frame;
      const bullets = Array.isArray(snapshot?.bullets) ? snapshot.bullets : [];
      const bullet = bullets.find((candidate) => String(candidate.skin || '') === key);
      const sampleLabel = `${viewport.id}/material_${key}/${sample.label}`;
      if (bullets.length !== 1 || !bullet) {
        report.failures.push(`${sampleLabel}: isolated lab expected one ${key} bullet, got ${bullets.map((candidate) => candidate.skin).join(', ') || '(none)'}`);
        continue;
      }
      if ((snapshot?.fallbacks || []).length) report.failures.push(`${sampleLabel}: visual fallbacks ${snapshot.fallbacks.join(', ')}`);
      if (String(bullet.emitter || '') !== 'material-closeup') report.failures.push(`${sampleLabel}: close-up is not isolated from the live HUD lab`);
      const phase = Number(bullet.materialPhase);
      phaseBySkin.get(key)?.add(phase);
      allPhases.add(phase);
      frameCountBySkin.set(key, Number(frameCountBySkin.get(key) || 0) + 1);
      const label = `${viewport.id}/material_${key}/${sample.label}`;
      if (!Number.isInteger(phase) || phase < 0 || phase >= EXPECTED_MATERIAL_PHASE_COUNT) {
        report.failures.push(`${label}: material phase ${bullet.materialPhase} outside 0..${EXPECTED_MATERIAL_PHASE_COUNT - 1}`);
      }
      if (bullet.fallback) report.failures.push(`${label}: texture fallback active`);
      if (String(bullet.assetKey || '') !== String(skin.assetKey || '')) {
        report.failures.push(`${label}: asset ${bullet.assetKey || '(none)'} != ${skin.assetKey || '(none)'}`);
      }
      if (bullet.trailDamaging !== false || Number(bullet.trailCollisionRadius || 0) !== 0) {
        report.failures.push(`${label}: trail owns collision/damage`);
      }
      if (Number(bullet.drawDiameter || 0) < Number(bullet.collisionRadius || 0) * 5) {
        report.failures.push(`${label}: rendered body ${bullet.drawDiameter || 0}px is too small for ${bullet.collisionRadius || 0}px collision radius`);
      }

      const visual = await canvasMetrics(page);
      const file = `${viewport.id}_material_${sanitize(key)}_${sample.label}.png`;
      const closeup = await screenshotBulletCloseup(page, bullet, file);
      if (closeup.width !== 480 || closeup.height !== 480) {
        report.failures.push(`${label}: close-up ${closeup.width}x${closeup.height} != 480x480`);
      }
      if (Number(closeup.metrics?.maxLuminance || 0) < 96 || Number(closeup.metrics?.luminanceRange || 0) < 20) {
        report.failures.push(`${label}: enlarged material lacks readable dark/light separation (${JSON.stringify(closeup.metrics)})`);
      }
      if (Number(closeup.metrics?.brightRatio || 0) < 0.001) {
        report.failures.push(`${label}: enlarged material is missing a readable bright core (${JSON.stringify(closeup.metrics)})`);
      }
      report.frames.push({
        label,
        file,
        group: `material_${key}`,
        phase: sample.label,
        metadata: {
          exact: true,
          skin: key,
          assetKey: skin.assetKey,
          elapsedMs: sample.ms,
          frame: sample.frame,
          materialPhase: phase,
          moment: `${sample.ms}ms 材质相位 ${phase}`,
        },
        snapshot,
        bullet,
        crop: { source: closeup.source, metrics: closeup.metrics },
        visual,
        screenshot: { width: closeup.width, height: closeup.height },
      });
    }
  }

  for (const key of expectedKeys) {
    if (Number(frameCountBySkin.get(key) || 0) !== MATERIAL_CLOSEUP_SAMPLES.length) {
      report.failures.push(`${viewport.id}/material_${key}: captured ${frameCountBySkin.get(key) || 0}/${MATERIAL_CLOSEUP_SAMPLES.length} required close-ups`);
    }
    if (Number(phaseBySkin.get(key)?.size || 0) < 2) {
      report.failures.push(`${viewport.id}/material_${key}: material phase did not change across 0/80/160/240/640/720ms`);
    }
  }
  if (allPhases.size !== EXPECTED_MATERIAL_PHASE_COUNT) {
    report.failures.push(`${viewport.id}/material-closeup: observed ${allPhases.size}/${EXPECTED_MATERIAL_PHASE_COUNT} material phases across all ${STAGE3_MATERIAL_SKIN_COUNT} skins`);
  }
  report.materialLab = {
    viewport: viewport.id,
    skinCount: skins.length,
    phaseCount: caps.materialSpec?.phaseCount || 0,
    samples: MATERIAL_CLOSEUP_SAMPLES,
    observedPhases: [...allPhases].sort((a, b) => a - b),
    perSkinPhaseSignatures: Object.fromEntries([...phaseBySkin].map(([key, phases]) => [key, [...phases].sort((a, b) => a - b)])),
  };
}

function buildGif(prefix, files, duration = 0.12) {
  if (!files.length) return { built: false, reason: 'no frames' };
  const listPath = path.join(OUT_DIR, `${prefix}.ffconcat`);
  const lines = ['ffconcat version 1.0'];
  for (const file of files) {
    lines.push(`file '${file.replaceAll("'", "'\\''")}'`);
    lines.push(`duration ${duration}`);
  }
  lines.push(`file '${files.at(-1).replaceAll("'", "'\\''")}'`);
  fs.writeFileSync(listPath, `${lines.join('\n')}\n`);
  const output = path.join(OUT_DIR, `${prefix}.gif`);
  const result = spawnSync('ffmpeg', [
    '-y', '-f', 'concat', '-safe', '0', '-i', listPath,
    '-vf', 'fps=12,scale=720:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=192[p];[s1][p]paletteuse=dither=sierra2_4a',
    '-loop', '0', output,
  ], { cwd: OUT_DIR, encoding: 'utf8' });
  fs.rmSync(listPath, { force: true });
  if (result.error?.code === 'ENOENT') return { built: false, reason: 'ffmpeg missing' };
  if (result.status !== 0) return { built: false, reason: (result.stderr || 'ffmpeg failed').slice(-600) };
  return { built: true, file: path.basename(output) };
}

function auditRuntimeSkinMotions(report) {
  const coverage = new Map();
  for (const frame of report.frames) {
    if (!/^(wave\d+|live_wave\d+|shark_phase\d+)$/.test(String(frame.group || ''))) continue;
    for (const bullet of frame.snapshot?.bullets || []) {
      const skin = String(bullet.skin || '');
      if (!STAGE3_RUNTIME_POLICY_EXPECTATIONS[skin]) continue;
      if (!coverage.has(skin)) coverage.set(skin, { policies: new Set(), motions: new Set(), emitters: new Set() });
      const row = coverage.get(skin);
      if (bullet.policy) row.policies.add(String(bullet.policy));
      if (bullet.motion) row.motions.add(String(bullet.motion));
      if (bullet.emitter) row.emitters.add(String(bullet.emitter));
    }
  }
  for (const [skin, expectedPolicies] of Object.entries(STAGE3_RUNTIME_POLICY_EXPECTATIONS)) {
    const row = coverage.get(skin);
    if (!row) {
      report.failures.push(`runtime-motion/${skin}: skin never appeared in live wave or shark phase captures`);
      continue;
    }
    if (![...row.policies].some((policy) => expectedPolicies.includes(policy))) {
      report.failures.push(`runtime-motion/${skin}: policies [${[...row.policies].join(', ')}] do not match [${expectedPolicies.join(', ')}]`);
    }
    if (!row.emitters.size) report.failures.push(`runtime-motion/${skin}: no real runtime emitter captured`);
  }
  report.runtimeMotionCoverage = Object.fromEntries([...coverage].map(([skin, row]) => [skin, {
    policies: [...row.policies].sort(), motions: [...row.motions].sort(), emitters: [...row.emitters].sort(),
  }]));
}

function writeReports(report) {
  const status = report.failures.length ? 'FAIL' : (report.missingInterfaces.length ? 'PARTIAL' : 'PASS');
  const rows = report.frames.map((frame) => `<figure><img src="${frame.file}" alt="${frame.label}"><figcaption><b>${frame.label}</b>${frame.metadata?.moment ? `<br>${frame.metadata.moment} · 第 ${frame.metadata.frame} 帧` : ''}<br>${frame.screenshot.width}x${frame.screenshot.height} · bullet ${frame.snapshot?.logicalBulletCount || 0}<br>pixel ${frame.visual.pixelHash}</figcaption></figure>`).join('\n');
  const sharkPerformance = Object.entries(report.sharkPerformance).map(([viewport, sample]) =>
    `${viewport}: ${sample.averageFps} FPS · CPU avg ${sample.averageCpuMs}ms · p95 ${sample.p95CpuMs}ms / ${sample.cpuBudgetMs}ms`).join('<br>');
  const materialSummary = SHARK_ONLY
    ? 'Shark-only：旧玩偶、波次、运动与材质矩阵按开关跳过'
    : `${report.materialLab?.skinCount || 0} 种 · ${report.materialLab?.phaseCount || 0} 相位 · 0/80/160/240/640/720ms 连续帧（含相位回环）`;
  const legacyManualChecklist = SHARK_ONLY ? ''
    : `- [ ] 五只玩偶材质各自可辨，固有色未被整图加法发光冲白\n- [ ] 21 种弹体每种都有 0/80/160/240/640/720ms 六帧放大特写，固有色与轮廓可辨\n- [ ] 640/720ms 回环前后局部高光连续，没有从一侧瞬移到另一侧\n- [ ] 8 相位局部高光连续流动，不是整张贴图闪烁\n- [ ] 发射与命中均有 t000、peak_f007、decay_f020 三帧，峰值肉眼可见且衰减不硬切\n- [ ] 十波均能读出共享安全路线，最多两个主要声部\n- [ ] release 窗没有新弹组生成，屏幕可明显减压\n- [ ] 六种运动策略轨迹稳定，不累计乱转、不在可见区突然消失\n- [ ] 弹体暗轮廓、固有色、亮芯、局部 glow 层次清晰\n- [ ] 尾迹只在发射或转段短暂出现，尾迹无伤害\n- [ ] 暴走掉落悬浮、吸附、拾取、激活四帧清晰，拾取后计时和 1.6 倍伤害同步生效\n`;
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), `<!doctype html><meta charset="utf-8"><title>梦境第三关 V2 视觉验收</title>
<style>body{margin:24px;background:#0c1020;color:#eef5ff;font:15px system-ui}h1,h2{color:#ffbee7}.status{font-size:22px;color:${status === 'PASS' ? '#91ffd0' : '#ff9ba8'}}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:14px}figure{margin:0;padding:9px;background:#171d35;border:1px solid #66739c;border-radius:8px}img{width:100%;display:block;background:#05070e}figcaption{padding-top:8px;line-height:1.5}</style>
<h1>梦境第三关「绒梦玩偶屋」V2 视觉验收</h1><p class="status">${status}</p>
<p>Source ${report.source.file} · ${report.source.sha256.slice(0, 12)} · ${report.runtime.chrome}</p>
<p>验收范围：${materialSummary}</p>
<p>鲨鱼 Boss 帧耗：${sharkPerformance || '等待 capture internals'}</p>
<h2>自动失败</h2><p>${report.failures.length ? report.failures.join('<br>') : '无'}</p>
<h2>待接验收接口</h2><p>${report.missingInterfaces.length ? report.missingInterfaces.join('<br>') : '无'}</p>
<h2>多帧截图</h2><div class="grid">${rows}</div>`);

  const groupCounts = report.frames.reduce((result, frame) => {
    result[frame.group] = (result[frame.group] || 0) + 1; return result;
  }, {});
  const markdown = `# 梦境第三关 V2 视觉验收报告\n\n` +
    `- 状态：**${status}**\n- 源文件：\`${report.source.file}\`\n- SHA256：\`${report.source.sha256}\`\n- 截图：${report.frames.length} 张\n- 视口：${report.viewports.join('、')}\n- 验收范围：${materialSummary}\n\n` +
    `## 验收矩阵\n\n| 组别 | 帧数 |\n|---|---:|\n${Object.entries(groupCounts).map(([key, count]) => `| ${key} | ${count} |`).join('\n')}\n\n` +
    `## 鲨鱼 Boss 帧耗\n\n${Object.entries(report.sharkPerformance).length ? Object.entries(report.sharkPerformance).map(([viewport, sample]) => `- ${viewport}: ${sample.averageFps} FPS / CPU avg ${sample.averageCpuMs}ms / p95 ${sample.p95CpuMs}ms（预算 ${sample.cpuBudgetMs}ms）`).join('\n') : '- 等待 `stage3SharkCaptureSpec`'}\n\n` +
    `## 自动失败\n\n${report.failures.length ? report.failures.map((item) => `- [ ] ${item}`).join('\n') : '- [x] 无自动失败'}\n\n` +
    `## 待接接口\n\n${report.missingInterfaces.length ? report.missingInterfaces.map((item) => `- [ ] ${item}`).join('\n') : '- [x] 精确验收接口齐全'}\n\n` +
    `## 人工视觉核对\n\n- [ ] 鲨鱼 Boss 入场有出现、维持、落位多帧，不能硬切或纯平移\n- [ ] 五阶段各有起手、过程、释放三帧，弹体与警示线在桌面/移动端清晰\n- [ ] 专属血条在真实 HP 100% / 60% / 30% / 8% 时填充比例同步，8% 临界层生效\n- [ ] 受击、四次转阶段、死亡与结算均有连续多帧，状态不残留\n- [ ] Boss 七组 base/glow、六组弹体 base/glow、六组 VFX base/glow、六组 UI 素材全部解码且无 fallback\n${legacyManualChecklist}- [ ] 桌面与移动端无遮挡、无位移、无绿边、无静默 fallback\n`;
  fs.writeFileSync(path.join(OUT_DIR, 'REPORT.md'), markdown);
  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
}

async function main() {
  const sourceFile = path.join(SOURCE_DIR, 'index.html');
  if (!fs.existsSync(sourceFile)) throw new Error(`${sourceFile} missing`);
  const executablePath = chromePath();
  if (!executablePath) throw new Error('Chrome executable not found');
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const report = {
    generatedAt: new Date().toISOString(), stage: 3, strict: STRICT, sharkOnly: SHARK_ONLY,
    source: { file: path.relative(ROOT, sourceFile) || 'index.html', sha256: sha256(sourceFile) },
    runtime: { node: process.version, chrome: '', executablePath },
    viewports: ACTIVE_VIEWPORTS.map((viewport) => viewport.id), frames: [], gifs: [],
    capabilities: {}, materialLab: null, sharkAssets: {}, sharkPerformance: {},
    failures: [], missingInterfaces: [], diagnostics: {},
  };
  const diagnostics = { errors: [], missing: [], requestFailures: [] };
  let server; let browser;
  try {
    server = await startServer();
    browser = await puppeteer.launch({ executablePath, headless: true, args: [
      '--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required',
      '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
    ] });
    report.runtime.chrome = await browser.version();
    for (const viewport of ACTIVE_VIEWPORTS) {
      const page = await createPage(browser, viewport, diagnostics);
      try {
        const caps = await capabilities(page);
        report.capabilities[viewport.id] = caps;
        if (!caps.captureApi || !caps.snapshotApi) throw new Error(`${viewport.id}: dream capture API missing`);
        await captureSharkBoss(page, viewport, report, caps);
        await measureSharkFrameCost(page, viewport, report, caps);
        if (!SHARK_ONLY) {
          await capturePlush(page, viewport, report, caps);
          await captureWavePhrases(page, viewport, report, caps);
          await captureLiveBatches(page, viewport, report);
          await captureDreamBerserkDrop(page, viewport, report, caps);
          await captureMotionPolicies(page, viewport, report, caps);
          await captureMaterialCloseups(page, viewport, report, caps);
        }
      } finally {
        await page.close().catch(() => {});
      }
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server) await new Promise((resolve) => server.close(resolve));
  }
  report.diagnostics = diagnostics;
  report.failures.push(...diagnostics.errors);
  if (diagnostics.missing.length) report.failures.push(`404 resources: ${[...new Set(diagnostics.missing)].join(', ')}`);
  if (diagnostics.requestFailures.length) report.failures.push(`failed local requests: ${[...new Set(diagnostics.requestFailures)].join(', ')}`);
  const desktop = report.frames.filter((frame) => frame.label.startsWith('desktop_1280x720/'));
  report.gifs.push(buildGif('shark_entry_v2', desktop.filter((frame) => frame.group === 'shark_entry').map((frame) => frame.file), 0.10));
  for (let phase = 1; phase <= 5; phase += 1) {
    report.gifs.push(buildGif(`shark_phase${phase}_v2`, desktop.filter((frame) => frame.group === `shark_phase${phase}`).map((frame) => frame.file), 0.14));
  }
  report.gifs.push(buildGif('shark_transitions_v2', desktop.filter((frame) => frame.group.startsWith('shark_transition_')).map((frame) => frame.file), 0.10));
  report.gifs.push(buildGif('shark_death_v2', desktop.filter((frame) => frame.group === 'shark_death').map((frame) => frame.file), 0.10));
  if (!SHARK_ONLY) {
    for (const mob of PLUSH_MOBS) {
      report.gifs.push(buildGif(`plush_${mob}_v2`, desktop.filter((frame) => frame.group === `plush_${mob}`).map((frame) => frame.file), 0.16));
    }
    for (const sample of MOTION_SAMPLES) {
      report.gifs.push(buildGif(`motion_${sample.policy}_v2`, desktop.filter((frame) => frame.group === `motion_${sample.policy}`).map((frame) => frame.file), 0.12));
    }
    report.gifs.push(buildGif('stage3_ten_wave_phrase_v2', desktop.filter((frame) => /^wave\d+$/.test(frame.group)).map((frame) => frame.file), 0.12));
    auditRuntimeSkinMotions(report);
  }
  writeReports(report);
  console.log(`Dream Stage 3 V2 visual report: ${path.join(OUT_DIR, 'index.html')}`);
  console.log(`Frames ${report.frames.length}; failures ${report.failures.length}; missing interfaces ${report.missingInterfaces.length}`);
  if (report.failures.length || (STRICT && report.missingInterfaces.length)) {
    throw new Error(`Dream Stage 3 V2 acceptance failed:\n${[...report.failures, ...(STRICT ? report.missingInterfaces : [])].slice(0, 30).join('\n')}`);
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
