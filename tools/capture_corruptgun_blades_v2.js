#!/usr/bin/env node

const fs = require('fs');
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const puppeteer = require('puppeteer-core');

const ROOT = path.resolve(__dirname, '..');
const SERVE_DIR = process.env.CORRUPTGUN_BLADE_CAPTURE_FROM_DOCS === '1' ? path.join(ROOT, 'docs') : ROOT;
const OUT = path.resolve(process.env.CORRUPTGUN_BLADE_CAPTURE_OUT || path.join(ROOT, 'tools', 'corruptgun_blades_v2_acceptance'));
const PORT = Number(process.env.CORRUPTGUN_BLADE_CAPTURE_PORT || 18829);

function chromePath() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].filter(Boolean);
  return candidates.find(candidate => fs.existsSync(candidate));
}

function mimeFor(file) {
  return {
    '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp',
  }[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const rel = req.url === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
      if (SERVE_DIR === ROOT && rel === 'asset-mobile-manifest.js') {
        const body = 'window.__PAGE_BUILD_VERSION__="";window.__AVAILABLE_ASSETS__=null;window.__MOBILE_ASSET_PATHS__={};';
        res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(body); return;
      }
      const file = path.resolve(SERVE_DIR, rel);
      if (!file.startsWith(`${SERVE_DIR}${path.sep}`) && file !== SERVE_DIR) { res.writeHead(403); res.end(); return; }
      fs.stat(file, (error, stat) => {
        if (error || !stat.isFile()) { res.writeHead(404); res.end(); return; }
        res.writeHead(200, { 'Content-Type': mimeFor(file), 'Cache-Control': 'no-store' });
        fs.createReadStream(file).pipe(res);
      });
    });
    server.once('error', reject);
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

function bufferFromDataUrl(dataUrl) {
  return Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
}

function writeDataUrl(file, dataUrl) {
  fs.writeFileSync(file, bufferFromDataUrl(dataUrl));
}

function hashDataUrl(dataUrl) {
  return crypto.createHash('sha256').update(bufferFromDataUrl(dataUrl)).digest('hex');
}

