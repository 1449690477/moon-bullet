import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ROOT = new URL('../../', import.meta.url);
const INDEX_URL = new URL('../../index.html', import.meta.url);
const MANIFEST_URL = new URL('../../assets/dream_stage3/dream_stage3_manifest.json', import.meta.url);
const REPORT_URL = new URL('../../assets/dream_stage3/dream_stage3_asset_report.json', import.meta.url);
const PROCESSOR_URL = new URL('../../tools/process_dream_stage3_assets.py', import.meta.url);

const manifest = JSON.parse(readFileSync(MANIFEST_URL, 'utf8'));
const report = JSON.parse(readFileSync(REPORT_URL, 'utf8'));
const indexSource = readFileSync(INDEX_URL, 'utf8');
const processorSource = readFileSync(PROCESSOR_URL, 'utf8');

function assetUrl(file) {
  return new URL(file, ROOT);
}

function fileSha256(file) {
  return createHash('sha256').update(readFileSync(assetUrl(file))).digest('hex');
}

describe('Dream Stage 3 generated asset contract', () => {
  it('registers every bullet and VFX glow as a first-class non-colliding runtime asset', () => {
    const bases = Object.entries(manifest.assets).filter(([, asset]) => asset.category === 'bullet' || asset.category === 'vfx');
    expect(bases).toHaveLength(37);

    for (const [key, asset] of bases) {
      const expectedGlowKey = `${key}Glow`;
      expect(asset.glowKey, key).toBe(expectedGlowKey);
      expect(asset.glowFile, key).toBeTypeOf('string');
      expect(asset.glowSha256, key).toBe(fileSha256(asset.glowFile));

      const glow = manifest.assets[expectedGlowKey];
      expect(glow, expectedGlowKey).toMatchObject({
        file: asset.glowFile,
        baseOf: key,
        category: `${asset.category}-glow`,
        blendMode: 'lighter',
        collision: 'none',
        keyGreenPixels: 0,
        edgeTouchPixels: 0,
      });
      expect(glow.sha256, expectedGlowKey).toBe(asset.glowSha256);
    }
  });

  it('keeps every declared runtime file present, hashed, padded, and chroma-clean', () => {
    expect(manifest.formatVersion).toBe(2);
    expect(Object.keys(manifest.assets)).toHaveLength(131);
    expect(report).toMatchObject({
      generatedAssetKeys: 131,
      categories: {
        background: 1,
        'background-light': 1,
        enemy: 35,
        boss: 7,
        'boss-glow': 7,
        bullet: 21,
        'bullet-glow': 21,
        vfx: 16,
        'vfx-glow': 16,
        'boss-ui': 6,
      },
      greenValidation: { status: 'pass', assetsWithResidual: [] },
      edgeValidation: { status: 'pass', assetsWithVisibleEdgeTouch: [] },
      preservation: { unknownFilesDeleted: false },
    });

    for (const [key, asset] of Object.entries(manifest.assets)) {
      expect(existsSync(assetUrl(asset.file)), `${key}: missing ${asset.file}`).toBe(true);
      expect(asset.sha256, `${key}: sha256`).toBe(fileSha256(asset.file));
      if (asset.category !== 'background' && asset.category !== 'background-light') {
        expect(asset.keyGreenPixels, `${key}: green spill`).toBe(0);
        expect(asset.edgeTouchPixels, `${key}: edge touch`).toBe(0);
      }
    }
  });

  it('matches all Stage 3 bullet/VFX manifest keys to explicit runtime loader paths', () => {
    const renderedAssets = Object.entries(manifest.assets).filter(([, asset]) =>
      ['bullet', 'bullet-glow', 'vfx', 'vfx-glow'].includes(asset.category));
    expect(renderedAssets).toHaveLength(74);
    for (const [key, asset] of renderedAssets) {
      const escapedPath = asset.file.replaceAll('/', '\\/').replaceAll('.', '\\.');
      expect(indexSource, `${key}: runtime key/path`).toMatch(new RegExp(`${key}\\s*:\\s*['\"]${escapedPath}['\"]`));
    }
  });

  it('preserves hand-authored additions instead of clearing the output tree', () => {
    expect(manifest.renderContract).toMatchObject({ deletesUnknownFiles: false });
    expect(processorSource).toContain('snapshot_unowned_files()');
    expect(processorSource).toContain('validate_unowned_files(preserved_files)');
    expect(processorSource).not.toMatch(/\.(?:unlink|rmdir)\s*\(/);
    expect(processorSource).not.toContain('shutil.rmtree');
  });

  it('ships the shark boss, six readable bullet pairs, six layered VFX pairs, and composable HP UI', () => {
    const bossStates = ['Idle', 'Attack', 'Ice', 'Rage', 'Void', 'Hit', 'Death'];
    for (const state of bossStates) {
      const key = `dreamPlushShark${state}`;
      const glowKey = `${key}Glow`;
      expect(manifest.assets[key]).toMatchObject({
        category: 'boss',
        family: 'shark',
        state,
        glowKey,
        collision: 'body-only',
        keyGreenPixels: 0,
        edgeTouchPixels: 0,
      });
      expect(manifest.assets[glowKey]).toMatchObject({
        category: 'boss-glow',
        baseOf: key,
        blendMode: 'lighter',
        collision: 'none',
      });
    }

    const bullets = ['IceSpear', 'IceShard', 'Snowball', 'Bubble', 'WaveCrescent', 'VoidOrb'];
    for (const name of bullets) {
      const key = `dreamPlushShark${name}`;
      expect(manifest.assets[key]).toMatchObject({ category: 'bullet', family: 'shark', collision: 'body-only' });
      expect(manifest.assets[`${key}Glow`]).toMatchObject({ category: 'bullet-glow', collision: 'none' });
    }
    const iceShard = manifest.assets.dreamPlushSharkIceShard;
    const [left, top, right, bottom] = iceShard.alphaBounds;
    expect(Math.max(right - left, bottom - top) / Math.max(...iceShard.size)).toBeGreaterThanOrEqual(0.55);
    expect(iceShard.forwardAxis).toBe('left');

    const vfx = ['Muzzle', 'IceBurst', 'Whirlpool', 'Wave', 'VoidBurst', 'Shield'];
    for (const name of vfx) {
      const key = `dreamPlushShark${name}`;
      expect(manifest.assets[key]).toMatchObject({ category: 'vfx', family: 'shark', collision: 'none' });
      expect(manifest.assets[`${key}Glow`]).toMatchObject({ category: 'vfx-glow', collision: 'none' });
    }

    const uiRoles = {
      dreamPlushSharkPortrait: 'portrait',
      dreamPlushSharkBossBarFrame: 'frame-overlay',
      dreamPlushSharkBossBarEmpty: 'empty-track',
      dreamPlushSharkBossBarFill: 'live-fill',
      dreamPlushSharkBossBarCritical: 'critical-fill',
      dreamPlushSharkBossBarGloss: 'gloss-overlay',
    };
    for (const [key, role] of Object.entries(uiRoles)) {
      expect(manifest.assets[key]).toMatchObject({ category: 'boss-ui', family: 'shark', role, collision: 'none' });
    }
  });
});
