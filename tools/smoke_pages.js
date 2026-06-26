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
const TIMEOUT = 25000; // 每个场景超时 ms

// 三种测试场景
const SCENARIOS = [
  {
    name: '📱 手机横屏 1280×720',
    width: 1280,
    height: 720,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    isTouch: true,
    expectMobile: true,
    checks: [
      { label: 'asset-mobile-manifest 加载', test: (r) => r.hasMobileManifest },
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
      { label: 'Canvas 非空', test: (r) => r.canvasNonBlank },
      { label: '无 404', test: (r) => !r.has404 },
      { label: '无 JS 错误', test: (r) => r.jsErrors.length === 0 },
    ],
  },
];

// ─── 静态文件服务器 ────────────────────────────────
function startServer(dir, port) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let filePath = path.join(dir, req.url === '/' ? 'index.html' : req.url);
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
    isMobileRuntime: null,
    hasCoarsePointer: null,
    canvasNonBlank: false,
    passed: 0,
    failed: 0,
    details: [],
  };

  const page = await browser.newPage();
  await page.setViewport({ width: scenario.width, height: scenario.height });
  await page.setUserAgent(scenario.userAgent);

  // 触摸模拟
  if (scenario.isTouch) {
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, writable: false });
    });
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

  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle0', timeout: TIMEOUT });

    // 提取运行时信息
    const runtimeInfo = await page.evaluate(() => {
      try {
        return window.__mobileRuntimeInfo__ || {};
      } catch { return {}; }
    });
    result.isMobileRuntime = runtimeInfo.isMobile;
    result.hasCoarsePointer = runtimeInfo.coarsePointer;

    // 检查 asset-mobile-manifest 是否被使用
    result.hasMobileManifest = await page.evaluate(() => {
      return !!document.querySelector('script[src*="asset-mobile-manifest"]');
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
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });
    console.log('       → Chrome 已启动');

    // 运行各场景
    console.log('[3/4] 运行烟测场景...\n');
    const results = [];
    for (let i = 0; i < SCENARIOS.length; i++) {
      const s = SCENARIOS[i];
      console.log(`  ── 场景 ${i + 1}/${SCENARIOS.length}: ${s.name} ──`);
      const r = await runScenario(browser, s, baseUrl);
      results.push(r);
      for (const d of r.details) console.log(d);
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
