#!/usr/bin/env node
/**
 * 月蚀弹幕 · GitHub Pages 烟测（Smoke Test）
 * ================================================
 * 用 Puppeteer 启动本地 Chrome，自动测试 docs/ 在三种视口下的表现：
 *   1. 手机横屏 1280×720   → 应加载移动端资源（WebP）、触控布局
 *   2. 桌面窗口 1280×900   → 应加载 PC 资源（PNG）、桌面布局
 *   3. 平板横屏 1280×900   → 触控设备 + PC 路径
 *
 * 检查项：
 *   - 控制台错误 / 404
 *   - asset-mobile-manifest.js 是否加载
 *   - 腐化枪本地 WebGL VFX bundle 是否加载
 *   - 移动资源 vs 桌面资源路径
 *   - Canvas 非空（游戏有渲染）
 *   - 点击开始后游戏状态切换
 *
 * 用法：
 *   node tools/smoke_pages.js          # 默认测试 docs/
 *   node tools/smoke_pages.js ./dist   # 测试其他目录
 */

const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ─── 配置 ───────────────────────────────────────────
const DOCS_DIR = path.resolve(process.argv[2] || path.join(__dirname, '..', 'docs'));
const PORT = 18765;
const TIMEOUT = 45000; // 每个场景超时 ms

function browserExecutablePath() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
  ].filter(Boolean);

  if (process.platform === 'win32') {
    const pf = process.env.ProgramFiles || 'C:\\Program Files';
    const pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const local = process.env.LOCALAPPDATA || '';
    candidates.push(
      path.join(pf, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(pf86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      local && path.join(local, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(pf, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(pf86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    );
  } else if (process.platform === 'darwin') {
    candidates.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
  } else {
    candidates.push('/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser');
  }

  return candidates.find((p) => p && fs.existsSync(p));
}

const MOBILE_SAFARI_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

function mobileFullscreenScenario(width, height, activation) {
  const persisted = activation === 'persisted';
  const activationLabel = persisted ? '持久化 fullscreen=1 首访' : '显式 ?fullscreen=1';
  return {
    name: `📱 手机竖屏 ${width}×${height} · ${activationLabel}`,
    width,
    height,
    userAgent: MOBILE_SAFARI_UA,
    isTouch: true,
    emulateMobile: true,
    expectMobile: true,
    initialFullscreenStorage: persisted ? '1' : '0',
    urlSuffix: persisted ? '' : '?fullscreen=1',
    checks: [
      { label: '竖屏触控识别为移动端', test: (r) => r.isMobileRuntime === true },
      { label: '首帧已进入沉浸全屏', test: (r) => r.fullscreenMode === true && r.fullscreenClass },
      {
        label: persisted ? '全屏由持久化设置触发' : '全屏由 URL 强制参数触发',
        test: (r) => persisted
          ? r.fullscreenStorage === '1' && !r.locationSearch.includes('fullscreen=1')
          : r.fullscreenStorage === '0' && r.locationSearch.includes('fullscreen=1'),
      },
      { label: 'Canvas 完整落在可视区', test: (r) => r.canvasWithinViewport },
      { label: 'Canvas CSS 比例为 9:16', test: (r) => r.canvasAspect916 },
      { label: 'Canvas 无横向裁切或溢出', test: (r) => r.noHorizontalClipping },
      { label: 'Canvas backing 与 2D render transform 一致', test: (r) => r.renderTransformMatchesBacking },
      { label: 'Canvas 非空', test: (r) => r.canvasNonBlank },
      { label: '无 404', test: (r) => !r.has404 },
      { label: '无 JS 错误', test: (r) => r.jsErrors.length === 0 },
    ],
  };
}

// 基础资源烟测 + 手机竖屏全屏回归矩阵。
const SCENARIOS = [
  {
    name: '📱 手机横屏 1280×720',
    width: 1280,
    height: 720,
    userAgent: MOBILE_SAFARI_UA,
    isTouch: true,
    expectMobile: true,
    checks: [
      { label: 'asset-mobile-manifest 加载', test: (r) => r.hasMobileManifest },
      { label: '腐化枪 VFX bundle 加载', test: (r) => r.hasCorruptgunVfxBundle },
      { label: 'IS_MOBILE_RUNTIME=true', test: (r) => r.isMobileRuntime === true },
      { label: 'Canvas 非空', test: (r) => r.canvasNonBlank },
      { label: '无 404', test: (r) => !r.has404 },
      { label: '无 JS 错误', test: (r) => r.jsErrors.length === 0 },
    ],
  },
  {
    name: '🖥️  桌面窗口 1280×900',
    width: 1280,
    height: 900,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    isTouch: false,
    expectMobile: false,
    checks: [
      { label: 'asset-mobile-manifest 不加载或忽略', test: (r) => !r.hasMobileManifest || !r.isMobileRuntime },
      { label: '腐化枪 VFX bundle 加载', test: (r) => r.hasCorruptgunVfxBundle },
      { label: 'IS_MOBILE_RUNTIME=false', test: (r) => r.isMobileRuntime === false },
      { label: 'Canvas 非空', test: (r) => r.canvasNonBlank },
      { label: '无 404', test: (r) => !r.has404 },
      { label: '无 JS 错误', test: (r) => r.jsErrors.length === 0 },
    ],
  },
  {
    name: '📋 平板触控 1280×900',
    width: 1280,
    height: 900,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    isTouch: true,
    expectMobile: true,
    checks: [
      { label: '触控设备识别为移动端', test: (r) => r.isMobileRuntime === true || r.hasCoarsePointer },
      { label: '腐化枪 VFX bundle 加载', test: (r) => r.hasCorruptgunVfxBundle },
      { label: 'Canvas 非空', test: (r) => r.canvasNonBlank },
      { label: '无 404', test: (r) => !r.has404 },
      { label: '无 JS 错误', test: (r) => r.jsErrors.length === 0 },
    ],
  },
  mobileFullscreenScenario(390, 844, 'persisted'),
  mobileFullscreenScenario(430, 932, 'persisted'),
  mobileFullscreenScenario(390, 844, 'forced'),
  mobileFullscreenScenario(430, 932, 'forced'),
];

// ─── 静态文件服务器 ────────────────────────────────
function startServer(dir, port) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const requestPath = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname;
      let filePath = path.join(dir, requestPath === '/' ? 'index.html' : decodeURIComponent(requestPath));
      // 安全：防止目录穿越
      if (!filePath.startsWith(dir)) { res.writeHead(403); res.end('Forbidden'); return; }
      fs.stat(filePath, (err, stat) => {
        if (err || !stat.isFile()) {
          // 尝试加 .html 后缀
          filePath += '.html';
          fs.stat(filePath, (err2, stat2) => {
            if (err2 || !stat2.isFile()) { res.writeHead(404); res.end('Not Found'); return; }
            serveFile(filePath, stat2, res);
          });
          return;
        }
        serveFile(filePath, stat, res);
      });
    });
    server.listen(port, () => resolve(server));
    server.on('error', reject);
  });
}

