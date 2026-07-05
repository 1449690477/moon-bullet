#!/usr/bin/env node
/**
 * 发布前一致性检查。
 *
 * 目的：避免本地预览、根目录源码和 GitHub Pages 发布目录使用不同版本。
 * 规则：
 * - 根目录 index.html 是唯一发布源码。
 * - docs/index.html 必须由 build:pages 生成并与根目录 index.html 一致。
 * - moon-bullet-main/index.html 如果存在，必须是根目录 index.html 的本地镜像。
 * - Pages manifest / service worker 的版本号必须来自当前 index.html 的 SHA1。
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILES = {
  source: path.join(ROOT, 'index.html'),
  docs: path.join(ROOT, 'docs', 'index.html'),
  mainMirror: path.join(ROOT, 'moon-bullet-main', 'index.html'),
  docsManifest: path.join(ROOT, 'docs', 'asset-mobile-manifest.js'),
  docsSw: path.join(ROOT, 'docs', 'sw.js'),
  docsAssetManifest: path.join(ROOT, 'docs', 'pages-asset-manifest.json'),
  mainManifest: path.join(ROOT, 'moon-bullet-main', 'asset-mobile-manifest.js'),
};

const IMPORTANT_MARKERS = [
  /drawSkywardEnergyStreamUnderlay/,
  /__PAGE_BUILD_VERSION__/,
];

const MAX_ALPHA_MARKERS = {
  normalTrailAlpha: 0.18,
  normalUnderlayAlpha: 0.08,
  overdriveUnderlayAlpha: 0.10,
};

function exists(file) {
  return fs.existsSync(file) && fs.statSync(file).isFile();
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function sha1(text) {
  return crypto.createHash('sha1').update(text).digest('hex').slice(0, 12);
}

function countManifestTags(html) {
  return (html.match(/asset-mobile-manifest\.js/g) || []).length;
}

function relative(file) {
  return path.relative(ROOT, file) || '.';
}

function fail(errors) {
  console.error('\n发布一致性检查失败：');
  for (const error of errors) console.error(`- ${error}`);
  console.error('\n先运行：npm run release:pages');
  process.exit(1);
}

const errors = [];

for (const [name, file] of Object.entries(FILES)) {
  if (name === 'mainMirror' || name === 'mainManifest') continue;
  if (!exists(file)) errors.push(`缺少 ${relative(file)}`);
}

if (errors.length) fail(errors);

const source = read(FILES.source);
const docs = read(FILES.docs);
const docsManifest = read(FILES.docsManifest);
const docsSw = read(FILES.docsSw);
const expectedVersion = sha1(source);

if (source !== docs) {
  errors.push('index.html 与 docs/index.html 不一致，docs 不是当前源码构建产物');
}

for (const [label, html] of [['index.html', source], ['docs/index.html', docs]]) {
  const tagCount = countManifestTags(html);
  if (tagCount !== 1) errors.push(`${label} 中 asset-mobile-manifest.js 数量应为 1，当前为 ${tagCount}`);
}

if (!docsManifest.includes(`window.__PAGE_BUILD_VERSION__ = "${expectedVersion}"`)) {
  errors.push(`docs/asset-mobile-manifest.js 版本号不是当前 index.html 的 ${expectedVersion}`);
}
if (!docsSw.includes(`moon-bullet-pages-${expectedVersion}`)) {
  errors.push(`docs/sw.js 缓存版本不是当前 index.html 的 ${expectedVersion}`);
}

try {
  const manifestJson = JSON.parse(read(FILES.docsAssetManifest));
  if (manifestJson.version !== expectedVersion) {
    errors.push(`docs/pages-asset-manifest.json version=${manifestJson.version}，应为 ${expectedVersion}`);
  }
} catch (error) {
  errors.push(`docs/pages-asset-manifest.json 无法解析：${error.message}`);
}

if (exists(FILES.mainMirror)) {
  const mainMirror = read(FILES.mainMirror);
  if (mainMirror !== source) {
    errors.push('moon-bullet-main/index.html 与根目录 index.html 不一致，本地预览会和线上不同');
  }
  const tagCount = countManifestTags(mainMirror);
  if (tagCount !== 1) {
    errors.push(`moon-bullet-main/index.html 中 asset-mobile-manifest.js 数量应为 1，当前为 ${tagCount}`);
  }
}

if (exists(FILES.mainManifest)) {
  const mainManifest = read(FILES.mainManifest);
  if (mainManifest !== docsManifest) {
    errors.push('moon-bullet-main/asset-mobile-manifest.js 与 docs/asset-mobile-manifest.js 不一致');
  }
}

for (const marker of IMPORTANT_MARKERS) {
  if (!marker.test(source) && !marker.test(docsManifest)) {
    errors.push(`缺少关键发布标记：${marker}`);
  }
}

for (const [name, max] of Object.entries(MAX_ALPHA_MARKERS)) {
  const match = source.match(new RegExp(`${name}:\\s*([0-9.]+)`));
  if (!match) {
    errors.push(`缺少 ${name} 参数，无法确认苍穹连锁特效不会过曝`);
    continue;
  }
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value > max) {
    errors.push(`${name}=${match[1]} 过高，可能再次导致连锁飞剑白光过曝；上限 ${max}`);
  }
}

if (errors.length) fail(errors);

console.log(`发布一致性检查通过：index/docs/mainMirror 均为 ${expectedVersion}`);
