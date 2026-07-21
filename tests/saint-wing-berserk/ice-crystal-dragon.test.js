import { existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { loadIceDragonInternals } from './setup.js';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const TAU = Math.PI * 2;

function angleDelta(a, b) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

function pointOf(value) {
  return value?.head || value?.position || value;
}

function playerPointOf(value, trace) {
  return value?.player || trace?.player || trace?.origin || { x: 360, y: 960 };
}

function distance(a, b) {
  return Math.hypot(Number(a.x) - Number(b.x), Number(a.y) - Number(b.y));
}

function flattenStrings(value, result = []) {
  if (typeof value === 'string') result.push(value);
  else if (Array.isArray(value)) value.forEach(item => flattenStrings(item, result));
  else if (value && typeof value === 'object') Object.values(value).forEach(item => flattenStrings(item, result));
  return result;
}

function normalizeHitIds(result, targets) {
  const hits = Array.isArray(result) ? result : (result?.hits || []);
  return hits.map((hit, index) => {
    if (typeof hit === 'string') return hit;
    if (typeof hit === 'number') return targets[hit]?.id ?? hit;
    if (typeof hit === 'boolean') return hit ? targets[index]?.id : null;
    return hit?.id ?? hit?.targetId ?? null;
  }).filter(Boolean);
}

function logicHash(value) {
  if (typeof value === 'string') return value;
  return String(value?.logicHash ?? value?.hash ?? '');
}

function numericLeaves(value, result = []) {
  if (typeof value === 'number') result.push(value);
  else if (value && typeof value === 'object') Object.values(value).forEach(item => numericLeaves(item, result));
  return result;
}

function countOf(value) {
  return Array.isArray(value) ? value.length : Number(value ?? 0);
}

function normalizeAngle(value) {
  const angle = Number(value);
  return Number.isFinite(angle) ? ((angle % TAU) + TAU) % TAU : NaN;
}

function endpointAngleGapsDeg(values) {
  const angles = values.map(normalizeAngle).filter(Number.isFinite).sort((a, b) => a - b);
  if (angles.length !== 5) return [];
  return angles.map((angle, index) => {
    const next = angles[(index + 1) % angles.length] + (index === angles.length - 1 ? TAU : 0);
    return (next - angle) * 180 / Math.PI;
  });
}

function trajectorySamplesOf(value) {
  const samples = value?.trajectorySamples || value?.samples || value?.pathSamples || [];
  return Array.isArray(samples) ? samples.map(pointOf).filter(point => (
    Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y))
  )) : [];
}

function maxChordDeviation(samples) {
  if (samples.length < 3) return NaN;
  const start = samples[0];
  const end = samples.at(-1);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const chordLength = Math.hypot(dx, dy);
  if (chordLength < 1e-6) return NaN;
  return Math.max(...samples.slice(1, -1).map(point => (
    Math.abs(dx * (point.y - start.y) - dy * (point.x - start.x)) / chordLength
  )));
}

function curveHandedness(samples) {
  if (samples.length < 3) return 0;
  const start = samples[0];
  const end = samples.at(-1);
  let strongestCross = 0;
  for (const point of samples.slice(1, -1)) {
    const cross = (end.x - start.x) * (point.y - start.y)
      - (end.y - start.y) * (point.x - start.x);
    if (Math.abs(cross) > Math.abs(strongestCross)) strongestCross = cross;
  }
  return Math.abs(strongestCross) > 1e-6 ? Math.sign(strongestCross) : 0;
}

function splitTrajectoryContract(visual) {
  const raw = visual?.split?.trajectoryContract ?? visual?.split?.trajectory ?? {};
  return typeof raw === 'string' ? { kind: raw } : (raw || {});
}

function splitMetricEntries(contract) {
  const entries = contract.trajectories || contract.projectiles || contract.entries || [];
  return Array.isArray(entries) ? entries : [];
}

function firstFinite(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return NaN;
}

function numericRange(value) {
  return Array.isArray(value) ? value.map(Number).filter(Number.isFinite) : [];
}