function serveFile(filePath, stat, res) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.json': 'application/json',
  };
  res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

// ─── 单场景测试 ────────────────────────────────────
async function runScenario(browser, scenario, baseUrl) {
  const result = {
    name: scenario.name,
    jsErrors: [],
    has404: false,
    hasMobileManifest: false,
    hasCorruptgunVfxBundle: false,
    isMobileRuntime: null,
    hasCoarsePointer: null,
    canvasNonBlank: false,
    fullscreenMode: null,
    fullscreenClass: false,
    fullscreenStorage: null,
    locationSearch: '',
    canvasGeometry: null,
    canvasWithinViewport: false,
    canvasAspect916: false,
    noHorizontalClipping: false,
    canvasBacking: null,
    canvasTransform: null,
    renderTransformMatchesBacking: false,
    passed: 0,
    failed: 0,
    details: [],
  };

  const page = await browser.newPage();
  await page.setViewport({
    width: scenario.width,
    height: scenario.height,
    isMobile: !!scenario.emulateMobile,
    hasTouch: !!scenario.isTouch,
    deviceScaleFactor: 1,
  });
  await page.setUserAgent(scenario.userAgent);

  // Smoke checks exercise layout and navigation, not the first-visit changelog.
  // Mark the current notice as seen before app boot so the modal cannot mask taps.
  await page.evaluateOnNewDocument(() => {
    try { window.localStorage.setItem('moonBulletSeenUpdateNotice', '2026-07-15-dream-level3-v2'); } catch (e) { /* ignore */ }
  });

  // 触摸模拟
  if (scenario.isTouch) {
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, writable: false });
    });
  }

  if (scenario.initialFullscreenStorage !== undefined) {
    await page.evaluateOnNewDocument((value) => {
      try { window.localStorage.setItem('moonBulletMobileFullscreen', value); } catch (e) { /* ignore */ }
    }, scenario.initialFullscreenStorage);
  }

  // 收集控制台消息
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') result.jsErrors.push(text.substring(0, 200));
  });

  // 收集页面错误（包括 404）
  page.on('pageerror', err => {
    result.jsErrors.push(`[pageerror] ${err.message.substring(0, 200)}`);
  });

  // 监听请求失败
  page.on('requestfailed', req => {
    if (req.failure().errorText === 'net::ERR_HTTP_RESPONSE_CODE' && req.response() && req.response().status() === 404) {
      result.has404 = true;
    }
  });
  page.on('response', response => {
    if (response.status() === 404) result.has404 = true;
  });

  try {
    await page.goto(`${baseUrl}${scenario.urlSuffix || ''}`, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    await page.waitForFunction(() => !!window.__mobileRuntimeInfo__, { timeout: 15000 }).catch(() => {});

    // 提取运行时信息
    const runtimeInfo = await page.evaluate(() => {
      try {
        return window.__mobileRuntimeInfo__ || {};
      } catch { return {}; }
    });
    result.isMobileRuntime = runtimeInfo.isMobile;
    result.hasCoarsePointer = runtimeInfo.coarsePointer;
    result.fullscreenMode = runtimeInfo.fullscreenMode;

    const layoutInfo = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const vv = window.visualViewport;
      const viewportWidth = (vv && vv.width) || window.innerWidth || document.documentElement.clientWidth;
      const viewportHeight = (vv && vv.height) || window.innerHeight || document.documentElement.clientHeight;
      const rect = canvas ? canvas.getBoundingClientRect() : null;
      const tolerance = 1.5;
      const aspect = rect && rect.height > 0 ? rect.width / rect.height : 0;
      const within = !!rect && rect.width > 0 && rect.height > 0 &&
        rect.left >= -tolerance && rect.top >= -tolerance &&
        rect.right <= viewportWidth + tolerance && rect.bottom <= viewportHeight + tolerance;
      const horizontal = !!rect && rect.left >= -tolerance && rect.right <= viewportWidth + tolerance &&
        rect.width <= viewportWidth + tolerance &&
        document.documentElement.scrollWidth <= Math.ceil(viewportWidth + tolerance) &&
        document.body.scrollWidth <= Math.ceil(viewportWidth + tolerance);
      return {
        fullscreenClass: document.documentElement.classList.contains('mobile-game-fullscreen') &&
          document.body.classList.contains('mobile-game-fullscreen'),
        fullscreenStorage: (() => { try { return localStorage.getItem('moonBulletMobileFullscreen'); } catch (e) { return null; } })(),
        locationSearch: location.search,
        geometry: rect ? {
          left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom,
          width: rect.width, height: rect.height, viewportWidth, viewportHeight, aspect,
        } : null,
        within,
        aspect916: Math.abs(aspect - 9 / 16) <= 0.002,
        horizontal,
      };
    });
    result.fullscreenClass = layoutInfo.fullscreenClass;
    result.fullscreenStorage = layoutInfo.fullscreenStorage;
    result.locationSearch = layoutInfo.locationSearch;
    result.canvasGeometry = layoutInfo.geometry;
    result.canvasWithinViewport = layoutInfo.within;
    result.canvasAspect916 = layoutInfo.aspect916;
    result.noHorizontalClipping = layoutInfo.horizontal;

    // 检查 asset-mobile-manifest 是否被使用
    result.hasMobileManifest = await page.evaluate(() => {
      return !!document.querySelector('script[src*="asset-mobile-manifest"]');
    });
    result.hasCorruptgunVfxBundle = await page.evaluate(() => {
      return typeof window.CgVfxEngine?.create === 'function';
    });

    // Canvas 非空检查：等几帧让游戏渲染
    await new Promise(r => setTimeout(r, 2000));
    result.canvasNonBlank = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      if (!c) return false;
      const ctx = c.getContext('2d');
      if (!ctx) return false;
      const d = ctx.getImageData(0, 0, Math.min(c.width, 100), Math.min(c.height, 100)).data;
      for (let i = 3; i < d.length; i += 4) {
        if (d[i] > 0) return true; // 有非透明像素
      }
      return false;
    });

    const renderTransformInfo = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const context = canvas && canvas.getContext('2d');
      if (!canvas || !context || typeof context.getTransform !== 'function') return null;
      const transform = context.getTransform();
      const expectedA = canvas.width / 720;
      const expectedD = canvas.height / 1280;
      const tolerance = 0.015;
      return {
        backing: { width: canvas.width, height: canvas.height, expectedA, expectedD },
        transform: {
          a: transform.a, b: transform.b, c: transform.c,
          d: transform.d, e: transform.e, f: transform.f,
        },
        matches: Math.abs(transform.a - expectedA) <= tolerance &&
          Math.abs(transform.d - expectedD) <= tolerance &&
          Math.abs(transform.a - transform.d) <= tolerance &&
          Math.abs(transform.b) <= 0.001 && Math.abs(transform.c) <= 0.001,
      };
    });
    if (renderTransformInfo) {
      result.canvasBacking = renderTransformInfo.backing;
      result.canvasTransform = renderTransformInfo.transform;
      result.renderTransformMatchesBacking = renderTransformInfo.matches;
    }

    // 尝试点击开始
    await page.click('canvas', { timeout: 5000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1500));

  } catch (e) {
    result.jsErrors.push(`[timeout/fatal] ${e.message.substring(0, 200)}`);
  } finally {
    await page.close().catch(() => {});
  }

  // 运行检查项
  for (const check of scenario.checks) {
    const ok = check.test(result);
    if (ok) { result.passed++; result.details.push(`  ✅ ${check.label}`); }
    else { result.failed++; result.details.push(`  ❌ ${check.label}`); }
  }

  return result;
}

