#!/usr/bin/env node
/**
 * 发布前一致性检查。
 *
 * 目的：避免本地预览、根目录源码和 GitHub Pages 发布目录使用不同版本。
 * 规则：
 * - 根目录 index.html 是唯一发布源码。
 * - docs/index.html 必须由 build:pages 生成并与根目录 index.html 一致。
 * - moon-bullet-main/index.html 如果存在，必须是根目录 index.html 的本地镜像。
 * - Pages manifest / service worker 的版本号必须来自 index.html 与腐化枪运行时输入。
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CG_VFX_BUNDLE_REL = 'assets/player/corrupt_gun/vfx/cg_vfx_engine.iife.js';
const CG_VFX_MANIFEST_REL = 'assets/player/corrupt_gun/cg_vfx_v2_manifest.json';
const CG_INFECTION_MANIFEST_REL = 'assets/player/corrupt_gun/infection/cg_infection_manifest.json';
const CG_MATERIAL_MANIFEST_REL = 'assets/player/corrupt_gun/cg_material_manifest.json';
const CG_ULTIMATE_MANIFEST_REL = 'assets/player/corrupt_gun/ult/cg_ultimate_manifest.json';
const THIRD_PARTY_NOTICES_REL = 'THIRD_PARTY_NOTICES.md';
const VERSION_INPUTS = [CG_VFX_BUNDLE_REL, CG_VFX_MANIFEST_REL, CG_INFECTION_MANIFEST_REL, CG_MATERIAL_MANIFEST_REL, CG_ULTIMATE_MANIFEST_REL, THIRD_PARTY_NOTICES_REL];
const CG_VFX_KEYS = {
  mainOrb: { base: 'cgVfxMainOrbBase', energy: 'cgVfxMainOrbEnergy' },
  cloneOrb: { base: 'cgVfxCloneOrbBase', energy: 'cgVfxCloneOrbEnergy' },
  trail: { base: 'cgVfxTrailBase', energy: 'cgVfxTrailEnergy' },
  muzzle: { base: 'cgVfxMuzzleBase', energy: 'cgVfxMuzzleEnergy' },
  impact: { base: 'cgVfxImpactBase', energy: 'cgVfxImpactEnergy' },
  mark: { base: 'cgVfxMarkBase', energy: 'cgVfxMarkEnergy' },
  cloneField: { base: 'cgVfxCloneFieldBase', energy: 'cgVfxCloneFieldEnergy' },
};
const CG_INFECTION_KEYS = Object.fromEntries(
  ['tendril_1', 'tendril_2', 'tendril_3', 'link', 'node', 'hit', 'burst'].flatMap(part =>
    ['main', 'clone'].map(theme => {
      const partName = part.split('_').map(token => token[0].toUpperCase() + token.slice(1)).join('');
      return [`${part}_${theme}`, `cgInfect${partName}${theme[0].toUpperCase() + theme.slice(1)}`];
    }),
  ),
);
Object.assign(CG_INFECTION_KEYS, Object.fromEntries(
  [
    ['chain_head', 'cgChainHead'],
    ['chain_link', 'cgChainLink'],
    ['tendril_spine', 'cgTendrilSpine'],
    ['tendril_barb', 'cgTendrilBarb'],
    ['source_node', 'cgInfectSourceNode'],
    ['target_burst', 'cgInfectTargetBurst'],
  ].flatMap(([part, prefix]) => ['main', 'clone'].map(theme => [
    `${part}_${theme}`,
    `${prefix}${theme[0].toUpperCase() + theme.slice(1)}`,
  ])),
));
const FILES = {
  source: path.join(ROOT, 'index.html'),
  sourceVfxBundle: path.join(ROOT, CG_VFX_BUNDLE_REL),
  sourceVfxManifest: path.join(ROOT, CG_VFX_MANIFEST_REL),
  sourceInfectionManifest: path.join(ROOT, CG_INFECTION_MANIFEST_REL),
  sourceMaterialManifest: path.join(ROOT, CG_MATERIAL_MANIFEST_REL),
  sourceUltimateManifest: path.join(ROOT, CG_ULTIMATE_MANIFEST_REL),
  sourceNotices: path.join(ROOT, THIRD_PARTY_NOTICES_REL),
  docs: path.join(ROOT, 'docs', 'index.html'),
  mainMirror: path.join(ROOT, 'moon-bullet-main', 'index.html'),
  rootManifest: path.join(ROOT, 'asset-mobile-manifest.js'),
  docsManifest: path.join(ROOT, 'docs', 'asset-mobile-manifest.js'),
  docsSw: path.join(ROOT, 'docs', 'sw.js'),
  docsAssetManifest: path.join(ROOT, 'docs', 'pages-asset-manifest.json'),
  docsVfxBundle: path.join(ROOT, 'docs', CG_VFX_BUNDLE_REL),
  docsVfxManifest: path.join(ROOT, 'docs', CG_VFX_MANIFEST_REL),
  docsInfectionManifest: path.join(ROOT, 'docs', CG_INFECTION_MANIFEST_REL),
  docsMaterialManifest: path.join(ROOT, 'docs', CG_MATERIAL_MANIFEST_REL),
  docsUltimateManifest: path.join(ROOT, 'docs', CG_ULTIMATE_MANIFEST_REL),
  docsNotices: path.join(ROOT, 'docs', THIRD_PARTY_NOTICES_REL),
  mainManifest: path.join(ROOT, 'moon-bullet-main', 'asset-mobile-manifest.js'),
  mainVfxBundle: path.join(ROOT, 'moon-bullet-main', CG_VFX_BUNDLE_REL),
  mainVfxManifest: path.join(ROOT, 'moon-bullet-main', CG_VFX_MANIFEST_REL),
  mainInfectionManifest: path.join(ROOT, 'moon-bullet-main', CG_INFECTION_MANIFEST_REL),
  mainMaterialManifest: path.join(ROOT, 'moon-bullet-main', CG_MATERIAL_MANIFEST_REL),
  mainUltimateManifest: path.join(ROOT, 'moon-bullet-main', CG_ULTIMATE_MANIFEST_REL),
  mainNotices: path.join(ROOT, 'moon-bullet-main', THIRD_PARTY_NOTICES_REL),
};

const IMPORTANT_MARKERS = [
  /drawSkywardEnergyStreamUnderlay/,
  /__corruptgunInternals__/,
  /CG_ASSET_PATHS/,
  /cg_vfx_engine\.iife\.js/,
  /cgVfxMainOrbBase/,
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

function buildVersion(source) {
  const digest = crypto.createHash('sha1');
  digest.update(Buffer.from(source, 'utf8'));
  for (const rel of VERSION_INPUTS) {
    const file = path.join(ROOT, rel);
    digest.update(Buffer.from('\0', 'utf8'));
    digest.update(Buffer.from(rel, 'utf8'));
    digest.update(Buffer.from('\0', 'utf8'));
    digest.update(fs.readFileSync(file));
  }
  return digest.digest('hex').slice(0, 12);
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function readJsonAssignment(source, name) {
  const prefix = `window.${name} = `;
  const line = source.split('\n').find((candidate) => candidate.startsWith(prefix));
  if (!line || !line.endsWith(';')) throw new Error(`缺少 ${name}`);
  return JSON.parse(line.slice(prefix.length, -1));
}

function extractConstObject(source, name) {
  const marker = `const ${name} = {`;
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) throw new Error(`缺少 ${name}`);
  const start = source.indexOf('{', markerIndex);
  let depth = 0;
  let end = -1;
  for (let index = start; index < source.length; index++) {
    if (source[index] === '{') depth++;
    else if (source[index] === '}') {
      depth--;
      if (depth === 0) {
        end = index;
        break;
      }
    }
  }
  if (end < 0) throw new Error(`无法解析 ${name}`);
  const pairs = {};
  const pattern = /\n\s*([A-Za-z0-9_]+):\s*['"]([^'"]+)['"]/g;
  const body = source.slice(start + 1, end);
  for (const match of body.matchAll(pattern)) pairs[match[1]] = match[2];
  return pairs;
}

function countManifestTags(html) {
  return (html.match(/asset-mobile-manifest\.js/g) || []).length;
}

function normalizeManifestCacheBust(html) {
  return html.replace(
    /asset-mobile-manifest\.js\?v=[^"]+/g,
    'asset-mobile-manifest.js',
  );
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
const OPTIONAL_MAIN_FILES = new Set([
  'mainMirror',
  'mainManifest',
  'mainVfxBundle',
  'mainVfxManifest',
  'mainInfectionManifest',
  'mainMaterialManifest',
  'mainUltimateManifest',
  'mainNotices',
]);

for (const [name, file] of Object.entries(FILES)) {
  if (OPTIONAL_MAIN_FILES.has(name)) continue;
  if (!exists(file)) errors.push(`缺少 ${relative(file)}`);
}

if (errors.length) fail(errors);

const source = read(FILES.source);
const docs = read(FILES.docs);
const docsManifest = read(FILES.docsManifest);
const rootManifest = read(FILES.rootManifest);
const docsSw = read(FILES.docsSw);
const expectedVersion = buildVersion(source);

if (normalizeManifestCacheBust(source) !== normalizeManifestCacheBust(docs)) {
  errors.push('index.html 与 docs/index.html 除发布缓存版本外不一致，docs 不是当前源码构建产物');
}

for (const [label, html] of [['index.html', source], ['docs/index.html', docs]]) {
  const tagCount = countManifestTags(html);
  if (tagCount !== 1) errors.push(`${label} 中 asset-mobile-manifest.js 数量应为 1，当前为 ${tagCount}`);
}

if (!docsManifest.includes(`window.__PAGE_BUILD_VERSION__ = "${expectedVersion}"`)) {
  errors.push(`docs/asset-mobile-manifest.js 版本号不是当前 index.html 的 ${expectedVersion}`);
}
if (!docs.includes(`asset-mobile-manifest.js?v=${expectedVersion}`)) {
  errors.push(`docs/index.html 未引用当前缓存版本 asset-mobile-manifest.js?v=${expectedVersion}`);
}
if (rootManifest !== docsManifest) {
  errors.push('根目录 asset-mobile-manifest.js 与 docs/asset-mobile-manifest.js 不一致');
}
if (!docsSw.includes(`moon-bullet-pages-${expectedVersion}`)) {
  errors.push(`docs/sw.js 缓存版本不是当前 index.html 的 ${expectedVersion}`);
}

let parsedPagesAssetManifest = null;
try {
  const manifestJson = JSON.parse(read(FILES.docsAssetManifest));
  parsedPagesAssetManifest = manifestJson;
  if (manifestJson.version !== expectedVersion) {
    errors.push(`docs/pages-asset-manifest.json version=${manifestJson.version}，应为 ${expectedVersion}`);
  }
  const expectedRuntimeFiles = [...VERSION_INPUTS];
  if (JSON.stringify(manifestJson.runtimeSupportFiles) !== JSON.stringify(expectedRuntimeFiles)) {
    errors.push('docs/pages-asset-manifest.json 未记录完整的腐化枪运行时与许可文件');
  }
  if (manifestJson.losslessCorruptgunVfxVariants !== 14) {
    errors.push(`docs/pages-asset-manifest.json 腐化枪无损移动特效数应为 14，当前为 ${manifestJson.losslessCorruptgunVfxVariants}`);
  }
  if (manifestJson.losslessCorruptgunInfectionVariants !== 26) {
    errors.push(`docs/pages-asset-manifest.json 腐化枪无损感染素材数应为 26，当前为 ${manifestJson.losslessCorruptgunInfectionVariants}`);
  }
  if (manifestJson.corruptgunMaterialLayers !== 84) {
    errors.push(`docs/pages-asset-manifest.json 腐化枪材质分层应为 84，当前为 ${manifestJson.corruptgunMaterialLayers}`);
  }
  if (!Number.isInteger(manifestJson.corruptgunUltimateAssets) || manifestJson.corruptgunUltimateAssets <= 0) {
    errors.push('docs/pages-asset-manifest.json 未记录暗蚀轮回素材总数');
  }
  const ultimateGroups = manifestJson.corruptgunUltimateAssetGroups;
  if (!ultimateGroups || Object.keys(ultimateGroups).sort().join(',') !== 'base,opt,phase2') {
    errors.push('docs/pages-asset-manifest.json 未记录 base/opt/phase2 大招素材组');
  } else if (ultimateGroups.opt !== 30 || ultimateGroups.base <= 0 || ultimateGroups.phase2 <= 0) {
    errors.push(`docs/pages-asset-manifest.json 大招素材组数量异常：${JSON.stringify(ultimateGroups)}`);
  }
} catch (error) {
  errors.push(`docs/pages-asset-manifest.json 无法解析：${error.message}`);
}

for (const [label, sourceFile, publishedFile] of [
  ['WebGL bundle', FILES.sourceVfxBundle, FILES.docsVfxBundle],
  ['VFX manifest', FILES.sourceVfxManifest, FILES.docsVfxManifest],
  ['infection manifest', FILES.sourceInfectionManifest, FILES.docsInfectionManifest],
  ['material manifest', FILES.sourceMaterialManifest, FILES.docsMaterialManifest],
  ['ultimate manifest', FILES.sourceUltimateManifest, FILES.docsUltimateManifest],
  ['third-party notices', FILES.sourceNotices, FILES.docsNotices],
]) {
  if (exists(sourceFile) && exists(publishedFile)) {
    if (!fs.readFileSync(sourceFile).equals(fs.readFileSync(publishedFile))) {
      errors.push(`docs 中的 ${label} 与根目录构建输入不一致`);
    }
  }
}

let mobileAssetPaths = {};
try {
  mobileAssetPaths = readJsonAssignment(docsManifest, '__MOBILE_ASSET_PATHS__');
} catch (error) {
  errors.push(`docs/asset-mobile-manifest.js 无法读取移动资源映射：${error.message}`);
}

let parsedVfxManifest = null;
try {
  const vfxManifest = JSON.parse(read(FILES.sourceVfxManifest));
  parsedVfxManifest = vfxManifest;
  if (vfxManifest.formatVersion !== 2 || vfxManifest.character !== 'corruptgun') {
    errors.push('cg_vfx_v2_manifest.json 身份或格式不正确');
  }
  if (vfxManifest.qa?.status !== 'pass') {
    errors.push(`cg_vfx_v2_manifest.json QA 状态不是 pass：${vfxManifest.qa?.status}`);
  }
  if (vfxManifest.renderContract?.fallbackIsVisuallyComplete !== true) {
    errors.push('cg_vfx_v2_manifest.json 未声明视觉完整 fallback');
  }
  if (vfxManifest.renderContract?.mobileEncoding !== 'lossless WebP') {
    errors.push('cg_vfx_v2_manifest.json 未声明 lossless WebP 移动资源');
  }

  for (const [assetName, layers] of Object.entries(CG_VFX_KEYS)) {
    for (const [layerName, runtimeKey] of Object.entries(layers)) {
      const layer = vfxManifest.assets?.[assetName]?.layers?.[layerName];
      if (!layer || typeof layer.png !== 'string' || typeof layer.webpLossless !== 'string') {
        errors.push(`cg_vfx_v2_manifest.json 缺少 ${assetName}.${layerName}`);
        continue;
      }
      const expectedMobileRel = `assets_mobile/${layer.webpLossless.slice('assets/'.length)}`;
      if (mobileAssetPaths[runtimeKey] !== expectedMobileRel) {
        errors.push(`${runtimeKey} 移动映射不是 manifest 指定的无损 WebP`);
      }

      const checks = [
        ['PNG', layer.png, layer.pngSha256],
        ['lossless WebP', layer.webpLossless, layer.webpSha256],
      ];
      for (const [encoding, rel, expectedHash] of checks) {
        const sourceFile = path.join(ROOT, rel);
        const docsFile = path.join(ROOT, 'docs', rel);
        if (!exists(sourceFile) || !exists(docsFile)) {
          errors.push(`缺少 ${assetName}.${layerName} ${encoding}：${rel}`);
          continue;
        }
        const sourceBytes = fs.readFileSync(sourceFile);
        const docsBytes = fs.readFileSync(docsFile);
        if (!sourceBytes.equals(docsBytes)) {
          errors.push(`docs 中的 ${assetName}.${layerName} ${encoding} 与源文件不一致`);
        }
        if (typeof expectedHash === 'string' && sha256(sourceBytes) !== expectedHash) {
          errors.push(`${assetName}.${layerName} ${encoding} 哈希与 manifest 不一致`);
        }
      }

      const sourceLossless = path.join(ROOT, layer.webpLossless);
      const mobileLossless = path.join(ROOT, 'docs', expectedMobileRel);
      if (!exists(mobileLossless)) {
        errors.push(`缺少 ${runtimeKey} 的移动无损 WebP：${expectedMobileRel}`);
      } else if (exists(sourceLossless) && !fs.readFileSync(sourceLossless).equals(fs.readFileSync(mobileLossless))) {
        errors.push(`${runtimeKey} 的移动 WebP 不是生成器输出的无损原文件`);
      }
    }
  }
} catch (error) {
  errors.push(`cg_vfx_v2_manifest.json 无法验证：${error.message}`);
}

let parsedInfectionManifest = null;
try {
  parsedInfectionManifest = JSON.parse(read(FILES.sourceInfectionManifest));
  if (parsedInfectionManifest.formatVersion !== 1 || parsedInfectionManifest.character !== 'corruptgun') {
    errors.push('cg_infection_manifest.json 身份或格式不正确');
  }
  if (parsedInfectionManifest.renderContract?.fallbackComplete !== true) {
    errors.push('cg_infection_manifest.json 未声明视觉完整 fallback');
  }
  if (Object.keys(parsedInfectionManifest.assets || {}).length !== 26) {
    errors.push('cg_infection_manifest.json 应包含 26 个感染素材');
  }
  for (const [manifestKey, runtimeKey] of Object.entries(CG_INFECTION_KEYS)) {
    const item = parsedInfectionManifest.assets?.[manifestKey];
    if (!item || typeof item.file !== 'string') {
      errors.push(`cg_infection_manifest.json 缺少 ${manifestKey}`);
      continue;
    }
    const sourceFile = path.join(ROOT, item.file);
    const docsFile = path.join(ROOT, 'docs', item.file);
    if (!exists(sourceFile) || !exists(docsFile)) {
      errors.push(`缺少感染素材 ${item.file}`);
      continue;
    }
    const sourceBytes = fs.readFileSync(sourceFile);
    if (!sourceBytes.equals(fs.readFileSync(docsFile))) errors.push(`docs 感染素材与源文件不一致：${item.file}`);
    if (item.greenPixels !== 0) errors.push(`感染素材仍有绿边：${item.file}`);
    if (manifestKey.endsWith('_clone') && item.cyanPixels !== 0) errors.push(`分身感染素材仍有青边：${item.file}`);
    if (sha256(sourceBytes) !== item.sha256) errors.push(`感染素材哈希不一致：${item.file}`);
    const mobileRel = `assets_mobile/${item.file.slice('assets/'.length).replace(/\.png$/i, '.webp')}`;
    if (mobileAssetPaths[runtimeKey] !== mobileRel) errors.push(`${runtimeKey} 移动映射不是感染素材的无损 WebP`);
    const mobileFile = path.join(ROOT, 'docs', mobileRel);
    if (!exists(mobileFile)) {
      errors.push(`缺少 ${runtimeKey} 移动 WebP：${mobileRel}`);
    } else {
      const mobileBytes = fs.readFileSync(mobileFile);
      if (mobileBytes.subarray(12, 16).toString('ascii') !== 'VP8L') errors.push(`${runtimeKey} 移动 WebP 不是 lossless VP8L`);
    }
  }
} catch (error) {
  errors.push(`cg_infection_manifest.json 无法验证：${error.message}`);
}

let parsedMaterialManifest = null;
try {
  parsedMaterialManifest = JSON.parse(read(FILES.sourceMaterialManifest));
  if (parsedMaterialManifest.version !== 1 || parsedMaterialManifest.character !== 'corruptgun') {
    errors.push('cg_material_manifest.json 身份或格式不正确');
  }
  if (Object.keys(parsedMaterialManifest.assets || {}).length !== 84) {
    errors.push('cg_material_manifest.json 应包含 84 个材质层');
  }
  for (const [relativeAsset, item] of Object.entries(parsedMaterialManifest.assets || {})) {
    const rel = `assets/player/corrupt_gun/${relativeAsset}`;
    const sourceFile = path.join(ROOT, rel);
    const docsFile = path.join(ROOT, 'docs', rel);
    if (!exists(sourceFile) || !exists(docsFile)) {
      errors.push(`缺少机体材质层：${rel}`);
      continue;
    }
    const sourceBytes = fs.readFileSync(sourceFile);
    if (!sourceBytes.equals(fs.readFileSync(docsFile))) errors.push(`docs 机体材质层与源文件不一致：${rel}`);
    if (item.residualGreenPixels !== 0) errors.push(`机体材质层仍有绿边：${rel}`);
    if (sha256(sourceBytes) !== item.sha256) errors.push(`机体材质层哈希不一致：${rel}`);
    const mobileRel = `assets_mobile/${rel.slice('assets/'.length).replace(/\.png$/i, '.webp')}`;
    const mobileFile = path.join(ROOT, 'docs', mobileRel);
    if (!exists(mobileFile)) {
      errors.push(`缺少机体材质层移动 WebP：${mobileRel}`);
    } else if (fs.readFileSync(mobileFile).subarray(12, 16).toString('ascii') !== 'VP8L') {
      errors.push(`机体材质层移动 WebP 不是 lossless VP8L：${mobileRel}`);
    }
  }
} catch (error) {
  errors.push(`cg_material_manifest.json 无法验证：${error.message}`);
}

let parsedUltimateManifest = null;
try {
  parsedUltimateManifest = JSON.parse(read(FILES.sourceUltimateManifest));
  if (parsedUltimateManifest.formatVersion !== 2 || parsedUltimateManifest.character !== 'corruptgun' || parsedUltimateManifest.ultimate !== 'darkWheel') {
    errors.push('cg_ultimate_manifest.json 身份或格式不正确');
  }
  const ultimateAssets = parsedUltimateManifest.assets || {};
  const ultimateGroups = parsedUltimateManifest.assetGroups || {};
  if (Object.keys(ultimateGroups).sort().join(',') !== 'base,opt,phase2') {
    errors.push('cg_ultimate_manifest.json 必须声明 base/opt/phase2 素材组');
  }
  const groupedAssets = new Map();
  for (const [groupName, group] of Object.entries(ultimateGroups)) {
    if (!Array.isArray(group?.paths) || new Set(group.paths).size !== group.paths.length) {
      errors.push(`cg_ultimate_manifest.json ${groupName} 素材组路径无效或重复`);
      continue;
    }
    for (const relativeAsset of group.paths) {
      if (groupedAssets.has(relativeAsset)) errors.push(`暗蚀轮回素材被重复分组：${relativeAsset}`);
      groupedAssets.set(relativeAsset, groupName);
    }
  }
  if (groupedAssets.size !== Object.keys(ultimateAssets).length || Object.keys(ultimateAssets).some(rel => !groupedAssets.has(rel))) {
    errors.push('cg_ultimate_manifest.json 素材组没有完整且唯一地覆盖 assets');
  }
  if (ultimateGroups.opt?.paths?.length !== 30 || ultimateGroups.opt?.preservedUnmodified !== true) {
    errors.push('cg_ultimate_manifest.json 必须原样保留30件 opt 素材');
  }
  const expectedSoulSequences = { soul_emerge: 6, soul_flight: 6, soul_variants: 7, soul_burst: 8, soul_transition: 11 };
  for (const [sequenceName, frameCount] of Object.entries(expectedSoulSequences)) {
    const sequence = parsedUltimateManifest.sequences?.[sequenceName];
    if (!sequence || sequence.frames !== frameCount) {
      errors.push(`cg_ultimate_manifest.json ${sequenceName} 帧数应为 ${frameCount}`);
      continue;
    }
    for (const layerName of ['base', 'energy']) {
      const runtimeKey = sequence.runtimeKeys?.[layerName];
      const expectedSource = `assets/player/corrupt_gun/ult/${sequence[layerName]}`;
      const sourceAssetMap = { ...extractConstObject(source, 'ASSET_PATHS'), ...extractConstObject(source, 'CG_ASSET_PATHS') };
      if (typeof runtimeKey !== 'string' || sourceAssetMap[runtimeKey] !== expectedSource) {
        errors.push(`${sequenceName}.${layerName} 运行时键缺失或路径不一致`);
      }
    }
  }
  if (parsedUltimateManifest.qa?.status !== 'pass' || parsedUltimateManifest.qa?.phase2ResidualGreenPixels !== 0 || parsedUltimateManifest.qa?.phase2ResidualCyanPixels !== 0) {
    errors.push('cg_ultimate_manifest.json 二段素材绿青残留 QA 未通过');
  }
  if (parsedUltimateManifest.qa?.optPreserved !== true) errors.push('cg_ultimate_manifest.json 未确认 opt 素材哈希保持不变');
  for (const [relativeAsset, item] of Object.entries(ultimateAssets)) {
    const rel = `assets/player/corrupt_gun/ult/${relativeAsset}`;
    const sourceFile = path.join(ROOT, rel);
    const docsFile = path.join(ROOT, 'docs', rel);
    if (!exists(sourceFile) || !exists(docsFile)) {
      errors.push(`缺少暗蚀轮回素材：${rel}`);
      continue;
    }
    const sourceBytes = fs.readFileSync(sourceFile);
    if (!sourceBytes.equals(fs.readFileSync(docsFile))) errors.push(`docs 暗蚀轮回素材与源文件不一致：${rel}`);
    const groupName = groupedAssets.get(relativeAsset);
    if (groupName !== 'opt' && relativeAsset !== 'reference/cg_ult_concept.png' && (item.residualGreenPixels !== 0 || item.residualCyanPixels !== 0)) errors.push(`暗蚀轮回素材仍有绿青残留：${rel}`);
    if (groupName === 'opt' && item.preservedUnmodified !== true) errors.push(`opt素材未标记原样保留：${rel}`);
    if (sha256(sourceBytes) !== item.sha256) errors.push(`暗蚀轮回素材哈希不一致：${rel}`);
    if (relativeAsset === 'reference/cg_ult_concept.png') continue;
    const runtimeEntry = Object.entries(readJsonAssignment(docsManifest, '__MOBILE_ASSET_PATHS__'))
      .find(([, mobileRel]) => mobileRel === `assets_mobile/player/corrupt_gun/ult/${relativeAsset.replace(/\.png$/i, '.webp')}`);
    if (!runtimeEntry) errors.push(`暗蚀轮回素材缺少移动映射：${rel}`);
    const mobileRel = `assets_mobile/player/corrupt_gun/ult/${relativeAsset.replace(/\.png$/i, '.webp')}`;
    const mobileFile = path.join(ROOT, 'docs', mobileRel);
    if (!exists(mobileFile)) errors.push(`缺少暗蚀轮回移动素材：${mobileRel}`);
    else if (fs.readFileSync(mobileFile).subarray(12, 16).toString('ascii') !== 'VP8L') errors.push(`暗蚀轮回移动素材不是 lossless VP8L：${mobileRel}`);
  }
  const groupCounts = Object.fromEntries(Object.entries(ultimateGroups).map(([name, group]) => [name, group?.paths?.length || 0]));
  if (parsedPagesAssetManifest) {
    if (parsedPagesAssetManifest.corruptgunUltimateAssets !== Object.keys(ultimateAssets).length) {
      errors.push('docs/pages-asset-manifest.json 大招素材总数与审计Manifest不一致');
    }
    if (JSON.stringify(parsedPagesAssetManifest.corruptgunUltimateAssetGroups) !== JSON.stringify(groupCounts)) {
      errors.push('docs/pages-asset-manifest.json 大招素材组数量与审计Manifest不一致');
    }
  }
} catch (error) {
  errors.push(`cg_ultimate_manifest.json 无法验证：${error.message}`);
}

for (const rel of [CG_VFX_BUNDLE_REL, CG_VFX_MANIFEST_REL, CG_INFECTION_MANIFEST_REL, CG_MATERIAL_MANIFEST_REL, CG_ULTIMATE_MANIFEST_REL]) {
  if (!docsSw.includes(`./${rel}`)) {
    errors.push(`docs/sw.js 核心缓存缺少 ./${rel}`);
  }
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
  for (const [label, sourceFile, mirrorFile] of [
    ['WebGL bundle', FILES.sourceVfxBundle, FILES.mainVfxBundle],
    ['VFX manifest', FILES.sourceVfxManifest, FILES.mainVfxManifest],
    ['infection manifest', FILES.sourceInfectionManifest, FILES.mainInfectionManifest],
    ['material manifest', FILES.sourceMaterialManifest, FILES.mainMaterialManifest],
    ['ultimate manifest', FILES.sourceUltimateManifest, FILES.mainUltimateManifest],
    ['third-party notices', FILES.sourceNotices, FILES.mainNotices],
  ]) {
    if (!exists(mirrorFile)) {
      errors.push(`moon-bullet-main 缺少 ${label}：${relative(mirrorFile)}`);
    } else if (!fs.readFileSync(sourceFile).equals(fs.readFileSync(mirrorFile))) {
      errors.push(`moon-bullet-main 中的 ${label} 与根目录不一致`);
    }
  }
  if (parsedVfxManifest) {
    for (const [assetName, layers] of Object.entries(CG_VFX_KEYS)) {
      for (const layerName of Object.keys(layers)) {
        const layer = parsedVfxManifest.assets?.[assetName]?.layers?.[layerName];
        if (!layer) continue;
        for (const rel of [layer.png, layer.webpLossless]) {
          const sourceFile = path.join(ROOT, rel);
          const mirrorFile = path.join(ROOT, 'moon-bullet-main', rel);
          if (!exists(mirrorFile)) {
            errors.push(`moon-bullet-main 缺少腐化枪 VFX：${rel}`);
          } else if (!fs.readFileSync(sourceFile).equals(fs.readFileSync(mirrorFile))) {
            errors.push(`moon-bullet-main 腐化枪 VFX 与根目录不一致：${rel}`);
          }
        }
        const mobileRel = `assets_mobile/${layer.webpLossless.slice('assets/'.length)}`;
        const docsMobile = path.join(ROOT, 'docs', mobileRel);
        const mirrorMobile = path.join(ROOT, 'moon-bullet-main', mobileRel);
        if (!exists(mirrorMobile)) {
          errors.push(`moon-bullet-main 缺少移动无损 VFX：${mobileRel}`);
        } else if (exists(docsMobile) && !fs.readFileSync(docsMobile).equals(fs.readFileSync(mirrorMobile))) {
          errors.push(`moon-bullet-main 移动 VFX 与 docs 不一致：${mobileRel}`);
        }
      }
    }
  }
  if (parsedInfectionManifest) {
    for (const item of Object.values(parsedInfectionManifest.assets || {})) {
      const sourceFile = path.join(ROOT, item.file);
      const mirrorFile = path.join(ROOT, 'moon-bullet-main', item.file);
      if (!exists(mirrorFile)) errors.push(`moon-bullet-main 缺少感染素材：${item.file}`);
      else if (!fs.readFileSync(sourceFile).equals(fs.readFileSync(mirrorFile))) errors.push(`moon-bullet-main 感染素材与源文件不一致：${item.file}`);
      const mobileRel = `assets_mobile/${item.file.slice('assets/'.length).replace(/\.png$/i, '.webp')}`;
      const docsMobile = path.join(ROOT, 'docs', mobileRel);
      const mirrorMobile = path.join(ROOT, 'moon-bullet-main', mobileRel);
      if (!exists(mirrorMobile)) errors.push(`moon-bullet-main 缺少感染移动素材：${mobileRel}`);
      else if (exists(docsMobile) && !fs.readFileSync(docsMobile).equals(fs.readFileSync(mirrorMobile))) errors.push(`moon-bullet-main 感染移动素材与 docs 不一致：${mobileRel}`);
    }
  }
  if (parsedMaterialManifest) {
    for (const relativeAsset of Object.keys(parsedMaterialManifest.assets || {})) {
      const rel = `assets/player/corrupt_gun/${relativeAsset}`;
      const sourceFile = path.join(ROOT, rel);
      const mirrorFile = path.join(ROOT, 'moon-bullet-main', rel);
      if (!exists(mirrorFile)) errors.push(`moon-bullet-main 缺少机体材质层：${rel}`);
      else if (!fs.readFileSync(sourceFile).equals(fs.readFileSync(mirrorFile))) errors.push(`moon-bullet-main 机体材质层与根目录不一致：${rel}`);
      const mobileRel = `assets_mobile/${rel.slice('assets/'.length).replace(/\.png$/i, '.webp')}`;
      const docsMobile = path.join(ROOT, 'docs', mobileRel);
      const mirrorMobile = path.join(ROOT, 'moon-bullet-main', mobileRel);
      if (!exists(mirrorMobile)) errors.push(`moon-bullet-main 缺少材质层移动素材：${mobileRel}`);
      else if (exists(docsMobile) && !fs.readFileSync(docsMobile).equals(fs.readFileSync(mirrorMobile))) errors.push(`moon-bullet-main 材质层移动素材与 docs 不一致：${mobileRel}`);
    }
  }
  if (parsedUltimateManifest) {
    for (const relativeAsset of Object.keys(parsedUltimateManifest.assets || {})) {
      const rel = `assets/player/corrupt_gun/ult/${relativeAsset}`;
      const sourceFile = path.join(ROOT, rel);
      const mirrorFile = path.join(ROOT, 'moon-bullet-main', rel);
      if (!exists(mirrorFile)) errors.push(`moon-bullet-main 缺少暗蚀轮回素材：${rel}`);
      else if (!fs.readFileSync(sourceFile).equals(fs.readFileSync(mirrorFile))) errors.push(`moon-bullet-main 暗蚀轮回素材与根目录不一致：${rel}`);
      if (relativeAsset === 'reference/cg_ult_concept.png') continue;
      const mobileRel = `assets_mobile/player/corrupt_gun/ult/${relativeAsset.replace(/\.png$/i, '.webp')}`;
      const docsMobile = path.join(ROOT, 'docs', mobileRel);
      const mirrorMobile = path.join(ROOT, 'moon-bullet-main', mobileRel);
      if (!exists(mirrorMobile)) errors.push(`moon-bullet-main 缺少暗蚀轮回移动素材：${mobileRel}`);
      else if (exists(docsMobile) && !fs.readFileSync(docsMobile).equals(fs.readFileSync(mirrorMobile))) errors.push(`moon-bullet-main 暗蚀轮回移动素材与 docs 不一致：${mobileRel}`);
    }
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
