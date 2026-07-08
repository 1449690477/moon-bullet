#!/usr/bin/env node
/**
 * 无浏览器·龙息弹截图渲染器
 * ============================
 * 用 @napi-rs/canvas（Skia 预编译，无需系统库/浏览器）直接跑游戏自身的 draw() 代码，
 * 把 window.__dragonBreathCapture__ 的各验收场景渲染成真实像素 PNG。
 * 用途：在没有 Chrome/puppeteer 的环境里也能快速出龙息弹截图，反复微调视觉。
 *
 * 用法：
 *   npm i -D @napi-rs/canvas   # 首次
 *   node tools/headless_dragon_render.js [输出目录]
 * 输出：tools/dragon_breath_headless/04_deploy_charged.png 等
 *
 * 说明：@napi-rs/canvas 的 Image 用 `.src = buffer` 只解析尺寸、像素解码是异步的，
 * 必须用 loadImage() 并 await 后再绘制，否则 drawImage 画不出内容（本脚本已处理）。
 */
'use strict';
const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs');
const { join, resolve } = require('path');
const vm = require('vm');
let napi;
try { napi = require('@napi-rs/canvas'); }
catch (e) { console.error('缺少依赖 @napi-rs/canvas，请先运行:  npm i -D @napi-rs/canvas'); process.exit(1); }

const ROOT = resolve(__dirname, '..');
const OUT = process.argv[2] || join(__dirname, 'dragon_breath_headless');
mkdirSync(OUT, { recursive: true });

// —— 尽力注册一个 CJK 字体（缺失也不致命，只影响 HUD 文字，不影响特效）——
const FONT_CANDIDATES = [
  '/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc',
  '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
  '/System/Library/Fonts/PingFang.ttc',
  '/System/Library/Fonts/STHeiti Medium.ttc',
];
for (const fp of FONT_CANDIDATES) {
  if (existsSync(fp)) { for (const fam of ['PingFang SC', 'Microsoft YaHei', 'sans-serif']) { try { napi.GlobalFonts.registerFromPath(fp, fam); } catch (_) {} } break; }
}

// —— 让 drawImage/createPattern 接受“游戏侧带 __napi 的图片对象” ——
const CtxProto = Object.getPrototypeOf(napi.createCanvas(2, 2).getContext('2d'));
const unwrap = (im) => (im && im.__napi) ? im.__napi : im;
for (const m of ['drawImage', 'createPattern']) {
  const orig = CtxProto[m];
  if (typeof orig === 'function') CtxProto[m] = function (im, ...a) { return orig.call(this, unwrap(im), ...a); };
}
function wrapCanvas(cv) {
  const realGet = cv.getContext.bind(cv);
  cv.getContext = (type) => realGet(type === '2d' ? '2d' : type);
  cv.getBoundingClientRect = () => ({ left: 0, top: 0, width: cv.width, height: cv.height });
  cv.addEventListener = () => {}; cv.setPointerCapture = () => {}; cv.releasePointerCapture = () => {}; cv.style = {};
  return cv;
}

let loaded = 0, missing = 0; const pending = [];
class ImageStub {
  constructor() { this.__napi = null; this.ready = false; this.failed = false; this.onload = null; this.onerror = null; }
  set src(v) {
    if (typeof v !== 'string') return;
    let s = v.startsWith('./') ? v.slice(2) : v;
    const p = s.startsWith('/') ? s : join(ROOT, s);
    if (!existsSync(p)) { this.failed = true; missing++; if (this.onerror) this.onerror(new Error(v)); return; }
    pending.push(napi.loadImage(readFileSync(p)).then((img) => { this.__napi = img; this.ready = true; loaded++; if (this.onload) this.onload(); })
      .catch((e) => { this.failed = true; missing++; if (this.onerror) this.onerror(e); }));
  }
  get src() { return ''; }
  get width() { return (this.__napi && this.__napi.width) || 0; }
  get height() { return (this.__napi && this.__napi.height) || 0; }
  get naturalWidth() { return this.width; }
  get naturalHeight() { return this.height; }
}
class AudioStub { constructor() { this.paused = true; this.volume = 1; } play() { return Promise.resolve(); } pause() {} load() {} setAttribute() {} getAttribute() { return ''; } cloneNode() { return new AudioStub(); } addEventListener() {} }

const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const script = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
const gameCanvas = wrapCanvas(napi.createCanvas(720, 1280));
const documentStub = {
  getElementById(id) { if (id === 'game') return gameCanvas; if (id === 'bgm') return new AudioStub(); if (id === 'musicStatus') return { textContent: '' }; return null; },
  createElement(t) { if (t === 'canvas') return wrapCanvas(napi.createCanvas(1, 1)); return { style: {}, addEventListener() {}, appendChild() {}, setAttribute() {} }; },
  addEventListener() {}, removeEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; },
  body: { appendChild() {}, style: {}, classList: { add() {}, remove() {}, toggle() {} } },
  documentElement: { style: { setProperty() {} }, classList: { add() {}, remove() {}, toggle() {} } },
};
const G = {
  console, document: documentStub, Image: ImageStub, Audio: AudioStub,
  navigator: { hardwareConcurrency: 8, deviceMemory: 8, userAgent: 'node-headless', platform: 'MacIntel', maxTouchPoints: 0 },
  performance: { now: () => Date.now() }, requestAnimationFrame() { return 0; }, cancelAnimationFrame() {},
  addEventListener() {}, removeEventListener() {}, setTimeout() { return 0; }, clearTimeout() {}, setInterval() { return 0; }, clearInterval() {},
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  devicePixelRatio: 1, Math, Promise, Date, JSON, Object, Array, createImageBitmap: (x) => Promise.resolve(x),
};
G.window = G; G.globalThis = G; G.location = { href: 'http://localhost/', protocol: 'http:', search: '', hash: '', reload() {} };
vm.createContext(G);
vm.runInContext(script, G, { filename: 'index.html', timeout: 30000 });

const cap = G.window.__dragonBreathCapture__;
if (!cap) { console.error('未找到 window.__dragonBreathCapture__'); process.exit(1); }

const SCENES = [
  ['deploy', 38, '04_deploy_charged.png'],
  ['volley', 62, '05_projectile_angle.png'],
  ['boss_hit', 66, '06_boss_impact.png'],
];
async function drainLoads() { for (let i = 0; i < 14 && pending.length; i++) { await Promise.allSettled(pending.splice(0)); } }
(async () => {
  for (const [scene, frames, name] of SCENES) {
    try {
      cap.setup(scene);
      await drainLoads();          // 关键：等真实像素解码完成再绘制
      cap.advance(frames);         // advance() 末尾会调用 draw()
      writeFileSync(join(OUT, name), gameCanvas.toBuffer('image/png'));
      console.log(`  [✓] ${name}  (scene=${scene}, frames=${frames})`);
    } catch (e) { console.error(`  [x] ${scene} 渲染失败:`, e && e.message ? e.message : e); }
  }
  console.log(`资源 loaded=${loaded} missing=${missing}  ->  ${OUT}`);
})();