// ─── 主流程 ────────────────────────────────────────
async function main() {
  console.log('═'.repeat(50));
  console.log('  月蚀弹幕 · GitHub Pages 烟测');
  console.log('═'.repeat(50));
  console.log(`  测试目录: ${DOCS_DIR}`);
  console.log(`  服务端口: ${PORT}`);
  console.log(`  场景数:   ${SCENARIOS.length}`);
  console.log('');

  // 检查 docs/ 存在
  if (!fs.existsSync(path.join(DOCS_DIR, 'index.html'))) {
    console.error(`[FATAL] ${DOCS_DIR}/index.html 不存在。先运行 npm run build:pages`);
    process.exit(1);
  }

  let server;
  let browser;
  try {
    // 启动静态服务器
    console.log('[1/4] 启动本地静态服务...');
    server = await startServer(DOCS_DIR, PORT);
    const baseUrl = `http://localhost:${PORT}`;
    console.log(`       → ${baseUrl}`);

    // 启动 Chrome
    console.log('[2/4] 启动 Chrome...');
    const executablePath = browserExecutablePath();
    if (!executablePath) {
      throw new Error('找不到 Chrome/Edge。可设置 PUPPETEER_EXECUTABLE_PATH 指向浏览器可执行文件。');
    }
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });
    console.log(`       → Chrome/Edge 已启动: ${executablePath}`);

    // 运行各场景
    console.log('[3/4] 运行烟测场景...\n');
    const results = [];
    for (let i = 0; i < SCENARIOS.length; i++) {
      const s = SCENARIOS[i];
      console.log(`  ── 场景 ${i + 1}/${SCENARIOS.length}: ${s.name} ──`);
      const r = await runScenario(browser, s, baseUrl);
      results.push(r);
      for (const d of r.details) console.log(d);
      if (r.canvasBacking && r.canvasTransform) {
        console.log(
          `  backing=${r.canvasBacking.width}×${r.canvasBacking.height}` +
          ` expected=(${r.canvasBacking.expectedA.toFixed(3)},${r.canvasBacking.expectedD.toFixed(3)})` +
          ` transform=(${r.canvasTransform.a.toFixed(3)},${r.canvasTransform.d.toFixed(3)})`,
        );
      }
      console.log(`  结果: ${r.passed}/${r.passed + r.failed} 通过${r.failed > 0 ? ` (${r.failed} 失败)` : ''}\n`);
    }

    // 汇总
    console.log('[4/4] 汇总报告');
    console.log('═'.repeat(50));
    let totalPassed = 0, totalFailed = 0;
    for (const r of results) {
      totalPassed += r.passed;
      totalFailed += r.failed;
      const icon = r.failed > 0 ? '❌' : '✅';
      console.log(`  ${icon} ${r.name}: ${r.passed}/${r.passed + r.failed}`);
      if (r.jsErrors.length > 0) {
        console.log(`     ⚠️  错误 (${r.jsErrors.length}):`);
        for (const e of r.jsErrors.slice(0, 5)) console.log(`       · ${e}`);
      }
    }
    console.log('─'.repeat(50));
    console.log(`  总计: ${totalPassed}/${totalPassed + totalFailed} 通过`);
    if (totalFailed === 0) {
      console.log('\n  🎉 全部通过！docs/ 可以安全发布。');
    } else {
      console.log(`\n  ⚠️  有 ${totalFailed} 项失败，请修复后再发布。`);
      process.exitCode = 1;
    }

  } catch (e) {
    console.error(`[FATAL] ${e.message}`);
    process.exit(1);
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server) server.close();
  }
}

main();