describe('ice crystal dragon companion', () => {
  const dragon = loadIceDragonInternals();

  it('registers one orbiting companion and leaves it unequipped by default', () => {
    const registration = dragon.registrationSpec();
    expect(registration).toMatchObject({
      key: 'icedragon',
      defaultEquipped: false,
      singleUnit: true,
      followMode: 'orbit',
    });
    expect(registration.name).toMatch(/冰晶龙|寒渊/);
    expect(registration.pairedSides ?? false).toBe(false);
  });

  it('uses processed local assets and every declared runtime file exists', () => {
    const assets = dragon.assetSpec();
    expect(assets.runtimeRoot).toBe('assets/companions/ice_crystal_dragon');
    expect(assets.sourceFolder).toContain('冰晶龙开发文件夹');
    expect(assets.processor).toBe('tools/process_ice_crystal_dragon_assets.py');
    expect(assets.pipeline).toMatch(/despill/i);
    expect(assets.pipeline).toMatch(/procedural Canvas/i);
    expect(assets.referenceSheetsRuntime).toBe(false);
    expect(assets.noExternalAssets).toBe(true);
    expect(assets.keys.length).toBeGreaterThanOrEqual(8);
    expect(new Set(assets.keys).size).toBe(assets.keys.length);

    const files = [...new Set(flattenStrings(assets.runtimeFiles))];
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(file).not.toMatch(/(?:^|\/)(?:concept|ref)_/i);
      const absolute = resolve(ROOT, file.replace(/^\.\//, ''));
      expect(existsSync(absolute), `${file} is missing`).toBe(true);
      expect(statSync(absolute).size, `${file} is empty`).toBeGreaterThan(128);
    }
  });

  it('fires once per second normally and a video-matched 360ms staggered pair per berserk cycle', () => {
    const cadence = dragon.cadenceSpec();
    expect(cadence.normalInterval).toBeCloseTo(1, 6);
    expect(cadence.berserkInterval).toBeCloseTo(1, 6);
    expect(cadence.normalShots).toBe(1);
    expect(cadence.berserkShots).toBe(2);
    expect(cadence.berserkSecondDelay).toBeCloseTo(0.36, 6);
    expect(cadence.berserkSecondDelay).toBeGreaterThan(0);
    expect(cadence.berserkSecondDelay).toBeLessThan(cadence.berserkInterval);
  });

  it('locks the nearest live target and returns null when none are valid', () => {
    const origin = { x: 360, y: 920 };
    const targets = [
      { id: 'dead-near', x: 360, y: 870, hp: 0, r: 18 },
      { id: 'far', x: 120, y: 320, hp: 100, r: 20 },
      { id: 'near', x: 390, y: 720, hp: 100, r: 22 },
      { id: 'dead-flag', x: 360, y: 700, hp: 100, dead: true, r: 20 },
    ];
    expect(dragon.targetForTest(targets, origin)).toBe(targets[2]);
    expect(dragon.targetForTest(targets.filter(target => target.hp <= 0 || target.dead), origin)).toBeNull();
  });

  it('turns toward a target with a finite bounded heading change', () => {
    const dt = 1 / 60;
    const turnRate = Math.PI * 3;
    const shot = { x: 0, y: 0, vx: 0, vy: -560, speed: 560, heading: -Math.PI / 2, turnRate };
    const target = { x: 220, y: -220, hp: 100, r: 20 };
    const next = dragon.homingStepForTest({ ...shot }, target, dt);
    const heading = Number.isFinite(next.heading) ? next.heading : Math.atan2(next.vy, next.vx);
    expect([next.x, next.y, next.vx, next.vy, heading].every(Number.isFinite)).toBe(true);
    expect(Math.abs(angleDelta(heading, shot.heading))).toBeLessThanOrEqual(turnRate * dt + 1e-6);
    expect(Math.abs(angleDelta(Math.atan2(target.y, target.x), heading)))
      .toBeLessThan(Math.abs(angleDelta(Math.atan2(target.y, target.x), shot.heading)));
    expect(distance(next, target)).toBeLessThan(distance(shot, target));
  });

  it('uses swept collision so a fast dragon shot cannot tunnel through a target', () => {
    expect(dragon.sweptHitForTest(
      { x: 0, y: 100 },
      { x: 240, y: 100 },
      { x: 120, y: 100, r: 16 },
    )).toBe(true);
    expect(dragon.sweptHitForTest(
      { x: 0, y: 100 },
      { x: 240, y: 100 },
      { x: 120, y: 140, r: 16 },
    )).toBe(false);
  });

  it('releases five homing dragonets in an even release fan with bounded turn rates', () => {
    const visual = dragon.visualSpec();
    const splitVisual = visual.split || {};
    const contract = splitTrajectoryContract(visual);
    const kind = String(contract.kind ?? contract.mode ?? contract.shape ?? splitVisual.trajectory ?? '');
    expect(kind).toMatch(/homing|curved|petal|arc/i);
    expect(contract.homing ?? splitVisual.homing).toBe(true);
    expect(contract.explodeOnHit ?? splitVisual.explodeOnHit).toBe(true);
    const flightTime = firstFinite(contract.flightTime, splitVisual.flightTime, splitVisual.flightDuration);
    expect(flightTime).toBeGreaterThanOrEqual(0.58);
    expect(flightTime).toBeLessThanOrEqual(0.66);
    const manifestLead = firstFinite(contract.manifestLead, splitVisual.manifestLead, visual.impact?.manifestLead);
    expect(manifestLead).toBeGreaterThanOrEqual(0.08);
    expect(manifestLead).toBeLessThanOrEqual(0.14);
    const turnRates = numericRange(contract.turnRateRange ?? splitVisual.turnRateRange);
    expect(turnRates).toHaveLength(2);
    expect(turnRates[0]).toBeGreaterThanOrEqual(5);
    expect(firstFinite(contract.cruiseSpeed, splitVisual.cruiseSpeed)).toBeGreaterThanOrEqual(400);

    fc.assert(fc.property(
      fc.double({ min: -Math.PI, max: Math.PI, noNaN: true, noDefaultInfinity: true }),
      incomingAngle => {
        const origin = { x: 333, y: 444 };
        const splits = dragon.splitForTest(incomingAngle, origin, false);
        expect(splits).toHaveLength(5);
        const endAngles = [];
        for (const split of splits) {
          // 释放扇面：5 发围绕来向均匀 72°，计划锚在爆心
          expect(distance(split, origin)).toBeLessThanOrEqual(40);
          const endAngle = firstFinite(split.endAngle, split.angle);
          expect(Number.isFinite(endAngle)).toBe(true);
          endAngles.push(endAngle);
          // 追踪语义：初始航向有限、带转向速率与巡航/起步速度
          const heading = firstFinite(split.heading, split.start?.motionAngle, split.motionAngle);
          expect(Number.isFinite(heading)).toBe(true);
          expect(split.homing).toBe(true);
          expect(Number(split.turnRate)).toBeGreaterThanOrEqual(5);
          const cruise = firstFinite(split.cruiseSpeed, split.targetSpeed);
          expect(cruise).toBeGreaterThanOrEqual(400);
          const launch = firstFinite(split.launchSpeed);
          expect(launch).toBeGreaterThan(0);
          expect(launch).toBeLessThan(cruise); // 起步稍慢、离膛后加速到巡航
          const duration = firstFinite(split.flightDuration, split.flightTime, flightTime);
          expect(duration).toBeGreaterThanOrEqual(0.58);
          expect(duration).toBeLessThanOrEqual(0.66);
          // 起始姿态：贴着爆心外沿的离膛点，航向与释放扇面一致
          const start = split.start || {};
          expect(Number.isFinite(start.x)).toBe(true);
          expect(Number.isFinite(start.y)).toBe(true);
          expect(distance(start, origin)).toBeGreaterThan(4);
          expect(distance(start, origin)).toBeLessThanOrEqual(40);
          // 追踪积分：以该分裂弹自身参数单步转向，航向变化受限幅且逼近目标
          const target = {
            x: origin.x + Math.cos(heading + 0.9) * 300,
            y: origin.y + Math.sin(heading + 0.9) * 300,
            hp: 100, r: 24,
          };
          const probe = {
            x: start.x, y: start.y,
            vx: Math.cos(heading) * launch, vy: Math.sin(heading) * launch,
            heading, turnRate: split.turnRate, targetSpeed: cruise,
          };
          const next = dragon.homingStepForTest(probe, target, 1 / 60);
          const nextHeading = Number.isFinite(next.heading) ? next.heading : Math.atan2(next.vy, next.vx);
          expect(Math.abs(angleDelta(nextHeading, heading))).toBeLessThanOrEqual(split.turnRate / 60 + 1e-6);
          expect(distance(next, target)).toBeLessThan(distance(probe, target));
        }
        const gaps = endpointAngleGapsDeg(endAngles);
        expect(gaps).toHaveLength(5);
        for (const gap of gaps) {
          expect(gap).toBeGreaterThanOrEqual(64);
          expect(gap).toBeLessThanOrEqual(80);
        }
      },
    ), { numRuns: 48 });
  });

  it('homing splits curve onto enemies, detonate on swept contact, and splash with buffed damage', () => {
    // 释放扇面相对目标偏转 0.5rad：直线自由飞行必然全部脱靶，
    // 因此任何直击/收束都只能来自追踪行为本身。
    const result = dragon.splitBurstSimForTest({
      origin: { x: 360, y: 900 },
      incomingAngle: -Math.PI / 2 - 0.5,
      targets: [{ id: 'sim-mid', x: 360, y: 700, r: 30, hp: 999999 }],
      seconds: 1.4,
    });
    expect(result.spawned).toBe(5);
    expect(result.exploded).toBe(5); // 直击 + 寿命兜底，5 发最终全部爆开
    expect(result.directHits).toBeGreaterThanOrEqual(1); // 扫掠命中即爆真实生效
    expect(result.splashEvents).toBeGreaterThanOrEqual(result.directHits); // 爆开 AoE 覆盖被命中的敌人
    expect(result.converged).toBeGreaterThanOrEqual(2); // 多数分裂弹朝敌人收束而非直线飞散
    // 追踪转向证据：至少 4 发的航向在飞行中累计偏转超过 0.3rad
    const seriesById = new Map();
    for (const frame of result.traces) {
      for (const entry of frame) {
        if (!seriesById.has(entry.id)) seriesById.set(entry.id, []);
        seriesById.get(entry.id).push(entry.heading);
      }
    }
    let curvedCount = 0;
    for (const series of seriesById.values()) {
      let turned = 0;
      for (let i = 1; i < series.length; i++) turned += Math.abs(angleDelta(series[i], series[i - 1]));
      if (turned > 0.3) curvedCount++;
    }
    expect(curvedCount).toBeGreaterThanOrEqual(4);
    // 新伤害配置生效：分裂弹 splash 不低于 splashBase 840（旧值 280 的 3 倍）
    expect(result.splashAmounts.length).toBeGreaterThan(0);
    expect(Math.min(...result.splashAmounts)).toBeGreaterThanOrEqual(840);
  });

  it('applies circular splash damage at the radius-plus-hitbox boundary', () => {
    const origin = { x: 300, y: 300 };
    const targets = [
      { id: 'center', x: 300, y: 300, hp: 100, r: 24 },
      { id: 'touching', x: 403, y: 300, hp: 100, r: 24 },
      { id: 'outside', x: 406, y: 300, hp: 100, r: 24 },
      { id: 'dead', x: 310, y: 300, hp: 0, r: 24 },
    ];
    const hits = normalizeHitIds(dragon.aoeHitsForTest(origin, targets, 80), targets);
    expect(hits).toEqual(expect.arrayContaining(['center', 'touching']));
    expect(hits).not.toContain('outside');
    expect(hits).not.toContain('dead');
  });

  it('settles a direct impact and its split burst only once', () => {
    const result = dragon.stressForTest({ scenario: 'single-impact', seconds: 2, seed: 0x51a7 });
    const events = result.damageEvents || [];
    const direct = events.filter(event => event.type === 'direct');
    const splash = events.filter(event => event.type === 'splash');
    const splitBursts = countOf(result.splitBursts ?? result.splitSpawnEvents);
    expect(direct).toHaveLength(1);
    expect(splitBursts).toBe(1);
    expect(result.explosionCount ?? new Set(splash.map(event => event.explosionId)).size).toBe(5);
    const splashKeys = splash.map(event => `${event.explosionId}:${event.targetId}`);
    expect(new Set(splashKeys).size).toBe(splashKeys.length);
  });

  it('runs a real berserk cycle as two staggered shots with two independent five-way bursts', () => {
    const result = dragon.stressForTest({ scenario: 'berserk-cycle', seconds: 0.9, seed: 0xb375e4 });
    const times = result.mainSpawnTimes || [];
    expect(times).toHaveLength(2);
    expect(times[1] - times[0]).toBeCloseTo(0.36, 6);
    expect(countOf(result.splitBursts ?? result.splitSpawnEvents)).toBe(2);
    expect(result.explosionCount).toBe(10);
  });

  it('orbits independently of the player without teleporting or rigid attachment', () => {
    const trace = dragon.orbitTraceForTest({ seconds: 8, dt: 1 / 60, path: 'stationary', seed: 0x1ce });
    expect(trace.points.length).toBeGreaterThanOrEqual(240);
    const heads = trace.points.map(pointOf);
    const offsets = trace.points.map((point, index) => {
      const player = playerPointOf(point, trace);
      return { x: heads[index].x - player.x, y: heads[index].y - player.y };
    });
    expect(heads.every(point => Number.isFinite(point.x) && Number.isFinite(point.y))).toBe(true);
    expect(Math.max(...offsets.map(point => point.x)) - Math.min(...offsets.map(point => point.x))).toBeGreaterThan(90);
    expect(Math.max(...offsets.map(point => point.y)) - Math.min(...offsets.map(point => point.y))).toBeGreaterThan(50);
    const steps = heads.slice(1).map((point, index) => distance(point, heads[index]));
    expect(Math.max(...steps)).toBeLessThan(24);

    const moving = dragon.orbitTraceForTest({
      seconds: 5,
      dt: 1 / 60,
      path: 'dash-right',
      playerVelocity: { x: 320, y: 0, duration: 3 },
      seed: 0x1ce,
    });
    const lags = (moving.points || []).map(point => {
      const player = point.player;
      const center = point.center || point.orbitCenter;
      return player && center ? distance(player, center) : null;
    }).filter(Number.isFinite);
    const maxLag = Number.isFinite(moving.maxCenterLag) ? moving.maxCenterLag : Math.max(...lags);
    const finalLag = Number.isFinite(moving.finalCenterLag) ? moving.finalCenterLag : lags.at(-1);
    expect(maxLag).toBeGreaterThan(3);
    expect(finalLag).toBeLessThan(maxLag);
  });

  it('keeps the sampled spine continuous, evenly spaced, and free of sharp joints', () => {
    const sample = dragon.spineSampleForTest({ seconds: 3, dt: 1 / 60, seed: 0x5a1e });
    const segments = sample.segments || [];
    expect(segments.length).toBeGreaterThanOrEqual(10);
    const distances = segments.slice(1).map((segment, index) => distance(segment, segments[index]));
    const spacing = Number(sample.spacing) || distances.reduce((sum, value) => sum + value, 0) / distances.length;
    expect(spacing).toBeGreaterThan(0);
    for (const value of distances) {
      expect(value).toBeGreaterThan(spacing * 0.55);
      expect(value).toBeLessThan(spacing * 1.45);
    }
    const bendAngles = [];
    for (let i = 1; i < segments.length - 1; i++) {
      const a = { x: segments[i - 1].x - segments[i].x, y: segments[i - 1].y - segments[i].y };
      const b = { x: segments[i + 1].x - segments[i].x, y: segments[i + 1].y - segments[i].y };
      const cosine = Math.max(-1, Math.min(1, (a.x * b.x + a.y * b.y) / Math.max(1e-9, Math.hypot(a.x, a.y) * Math.hypot(b.x, b.y))));
      bendAngles.push(Math.acos(cosine) * 180 / Math.PI);
    }
    expect(Math.min(...bendAngles)).toBeGreaterThan(120);
  });

  it('keeps gameplay identical across quality levels and makes trails non-damaging', () => {
    const seed = 0x1ce5eed;
    const hashes = ['high', 'medium', 'low', 'ultra'].map(quality => logicHash(dragon.qualityLogicHashForTest(quality, seed)));
    expect(hashes.every(hash => hash.length >= 8)).toBe(true);
    expect(new Set(hashes).size).toBe(1);
    expect(logicHash(dragon.qualityLogicHashForTest('high', seed))).toBe(hashes[0]);

    const visual = dragon.visualSpec();
    const trail = visual.trail || visual.projectileTrail;
    expect(trail).toMatchObject({ damaging: false, collisionRadius: 0 });
    const layers = flattenStrings(visual.materialLayers || visual.layers).join(' ').toLowerCase();
    expect(layers).toMatch(/armor.*source-over|source-over.*armor/);
    expect(layers).toMatch(/ice.*additive|additive.*ice/);
    expect(layers).toMatch(/mist|fog/);
    expect(layers).toMatch(/ribbon|trail/);
  });

  it('locks the separated dragon head and fully procedural soft-effect lifecycle', () => {
    const visual = dragon.visualSpec();
    expect(visual.projectile).toMatchObject({
      headTexture: 'icdBulletMain',
      fullProjectileTexture: false,
      proceduralEnvelope: true,
      targetSilhouetteRatio: 5.87,
      headAnchor: 0.23,
      formTime: 0.09,
      genericComet: false,
    });
    expect(visual.projectile.proceduralLayers).toEqual(expect.arrayContaining([
      'volume ribbon', 'crystal facets', 'animated fracture veins', 'moving reflections', 'ice mist', 'detached particles',
    ]));
    expect(visual.projectile.normalSize[0] / visual.projectile.normalSize[1]).toBeGreaterThanOrEqual(5);
    expect(visual.split).toMatchObject({
      count: 5, headTexture: 'icdBulletSplit', proceduralEnvelope: true,
      genericStar: false,
    });
    expect(visual.split.normalSize[0]).toBeGreaterThanOrEqual(88);
    expect(visual.split.normalSize[1]).toBeGreaterThanOrEqual(30);
    expect(visual.split.normalSize[0] / visual.split.normalSize[1]).toBeGreaterThanOrEqual(2.4);
    expect(visual.split.headSize[0]).toBeGreaterThanOrEqual(76);
    expect(visual.split.originGap).toBeGreaterThanOrEqual(44);
    expect(visual.split.trailNodeCap).toBeGreaterThanOrEqual(6);
    expect(visual.split.trailNodeCap).toBeLessThanOrEqual(16);
    expect(visual.split.travelRange[0]).toBeGreaterThanOrEqual(190);
    expect(visual.split.travelRange[1]).toBeLessThanOrEqual(265);
    expect(visual.split.layers).toEqual(expect.arrayContaining([
      'crystal dragon head', 'metal reflection', 'fracture flow', 'ice fog ribbon', 'detached shards',
    ]));
    const trajectory = splitTrajectoryContract(visual);
    const trajectoryKind = String(trajectory.kind ?? trajectory.mode ?? trajectory.shape ?? visual.split.trajectory ?? '');
    expect(trajectoryKind).toMatch(/homing|curved|petal|arc/i);
    expect(trajectory.homing ?? visual.split.homing).toBe(true);
    expect(trajectory.sweptHit ?? (visual.split.hitPadding != null)).toBe(true);
    expect(trajectory.explodeOnHit ?? true).toBe(true);
    expect(firstFinite(trajectory.flightTime, visual.split.flightTime)).toBeGreaterThanOrEqual(0.58);
    expect(firstFinite(trajectory.flightTime, visual.split.flightTime)).toBeLessThanOrEqual(0.66);
    expect(firstFinite(trajectory.manifestLead, visual.split.manifestLead)).toBeGreaterThanOrEqual(0.08);
    expect(firstFinite(trajectory.manifestLead, visual.split.manifestLead)).toBeLessThanOrEqual(0.14);
    const gapRange = numericRange(trajectory.endAngleGapRangeDeg ?? visual.split.endAngleGapRangeDeg);
    expect(gapRange).toHaveLength(2);
    expect(gapRange[0]).toBeGreaterThanOrEqual(64);
    expect(gapRange[1]).toBeLessThanOrEqual(80);
    expect(firstFinite(trajectory.releaseFanCount, visual.split.count)).toBe(5);
    const turnRates = numericRange(trajectory.turnRateRange ?? visual.split.turnRateRange);
    expect(turnRates).toHaveLength(2);
    expect(turnRates[0]).toBeGreaterThanOrEqual(5);
    expect(turnRates[1]).toBeGreaterThan(turnRates[0]);
    expect(firstFinite(trajectory.cruiseSpeed, visual.split.cruiseSpeed)).toBeGreaterThanOrEqual(400);
    expect(visual.impact).toMatchObject({
      procedural: true, textureFrames: 0, centralDragonApparition: true, genericRing: false,
    });
    expect(visual.explosion).toMatchObject({
      procedural: true, textureFrames: 0, lateVioletMist: true, genericRing: false,
    });
    expect(visual.explosion.duration).toBeGreaterThanOrEqual(1);
    expect(visual.bodyMaterials).toMatchObject({
      metalReflection: true,
      crystalRefraction: true,
      singleEnergyCore: true,
      proceduralTailRibbon: true,
      tailMistParticles: true,
      asymmetricSilhouette: true,
      shoulderMane: true,
      continuousNeckBridge: true,
      articulatedNeckArmor: 1,
      perspectiveDepthScale: true,
    });

    const source = readFileSync(resolve(ROOT, 'index.html'), 'utf8');
    expect(source).not.toMatch(/icdBullet(?:Stream|Impact|Explosion)/);
    expect(source).toMatch(/function iceDragonDrawEnergyEnvelope\(/);
    expect(source).toMatch(/function iceDragonDrawCodeCrystalShard\(/);
  });

  it('holds object ceilings under berserk stress and clears all transient state', () => {
    const performance = dragon.performanceSpec();
    expect(performance.usesSharedPerfBudget).toBe(true);
    expect(performance.qualityPreservesLogic).toBe(true);
    const result = dragon.stressForTest({ scenario: 'berserk', seconds: 20, cleanupSeconds: 5, enemies: 12, seed: 0xbad1ce });
    const peaks = result.peaks || result;
    const budget = result.budget || performance.caps || performance;
    const checks = [
      [peaks.mainProjectiles ?? peaks.peakMain, budget.mainProjectiles ?? budget.mainProjectileCap],
      [peaks.splitProjectiles ?? peaks.peakSplits, budget.splitProjectiles ?? budget.splitProjectileCap],
      [peaks.trailNodes ?? peaks.peakTrailNodes, budget.trailNodes ?? budget.trailNodeCap],
      [peaks.effects ?? peaks.peakFx, budget.effects ?? budget.effectCap],
    ];
    for (const [peak, cap] of checks) {
      expect(Number.isFinite(peak), `missing stress peak in ${JSON.stringify(peaks)}`).toBe(true);
      expect(Number.isFinite(cap), `missing stress cap in ${JSON.stringify(budget)}`).toBe(true);
      expect(peak).toBeLessThanOrEqual(cap);
    }
    expect(peaks.mainProjectiles ?? peaks.peakMain).toBeGreaterThan(0);
    expect(peaks.splitProjectiles ?? peaks.peakSplits).toBeGreaterThan(0);
    const remaining = result.remainingAfterCleanup;
    if (typeof remaining === 'number') expect(remaining).toBe(0);
    else {
      const values = numericLeaves(remaining);
      expect(values.length).toBeGreaterThan(0);
      expect(values.every(value => value === 0)).toBe(true);
    }
  });
});
