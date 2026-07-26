import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadIceDragonInternals, loadIceDragonUltimateInternals } from './setup.js';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

describe('ice crystal dragon ultimate', () => {
  const ultimate = loadIceDragonUltimateInternals();
  const dragon = loadIceDragonInternals();
  const spec = ultimate.spec();

  it('registers an independent I-key companion ultimate with no energy cost', () => {
    expect(spec).toMatchObject({
      name: '冰晶龙神·极寒天陨',
      hudName: '龙神天陨',
      key: 'I',
      cooldown: 48,
      energyCost: 0,
      independentFromCharacterUltimate: true,
    });
    expect(spec.gameplay).toMatchObject({
      playerMovable: true,
      extraInvulnerability: false,
      normalIceDragonFirePaused: true,
      trailsDamaging: false,
      qualityPreservesLogic: true,
    });
    expect(dragon.ultimateSpec()).toEqual(spec);
  });

  it('uses the exact 16.85-second two-phase timeline and ten-second breath window', () => {
    expect(spec.timeline).toEqual({
      summon: [0, 0.65],
      ingress: [0.65, 1.55],
      charge: [1.55, 2.05],
      breath: [2.05, 12.05],
      release: [12.05, 12.55],
      egress: [12.55, 13.35],
      meteorTelegraph: [13.35, 14.15],
      meteorFall: [14.15, 14.95],
      impact: [14.95, 15.65],
      aftermath: [15.65, 16.85],
    });
    expect(spec.breath.duration).toBeCloseTo(10, 8);
    expect(spec.breath.tickInterval).toBeCloseTo(0.2, 8);
    expect(spec.breath.tickCount).toBe(50);
    expect(ultimate.phaseAtForTest(0.3)).toBe('summon');
    expect(ultimate.phaseAtForTest(2.5)).toBe('breath');
    expect(ultimate.phaseAtForTest(14.5)).toBe('meteor-fall');
    expect(ultimate.phaseAtForTest(15.2)).toBe('impact');
    expect(ultimate.phaseAtForTest(16.5)).toBe('aftermath');
    expect(ultimate.phaseAtForTest(16.85)).toBe('done');
  });

  it('exceeds the previous 631800 benchmark in both phases from level one', () => {
    expect(ultimate.breathDamageForTest(1)).toBe(16560);
    expect(ultimate.breathDamageForTest(5)).toBe(18000);
    expect(spec.breath.level1Total).toBe(828000);
    expect(spec.breath.level5Total).toBe(900000);
    expect(ultimate.meteorDamageForTest(1)).toBe(936000);
    expect(ultimate.meteorDamageForTest(5)).toBe(1080000);
    expect(spec.breath.level1Total).toBeGreaterThan(631800 * 1.3);
    expect(spec.meteor.level1Damage).toBeGreaterThan(631800 * 1.3);
    expect(spec.breath.bossCreditMultiplier).toBe(4);
    expect(spec.meteor.bossCreditMultiplier).toBe(6);
  });

  it('prioritizes a live boss, otherwise chooses the densest threat cluster', () => {
    const isolated = { id: 'isolated', x: 80, y: 260, hp: 90000, maxHp: 90000, r: 22 };
    const cluster = [
      { id: 'cluster-a', x: 350, y: 370, hp: 4000, maxHp: 4000, r: 20 },
      { id: 'cluster-b', x: 390, y: 390, hp: 4200, maxHp: 4200, r: 20 },
      { id: 'cluster-c', x: 330, y: 410, hp: 3800, maxHp: 3800, r: 20 },
    ];
    const selected = ultimate.targetForTest([isolated, ...cluster], null);
    expect(cluster.map(target => target.id)).toContain(selected.id);
    const boss = { id: 'boss', x: 360, y: 300, hp: 1000000, maxHp: 1000000, r: 80, isBoss: true };
    expect(ultimate.targetForTest([isolated, ...cluster], boss)).toBe(boss);
    const fallback = ultimate.targetForTest([], null);
    expect(fallback).toMatchObject({ x: 360, y: 448, fallback: true });
  });

  it('locks a large circular frost domain and slows hostile translation without mutating velocity', () => {
    const center = { x: 330, y: 470 };
    const targets = [
      { id: 'line', x: 470, y: 340, hp: 100, r: 12 },
      { id: 'inner', x: 445, y: 470, hp: 100, r: 8 },
      { id: 'expanded-edge', x: 645, y: 470, hp: 100, r: 8 },
      { id: 'edge-outside', x: 690, y: 470, hp: 100, r: 8 },
      { id: 'outside', x: 40, y: 920, hp: 100, r: 10 },
    ];
    expect(ultimate.breathHitsForTest(targets, center).map(target => target.id)).toEqual(['line', 'inner', 'expanded-edge']);
    expect(spec.breath).toMatchObject({
      shape: 'fixed circle',
      radius: 330,
      locksAt: 2.05,
      travelTime: 0.2,
      impactStartsAt: 2.25,
      impactFadeIn: 0.18,
      frostGrowTime: 0.9,
      rangeInitialScale: 0.84,
      rangeSettleTime: 0.38,
      slowStartsAt: 2.25,
      hostileBulletSlowScale: 0.22,
      hostileBulletSlowFeather: 72,
      hostileBulletVelocityMutated: false,
    });
    expect(ultimate.bulletSlowScaleForTest({ x: 330, y: 470 }, center)).toBeCloseTo(0.22, 8);
    expect(ultimate.bulletSlowScaleForTest({ x: 660, y: 470 }, center)).toBeGreaterThan(0.22);
    expect(ultimate.bulletSlowScaleForTest({ x: 760, y: 470 }, center)).toBe(1);
    expect(ultimate.bulletSlowScaleForTest({ x: 330, y: 470 }, center, false)).toBe(1);
    expect(spec.target.maxTrackSpeed).toBe(90);
    expect(spec.target.breathLocksAtChargeEnd).toBe(true);
    expect(spec.target.meteorUsesBreathCenter).toBe(true);
  });

  it('uses only processed local runtime assets with audited green residue', () => {
    expect(spec.assets).toMatchObject({
      sourceFolder: '龙僚机大招开发',
      runtimeRoot: 'assets/companions/ice_crystal_dragon/ultimate',
      processor: 'tools/process_ice_crystal_dragon_ultimate_assets.py',
      referenceSheetsRuntime: false,
      baseGlowSplit: true,
    });
    expect(spec.assets.keys.length).toBe(148);
    expect(new Set(spec.assets.keys).size).toBe(spec.assets.keys.length);
    for (const file of new Set(spec.assets.runtimeFiles)) {
      const absolute = resolve(ROOT, file);
      expect(existsSync(absolute), `${file} is missing`).toBe(true);
      expect(statSync(absolute).size, `${file} is empty`).toBeGreaterThan(128);
      expect(file).not.toMatch(/龙僚机大招开发|reference|concept/i);
    }
    const audit = JSON.parse(readFileSync(resolve(ROOT, 'assets/companions/ice_crystal_dragon/ultimate/asset_audit.json'), 'utf8'));
    expect(audit.reference_sheets_runtime).toBe(false);
    expect(audit.summary.validation_errors).toEqual([]);
    expect(audit.summary.max_green_residue_ratio).toBeLessThanOrEqual(0.0001);
    expect(audit.summary.max_glow_green_residue_ratio).toBeLessThanOrEqual(0.0001);
    expect(spec.assets.keys).toEqual(expect.arrayContaining([
      ...Array.from({ length: 4 }, (_, frame) => `icduMeteor${frame}`),
      ...Array.from({ length: 4 }, (_, frame) => `icduMeteor${frame}Glow`),
      ...Array.from({ length: 5 }, (_, frame) => `icduImpactBloom${frame}`),
      ...Array.from({ length: 5 }, (_, frame) => `icduImpactBloom${frame}Glow`),
      ...Array.from({ length: 5 }, (_, frame) => `icduImpactCrater${frame}`),
      ...Array.from({ length: 5 }, (_, frame) => `icduImpactCrater${frame}Glow`),
      ...Array.from({ length: 6 }, (_, frame) => `icduImpactCrystal${frame}`),
      ...Array.from({ length: 6 }, (_, frame) => `icduImpactCrystal${frame}Glow`),
      'icduDragonHeadArmor', 'icduDragonHeadArmorGlow',
      'icduDragonSpineLong', 'icduDragonSpineLongGlow',
      'icduDragonTailEnergy', 'icduDragonTailEnergyGlow',
      'icduDragonCrystalFin', 'icduDragonCrystalFinGlow',
      'bvSnowflake',
    ]));
  });

  it('keeps hostile readability and clears hostile hazards only on meteor impact', () => {
    expect(spec.meteor.allOnScreenTargets).toBe(true);
    expect(spec.meteor.clearsHostiles).toEqual(['enemyBullets', 'warnings', 'lasers']);
    expect(spec.vfx.lifecycle).toBe('appear-hold-dissipate');
    expect(spec.vfx.fallbackVisuallyComplete).toBe(true);
    expect(spec.vfx.directImpactTextureDominant).toBe(false);
    expect(spec.vfx.wholeFrameJawBlend).toBe(false);
    expect(spec.vfx.summon).toEqual(expect.arrayContaining([
      'procedural perspective entry rift',
      'three-face perimeter prisms',
      'orbiting code-drawn snow crystals',
      'no dominant summon-circle sprite',
      'no target-lock aiming decal',
      'materializing frost field establishes the cast area',
      'secondary entry gate only during ingress',
    ]));
    expect(spec.vfx.dragon).toEqual(expect.arrayContaining([
      'full-body alpha-masked volume',
      'full-body crystal caustics',
      'independent head armour',
      'articulated metal spine',
      'independent energy tail',
      'rear-body crystal facets',
      'multi-plane fin occlusion',
      'asymmetric tail fins',
      'tail-to-throat energy packets',
      'front-layer tail fog',
      'detached ice dust',
      'coil-to-deity pose blend',
    ]));
    expect(spec.vfx.breath).toEqual(expect.arrayContaining([
      'true-mouth muzzle layers',
      'advancing procedural ice-flame front',
      'low-alpha crystal-lattice detail',
      'procedural fluid filaments',
      'traveling light packets',
      'rolling frost mist',
      'continuous snowflake flow',
    ]));
    expect(spec.vfx.field).toEqual(expect.arrayContaining([
      'expanded target-centred circular domain',
      'immediate full-range frost footprint',
      'broken twelve-sector frost wall',
      'raised multi-face frost boundary',
      'raised boundary ice spires',
      'processed frost-grain overlays',
      'cross-faded frost-grain overlays',
      'staggered flipbook frost bursts',
      'orbiting textured ice shards',
      'layered glacier current ribbons',
      'expanding irregular freeze waves',
      'animated glacier refraction sweeps',
      'depth-sorted three-face ice massifs',
      'moving massif refraction sweeps',
      'procedural angular frost facets',
      'directional ice-flame impact',
      'faceted contact prisms',
      'volumetric cold fog banks',
      'coherent three-dimensional shell arcs',
      'growing branching fractures',
      'growing branching fractures with travelling glints',
      'boundary blizzard streamers',
    ]));
    expect(spec.vfx.meteor).toEqual(expect.arrayContaining([
      'anchored meteor tip',
      'accelerated bezier fall',
      'layered volumetric ice trail',
      'cross-faded impact materials',
      'three-face impact spires',
      'single broken frost-crescent wave',
      'persistent refractive crater',
      'staggered debris ejection',
      'hand-painted crystal debris',
      'textured snowflake plume',
      'weighted bouncing ice chunks',
      'edge frost vignette',
      'soft tapered comet ribbon tail',
      'curved cryo-plasma filaments',
      'dense code-drawn trail snow crystals',
      'short forward pressure streaks',
      'frame-alpha-masked meteor material',
      'masked full-body refraction',
      'natural frost-crack meteor telegraph',
      'no meteor aiming texture',
      'radial wavefront crystal teeth',
      'persistent irregular frozen plate field',
      'curled ground blizzard streamers',
      'front-and-back snow powder column',
      'contact blizzard body',
      'reduced ice needle ejection',
    ]));
    expect(spec.vfx.parameters).toMatchObject({
      castAimingDecalVisible: false,
      meteorAimingTextureVisible: false,
      meteorTrailParticleRate: [184, 144, 96, 64],
      meteorGranuleCount: [96, 78, 52, 34],
      meteorMaterialMask: 'frame-alpha',
      impactWaveStyle: 'broken-frost-crescents',
      impactWaveBandWidth: 36,
      impactWaveCrestAlpha: 0.32,
      impactFrozenPlateLinger: 1.16,
      impactPlumeFrontDepth: 0.58,
    });
  });
});
