#!/usr/bin/env node
/**
 * 冰晶龙视觉迭代专用截图器（快速循环用）
 * ======================================
 * 与验收脚本不同：本脚本追求"快 + 近景"，每轮改动后几秒内出图。
 * - 固定 high 画质、desktop 视口、deviceScaleFactor=2（细节可辨）
 * - 每个场景截取以目标为中心的近景（~360px 见方），而非全屏
 * - 场景/帧号在 SCENARIOS 里配置，也可用命令行过滤: node ice_dragon_visual_iter.js projectile split
 *
 * 前置：本机 8765 端口静态服务（脚本自起自灭内部服务，不依赖外部）。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'ice_dragon_visual_iter');
const PORT = 18799;
const DBG = 9360 + Math.floor(Math.random() * 40);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json', '.css': 'text/css', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };

// [scene, stepsToRunAfterSetup, tag]；tag 用于文件名
const ALL_SCENARIOS = [
  ['charge', 4, 'charge_f04'], ['charge', 10, 'charge_f10'], ['charge', 18, 'charge_f18'],
  ['projectile', 0, 'proj_f00'], ['projectile', 6, 'proj_f06'], ['projectile', 14, 'proj_f14'], ['projectile', 26, 'proj_f26'],
  ['impact', 0, 'impact_f00'], ['impact', 6, 'impact_f06'], ['impact', 12, 'impact_f12'], ['impact', 20, 'impact_f20'],
  ['split', 0, 'split_f00'], ['split', 4, 'split_f04'], ['split', 10, 'split_f10'], ['split', 18, 'split_f18'],
  ['explosion', 0, 'expl_f00'], ['explosion', 1, 'expl_f01'], ['explosion', 5, 'expl_f05'], ['explosion', 13, 'expl_f13'], ['explosion', 26, 'expl_f26'],
  ['berserk', 1, 'ber_f01'], ['berserk', 6, 'ber_f06'], ['berserk', 11, 'ber_f11'], ['berserk', 18, 'ber_f18'], ['berserk', 34, 'ber_f34'],
  ['orbit', 30, 'orbit_f30'], ['orbit', 80, 'orbit_f80'],
  ['move', 40, 'move_f40'], ['move', 100, 'move_f100'],
  ['over-body', 30, 'overbody_f30'], ['over-body', 90, 'overbody_f90'],
];

function chromePath() {
  const c = [process.env.PUPPETEER_EXECUTABLE_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
  return c.find((p) => fs.existsSync(p));
}

function startServer() {
  return new Promise((resolveServer) => {
    const server = http.createServer((req, res) => {
      try {
        let p = decodeURIComponent(req.url.split('?')[0]);
        if (p === '/') p = '/index.html';
        const file = path.join(ROOT, p);
        if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        fs.createReadStream(file).pipe(res);
      } catch (e) { res.writeHead(500); res.end('err'); }
    });
    server.listen(PORT, '127.0.0.1', () => resolveServer(server));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const filter = process.argv.slice(2);
  const QUALITY = process.env.QUALITY || 'high';
  const scenarios = filter.length ? ALL_SCENARIOS.filter(([s]) => filter.includes(s)) : ALL_SCENARIOS;
  fs.mkdirSync(OUT, { recursive: true });
  const server = await startServer();
  const chrome = spawn(chromePath(), ['--headless', '--no-sandbox', '--disable-gpu', '--force-color-profile=srgb',
    '--mute-audio', `--remote-debugging-port=${DBG}`, `--user-data-dir=/tmp/icd_iter_${DBG}`, 'about:blank'], { stdio: 'ignore' });
  let browser = null;
  const results = [];
  try {
    let ws = '';
    for (let i = 0; i < 160 && !ws; i++) {
      await sleep(500);
      try { const j = await (await fetch(`http://127.0.0.1:${DBG}/json/version`)).json(); ws = j.webSocketDebuggerUrl; } catch {}
    }
    if (!ws) throw new Error('chrome devtools endpoint not ready');
    browser = await puppeteer.connect({ browserWSEndpoint: ws, defaultViewport: null });
    const page = await browser.newPage();
    await page.setViewport({ width: 780, height: 1040, deviceScaleFactor: 2 });
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
    const noticeVer = (html.match(/UPDATE_NOTICE_VERSION = '([^']+)'/) || [])[1] || '';
    await page.evaluateOnNewDocument((ver) => {
      try { localStorage.setItem('moonBulletSeenUpdateNotice', ver); } catch (e) {}
      window.requestAnimationFrame = () => 0; // 冻结 rAF 循环，全由 step() 驱动
      window.cancelAnimationFrame = () => {};
    }, noticeVer);
    page.on('pageerror', (e) => console.error('PAGEERROR:', e.message));
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForFunction(() => !!window.__iceDragonCapture__, { timeout: 30000 });
    // 等资产就绪（懒加载触发于 reset/equip）
    await page.evaluate(() => window.__iceDragonCapture__.setup('orbit', { quality: 'high' }));
    await page.waitForFunction(() => {
      const status = window.__iceDragonCapture__.assetStatus();
      return status.pending.length === 0 && status.ready.length >= 34;
    }, { timeout: 60000 });

    const canvas = await page.$('#game');
    const box = await canvas.boundingBox();
    // 画布逻辑尺寸（从快照坐标系推：W/H）
    const dims = await page.evaluate(() => ({ W: innerWidth, H: innerHeight, cw: document.getElementById('game').width, ch: document.getElementById('game').height }));
    const scale = box.width / dims.cw;

    let lastScene = null;
    for (const [scene, steps, tag] of scenarios) {
      if (scene !== lastScene) {
        await page.evaluate((s, q) => window.__iceDragonCapture__.setup(s, { quality: q }), scene, QUALITY);
        lastScene = scene;
      }
      const snap = await page.evaluate((n) => window.__iceDragonCapture__.step(n), steps);
      // 近景中心：优先主弹 → 分裂群心 → 特效点 → 龙头
      let cx = null, cy = null;
      const boom = (snap.effects || []).find((f) => f.type === 'explosion' || f.type === 'impact');
      if (snap.mainShots && snap.mainShots.length) { cx = snap.mainShots[0].x; cy = snap.mainShots[0].y; }
      else if (snap.splitShots && snap.splitShots.length) {
        cx = snap.splitShots.reduce((a, s) => a + s.x, 0) / snap.splitShots.length;
        cy = snap.splitShots.reduce((a, s) => a + s.y, 0) / snap.splitShots.length;
      } else if (boom) { cx = boom.x; cy = boom.y; }
      else if (snap.effects && snap.effects.length) { cx = snap.effects[0].x; cy = snap.effects[0].y; }
      else if (snap.head) { cx = snap.head.x; cy = snap.head.y; }
      const size = 380; // CSS px 近景边长
      let clip = { x: 0, y: 0, width: box.width, height: box.height };
      if (cx !== null) {
        const px = box.x + cx * scale, py = box.y + cy * scale;
        clip = {
          x: Math.max(0, Math.min(px - size / 2, box.x + box.width - size)),
          y: Math.max(0, Math.min(py - size / 2, box.y + box.height - size)),
          width: size, height: size,
        };
      }
      const file = path.join(OUT, `${tag}.png`);
      await page.screenshot({ path: file, clip });
      results.push({ tag, cx: cx && Math.round(cx), cy: cy && Math.round(cy), shots: snap.mainShots.length, splits: snap.splitShots.length, fx: snap.effects.length, particles: snap.particles });
      console.log(`✓ ${tag} center=(${results[results.length - 1].cx},${results[results.length - 1].cy}) shots=${snap.mainShots.length} splits=${snap.splitShots.length} fx=${snap.effects.length} particles=${snap.particles}`);
    }
  } finally {
    if (browser) await browser.disconnect().catch(() => {});
    chrome.kill();
    server.close();
    spawn('rm', ['-rf', `/tmp/icd_iter_${DBG}`]);
  }
  console.log('DONE', results.length, 'captures →', OUT);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
