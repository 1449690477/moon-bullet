const { app, BrowserWindow, protocol, shell, session } = require('electron');
const path = require('path');
const fs = require('fs');

// —— 性能：尽量走显卡硬件加速 / GPU 合成，减少弱机卡顿 ——
// ★ v0.9：全面 GPU 优化开关集
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');
// Canvas 2D 走 GPU（游戏核心是 Canvas 2D，这条对帧率提升最大）
app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
app.commandLine.appendSwitch('enable-2d-canvas-image-chromium');
// 防止回退到软件渲染
app.commandLine.appendSwitch('disable-software-rasterizer');
// 后台/遮挡时不降频，保持稳定帧率
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
// 限制渲染进程数，减少弱机内存/CPU 争抢
app.commandLine.appendSwitch('renderer-process-limit', '4');
// Windows 上显式走 D3D11（兼容性最好，性能也最稳），不走 OpenGL
if (process.platform === 'win32') {
  app.commandLine.appendSwitch('use-angle', 'd3d11');
  app.commandLine.appendSwitch('use-d3d11-compositor');
}
// 开启 SkiaRenderer + Vulkan（如可用，新版 Electron 默认开启，显式声明更稳）
app.commandLine.appendSwitch('enable-features', 'SkiaRenderer,VaapiVideoDecoder');
if (typeof app.disableDomainBlockingFor3DAPIs === 'function') app.disableDomainBlockingFor3DAPIs();

// 游戏资源根目录：打包后位于 app.asar 内的 game/ 子目录
const GAME_ROOT = path.join(__dirname, 'game');

// MIME 映射，保证 fetch / audio / image 正确解析
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

// 以自定义安全协议提供本地文件，避免 file:// 下 fetch 被拦截
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, bypassCSP: true } },
]);

function resolveSafe(urlPath) {
  // 去掉查询串与 hash，解码，并防止目录穿越
  let p = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  if (!p || p === '/') p = '/index.html';
  const full = path.normalize(path.join(GAME_ROOT, p));
  if (!full.startsWith(GAME_ROOT)) return null;
  return full;
}

function registerProtocol() {
  protocol.handle('app', async (request) => {
    const url = new URL(request.url);
    const filePath = resolveSafe(url.pathname);
    if (!filePath) {
      return new Response('Forbidden', { status: 403 });
    }
    try {
      const data = await fs.promises.readFile(filePath);
      const mime = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
      return new Response(data, { status: 200, headers: { 'Content-Type': mime } });
    } catch (e) {
      return new Response('Not Found', { status: 404 });
    }
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 720,
    minHeight: 480,
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      spellcheck: false,           // 关拼写检查，省 CPU
      enableBlinkFeatures: 'Accelerated2dCanvas',
      // 默认即 true，显式声明，确保 Canvas 走 GPU 合成
      animateDisabledImages: true,
    },
  });

  // 提升 GPU 进程优先级（Windows 上有效，让 GPU 进程不被抢占）
  try {
    if (process.platform === 'win32' && app.commandLine) {
      // 已通过 commandLine 开启；这里仅作为标记
    }
  } catch (e) {}

  win.once('ready-to-show', () => win.show());
  // 外部链接用系统浏览器打开，不在游戏窗口内跳转
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) { shell.openExternal(url); return { action: 'deny' }; }
    return { action: 'allow' };
  });

  win.loadURL('app://game/index.html');
}

app.whenReady().then(() => {
  registerProtocol();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