function makeGif(frameDir, output, duration = 70) {
  const script = [
    'from PIL import Image',
    'from pathlib import Path',
    'import sys',
    'files=sorted(Path(sys.argv[1]).glob("frame_*.png"))',
    'assert files',
    'frames=[Image.open(f).convert("RGB") for f in files]',
    'frames[0].save(sys.argv[2],save_all=True,append_images=frames[1:],duration=int(sys.argv[3]),loop=0,optimize=True)',
  ].join('\n');
  const result = spawnSync('python3', ['-c', script, frameDir, output, String(duration)], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
}

function makeContact(output, title, entries, columns = 4, cellWidth = 280, cellHeight = 410) {
  const script = [
    'from PIL import Image,ImageDraw,ImageOps',
    'from pathlib import Path',
    'import json,sys',
    'out=Path(sys.argv[1]); title=sys.argv[2]; entries=json.loads(sys.argv[3])',
    'cols=int(sys.argv[4]); cw=int(sys.argv[5]); ch=int(sys.argv[6]); rows=(len(entries)+cols-1)//cols',
    'board=Image.new("RGB",(cols*cw+32,rows*ch+62),(7,4,11)); d=ImageDraw.Draw(board)',
    'd.text((18,18),title,fill=(255,72,116))',
    'for i,item in enumerate(entries):',
    ' r,c=divmod(i,cols); x=16+c*cw; y=50+r*ch',
    ' im=Image.open(out/item["file"]).convert("RGB")',
    ' im=ImageOps.contain(im,(cw-18,ch-44),Image.Resampling.LANCZOS)',
    ' board.paste(im,(x+(cw-im.width)//2,y+24))',
    ' d.rectangle((x+5,y+20,x+cw-6,y+ch-7),outline=(122,13,50),width=2)',
    ' d.text((x+8,y+3),item["label"],fill=(245,222,230))',
    'board.save(sys.argv[7],optimize=True)',
  ].join('\n');
  const result = spawnSync('python3', [
    '-c', script, OUT, title, JSON.stringify(entries), String(columns), String(cellWidth), String(cellHeight), output,
  ], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
}

function syncAcceptance(files) {
  const folders = [
    path.join(ROOT, '7号战机 开发文件夹_副本', '大招 炼狱影刃 开发文件夹', '验收截图'),
    path.join(ROOT, 'moon-bullet-main', '7号战机 开发文件夹', '大招 炼狱影刃 开发文件夹', '验收截图'),
  ];
  for (const folder of folders) {
    fs.mkdirSync(folder, { recursive: true });
    for (const [source, target] of files) fs.copyFileSync(path.join(OUT, source), path.join(folder, target));
  }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const orbitDir = path.join(OUT, 'anim_blade_orbit');
  const materialDir = path.join(OUT, 'anim_blade_material');
  const cutDir = path.join(OUT, 'anim_space_cut');
  const hitDir = path.join(OUT, 'anim_blade_hit');
  fs.rmSync(orbitDir, { recursive: true, force: true });
  fs.rmSync(materialDir, { recursive: true, force: true });
  fs.rmSync(cutDir, { recursive: true, force: true });
  fs.rmSync(hitDir, { recursive: true, force: true });
  fs.mkdirSync(orbitDir, { recursive: true });
  fs.mkdirSync(materialDir, { recursive: true });
  fs.mkdirSync(cutDir, { recursive: true });
  fs.mkdirSync(hitDir, { recursive: true });
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
    await page.evaluate(async () => {
      window.__corruptgunCapture__.setup('idle');
      await new Promise(resolve => setTimeout(resolve, 120));
    });
    await page.waitForFunction(() => window.__corruptgunCapture__.readyKeys().filter(key => key.startsWith('cgUltHarvester')).length === 6, { timeout: 30000 });

    const rotation = await page.evaluate(() => {
      const cap = window.__corruptgunCapture__;
      cap.setUltimateBladeAcceptance({ elapsedSeconds: 1.20, quality: 'high', targetMode: 'none' });
      const canvas = document.getElementById('game');
      const output = [];
      for (let frame = 0; frame < 32; frame++) {
        if (frame > 0) cap.advance(3, 1 / 60, false);
        const snapshot = cap.snapshot();
        const blade = snapshot.ultimate.bladeAudit.blades[0];
        const preview = document.createElement('canvas'); preview.width = 360; preview.height = 640;
        preview.getContext('2d').drawImage(canvas, 0, 0, preview.width, preview.height);
        const close = document.createElement('canvas'); close.width = 340; close.height = 240;
        const cc = close.getContext('2d'); cc.fillStyle = '#08050d'; cc.fillRect(0, 0, close.width, close.height);
        cc.translate(close.width / 2, close.height / 2); cc.rotate(-blade.tangent); cc.drawImage(canvas, -blade.x, -blade.y);
        output.push({ preview: preview.toDataURL('image/png'), close: close.toDataURL('image/png'), snapshot });
      }
      return { frames: output, full: canvas.toDataURL('image/png'), ready: cap.readyKeys().filter(key => key.startsWith('cgUltHarvester')) };
    });

    const orbitEntries = [], materialEntries = [];
    for (let index = 0; index < rotation.frames.length; index++) {
      const orbitFile = `anim_blade_orbit/frame_${String(index).padStart(3, '0')}.png`;
      const materialFile = `anim_blade_material/frame_${String(index).padStart(3, '0')}.png`;
      writeDataUrl(path.join(OUT, orbitFile), rotation.frames[index].preview);
      writeDataUrl(path.join(OUT, materialFile), rotation.frames[index].close);
      if (index % 3 === 0) orbitEntries.push({ file: orbitFile, label: `orbit ${(index * 0.05).toFixed(2)}s` });
      if (index % 4 === 0) materialEntries.push({ file: materialFile, label: `edge ${(index * 0.05).toFixed(2)}s` });
    }
    writeDataUrl(path.join(OUT, 'blade_hero.png'), rotation.full);
    makeGif(orbitDir, path.join(OUT, 'blade_orbit.gif'), 50);
    makeGif(materialDir, path.join(OUT, 'blade_material_tracking.gif'), 65);
    makeContact(path.join(OUT, 'blade_orbit_contact.png'), 'LAYERED HARVEST BLADES - FULL ORBIT', orbitEntries, 4, 230, 430);
    makeContact(path.join(OUT, 'blade_material_contact.png'), 'ROOT / SPINE FLOW / EDGE GLINT / TIP / DETACHED DUST', materialEntries, 4, 300, 270);

    const angles = rotation.frames.map(frame => frame.snapshot.ultimate.bladeAudit.blades[0].orbitAngle);
    let totalAngle = 0;
    for (let index = 1; index < angles.length; index++) {
      const rawDelta = angles[index] - angles[index - 1];
      const delta = Math.atan2(Math.sin(rawDelta), Math.cos(rawDelta));
      // V3.41 keeps the blades readable at roughly one revolution per second,
      // with a short surge window instead of the old slow, uniform orbit.
      if (delta < 0.25 || delta > 0.46) throw new Error(`unexpected per-frame blade motion: ${delta}`);
      totalAngle += delta;
    }
    const radii = rotation.frames.map(frame => frame.snapshot.ultimate.bladeAudit.blades[0].radius);
    const uniqueFrames = new Set(rotation.frames.map(frame => hashDataUrl(frame.preview))).size;
    const edgePhases = new Set(rotation.frames.map(frame => frame.snapshot.ultimate.bladeAudit.blades[0].edgePhase.toFixed(3))).size;
    if (rotation.ready.length !== 6) throw new Error(`harvester assets missing: ${rotation.ready.join(',')}`);
    if (totalAngle < 8.30 || totalAngle > 10.35) throw new Error(`blade orbit incomplete or unstable: ${totalAngle}`);
    if (Math.max(...radii) - Math.min(...radii) > 0.5) throw new Error('blade orbit radius drifted');
    if (uniqueFrames < 28 || edgePhases < 12) throw new Error(`blade motion too static: frames=${uniqueFrames} glints=${edgePhases}`);
    if (rotation.frames.some(frame => !frame.snapshot.ultimate.bladeAudit.noTextureGhost)) throw new Error('texture ghost path is still active');

    const cutTimes = [0, 45, 90, 170, 300, 430, 580];
    const cutEntries = [];
    for (const ms of cutTimes) {
      const capture = await page.evaluate(value => {
        const cap = window.__corruptgunCapture__; cap.setUltimateSpaceCut(value, 'high');
        const snapshot = cap.snapshot();
        const game = document.getElementById('game');
        const crop = document.createElement('canvas'); crop.width = 300; crop.height = 230;
        const cut = snapshot.ultimate.bladeAudit.spaceCuts[0] || {
          x: snapshot.ultimate.x + Math.cos(0.86) * 305,
          y: snapshot.ultimate.y + Math.sin(0.86) * 305,
        };
        crop.getContext('2d').drawImage(game, cut.x - 150, cut.y - 115, 300, 230, 0, 0, 300, 230);
        return { data: game.toDataURL('image/png'), crop: crop.toDataURL('image/png'), snapshot };
      }, ms);
      const file = `space_cut_${String(ms).padStart(3, '0')}.png`; writeDataUrl(path.join(OUT, file), capture.data);
      const cropFile = `anim_space_cut/frame_${String(cutEntries.length).padStart(3, '0')}.png`; writeDataUrl(path.join(OUT, cropFile), capture.crop);
      cutEntries.push({ file: cropFile, label: `${ms}ms`, count: capture.snapshot.ultimate.bladeAudit.spaceCuts.length, hash: hashDataUrl(capture.crop) });
    }
    makeGif(cutDir, path.join(OUT, 'space_cut_lifecycle.gif'), 85);
    makeContact(path.join(OUT, 'space_cut_lifecycle.png'), 'SPACE CUT - OPEN / PEAK / PARTICLE DISSOLVE', cutEntries, 4, 310, 275);
    const expectedCutCounts = [1, 1, 1, 1, 1, 1, 0];
    if (cutEntries.some((entry, index) => entry.count !== expectedCutCounts[index])) throw new Error('space cut lifecycle count mismatch');
    if (cutEntries[2].hash === cutEntries[0].hash || cutEntries.at(-1).hash !== cutEntries[0].hash) throw new Error('space cut pixels did not open and close');

    const hitTimes = [0, 60, 140, 280, 420, 500];
    const hitEntries = [];
    for (const ms of hitTimes) {
      const capture = await page.evaluate(value => {
        const cap = window.__corruptgunCapture__;
        cap.setUltimateBladeAcceptance({ elapsedSeconds: 1.42, quality: 'high', targetMode: 'none' });
        const blade = cap.snapshot().ultimate.bladeAudit.blades[0];
        cap.setUltimateBladeAcceptance({ elapsedSeconds: 1.42, quality: 'high', targetMode: 'orbitDummy', targetAngle: blade.orbitAngle, targetRadius: blade.radius });
        cap.spawnUltimateBladeHit(value);
        const snapshot = cap.snapshot();
        const game = document.getElementById('game');
        const crop = document.createElement('canvas'); crop.width = 300; crop.height = 230;
        crop.getContext('2d').drawImage(game, blade.x - 150, blade.y - 115, 300, 230, 0, 0, 300, 230);
        return { data: game.toDataURL('image/png'), crop: crop.toDataURL('image/png'), snapshot };
      }, ms);
      const file = `blade_hit_${String(ms).padStart(3, '0')}.png`; writeDataUrl(path.join(OUT, file), capture.data);
      const cropFile = `anim_blade_hit/frame_${String(hitEntries.length).padStart(3, '0')}.png`; writeDataUrl(path.join(OUT, cropFile), capture.crop);
      hitEntries.push({ file: cropFile, label: `${ms}ms`, count: capture.snapshot.ultimate.bladeAudit.hitCuts.length, screenShake: capture.snapshot.screenShake, hash: hashDataUrl(capture.crop) });
    }
    makeGif(hitDir, path.join(OUT, 'blade_hit_lifecycle.gif'), 90);
    makeContact(path.join(OUT, 'blade_hit_lifecycle.png'), 'ENEMY CUT - LOCAL RIFT / EDGE FLASH / EMBERS', hitEntries, 3, 310, 275);
    const expectedHitCounts = [1, 1, 1, 1, 0, 0];
    if (hitEntries.some((entry, index) => entry.count !== expectedHitCounts[index])) throw new Error('blade hit lifecycle count mismatch');
    if (hitEntries.some(entry => entry.screenShake !== 0)) throw new Error('blade hit introduced screen shake');
    if (new Set(hitEntries.slice(0, 4).map(entry => entry.hash)).size < 3) throw new Error('blade hit pixels are too static');

    const qualityEntries = [];
    for (const quality of ['high', 'medium', 'low']) {
      const capture = await page.evaluate(value => {
        const cap = window.__corruptgunCapture__;
        cap.setUltimateBladeAcceptance({ elapsedSeconds: 1.38, quality: value, targetMode: 'none' });
        cap.advance(12, 1 / 60, false);
        return { data: document.getElementById('game').toDataURL('image/png'), snapshot: cap.snapshot() };
      }, quality);
      const file = `quality_${quality}.png`; writeDataUrl(path.join(OUT, file), capture.data);
      const audit = capture.snapshot.ultimate.bladeAudit;
      qualityEntries.push({
        file,
        label: `${quality} · ${audit.count} blades · ${audit.trailSegments} wake · ${audit.afterimages} shadow · ${audit.detachedDust} dust`,
        audit,
      });
    }
    makeContact(path.join(OUT, 'blade_quality_contact.png'), 'HARVEST BLADE QUALITY MODES', qualityEntries, 3, 260, 480);
    const qualityCounts = qualityEntries.map(entry => [entry.audit.count, entry.audit.trailSegments, entry.audit.afterimages, entry.audit.detachedDust]);
    if (JSON.stringify(qualityCounts) !== JSON.stringify([[6, 7, 1, 3], [5, 5, 1, 2], [4, 3, 0, 1]])) throw new Error(`quality blade budget mismatch: ${JSON.stringify(qualityCounts)}`);

    const report = {
      generatedAt: new Date().toISOString(), source: path.relative(ROOT, SERVE_DIR) || '.',
      errors, missing,
      assets: rotation.ready,
      orbit: { frames: 32, uniqueFrames, totalAngle, radiusDrift: Math.max(...radii) - Math.min(...radii), edgePhases },
      layers: ['black-steel base', 'variant root core', 'transported spine flow', 'moving edge glints', 'needle tip', 'root-aligned tapered wake', 'phase-displaced edge shadows', 'detached particles'],
      spaceCut: { times: cutTimes, counts: cutEntries.map(entry => entry.count) },
      hitCut: { times: hitTimes, counts: hitEntries.map(entry => entry.count), screenShake: hitEntries.map(entry => entry.screenShake) },
      quality: qualityEntries.map(entry => entry.label),
      files: ['blade_hero.png', 'blade_orbit.gif', 'blade_orbit_contact.png', 'blade_material_tracking.gif', 'blade_material_contact.png', 'space_cut_lifecycle.gif', 'space_cut_lifecycle.png', 'blade_hit_lifecycle.gif', 'blade_hit_lifecycle.png', 'blade_quality_contact.png'],
    };
    if (errors.length || missing.length) throw new Error(`browser errors=${errors.length}, missing=${missing.length}`);
    fs.writeFileSync(path.join(OUT, 'capture_report.json'), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(OUT, 'index.html'), `<!doctype html><meta charset="utf-8"><title>暗蚀轮回·收割刀刃V2验收</title><style>body{background:#08050d;color:#f7dce6;font:16px system-ui;margin:24px}img{max-width:900px;width:100%;display:block;margin:12px 0 28px}h1,h2{color:#ff547f}</style><h1>暗蚀轮回·分层收割刀刃 V2</h1><h2>完整公转</h2><img src="blade_orbit.gif"><img src="blade_orbit_contact.png"><h2>刀身材质与独立流光</h2><img src="blade_material_tracking.gif"><img src="blade_material_contact.png"><h2>空间切痕</h2><img src="space_cut_lifecycle.gif"><img src="space_cut_lifecycle.png"><h2>命中切割</h2><img src="blade_hit_lifecycle.gif"><img src="blade_hit_lifecycle.png"><h2>三档画质</h2><img src="blade_quality_contact.png">`);
    syncAcceptance([
      ['blade_orbit.gif', 'ultimate_blades_v2_orbit.gif'],
      ['blade_orbit_contact.png', 'ultimate_blades_v2_orbit_contact.png'],
      ['blade_material_tracking.gif', 'ultimate_blades_v2_material.gif'],
      ['blade_material_contact.png', 'ultimate_blades_v2_material_contact.png'],
      ['space_cut_lifecycle.gif', 'ultimate_blades_v2_space_cut.gif'],
      ['space_cut_lifecycle.png', 'ultimate_blades_v2_space_cut.png'],
      ['blade_hit_lifecycle.gif', 'ultimate_blades_v2_hit.gif'],
      ['blade_hit_lifecycle.png', 'ultimate_blades_v2_hit_cut.png'],
      ['capture_report.json', 'ultimate_blades_v2_report.json'],
      ['blade_orbit.gif', 'ultimate_blades_v31_orbit.gif'],
      ['blade_material_tracking.gif', 'ultimate_blades_v31_material_flow.gif'],
      ['space_cut_lifecycle.gif', 'ultimate_blades_v31_space_shear.gif'],
      ['blade_hit_lifecycle.gif', 'ultimate_blades_v31_hit_cut.gif'],
      ['blade_quality_contact.png', 'ultimate_blades_v31_quality.png'],
      ['capture_report.json', 'ultimate_blades_v31_report.json'],
    ]);
    console.log(`[corruptgun-blades-v2] captured ${path.relative(ROOT, OUT)}; frames=${uniqueFrames}/32; angle=${totalAngle.toFixed(3)}`);
  } finally {
    await browser.close();
    if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
