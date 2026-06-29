// Feature: saint-wing-berserk-beam-rework, Property 1: 状态机循环顺序与总周期时长
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { loadInternals, loadMotherLifeInternals, makeCtxIn } from './setup.js';

describe('Property 1: Pulse_Cycle order and total duration', () => {
  it('follows charge -> fire -> impact -> cooldown -> charge with a 1.25s period', () => {
    const I = loadInternals();
    fc.assert(fc.property(
      fc.array(fc.double({ min: 0.016, max: 0.05, noNaN: true, noDefaultInfinity: true }), { minLength: 80, maxLength: 140 }),
      (dts) => {
        const cyc = I.initPulseCycle(0);
        const ctx = makeCtxIn();
        I.onEnterPhase(cyc, 'init', ctx);
        let elapsed = 0;
        let chargeAt = 0;
        let measured = null;
        for (const dt of dts) {
          const before = cyc.phase;
          I.advancePulseCycle(cyc, dt, ctx);
          elapsed += dt;
          if (before !== cyc.phase) {
            expect(cyc.phase).toBe(I.nextOf(before));
            if (cyc.phase === 'charge') {
              const transitionAt = elapsed - cyc.phaseTime;
              measured = transitionAt - chargeAt;
              chargeAt = transitionAt;
              break;
            }
          }
        }
        expect(measured).not.toBeNull();
        expect(measured).toBeGreaterThanOrEqual(1.23);
        expect(measured).toBeLessThanOrEqual(1.27);
      }
    ), { numRuns: 100 });
  });
});

describe('Mother of Life core properties', () => {
  const I = loadMotherLifeInternals();

  it('uses the specified low-HP damage bands', () => {
    expect(I.hpMultiplier(0.71, false)).toBe(1);
    expect(I.hpMultiplier(0.70, false)).toBe(1.6);
    expect(I.hpMultiplier(0.40, false)).toBe(2.5);
    expect(I.hpMultiplier(0.20, false)).toBe(4);
    expect(I.hpMultiplier(0.10, false)).toBe(3);
    expect(I.hpMultiplier(0.55, true)).toBe(3);
  });

  it('grows from four to eight ribbons every six seconds and never exceeds eight', () => {
    fc.assert(fc.property(
      fc.double({ min: 0, max: 90, noNaN: true, noDefaultInfinity: true }),
      (elapsed) => {
        const result = I.advanceRibbonCount(4, 0, elapsed);
        expect(result.count).toBe(Math.min(8, 4 + Math.floor(elapsed / 6)));
        expect(result.count).toBeGreaterThanOrEqual(4);
        expect(result.count).toBeLessThanOrEqual(8);
      }
    ));
  });

  it('maps the ultimate timeline to the four documented phases', () => {
    expect(I.ultimatePhase(0.59)).toBe('expand');
    expect(I.ultimatePhase(0.6)).toBe('drain');
    expect(I.ultimatePhase(4.5)).toBe('gather');
    expect(I.ultimatePhase(5.3)).toBe('burst');
    expect(I.ultimatePhase(6)).toBe('done');
  });

  it('always ranks bosses above elites and elites above nearby normal enemies', () => {
    const normal = { x: 0, y: 0, hp: 99999, tier: 1 };
    const elite = { x: 700, y: 1200, hp: 1, tier: 4 };
    const boss = { x: 700, y: 1200, hp: 1, tier: 0, isBoss: true };
    expect(I.targetScore(elite, 0, 0)).toBeGreaterThan(I.targetScore(normal, 0, 0));
    expect(I.targetScore(boss, 0, 0)).toBeGreaterThan(I.targetScore(elite, 0, 0));
  });

  it('raises reverse healing capacity during overdrive', () => {
    expect(I.healCap('reverse', 160, true)).toBeGreaterThan(I.healCap('reverse', 160, false));
    expect(I.healCap('ultimate', 160, false)).toBeCloseTo(57.6, 6);
  });

  it('caps visual and ultimate target selection at eight with boss priority', () => {
    const targets = Array.from({ length: 20 }, (_, i) => ({ x: i * 20, y: 100, hp: 100 + i, tier: i % 4 }));
    const boss = { x: 700, y: 900, hp: 1, tier: 0, isBoss: true };
    const selected = I.topTargets([...targets, boss], 8, 0, 0);
    expect(selected).toHaveLength(8);
    expect(selected[0]).toBe(boss);
  });

  it('keeps surviving target slots and refills dead slots without duplicates', () => {
    const kept = [{ id: 'a', hp: 10 }, { id: 'dead', hp: 0 }, { id: 'b', hp: 10 }];
    const candidates = Array.from({ length: 12 }, (_, i) => ({ id: `n${i}`, x: i, y: 0, hp: 20 + i, tier: 0 }));
    const selected = I.refillTargets(kept, candidates, 8, 0, 0);
    expect(selected).toHaveLength(8);
    expect(selected[0]).toBe(kept[0]);
    expect(selected[1]).toBe(kept[2]);
    expect(new Set(selected).size).toBe(selected.length);
  });

  it('uses the documented V2 drain multiplier and performance budgets', () => {
    expect(I.config.ultimateDrainBoost).toBe(1.5);
    expect(I.perfBudget(0).particles).toBe(180);
    expect(I.perfBudget(1).particles).toBe(110);
    expect(I.perfBudget(2).particles).toBe(60);
  });

  it('keeps ribbon bodies wide and tapered instead of laser-thin', () => {
    expect(I.ribbonWidth('normal', 0.5)).toBeGreaterThanOrEqual(9);
    expect(I.ribbonWidth('resonanceMain', 0.5)).toBeGreaterThanOrEqual(22);
    expect(I.ribbonWidth('ultimate', 0.5)).toBeGreaterThanOrEqual(14);
    expect(I.ribbonWidth('normal', 0)).toBeLessThan(I.ribbonWidth('normal', 0.5));
  });
});
