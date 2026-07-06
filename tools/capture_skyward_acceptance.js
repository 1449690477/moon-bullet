#!/usr/bin/env node
const fs = require('fs');
const http = require('http');
const path = require('path');
const puppeteer = require('puppeteer-core');

const ROOT = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(ROOT, 'docs');
const OUT_DIR = path.join(ROOT, 'tools', 'skyward_acceptance');
const PORT = Number(process.env.SKYWARD_CAPTURE_PORT || 18793);

const SCENES = [
  ['title', '01_title_sixth_character_card.png', 24],
  ['idle', '02_normal_idle_body.png', 28],
  ['modules', '03_flow_halo_hover_modules.png', 24],
  ['normal_fire', '04_sacred_lance_straight_fire.png', 8],
  ['normal_bullets', '05_side_blades_and_module_fire.png', 10],
  ['overdrive_idle', '06_overdrive_wing_open.png', 26],
  ['overdrive_fire', '07_overdrive_lance_array.png', 8],
  ['overdrive_bullets', '08_overdrive_wing_blade_storm.png', 10],
  ['normal_body_close', '09_normal_body_material_close.png', 24],
  ['normal_bullets_close', '10_normal_bullet_texture_close.png', 10],
  ['overdrive_idle_close', '11_overdrive_body_material_close.png', 24],
  ['overdrive_bullets_close', '12_overdrive_bullet_texture_close.png', 10],
  ['hit_vfx_close', '13_crystal_hit_vfx_close.png', 12],
  ['module_inertia_left_right', '14_module_inertia_left_right.png', 42],
  ['halo_front_back_split_close', '15_halo_front_back_split_close.png', 28],
  ['green_edge_close', '16_green_edge_close.png', 28],
  ['overdrive_clean_wing_no_extra_rings', '17_overdrive_clean_wing_no_extra_rings.png', 30],
  ['crystal_flow_normal_close', '18_crystal_flow_normal_close.png', 36],
  ['crystal_flow_overdrive_close', '19_crystal_flow_overdrive_close.png', 36],
  ['normal_shorter_body_close', '20_v4_normal_shorter_body.png', 28],
  ['body_crystal_float_idle_close', '21_v4_body_crystal_float.png', 42],
  ['halo_float_gloss_close', '22_v4_halo_float_gloss.png', 38],
  ['center_spine_flow_close', '23_v4_center_spine_flow.png', 36],
  ['normal_large_lance_close', '24_v4_normal_large_lance.png', 12],
  ['module_thin_lance_volley', '25_v4_module_thin_lance_volley.png', 14],
  ['overdrive_dense_lance_fan', '26_v4_overdrive_dense_lance_fan.png', 10],
  ['overdrive_giant_lance_close', '27_v4_overdrive_giant_lance.png', 10],
  ['six_module_fire_close', '28_v5_six_module_fire.png', 16],
  ['module_bounce_chain_normal_close', '29_v5_module_bounce_chain_normal.png', 16],
  ['overdrive_module_thrusters_close', '30_v5_overdrive_module_thrusters.png', 30],
  ['module_bounce_chain_overdrive_close', '31_v5_module_bounce_chain_overdrive.png', 14],
  ['central_piercing_lance_chain_close', '32_v5_central_piercing_lance.png', 16],
  ['crown_texture_augmented_close', '33_v5_crown_texture_augmented.png', 34],
  ['arc_blade_cutting_close', '34_v5_arc_blade_cutting.png', 8],
  ['arc_blade_lance_fallback_check_close', '35_v5_arc_blade_lance_fallback_check.png', 20],
  ['overdrive_energy_stream_close', '36_v6_overdrive_energy_stream.png', 14],
  ['module_bounce_sword_material_close', '37_v6_module_bounce_sword_material.png', 18],
  ['stellar_blink_ui', '38_space_blink_charge_ui.png', 24],
  ['stellar_blink_dash_portal_close', '39_space_blink_dash_portals.png', 12],
  ['stellar_blink_homing_sword_volley_close', '40_space_blink_homing_swords.png', 8],
  ['stellar_blink_chain_five_close', '41_space_blink_chain_five.png', 18],
  ['stellar_blink_warp_transition_close', '42_space_blink_warp_transition.png', 6],
  ['stellar_blink_landing_wing_burst_close', '43_space_blink_landing_wing_burst.png', 12],
  ['stellar_blink_charge_hud_only', '44_space_blink_hud_only_charge.png', 20],
  ['stellar_blink_chain_transition_close', '45_space_blink_chain_transition.png', 18],
  ['stellar_blink_aim_select', '50_space_blink_aim_select.png', 18],
  ['ultimate_aegis_deploy_close', '46_x_aegis_deploy.png', 14],
  ['ultimate_aegis_active_blocking_close', '47_x_aegis_blocking.png', 18],
  ['ultimate_aegis_empowered_fire_close', '48_x_aegis_empowered_fire.png', 12],
  ['ultimate_aegis_collapse_close', '49_x_aegis_collapse.png', 10],
];

