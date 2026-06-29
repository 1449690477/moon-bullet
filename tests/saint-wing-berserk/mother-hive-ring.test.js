import { describe, expect, it } from 'vitest';
import { loadMotherHiveInternals } from './setup.js';

describe('mother hive ring companion', () => {
  it('uses an ellipse for the purify absorption field', () => {
    const I = loadMotherHiveInternals();
    const center = { x: 360, y: 900 };
    expect(I.insideEllipse({ x: 360, y: 900 }, center, 120, 80)).toBe(true);
    expect(I.insideEllipse({ x: 470, y: 900 }, center, 120, 80)).toBe(true);
    expect(I.insideEllipse({ x: 490, y: 900 }, center, 120, 80)).toBe(false);
    expect(I.insideEllipse({ x: 360, y: 986 }, center, 120, 80)).toBe(false);
  });

  it('absorbs only small normal enemy bullets', () => {
    const I = loadMotherHiveInternals();
    expect(I.canAbsorbBullet({ x: 0, y: 0, r: 10, life: 1, kind: 'orbbasic', damage: 8 }, false)).toBe(true);
    expect(I.canAbsorbBullet({ x: 0, y: 0, r: 11, life: 1, kind: 'orbbasic', damage: 8 }, false)).toBe(false);
    expect(I.canAbsorbBullet({ x: 0, y: 0, r: 12, life: 1, kind: 'orbbasic', damage: 8 }, true)).toBe(true);
    expect(I.canAbsorbBullet({ x: 0, y: 0, r: 13, life: 1, kind: 'orbbasic', damage: 8 }, true)).toBe(false);
    expect(I.canAbsorbBullet({ x: 0, y: 0, r: 6, life: 1, kind: 'laser', damage: 8 }, true)).toBe(false);
    expect(I.canAbsorbBullet({ x: 0, y: 0, r: 9, life: 1, kind: 'orbbasic', damage: 24 }, true)).toBe(false);
  });

  it('activates only when mother hive is equipped by Life Mother', () => {
    const I = loadMotherHiveInternals();
    expect(I.activeFor(true, true)).toBe(true);
    expect(I.activeFor(true, false)).toBe(false);
    expect(I.activeFor(false, true)).toBe(false);
    expect(I.activeFor(false, false)).toBe(false);
  });

  it('keeps purify, egg, homing and final burst budgets bounded', () => {
    const I = loadMotherHiveInternals();
    expect(I.config.absorbPerSecond).toBe(10);
    expect(I.config.maxAbsorb).toBe(32);
    expect(I.config.berserkMaxAbsorb).toBe(48);
    expect(I.config.linkAbsorbPerSecond).toBe(24);
    expect(I.config.linkMaxAbsorb).toBe(96);
    expect(I.config.linkMaxAbsorbLow).toBe(64);
    expect(I.config.eggCap).toBe(48);
    expect(I.config.homingCap).toBe(96);
    expect(I.capFinalBurst(99)).toBe(72);
    expect(I.capFinalBurst(-4)).toBe(0);
  });

  it('defines three crystal emitters per pod and the V2 spike fire budgets', () => {
    const I = loadMotherHiveInternals();
    const spec = I.crystalWeaponSpec();
    expect(spec.perSide).toBe(3);
    expect(spec.totalEmitters).toBe(6);
    expect(spec.normalLayout).toEqual([
      { localX: -36, localY: -16 },
      { localX: 0, localY: -56 },
      { localX: 36, localY: -16 },
    ]);
    expect(spec.berserkLayout).toEqual([
      { localX: -52, localY: -24 },
      { localX: 0, localY: -74 },
      { localX: 52, localY: -24 },
    ]);
    expect(spec.normal.fireInterval).toBeCloseTo(0.18);
    expect(spec.normal.shotsPerEmitter).toBe(1);
    expect(spec.normal.maxTotal).toBe(90);
    expect(spec.berserk.fireInterval).toBeCloseTo(0.08);
    expect(spec.berserk.shotsPerEmitter).toBe(3);
    expect(spec.berserk.maxTotal).toBe(160);
  });

  it('keeps normal spike arcs split left/right and widens berserk coverage', () => {
    const I = loadMotherHiveInternals();
    const left = I.normalSpikeArcForTest(-1);
    const right = I.normalSpikeArcForTest(1);
    const leftB = I.berserkSpikeArcForTest(-1);
    const rightB = I.berserkSpikeArcForTest(1);
    expect(left.center).toBeCloseTo(-Math.PI * 0.38);
    expect(right.center).toBeCloseTo(-Math.PI * 0.62);
    expect(left.center).toBeGreaterThan(-Math.PI / 2);
    expect(right.center).toBeLessThan(-Math.PI / 2);
    expect(leftB.spread).toBeGreaterThan(left.spread);
    expect(rightB.spread).toBeGreaterThan(right.spread);
  });

  it('stacks, refreshes, expires and calculates Life Mark ribbon bursts', () => {
    const I = loadMotherHiveInternals();
    const spec = I.lifeMarkSpec();
    expect(spec.duration).toBe(4);
    expect(spec.maxStacks).toBe(5);
    expect(spec.explosionRadius).toBe(72);
    expect(spec.ribbonSourceTags).toEqual(['normalRibbon', 'resonanceMain', 'resonanceBranch']);
    expect(I.applyLifeMarkForTest(3, false)).toMatchObject({ stacks: 3, timeLeft: 4, duration: 4 });
    expect(I.applyLifeMarkForTest(7, false).stacks).toBe(5);
    expect(I.applyLifeMarkForTest(2, true)).toMatchObject({ stacks: 2, timeLeft: 5, duration: 5, berserk: true });
    expect(I.applyLifeMarkForTest(1, false, 4.01)).toBeNull();
    expect(I.calcLifeMarkBurstForTest(100, 3, 4)).toEqual({
      targetBonus: 100 * (0.85 + 3 * 0.42),
      aoeDamage: (10 + 4 * 3) * (0.75 + 3 * 0.25),
      radius: 72,
      stacks: 3,
    });
  });

  it('pauses crystal weapons during mother hive and Life Mother ultimates', () => {
    const I = loadMotherHiveInternals();
    expect(I.crystalWeaponPausedForTest(false, false)).toBe(false);
    expect(I.crystalWeaponPausedForTest(true, false)).toBe(true);
    expect(I.crystalWeaponPausedForTest(false, true)).toBe(true);
    expect(I.crystalWeaponPausedForTest(true, true)).toBe(true);
  });

  it('keeps the V3 vortex visually separated from the flower', () => {
    const I = loadMotherHiveInternals();
    const spec = I.linkV3VisualSpec();
    expect(spec.vortexAlphaMin).toBeGreaterThanOrEqual(0.34);
    expect(spec.vortexAlphaMax).toBeGreaterThanOrEqual(0.60);
    expect(spec.vortexInnerRx - spec.flowerRadius).toBeGreaterThanOrEqual(80);
    expect(spec.vortexOuterRx / spec.flowerRadius).toBeGreaterThan(2.7);
    expect(spec.vortexOuterRx).toBeLessThanOrEqual(330);
    expect(spec.vortexPriority).toBe('visibility-first');
    expect(spec.vortexArmCount).toBe('fluid-accretion-bands-plus-realtime-flow-particles');
    expect(spec.vortexPalette).toEqual(['pink-white', 'life-green', 'soft-lavender', 'pale-gold']);
    expect(spec.vortexOuterFlow).toBe('tangent');
    expect(spec.vortexInnerFlow).toBe('converge-to-flower');
    expect(spec.vortexFillMode).toBe('fluid-accretion-field-with-sequence-undertone');
    expect(spec.vortexBodyMode).toBe('procedural-pink-white-life-fluid-disk');
    expect(spec.vortexLineRole).toBe('secondary-flow-sparks-and-capture-streams');
    expect(spec.vortexSpriteRole).toBe('accent-textures-only-no-orbit-sprites');
    expect(spec.vortexPrimaryBody).toBe('procedural-fluid-bands-over-low-alpha-sequence');
    expect(spec.vortexCoreVisibility).toBe('dark-core-visible-below-flower');
    expect(spec.vortexCoreStyle).toBe('dark-core-during-absorb');
    expect(spec.vortexMainDiskTexture).toBe('very-low-alpha-blackhole_sequence');
    expect(spec.vortexSupportDiskTextures).toEqual(['mhrBhDisk01', 'mhrBhDisk02', 'mhrBhDisk03']);
    expect(spec.vortexMainDiskMaxCopies).toBe(1);
    expect(spec.vortexNoLegacyCircleBody).toBe(true);
    expect(spec.vortexNoOrbitSprites).toBe(true);
    expect(spec.vortexUsesOffscreenMask).toBe(false);
    expect(spec.vortexMaskComposite).toBe('not-primary');
    expect(spec.vortexFlowerGap).toBe('draw-order-flower-above-disk');
    expect(spec.vortexUsesFullTexture).toBe(true);
    expect(spec.vortexUsesCroppedBlackHoleAssets).toBe(true);
    expect(spec.vortexProceduralParticles).toBe(true);
    expect(spec.vortexTextureRole).toBe('low-alpha-sequence-and-core-burst-accents');
    expect(spec.blackHoleSequence).toEqual({ deploy: 16, loop: 32, overload: 16, collapse: 12 });
    expect(spec.blackHoleSequenceWorkflow).toBe('keyframes-interpolated-sequence-plus-realtime-overlays');
    expect(spec.blackHoleRuntimeAssets).toEqual(expect.arrayContaining([
      'mhrBhArm01',
      'mhrBhArm04',
      'mhrBhCore01',
      'mhrBhBurst01',
      'mhrButterflyTrailFragment01',
    ]));
    expect(spec.blackHoleDebugVisible).toBe(false);
    expect(spec.vortexLifecycle).toBe('absorb-orbit-collapse-singularity-burst');
    expect(spec.vortexBulletField).toBe('active-gravity-spiral-capture');
    expect(spec.singularityPhase).toMatchObject({
      enabled: true,
      duration: 0.45,
      radiusPx: '18-28',
      releaseMode: 'flash-then-butterfly-burst',
    });
    expect(spec.vortexOuterBoundary).toBe('hidden-no-transparent-ellipse');
    expect(spec.vortexFlowParticles).toEqual({ perf0: 108, perf1: 64, perf2: 34 });
    expect(spec.finalFlightMode).toBe('quick-spread-fast-lock-rush-hit-target-facing-flutter');
    expect(spec.finalTargetMode).toBe('distributed-locked-continuous-retarget');
    expect(spec.finalTargetCoverage).toBe('one-butterfly-per-live-target-within-cap');
    expect(spec.finalDamageBoost).toBeCloseTo(1.45);
    expect(spec.finalBossOnlyBonusCap).toBeCloseTo(1.2);
    expect(spec.finalSpreadWindowMin).toBeLessThanOrEqual(0.08);
    expect(spec.finalSpreadWindowMax).toBeLessThanOrEqual(0.14);
    expect(spec.finalLockWaveDelay).toBeLessThanOrEqual(0.008);
    expect(spec.finalRetargetInterval).toBeLessThanOrEqual(0.1);
    expect(spec.finalRushSpeed).toBeGreaterThanOrEqual(900);
    expect(spec.finalRushTurn).toBeGreaterThanOrEqual(16);
    expect(spec.butterflyFlapFrames).toEqual(['mhrV3Butterfly1', 'mhrV3Butterfly2', 'mhrV3Butterfly3', 'mhrV3Butterfly4']);
    expect(spec.butterflyMainSprite).toBe('mhrV3Butterfly1-4');
    expect(spec.finalTrailMode).toBe('continuous-ribbon-mesh');
    expect(spec.finalTrailUsesRibbonTexture).toBe(true);
    expect(spec.finalRibbonFlowTrail).toBe('visible-v3-textured-life-ribbon-trail');
    expect(spec.finalParticleRole).toBe('wingtip-core-pink-gold-sparkles');
    expect(spec.finalTrailHistoryMin).toBe(12);
    expect(spec.finalTrailHistoryMax).toBe(24);
    expect(spec.finalTrailDurationMin).toBeGreaterThanOrEqual(0.44);
    expect(spec.finalTrailDurationMax).toBeLessThanOrEqual(0.74);
    expect(spec.finalTrailDrawOrder).toBe('trail-before-body');
    expect(spec.finalBodyComposite).toBe('source-over');
    expect(spec.finalGlowComposite).toBe('lighter');
  });

  it('uses tangent outer flow and inward inner flow for the V3 vortex', () => {
    const I = loadMotherHiveInternals();
    const outer = I.vortexFlowVector(0, 0.16);
    const inner = I.vortexFlowVector(0, 0.62);
    expect(outer.y).toBeGreaterThan(Math.abs(outer.x));
    expect(inner.x).toBeLessThan(-0.45);
    expect(inner.y).toBeGreaterThan(0);
  });

  it('moves the ultimate link flower to the front of Life Mother', () => {
    const I = loadMotherHiveInternals();
    expect(I.linkInitialState()).toBe('MOVE_TO_FRONT');
    expect(I.linkTargetFor(360, 900)).toEqual({ x: 360, y: 630 });
    expect(I.linkTargetFor(20, 180)).toEqual({ x: 72, y: 120 });
  });

  it('captures bullets into an absorption record before energy streaming', () => {
    const I = loadMotherHiveInternals();
    const rec = I.linkCaptureRecord({ x: 120, y: 640, vx: 300, vy: 100, r: 8, color: '#fff' }, 360, 780);
    expect(rec).toMatchObject({ x: 120, y: 640, sx: 120, sy: 640, tx: 360, ty: 780, r: 8, color: '#fff' });
    expect(rec.vx).toBeCloseTo(54);
    expect(rec.vy).toBeCloseTo(18);
    expect(rec.pullX).toBeGreaterThan(0);
    expect(rec.pullY).toBeGreaterThan(0);
    expect(rec.life).toBeGreaterThan(0);
  });

  it('scales final butterfly count and damage with absorbed bullets', () => {
    const I = loadMotherHiveInternals();
    expect(I.linkButterflyCount(0, 0)).toBe(8);
    expect(I.linkButterflyCount(7, 0)).toBe(8);
    expect(I.linkButterflyCount(20, 0)).toBe(20);
    expect(I.linkButterflyCount(99, 0)).toBe(72);
    expect(I.linkButterflyCount(99, 1)).toBe(56);
    expect(I.linkButterflyCount(99, 2)).toBe(40);
    expect(I.linkDamageMul(0)).toBe(1.2);
    expect(I.linkDamageMul(10)).toBe(2.0);
    expect(I.linkDamageMul(20)).toBe(3.0);
    expect(I.linkDamageMul(35)).toBe(4.2);
    expect(I.linkDamageMul(50)).toBe(5.5);
    expect(I.finalBossOnlyMultiplierFor(40)).toBeCloseTo(2.0);
    expect(I.finalBossOnlyMultiplierFor(80)).toBeCloseTo(2.2);
    expect(I.finalBurstCountForTest(3, 12, 0)).toBe(12);
    expect(I.finalBurstCountForTest(99, 120, 0)).toBe(72);
    expect(I.finalBurstCountForTest(99, 120, 2)).toBe(40);
    expect(I.assignFinalTargetsForTest([
      { id: 'boss', hp: 10000, maxHp: 10000, x: 360, y: 120, r: 70, isBoss: true },
      { id: 'elite', hp: 600, maxHp: 600, x: 280, y: 220, r: 26, tier: 3 },
      { id: 'mob', hp: 120, maxHp: 120, x: 420, y: 260, r: 18, tier: 1 },
    ], 5, { x: 360, y: 420 })).toEqual(['boss', 'elite', 'mob', 'boss', 'elite']);
  });
});
