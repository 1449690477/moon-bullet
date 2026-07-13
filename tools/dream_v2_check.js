// 梦境模式 V2 无头验收：出战编队选择 / 精英平滑移动(抽搐修复) / 弹幕扩展与性能预算。
// 用法：node tools/dream_v2_check.js   （复用 _simcheck.js 的 DOM/Canvas/Audio 桩环境）
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
const blocks = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
let code = blocks.reduce((a, b) => (b.length > a.length ? b : a), '');
// 注入测试钩子（与 _simcheck.js 同法）：读取 IIFE 内部的敌人/敌弹状态
code = code.replace(/\}\)\(\);\s*$/,
  "\nglobalThis.__DREAM_TEST__ = {\n" +
  "  enemyPositions: () => enemies.filter(e => e && e.dream).map(e => ({ x: e.x, y: e.y })),\n" +
  "  bulletStyles: () => enemyBullets.filter(b => b && b.dream).map(b => b.dreamStyle),\n" +
  "  bulletDetails: () => enemyBullets.filter(b => b && b.dream).map(b => ({ style: b.dreamStyle, shape: b.dreamShape, skin: b.dreamSkin, assetKey: b.dreamAssetKey, emitter: b.dreamEmitter, motion: b.dreamMotion, fallback: b.dreamFallback })),\n" +
  "};\n})();");

const failures = [];
const notes = [];
function assert(cond, label) {
  if (cond) { notes.push(`ok  ${label}`); return true; }
  failures.push(`FAIL ${label}`);
  return false;
}

process.on('uncaughtException', e => failures.push('UNCAUGHT: ' + (e && e.stack || e)));
process.on('unhandledRejection', e => notes.push('rejection(ignored): ' + (e && e.message || e)));

// ---- 桩环境（与 _simcheck.js 同源） ----
const noop = () => {};
const gradientStub = { addColorStop: noop };
const measureStub = { width: 10 };
function makeCtx() {
  const cache = Object.create(null);
  return new Proxy({}, {
    get(t, p) {
      if (p === 'canvas') return { width: 720, height: 1280 };
      if (p === 'measureText') return cache[p] || (cache[p] = () => measureStub);
      if (p === 'createLinearGradient' || p === 'createRadialGradient') return cache[p] || (cache[p] = () => gradientStub);
      if (p === 'getImageData') return cache[p] || (cache[p] = () => ({ data: [] }));
      if (typeof p === 'string') return cache[p] || (cache[p] = noop);
      return undefined;
    },
    set() { return true; },
  });
}
const canvasStub = {
  width: 720, height: 1280,
  getContext: () => makeCtx(),
  addEventListener: noop, removeEventListener: noop,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 720, height: 1280 }),
  setPointerCapture: noop,
  style: {},
};
function elStub() {
  return {
    width: 720, height: 1280, style: {},
    addEventListener: noop, removeEventListener: noop,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 720, height: 1280 }),
    setPointerCapture: noop,
    getContext: () => makeCtx(),
    getAttribute: () => null, setAttribute: noop,
    play: () => Promise.resolve(), pause: noop, load: noop,
    cloneNode() { return elStub(); },
    textContent: '', innerHTML: '',
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    appendChild: noop, removeChild: noop, focus: noop, blur: noop, remove: noop,
    querySelector: () => null, querySelectorAll: () => [],
    dataset: {}, value: '',
  };
}
const documentStub = {
  getElementById: (id) => (id === 'game' ? canvasStub : elStub()),
  createElement: () => elStub(),
  addEventListener: noop, removeEventListener: noop,
  body: elStub(),
  hidden: false,
};
function ImageStub() {
  this.onload = null; this.onerror = null;
  this.width = this.naturalWidth = 96;
  this.height = this.naturalHeight = 96;
  Object.defineProperty(this, 'src', {
    set(value) { this._src = value; if (typeof this.onload === 'function') this.onload(); },
    get() { return this._src || ''; },
  });
}
function AudioContextStub() {
  const gain = { gain: { value: 0, setValueAtTime: noop, exponentialRampToValueAtTime: noop }, connect: noop };
  return {
    currentTime: 0, sampleRate: 44100, destination: {}, state: 'running',
    createGain: () => gain,
    createOscillator: () => ({ type: '', frequency: { setValueAtTime: noop }, connect: noop, start: noop, stop: noop }),
    createBuffer: () => ({ getChannelData: () => new Float32Array(8) }),
    createBufferSource: () => ({ buffer: null, connect: noop, start: noop }),
    resume: noop,
  };
}
let rafCbs = [];
const storage = { _m: Object.create(null),
  getItem(k) { return Object.prototype.hasOwnProperty.call(this._m, k) ? this._m[k] : null; },
  setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } };
