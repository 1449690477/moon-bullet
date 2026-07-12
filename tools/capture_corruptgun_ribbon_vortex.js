#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawnSync } = require('child_process');
const puppeteer = require('puppeteer-core');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.resolve(process.env.CORRUPTGUN_RIBBON_CAPTURE_OUT || path.join(ROOT, 'tools', 'corruptgun_ribbon_vortex_acceptance'));
const VIDEO = path.resolve(process.env.CORRUPTGUN_RIBBON_REFERENCE || '/Users/wanghan/Downloads/28220131220-1-192.mp4');
const PORT = Number(process.env.CORRUPTGUN_RIBBON_CAPTURE_PORT || 18839);
const REFERENCE_TIMES = [26.5, 57.8, 60.5, 28.3, 65.3];

function chromePath() {
  return [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].filter(Boolean).find(candidate => fs.existsSync(candidate));
}

function mimeFor(file) {
  return {
    '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp',
    '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.woff2': 'font/woff2',
  }[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      const pathname = decodeURIComponent((request.url || '/').split('?')[0]);
      const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
      if (rel === 'asset-mobile-manifest.js') {
        response.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
        response.end('window.__PAGE_BUILD_VERSION__="";window.__AVAILABLE_ASSETS__=null;window.__MOBILE_ASSET_PATHS__={};');
        return;
      }
      const file = path.resolve(ROOT, rel);
      if ((!file.startsWith(`${ROOT}${path.sep}`) && file !== ROOT)) { response.writeHead(403); response.end(); return; }
      fs.stat(file, (error, stat) => {
        if (error || !stat.isFile()) { response.writeHead(404); response.end('Not Found'); return; }
        response.writeHead(200, { 'Content-Type': mimeFor(file), 'Cache-Control': 'no-store' });
        fs.createReadStream(file).pipe(response);
      });
    });
    server.once('error', reject);
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

function writeDataUrl(file, dataUrl) {
  fs.writeFileSync(file, Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `${command} failed`);
}

function buildGif(frameDir, output) {
  run('ffmpeg', ['-y', '-framerate', '15', '-i', path.join(frameDir, 'frame_%03d.png'),
    '-vf', 'split[s0][s1];[s0]palettegen=max_colors=192[p];[s1][p]paletteuse=dither=sierra2_4a', '-loop', '0', output]);
}

function extractReferenceFrames() {
  if (!fs.existsSync(VIDEO)) throw new Error(`reference video missing: ${VIDEO}`);
  return REFERENCE_TIMES.map((seconds, index) => {
    const file = path.join(OUT, `reference_${index}_${String(seconds).replace('.', '_')}s.png`);
    run('ffmpeg', ['-y', '-ss', String(seconds), '-i', VIDEO, '-frames:v', '1', '-vf', 'scale=640:-2:flags=lanczos', file]);
    return file;
  });
}

function buildComparison(referenceFiles, gameFiles) {
  const script = [
    'from PIL import Image, ImageDraw, ImageOps',
    'from pathlib import Path',
    'import json, sys',
    'refs=[Path(v) for v in json.loads(sys.argv[1])]',
    'games=[Path(v) for v in json.loads(sys.argv[2])]',
    'out=Path(sys.argv[3]); cw,ch=330,250; gap=14; cols=5',
    'board=Image.new("RGB",(gap+cols*(cw+gap),74+2*(ch+42)),(5,3,8)); d=ImageDraw.Draw(board)',
    'd.text((16,14),"REFERENCE VIDEO: DARK SATIN RIBBONS / ONE-SIDED HOT EDGES",fill=(255,164,115))',
    'd.text((16,40),"GAME: OPEN SPIRALS / TORN TIPS / TANGENTIAL WHIP STRANDS",fill=(255,72,116))',
    'for row,files in enumerate((refs,games)):',
    '  for col,file in enumerate(files[:cols]):',
    '    im=Image.open(file).convert("RGB"); im=ImageOps.fit(im,(cw,ch),method=Image.Resampling.LANCZOS)',
    '    x=gap+col*(cw+gap); y=74+row*(ch+42); board.paste(im,(x,y))',
    '    d.rectangle((x,y,x+cw-1,y+ch-1),outline=(116,22,48),width=2)',
    '    d.text((x+5,y+ch+8),file.stem,fill=(238,218,225))',
    'board.save(out,optimize=True)',
  ].join('\n');
  run('python3', ['-c', script, JSON.stringify(referenceFiles), JSON.stringify(gameFiles), path.join(OUT, 'reference_vs_game.png')]);
}

