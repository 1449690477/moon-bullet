import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadCorruptGunInternals } from './setup.js';

describe('seventh fighter corruption gun', () => {
  const cg = loadCorruptGunInternals();

  it('registers the seventh fighter with the documented base stats', () => {
    expect(cg.characterSpec()).toMatchObject({
      key: 'corruptgun',
      maxHp: 126,
      speed: 404,
      slowSpeed: 240,
      shootCd: 0.35,
      berserkShootCd: 0.25,
      selectableDigit: 7,
      ultimate: 'darkWheel',
    });
  });

  it('uses the documented corruption sequence and boss cap', () => {
    expect(cg.damageSequenceForTest(165, 5, false)).toEqual([165, 330, 660, 1320, 2640]);
    expect(cg.damageSequenceForTest(165, 5, true)).toEqual([165, 330, 660, 1320, 1320]);
    expect(cg.multiplierForTest(4, false)).toBe(16);
    expect(cg.multiplierForTest(4, true)).toBe(8);
  });

  it('refreshes a six-second mark and caps stacks independently for enemies and bosses', () => {
    expect(cg.nextMarkForTest(null, false)).toEqual({ n: 1, t: 6, age: 0 });
    expect(cg.nextMarkForTest({ n: 4, t: 0.1 }, false)).toEqual({ n: 4, t: 6, age: 0 });
    expect(cg.nextMarkForTest({ n: 3, t: 0.1 }, true)).toEqual({ n: 3, t: 6, age: 0 });
    expect(cg.ageMarkForTest({ n: 2, t: 6, age: 0 }, 5.9)).toMatchObject({ n: 2, t: expect.closeTo(0.1), age: 5.9 });
    expect(cg.ageMarkForTest({ n: 2, t: 6, age: 0 }, 6)).toBeNull();
  });

  it('isolates corruption damage by source and deduplicates each pierced target', () => {
    expect(cg.hitPreviewForTest({ damage: 165, cgCorrupt: true }, { n: 2, t: 1 }, false)).toMatchObject({ eligible: true, damage: 660, mult: 4, mark: { n: 3, t: 6 } });
    expect(cg.hitPreviewForTest({ damage: 999, cgCorrupt: false }, { n: 2, t: 1 }, false)).toEqual({ eligible: false, damage: 999, mult: 1, mark: { n: 2, t: 1 } });
    expect(cg.claimHitForTest({ id: 'same-target' })).toEqual({ first: true, second: false, hits: 1 });
  });

  it('defines the five regular corruption shots plus the ultimate orb', () => {
    expect(cg.bulletSpec()).toMatchObject({
      cgMain: { damage: 165, pierce: 4, speed: 720, r: 13, size: 58 },
      cgSide: { damage: 55, pierce: 2, speed: 820, size: 40 },
      cgMainOver: { damage: 205, pierce: 5, speed: 760, r: 15, size: 74 },
      cgSideOver: { damage: 72, pierce: 3, speed: 860, size: 46 },
      cgClone: { damage: 58, pierce: 2, speed: 760, r: 8, size: 58 },
      cgUltOrb: { damage: 220, pierce: 99, speed: 730, r: 20, size: 96, source: 'ultimate' },
    });
  });

  it('stores three one-at-a-time clone charges and regenerates one every eight seconds', () => {
    const clone = cg.cloneSpec();
    expect(clone).toMatchObject({ maxCharges: 3, regen: 8, maxActive: 3, life: 10, activeLife: 10, spawnTime: 0.72, despawnTime: 0.5, totalTimeline: 11.22, fireInterval: 0.8, summonPerPress: 1, collision: false, cleanupMode: 'despawn', preserveChargeOnDeathAndSwap: true, stationaryAnchor: true, bobMax: 2.8, bodyWidth: 190, bodyWidthOver: 120, bodyHeight: 186, bodyHeightOver: 117, playerBodyWidth: 110, playerBodyWidthOver: 128, renderHeight: 186, renderHeightOver: 117, visibleHeightRatio: 1, visibleHeightRatioOver: 1, projectileSize: 58, projectileSizeOver: 74, playerProjectileSize: 58, playerProjectileSizeOver: 74, anchorBounds: { marginX: 60, minY: 80, bottom: 180 } });
    expect(clone.slots).toEqual([{ x: -168, y: -66 }, { x: 168, y: -66 }, { x: 0, y: -205 }]);
    const placed = cg.cloneAnchorForTest(360, 700, 0, 720, 900);
    expect(placed).toEqual({ x: 192, y: 634 });
    expect(cg.cloneAnchorForTest(10, 850, 0, 720, 900)).toEqual({ x: 60, y: 720 });
    expect(cg.chargeAfterForTest(0, 0, 7.9)).toEqual({ charges: 0, regenT: 7.9 });
    expect(cg.chargeAfterForTest(0, 0, 8)).toEqual({ charges: 1, regenT: 0 });
    expect(cg.chargeAfterForTest(1, 7, 17)).toEqual({ charges: 3, regenT: 0 });
  });

  it('assigns distinct mob targets to clones while allowing shared Boss focus', () => {
    const clones = [{ x: 100, y: 600 }, { x: 540, y: 600 }, { x: 320, y: 520 }];
    const targets = [
      { id: 'left', x: 150, y: 260, hp: 100 },
      { id: 'center', x: 320, y: 240, hp: 100 },
      { id: 'right', x: 500, y: 260, hp: 100 },
    ];
    expect(new Set(cg.cloneTargetsForTest(clones, targets)).size).toBe(3);
    expect(cg.cloneTargetsForTest(clones, targets, { id: 'boss' })).toEqual(['boss', 'boss', 'boss']);
  });

  it('creates a non-recursive 130px death blast from fatal applied corruption damage', () => {
    expect(cg.deathBlastSpec()).toEqual({ radius: 130, damageRatio: 0.4, appliesMark: false, recursive: false, affectsBoss: false });
    const source = { x: 100, y: 100, hp: 0 };
    const targets = [
      { x: 220, y: 100, hp: 100 },
      { x: 231, y: 100, hp: 100 },
      { x: 110, y: 100, hp: 999, isBoss: true },
      { x: 105, y: 100, hp: 0 },
    ];
    expect(cg.deathBlastPreviewForTest(source, targets, 250)).toEqual({ damage: 100, hitIndexes: [0] });
    expect(targets.map(target => target.hp)).toEqual([100, 100, 999, 0]);
    const chainedTargets = [
      { x: 220, y: 100, hp: 80, _cgMark: { n: 4, t: 6 } },
      { x: 340, y: 100, hp: 80, _cgMark: { n: 4, t: 6 } },
      { x: 105, y: 100, hp: 999, isBoss: true },
    ];
    expect(cg.deathBlastApplyForTest(source, chainedTargets, 250)).toEqual({
      hitIndexes: [0],
      hp: [-20, 80, 999],
      marks: [{ n: 4, t: 6 }, { n: 4, t: 6 }, null],
    });
  });

  it('banks the neutral body smoothly and never selects large bank sprites', () => {
    expect(cg.bankSpec()).toEqual({ maxDeg: 3.5, leanT90: 0.3, returnT90: 0.24, reverseT90: 0.42, usesBankSprites: false });
    const leaned = cg.bankStepForTest({ value: 0, velocity: 0, inputDir: 0 }, 1, 0.3);
    expect(leaned.value).toBeGreaterThan(3.1);
    expect(leaned.value).toBeLessThanOrEqual(3.5);
    const returned = cg.bankStepForTest({ value: 3.5, velocity: 0, inputDir: 1, mode: 'lean' }, 0, 0.24);
    expect(Math.abs(returned.value)).toBeLessThan(0.36);
    const reversed = cg.bankStepForTest({ value: 3.5, velocity: 0, inputDir: 1, mode: 'lean' }, -1, 0.42);
    expect(reversed.value).toBeLessThan(-2.75);
  });

  it('uses a three-pip Space HUD and the dedicated Dark Wheel X skill', () => {
    expect(cg.uiSpec()).toMatchObject({ spaceName: '投影分身', xName: '暗蚀轮回', xIcon: 'cgUltIcon', chargePips: 3 });
    expect(cg.uiSpec().titleOrder.at(-1)).toBe('corruptgun');
  });

  it('defines layered live WebGL and complete lossless-atlas visual modes', () => {
    expect(cg.visualSpec()).toMatchObject({
      sizes: { main: 58, mainOver: 74, clone: 58, cloneOver: 74, trail: 196, trailOver: 244, trailClone: 196, trailCloneOver: 244, trailWidth: 72, trailWidthOver: 88, impact: 124, impactOver: 144, impactClone: 124, impactCloneOver: 144, cloneField: 232 },
      trailNodes: { main: 14, clone: 14, side: 4 },
      fxCaps: [180, 132, 90],
      qualityModes: ['high-webgl', 'medium-webgl-0.7', 'low-lossless-atlas'],
    });
    expect(cg.visualSpec().layers).toEqual(expect.arrayContaining(['source-over-volume', 'sharp-spear-plume', 'void-orbit-filaments', 'flow-energy', 'counter-rotating-rings', 'orbit-particles']));
  });

  it('stacks persistent boss corrosion to 200 with +3% damage and max-HP percentage damage', () => {
    expect(cg.bossCorrosionSpec()).toMatchObject({
      cap: 200,
      damageBonusPerStack: 0.03,
      maxDamageBonusPercent: 600,
      maxDamageMultiplier: 7,
      dotMaxHpPerStackPerSecond: 0.00005,
      maxDotMaxHpPercentPerSecond: 1,
      tickInterval: 0.25,
      directCorruptGunProjectilesOnly: false,
      stackingSources: ['main-projectile', 'clone-projectile', 'cgUltOrb', 'cgUltBurst', 'cgUltWheel', 'cgUltFinale', 'cgUltSoul'],
      ui: { width: 184, height: 66 },
    });
    expect(cg.bossCorrosionPreviewForTest(0, 1_000_000)).toEqual({ stacks: 0, damageMultiplier: 1, damageBonusPercent: 0, dotPerSecond: 0, dotPerTick: 0 });
    expect(cg.bossCorrosionPreviewForTest(100, 1_000_000)).toEqual({ stacks: 100, damageMultiplier: 4, damageBonusPercent: 300, dotPerSecond: 5000, dotPerTick: 1250 });
    expect(cg.bossCorrosionPreviewForTest(200, 1_000_000)).toEqual({ stacks: 200, damageMultiplier: 7, damageBonusPercent: 600, dotPerSecond: 10000, dotPerTick: 2500 });
    expect(cg.bossCorrosionPreviewForTest(999, 1_000_000).stacks).toBe(200);
    expect(cg.bossCorrosionStacksForTest('cgMain', 5)).toBe(5);
    expect(cg.bossCorrosionStacksForTest('cgClone', 5)).toBe(5);
    expect(cg.bossCorrosionStacksForTest('cgSideOver', 250)).toBe(200);
    expect(cg.bossCorrosionStacksForTest('cgUltWheel', 19)).toBe(19);
    expect(cg.bossCorrosionStacksForTest('moon', 20)).toBe(0);
    const source = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
    expect(source).toContain("state.stacks = Math.min(CG_CONFIG.bossCorrosionCap, state.stacks + 1)");
    expect(source).toContain("isCgShot(s) ? (s.cgBossDamageMul || 1) : 1");
  });

  it('registers the local OGL/PSRD pipeline and disabled contaminated legacy frames', () => {
    const assets = cg.assetSpec();
    expect(assets.noExternalAssets).toBe(false);
    expect(assets.keys).toContain('cgBodyNormal');
    expect(assets.keys).toContain('cgCloneSpawn5');
    expect(assets.keys).toContain('cgVfxMainOrbBase');
    expect(assets.keys).toContain('cgInfectTendril3Clone');
    expect(assets.keys).toContain('cgInfectBurstMain');
    expect(assets.keys).toContain('cgChainHeadClone');
    expect(assets.keys).toContain('cgTendrilBarbMain');
    expect(assets.keys).toContain('cgMatNormalCrystal');
    expect(assets.keys).toContain('cgMatOverMetal8');
    expect(assets.keys).toContain('cgMatFormWing8');
    expect(assets.infectionManifest).toBe('assets/player/corrupt_gun/infection/cg_infection_manifest.json');
    expect(assets.materialManifest).toBe('assets/player/corrupt_gun/cg_material_manifest.json');
    expect(assets.ultimateManifest).toBe('assets/player/corrupt_gun/ult/cg_ultimate_manifest.json');
    expect(assets.processors).toContain('tools/process_corruptgun_infection_assets.py');
    expect(assets.processors).toContain('tools/process_corruptgun_ultimate_assets.py');
    expect(assets.externalDependencies).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'ogl', version: '1.0.11', license: 'Unlicense' }),
      expect.objectContaining({ name: 'psrdnoise', license: 'MIT' }),
    ]));
    expect(assets.disabledRuntimeFrames).toEqual(expect.arrayContaining(['cgDeathBoom8', 'cgStackBurst7']));
  });

  it('replaces lightning spread with prepared organic chain and tentacle assets', () => {
    const infection = cg.infectionSpec();
    expect(infection).toMatchObject({
      life: 0.86,
      growEnd: 0.2,
      holdEnd: 0.48,
      fadeStart: 0.48,
      fadeEnd: 0.82,
      maxTargets: 5,
      radius: 260,
      damageRatio: 0.6,
      nodeMain: 72,
      nodeClone: 80,
      hitMain: 98,
      hitClone: 108,
      linkSpacing: 18,
      maxLinks: 16,
    });
    expect(infection.assetKeys).toHaveLength(26);
    expect(infection.assetKeys).toEqual(expect.arrayContaining([
      'cgInfectTendril1Main', 'cgInfectTendril2Clone', 'cgInfectLinkClone',
      'cgInfectNodeMain', 'cgInfectHitClone', 'cgInfectBurstClone', 'cgChainHeadMain',
      'cgChainLinkClone', 'cgTendrilSpineMain', 'cgTendrilBarbClone',
    ]));
    expect(infection.render).toBe('sequential-sprite-chain-skeleton-with-overlapping-void-tentacle-modules-and-one-shot-particle-dissolve-no-lightning-stroke');
    expect(infection.themes.main.color).not.toBe(infection.themes.clone.color);
    const source = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
    expect(source).not.toContain('strokeCgInfectionPath');
    expect(source).not.toContain('drawCgInfectionBranches');
  });

  it('keeps every corruption damage path camera-stable while preserving local hit feedback', () => {
    expect(cg.cameraFeedbackSpec()).toEqual({
      damageShake: 0,
      directHitShake: 0,
      infectionHitShake: 0,
      corruptionDeathShake: 0,
      ultimateLaunchShake: 0,
      ultimateBurstShake: 0,
      ultimateFinaleShake: 14,
      ultimateSoulShake: 0,
      ultimateSoulHitStop: 0,
      summonShake: 2,
      keepsLocalHitStop: true,
    });
    const source = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
    const damageBlock = source.slice(source.indexOf('function corruptDamageForHit'), source.indexOf('function cgCorruptionDeathBlastEntries'));
    const deathBlock = source.slice(source.indexOf('function spawnCgDeathFx'), source.indexOf('function updateCorruptGunFx'));
    expect(damageBlock).not.toContain('screenShake');
    expect(deathBlock).not.toContain('screenShake');
  });

  it('implements the complete Dark Wheel timeline, damage and boss stacking contract', () => {
    const ultimate = cg.ultimateSpec();
    expect(ultimate).toMatchObject({
      kind: 'darkWheel', name: '暗蚀轮回', bombCd: 18.8, travel: 440,
      timeline: { cast: 0.5, flightMax: 0.603, burst: 0.3, form: 0.6, spin: 8, collapse: 0.4, finale: 1, soulhunt: 7.2, totalMax: 18.603 },
      orb: { damage: 220, speed: 730, r: 20, size: 96, pierce: 99 },
      burst: { radius: 430, damage: 650, hitStop: 0.06 },
      wheel: {
        size: 900, discSize: 540, innerDiscSize: 358,
        damageRadius: 500, damage: 250, tick: 0.4,
        slowRadius: 620, slowMultiplier: 0.3, slowLinger: 0.6,
        bladeSpeed: 4.1, bladeBodyWidth: 216, bladeBodyHeight: 104,
      },
      finale: { radius: 680, baseDamage: 900, damagePerAbsorbed: 20, bossMultiplier: 0.8, hitStop: 0.1, shake: 14 },
      phaseOneBossSequenceStacks: 19,
      fullBossSequenceStacks: 49,
    });
    expect(cg.ultimateTickCountForTest()).toBe(20);
    expect(cg.ultimateBossStackCountForTest()).toBe(19);
    expect(cg.ultimateBossStackCountForTest(0, true, 16, true, true, 30)).toBe(49);
    expect(cg.ultimateBossStackCountForTest(195)).toBe(200);
    expect(ultimate.render).toMatchObject({ spinMaster: 'cgUltWheelSteadyBase', spinMasterPixels: 768, visualEnvelope: 696, mobileLosslessMaster: true });
    expect(cg.ultimateFinaleDamageForTest(0)).toBe(900);
    expect(cg.ultimateFinaleDamageForTest(80)).toBe(2500);
    expect(cg.ultimateFinaleDamageForTest(80, true)).toBe(2000);
  });

  it('derives the second-stage soul count from bullets and unique absorbed enemies', () => {
    expect(cg.ultimateSoulCountForTest(0, 0)).toBe(8);
    expect(cg.ultimateSoulCountForTest(7, 0)).toBe(8);
    expect(cg.ultimateSoulCountForTest(8, 0)).toBe(9);
    expect(cg.ultimateSoulCountForTest(80, 2)).toBe(22);
    expect(cg.ultimateSoulCountForTest(999, 999)).toBe(30);
    expect(cg.ultimateSoulCountForTest(-10, -4)).toBe(8);

    expect(cg.ultimateSoulAbsorbEnemyForTest([
      { id: 'entered-and-killed', enteredCore: true, killedByUltimate: false },
      { id: 'entered-and-killed', enteredCore: false, killedByUltimate: true },
      { id: 'ultimate-kill', enteredCore: false, killedByUltimate: true },
      { id: 'boss', enteredCore: true, killedByUltimate: true, isBoss: true },
      { id: 'unrelated', enteredCore: false, killedByUltimate: false },
    ])).toEqual({ count: 2, ids: ['entered-and-killed', 'ultimate-kill'] });
  });

  it('publishes the complete 7.2-second soul-hunt visual and gameplay contract', () => {
    expect(cg.ultimateSecondSpec()).toMatchObject({
      name: '万魂蚀附',
      duration: 7.2,
      countFormula: '8 + floor(absorbedBullets / 8) + absorbedEnemies * 2; cap 30',
      maxSouls: 30,
      maxBossStacksAdded: 30,
      fullSequenceMaxStacks: 49,
      coreCaptureRadius: 184,
      seekRadius: 840,
      spawn: { start: 0.54, batchSize: 5, batchInterval: 0.28, emergeDuration: 0.78 },
      transition: { duration: 0.45, phaseOneOverlap: 0.88, portalHold: 2.2, portalFadeEnd: 2.8 },
      possession: { duration: 0.52, bossStagger: 0.1 },
      burst: { duration: 0.62, visualSize: 236 },
      damage: {
        primary: 140,
        splash: 70,
        splashRadius: 108,
        bossMultiplier: 0.55,
        primaryAppliesMark: true,
        primaryAddsBossStack: true,
        splashAppliesMark: false,
        splashAddsBossStack: false,
        infection: false,
        deathSpread: false,
        recursive: false,
        excludesPrimaryFromSplash: true,
      },
      feedback: { screenShake: 0, hitStop: 0 },
      lifecycle: ['delay', 'emerge', 'seek', 'possess', 'burst', 'dissolve'],
      quality: {
        high: { trailNodes: 7, burstParticles: 6, logicalSoulCap: 30 },
        medium: { trailNodes: 5, burstParticles: 4, logicalSoulCap: 30 },
        low: { trailNodes: 3, burstParticles: 2, logicalSoulCap: 30 },
      },
    });
  });

  it('shares soul targets evenly, ignores dead targets and lets every soul focus the Boss', () => {
    const targets = [
      { id: 'near', x: 360, y: 280, hp: 100 },
      { id: 'left', x: 160, y: 300, hp: 100 },
      { id: 'right', x: 560, y: 300, hp: 100 },
      { id: 'dead', x: 360, y: 240, hp: 0, dead: true },
    ];
    const assigned = cg.ultimateSoulTargetsForTest(8, targets);
    expect(assigned).toHaveLength(8);
    expect(new Set(assigned.slice(0, 3))).toEqual(new Set(['near', 'left', 'right']));
    expect(assigned).not.toContain('dead');
    const claims = assigned.reduce((result, id) => ({ ...result, [id]: (result[id] || 0) + 1 }), {});
    expect(Math.max(...Object.values(claims)) - Math.min(...Object.values(claims))).toBeLessThanOrEqual(1);
    expect(cg.ultimateSoulTargetsForTest(6, targets, { id: 'boss', hp: 1000000, isBoss: true })).toEqual(Array(6).fill('boss'));
  });

  it('uses the pre-hit Boss corrosion multiplier and keeps splash isolated', () => {
    expect(cg.ultimateSoulDamageForTest()).toEqual({ primary: 140, splash: 70, bossMultiplier: 1, stackBefore: 0 });
    expect(cg.ultimateSoulDamageForTest({ boss: true, stacks: 0 })).toEqual({ primary: 77, splash: 38.5, bossMultiplier: 0.55, stackBefore: 0 });
    const half = cg.ultimateSoulDamageForTest({ boss: true, stacks: 100 });
    expect(half).toMatchObject({ stackBefore: 100 });
    expect(half.primary).toBeCloseTo(308, 8);
    expect(half.splash).toBeCloseTo(154, 8);
    expect(half.bossMultiplier).toBeCloseTo(2.2, 8);
    const capped = cg.ultimateSoulDamageForTest({ boss: true, stacks: 999 });
    expect(capped).toMatchObject({ stackBefore: 200 });
    expect(capped.primary).toBeCloseTo(539, 8);
    expect(capped.splash).toBeCloseTo(269.5, 8);
    expect(capped.bossMultiplier).toBeCloseTo(3.85, 8);
    expect(cg.bossCorrosionStacksForTest('cgUltSoul', 30, 180)).toBe(200);
    expect(cg.bossCorrosionSpec().stackingSources).toContain('cgUltSoul');
  });

  it('continues launched soul-hunt across revival and cleans it at every hard boundary', () => {
    expect(cg.ultimateSoulCleanupForTest('cast', { revive: true })).toBe('cancel-refund');
    expect(cg.ultimateSoulCleanupForTest('soulhunt', { revive: true })).toBe('continue');
    expect(cg.ultimateSoulCleanupForTest('soulhunt', { switchCharacter: true })).toBe('cleanup');
    expect(cg.ultimateSoulCleanupForTest('soulhunt', { result: true })).toBe('cleanup');
    expect(cg.ultimateSoulCleanupForTest('soulhunt', { restart: true })).toBe('cleanup');
    expect(cg.ultimateSoulCleanupForTest('soulhunt')).toBe('cleanup');

    const source = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
    expect(source).toContain('setUltimateSoulhunt(');
  });

  it('detonates on 440px, elite or Boss and otherwise keeps piercing ordinary enemies', () => {
    expect(cg.ultimateDetonationForTest({ travelled: 439, elapsed: 0.4, tier: 2 })).toBe('pierce');
    expect(cg.ultimateDetonationForTest({ travelled: 440 })).toBe('distance');
    expect(cg.ultimateDetonationForTest({ travelled: 20, tier: 3 })).toBe('elite');
    expect(cg.ultimateDetonationForTest({ travelled: 20, isBoss: true })).toBe('boss');
    expect(cg.ultimateDetonationForTest({ travelled: 20, elapsed: 0.603 })).toBe('timeout');
    expect(cg.claimHitForTest({ id: 'ultimate-dedup' })).toEqual({ first: true, second: false, hits: 1 });
  });

  it('caps absorption damage at 80 while keeping all absorbed bullets in the finale formula', () => {
    expect(cg.ultimateAbsorbBonusForTest(0)).toBe(1);
    expect(cg.ultimateAbsorbBonusForTest(40)).toBe(1.4);
    expect(cg.ultimateAbsorbBonusForTest(80)).toBe(1.8);
    expect(cg.ultimateAbsorbBonusForTest(180)).toBe(1.8);
    expect(cg.ultimateFinaleDamageForTest(180)).toBe(4500);
    expect(cg.ultimatePullForTest(700, false)).toBe(520);
    expect(cg.ultimatePullForTest(679, false)).toBe(900);
    expect(cg.ultimatePullForTest(679, true)).toBe(1620);
    expect(cg.ultimateSpiralPullForTest(680, 'bullet', false)).toEqual({ radial: 520, tangential: 455, direction: 'clockwise' });
    const enemySpiral = cg.ultimateSpiralPullForTest(320, 'enemy', false);
    expect(enemySpiral).toMatchObject({ radial: 200, direction: 'clockwise' });
    expect(enemySpiral.tangential).toBeCloseTo(97.875, 6);
  });

  it('renders a stable crisp disc with continuous counter-rotating blade layers', () => {
    const ultimate = cg.ultimateSpec();
    expect(ultimate.render).toMatchObject({ spinMaster: 'cgUltWheelSteadyBase', spinMasterPixels: 768, visualEnvelope: 696, continuousRotation: true });
    expect(ultimate.render.passes).toEqual(expect.arrayContaining([
      'world-front-root-aligned-tapered-wakes-phase-afterimages-and-detached-dust',
      'world-front-harvester-metal-root-spine-edge-tip-material-passes',
    ]));
    const source = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
    expect(source).toContain('if (Number.isFinite(spec.steadyFrame))');
    expect(source).toContain('drawCgUltimateInboundTrails');
    const shader = readFileSync(new URL('../../tools/corruptgun_vfx/cg_vfx_engine.mjs', import.meta.url), 'utf8');
    expect(shader).toContain('outerP = rotate2d(-uPhase * 2.24) * p');
    expect(shader).toContain('innerP = rotate2d(uPhase * 3.24) * p');
  });

  it('keeps the V2 harvester blades material-separated with bounded trail and cut lifecycles', () => {
    const ultimate = cg.ultimateSpec();
    expect(ultimate.wheel).toMatchObject({
      bladeRadius: 314,
      bladeBodyWidth: 216,
      bladeBodyHeight: 104,
      bladeTrailSweep: 0.58,
      bladeTrailWidth: 26,
      bladeEnergyBaseAlpha: 0.17,
      bladeEnergyPulseAlpha: 0.10,
      bladeGlintPeriod: 0.42,
      bladeGlintSpan: 0.10,
      bladeGhostLag: 0.14,
      bladeGhostAlpha: 0.16,
      bladeRootRingSpeed: 2.1,
      bladeSpineFlowSpeed: 1.55,
      bladeTipBaseLength: 12,
      bladeTipPeakLength: 26,
      spaceCutLife: 0.46,
      spaceCutRadiusMin: 272,
      spaceCutRadiusMax: 382,
    });
    expect(ultimate.render).toMatchObject({
      textureGhosts: false,
      harvesterLayers: expect.arrayContaining([
        'black-steel-base',
        'variant-anchored-root-core',
        'transported-spine-packets',
        'independent-moving-edge-glints',
        'needle-tip-and-tip-shards',
        'root-aligned-tapered-wake',
        'phase-displaced-energy-edge-shadows',
        'detached-void-dust',
      ]),
      lowQualityKeeps: expect.arrayContaining([
        'root-core', 'spine-flow', 'moving-edge-glint', 'needle-tip',
        'one-phase-afterimage', 'one-detached-particle', 'three-segment-blade-wake',
      ]),
    });

    const source = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
    expect(source).toContain("addCgAssetFrames('cgUltHarvesterBase', 'ult/parts/cg_ult_harvester_base', 3)");
    expect(source).toContain("addCgAssetFrames('cgUltHarvesterEnergy', 'ult/parts/cg_ult_harvester_energy', 3)");
    expect(source).toContain('drawCgUltimateBladeWake');
    expect(source).toContain('drawCgUltimateHarvestBlade');
    expect(source).toContain('traceCgUltimateBladeWakeBand');
    expect(source).toContain('traceCgUltimateBladeSpine');
    expect(source).toContain('bladeTrailSegments: Object.freeze([7, 5, 3])');
    expect(source).toContain('bladeAfterimages: Object.freeze([2, 1, 1])');
    expect(source).toContain('bladeSpinePackets: Object.freeze([3, 2, 1])');
    expect(source).toContain('bladeRootArcs: Object.freeze([2, 1, 1])');
    expect(source).toContain('bladeDust: Object.freeze([4, 2, 1])');
    expect(source).toContain('bladeHubParticles: Object.freeze([3, 2, 1])');
    expect(source).toContain('bladeTipParticles: Object.freeze([2, 1, 1])');
    expect(source).toContain('bladeEdgeGlints: Object.freeze([2, 1, 1])');
    expect(source).toContain("type: 'wheelHitCut'");
    expect(source).not.toContain('const key = `cgUltScythe${1 + (index % 8)}`');
    expect(source).not.toContain('const blades = []');
    expect(source).not.toContain('const point = { x: u.x + Math.cos(a) * r');
    expect(source).toContain('const localTipX = profile.tipX * width, localTipY = profile.tipY * height');
    expect(source).toContain('* 0.22;');

    const lifecycle = source.slice(
      source.indexOf('function updateCgUltimateSpaceCuts'),
      source.indexOf('function drawCgUltimateSuctionStreaks'),
    );
    expect(lifecycle).toContain('cut.age += dt');
    expect(lifecycle).toContain('cut.life -= dt');
    expect(lifecycle).toContain('if (cut.life <= 0)');
    expect(lifecycle).toContain('u.spaceCuts.length >= cap');
    const reset = source.slice(source.indexOf('function resetCgUltimate'), source.indexOf('function castDarkWheel'));
    expect(reset).toContain('u.spaceCuts.length = 0');
    expect(reset).toContain('u.bladeCutT = 0');
    expect(reset).toContain('u.bladeCutSerial = 0');

    const pagesBuilder = readFileSync(new URL('../../tools/build_pages.py', import.meta.url), 'utf8');
    expect(pagesBuilder).toContain('(\"cgUltHarvesterBase\", \"ult/parts/cg_ult_harvester_base\", 3)');
    expect(pagesBuilder).toContain('(\"cgUltHarvesterEnergy\", \"ult/parts/cg_ult_harvester_energy\", 3)');
  });

  it('uses strongest-slow semantics, preserves post-launch revival, and clears only finale hazards', () => {
    expect(cg.ultimateSlowForTest(1, true, 0)).toEqual({ movementMultiplier: 0.3, linger: 0.6 });
    expect(cg.ultimateSlowForTest(0.25, true, 0)).toEqual({ movementMultiplier: 0.25, linger: 0.6 });
    expect(cg.ultimateSlowForTest(1, false, 0.59).movementMultiplier).toBe(0.3);
    expect(cg.ultimateSlowForTest(1, false, 0.6).movementMultiplier).toBe(1);
    expect(cg.ultimateCleanupForTest('cast', { revive: true })).toBe('cancel-refund');
    expect(cg.ultimateCleanupForTest('spin', { revive: true })).toBe('continue');
    expect(cg.ultimateCleanupForTest('spin', { switchCharacter: true })).toBe('cleanup');
    expect(cg.ultimateHazardPolicyForTest('spin')).toEqual({ enemyBullets: 'pull-and-consume', warnings: 'unchanged', lasers: 'unchanged' });
    expect(cg.ultimateHazardPolicyForTest('finale')).toEqual({ enemyBullets: 'clear', warnings: 'clear', lasers: 'clear' });
  });

  it('publishes grouped base, preserved optimization and second-stage ultimate assets', () => {
    const manifest = JSON.parse(readFileSync(new URL('../../assets/player/corrupt_gun/ult/cg_ultimate_manifest.json', import.meta.url), 'utf8'));
    expect(manifest).toMatchObject({ formatVersion: 2, character: 'corruptgun', ultimate: 'darkWheel' });
    expect(manifest.renderContract.spinMaster).toContain('768px');
    expect(manifest.assets['steady/cg_ult_wheel_steady_base.png']).toBeTruthy();
    expect(manifest.assets['steady/cg_ult_wheel_steady_energy.png']).toBeTruthy();
    expect(manifest.assets['steady/cg_ult_wheel_steady_detail.png']).toBeTruthy();
    expect(Object.keys(manifest.assetGroups)).toEqual(expect.arrayContaining(['base', 'opt', 'phase2']));
    expect(manifest.assetGroups.opt.paths).toHaveLength(30);
    expect(manifest.assetGroups.phase2.paths.length).toBeGreaterThanOrEqual(32);
    const groupedPaths = Object.values(manifest.assetGroups).flatMap(group => group.paths);
    expect(new Set(groupedPaths).size).toBe(groupedPaths.length);
    expect(new Set(groupedPaths)).toEqual(new Set(Object.keys(manifest.assets)));
    const auditedRuntimePaths = [...manifest.assetGroups.base.paths, ...manifest.assetGroups.phase2.paths]
      .filter(rel => !rel.startsWith('reference/'));
    expect(auditedRuntimePaths.every(rel => {
      const item = manifest.assets[rel];
      return item.residualGreenPixels === 0 && item.residualCyanPixels === 0;
    })).toBe(true);
    expect(manifest.assetGroups.opt.paths.every(rel => manifest.assets[rel].preservedUnmodified === true)).toBe(true);
    expect(manifest.sequences).toMatchObject({
      orb_stage: { frames: 6 }, orb_roll: { frames: 6 }, comet: { frames: 6 },
      shatter: { frames: 8 }, form: { frames: 8 }, form_b: { frames: 8 }, wheel: { frames: 8 }, wheel_inner: { frames: 8 },
      soul_emerge: { frames: 6 }, soul_flight: { frames: 6 }, soul_variants: { frames: 7 },
      soul_burst: { frames: 8 }, soul_transition: { frames: 11 },
    });
  });

  it('uses projection-specific orb assets and material-separated body layers', () => {
    expect(cg.projectionSpec()).toMatchObject({
      fieldDiameter: 232,
      particlesHigh: 10,
      particlesMedium: 7,
      particlesLow: 4,
      palette: 'void-black-deep-crimson-hologram',
    });
    expect(cg.projectionSpec().cloneOrbAtlas.base).toBe('cgVfxCloneOrbBase');
    expect(cg.materialSpec()).toMatchObject({
      manifest: 'assets/player/corrupt_gun/cg_material_manifest.json',
      forms: ['normal', 'overdrive', 'form-switch-1-8'],
    });
    expect(cg.materialSpec().layers).toEqual(expect.arrayContaining(['metal-sheen', 'central-crystal', 'muzzle', 'engine-ports', 'wing-energy']));
    const source = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
    expect(source).toContain("const bodyPrefix = clone ? 'cgCloneOrb'");
    expect(source).toContain("const spec = clone ? CG_VFX_CONFIG.atlas.cloneOrb");
  });

  it('publishes audited material layers and zero green/cyan projection residue', () => {
    const coreManifest = JSON.parse(readFileSync(new URL('../../assets/player/corrupt_gun/cg_manifest.json', import.meta.url), 'utf8'));
    const materialManifest = JSON.parse(readFileSync(new URL('../../assets/player/corrupt_gun/cg_material_manifest.json', import.meta.url), 'utf8'));
    const infectionManifest = JSON.parse(readFileSync(new URL('../../assets/player/corrupt_gun/infection/cg_infection_manifest.json', import.meta.url), 'utf8'));
    const cloneAssets = Object.entries(coreManifest.assets).filter(([key]) => key.startsWith('clone/') || key.startsWith('bullets/cg_clone_orb'));
    expect(cloneAssets.length).toBeGreaterThan(0);
    expect(cloneAssets.every(([, item]) => item.residualGreenPixels === 0 && item.residualCyanPixels === 0)).toBe(true);
    expect(Object.keys(materialManifest.assets)).toHaveLength(84);
    expect(Object.values(materialManifest.assets).every(item => item.residualGreenPixels === 0)).toBe(true);
    const cloneInfection = Object.entries(infectionManifest.assets).filter(([key]) => key.endsWith('_clone'));
    expect(cloneInfection.every(([, item]) => item.greenPixels === 0 && item.cyanPixels === 0)).toBe(true);
  });
});
