const { app, BrowserWindow, protocol } = require('electron');
const path = require('path');
const fs = require('fs');

const GAME_ROOT = path.join(__dirname, 'game');
const MIME = { '.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.ogg':'audio/ogg','.wav':'audio/wav' };

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, bypassCSP: true } },
]);

function resolveSafe(urlPath) {
  let p = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  if (!p || p === '/') p = '/index.html';
  const full = path.normalize(path.join(GAME_ROOT, p));
  if (!full.startsWith(GAME_ROOT)) return null;
  return full;
}

const failures = [];
app.whenReady().then(() => {
  protocol.handle('app', async (request) => {
    const url = new URL(request.url);
    const filePath = resolveSafe(url.pathname);
    try {
      const data = await fs.promises.readFile(filePath);
      const mime = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
      return new Response(data, { status: 200, headers: { 'Content-Type': mime } });
    } catch (e) {
      failures.push('404 ' + url.pathname);
      return new Response('Not Found', { status: 404 });
    }
  });

  const win = new BrowserWindow({ show: false, width: 1280, height: 800, webPreferences: { offscreen: true, contextIsolation: true } });
  win.webContents.on('console-message', (e, level, msg) => { if (level >= 2) failures.push('console: ' + msg); });
  win.webContents.on('did-fail-load', (e, code, desc, url) => failures.push('failload: ' + desc + ' ' + url));
  win.webContents.on('render-process-gone', (e, d) => failures.push('crash: ' + JSON.stringify(d)));

  win.loadURL('app://game/index.html');
  win.webContents.once('did-finish-load', () => {
    setTimeout(async () => {
      const r = await win.webContents.executeJavaScript(`(function(){
        const c = document.querySelector('canvas');
        const imgs = Array.from(document.images);
        return { hasCanvas: !!c, canvasW: c?c.width:0, canvasH: c?c.height:0, docTitle: document.title, scriptOk: (typeof window!=='undefined') };
      })()`).catch(e => ({ err: String(e) }));
      console.log('SMOKE_RESULT=' + JSON.stringify(r));
      console.log('FAILURES=' + JSON.stringify(failures.slice(0, 15)));
      console.log('FAIL_COUNT=' + failures.length);
      app.quit();
    }, 4000);
  });
});
