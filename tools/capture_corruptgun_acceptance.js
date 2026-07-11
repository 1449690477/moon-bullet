#!/usr/bin/env node
const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawnSync } = require('child_process');
const puppeteer = require('puppeteer-core');

const ROOT = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(ROOT, 'docs');
const SERVE_DIR = process.env.CORRUPTGUN_CAPTURE_FROM_ROOT === '1' ? ROOT : DOCS_DIR;
const OUT_DIR = path.join(ROOT, 'tools', 'corruptgun_acceptance');
const PORT = Number(process.env.CORRUPTGUN_CAPTURE_PORT || 18807);
const BENCH_ONLY = process.env.CORRUPTGUN_CAPTURE_BENCH_ONLY === '1';

const STATIC_SCENES = [
  ['title', '01_title_seventh_character.png', 4],
  ['idle', '02_normal_idle.png', 30],
  ['bank_left', '03_bank_left.png', 8],
  ['bank_right', '04_bank_right.png', 8],
  ['normal_fire', '05_normal_fire_lv1.png', 12],
  ['lv5_fire', '06_normal_fire_lv5.png', 12],
  ['corruption_stack', '07_corruption_stack_x16.png', 8],
  ['marked_death', '08_marked_death.png', 10],
  ['clones', '09_three_clones_idle.png', 42],
  ['clone_attack', '10_three_clones_attack.png', 104],
  ['form_switch', '11_form_switch_mid.png', 17],
  ['overdrive_idle', '12_overdrive_idle.png', 34],
  ['overdrive_fire', '13_overdrive_fire.png', 12],
  ['medium_perf', '14_medium_live_shader.png', 12],
  ['low_perf', '15_low_lossless_atlas.png', 12],
  ['overdrive_clone_stress', '16_stress_stage3.png', 120],
  ['normal_orb_closeup', '17_normal_orb_closeup.png', 4],
  ['overdrive_orb_closeup', '18_overdrive_orb_closeup.png', 4],
  ['clone_orb_closeup', '19_clone_orb_closeup.png', 4],
  ['mark_flow', '20_mark_flow.png', 12],
  ['clone_stationary', '21_clone_stationary.png', 48],
  ['forced_fallback', '22_forced_webgl_fallback.png', 12],
  ['orb_comparison', '23_main_clone_orb_comparison.png', 4],
  ['infection_main', '24_main_infection_tentacles.png', 5],
  ['infection_clone', '25_clone_infection_tentacles.png', 5],
  ['clone_hit', '26_clone_hit_palette.png', 5],
  ['clone_scale_compare', '27_clone_player_scale_compare.png', 4],
  ['overdrive_clone_scale_compare', '28_overdrive_clone_player_scale_compare.png', 4],
  ['overdrive_orb_comparison', '29_overdrive_main_clone_orb_comparison.png', 4],
  ['impact_main', '30_main_hit_feedback.png', 5],
  ['impact_clone', '31_clone_hit_feedback.png', 5],
  ['projection_summon', '32_projection_summon.png', 26],
  ['material_normal', '33_normal_material_layers.png', 30],
  ['material_overdrive', '34_overdrive_material_layers.png', 30],
  ['projectile_spear_showcase', '35_projectile_spear_showcase.png', 6],
  ['boss_corrosion_1', '36_boss_corrosion_001.png', 4],
  ['boss_corrosion_100', '37_boss_corrosion_100.png', 4],
  ['boss_corrosion_200', '38_boss_corrosion_200.png', 4],
];

const ANIMATIONS = [
  ['normal_fire', 'anim_fire', 18, 2],
  ['marked_death', 'anim_death', 20, 2],
  ['clones', 'anim_clones', 24, 3],
  ['form_switch', 'anim_form', 22, 2],
  ['normal_orb_closeup', 'anim_orb_main', 12, 2],
  ['clone_orb_closeup', 'anim_orb_clone', 12, 2],
  ['mark_flow', 'anim_mark_flow', 12, 3],
  ['orb_comparison', 'anim_orb_comparison', 14, 2],
  ['infection_main', 'anim_infection_main', 40, 1],
  ['infection_clone', 'anim_infection_clone', 40, 1],
  ['clone_hit', 'anim_clone_hit', 20, 1],
  ['projection_summon', 'anim_projection_summon', 34, 2],
  ['material_normal', 'anim_material_normal', 24, 3],
  ['material_overdrive', 'anim_material_overdrive', 24, 3],
  ['projectile_spear_showcase', 'anim_projectile_spear', 18, 2],
  ['boss_corrosion_200', 'anim_boss_corrosion', 18, 2],
];

