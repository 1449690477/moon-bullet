import { describe, expect, it } from 'vitest';
import { loadDragonBreathInternals } from './setup.js';

describe('dragon breath common skill', () => {
  const dragon = loadDragonBreathInternals();

  it('registers Dragon Breath as a universal Y cooldown skill', () => {
    const cfg = dragon.configSpec();
    expect(cfg.name).toBe('龙息弹');
    expect(cfg.input).toBe('Y');
    expect(cfg.universal).toBe(true);
    expect(cfg.cooldownOnly).toBe(true);
    expect(cfg.duration).toBe(10);
    expect(cfg.cooldown).toBe(18);
    expect(cfg.shotCount).toBe(10);
    expect(cfg.firstShot).toBeCloseTo(0.8);
    expect(cfg.shotInterval).toBe(1);
    expect(cfg.projectileSpeed).toBe(1050);
    expect(cfg.projectileLife).toBeCloseTo(1.8);
    expect(dragon.scheduleForTest()).toEqual([0.8, 1.8, 2.8, 3.8, 4.8, 5.8, 6.8, 7.8, 8.8, 9.8]);
  });

  it('loads all runtime assets from the processed Dragon Breath folder', () => {
    const assets = dragon.assetSpec();
    expect(assets.runtimeRoot).toBe('assets/common/dragon_breath');
    expect(assets.sourceFolder).toContain('龙息弹开发');
    expect(assets.processor).toBe('tools/process_dragon_breath_assets.py');
    expect(assets.pipeline).toContain('despill');
    expect(assets.noExternalAssets).toBe(true);
    expect(assets.keys).toEqual(expect.arrayContaining([
      'skillDragonBreathDevice',
      'skillDragonBreathCircle',
      'skillDragonBreathProjectileMain',
      'skillDragonBreathProjectileAlt',
      'skillDragonBreathTrail',
      'skillDragonBreathHitBlast',
      'skillDragonBreathParticles',
      'skillDragonBreathDeviceGlowMask',
      'skillDragonBreathDeviceLightFx',
      'skillDragonBreathProjectileAngles',
      'skillDragonBreathProjectileFlow',
      'skillDragonBreathImpactAtlas',
      'skillDragonBreathArrayFx',
      'uiSkillDragonBreathIcon',
    ]));
  });

  it('uses highest-current-HP targeting and capped Boss percent damage', () => {
    expect(dragon.targetForTest([
      { hp: 1200, r: 20 },
      { hp: 5200, r: 28, kind: 'elite' },
      { hp: 3000, r: 24 },
    ])).toMatchObject({ index: 1, hp: 5200 });

    const attackLv1 = dragon.attackForTest(1);
    expect(attackLv1).toBe(132);
    expect(dragon.damageForTest(1000, false, 1)).toBeCloseTo(132 * 3.6 + 1000 * 0.016);
    // 高血量 Boss：百分比项按上限 attack×110 结算（1,000,000×0.065=65,000 > 132×110=14,520）
    expect(dragon.damageForTest(1_000_000, true, 1)).toBeCloseTo(132 * 10 + 132 * 110);
  });

  it('models a wide piercing capsule for the five-headed projectile', () => {
    const shot = { x: 360, y: 700, vx: 0, vy: -1050 };
    expect(dragon.projectileHitForTest(shot, { x: 360, y: 460, r: 24 })).toBe(true);
    expect(dragon.projectileHitForTest(shot, { x: 430, y: 460, r: 18 })).toBe(false);
  });

  it('exposes desktop and mobile HUD hooks for Y', () => {
    const hud = dragon.hudSpec();
    expect(hud).toMatchObject({
      desktopKey: 'Y',
      mobileVirtualKey: 'Y',
      icon: 'uiSkillDragonBreathIcon',
      name: '龙息弹',
    });
    expect(hud.mobileHudControls).toContain('Y');
  });

  it('exposes the rebuilt VFX timeline and fixed-device debug state', () => {
    const cfg = dragon.configSpec();
    expect(cfg.chargeLead).toBeCloseTo(0.18);
    expect(cfg.visual.deviceSize).toBe(248);
    expect(cfg.visual.deviceGlowSize).toBe(310);
    expect(cfg.visual.headRowW).toBe(500);
    expect(cfg.visual.headRowH).toBe(190);
    expect(cfg.visual.directionalHeads).toBe(true);
    expect(cfg.visual.lockBeamAlpha).toBeGreaterThan(0.5);
    const visual = dragon.visualStateSpec();
    expect(visual).toMatchObject({
      deployPhase: expect.any(String),
      bodyRotation: 0,
      directionalHeads: true,
      bossLockBeamEnabled: true,
    });
    expect(Array.isArray(visual.projectileAngleFrames)).toBe(true);
  });
});
