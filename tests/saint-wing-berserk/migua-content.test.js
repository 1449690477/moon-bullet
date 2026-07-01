import { describe, expect, it } from 'vitest';
import { loadMiguaInternals, loadRandomBalanceInternals } from './setup.js';

describe('migua content pack', () => {
  it('registers the three provided Migua maps and keeps them in the global background pool', () => {
    const I = loadMiguaInternals();
    const spec = I.mapSpec();
    expect(spec.maps).toEqual(['miguaMapGreenhouse', 'miguaMapJuiceFactory', 'miguaMapFloatingCity']);
    expect(spec.count).toBe(3);
    expect(spec.theme).toBe('migua');
    expect(spec.allInGlobalPool).toBe(true);
    expect(Object.values(spec.themeForMaps)).toEqual(['migua', 'migua', 'migua']);
    expect(spec.backgroundPool).toEqual(spec.maps);
  });

  it('exposes the runtime asset keys for boss, enemies, bullets, vfx and dedicated UI', () => {
    const I = loadMiguaInternals();
    const spec = I.assetSpec();
    expect(spec.boss).toContain('miguaBossFinal');
    expect(spec.enemies).toEqual([
      'enMiguaDrone',
      'enMiguaSliceSpider',
      'enMiguaTurret',
      'enMiguaJellyMine',
      'enMiguaBeeStinger',
      'enMiguaArmorTurtle',
    ]);
    expect(spec.bullets).toContain('miguaSliceArc');
    expect(spec.bullets).toContain('miguaCrescentSlice');
    expect(spec.bullets).toContain('miguaJuiceSplashLarge');
    expect(spec.bullets).toContain('miguaMelonSun');
    expect(spec.bullets).toContain('miguaMelonBubble');
    expect(spec.vfx).toContain('miguaJuiceBeamCore');
    expect(spec.vfx).toContain('miguaSeedHalo');
    expect(spec.vfx).toContain('miguaJuicePuddle');
    expect(spec.ui).toContain('miguaBossBarFrame');
    expect(spec.ui).toContain('miguaBossBarDamagedFrame');
    expect(spec.ui).toContain('miguaBarFrame');
    expect(spec.ui).toContain('miguaBarEmpty');
    expect(spec.ui).toContain('miguaBarFillGreen');
    expect(spec.ui).toContain('miguaBarFillYellow');
    expect(spec.ui).toContain('miguaBarFillRed');
    expect(spec.ui).toContain('miguaBarGloss');
    expect(spec.ui).toContain('miguaBarSeedTicks');
    expect(spec.ui).toContain('miguaBarCrack');
    expect(spec.ui).toContain('miguaBarMask');
    expect(spec.ui).toContain('miguaBarDanger');
  });

  it('defines six Migua mobs with unique movement and attack patterns', () => {
    const I = loadMiguaInternals();
    const enemies = I.enemySpec();
    expect(enemies).toHaveLength(6);
    expect(new Set(enemies.map(e => e.type)).size).toBe(6);
    expect(new Set(enemies.map(e => e.pattern)).size).toBe(6);
    expect(new Set(enemies.map(e => e.move)).size).toBe(6);
    expect(enemies.find(e => e.type === 'miguaturret')).toMatchObject({ tier: 4, pattern: 'miguaJuiceBeam' });
    expect(enemies.find(e => e.type === 'miguaarmorturtle').hp).toBeGreaterThan(1500);
  });

  it('keeps Migua enemies and boss exclusive to the Migua theme pool', () => {
    const I = loadMiguaInternals();
    const binding = I.themeBindingSpec();
    expect(binding.normalPoolContainsMigua).toBe(false);
    expect(binding.techPoolContainsMigua).toBe(false);
    expect(binding.miguaPoolContainsOnlyMigua).toBe(true);
    expect(binding.normalBossPoolContainsMigua).toBe(false);
    expect(binding.techBossPoolContainsMigua).toBe(false);
    expect(binding.miguaBossPoolContainsOnlyMigua).toBe(true);
  });

  it('uses four Migua boss phases and a dedicated melon boss bar skin', () => {
    const I = loadMiguaInternals();
    const boss = I.bossSpec();
    expect(boss.kind).toBe('migua');
    expect(boss.hp).toBe(18400);
    expect(boss.thresholds).toEqual([1, 0.72, 0.48, 0.22, 0]);
    expect(boss.phases).toEqual(['甜味试探', '果汁工厂过载', '蜜瓜军团压制', '甜味爆裂']);
    expect(I.phaseForHpForTest(0.9)).toBe(0);
    expect(I.phaseForHpForTest(0.6)).toBe(1);
    expect(I.phaseForHpForTest(0.3)).toBe(2);
    expect(I.phaseForHpForTest(0.1)).toBe(3);
    expect(I.bossBarSpec()).toMatchObject({
      skin: 'melon',
      lowHpCrackAt: 0.3,
      criticalAt: 0.1,
      seedTicks: 18,
      usesLayeredMaskFill: true,
      maskComposite: 'destination-in',
      safeTop: 18,
    });
    expect(I.bossBarSpec().renderOrder).toEqual([
      'empty-underlay',
      'masked-fill',
      'masked-gloss',
      'seed-ticks',
      'crack',
      'pulse-danger',
      'frame',
      'portrait-name-text',
    ]);
    const full = I.bossBarLayoutForTest(1, { width: 720, height: 1280 });
    const half = I.bossBarLayoutForTest(0.5, { width: 720, height: 1280 });
    const low = I.bossBarLayoutForTest(0.08, { width: 720, height: 1280 });
    expect(full.frame.y).toBeGreaterThanOrEqual(18);
    expect(full.fill.liveW).toBeCloseTo(full.fill.w, 4);
    expect(half.fill.liveW).toBeCloseTo(full.fill.w * 0.5, 4);
    expect(low.fill.liveW).toBeLessThan(half.fill.liveW);
    expect(low.fill.lostW).toBeGreaterThan(half.fill.lostW);
    expect(half.frame).toEqual(full.frame);
    expect(low.frame).toEqual(full.frame);
    expect(full.frame.w).toBeGreaterThan(full.fill.liveW * 0.99);
    expect(low.frame.w).toBeGreaterThan(low.fill.liveW * 5);
  });

  it('documents Migua projectile behaviors and spell-card timelines', () => {
    const I = loadMiguaInternals();
    const bullet = I.bulletSpec();
    expect(bullet.types).toContain('juice_beam');
    expect(bullet.types).toContain('melon_ring_burst');
    expect(bullet.types).toContain('juice_splash_large');
    expect(bullet.types).toContain('melon_sun');
    expect(bullet.behaviors).toContain('bubble');
    expect(bullet.behaviors).toContain('slow_then_fast');
    expect(bullet.behaviors).toContain('melon_throw');
    expect(bullet.fruitStyles).toContain('splash-droplet-clouds');
    expect(bullet.fruitStyles).toContain('whole-melon-throw-burst');
    expect(bullet.layeredDraw).toEqual(['fruit-specific-short-tail', 'sprite-body-shadow-edge', 'fruit-palette-damage-boundary']);
    expect(bullet.redRim).toBe('fruit-palette-boundary-no-red-rim');
    expect(bullet.clarity).toBe('dark-fruit-outline-and-light-hit-boundary');
    expect(I.patternTimelineForTest(0)).toEqual(['瓜子连发', '果仁压缩扇形', '整瓜抛投', '蜜瓜泡泡道']);
    expect(I.patternTimelineForTest(3)).toEqual(['爆浆花环', '甜味洪流', '整瓜连投爆裂', '蜜瓜太阳阵']);
  });

  it('extends random-balance specs with Migua map, enemy and boss pools', () => {
    const R = loadRandomBalanceInternals();
    const bg = R.backgroundPoolSpec();
    expect(bg.miguaMaps).toEqual(['miguaMapGreenhouse', 'miguaMapJuiceFactory', 'miguaMapFloatingCity']);
    expect(bg.miguaThemeMaps).toEqual(bg.miguaMaps);
    expect(bg.miguaThemeOnlySpawnsMiguaMobsAndMiguaBoss).toBe(true);
    const bosses = R.bossPoolSpec();
    expect(bosses.miguaPool).toEqual(['migua']);
    expect(bosses.miguaExclusiveToMiguaPool).toBe(true);
    const waves = R.waveUnlockSpec();
    expect(waves.normalLatePoolIncludesMigua).toBe(false);
    expect(waves.techLatePoolIncludesMigua).toBe(false);
    expect(waves.miguaLatePoolIncludesAllMigua).toBe(true);
  });
});
