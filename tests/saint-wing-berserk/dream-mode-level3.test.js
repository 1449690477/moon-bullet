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

  it('registers the unlocked room stage with its five-phase shark boss', () => {
    expect(dream.levelsSpec()).toContainEqual(expect.objectContaining({
      id: LEVEL_THREE,
      version: 'dream-03-v2',
      seed: 7130303,
      name: '绒梦玩偶屋',
      waveCount: 10,
      mobTargetSeconds: 480,
      bossTargetSeconds: 120,
      bossKey: 'dreamshark',
      hasBoss: true,
      roomScene: true,
      unlocked: true,
    }));
    expect(dream.modeSpec()).toMatchObject({ levelCount: 10, unlockedLevels: 3 });
    expect(dream.uiSpec()).toMatchObject({ availableLevels: [1, 2, 3] });
    expect(dream.previewSpec(LEVEL_THREE)).toMatchObject({
      showsMobs: 5,
      showsBossPhases: 5,
      showsBoss: true,
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
    expect(mobs.every((mob) => mob.hp >= 68000 && mob.size >= 122 && mob.entryKind)).toBe(true);

    const waves = dream.waveSpec(LEVEL_THREE);
    expect(waves).toHaveLength(10);
    expect(waves.map((wave) => wave.name)).toEqual([
      '绒线初醒', '冰帽滑行曲', '提线星晶阵', '好兄弟潮汐', '星枕夜航',
      '藤幕冰环', '玩偶巡游', '漩涡星雨', '午夜提线剧', '玩偶之家终奏',
    ]);
    expect(waves.map((wave) => wave.hpMultiplier)).toEqual([1, 1.07, 1.14, 1.22, 1.3, 1.39, 1.48, 1.58, 1.69, 1.82]);
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

  it('applies the V2 difficulty relief to durability, cadence, speed, and safe lanes', () => {
    expect(dream.balanceSpec(LEVEL_THREE)).toMatchObject({
      targetTotalSeconds: 600,
      bossHp: 270000,
      bossCreditCap: 18000,
      outgoingDamageMultiplier: 1.36,
      conductorCadence: 1.18,
      stageSpeed: 0.96,
      bossCadenceMultiplier: 1.1,
      bossSpeedMultiplier: 0.92,
      mobHpRange: [68000, 96000],
    });
    expect(dream.motionSpec(LEVEL_THREE)).toMatchObject({ releaseStart: 10.25, wallGapRadius: 104, cueSeconds: 0.4 });
  });

  it('declares twenty-one layered projectile skins including six shark-only families', () => {
    const skins = dream.bulletSkinSpec(LEVEL_THREE);
    const patterns = dream.patternSpec(LEVEL_THREE);
    const emitters = new Set(patterns.flatMap((pattern) => pattern.voices));
    expect(skins).toHaveLength(21);
    expect(new Set(skins.map((skin) => skin.assetKey)).size).toBe(21);
    expect(new Set(skins.map((skin) => skin.glowAssetKey)).size).toBe(21);
    expect(skins.every((skin) => (skin.key.startsWith('plush') || skin.key.startsWith('shark')) && skin.assetKey.startsWith('dreamPlush') && skin.glowAssetKey.endsWith('Glow') && skin.preoutlined)).toBe(true);
    expect(skins.every((skin) => skin.materialProfile?.material && skin.materialProfile?.relief && skin.materialProfile?.motionRole)).toBe(true);
    expect(new Set(skins.map((skin) => skin.materialProfile.material)).size).toBe(21);
    expect(new Set(skins.map((skin) => skin.materialProfile.relief)).size).toBeGreaterThanOrEqual(17);
    expect(skins.filter((skin) => skin.key.startsWith('shark')).map((skin) => skin.key)).toEqual([
      'sharkIceSpear', 'sharkIceShard', 'sharkSnowball', 'sharkBubble', 'sharkWaveCrescent', 'sharkVoidOrb',
    ]);
    expect(Object.fromEntries(skins.filter((skin) => skin.key.startsWith('shark')).map((skin) => [skin.key, skin.sourceAxis]))).toMatchObject({
      sharkIceSpear: 'up',
      sharkIceShard: 'left',
      sharkWaveCrescent: 'left',
    });
    expect(patterns).toHaveLength(10);
    expect(emitters.size).toBe(16);
    expect(emitters).toContain('plushToyboxFinale');
    expect(patterns.every((pattern) => pattern.completeGroupOnly && pattern.voices.length === 2 && pattern.maxVoices === 2 && pattern.segments.length === 3)).toBe(true);
    expect(patterns.every((pattern) => pattern.segments.every((segment) => [segment.a, segment.b].filter(Boolean).every((voice) => pattern.voices.includes(voice))))).toBe(true);
    expect(dream.patternDiversitySpec(LEVEL_THREE)).toMatchObject({
      realAssetCount: 42,
      skinCount: 21,
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

  it('enters the shark boss after wave ten and uses the easier leaderboard v2 contract', () => {
    expect(dream.stageCompletionSpec(LEVEL_THREE)).toEqual({ hasBoss: true, clearAfterWave: null, uploadsLeaderboard: true });
    expect(dream.bossSpec(LEVEL_THREE)).toMatchObject({
      key: 'dreamshark', name: '霜潮绒鲨 · 阿布', hp: 270000,
      targetDurationSeconds: 120, targetSeconds: [105, 130],
      phaseThresholds: [0.8, 0.6, 0.4, 0.2], logicalBulletCap: 96,
      distinctDreamHandler: true, normalBossPoolExcluded: true,
    });
    const start = source.indexOf('function updateDreamMobStage(dt)');
    const end = source.indexOf('function updateMobStage(dt)', start);
    const block = source.slice(start, end);
    expect(start).toBeGreaterThan(0);
    expect(block).toContain("if (config.hasBoss === false || !config.level.boss)");
    expect(block).toContain('bossKind = config.level.boss');
    expect(block).toContain("state = 'bossIntro'");
  });

  it('uses five two-voice shark patterns, layered forms, telegraphs, and non-abrupt cleanup', () => {
    const bossSpec = dream.bossSpec(LEVEL_THREE);
    expect(bossSpec.patternNames).toEqual(['软潮试探', '冰牙列阵', '霜涡巡游', '怒潮冲锋', '终幕·冰渊吞星']);
    expect(bossSpec.phaseVoices).toHaveLength(5);
    expect(bossSpec.phaseVoices.every((voices) => voices.length === 2 && new Set(voices).size === 2)).toBe(true);
    expect(new Set(bossSpec.phaseVoices.flat()).size).toBe(10);
    expect(bossSpec).toMatchObject({
      maxMajorVoices: 2, pooledVoices: true, completeGroupOnly: true,
      patternsUseAddDreamBullet: true, usesDedicatedSkins: true, abruptVisibleClear: false,
      transitions: { introSeconds: 0.82, phaseSeconds: 0.62, crossDissolve: true, squash: true },
    });
    const start = source.indexOf('function dreamSharkBubbleTide(');
    const end = source.indexOf('function updateBoss(dt)', start);
    const block = source.slice(start, end);
    expect(start).toBeGreaterThan(0);
    expect(block.match(/addDreamBullet\(/g)?.length).toBeGreaterThanOrEqual(10);
    expect(block).toContain("policy: 'brake-hold-release'");
    expect(block).toContain("policy: 'orbit-release'");
    expect(block).toContain("policy: 'turn-once'");
    expect(block).toContain('dreamSharkEmitPhaseSample');
    expect(source).toContain("dissolveDreamBullets('boss-defeat')");
  });

  it('binds the dedicated shark HP UI directly to hp/maxHp with eased damage lag', () => {
    const full = dream.sharkBossUiSpec({ hp: 270000, maxHp: 270000, lagRate: 1, phase: 0 });
    const damaged = dream.sharkBossUiSpec({ hp: 81000, maxHp: 270000, lagRate: 0.46, phase: 3, viewport: { width: 390 } });
    const critical = dream.sharkBossUiSpec({ hp: 27000, maxHp: 270000, lagRate: 0.18, phase: 4 });
    expect(full).toMatchObject({ linkedToBossHp: true, hpRate: 1, fillRate: 1, damageLagRate: 1, percent: '100%', phasePips: [true, false, false, false, false] });
    expect(damaged.hpRate).toBeCloseTo(0.3, 6);
    expect(damaged.fillRate).toBeCloseTo(damaged.hpRate, 8);
    expect(damaged.damageLagRate).toBeCloseTo(0.46, 8);
    expect(damaged.numericHp).toBe('81,000/270,000');
    expect(damaged.phasePips).toEqual([true, true, true, true, false]);
    expect(damaged.layout.frame.x).toBeGreaterThanOrEqual(0);
    expect(damaged.layout.frame.x + damaged.layout.frame.w).toBeLessThanOrEqual(390);
    expect(critical).toMatchObject({ critical: true, percent: '10%', phasePips: [true, true, true, true, true] });
    expect(dream.bossSpec(LEVEL_THREE).ui).toMatchObject({ immediateFill: true, easedDamageLag: true, numericHp: true, percent: true, phasePips: 5, mobileSafe: true });
  });

  it('exposes deterministic shark capture scenes and the exact 44-key runtime asset contract', () => {
    const capture = dream.stage3SharkCaptureSpec();
    const assets = dream.stage3SharkAssetSpec();
    expect(capture).toMatchObject({
      scenes: { entry: 'shark-entry', phase: 'boss', hp: 'shark-hp', hit: 'shark-hit', transition: 'shark-transition', death: 'shark-death', performance: 'shark-performance' },
      phaseCount: 5, frameBudgetMs: 16.7,
    });
    expect(assets.assetKeys).toHaveLength(44);
    expect(assets).toMatchObject({ layeredBoss: true, layeredBullets: true, layeredVfx: true, uiLayers: 6 });
    expect(assets.boss).toHaveLength(14);
    expect(assets.bullets).toHaveLength(12);
    expect(assets.vfx).toHaveLength(12);
    expect(assets.ui).toHaveLength(6);
    expect(Object.values(assets.paths).every((path) => path.startsWith('assets/dream_stage3/'))).toBe(true);
    expect(dream.stage3SharkAssetStatus().missing).toEqual([]);
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
      clear_version: 'dream-03-v2',
      seed: 7130303,
      player_name: 'PLUSHER',
      character: 'corruptgun',
      wing_loadout: ['nightcoffin'],
      stars: 3,
      hit_count: 0,
      elapsed_ms: 545000,
      avatar_data: '',
    });
    expect(edgeSource).toContain('["dream-03-plush-room", { clearVersion: "dream-03-v2", seed: 7130303 }]');
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
      bakedTailRemovedSkins: ['plushIceSpear', 'plushMeteorStar'],
      prewarm: true,
      batchTrails: true,
      allocationFreeHotPath: true,
      cachePolicy: 'active-stage-only',
      selectiveEnergyAtlas: true,
      screenSpaceLighting: false,
      screenSpaceVolumeSubpaths: 'removed-stage3-generic-ellipses',
      stage3FamilyLightKeys: ['leaf', 'iceToy', 'doll', 'waterToy', 'starToy'],
      profileCount: 21,
      perSkinMaterialRelief: true,
      genericStage3Ellipse: false,
      genericWhiteCore: false,
      energyClippedToSilhouette: true,
    });
    const material = dream.bulletMaterialSpec();
    expect(material.reliefTypes.length).toBeGreaterThanOrEqual(17);
    expect(material.trailStyles).toEqual(expect.arrayContaining(['none', 'leaf-slice', 'frost-lance', 'bubble-chain', 'droplet-echo', 'comet-flame', 'foam-spray']));
    expect(material.motionRoles).toHaveLength(21);
    const materialStart = source.indexOf('function getDreamBulletSkinSprite(');
    const materialEnd = source.indexOf('function warmDreamBulletMaterialCache(', materialStart);
    const materialBlock = source.slice(materialStart, materialEnd);
    expect(materialBlock).toContain("ef.globalCompositeOperation = 'destination-in'");
    expect(materialBlock).toContain('ef.drawImage(energyMask, 0, 0)');
    expect(manifest.renderContract).toMatchObject({ trailCollision: false, vfxCollision: false });
  });

  it('ships a complete manifest whose generated files have no green spill or hard edge touch', () => {
    expect(manifest).toMatchObject({
      formatVersion: 2,
      stage: LEVEL_THREE,
      sourceFolderReadOnly: expect.stringContaining('梦境第三关开发'),
      renderContract: expect.objectContaining({ stageLoad: 'lazy on Dream Level 3 only' }),
    });
    expect(Object.keys(manifest.assets)).toHaveLength(131);
    expect(assetReport).toMatchObject({
      sourceCount: 29,
      generatedAssetKeys: 131,
      categories: { boss: 7, 'boss-glow': 7, bullet: 21, 'bullet-glow': 21, vfx: 16, 'vfx-glow': 16, 'boss-ui': 6 },
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