function syncAcceptance() {
  if (process.env.CORRUPTGUN_RIBBON_SYNC !== '1') return;
  const folders = [
    path.join(ROOT, '7号战机 开发文件夹_副本', '大招 炼狱影刃 开发文件夹', '验收截图'),
    path.join(ROOT, 'moon-bullet-main', '7号战机 开发文件夹', '大招 炼狱影刃 开发文件夹', '验收截图'),
  ];
  const files = [
    ['reference_vs_game.png', 'V3.34_熔流绸带涡_参考并排.png'],
    ['ribbon_vortex.gif', 'V3.34_熔流绸带涡_完整动效.gif'],
    ['game_flash_lightning.png', 'V3.34_熔流绸带涡_炽闪放电.png'],
    ['game_low_quality.png', 'V3.34_熔流绸带涡_低画质.png'],
    ['report.json', 'V3.34_熔流绸带涡_验收报告.json'],
  ];
  for (const folder of folders) {
    fs.mkdirSync(folder, { recursive: true });
    for (const [source, target] of files) fs.copyFileSync(path.join(OUT, source), path.join(folder, target));
  }
}

async function captureFrame(page) {
  return page.evaluate(() => {
    const cap = window.__corruptgunCapture__;
    const snapshot = cap.snapshot();
    const game = document.getElementById('game');
    const size = 680;
    const crop = document.createElement('canvas'); crop.width = size; crop.height = size;
    const context = crop.getContext('2d'); context.fillStyle = '#050308'; context.fillRect(0, 0, size, size);
    const x = Math.round(snapshot.ultimate.x - size / 2);
    const y = Math.round(snapshot.ultimate.y - size / 2);
    context.drawImage(game, x, y, size, size, 0, 0, size, size);
    const pixels = context.getImageData(0, 0, size, size).data;
    let sampled = 0, nearBlack = 0, hot = 0, whiteHot = 0;
    for (let py = 70; py < size - 70; py += 3) {
      for (let px = 70; px < size - 70; px += 3) {
        const offset = (py * size + px) * 4;
        const r = pixels[offset], g = pixels[offset + 1], b = pixels[offset + 2];
        sampled++;
        if (Math.max(r, g, b) < 58) nearBlack++;
        if (r > 118 && r > g * 1.42 && r > b * 1.15) hot++;
        if (r > 220 && g > 145 && b > 110) whiteHot++;
      }
    }
    return {
      dataUrl: crop.toDataURL('image/png'), snapshot,
      metrics: { nearBlack: nearBlack / sampled, hot: hot / sampled, whiteHot: whiteHot / sampled },
    };
  });
}

