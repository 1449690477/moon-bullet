import { describe, expect, it } from 'vitest';
import { loadRandomBalanceInternals } from './setup.js';

describe('random map, boss, roguelike balance, and clarity spec', () => {
  const balance = loadRandomBalanceInternals();

  it('randomizes maps first, then binds content by normal or tech theme', () => {
    const spec = balance.backgroundPoolSpec();
    expect(spec.mode).toBe('equal-random-map-then-theme-bound-content');
    expect(spec.pool).toEqual(expect.arrayContaining([
      'bgStage1',
      'bgEclipse',
      'suiyiMapVirtualCore',
      'suiyiMapControlHall',
      'suiyiMapDigitalRuins',
      'suiyiMapCrystalSanctum',
      'miguaMapGreenhouse',
      'miguaMapJuiceFactory',
      'miguaMapFloatingCity',
    ]));
    expect(spec.pool).toHaveLength(spec.fieldBackgrounds.length + spec.suiyiMaps.length + spec.miguaMaps.length);
    expect(spec.selectForTest(0, ['a', 'b', 'c'])).toBe('a');
    expect(spec.selectForTest(0.34, ['a', 'b', 'c'])).toBe('b');
    expect(spec.selectForTest(0.99, ['a', 'b', 'c'])).toBe('c');
    expect(spec.themeForMapForTest('bgStage1')).toBe('normal');
    expect(spec.themeForMapForTest('suiyiMapVirtualCore')).toBe('suiyiTech');
    expect(spec.themeForMapForTest('miguaMapGreenhouse')).toBe('migua');
    expect(spec.techThemeOnlySpawnsTechMobsAndSuiyi).toBe(true);
    expect(spec.miguaThemeOnlySpawnsMiguaMobsAndMiguaBoss).toBe(true);
  });

  it('keeps tech mobs and suiyi boss exclusive to tech maps', () => {
    const result = balance.themeBindingForTest();
    expect(result.normalPoolHasTech).toBe(false);
    expect(result.techPoolOnlyTech).toBe(true);
    expect(result.normalBossOk).toBe(true);
    expect(result.techBossOk).toBe(true);
  });

  it('uses theme-bound boss pools and keeps finalboss loop completion stage-gated', () => {
    const spec = balance.bossPoolSpec();
    expect(spec.mode).toBe('theme-bound-random-boss-pool');
    expect(spec.normalPool).toContain('finalboss');
    expect(spec.normalPool).not.toContain('suiyi');
    expect(spec.techPool).toEqual(['suiyi']);
    expect(spec.bossAssetKeysForTest('abysswalker')).toEqual(expect.arrayContaining([
      'abysswalkerIdle',
      'abysswalkerPhase1',
      'abysswalkerPhase2',
      'abysswalkerRage',
      'abysswalkerHit',
      'abysswalkerDeath',
    ]));
    expect(spec.loopsOnlyOnStage10).toBe(true);
  });

  it('starts stronger, lasts longer, and grows monotonically into the late game', () => {
    const { samples, stageFlow } = balance.growthCurveSpec();
    expect(samples.start.diffMul).toBeGreaterThan(1);
    expect(samples.start.hpMul).toBeGreaterThan(1.2);
    expect(samples.start.smallHpMul).toBeGreaterThan(1.1);
    expect(samples.start.densMul).toBeGreaterThan(1);
    expect(samples.start.fireMul).toBeGreaterThan(1);
    expect(samples.start.extraWaves).toBe(0);
    expect(samples.sixMinutes.diffMul).toBeGreaterThan(samples.thirtySeconds.diffMul);
    expect(samples.tenMinutes.hpMul).toBeGreaterThan(samples.sixMinutes.hpMul);
    expect(samples.loopTwo.diffMul).toBeGreaterThan(samples.tenMinutes.diffMul);
    expect(samples.loopTwo.hpMul).toBeLessThanOrEqual(7.5);
    expect(stageFlow.normalTarget).toBeGreaterThan(10);
    expect(stageFlow.techTarget).toBeGreaterThan(stageFlow.normalTarget);
    expect(stageFlow.normalMinDuration).toBeGreaterThanOrEqual(60);
  });

  it('unlocks high-tier waves while keeping normal and tech pools separated', () => {
    const spec = balance.waveUnlockSpec();
    expect(spec.mode).toBe('unlocked-random-wave-and-formation-pool');
    expect(spec.at0).toEqual(['stage1', 'stage2']);
    expect(spec.at210).toContain('stage5');
    expect(spec.at480).toContain('stage8');
    expect(spec.at720).toContain('stage10');
    expect(spec.normalEarlyPool).not.toContain('crystalcompiler');
    expect(spec.normalLatePoolIncludesTech).toBe(false);
    expect(spec.techEarlyPool).toEqual(['codebug', 'coredrone']);
    expect(spec.techLatePoolIncludesAllTech).toBe(true);
    expect(spec.bonusCounts.start).toBe(0);
    expect(spec.bonusCounts.thirtySeconds).toBeGreaterThan(0);
    expect(spec.bonusCounts.twoMinutes).toBeGreaterThan(0);
  });

  it('shows current wave and remaining waves instead of a slash denominator', () => {
    const spec = balance.waveHudSpec();
    expect(spec.mode).toBe('current-wave-plus-remaining-no-slash-denominator');
    expect(spec.mainSample).toBe('第 9 波 · 剩余 7 波');
    expect(spec.reinforcementSample).toBe('增援第 16 波 · 剩余 0 波');
    expect(spec.mainSample).not.toContain('/');
    expect(spec.reinforcementSample).not.toContain('/');
  });

  it('keeps enemy attack visuals above the player layer and below UI', () => {
    const spec = balance.layeringSpec();
    expect(spec.mode).toBe('enemy-attacks-over-player-under-ui');
    expect(spec.afterPlayerLayer).toBe(true);
    expect(spec.playerLayerBelowEnemyBullets).toBe(true);
    expect(spec.belowUiLayer).toBe(true);
    expect(spec.drawCalls).toEqual(['drawSuiyiHazards', 'drawEnemyBullets', 'drawWarnings', 'drawLasers']);
  });

  it('uses relative touch movement on mobile without snapping the player to the finger', () => {
    const spec = balance.touchControlSpec();
    expect(spec.mobileMoveMode).toBe('relative-drag-no-snap');
    expect(spec.noSnapOnMobilePointerDown).toBe(true);
    expect(spec.desktopPointerMode).toBe('absolute-pointer-target-retained');
    expect(spec.simulateRelativeMoveForTest({ x: 360, y: 900 }, [
      { dx: 40, dy: -80 },
      { dx: -10, dy: 25 },
    ])).toEqual({ x: 390, y: 845 });
  });

  it('has distinct high, medium, and low quality budgets for desktop and mobile', () => {
    const spec = balance.qualityBudgetSpec();
    expect(Object.keys(spec.presets)).toEqual(['high', 'medium', 'low']);
    expect(spec.desktop.map(b => b.enemyBulletMax)).toEqual([820, 560, 340]);
    expect(spec.mobile.map(b => b.enemyBulletMax)).toEqual([440, 320, 240]);
    expect(spec.desktop[0].enemyCap).toBeGreaterThan(spec.desktop[2].enemyCap);
    expect(spec.mobile[2].particleCap).toBeLessThan(spec.mobile[0].particleCap);
  });

  it('locks hostile bullet red rim and always-visible player hitbox clarity', () => {
    const spec = balance.claritySpec();
    expect(spec.hostileBullet.baseLayer).toBe('drawHostileBulletRedEdge');
    expect(spec.hostileBullet.topRimLayer).toBe('drawHostileBulletRimOverlay');
    expect(spec.hostileBullet.lowQualityKeepsRim).toBe(true);
    expect(spec.playerHitbox.alwaysVisible).toBe(true);
    expect(spec.playerHitbox.core).toBe('red-dot-red-ring-real-hit-radius');
  });

  it('documents the feel optimization v1 readability, impact, and audio layers', () => {
    const spec = balance.feelOptimizationSpec();
    expect(spec.title).toBe('手感优化 V1');
    expect(spec.bulletReadability.densityDimLayer).toBe('under-hostile-bullets');
    expect(spec.bulletReadability.maxAlpha).toBeCloseTo(0.24);
    expect(spec.hitFeedback.playerHitStop).toBeCloseTo(0.16);
    expect(spec.hitFeedback.hurtVignetteSeconds).toBeCloseTo(0.55);
    expect(spec.audioLayering.graze).toBe('two-layer-high-frequency');
    expect(spec.audioLayering.killStreakWindow).toBeCloseTo(0.9);
  });
});