const sandbox = {
  console, performance: { now: () => Date.now() },
  requestAnimationFrame: (cb) => { rafCbs.push(cb); return rafCbs.length; },
  cancelAnimationFrame: noop,
  document: documentStub,
  window: null,
  Image: ImageStub,
  HTMLImageElement: ImageStub,
  Audio: elStub,
  AudioContext: AudioContextStub,
  webkitAudioContext: AudioContextStub,
  localStorage: storage,
  fetch: () => Promise.reject(new Error('offline-test')),
  navigator: { userAgent: 'HeadlessCheck', maxTouchPoints: 0 },
  Math, Date, JSON, Object, Array, parseInt, parseFloat, isNaN,
  setTimeout: (cb) => { return 0; }, clearTimeout: noop, setInterval: () => 0, clearInterval: noop,
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.addEventListener = noop;
sandbox.removeEventListener = noop;

vm.createContext(sandbox);
try {
  vm.runInContext(code, sandbox, { timeout: 20000 });
} catch (e) {
  failures.push('BOOT: ' + (e && e.stack || e));
}

// 稳定标题若干帧
let t = 0;
for (let i = 0; i < 20 && rafCbs.length; i++) {
  const cb = rafCbs.shift(); t += 16;
  try { cb(t); } catch (e) { failures.push('TITLE@' + i + ': ' + e.message); }
}

const cap = sandbox.window.__dreamModeCapture__;
const internals = sandbox.window.__dreamModeInternals__;
assert(!!cap && !!internals, '验收接口存在 (__dreamModeCapture__/__dreamModeInternals__)');

if (cap && internals) {
  const T0 = Date.now();
  // ── 1. 出战编队选择 ─────────────────────────────────────────
  const beforeLoadout = cap.campaignLoadout();
  let snap = cap.prepare('select');
  assert(snap.loadoutSelect === true && snap.lobby === true, '编队选择界面可打开并完成绘制');
  assert(typeof snap.pendChar === 'string' && typeof snap.pendWing === 'string', '默认预选战机/僚机存在');
  snap = cap.selectLoadout('anna', 'nightcoffin');
  assert(snap.pendChar === 'anna' && snap.pendWing === 'nightcoffin', '点选战机/僚机可切换');
  snap = cap.confirmLoadout();
  assert(snap.runMode === 'dream' && snap.state === 'mobs' && snap.loadoutSelect === false, '确认出击后进入梦境第一波');
  assert(snap.lockedCharacter === 'anna', '锁定战机 = 所选战机');
  assert(Array.isArray(snap.lockedWingLoadout) && snap.lockedWingLoadout.length === 1 && snap.lockedWingLoadout[0] === 'nightcoffin', '锁定僚机 = 恰好 1 个所选僚机');
  console.log('[t] confirm done', Date.now() - T0, 'ms');
  snap = cap.exitToTitle();
  console.log('[t] exitToTitle done', Date.now() - T0, 'ms');
  const afterLoadout = cap.campaignLoadout();
  assert(afterLoadout.character === beforeLoadout.character && JSON.stringify(afterLoadout.wings) === JSON.stringify(beforeLoadout.wings), '退出梦境后章节编队还原');

  const modeSpec = internals.modeSpec();
  assert(modeSpec.loadoutSelect && modeSpec.loadoutSelect.planes === 7 && modeSpec.loadoutSelect.wingmen === 6, 'modeSpec 标注 7 战机 / 6 僚机');

  // ── 2. 精英移动平滑（抽搐修复） ────────────────────────────
  const hooks = sandbox.window.__DREAM_TEST__;
  assert(!!hooks, '测试钩子注入成功');
  cap.prepare('mobs', { wave: 1, elapsed: 0.2 });
  let prev = null, prevDx = null, maxJump = 0, flapCount = 0, samples = 0;
  for (let f = 0; f < 620; f++) {
    cap.step(1);
    const positions = hooks.enemyPositions();
    // 只统计已就位精英：跳过第一编队入场(前150帧)与第二编队入场窗口(约336-500帧)
    const measuring = (f > 150 && f < 330) || f > 560;
    if (prev && prev.length === positions.length && measuring) {
      const dxs = [];
      for (let k = 0; k < positions.length; k++) {
        const dx = positions[k].x - prev[k].x, dy = positions[k].y - prev[k].y;
        const d = Math.hypot(dx, dy);
        if (d > maxJump) maxJump = d;
        samples++;
        dxs.push(dx);
        if (prevDx && prevDx.length === positions.length && Math.sign(dx) !== 0 && Math.sign(prevDx[k]) !== 0 && Math.sign(dx) !== Math.sign(prevDx[k]) && Math.abs(dx) > 2.4 && Math.abs(prevDx[k]) > 2.4) flapCount++;
      }
      prevDx = dxs;
    } else prevDx = null;
    prev = positions;
  }
  assert(samples > 0 && maxJump < 10, `就位精英单帧位移平滑（最大 ${maxJump.toFixed(2)}px < 10px，无瞬移/抽搐）`);
  assert(flapCount / Math.max(1, samples) < 0.02, `无高频左右抖动（急翻率 ${(flapCount / Math.max(1, samples) * 100).toFixed(2)}% < 2%）`);

  // ── 3. 十波弹幕：预算 + 多样性 + 确定性 ────────────────────
  const budget = internals.patternBudgetSpec();
  assert(budget.logicalBulletCap === 96 && budget.enemyCap === 6, '性能预算保持：96 弹上限 / 6 敌上限');
  const skinSpec = typeof internals.bulletSkinSpec === 'function' ? internals.bulletSkinSpec() : [];
  const assetStatus = typeof internals.bulletAssetStatus === 'function' ? internals.bulletAssetStatus() : null;
  const diversitySpec = typeof internals.patternDiversitySpec === 'function' ? internals.patternDiversitySpec() : null;
  assert(skinSpec.length >= 12 && new Set(skinSpec.map(s => s.assetKey)).size >= 12, `真实敌弹素材 ≥ 12（${skinSpec.length} 皮肤 / ${new Set(skinSpec.map(s => s.assetKey)).size} 素材）`);
  assert(assetStatus && Array.isArray(assetStatus.missing) && assetStatus.missing.length === 0, '敌弹素材路径对账无缺失');
  assert(diversitySpec && diversitySpec.motionFamilies.length >= 10, `运动族 ≥ 10（${diversitySpec?.motionFamilies?.length || 0}）`);
  assert(diversitySpec && diversitySpec.emitterKeys.length >= 28, `发射器 ≥ 28（${diversitySpec?.emitterKeys?.length || 0}）`);
  assert(diversitySpec && diversitySpec.runtimeFallbackReporting === true, '运行时 fallback 会真实上报');
  const waveStyleSets = [];
  const allAssets = new Set(), allMotions = new Set(), allEmitters = new Set();
  let everBullets = 0;
  for (let wave = 1; wave <= 10; wave++) {
    cap.prepare('mobs', { wave, elapsed: 0.1 });
    let maxBullets = 0, maxWarnings = 0, maxLasers = 0, maxEnemies = 0;
    const styles = new Set();
    const assets = new Set(), motions = new Set(), emitters = new Set(), fallbacks = new Set();
    for (let chunk = 0; chunk < 90; chunk++) {   // 90 × 6帧 = 9 秒实战推进
      const s = cap.step(6);
      maxBullets = Math.max(maxBullets, s.logicalBulletCount);
      maxWarnings = Math.max(maxWarnings, s.warningCount);
      maxLasers = Math.max(maxLasers, s.laserCount);
      maxEnemies = Math.max(maxEnemies, s.enemyCount);
      if (chunk % 5 === 0) {
        hooks.bulletStyles().forEach(x => styles.add(x));
        hooks.bulletDetails().forEach((bullet) => {
          if (bullet.assetKey) { assets.add(bullet.assetKey); allAssets.add(bullet.assetKey); }
          if (bullet.motion) { motions.add(bullet.motion); allMotions.add(bullet.motion); }
          if (bullet.emitter) { emitters.add(bullet.emitter); allEmitters.add(bullet.emitter); }
          if (bullet.fallback) fallbacks.add(bullet.skin || bullet.assetKey || 'unknown');
        });
      }
    }
    everBullets = Math.max(everBullets, maxBullets);
    console.log(`  wave${wave}: 峰值弹量 ${maxBullets}, styles=[${[...styles].sort().join('+')}]`);
    waveStyleSets.push([...styles].sort().join(','));
    assert(maxBullets <= 96, `第${wave}波 弹量峰值 ${maxBullets} ≤ 96`);
    assert(maxWarnings <= 4 && maxLasers <= 4, `第${wave}波 预警/激光 ≤ 4 (${maxWarnings}/${maxLasers})`);
    assert(maxEnemies <= 6, `第${wave}波 敌数 ${maxEnemies} ≤ 6`);
    assert(maxBullets >= 18, `第${wave}波 有足量弹幕输出（峰值 ${maxBullets} ≥ 18）`);
    assert(assets.size >= 4, `第${wave}波 真实贴图 ≥ 4（${assets.size}）`);
    assert(motions.size >= 3, `第${wave}波 运动族 ≥ 3（${motions.size}）`);
    assert(emitters.size >= 4, `第${wave}波 实测发射器 ≥ 4（${emitters.size}）`);
    assert(fallbacks.size === 0, `第${wave}波 无静默敌弹 fallback`);
  }
  const uniqueCombos = new Set(waveStyleSets).size;
  assert(uniqueCombos >= 3, `十波威胁色组合有区分（${uniqueCombos} 种不同 style 组合 ≥ 3）`);
  assert(allAssets.size >= 12, `十波实测真实贴图 ≥ 12（${allAssets.size}）`);
  assert(allMotions.size >= 10, `十波实测运动族 ≥ 10（${allMotions.size}）`);
  assert(allEmitters.size >= 24, `十波实测发射器 ≥ 24（${allEmitters.size}）`);
  notes.push('全程弹量峰值: ' + everBullets + ' / 96');

  // 确定性：同一波同种子两次快照 hash 一致
  const h1 = cap.prepare('mobs', { wave: 5, elapsed: 2.4 }).logicHash;
  const h2 = cap.prepare('mobs', { wave: 5, elapsed: 2.4 }).logicHash;
  assert(h1 === h2, `固定种子确定性（wave5 hash ${h1} 复现）`);

  // 性能场景：填满后不越界
  const perfSnap = cap.prepare('performance', { wave: 9, bullets: 96, warnings: 4 });
  assert(perfSnap.logicalBulletCount <= 96, `performance 场景填充后 ${perfSnap.logicalBulletCount} ≤ 96`);
  const pool = internals.poolReuseForTest();
  assert(pool.capacity === 128 && pool.overflowed === false, '对象池容量 128 · 无溢出');

  // Boss 五阶段仍可运行
  for (let phase = 0; phase <= 4; phase++) {
    const bs = cap.prepare('boss', { phase, elapsed: 3 });
    assert(bs.state === 'boss' && bs.bossPhase === phase, `Boss 阶段 ${phase + 1}/5 可运行`);
  }
}

console.log('──────────────────────────────');
notes.forEach(n => console.log(n));
console.log('──────────────────────────────');
if (failures.length) {
  failures.forEach(f => console.error(f));
  console.error(`\n梦境 V2 验收失败：${failures.length} 项`);
  process.exit(1);
}
console.log(`\n梦境 V2 验收通过（${notes.length} 项检查）`);
