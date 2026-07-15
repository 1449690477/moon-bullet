import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { loadDreamModeInternals } from './setup.js';

const LEVEL_THREE = 'dream-03-plush-room';
const MANIFEST_URL = new URL('../../assets/dream_stage3/dream_stage3_manifest.json', import.meta.url);
const ASSET_REPORT_URL = new URL('../../assets/dream_stage3/dream_stage3_asset_report.json', import.meta.url);

describe('dream mode level three: Plush Dream Room', () => {
  const dream = loadDreamModeInternals();
  const source = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const edgeSource = readFileSync(new URL('../../supabase/functions/leaderboard-run/index.ts', import.meta.url), 'utf8');
  const manifest = JSON.parse(readFileSync(MANIFEST_URL, 'utf8'));
  const assetReport = JSON.parse(readFileSync(ASSET_REPORT_URL, 'utf8'));

  it('registers the unlocked room stage as a ten-wave, boss-free Dream level', () => {
    expect(dream.levelsSpec()).toContainEqual(expect.objectContaining({
      id: LEVEL_THREE,
      version: 'dream-03-v1',
      seed: 7130303,
      name: '绒梦玩偶屋',
      waveCount: 10,
      mobTargetSeconds: 545,
      bossTargetSeconds: 0,
      bossKey: null,
      hasBoss: false,
      roomScene: true,
      unlocked: true,
    }));
    expect(dream.modeSpec()).toMatchObject({ levelCount: 10, unlockedLevels: 3 });
    expect(dream.uiSpec()).toMatchObject({ availableLevels: [1, 2, 3] });
    expect(dream.previewSpec(LEVEL_THREE)).toMatchObject({
      showsMobs: 5,
      showsBossPhases: 0,
      showsBoss: false,
      showsWaveRules: true,
      showsStarRules: true,
    });
  });

  it('uses five plush enemies and exactly eight bodies in every deterministic wave', () => {
    const expectedKeys = ['leafcat', 'penguin', 'graydoll', 'bluefish', 'starpillow'];
    const mobs = dream.mobSpec(LEVEL_THREE);
    expect(mobs.map((mob) => mob.key)).toEqual(expectedKeys);
    expect(mobs.map((mob) => mob.role)).toEqual(['leaf', 'iceToy', 'doll', 'waterToy', 'starToy']);
    expect(new Set(mobs.map((mob) => mob.sprite)).size).toBe(5);
    expect(mobs.every((mob) => mob.hp >= 118000 && mob.size >= 122 && mob.entryKind)).toBe(true);

    const waves = dream.waveSpec(LEVEL_THREE);
    expect(waves).toHaveLength(10);
    expect(waves.map((wave) => wave.name)).toEqual([
      '绒线初醒', '冰帽滑行曲', '提线星晶阵', '好兄弟潮汐', '星枕夜航',
      '藤幕冰环', '玩偶巡游', '漩涡星雨', '午夜提线剧', '玩偶之家终奏',
    ]);
    expect(waves.map((wave) => wave.hpMultiplier)).toEqual([1, 1.12, 1.24, 1.37, 1.51, 1.66, 1.82, 2, 2.2, 2.42]);
    for (let wave = 1; wave <= 10; wave += 1) {
      expect(waves[wave - 1]).toMatchObject({
        count: 8,
        composition: [2, 2, 1, 2, 1],
        batches: [3, 3, 2],
        batchDelays: [0, 4.5, 8.7],
      });
      const roster = dream.waveRosterForTest(wave, { stageId: LEVEL_THREE });
      expect(roster).toHaveLength(8);
      expect(new Set(roster.map((mob) => mob.key))).toEqual(new Set(expectedKeys));
      expect(dream.waveRosterForTest(wave, { stageId: LEVEL_THREE })).toEqual(roster);
    }
    expect(dream.formationSpec(LEVEL_THREE)).toHaveLength(5);
    expect(dream.formationSpec(LEVEL_THREE).every((formation) => formation.batches.flat().length === 8)).toBe(true);
  });

  it('declares fifteen layered projectile skins and sixteen deterministic plush emitters', () => {
    const skins = dream.bulletSkinSpec(LEVEL_THREE);
    const patterns = dream.patternSpec(LEVEL_THREE);
    const emitters = new Set(patterns.flatMap((pattern) => pattern.voices));
    expect(skins).toHaveLength(15);
    expect(new Set(skins.map((skin) => skin.assetKey)).size).toBe(15);
    expect(new Set(skins.map((skin) => skin.glowAssetKey)).size).toBe(15);
    expect(skins.every((skin) => skin.key.startsWith('plush') && skin.assetKey.startsWith('dreamPlush') && skin.glowAssetKey.endsWith('Glow') && skin.preoutlined)).toBe(true);
    expect(patterns).toHaveLength(10);
    expect(emitters.size).toBe(16);
    expect(emitters).toContain('plushToyboxFinale');
    expect(patterns.every((pattern) => pattern.completeGroupOnly && pattern.voices.length === 2 && pattern.maxVoices === 2 && pattern.segments.length === 3)).toBe(true);
    expect(patterns.every((pattern) => pattern.segments.every((segment) => [segment.a, segment.b].filter(Boolean).every((voice) => pattern.voices.includes(voice))))).toBe(true);
    expect(dream.patternDiversitySpec(LEVEL_THREE)).toMatchObject({
      realAssetCount: 30,
      skinCount: 15,
      emitterCount: 16,
      motionFamilyCount: 6,
      runtimeFallbackReporting: true,
    });
    const policies = dream.motionSpec(LEVEL_THREE).policies;
    expect(policies).toEqual(['locked-linear', 'analytic-wave-lane', 'bezier-lane', 'turn-once', 'brake-hold-release', 'orbit-release']);
    for (const policy of policies) {
      const trace = dream.stage3MotionTraceForTest({ policy, seconds: 2.4 });
      expect(trace.points.length).toBeGreaterThan(8);
      if (policy === 'turn-once' || policy === 'brake-hold-release' || policy === 'orbit-release') expect(trace.maxCue).toBeGreaterThan(0.8);
      if (policy === 'turn-once') expect(trace.releaseTransitions).toBe(1);
    }
  });

  it('keeps the 128-slot pool under the 96-bullet cap with identical logic at all qualities', () => {
    expect(dream.patternBudgetSpec(LEVEL_THREE)).toMatchObject({
      enemyCap: 8,
      logicalBulletCap: 96,
      warningCap: 4,
      laserCap: 4,
      poolSize: 128,
      cullsLogicalBulletsByQuality: false,
      decorationScale: [1, 0.6, 0.35, 0.2],
    });
    const qualities = ['high', 'medium', 'low', 'ultra'];
    const assets = new Set();
    const motions = new Set();
    const emitters = new Set();
    for (let wave = 1; wave <= 10; wave += 1) {
      for (const elapsed of [2.4, 6.8, 10.6]) {
        const samples = qualities.map((quality) => dream.bulletSnapshotForTest({ stageId: LEVEL_THREE, wave, elapsed, quality }));
        expect(samples.map((sample) => sample.logicalCount)).toEqual(qualities.map(() => samples[0].logicalCount));
        expect(samples.map((sample) => sample.logicHash)).toEqual(qualities.map(() => samples[0].logicHash));
        expect(samples[0].logicalCount).toBeGreaterThan(0);
        expect(samples[0].logicalCount).toBeLessThanOrEqual(96);
        for (const bullet of samples[0].bullets) {
          expect(bullet.fallback).toBe(false);
          assets.add(bullet.assetKey);
          motions.add(bullet.motion);
          emitters.add(bullet.emitter);
        }
      }
    }
    expect(assets.size).toBe(15);
    expect(motions.size).toBe(16);
    expect(emitters.size).toBe(16);
  });

  it('clears directly after wave ten without constructing or entering a boss state', () => {
    expect(dream.stageCompletionSpec(LEVEL_THREE)).toEqual({ hasBoss: false, clearAfterWave: 10, uploadsLeaderboard: true });
    expect(dream.bossSpec(LEVEL_THREE)).toMatchObject({ key: null, implemented: false, hasBoss: false, clearAfterWave: 10 });
    const start = source.indexOf('function updateDreamMobStage(dt)');
    const end = source.indexOf('function updateMobStage(dt)', start);
    const block = source.slice(start, end);
    expect(start).toBeGreaterThan(0);
    expect(block).toContain("if (config.hasBoss === false || !config.level.boss)");
    expect(block).toContain('completeDreamRun(');
    expect(block.indexOf('completeDreamRun(')).toBeLessThan(block.indexOf('bossKind = config.level.boss'));
  });

  it('builds a level-three result accepted by the versioned leaderboard contract', () => {
    expect(dream.buildLeaderboardPayloadForTest({
      stage_id: LEVEL_THREE,
      player_name: 'PLUSHER',
      character: 'corruptgun',
      wing_loadout: ['nightcoffin'],
      stars: 3,
      hit_count: 0,
      elapsed_ms: 545000,
      avatar_data: '',
    })).toEqual({
      stage_id: LEVEL_THREE,
      clear_version: 'dream-03-v1',
      seed: 7130303,
      player_name: 'PLUSHER',
      character: 'corruptgun',
      wing_loadout: ['nightcoffin'],
      stars: 3,
      hit_count: 0,
      elapsed_ms: 545000,
      avatar_data: '',
    });
    expect(edgeSource).toContain('["dream-03-plush-room", { clearVersion: "dream-03-v1", seed: 7130303 }]');
  });

  it('keeps every plush non-collidable and unable to fire until its entry completes', () => {
    const entries = dream.entrySpec(LEVEL_THREE);
    expect(entries).toHaveLength(5);
    expect(new Set(entries.map((entry) => entry.entryKind))).toEqual(new Set(['vineSwing', 'iceSlide', 'puppetRig', 'arcFly', 'starBounce']));
    expect(entries.every((entry) => entry.duration >= 1 && entry.duration <= 1.18)).toBe(true);
    expect(entries.every((entry) => entry.collidableDuringEntry === false && entry.canFireDuringEntry === false)).toBe(true);

    const spawnStart = source.indexOf('function spawnDreamEnemy(');
    const spawnEnd = source.indexOf('function spawnDreamBatch(', spawnStart);
    const spawnBlock = source.slice(spawnStart, spawnEnd);
    const sourceStart = source.indexOf('function dreamSources(role)');
    const sourceEnd = source.indexOf('function dreamEmitWingFan(', sourceStart);
    const sourceBlock = source.slice(sourceStart, sourceEnd);
    expect(spawnBlock).toContain('r: isPlushRoom ? 0 : def.r');
    expect(spawnBlock).toContain('fireTimer: 99');
    expect(sourceBlock).toContain('!e.dreamEntering');
  });

  it('treats every trail and helper VFX as short-lived, non-damaging presentation', () => {
    expect(dream.bulletMaterialSpec()).toMatchObject({
      transientTrails: true,
      trailDamaging: false,
      trailCollisionRadius: 0,
      permanentTailBakedIntoBody: false,
      prewarm: true,
      batchTrails: true,
      allocationFreeHotPath: true,
    });
    expect(manifest.renderContract).toMatchObject({ trailCollision: false, vfxCollision: false });
  });

  it('ships a complete manifest whose generated files have no green spill or hard edge touch', () => {
    expect(manifest).toMatchObject({
      formatVersion: 2,
      stage: LEVEL_THREE,
      sourceFolderReadOnly: expect.stringContaining('梦境第三关开发'),
      renderContract: expect.objectContaining({ stageLoad: 'lazy on Dream Level 3 only' }),
    });
    expect(Object.keys(manifest.assets)).toHaveLength(87);
    expect(assetReport).toMatchObject({
      sourceCount: 20,
      generatedAssetKeys: 87,
      categories: { bullet: 15, 'bullet-glow': 15, vfx: 10, 'vfx-glow': 10 },
      greenValidation: { assetsWithResidual: [], status: 'pass' },
      edgeValidation: { assetsWithVisibleEdgeTouch: [], status: 'pass' },
      preservation: { unknownFilesDeleted: false },
    });
    for (const [key, asset] of Object.entries(manifest.assets)) {
      expect(existsSync(new URL(`../../${asset.file}`, import.meta.url)), `${key}: ${asset.file}`).toBe(true);
      if (asset.glowFile) expect(existsSync(new URL(`../../${asset.glowFile}`, import.meta.url)), `${key}: ${asset.glowFile}`).toBe(true);
      if (asset.mobileFile) expect(existsSync(new URL(`../../${asset.mobileFile}`, import.meta.url)), `${key}: ${asset.mobileFile}`).toBe(true);
      if (Number.isFinite(asset.keyGreenPixels)) expect(asset.keyGreenPixels, key).toBe(0);
      if (Number.isFinite(asset.edgeTouchPixels)) expect(asset.edgeTouchPixels, key).toBe(0);
    }
  });
});