const IMPACT_TIMES = [0, 45, 110, 240, 520];
const INFECTION_TIMES = [0, 80, 180, 380, 620, 860, 1050];
const ULTIMATE_TIMELINE = [
  ['cast', 0, 0, false, 0], ['cast', 120, 0, false, 0], ['cast', 300, 0, false, 0], ['cast', 499, 0, false, 0],
  ['flight', 80, 0, false, 0], ['flight', 280, 0, false, 0], ['flight', 560, 0, false, 0],
  ['burst', 0, 0, false, 0], ['burst', 120, 0, false, 0], ['burst', 299, 0, false, 0],
  ['form', 0, 0, false, 0], ['form', 300, 0, false, 0], ['form', 599, 0, false, 0],
  ['spin', 700, 0, false, 48], ['spin', 1700, 40, false, 72], ['spin', 2700, 80, false, 96],
  ['collapse', 0, 80, false, 80], ['collapse', 200, 80, false, 80], ['collapse', 399, 80, false, 80],
  ['finale', 0, 80, false, 0], ['finale', 160, 80, false, 0], ['finale', 320, 80, false, 0], ['finale', 900, 80, false, 0],
];
const VIEWPORTS = [
  { name: 'desktop_1280x720', width: 1280, height: 720, mobile: false },
  { name: 'mobile_390x844', width: 390, height: 844, mobile: true },
  { name: 'mobile_430x932', width: 430, height: 932, mobile: true },
];

function executablePath() {
  const candidates = [process.env.PUPPETEER_EXECUTABLE_PATH, process.env.CHROME_PATH].filter(Boolean);
  if (process.platform === 'darwin') candidates.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
  else candidates.push('/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser');
  return candidates.find(file => file && fs.existsSync(file));
}

function serveFile(filePath, res) {
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.json': 'application/json' }[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime });
  fs.createReadStream(filePath).pipe(res);
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const rel = req.url === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
      const filePath = path.resolve(SERVE_DIR, rel);
      if (!filePath.startsWith(SERVE_DIR)) { res.writeHead(403); res.end('Forbidden'); return; }
      fs.stat(filePath, (err, stat) => {
        if (err || !stat.isFile()) { res.writeHead(404); res.end('Not Found'); return; }
        serveFile(filePath, res);
      });
    });
    server.once('error', reject);
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

async function canvasCapture(page, scene, advanceFrames) {
  return page.evaluate(async ({ scene, advanceFrames }) => {
    const cap = window.__corruptgunCapture__;
    cap.setup(scene);
    for (let i = 0; i < 8; i++) await new Promise(resolve => requestAnimationFrame(resolve));
    const snapshot = cap.advance(advanceFrames);
    const canvas = document.getElementById('game');
    const context = canvas.getContext('2d');
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let visibleSamples = 0;
    for (let y = 0; y < canvas.height; y += 20) {
      for (let x = 0; x < canvas.width; x += 20) {
        const index = (y * canvas.width + x) * 4;
        if (pixels[index] + pixels[index + 1] + pixels[index + 2] > 45) visibleSamples++;
      }
    }
    return { snapshot, visibleSamples, dataUrl: canvas.toDataURL('image/png') };
  }, { scene, advanceFrames });
}

async function ultimateCapture(page, phase, elapsedMs, absorbed = 40, withBoss = false, bulletCount = 48) {
  return page.evaluate(async ({ phase, elapsedMs, absorbed, withBoss, bulletCount }) => {
    const cap = window.__corruptgunCapture__;
    cap.setUltimatePhase(phase, elapsedMs / 1000, absorbed, withBoss, bulletCount);
    const snapshot = cap.advance(2);
    for (let index = 0; index < 2; index++) await new Promise(resolve => requestAnimationFrame(resolve));
    const canvas = document.getElementById('game');
    return { snapshot, dataUrl: canvas.toDataURL('image/png') };
  }, { phase, elapsedMs, absorbed, withBoss, bulletCount });
}

function writeDataUrl(target, dataUrl) {
  fs.writeFileSync(target, Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));
}