async function main() {
  fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
  const framesDir = path.join(OUT, 'frames'); fs.mkdirSync(framesDir, { recursive: true });
  const errors = [], missing = [];
  const server = await startServer();
  const browser = await puppeteer.launch({
    executablePath: chromePath(), headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=swiftshader'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', error => errors.push(String(error)));
    page.on('response', response => { if (response.status() === 404) missing.push(response.url()); });
    await page.evaluateOnNewDocument(() => localStorage.setItem('moonBulletUpdateNoticeSeen', '1'));
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => window.__corruptgunCapture__ && window.__corruptgunInternals__, { timeout: 120000 });
    await page.evaluate(() => window.__corruptgunCapture__.setup('idle'));
    await page.evaluate(() => window.__corruptgunCapture__.setUltimateRibbonMoment({ elapsedSeconds: 1.16, quality: 'high', targets: false }));

    const frames = [];
    for (let index = 0; index < 36; index++) {
      if (index) await page.evaluate(() => window.__corruptgunCapture__.advance(4, 1 / 60, false));
      const capture = await captureFrame(page);
      const file = path.join(framesDir, `frame_${String(index).padStart(3, '0')}.png`);
      writeDataUrl(file, capture.dataUrl);
      frames.push({ file, metrics: capture.metrics, snapshot: capture.snapshot });
    }

    await page.evaluate(() => window.__corruptgunCapture__.setUltimateRibbonMoment({ elapsedSeconds: 1.52, quality: 'high', flashTime: 0.09, lightning: true, targets: false }));
    const peak = await captureFrame(page); writeDataUrl(path.join(OUT, 'game_flash_lightning.png'), peak.dataUrl);
    await page.evaluate(() => window.__corruptgunCapture__.setUltimateRibbonMoment({ elapsedSeconds: 1.52, quality: 'low', flashTime: 0.13, lightning: true, targets: false }));
    const low = await captureFrame(page); writeDataUrl(path.join(OUT, 'game_low_quality.png'), low.dataUrl);
    const qualityRebuild = await page.evaluate(() => {
      const cap = window.__corruptgunCapture__;
      cap.setUltimateRibbonMoment({ elapsedSeconds: 1.24, quality: 'high', targets: false });
      const high = cap.snapshot().ultimate.ribbonAudit;
      cap.setQuality('low');
      const lowQuality = cap.snapshot().ultimate.ribbonAudit;
      cap.setQuality('high');
      const restored = cap.snapshot().ultimate.ribbonAudit;
      return { high, low: lowQuality, restored };
    });

    const uniqueFrames = new Set(frames.map(entry => sha256(entry.file))).size;
    const middle = frames[Math.floor(frames.length / 2)].metrics;
    const report = {
      source: sha256(path.join(ROOT, 'index.html')),
      referenceVideo: VIDEO,
      frames: frames.length,
      uniqueFrames,
      middleMetrics: middle,
      peakMetrics: peak.metrics,
      lowMetrics: low.metrics,
      qualityRebuild,
      snapshot: frames.at(-1).snapshot.ultimate.ribbonAudit,
      errors: [...new Set(errors)],
      missing: [...new Set(missing.filter(url => !url.endsWith('/favicon.ico')))],
    };
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
    buildGif(framesDir, path.join(OUT, 'ribbon_vortex.gif'));
    const referenceFiles = extractReferenceFrames();
    buildComparison(referenceFiles, [frames[2].file, frames[8].file, frames[14].file, frames[20].file, path.join(OUT, 'game_flash_lightning.png')]);
    syncAcceptance();

    if (uniqueFrames < 28) throw new Error(`ribbon motion is too static: ${uniqueFrames}/36 unique frames`);
    if (qualityRebuild.high.count !== 6 || qualityRebuild.low.count !== 4 || qualityRebuild.restored.count !== 6) {
      throw new Error(`adaptive ribbon rebuild failed: ${JSON.stringify(qualityRebuild)}`);
    }
    if (qualityRebuild.low.segments.some(value => value !== 14) || qualityRebuild.restored.segments.some(value => value !== 32)) {
      throw new Error(`adaptive ribbon segments failed: ${JSON.stringify(qualityRebuild)}`);
    }
    if (middle.nearBlack < 0.18 || middle.nearBlack > 0.90) throw new Error(`near-black coverage out of range: ${middle.nearBlack}`);
    if (middle.hot < 0.003 || middle.hot > 0.10) throw new Error(`hot-edge coverage out of range: ${middle.hot}`);
    if (peak.metrics.whiteHot < 0.0002 || peak.metrics.whiteHot > 0.035) throw new Error(`white-hot peak out of range: ${peak.metrics.whiteHot}`);
    if (report.errors.length || report.missing.length) throw new Error(`runtime errors=${report.errors.length}, 404=${report.missing.length}`);
    console.log(`[ribbon-vortex] ${uniqueFrames}/36 unique | black ${(middle.nearBlack * 100).toFixed(1)}% | hot ${(middle.hot * 100).toFixed(1)}% | white ${(peak.metrics.whiteHot * 100).toFixed(2)}%`);
    console.log(`[ribbon-vortex] ${path.relative(ROOT, OUT)}`);
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
