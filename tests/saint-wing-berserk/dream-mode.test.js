import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { loadDreamModeInternals } from './setup.js';

describe('dream mode level one: Fallen Radiance Sanctuary', () => {
  const dream = loadDreamModeInternals();
  const source = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const edgeSource = readFileSync(new URL('../../supabase/functions/leaderboard-run/index.ts', import.meta.url), 'utf8');

  it('registers a separate deterministic dream run without changing chapter mode', () => {
    expect(dream.modeSpec()).toMatchObject({
      key: 'dream',
      title: '梦境模式',
      levelCount: 10,
      unlockedLevels: 3,
      locksLoadoutAfterStart: true,
      disablesRandomDrops: true,
      keepsCharacterSkills: true,
      keepsWingmen: true,
      activeWallClock: true,
    });
    expect(dream.levelSpec()).toMatchObject({
      id: 'dream-01-seraph',
      version: 'dream-01-v2',
      name: '堕辉圣域',
      seed: 7130101,
      waveCount: 10,
      mobTargetSeconds: 480,
      bossTargetSeconds: 120,
      bossKey: 'seraph',
    });
    expect(dream.uiSpec()).toMatchObject({
      titleActions: ['chapter', 'dream'],
      lobbyLayout: 'two-rows-five-levels',
      levelNodes: 10,
      availableLevels: [1, 2, 3],
      mobileTabs: ['情报', '敌人弹幕', '排行榜'],
      minimumBodyFont: 18,
      minimumButtonHeight: 52,
      hud: ['wave', 'active-time', 'stars', 'hits', 'damage-multiplier'],
    });
    expect(dream.previewSpec()).toMatchObject({
      usesRuntimePatternSampler: true,
      usesSharedPatternAndMotionCatalog: true,
      showsMobs: 8,
      showsBossPhases: 5,
      showsWaveRules: true,
      showsStarRules: true,
    });
  });

  it('defines eight readable elites with lower individual HP for every wave', () => {
    const mobs = dream.mobSpec();
    expect(mobs).toEqual([
      expect.objectContaining({ key: 'dream_seraph_wing', name: '曦翼星使', sprite: 'drone', hp: 90000, size: 118, r: 29 }),
      expect.objectContaining({ key: 'dream_seraph_choir', name: '辉歌咏者', sprite: 'nun', hp: 122000, size: 126, r: 31 }),
      expect.objectContaining({ key: 'dream_seraph_guard', name: '圣盾执刑者', sprite: 'holyshield', hp: 169000, size: 136, r: 35 }),
      expect.objectContaining({ key: 'dream_seraph_prism', name: '极光棱镜', sprite: 'enBluecryst', hp: 133000, size: 128, r: 32 }),
      expect.objectContaining({ key: 'dream_seraph_reaper', name: '堕辉镰侍', sprite: 'reaper', hp: 151000, size: 134, r: 34 }),
      expect.objectContaining({ key: 'dream_seraph_oracle', name: '虚星谕者', sprite: 'voidchanter', hp: 115000, size: 130, r: 32 }),
      expect.objectContaining({ key: 'dream_seraph_lancer', name: '渊行枪使', sprite: 'abyssrunner', hp: 105000, size: 126, r: 31 }),
      expect.objectContaining({ key: 'dream_seraph_storm', name: '霆辉侍祭', sprite: 'stormacolyte', hp: 118000, size: 124, r: 30 }),
    ]);
    expect(mobs.map((mob) => mob.role)).toEqual(['wing', 'choir', 'guard', 'prism', 'reaper', 'oracle', 'lancer', 'storm']);
  });

  it('builds ten seeded one-of-each elite waves with the documented HP curve', () => {
    const expectedMultipliers = [1, 1.1, 1.2, 1.32, 1.45, 1.58, 1.72, 1.86, 2.02, 2.2];
    const expectedNames = ['六翼试奏', '圣门回廊', '堕辉雨幕', '双环绞杀', '裁决棱镜', '翼门交响', '极光回廊', '圣痕轮舞', '六翼裁决', '堕辉终奏'];
    const waves = dream.waveSpec();
    expect(waves).toHaveLength(10);
    expect(waves.map((wave) => wave.name)).toEqual(expectedNames);
    expect(waves.map((wave) => wave.hpMultiplier)).toEqual(expectedMultipliers);
    for (let index = 0; index < waves.length; index += 1) {
      expect(waves[index]).toMatchObject({ count: 8, composition: [1, 1, 1, 1, 1, 1, 1, 1], batches: [3, 3, 2], batchDelays: [0, 5, 10] });
      const roster = dream.waveRosterForTest(index + 1);
      expect(roster).toHaveLength(8);
      expect(Object.values(roster.reduce((counts, enemy) => {
        counts[enemy.key] = (counts[enemy.key] || 0) + 1;
        return counts;
      }, {})).sort()).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
    }
    expect(dream.formationSpec()).toHaveLength(5);
    expect(dream.formationSpec().every((formation) => formation.batches.flat().length === 8)).toBe(true);
    expect(dream.rewardSpec()).toMatchObject({ powerPerKill: 3.75, powerPerWave: 30, randomPlugins: false, lifeDrops: false, berserkDrops: false });
    expect(dream.waveTransitionSpec()).toMatchObject({ clearDelay: 1.4, timedOverlap: false, bulletDissolve: 0.34, abruptVisibleClear: false });
  });

  it('replays identical positions and order for the published seed', () => {
    const first = dream.waveRosterForTest(7);
    const second = dream.waveRosterForTest(7);
    expect(second).toEqual(first);
    expect(dream.waveRosterForTest(7, dream.levelSpec().seed + 1)).not.toEqual(first);
  });

  it('uses a shared conductor with bounded complete pattern groups', () => {
    const patterns = dream.patternSpec();
    expect(patterns).toHaveLength(10);
    for (const pattern of patterns) {
      expect(pattern).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        completeGroupOnly: true,
        minGap: expect.any(Number),
      });
      expect(Array.isArray(pattern.voices)).toBe(true);
      expect(pattern.voices.length).toBeGreaterThanOrEqual(4);
      expect(pattern.maxVoices).toBeGreaterThanOrEqual(2);
      expect(pattern.maxVoices).toBeLessThanOrEqual(3);
      expect(pattern.minGap).toBeGreaterThanOrEqual(24);
    }
    const uniqueVoices = new Set(patterns.flatMap((pattern) => pattern.voices));
    expect(uniqueVoices.size).toBeGreaterThanOrEqual(24);
    expect(patterns.every((pattern) => pattern.voices.length >= 4)).toBe(true);
    expect(patterns.filter((pattern) => pattern.maxVoices === 3).length).toBeGreaterThanOrEqual(5);
    expect(dream.patternBudgetSpec()).toMatchObject({
      enemyCap: 8,
      logicalBulletCap: 96,
      warningCap: 4,
      laserCap: 4,
      poolSize: 128,
      activeCountStrategy: 'once-per-frame-plus-o1-release',
      primaryReserve: 14,
      secondaryReserve: 6,
      accentThreshold: 84,
      aimedWarningMin: 0.45,
      laserWarningMin: 0.75,
      corridorGapMin: 96,
      cullsLogicalBulletsByQuality: false,
    });
    const pool = dream.poolReuseForTest();
    expect(pool).toMatchObject({ capacity: 128, peakActive: expect.any(Number), overflowed: false, reused: expect.any(Boolean) });
    expect(pool.peakActive).toBeLessThanOrEqual(96);
  });

  it('atomically reserves only the visible gap-ring angles', () => {
    const start = source.indexOf('function dreamEmitGapRing');
    const end = source.indexOf('function dreamEmitCrystalRain', start);
    const block = source.slice(start, end);
    const anglesAt = block.indexOf('const angles = []');
    const reserveAt = block.indexOf('dreamTryAtomicBulletGroup(angles.length');
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    expect(anglesAt).toBeGreaterThan(0);
    expect(reserveAt).toBeGreaterThan(anglesAt);
    expect(block).not.toContain('dreamTryAtomicBulletGroup(count');
    expect(block).toContain('if (delta >= 0.34) angles.push(a)');
  });

  it('routes every dream emitter through the fixed pool and atomic group budget', () => {
    const start = source.indexOf('function dreamEmitWingFan');
    const end = source.indexOf('function updateDreamConductor', start);
    const emitters = source.slice(start, end);
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    expect(emitters.match(/function dreamEmit/g)?.length).toBeGreaterThanOrEqual(28);
    expect(emitters.match(/dreamTryAtomicBulletGroup/g)?.length).toBeGreaterThanOrEqual(28);
    expect(emitters).toContain('addDreamBullet(');
    expect(emitters).not.toContain('addEnemyBullet(');

    const poolStart = source.indexOf('const dreamBulletPool = []');
    const poolEnd = source.indexOf('function addEnemyBullet(', poolStart);
    const pool = source.slice(poolStart, poolEnd);
    expect(pool).toContain('let b = dreamBulletPool.pop()');
    expect(pool).toContain('if (!b) { b = {}; dreamBulletAllocations++; }');
    expect(pool).toContain('dreamBulletPool.push(bullet)');
    expect(pool).toContain('dreamBulletAllocations');
    expect(pool).toContain('let dreamActiveBulletCount = 0');
    expect(pool).toContain('function dreamSyncBulletBudget(force = false)');
    expect(pool).toContain('dreamSyncBulletBudget() >= DREAM_PERF_CONFIG.bulletCap');
    expect(pool).toContain('dreamActiveBulletCount++');
    expect(pool).toContain('_dreamCounted');
    expect(pool).toContain('const usableCap =');
    expect(pool).toContain('live + cost > usableCap');
    expect(pool).toContain('slotReserve');
  });

  it('uses a broad real-asset skin catalogue with no missing source files', () => {
    expect(typeof dream.bulletSkinSpec).toBe('function');
    expect(typeof dream.bulletAssetStatus).toBe('function');
    const skins = dream.bulletSkinSpec();
    const assetKeys = new Set(skins.map((skin) => skin.assetKey));
    const families = new Set(skins.map((skin) => skin.family));
    expect(skins.length).toBeGreaterThanOrEqual(12);
    expect(assetKeys.size).toBeGreaterThanOrEqual(12);
    expect(families.size).toBeGreaterThanOrEqual(8);
    for (const skin of skins) {
      expect(skin).toMatchObject({
        key: expect.any(String),
        assetKey: expect.any(String),
        assetPath: expect.stringMatching(/^assets\/bullets(?:_v\d+|_dream)?\/.+\.(?:png|webp)$/),
        family: expect.any(String),
      });
      expect(existsSync(new URL(`../../${skin.assetPath}`, import.meta.url)), `${skin.key}: ${skin.assetPath}`).toBe(true);
    }
    expect(dream.bulletAssetStatus()).toMatchObject({ expected: assetKeys.size, missing: [], decodeFailed: [], fallbackKeys: [] });
  });

  it('exposes broad asset and motion catalogues with bounded emitters', () => {
    expect(typeof dream.patternDiversitySpec).toBe('function');
    const diversity = dream.patternDiversitySpec();
    expect(diversity.realAssetCount).toBeGreaterThanOrEqual(16);
    expect(diversity.motionFamilies.length).toBeGreaterThanOrEqual(10);
    expect(new Set(diversity.motionFamilies).size).toBe(diversity.motionFamilies.length);
    expect(diversity.emitterKeys.length).toBeGreaterThanOrEqual(32);
    expect(new Set(diversity.emitterKeys).size).toBe(diversity.emitterKeys.length);
    expect(diversity.runtimeFallbackReporting).toBe(true);
  });

  it('prebakes eight volumetric material phases and batches visual-only trails without hot-path allocations', () => {
    expect(typeof dream.bulletMaterialSpec).toBe('function');
    expect(typeof dream.bulletMaterialStatus).toBe('function');
    expect(dream.bulletMaterialSpec()).toMatchObject({
      version: 'V49-volumetric-energy',
      phaseCount: 8,
      prewarm: true,
      batchTrails: true,
      allocationFreeHotPath: true,
      trailLengthScale: expect.anything(),
      trailDamaging: false,
      trailCollisionRadius: 0,
      transientTrails: true,
      permanentTailBakedIntoBody: false,
      selectiveEnergyMask: true,
      screenSpaceLighting: true,
      stableNonDirectionalSilhouette: true,
      cachePolicy: 'active-stage-only',
      selectiveEnergyAtlas: true,
      enhancedStage: 'dream-03-plush-room',
      bakedTailRemovedSkins: ['plushIceSpear', 'plushMeteorStar'],
    });
    const materialStatus = dream.bulletMaterialStatus();
    expect(typeof materialStatus.cacheEntries).toBe('number');
    expect(typeof materialStatus.expectedEntries).toBe('number');
    expect(typeof materialStatus.warmed).toBe('boolean');
    expect(Array.isArray(materialStatus.materialAssets)).toBe(true);
    expect(Array.from(materialStatus.fallbacks)).toEqual([]);

    const manifest = JSON.parse(readFileSync(new URL('../../assets/bullets_dream/dream_bullet_manifest.json', import.meta.url), 'utf8'));
    expect(manifest.helper_count).toBeGreaterThanOrEqual(4);
    expect(manifest.helpers).toHaveLength(manifest.helper_count);
    for (const helper of manifest.helpers) {
      expect(helper).toMatchObject({
        key: expect.any(String),
        output: expect.stringMatching(/^assets\/bullets_dream\/.+\.png$/),
        runtime_intent: expect.any(String),
      });
      expect(helper.phase_count).toBe(helper.key === 'shared_impact_glint_atlas' ? 6 : 4);
      expect(existsSync(new URL(`../../${helper.output}`, import.meta.url)), `${helper.key}: ${helper.output}`).toBe(true);
    }

    const prewarmStart = source.indexOf('function warmDreamBulletMaterialCache');
    const batchStart = source.indexOf('function drawDreamBulletsBatch');
    const batchEnd = source.indexOf('function drawEnemyBullets', batchStart);
    const draw = source.slice(batchStart, batchEnd);
    expect(prewarmStart).toBeGreaterThan(0);
    expect(batchStart).toBeGreaterThan(0);
    expect(batchEnd).toBeGreaterThan(batchStart);
    expect(draw).toContain('ctx.drawImage');
    expect(draw).toContain('ctx.setTransform');
    expect(draw).not.toContain('createRadialGradient');
    expect(draw).not.toContain('createLinearGradient');
    expect(draw).not.toContain('new Image');
    expect(draw).not.toContain('ctx.filter');
    expect(draw).not.toContain('ctx.shadowBlur');
    expect(draw).not.toContain('ctx.save()');
    expect(draw).not.toContain('ctx.restore()');
    const cacheStart = source.indexOf('function getDreamBulletSkinSprite');
    const cacheEnd = source.indexOf('function warmDreamBulletMaterialCache', cacheStart);
    expect(source.slice(cacheStart, cacheEnd)).not.toContain('trailAtlas');
  });

  it('keeps straight bullets monotonic and bounds every curved path around its spawn heading', () => {
    const motion = dream.motionSpec();
    expect(motion).toMatchObject({
      visibleLifeFloor: 8.5,
      hardLife: 11,
      dissolveDuration: 0.34,
      cumulativeGlobalTimeTurning: false,
      visibleDepthCull: false,
      transitionsTelegraphed: true,
    });
    const straight = dream.motionTraceForTest({ vx: 0, vy: 220, seconds: 6 });
    expect(straight.monotonicDown).toBe(true);
    expect(new Set(straight.points.map((point) => point.x))).toEqual(new Set([360]));
    const curve = dream.motionTraceForTest({ vx: 26, vy: 220, curve: 0.18, phase: 1, seconds: 6 });
    expect(curve.monotonicDown).toBe(true);
    expect(curve.maxHeadingDeviation).toBeLessThanOrEqual(0.180001);
    const brakeAngle = 1.13;
    const brakeSpeed = 242;
    const brake = dream.motionTraceForTest({
      vx: Math.cos(brakeAngle) * brakeSpeed,
      vy: Math.sin(brakeAngle) * brakeSpeed,
      ax: -Math.cos(brakeAngle) * brakeSpeed * 0.82,
      ay: -Math.sin(brakeAngle) * brakeSpeed * 0.82,
      brake: true,
      seconds: 4,
    });
    expect(brake.brakeTriggered).toBe(true);
    expect(brake.reversed).toBe(false);
    expect(brake.maxHeadingDeviation).toBeLessThanOrEqual(0.000001);
    const updateStart = source.indexOf('function updateEnemyBullets');
    const updateEnd = source.indexOf('function updateWarnings', updateStart);
    const update = source.slice(updateStart, updateEnd);
    expect(update).not.toContain('Math.sin(time * 2.2');
    expect(update).not.toContain('else { b.life = 0; }');
    expect(update).toContain('DREAM_BULLET_MOTION_CONFIG.offscreenMargin');
    expect(update).toContain("beginDreamBulletDissolve(b, DREAM_BULLET_MOTION_CONFIG.dissolveDuration, 'hard-life')");
    const boomerangStart = source.indexOf('function dreamEmitBoomerangFeathers');
    const boomerangEnd = source.indexOf('function dreamEmitChaseFork', boomerangStart);
    const boomerang = source.slice(boomerangStart, boomerangEnd);
    expect(boomerang).toContain('ax: -Math.cos(a) * speed * 0.82, ay: -Math.sin(a) * speed * 0.82');
    expect(boomerang).not.toContain('+ 52');
  });

  it('dissolves visible cleanup bullets and snapshots hit material before pool release', () => {
    const dissolveStart = source.indexOf('function beginDreamBulletDissolve');
    const dissolveEnd = source.indexOf('function addDreamBullet', dissolveStart);
    const dissolve = source.slice(dissolveStart, dissolveEnd);
    expect(dissolveStart).toBeGreaterThan(0);
    expect(dissolve).toContain('bullet.damage = 0');
    expect(dissolve).toContain('bullet.dreamTrailT = 0');
    expect(dissolve).toContain('bullet.dreamDissolving = true');
    expect(source).toContain("if (dreamRun.waveTransition <= 0) dissolveDreamBullets('wave-clear')");

    const updateStart = source.indexOf('function updateEnemyBullets');
    const updateEnd = source.indexOf('function updateWarnings', updateStart);
    const collision = source.slice(updateStart, updateEnd);
    const snapshotAt = collision.indexOf('const hitBullet = b.dream ? { dreamMaterialTheme: b.dreamMaterialTheme } : b');
    const releaseAt = collision.indexOf('removeUnordered(enemyBullets, i)', snapshotAt);
    const damageAt = collision.indexOf('damagePlayer(hitDamage, hitBullet)', releaseAt);
    expect(snapshotAt).toBeGreaterThan(0);
    expect(releaseAt).toBeGreaterThan(snapshotAt);
    expect(damageAt).toBeGreaterThan(releaseAt);
  });

  it('keeps every wave logical barrage identical in all four quality modes', () => {
    const qualities = ['high', 'medium', 'low', 'ultra'];
    const visualCombos = new Set();
    const globalAssets = new Set();
    const globalMotions = new Set();
    const globalEmitters = new Set();
    const shapes = new Set();
    const styles = new Set();
    for (let wave = 1; wave <= 10; wave += 1) {
      const waveAssets = new Set();
      const waveMotions = new Set();
      const waveEmitters = new Set();
      for (const elapsed of [2.4, 8.5, 13.7]) {
        const samples = qualities.map((quality) => dream.bulletSnapshotForTest({ wave, elapsed, quality }));
        expect(samples.map((sample) => sample.logicalCount)).toEqual(qualities.map(() => samples[0].logicalCount));
        expect(samples.map((sample) => sample.logicHash)).toEqual(qualities.map(() => samples[0].logicHash));
        expect(samples[0].logicalCount).toBeGreaterThan(0);
        expect(samples[0].logicalCount).toBeLessThanOrEqual(96);
        for (const bullet of samples[0].bullets) {
          visualCombos.add(`${bullet.style}:${bullet.shape}`);
          shapes.add(bullet.shape);
          styles.add(bullet.style);
          expect(bullet.assetKey).toEqual(expect.any(String));
          expect(bullet.skin).toEqual(expect.any(String));
          expect(bullet.motion).toEqual(expect.any(String));
          expect(bullet.emitter).toEqual(expect.any(String));
          waveAssets.add(bullet.assetKey);
          waveMotions.add(bullet.motion);
          waveEmitters.add(bullet.emitter);
          globalAssets.add(bullet.assetKey);
          globalMotions.add(bullet.motion);
          globalEmitters.add(bullet.emitter);
        }
      }
      expect(waveAssets.size, `wave ${wave} real bullet assets`).toBeGreaterThanOrEqual(4);
      expect(waveMotions.size, `wave ${wave} motion families`).toBeGreaterThanOrEqual(3);
      expect(waveEmitters.size, `wave ${wave} emitter voices`).toBeGreaterThanOrEqual(4);
    }
    expect([...shapes].sort()).toEqual(['crescent', 'diamond', 'needle', 'orb', 'shard', 'star']);
    expect([...styles].sort()).toEqual(['aimed', 'deco', 'hazard', 'spread']);
    expect(visualCombos.size).toBeGreaterThanOrEqual(14);
    expect(globalAssets.size).toBeGreaterThanOrEqual(12);
    expect(globalMotions.size).toBeGreaterThanOrEqual(10);
    expect(globalEmitters.size).toBeGreaterThanOrEqual(24);
    expect(dream.patternBudgetSpec().decorationScale).toEqual([1, 0.6, 0.35, 0.2]);
  });

  it('awards three stars, applies strong damage decay, and fails on the fourth hit', () => {
    expect([0, 1, 2, 3, 4].map((hits) => dream.hitResultForTest(hits))).toEqual([
      { hits: 0, stars: 3, damageMultiplier: 1, failed: false },
      { hits: 1, stars: 2, damageMultiplier: 0.8, failed: false },
      { hits: 2, stars: 1, damageMultiplier: 0.6, failed: false },
      { hits: 3, stars: 0, damageMultiplier: 0.4, failed: false },
      { hits: 4, stars: 0, damageMultiplier: 0.4, failed: true },
    ]);
    expect(dream.hitFeedbackSpec()).toMatchObject({
      invulnerability: 1,
      localClearRadius: 140,
      shake: 12,
      hitStop: 0.055,
      vignetteSeconds: 0.72,
      vignetteAlpha: 0.52,
      flash: 0.17,
      clearsWholeScreen: false,
      usesNormalHpDamage: false,
      fullScreenWhiteFlash: false,
      playerBlink: true,
      sound: true,
    });
  });

  it('enforces a roughly ten-minute floor for the two highest-output fighters', () => {
    const balance = dream.balanceSpec();
    expect(balance).toMatchObject({
      targetTotalSeconds: 600,
      mobTargetSeconds: 480,
      bossTargetSeconds: 120,
      mobDamageFloorSeconds: 36,
      mobInitialCreditRatio: 0.05,
      bossHp: 300000,
      bossDpsCap: 2500,
      bossCreditCap: 15000,
      bossTargetRange: [105, 135],
      mobHpRange: [90000, 169000],
      enemyDamageBudget: true,
      targetCharacters: ['skyward', 'corruptgun'],
    });
    const skywardSeconds = dream.clearEstimateForTest('skyward');
    const corruptGunSeconds = dream.clearEstimateForTest('corruptgun');
    expect(skywardSeconds).toBeGreaterThanOrEqual(570);
    expect(skywardSeconds).toBeLessThanOrEqual(630);
    expect(corruptGunSeconds).toBeGreaterThanOrEqual(570);
    expect(corruptGunSeconds).toBeLessThanOrEqual(630);
    expect(Math.abs(corruptGunSeconds - skywardSeconds)).toBeLessThanOrEqual(10);

    const spawnStart = source.indexOf('function spawnDreamEnemy');
    const spawnEnd = source.indexOf('function spawnDreamBatch', spawnStart);
    const spawnBlock = source.slice(spawnStart, spawnEnd);
    expect(spawnBlock).toContain('initDreamDamageBudget(');
    expect(spawnBlock).toContain('config.balance.mobDamageFloorSeconds');
    expect(spawnBlock).toContain('config.balance.mobInitialCreditRatio');
  });

  it('applies the dream multiplier to every player-owned damage source', () => {
    const sources = ['main', 'skill', 'ultimate', 'dot', 'clone', 'plugin', 'wingman'];
    for (const source of sources) {
      expect(dream.damageForTest(1000, source, 3)).toBe(400);
    }
    expect(dream.damageSourceSpec().sort()).toEqual([...sources].sort());
  });

  it('defines the separate five-phase 96k seraph encounter', () => {
    const boss = dream.bossSpec();
    expect(boss).toMatchObject({
      key: 'seraph',
      name: expect.stringContaining('炽天使'),
      hp: 300000,
      creditCap: 15000,
      creditRechargePerSecond: 2500,
      targetSeconds: [105, 135],
      phaseThresholds: [0.82, 0.6, 0.4, 0.18],
      patternNames: ['六翼缺口扇', '正反极光回廊', '脉冲环阵', '旋转裁决光矛', '双缝终焉'],
      pooledVoices: true,
      logicalBulletCap: 96,
      aimedWarningMin: 0.45,
      completeGroupOnly: true,
    });
    expect(boss.phaseVoices).toHaveLength(5);
    expect(boss.phaseVoices.every((voices) => voices.length >= 3)).toBe(true);
    expect(boss.reusesNormalBossDefinition).toBe(false);
  });

  it('tracks only active wall-clock time across pause and hidden intervals', () => {
    expect(dream.activeClockForTest([
      { dt: 10, active: true },
      { dt: 20, active: false },
      { dt: 5.25, active: true },
    ])).toBe(15.25);
  });

  it('ranks stars first and then clear time for each level version', () => {
    const rows = [
      { player_name: 'B', stars: 2, elapsed_ms: 200000, created_at: '2026-01-01T00:00:02Z' },
      { player_name: 'C', stars: 3, elapsed_ms: 260000, created_at: '2026-01-01T00:00:03Z' },
      { player_name: 'A', stars: 3, elapsed_ms: 260000, created_at: '2026-01-01T00:00:01Z' },
      { player_name: 'D', stars: 3, elapsed_ms: 240000, created_at: '2026-01-01T00:00:04Z' },
    ];
    expect(dream.rankRowsForTest(rows).map((row) => row.player_name)).toEqual(['D', 'A', 'C', 'B']);
    expect(dream.leaderboardSpec()).toMatchObject({
      separateTable: true,
      directRestFallback: false,
      order: ['stars-desc', 'elapsed-ms-asc', 'created-at-asc'],
      filters: ['overall', 'character'],
      failedRunsUpload: false,
      oneTimeToken: true,
      bestRecordKey: ['player-name', 'level-id', 'level-version', 'character'],
    });
  });

  it('builds a versioned dream result without overloading the normal score payload', () => {
    expect(dream.buildLeaderboardPayloadForTest({
      player_name: 'DREAMER',
      character: 'corruptgun',
      wing_loadout: ['nightcoffin'],
      stars: 2,
      hit_count: 1,
      elapsed_ms: 391234,
      avatar_data: '',
    })).toEqual({
      stage_id: 'dream-01-seraph',
      clear_version: dream.levelSpec().version,
      seed: dream.levelSpec().seed,
      player_name: 'DREAMER',
      character: 'corruptgun',
      wing_loadout: ['nightcoffin'],
      stars: 2,
      hit_count: 1,
      elapsed_ms: 391234,
      avatar_data: '',
    });
  });

  it('has a real mobile lobby branch with touch-safe tabs and rank filters', () => {
    const lobbyStart = source.indexOf('function drawDreamModeLobby');
    const lobbyEnd = source.indexOf('function drawDreamResult', lobbyStart);
    const lobby = source.slice(lobbyStart, lobbyEnd);
    const leaderboardStart = source.indexOf('function drawDreamLeaderboardPanel');
    const leaderboardEnd = source.indexOf('function drawDreamModeLobby', leaderboardStart);
    const leaderboard = source.slice(leaderboardStart, leaderboardEnd);
    const tabHeight = Number(lobby.match(/tabH\s*=\s*DREAM_LOBBY_PORTRAIT\s*\?\s*(\d+)\s*:/)?.[1]);
    const filterHeight = Number(leaderboard.match(/if\s*\(DREAM_LOBBY_PORTRAIT\)\s*\{[\s\S]*?dreamUiButton\([^;]*?139,\s*(\d+),\s*labels\[i\],\s*'filter'/)?.[1]);
    expect(lobbyStart).toBeGreaterThan(0);
    expect(lobby).toContain('DREAM_LOBBY_PORTRAIT');
    expect(lobby).toContain("'关卡情报', 'tab'");
    expect(lobby).toContain("'敌人弹幕', 'tab'");
    expect(lobby).toContain("'本关排行', 'tab'");
    expect(tabHeight).toBeGreaterThanOrEqual(52);
    expect(leaderboard).toContain('if (DREAM_LOBBY_PORTRAIT)');
    expect(filterHeight).toBeGreaterThanOrEqual(52);
    expect(dream.uiSpec().minimumButtonHeight).toBeGreaterThanOrEqual(52);
  });

  it('routes critical direct damage through the dream multiplier', () => {
    const grindStart = source.indexOf('function grindDmg()');
    const grindEnd = source.indexOf('function extraWavesForStage', grindStart);
    const hitBossStart = source.indexOf('function hitBoss(');
    const hitBossEnd = source.indexOf('function defeatBoss', hitBossStart);
    const shotStart = source.indexOf('function updatePlayerShots(');
    const shotEnd = source.indexOf('function updateEnemyBullets(', shotStart);
    const beamStart = source.indexOf('function useBeam(');
    const beamEnd = source.indexOf('function useBomb(', beamStart);
    const bombStart = beamEnd;
    const bombEnd = source.indexOf('function hitBoss(', bombStart);
    const grind = source.slice(grindStart, grindEnd);
    const hitBoss = source.slice(hitBossStart, hitBossEnd);
    const shots = source.slice(shotStart, shotEnd);
    const beam = source.slice(beamStart, beamEnd);
    const bombs = source.slice(bombStart, bombEnd);

    expect(grind).toContain('growthCurveAt().grindDmg * dreamDamageMultiplier()');
    expect(hitBoss).toContain('amount = amount * grindDmg()');
    expect(shots).toContain('const appliedShotDamage = actualShotDamage * grindDmg()');
    expect(beam).toContain('e.hp -= 160 * dreamDamageMultiplier()');
    expect(bombs).toContain('e.hp -= 900 * dreamDamageMultiplier()');
    expect(bombs).toContain('e.hp -= 1400 * dreamDamageMultiplier()');
    expect(bombs).toContain('e.hp -= 450 * dreamDamageMultiplier()');
    expect(source).toContain('function scBaseDmg() { return (22 + powerLevel() * 10) * grindDmg(); }');
    expect(source).toContain('function qswBaseDmg() { return (30 + powerLevel() * 12) * grindDmg(); }');
    expect(source).toContain("if (dreamActive()) hitBoss(dmgps * 0.8 * dt, boss.x, boss.y, false)");
    expect(source).toContain("if (dreamActive()) hitBoss(Lz.dmgps * dt, boss.x, boss.y, false)");
  });

  it('uses isolated one-time-token backend routes and a read-only public score table', () => {
    const sql = readFileSync(new URL('../../leaderboard-security/09_dream_leaderboard.sql', import.meta.url), 'utf8');
    expect(edgeSource).toContain('const DREAM_ACTIVE_CLEAR_VERSION = "dream-01-v2"');
    expect(edgeSource).toContain('"dream-01-seraph", { clearVersion: DREAM_ACTIVE_CLEAR_VERSION, seed: 7130101 }');
    expect(edgeSource).toContain('action === "dream-start"');
    expect(edgeSource).toContain('action === "dream-submit"');
    expect(edgeSource).toContain('stars !== 3 - hitCount');
    expect(edgeSource).toContain('submitted_at');
    expect(sql).toContain('create table if not exists public.dream_leaderboard_runs');
    expect(sql).toContain('create table if not exists public.dream_leaderboard');
    expect(sql).toContain('create or replace view public.dream_leaderboard_best');
    expect(sql).toContain('revoke insert, update, delete on public.dream_leaderboard from anon, authenticated');
  });

  it('rejects dream elapsed time that exceeds the server token age', () => {
    const selectAt = edgeSource.indexOf('.select("run_id, token_hash, started_at, expires_at, submitted_at');
    const ageAt = edgeSource.indexOf('const serverRunAgeMs = Math.max(0, Date.now() - new Date(run.started_at).getTime())');
    const rejectAt = edgeSource.indexOf('elapsedMs > serverRunAgeMs + 15000');
    expect(selectAt).toBeGreaterThan(0);
    expect(ageAt).toBeGreaterThan(selectAt);
    expect(rejectAt).toBeGreaterThan(ageAt);
    expect(edgeSource.slice(rejectAt, rejectAt + 140)).toContain('elapsed exceeds token age');
  });
});