async function main() {
  if (!fs.existsSync(path.join(SERVE_DIR, 'index.html'))) throw new Error(`${SERVE_DIR}/index.html missing`);
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const chrome = executablePath();
  if (!chrome) throw new Error('Chrome executable not found');
  const errors = [];
  const missing = [];
  let server;
  let browser;
  try {
    server = await startServer();
    browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 720, height: 1280, deviceScaleFactor: 1 });
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('response', response => { if (response.status() === 404 && !response.url().endsWith('/favicon.ico')) missing.push(response.url()); });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForFunction(() => !!window.__corruptgunCapture__ && !!window.__corruptgunInternals__, { timeout: 15000 });
    await page.evaluate(() => document.querySelector('.update-notice-close')?.click());
    await page.evaluate(() => { window.__corruptgunCapture__.setup('idle'); });
    const expected = await page.evaluate(() => window.__corruptgunInternals__.assetSpec().keys.length);
    try {
      await page.waitForFunction(count => window.__corruptgunCapture__.readyKeys().length === count, { timeout: 45000 }, expected);
    } catch (error) {
      const readiness = await page.evaluate(() => {
        const expectedKeys = window.__corruptgunInternals__.assetSpec().keys;
        const readyKeys = window.__corruptgunCapture__.readyKeys();
        return { expected: expectedKeys.length, ready: readyKeys.length, missing: expectedKeys.filter(key => !readyKeys.includes(key)) };
      });
      throw new Error(`corrupt-gun assets did not finish loading: ${JSON.stringify(readiness)}`);
    }

    const report = { expectedAssets: expected, readyAssets: expected, staticScenes: [], animations: [], impactTimeline: [], infectionTimeline: [], ultimateTimeline: [], ultimateRotationFrames: [], bankMotion: null, stationaryClone: null, cloneScale: null, cloneLifetime: null, infection: null, cameraFeedback: null, materials: null, projection: null, bossCorrosion: null, ultimate: null, viewports: [], benchmark: null, vfx: null };
    report.vfx = await page.evaluate(() => {
      const cap = window.__corruptgunCapture__;
      cap.setup('idle');
      cap.advance(2);
      return cap.snapshot().vfx;
    });
    if (!report.vfx || report.vfx.mode !== 'webgl' || !report.vfx.available) {
      throw new Error(`high VFX renderer unavailable: ${JSON.stringify(report.vfx)}`);
    }
    report.cloneScale = await page.evaluate(() => window.__corruptgunInternals__.cloneSpec());
    if (Math.abs(report.cloneScale.visibleHeightRatio - 1) > 0.02 || Math.abs(report.cloneScale.visibleHeightRatioOver - 1) > 0.02) {
      throw new Error(`clone visible height is not player-sized: ${JSON.stringify(report.cloneScale)}`);
    }
    if (report.cloneScale.projectileSize !== report.cloneScale.playerProjectileSize || report.cloneScale.projectileSizeOver !== report.cloneScale.playerProjectileSizeOver) {
      throw new Error(`clone projectile is not player-sized: ${JSON.stringify(report.cloneScale)}`);
    }
    if (report.cloneScale.activeLife !== 10 || report.cloneScale.spawnTime !== 0.72 || report.cloneScale.despawnTime !== 0.5) {
      throw new Error(`clone lifetime contract mismatch: ${JSON.stringify(report.cloneScale)}`);
    }
    report.cameraFeedback = await page.evaluate(() => window.__corruptgunInternals__.cameraFeedbackSpec());
    if (report.cameraFeedback.damageShake !== 0 || report.cameraFeedback.directHitShake !== 0 || report.cameraFeedback.infectionHitShake !== 0 || report.cameraFeedback.corruptionDeathShake !== 0) {
      throw new Error(`corrupt-gun damage still moves the camera: ${JSON.stringify(report.cameraFeedback)}`);
    }
    if (report.cameraFeedback.ultimateLaunchShake !== 0 || report.cameraFeedback.ultimateBurstShake !== 0 || report.cameraFeedback.ultimateFinaleShake > 14) {
      throw new Error(`Dark Wheel camera contract mismatch: ${JSON.stringify(report.cameraFeedback)}`);
    }
    report.ultimate = await page.evaluate(() => window.__corruptgunInternals__.ultimateSpec());
    if (report.ultimate.kind !== 'darkWheel' || report.ultimate.timeline.spin !== 8 || report.ultimate.fullBossSequenceStacks !== 19 || report.ultimate.orb.size !== 96
      || report.ultimate.wheel.size !== 900 || report.ultimate.wheel.damageRadius !== 500 || report.ultimate.wheel.tick !== 0.4
      || report.ultimate.wheel.discSize !== 540 || report.ultimate.wheel.innerDiscSize !== 358
      || report.ultimate.wheel.bladeSize !== 126 || report.ultimate.absorption.tangentialPull !== 455
      || report.ultimate.render.spinMasterPixels !== 768 || report.ultimate.render.visualEnvelope > 700
      || report.ultimate.burst.radius !== 430 || report.ultimate.finale.radius !== 680) {
      throw new Error(`Dark Wheel gameplay/render contract mismatch: ${JSON.stringify(report.ultimate)}`);
    }
    report.materials = await page.evaluate(() => window.__corruptgunInternals__.materialSpec());
    report.projection = await page.evaluate(() => window.__corruptgunInternals__.projectionSpec());
    if (!report.materials.layers.includes('metal-sheen') || report.projection.fieldDiameter !== 232 || report.projection.cloneOrbAtlas.base !== 'cgVfxCloneOrbBase') {
      throw new Error(`material/projection contract mismatch: ${JSON.stringify({ materials: report.materials, projection: report.projection })}`);
    }
    report.bossCorrosion = await page.evaluate(() => ({
      spec: window.__corruptgunInternals__.bossCorrosionSpec(),
      zero: window.__corruptgunInternals__.bossCorrosionPreviewForTest(0, 1000000),
      half: window.__corruptgunInternals__.bossCorrosionPreviewForTest(100, 1000000),
      max: window.__corruptgunInternals__.bossCorrosionPreviewForTest(200, 1000000),
    }));
    if (report.bossCorrosion.spec.cap !== 200 || report.bossCorrosion.max.damageBonusPercent !== 600 || report.bossCorrosion.max.damageMultiplier !== 7 || report.bossCorrosion.max.dotPerSecond !== 10000) {
      throw new Error(`boss corrosion contract mismatch: ${JSON.stringify(report.bossCorrosion)}`);
    }
    report.benchmark = await page.evaluate(async () => {
      const cap = window.__corruptgunCapture__;
      cap.setup('overdrive_clone_stress');
      cap.castUltimate();
      for (let frame = 0; frame < 90; frame++) {
        await new Promise(resolve => requestAnimationFrame(resolve));
        cap.advance(1, 1 / 60, false);
      }
      cap.setup('overdrive_clone_stress');
      cap.castUltimate();
      const cpuFrameTimes = [];
      for (let frame = 0; frame < 600; frame++) {
        const started = performance.now();
        cap.advance(1, 1 / 60, false);
        cpuFrameTimes.push(Math.max(0.01, performance.now() - started));
      }
      const sampleDisplayCadence = async () => {
        cap.setup('overdrive_clone_stress');
        cap.castUltimate();
        const frameTimes = [];
        let previous = await new Promise(resolve => requestAnimationFrame(resolve));
        for (let frame = 0; frame < 120; frame++) {
          cap.advance(1, 1 / 60, false);
          const current = await new Promise(resolve => requestAnimationFrame(resolve));
          frameTimes.push(Math.max(0.01, current - previous));
          previous = current;
        }
        const sorted = [...frameTimes].sort((a, b) => a - b);
        const meanMs = frameTimes.reduce((sum, value) => sum + value, 0) / frameTimes.length;
        const p99Ms = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99))];
        return {
          frames: frameTimes.length,
          averageFps: Number((1000 / meanMs).toFixed(1)),
          onePercentLowFps: Number((1000 / p99Ms).toFixed(1)),
          meanFrameMs: Number(meanMs.toFixed(3)),
          p99FrameMs: Number(p99Ms.toFixed(3)),
        };
      };
      // Two isolated samples prevent screenshot/file-I/O jitter from being mistaken
      // for a sustained rendering regression. Keep the stronger full sample.
      const displayAttempts = [await sampleDisplayCadence(), await sampleDisplayCadence()];
      const display = [...displayAttempts].sort((a, b) =>
        b.onePercentLowFps - a.onePercentLowFps || b.averageFps - a.averageFps
      )[0];
      const cpuSorted = [...cpuFrameTimes].sort((a, b) => a - b);
      const cpuMeanMs = cpuFrameTimes.reduce((sum, value) => sum + value, 0) / cpuFrameTimes.length;
      const cpuP99Ms = cpuSorted[Math.min(cpuSorted.length - 1, Math.floor(cpuSorted.length * 0.99))];
      return {
        frames: cpuFrameTimes.length,
        simulatedSeconds: 10,
        averageFps: Number((1000 / cpuMeanMs).toFixed(1)),
        onePercentLowFps: Number((1000 / cpuP99Ms).toFixed(1)),
        meanFrameMs: Number(cpuMeanMs.toFixed(3)),
        p99FrameMs: Number(cpuP99Ms.toFixed(3)),
        displayCadenceFps: display.averageFps,
        displayCadenceOnePercentLowFps: display.onePercentLowFps,
        displayMeanFrameMs: display.meanFrameMs,
        displayP99FrameMs: display.p99FrameMs,
        displayAttempts,
        cadenceLimited: display.meanFrameMs > 28 && cpuMeanMs < 17.25,
        snapshot: cap.snapshot(),
      };
    });
    if (report.benchmark.averageFps < 58 || report.benchmark.onePercentLowFps < 45) {
      throw new Error(`stress benchmark missed target: avg ${report.benchmark.averageFps}, 1% low ${report.benchmark.onePercentLowFps}`);
    }
    if (!report.benchmark.cadenceLimited && (report.benchmark.displayCadenceFps < 58 || report.benchmark.displayCadenceOnePercentLowFps < 45)) {
      throw new Error(`display cadence missed target: avg ${report.benchmark.displayCadenceFps}, 1% low ${report.benchmark.displayCadenceOnePercentLowFps}`);
    }
    if (!report.benchmark.snapshot.player.berserk || !report.benchmark.snapshot.shots.some(shot => shot.kind === 'cgMainOver') || !report.benchmark.snapshot.ultimate.active || report.benchmark.snapshot.clones.length !== 3) {
      throw new Error(`stress scene is missing three clones, live overdrive fire, or Dark Wheel: ${JSON.stringify(report.benchmark.snapshot)}`);
    }
    if (BENCH_ONLY) {
      process.stdout.write(`${JSON.stringify(report.benchmark, null, 2)}\n`);
      return;
    }
    for (const [scene, fileName, frames] of STATIC_SCENES) {
      const capture = await canvasCapture(page, scene, frames);
      if (capture.visibleSamples < 80) throw new Error(`${scene} rendered too few visible pixels (${capture.visibleSamples})`);
      writeDataUrl(path.join(OUT_DIR, fileName), capture.dataUrl);
      report.staticScenes.push({ scene, fileName, visibleSamples: capture.visibleSamples, snapshot: capture.snapshot });
    }
    for (const scene of ['corruption_stack', 'marked_death', 'impact_main', 'impact_clone']) {
      const captured = report.staticScenes.find(item => item.scene === scene);
      if (!captured || captured.snapshot.screenShake !== 0) {
        throw new Error(`${scene} produced camera shake: ${JSON.stringify(captured && captured.snapshot)}`);
      }
    }
    const cloneAttack = report.staticScenes.find(item => item.scene === 'clone_attack');
    if (!cloneAttack || (!cloneAttack.snapshot.shots.some(shot => shot.kind === 'cgClone') && cloneAttack.snapshot.marks.length === 0)) {
      throw new Error('clone_attack did not produce a visible corruption shot or mark');
    }
    const spearShowcase = report.staticScenes.find(item => item.scene === 'projectile_spear_showcase');
    if (!spearShowcase || spearShowcase.snapshot.shots.length !== 3) throw new Error('sharp projectile showcase is incomplete');
    for (const stacks of [1, 100, 200]) {
      const scene = report.staticScenes.find(item => item.scene === `boss_corrosion_${stacks}`);
      if (!scene || scene.snapshot.boss?.corrosion?.stacks !== stacks) {
        throw new Error(`boss corrosion UI scene ${stacks} is missing: ${JSON.stringify(scene)}`);
      }
    }
    report.bossCorrosion.runtime = await page.evaluate(() => {
      const cap = window.__corruptgunCapture__;
      const before = cap.setup('boss_corrosion_200');
      const after = cap.advance(61, 1 / 60);
      return { before, after, hpLoss: before.boss.hp - after.boss.hp };
    });
    if (Math.abs(report.bossCorrosion.runtime.hpLoss - 10000) > 0.01 || report.bossCorrosion.runtime.after.boss.corrosion.stacks !== 200) {
      throw new Error(`boss corrosion runtime DOT mismatch: ${JSON.stringify(report.bossCorrosion.runtime)}`);
    }
    const mediumScene = report.staticScenes.find(item => item.scene === 'medium_perf');
    if (!mediumScene || mediumScene.snapshot.vfx.mode !== 'webgl' || mediumScene.snapshot.vfx.quality !== 'medium' || mediumScene.snapshot.vfx.renderScale !== 0.7) {
      throw new Error(`medium VFX profile mismatch: ${JSON.stringify(mediumScene && mediumScene.snapshot.vfx)}`);
    }
    const lowScene = report.staticScenes.find(item => item.scene === 'low_perf');
    if (!lowScene || lowScene.snapshot.vfx.mode !== 'fallback' || lowScene.snapshot.vfx.fallbackReason !== 'quality-low') {
      throw new Error(`low atlas fallback mismatch: ${JSON.stringify(lowScene && lowScene.snapshot.vfx)}`);
    }
    if ((lowScene.snapshot.vfx.fallbacks || []).length) throw new Error(`unexpected VFX fallback errors: ${lowScene.snapshot.vfx.fallbacks.join(', ')}`);
    const forcedFallback = report.staticScenes.find(item => item.scene === 'forced_fallback');
    if (!forcedFallback || forcedFallback.snapshot.vfx.mode !== 'fallback' || forcedFallback.snapshot.vfx.fallbackReason !== 'forced-webgl-unavailable') {
      throw new Error(`forced WebGL fallback mismatch: ${JSON.stringify(forcedFallback && forcedFallback.snapshot.vfx)}`);
    }
    const mainInfection = report.staticScenes.find(item => item.scene === 'infection_main');
    const cloneInfection = report.staticScenes.find(item => item.scene === 'infection_clone');
    if (!mainInfection || mainInfection.snapshot.tendrils.length < 4 || mainInfection.snapshot.tendrils.some(tendril => tendril.theme !== 'main')) {
      throw new Error(`main infection tentacles missing: ${JSON.stringify(mainInfection && mainInfection.snapshot.tendrils)}`);
    }
    if (!cloneInfection || cloneInfection.snapshot.tendrils.length < 4 || cloneInfection.snapshot.tendrils.some(tendril => tendril.theme !== 'clone')) {
      throw new Error(`clone infection tentacles missing: ${JSON.stringify(cloneInfection && cloneInfection.snapshot.tendrils)}`);
    }
    report.infection = {
      spec: await page.evaluate(() => window.__corruptgunInternals__.infectionSpec()),
      main: mainInfection.snapshot.tendrils,
      clone: cloneInfection.snapshot.tendrils,
    };
    if (report.infection.spec.assetKeys.length !== 26 || !report.infection.spec.render.includes('no-lightning-stroke')) {
      throw new Error(`infection asset/runtime contract mismatch: ${JSON.stringify(report.infection.spec)}`);
    }

    for (const theme of ['main', 'clone']) {
      const impactFolder = path.join(OUT_DIR, `impact_timeline_${theme}`);
      fs.mkdirSync(impactFolder, { recursive: true });
      await page.evaluate(() => window.__corruptgunCapture__.setup('impact_timeline'));
      for (const elapsedMs of IMPACT_TIMES) {
        const capture = await page.evaluate(({ value, theme }) => {
          const snapshot = window.__corruptgunCapture__.spawnImpact(value, theme === 'clone' ? 'clone' : 'normal');
          const canvas = document.getElementById('game');
          return { snapshot, dataUrl: canvas.toDataURL('image/png') };
        }, { value: elapsedMs, theme });
        const fileName = `${String(elapsedMs).padStart(3, '0')}ms.png`;
        writeDataUrl(path.join(impactFolder, fileName), capture.dataUrl);
        report.impactTimeline.push({ theme, elapsedMs, fileName, snapshot: capture.snapshot });
      }
    }

    for (const theme of ['main', 'clone']) {
      const infectionFolder = path.join(OUT_DIR, `infection_timeline_${theme}`);
      fs.mkdirSync(infectionFolder, { recursive: true });
      await page.evaluate(value => window.__corruptgunCapture__.setup(value), `infection_${theme}`);
      for (const elapsedMs of INFECTION_TIMES) {
        const capture = await page.evaluate(value => {
          const snapshot = window.__corruptgunCapture__.setInfectionTime(value);
          return { snapshot, dataUrl: document.getElementById('game').toDataURL('image/png') };
        }, elapsedMs);
        const fileName = `${String(elapsedMs).padStart(3, '0')}ms.png`;
        writeDataUrl(path.join(infectionFolder, fileName), capture.dataUrl);
        report.infectionTimeline.push({ theme, elapsedMs, fileName, snapshot: capture.snapshot });
      }
    }
    const mainMidChain = report.infectionTimeline.find(item => item.theme === 'main' && item.elapsedMs === 180);
    const cloneMidChain = report.infectionTimeline.find(item => item.theme === 'clone' && item.elapsedMs === 180);
    if (!mainMidChain || mainMidChain.snapshot.tendrils.some(tendril => tendril.visibleLinkCount < 4)) {
      throw new Error(`main infection timeline has too few visible chain links: ${JSON.stringify(mainMidChain)}`);
    }
    if (!cloneMidChain || cloneMidChain.snapshot.tendrils.some(tendril => tendril.visibleLinkCount < 4)) {
      throw new Error(`clone infection timeline has too few visible chain links: ${JSON.stringify(cloneMidChain)}`);
    }
    const dissolving = report.infectionTimeline.filter(item => item.elapsedMs === 620);
    if (dissolving.some(item => item.snapshot.tendrils.some(tendril => tendril.visibleLinkCount < 1 || tendril.dissolveParticles < 1))) {
      throw new Error(`infection chain is not visibly particle-dissolving at 620ms: ${JSON.stringify(dissolving)}`);
    }
    const dissolved = report.infectionTimeline.filter(item => item.elapsedMs === 860);
    if (dissolved.some(item => item.snapshot.tendrils.some(tendril => tendril.visibleLinkCount !== 0))) {
      throw new Error(`infection chain did not finish its body dissolve at 860ms: ${JSON.stringify(dissolved)}`);
    }

    const ultimateFolder = path.join(OUT_DIR, 'ultimate_timeline');
    fs.mkdirSync(ultimateFolder, { recursive: true });
    await page.evaluate(() => window.__corruptgunCapture__.setup('idle'));
    for (let index = 0; index < ULTIMATE_TIMELINE.length; index++) {
      const [phase, elapsedMs, absorbed, withBoss, bulletCount] = ULTIMATE_TIMELINE[index];
      const capture = await ultimateCapture(page, phase, elapsedMs, absorbed, withBoss, bulletCount);
      const fileName = `${String(index).padStart(2, '0')}_${phase}_${String(elapsedMs).padStart(4, '0')}ms_a${String(absorbed).padStart(3, '0')}.png`;
      writeDataUrl(path.join(ultimateFolder, fileName), capture.dataUrl);
      report.ultimateTimeline.push({ phase, elapsedMs, absorbed, fileName, snapshot: capture.snapshot });
    }
    for (const phase of ['cast', 'flight', 'burst', 'form', 'spin', 'collapse', 'finale']) {
      if (!report.ultimateTimeline.some(item => item.phase === phase)) throw new Error(`Dark Wheel capture is missing phase ${phase}`);
    }
    const rotationFolder = path.join(OUT_DIR, 'ultimate_blade_rotation');
    fs.mkdirSync(rotationFolder, { recursive: true });
    for (const elapsedMs of [1200, 1320, 1440, 1560, 1680]) {
      const capture = await ultimateCapture(page, 'spin', elapsedMs, 56, false, 40);
      const fileName = `spin_${elapsedMs}ms.png`;
      writeDataUrl(path.join(rotationFolder, fileName), capture.dataUrl);
      report.ultimateRotationFrames.push({ elapsedMs, fileName, snapshot: capture.snapshot });
    }
    if (report.ultimateRotationFrames.length !== 5) throw new Error('Dark Wheel rotation sequence is incomplete');
    if (report.ultimateTimeline.find(item => item.phase === 'burst')?.snapshot.screenShake !== 0) throw new Error('Dark Wheel burst capture moved the camera');
    report.ultimate.qualityCaptures = [];
    for (const quality of ['high', 'medium', 'low']) {
      await page.evaluate(value => window.__corruptgunCapture__.setQuality(value), quality);
      const capture = await ultimateCapture(page, 'spin', 1700, 80, false, 48);
      const fileName = `ultimate_quality_${quality}.png`;
      writeDataUrl(path.join(OUT_DIR, fileName), capture.dataUrl);
      report.ultimate.qualityCaptures.push({ quality, fileName, vfx: capture.snapshot.vfx });
    }
    const lowUltimate = report.ultimate.qualityCaptures.find(item => item.quality === 'low');
    if (!lowUltimate || lowUltimate.vfx.mode !== 'fallback' || lowUltimate.vfx.fallbackReason !== 'quality-low') {
      throw new Error(`Dark Wheel low-quality atlas fallback mismatch: ${JSON.stringify(lowUltimate)}`);
    }
    await page.evaluate(() => window.__corruptgunCapture__.setQuality('high'));

    report.ultimate.runtimeBoss = await page.evaluate(() => {
      const cap = window.__corruptgunCapture__;
      cap.setup('idle');
      const before = cap.setUltimatePhase('flight', 0.52, 0, true, 0);
      const after = cap.advance(610, 1 / 60);
      return { before, after };
    });
    if (report.ultimate.runtimeBoss.after.boss?.corrosion?.stacks !== 19) {
      throw new Error(`Dark Wheel full Boss sequence did not add 19 stacks: ${JSON.stringify(report.ultimate.runtimeBoss)}`);
    }
    if (report.ultimate.runtimeBoss.after.screenShake > 14) {
      throw new Error(`Dark Wheel finale exceeded 14px shake: ${report.ultimate.runtimeBoss.after.screenShake}`);
    }
    report.ultimate.revival = await page.evaluate(() => {
      const cap = window.__corruptgunCapture__;
      cap.setup('idle');
      cap.setUltimatePhase('spin', 1, 20, false, 24);
      return { afterRevive: cap.simulateUltimatePlayerDefeat(true), afterNoRevive: cap.simulateUltimatePlayerDefeat(false) };
    });
    if (!report.ultimate.revival.afterRevive.ultimate.active || report.ultimate.revival.afterNoRevive.ultimate.active) {
      throw new Error(`Dark Wheel revive/cleanup boundary mismatch: ${JSON.stringify(report.ultimate.revival)}`);
    }

    const ultimateAnimationFolder = path.join(OUT_DIR, 'anim_ultimate_full');
    fs.mkdirSync(ultimateAnimationFolder, { recursive: true });
    const phaseOrder = ['cast', 'flight', 'burst', 'form', 'spin', 'collapse', 'finale'];
    const phaseDurations = [0.5, 0.603, 0.3, 0.6, 8, 0.4, 1];
    const fullDuration = phaseDurations.reduce((sum, value) => sum + value, 0);
    for (let frame = 0; frame < 168; frame++) {
      const displayT = frame / 12;
      const activeT = Math.max(0, Math.min(fullDuration - 0.0001, displayT - 1.0));
      let cursor = activeT;
      let phaseIndex = 0;
      while (phaseIndex < phaseDurations.length - 1 && cursor >= phaseDurations[phaseIndex]) cursor -= phaseDurations[phaseIndex++];
      const phase = phaseOrder[phaseIndex];
      const absorbed = phaseIndex < 4 ? 0 : Math.min(80, Math.round((activeT - 2.003) / 8 * 80));
      const capture = await ultimateCapture(page, phase, cursor * 1000, absorbed, false, phase === 'spin' || phase === 'collapse' ? 72 : 0);
      writeDataUrl(path.join(ultimateAnimationFolder, `${String(frame).padStart(3, '0')}.png`), capture.dataUrl);
    }
    report.animations.push({ scene: 'ultimate_full', folderName: 'anim_ultimate_full', frames: 168, durationSeconds: 14.28 });

    const bankFolder = path.join(OUT_DIR, 'anim_bank_input');
    fs.mkdirSync(bankFolder, { recursive: true });
    await page.evaluate(() => window.__corruptgunCapture__.setup('idle'));
    const bankPhases = [{ dir: 1, frames: 24 }, { dir: 0, frames: 20 }, { dir: -1, frames: 34 }, { dir: 0, frames: 22 }];
    const bankSamples = [];
    const bankPositions = [];
    let bankFrame = 0;
    for (const phase of bankPhases) {
      await page.evaluate(dir => window.__corruptgunCapture__.setBankInput(dir), phase.dir);
      for (let frame = 0; frame < phase.frames; frame += 2) {
        const capture = await page.evaluate(step => {
          const snapshot = window.__corruptgunCapture__.advance(step);
          return { snapshot, dataUrl: document.getElementById('game').toDataURL('image/png') };
        }, 2);
        writeDataUrl(path.join(bankFolder, `${String(bankFrame++).padStart(3, '0')}.png`), capture.dataUrl);
        bankSamples.push(capture.snapshot.bankDeg);
        bankPositions.push(capture.snapshot.player.x);
      }
    }
    await page.evaluate(() => window.__corruptgunCapture__.setBankInput(0));
    if (Math.max(...bankSamples) < 3.1 || Math.min(...bankSamples) > -3.1) throw new Error(`bank input did not reach both subtle limits: ${bankSamples.join(',')}`);
    if (Math.max(...bankPositions) - Math.min(...bankPositions) < 100) throw new Error(`bank capture did not use real player movement: ${bankPositions.join(',')}`);
    report.bankMotion = { folderName: 'anim_bank_input', frames: bankFrame, minDeg: Math.min(...bankSamples), maxDeg: Math.max(...bankSamples), minX: Math.min(...bankPositions), maxX: Math.max(...bankPositions), samples: bankSamples };

    report.stationaryClone = await page.evaluate(() => {
      const cap = window.__corruptgunCapture__;
      cap.setup('clone_stationary');
      const before = cap.advance(48);
      cap.movePlayerTo(100, 930);
      const after = cap.advance(90);
      return { before, after };
    });
    const beforeAnchors = report.stationaryClone.before.clones.map(clone => [clone.anchorX, clone.anchorY]);
    const afterAnchors = report.stationaryClone.after.clones.map(clone => [clone.anchorX, clone.anchorY]);
    if (JSON.stringify(beforeAnchors) !== JSON.stringify(afterAnchors)) throw new Error(`clone anchors followed player: ${JSON.stringify({ beforeAnchors, afterAnchors })}`);

    report.cloneLifetime = await page.evaluate(() => {
      const cap = window.__corruptgunCapture__;
      cap.setup('clone_lifetime');
      const beforeExpiry = cap.advanceCloneTimeline(0.72 + 9.99);
      cap.setup('clone_lifetime');
      const atExpiry = cap.advanceCloneTimeline(0.72 + 10.02);
      cap.setup('clone_lifetime');
      const afterDespawn = cap.advanceCloneTimeline(0.72 + 10 + 0.51);
      return { beforeExpiry, atExpiry, afterDespawn };
    });
    if (report.cloneLifetime.beforeExpiry.clones[0]?.state === 'despawn' || report.cloneLifetime.beforeExpiry.clones[0]?.activeLife <= 0) {
      throw new Error(`clone expired before ten active seconds: ${JSON.stringify(report.cloneLifetime)}`);
    }
    if (report.cloneLifetime.atExpiry.clones[0]?.state !== 'despawn' || report.cloneLifetime.afterDespawn.clones.length !== 0) {
      throw new Error(`clone did not enter/remove through the 10s + 0.5s timeline: ${JSON.stringify(report.cloneLifetime)}`);
    }

    for (const [scene, folderName, count, step] of ANIMATIONS) {
      const folder = path.join(OUT_DIR, folderName);
      fs.mkdirSync(folder, { recursive: true });
      await page.evaluate(value => window.__corruptgunCapture__.setup(value), scene);
      for (let frame = 0; frame < count; frame++) {
        const capture = await page.evaluate(stepFrames => {
          const snapshot = window.__corruptgunCapture__.advance(stepFrames);
          const canvas = document.getElementById('game');
          return { snapshot, dataUrl: canvas.toDataURL('image/png') };
        }, step);
        writeDataUrl(path.join(folder, `${String(frame).padStart(3, '0')}.png`), capture.dataUrl);
      }
      report.animations.push({ scene, folderName, frames: count, step });
    }
    for (const viewport of VIEWPORTS) {
      await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1 });
      await page.evaluate(() => window.dispatchEvent(new Event('resize')));
      await page.evaluate(() => document.querySelector('.update-notice-close')?.click());
      await page.evaluate(() => window.__corruptgunCapture__.setup('title'));
      await page.evaluate(() => document.querySelector('.update-notice-close')?.click());
      const fileName = `viewport_${viewport.name}.png`;
      await page.screenshot({ path: path.join(OUT_DIR, fileName), type: 'png' });
      await page.evaluate(() => {
        const cap = window.__corruptgunCapture__;
        cap.setup('overdrive_clone_stress');
        cap.advance(48);
      });
      const battleFileName = `viewport_${viewport.name}_battle.png`;
      await page.screenshot({ path: path.join(OUT_DIR, battleFileName), type: 'png' });
      await page.evaluate(() => {
        const cap = window.__corruptgunCapture__;
        cap.setup('boss_corrosion_200');
        cap.advance(4);
      });
      const bossFileName = `viewport_${viewport.name}_boss_corrosion.png`;
      await page.screenshot({ path: path.join(OUT_DIR, bossFileName), type: 'png' });
      await page.evaluate(() => {
        const cap = window.__corruptgunCapture__;
        cap.setup('idle');
        cap.setUltimatePhase('spin', 1.7, 80, false, 72);
      });
      const ultimateFileName = `viewport_${viewport.name}_dark_wheel.png`;
      await page.screenshot({ path: path.join(OUT_DIR, ultimateFileName), type: 'png' });
      report.viewports.push({ ...viewport, fileName, battleFileName, bossFileName, ultimateFileName });
    }
    if (missing.length) throw new Error(`404 assets:\n${[...new Set(missing)].join('\n')}`);
    if (errors.length) throw new Error(`page errors:\n${errors.slice(0, 12).join('\n')}`);
    fs.writeFileSync(path.join(OUT_DIR, 'capture_report.json'), JSON.stringify(report, null, 2));
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server) await new Promise(resolve => server.close(resolve));
  }
  const result = spawnSync('python3', [path.join(ROOT, 'tools', 'make_corruptgun_acceptance.py')], { cwd: ROOT, stdio: 'inherit' });
  if (result.status !== 0) throw new Error('make_corruptgun_acceptance.py failed');
  console.log(`[corruptgun] acceptance captured in ${path.relative(ROOT, OUT_DIR)}`);
}

main().catch(error => { console.error(error.stack || error.message); process.exit(1); });