function browserExecutablePath() {
  const candidates = [process.env.PUPPETEER_EXECUTABLE_PATH, process.env.CHROME_PATH].filter(Boolean);
  if (process.platform === 'darwin') {
    candidates.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
  } else if (process.platform === 'win32') {
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
  } else {
    candidates.push('/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser');
  }
  return candidates.find((candidate) => candidate && fs.existsSync(candidate));
}

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.json': 'application/json',
  }[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime });
  fs.createReadStream(filePath).pipe(res);
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const rel = req.url === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
      const filePath = path.resolve(DOCS_DIR, rel);
      if (!filePath.startsWith(DOCS_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      fs.stat(filePath, (err, stat) => {
        if (err || !stat.isFile()) {
          res.writeHead(404);
          res.end('Not Found');
          return;
        }
        serveFile(filePath, res);
      });
    });
    server.once('error', reject);
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

async function captureScene(page, scene, fileName, frames) {
  const result = await page.evaluate(async ({ scene, frames }) => {
    const cap = window.__skywardCapture__;
    if (!cap) throw new Error('__skywardCapture__ is not available');
    const prepared = cap.setup(scene);
    for (let i = 0; i < 12; i++) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    const stepped = cap.advance(frames);
    const canvas = document.getElementById('game');
    let dataUrl = canvas.toDataURL('image/png');
    if (scene.includes('close')) {
      const snap = stepped || prepared;
      const cx = snap?.player?.x || canvas.width * 0.5;
      const cy = snap?.player?.y || canvas.height * 0.55;
      const crop = document.createElement('canvas');
      crop.width = 460;
      crop.height = 460;
      const cctx = crop.getContext('2d');
      cctx.drawImage(canvas, Math.max(0, cx - 230), Math.max(0, cy - 280), 460, 460, 0, 0, 460, 460);
      dataUrl = crop.toDataURL('image/png');
    }
    return { prepared, stepped, dataUrl };
  }, { scene, frames });
  const base64 = result.dataUrl.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(path.join(OUT_DIR, fileName), Buffer.from(base64, 'base64'));
  console.log(`${fileName}: scene=${scene} shots=${result.stepped.skywardShots} modules=${result.stepped.modules.length} over=${result.stepped.overdriveK.toFixed(2)}`);
}

async function main() {
  if (!fs.existsSync(path.join(DOCS_DIR, 'index.html'))) {
    throw new Error('docs/index.html missing. Run npm run build:pages first.');
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const file of fs.readdirSync(OUT_DIR)) {
    if (/^\d{2}_.+\.png$/.test(file)) fs.rmSync(path.join(OUT_DIR, file), { force: true });
  }
  const executablePath = browserExecutablePath();
  if (!executablePath) throw new Error('Chrome or Edge executable not found.');

  let server;
  let browser;
  const errors = [];
  try {
    server = await startServer();
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required'],
    });
    const page = await browser.newPage();
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
        console.error(`[page error] ${msg.text()}`);
      }
    });
    page.on('pageerror', (err) => {
      errors.push(err.message);
      console.error(`[pageerror] ${err.message}`);
    });
    await page.setViewport({ width: 720, height: 1280, deviceScaleFactor: 1 });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForFunction(() => !!window.__skywardCapture__, { timeout: 15000 });
    await page.evaluate(() => {
      window.__skywardCapture__.setup('idle');
    });
    await page.waitForFunction(() => window.__skywardCapture__.readyKeys().length >= 24, { timeout: 15000 });

    for (const [scene, fileName, frames] of SCENES) {
      await captureScene(page, scene, fileName, frames);
    }
    if (errors.length) {
      throw new Error(`Page errors during skyward capture:\n${errors.slice(0, 8).join('\n')}`);
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server) await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
