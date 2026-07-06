import { describe, expect, it } from 'vitest';
import { loadSkywardInternals } from './setup.js';

describe('skyward paladin character spec', () => {
  const skyward = loadSkywardInternals();

  it('registers the sixth playable character with the planned baseline stats', () => {
    const spec = skyward.characterSpec();
    expect(spec).toMatchObject({
      key: 'skyward',
      weapon: 'skyward',
      maxHp: 138,
      speed: 420,
      slowSpeed: 246,
      shootCd: 0.12,
      selectableDigit: 6,
      avatar: 'skywardAvatar',
      cutin: 'skywardCutin',
      ultKind: 'skywardAegis',
    });
    expect(spec.name).toContain('苍穹圣巡');
  });

  it('exposes body, module, bullet, and vfx assets from the skyward runtime folder', () => {
    const assets = skyward.assetSpec();
    expect(assets.runtimeRoot).toBe('assets/player/skyward_paladin');
    expect(assets.body).toEqual(expect.arrayContaining([
      'skywardBodyNormal',
      'skywardBodyOverdrive',
      'skywardBodyNormalGlow',
      'skywardBodyOverdriveGlow',
      'skywardCoreOrb',
      'skywardCoreOrbGlow',
      'skywardHaloRing',
    ]));
    expect(assets.materialLayers).toEqual(expect.arrayContaining([
      'base-source-over',
      'derived-crystal-glow-mask',
      'alpha-feathered-despill',
      'warm-gold-flow',
    ]));
    expect(assets.modules).toHaveLength(6);
    expect(assets.crystalWings).toEqual(expect.arrayContaining([
      'skywardCrystalWing1',
      'skywardCrystalWing6',
    ]));
    expect(assets.bullets).toEqual(expect.arrayContaining([
      'skywardLanceS',
      'skywardLanceSGlow',
      'skywardLanceHeavy',
      'skywardLanceHeavyGlow',
      'skywardWingBlade1',
      'skywardFeatherBlade1',
      'skywardModuleBlade',
      'skywardChainLanceS',
      'skywardChainLanceM',
      'skywardBlinkSwordBody',
      'skywardBlinkSwordBodyGlow',
      'skywardBlinkSwordStreak',
    ]));
    expect(assets.stellarBlink).toEqual(expect.arrayContaining([
      'skywardBlinkPortalRing',
      'skywardBlinkDashTrail',
      'skywardBlinkDashWispL',
      'skywardBlinkWingOpen1',
      'skywardBlinkWingBurst',
      'skywardBlinkSwordTrail',
      'skywardBlinkHitBurst',
      'skywardBlinkCharge5',
      'skywardBlinkFloatCharge5',
      'skywardBlinkChargeBar5',
    ]));
    expect(assets.ultimateAegis).toEqual(expect.arrayContaining([
      'skywardAegisBarrierPanel',
      'skywardAegisFlowStrip',
      'skywardAegisProjector1',
      'skywardAegisBurstL',
    ]));
    expect(assets.vfx).toEqual(expect.arrayContaining(['skywardLightWingTrail', 'skywardChainFlowLong', 'skywardChainFlowOverdrive']));
    expect(assets.disabledRuntimeSprites).toContain('skywardLightWingTrail-as-persistent-wing');
  });

  it('defines a dynamic wide-wing visual stack instead of a static sprite swap', () => {
    const visual = skyward.visualSpec();
    expect(visual.moduleCount).toBe(6);
    expect(visual.dynamicNotStaticPng).toBe(true);
	    expect(visual.layers).toEqual(expect.arrayContaining([
	      'bodyBase',
	      'bodyCrystalGlow',
	      'bodyCrystalFloatFront',
	      'centerSpineFlow',
	      'frontHaloFrontArc',
	      'goldFlowAndMetalRim',
	      'coreEmission',
    ]));
    expect(visual.materialSeparation.crystal).toContain('glow mask');
    expect(visual.glowBuffer.reducedOnLowQuality).toBe(true);
    expect(visual.v3ArtifactFixes).toEqual(expect.arrayContaining([
      'no-persistent-light-wing-trail-sprite',
      'no-rear-extra-ring',
      'no-overdrive-lower-right-detached-ring',
    ]));
    expect(visual.ringPolicy).toMatchObject({
      primary: 'texture-aligned-crown-augment',
      rearRing: false,
      persistentLargeRingSprites: false,
    });
    expect(visual.moduleRigSpec).toMatchObject({
      mode: 'six-hardpoint-spring-follow',
      usesVisibleMuzzle: true,
    });
    expect(visual.moduleRigSpec.primaryModules).toBe(4);
    expect(visual.moduleRigSpec.rearWeaponHardpoints).toBe(2);
	    expect(visual.moduleRigSpec.spring).toBeGreaterThan(20);
	    expect(visual.overdriveBodyScale).toBeGreaterThan(visual.normalBodyScale);
	    expect(visual.v4NormalBodyScale).toMatchObject({ hitboxChanged: false });
	    expect(visual.v4NormalBodyScale.width).toBeLessThan(122);
	    expect(visual.v4NormalBodyScale.heightMul).toBeLessThan(1);
	    expect(visual.bodyCrystalFloatSpec.mode).toContain('independent');
	    expect(visual.centerFlowSpec.mode).toContain('spine');
	    expect(visual.haloFloatSpec.mode).toContain('metal');
	  });

  it('separates normal sacred-lance fire from overdrive wing-blade fire', () => {
    const normal = skyward.normalFireSpec();
    expect(normal.fireInterval).toBeCloseTo(0.12);
	    expect(normal.loop.join(' ')).toContain('coreLargeLance');
	    expect(normal.loop.join(' ')).toContain('six visible modules');
	    expect(normal.visualProfiles).toEqual(expect.arrayContaining(['coreLargeLance', 'moduleThinLance']));
	    expect(normal.corePierce).toBeGreaterThanOrEqual(8);
	    expect(normal.moduleBounceCount).toBe(5);

		    const overdrive = skyward.overdriveFireSpec();
	    expect(overdrive.fireInterval).toBeLessThan(normal.fireInterval);
	    expect(overdrive.lanceCount).toBeGreaterThanOrEqual(9);
	    expect(overdrive.giantCenterLance).toMatchObject({ kind: 'sky_lance_giant', pierce: 8 });
		    expect(overdrive.loop.join(' ')).toContain('lance fallback');
	    expect(overdrive.moduleBounceCount).toBe(10);
		  });

  it('locks bullet kinds and performance budgets for low-end devices', () => {
    const kinds = skyward.bulletKindSpec();
	    expect(kinds.normal).toEqual(['sky_lance', 'sky_lance_side', 'sky_module_lance']);
	    expect(kinds.overdrive).toEqual(expect.arrayContaining(['sky_lance_heavy', 'sky_lance_giant', 'sky_wing_blade', 'sky_feather_blade', 'sky_module_lance']));
	    expect(kinds.skill).toEqual(['sky_blink_sword']);
	    expect(kinds.layeredDraw).toEqual(expect.arrayContaining([
		      'base-sprite-source-over',
	      'material-energy-stream-underlay',
	      'derived-crystal-glow-mask',
	      'tip-flare',
		      'tail-flow-plume',
		      'blade-edge-outline',
		      'crystal-hit-burst',
		    ]));

	    const perf = skyward.performanceSpec();
	    expect(perf.maxShotsOverdrive).toBeGreaterThan(perf.maxShotsNormal);
	    expect(perf.trailNodes[0]).toBeGreaterThan(perf.trailNodes[2]);
	    expect(perf.lowQualityBulletScale).toBeLessThan(1);
	  });

  it('exposes V5 module, pierce, bounce, crown, and arc-blade policies', () => {
    const moduleForm = skyward.moduleFormSpec();
    expect(moduleForm.count).toBe(6);
    expect(moduleForm.normal.allFire).toBe(true);
    expect(moduleForm.overdrive.allFire).toBe(true);
    expect(moduleForm.overdrive.engineTrail).toContain('thruster');

    const pierce = skyward.pierceScalingSpec();
    expect(pierce.multiplier).toContain('2^');
    expect(pierce.normalMaxMul).toBeGreaterThanOrEqual(16);
    expect(pierce.duplicateTargetGuard).toBe(true);

    const bounce = skyward.bounceSpec();
    expect(bounce.kind).toBe('sky_module_lance');
    expect(bounce.normal).toMatchObject({ maxBounces: 5, damageRule: 'doubles-each-bounce' });
    expect(bounce.overdrive).toMatchObject({ maxBounces: 10, damageRule: 'doubles-each-bounce-faster' });
    expect(bounce.chainFx).toContain('no-lightning-chain');
    expect(bounce.lightningChainDisabled).toBe(true);
    expect(bounce.materialSprites).toEqual(expect.arrayContaining(['skywardChainLanceS', 'skywardChainFlowLong']));

    const crown = skyward.crownAugmentSpec();
    expect(crown.extraRearRing).toBe(false);
    expect(crown.policy).toContain('baked-halo');

	    const arc = skyward.arcBladeOrientationSpec();
	    expect(arc.kinds).toEqual(expect.arrayContaining(['sky_wing_blade', 'sky_feather_blade']));
	    expect(arc.spin).toContain('disabled');
	    expect(arc.fallback).toContain('active-replaced');
	  });

  it('exposes the Space skill as five-charge stellar blink with homing swords', () => {
    const blink = skyward.stellarBlinkSpec();
    expect(blink.name).toBe('星轨跃迁');
    expect(blink.input).toBe('Space');
    expect(blink.aimMode).toContain('hold-space');
    expect(blink.aimDistanceFixed).toBe(380);
    expect(blink.movementLockWhileAiming).toBe(true);
    expect(blink.interactionV2).toMatchObject({
      holdToAim: true,
      mouseOrbitTarget: true,
      fixedRadiusLanding: true,
      releaseToBlink: true,
      movementLockedWhileHolding: true,
      desktopMousePilotCompatible: true,
      pointerLockDeltaAim: true,
      blueRangeCircle: true,
      landingCircle: true,
    });
    expect(blink.maxCharges).toBe(5);
    expect(blink.rechargeTime).toBeCloseTo(3.5);
    expect(blink.dashDistance).toBe(380);
    expect(blink.dashTime).toBeCloseTo(0.13);
    expect(blink.invulnTime).toBe(1);
    expect(blink.materializeTime).toBeCloseTo(0.20);
    expect(blink.landingWingLife).toBeCloseTo(0.58);
    expect(blink.swordsPerBlink).toBe(10);
    expect(blink.swordTurnRate).toBeGreaterThanOrEqual(6);
    expect(blink.launch).toContain('visible hover modules');
    expect(blink.visualFixV2).toMatchObject({
      portalOpenClose: true,
      warpMask: true,
      landingWingBurst: true,
      floatingChargeUi: true,
      floatingArrowChargeUi: true,
    });
    expect(blink.assets).toEqual(expect.arrayContaining(['skywardBlinkPortalRing', 'skywardBlinkSwordBody', 'skywardBlinkWingOpen1-4', 'skywardBlinkFloatCharge1-5', 'skywardBlinkChargeBar0-5']));
  });

  it('exposes the X ultimate as a ten-second optical aegis with bullet empowerment', () => {
    const ult = skyward.ultimateSpec();
    expect(ult.name).toBe('圣域折光壁');
    expect(ult.input).toBe('X');
    expect(ult.duration).toBe(10);
    expect(ult.cooldown).toBe(25);
    expect(ult.cooldownStartsOnCast).toBe(true);
    expect(ult.blocksEnemyBullets).toBe(true);
    expect(ult.forcesOverdrive).toBe(true);
    expect(ult.empoweredShots.damageMul).toBeGreaterThan(1.4);
    expect(ult.empoweredShots.fireIntervalMul).toBeLessThan(1);
    expect(ult.empoweredShots.homingTurnRate).toBeGreaterThan(5);
    expect(ult.moduleSlots).toHaveLength(6);
    expect(ult.visualV2).toMatchObject({
      primaryShieldBody: 'skywardAegisReferenceFull',
      waterRippleMembrane: true,
      elasticImpactDent: true,
      strongerBluePierceTrail: true,
    });
    expect(ult.assets).toEqual(expect.arrayContaining(['skywardAegisReferenceFull', 'skywardAegisBarrierPanel', 'skywardAegisProjector1-4']));
  });
	});
