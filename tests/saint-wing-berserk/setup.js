import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const indexUrl = new URL('../../index.html', import.meta.url);
let cachedInternals = null;
let cachedMotherLifeInternals = null;
let cachedMotherHiveInternals = null;
let cachedSuiyiBossInternals = null;
let cachedSuiyiTechMobInternals = null;
let cachedRandomBalanceInternals = null;
let cachedLeaderboardInternals = null;

function makeGradient() {
  return { addColorStop() {} };
}

function makeCtx() {
  const state = Object.create(null);
  return new Proxy(state, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === 'createRadialGradient' || prop === 'createLinearGradient') return () => makeGradient();
      if (prop === 'measureText') return (text) => ({ width: String(text || '').length * 10 });
      if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      if (prop === 'save' || prop === 'restore' || prop === 'beginPath' || prop === 'closePath' ||
          prop === 'arc' || prop === 'ellipse' || prop === 'fill' || prop === 'stroke' ||
          prop === 'fillRect' || prop === 'clearRect' || prop === 'drawImage' || prop === 'translate' ||
          prop === 'rotate' || prop === 'scale' || prop === 'moveTo' || prop === 'lineTo' ||
          prop === 'quadraticCurveTo' || prop === 'bezierCurveTo' || prop === 'arcTo' ||
          prop === 'fillText' || prop === 'strokeText' || prop === 'setTransform') return () => {};
      return undefined;
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  });
}

class FakeImage {
  constructor() {
    this.width = 100;
    this.height = 100;
    this.ready = false;
    this.failed = false;
  }
  set src(value) {
    this._src = value;
    this.ready = true;
  }
  get src() {
    return this._src || '';
  }
}

class FakeAudio {
  constructor(src = '') {
    this.src = src;
    this.paused = true;
    this.volume = 1;
    this.currentTime = 0;
  }
  play() {
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
  load() {}
  setAttribute(key, value) {
    this[key] = value;
  }
  getAttribute(key) {
    return this[key] || '';
  }
  cloneNode() {
    return new FakeAudio(this.src);
  }
}

export function loadInternals() {
  if (cachedInternals) return cachedInternals;
  const html = readFileSync(indexUrl, 'utf8');
  const script = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
  const ctx = makeCtx();
  const canvas = {
    width: 720,
    height: 1280,
    getContext: () => ctx,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 720, height: 1280 }),
    addEventListener() {},
    setPointerCapture() {},
  };
  const bgm = new FakeAudio('assets/audio/bgm_stage_loop.ogg');
  const musicStatus = { textContent: '' };
  const document = {
    getElementById(id) {
      if (id === 'game') return canvas;
      if (id === 'bgm') return bgm;
      if (id === 'musicStatus') return musicStatus;
      return null;
    },
    createElement(tag) {
      if (tag === 'canvas') return { width: 0, height: 0, getContext: () => makeCtx() };
      return {};
    },
    addEventListener() {},
  };
  const context = {
    console,
    document,
    Image: FakeImage,
    Audio: FakeAudio,
    navigator: { hardwareConcurrency: 8, deviceMemory: 8, userAgent: 'vitest' },
    performance: { now: () => 0 },
    requestAnimationFrame() {},
    cancelAnimationFrame() {},
    addEventListener() {},
    removeEventListener() {},
    setTimeout() {},
    clearTimeout() {},
    Math,
    Promise,
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(script, context, { filename: 'index.html', timeout: 5000 });
  cachedInternals = context.window.__saintWingBerserkInternals__;
  cachedMotherLifeInternals = context.window.__motherLifeInternals__;
  cachedMotherHiveInternals = context.window.__motherHiveInternals__;
  cachedSuiyiBossInternals = context.window.__suiyiBossInternals__;
  cachedSuiyiTechMobInternals = context.window.__suiyiTechMobInternals__;
  cachedRandomBalanceInternals = context.window.__randomBalanceInternals__;
  cachedLeaderboardInternals = context.window.__leaderboardInternals__;
  if (!cachedInternals) throw new Error('window.__saintWingBerserkInternals__ was not exposed');
  return cachedInternals;
}

export function loadMotherLifeInternals() {
  if (cachedMotherLifeInternals) return cachedMotherLifeInternals;
  loadInternals();
  if (!cachedMotherLifeInternals) throw new Error('window.__motherLifeInternals__ was not exposed');
  return cachedMotherLifeInternals;
}

export function loadMotherHiveInternals() {
  if (cachedMotherHiveInternals) return cachedMotherHiveInternals;
  loadInternals();
  if (!cachedMotherHiveInternals) throw new Error('window.__motherHiveInternals__ was not exposed');
  return cachedMotherHiveInternals;
}

export function loadSuiyiBossInternals() {
  if (cachedSuiyiBossInternals) return cachedSuiyiBossInternals;
  loadInternals();
  if (!cachedSuiyiBossInternals) throw new Error('window.__suiyiBossInternals__ was not exposed');
  return cachedSuiyiBossInternals;
}

export function loadSuiyiTechMobInternals() {
  if (cachedSuiyiTechMobInternals) return cachedSuiyiTechMobInternals;
  loadInternals();
  if (!cachedSuiyiTechMobInternals) throw new Error('window.__suiyiTechMobInternals__ was not exposed');
  return cachedSuiyiTechMobInternals;
}

export function loadRandomBalanceInternals() {
  if (cachedRandomBalanceInternals) return cachedRandomBalanceInternals;
  loadInternals();
  if (!cachedRandomBalanceInternals) throw new Error('window.__randomBalanceInternals__ was not exposed');
  return cachedRandomBalanceInternals;
}

export function loadLeaderboardInternals() {
  if (cachedLeaderboardInternals) return cachedLeaderboardInternals;
  loadInternals();
  if (!cachedLeaderboardInternals) throw new Error('window.__leaderboardInternals__ was not exposed');
  return cachedLeaderboardInternals;
}

export function makeCtxIn(opts = {}) {
  const calls = { hitBoss: [], hitStop: [], particles: [] };
  const w = opts.w || { _beamBullet: [null, null] };
  return {
    emitWX: opts.emitWX ?? 360,
    emitWY: opts.emitWY ?? 900,
    enemies: opts.enemies ?? [{ x: 350, y: 500, r: 10 }],
    boss: opts.boss ?? null,
    state: opts.state ?? 'mobs',
    w,
    li: opts.li ?? 0,
    perfLevel: opts.perfLevel ?? 0,
    screenShakeRef: opts.screenShakeRef ?? { value: 0 },
    flashRef: opts.flashRef ?? { value: 0 },
    scFx: opts.scFx ?? [],
    scBaseDmg: opts.scBaseDmg ?? (() => 10),
    berserkDmg: opts.berserkDmg ?? (() => 2),
    TAU: Math.PI * 2,
    hitBoss: (...args) => calls.hitBoss.push(args),
    triggerHitStop: (...args) => calls.hitStop.push(args),
    addParticle: (...args) => calls.particles.push(args),
    calls,
  };
}

export function angleOf(vx, vy) {
  const a = Math.atan2(vy, vx);
  return a < 0 ? a + Math.PI * 2 : a;
}
