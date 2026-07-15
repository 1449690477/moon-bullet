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
    return {
      captureApi: !!cap && typeof cap.prepare === 'function' && typeof cap.step === 'function',
      snapshotApi: !!cap && typeof cap.snapshot === 'function',
      exactPlushVfx: scenes.includes('plush-vfx-lab') || spec?.plushVfx === true,
      exactPhrase: scenes.includes('stage3-phrase') || spec?.phrase === true,
      exactMotion: scenes.includes('stage3-motion-lab') || spec?.motion === true,
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

function writeReports(report) {
  const status = report.failures.length ? 'FAIL' : (report.missingInterfaces.length ? 'PARTIAL' : 'PASS');
  const rows = report.frames.map((frame) => `<figure><img src="${frame.file}" alt="${frame.label}"><figcaption><b>${frame.label}</b>${frame.metadata?.moment ? `<br>${frame.metadata.moment} · 第 ${frame.metadata.frame} 帧` : ''}<br>${frame.screenshot.width}x${frame.screenshot.height} · bullet ${frame.snapshot?.logicalBulletCount || 0}<br>pixel ${frame.visual.pixelHash}</figcaption></figure>`).join('\n');
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), `<!doctype html><meta charset="utf-8"><title>梦境第三关 V2 视觉验收</title>
<style>body{margin:24px;background:#0c1020;color:#eef5ff;font:15px system-ui}h1,h2{color:#ffbee7}.status{font-size:22px;color:${status === 'PASS' ? '#91ffd0' : '#ff9ba8'}}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:14px}figure{margin:0;padding:9px;background:#171d35;border:1px solid #66739c;border-radius:8px}img{width:100%;display:block;background:#05070e}figcaption{padding-top:8px;line-height:1.5}</style>
<h1>梦境第三关「绒梦玩偶屋」V2 视觉验收</h1><p class="status">${status}</p>
<p>Source ${report.source.file} · ${report.source.sha256.slice(0, 12)} · ${report.runtime.chrome}</p>
<h2>自动失败</h2><p>${report.failures.length ? report.failures.join('<br>') : '无'}</p>
<h2>待接验收接口</h2><p>${report.missingInterfaces.length ? report.missingInterfaces.join('<br>') : '无'}</p>
<h2>多帧截图</h2><div class="grid">${rows}</div>`);

  const groupCounts = report.frames.reduce((result, frame) => {
    result[frame.group] = (result[frame.group] || 0) + 1; return result;
  }, {});
  const markdown = `# 梦境第三关 V2 视觉验收报告\n\n` +
    `- 状态：**${status}**\n- 源文件：\`${report.source.file}\`\n- SHA256：\`${report.source.sha256}\`\n- 截图：${report.frames.length} 张\n- 视口：${report.viewports.join('、')}\n\n` +
    `## 验收矩阵\n\n| 组别 | 帧数 |\n|---|---:|\n${Object.entries(groupCounts).map(([key, count]) => `| ${key} | ${count} |`).join('\n')}\n\n` +
    `## 自动失败\n\n${report.failures.length ? report.failures.map((item) => `- [ ] ${item}`).join('\n') : '- [x] 无自动失败'}\n\n` +
    `## 待接接口\n\n${report.missingInterfaces.length ? report.missingInterfaces.map((item) => `- [ ] ${item}`).join('\n') : '- [x] 精确验收接口齐全'}\n\n` +
    `## 人工视觉核对\n\n- [ ] 五只玩偶材质各自可辨，固有色未被整图加法发光冲白\n- [ ] 发射与命中均有 t000、peak_f007、decay_f020 三帧，峰值肉眼可见且衰减不硬切\n- [ ] 十波均能读出共享安全路线，最多两个主要声部\n- [ ] release 窗没有新弹组生成，屏幕可明显减压\n- [ ] 六种运动策略轨迹稳定，不累计乱转、不在可见区突然消失\n- [ ] 弹体暗轮廓、固有色、亮芯、局部 glow 层次清晰\n- [ ] 尾迹只在发射或转段短暂出现，尾迹无伤害\n- [ ] 桌面与移动端无遮挡、无位移、无绿边、无静默 fallback\n`;
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
    generatedAt: new Date().toISOString(), stage: 3, strict: STRICT,
    source: { file: path.relative(ROOT, sourceFile) || 'index.html', sha256: sha256(sourceFile) },
    runtime: { node: process.version, chrome: '', executablePath },
    viewports: ACTIVE_VIEWPORTS.map((viewport) => viewport.id), frames: [], gifs: [],
    capabilities: {}, failures: [], missingInterfaces: [], diagnostics: {},
  };
  const diagnostics = { errors: [], missing: [] };
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
        await capturePlush(page, viewport, report, caps);
        await captureWavePhrases(page, viewport, report, caps);
        await captureLiveBatches(page, viewport, report);
        await captureMotionPolicies(page, viewport, report, caps);
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
  const desktop = report.frames.filter((frame) => frame.label.startsWith('desktop_1280x720/'));
  for (const mob of PLUSH_MOBS) {
    report.gifs.push(buildGif(`plush_${mob}_v2`, desktop.filter((frame) => frame.group === `plush_${mob}`).map((frame) => frame.file), 0.16));
  }
  for (const sample of MOTION_SAMPLES) {
    report.gifs.push(buildGif(`motion_${sample.policy}_v2`, desktop.filter((frame) => frame.group === `motion_${sample.policy}`).map((frame) => frame.file), 0.12));
  }
  report.gifs.push(buildGif('stage3_ten_wave_phrase_v2', desktop.filter((frame) => /^wave\d+$/.test(frame.group)).map((frame) => frame.file), 0.12));
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
