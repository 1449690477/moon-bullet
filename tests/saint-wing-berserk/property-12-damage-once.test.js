// Feature: saint-wing-berserk-beam-rework, Property 12: 单 Pulse_Cycle 至多 1 次伤害,且仅在 impact 起始
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { loadInternals, makeCtxIn } from './setup.js';

describe('Property 12: damage is impact-only and once per cycle', () => {
  it('matches hitBoss calls to fire -> impact transitions for real targets', () => {
    const I = loadInternals();
    fc.assert(fc.property(
      fc.array(fc.double({ min: 0.001, max: 0.05, noNaN: true, noDefaultInfinity: true }), { minLength: 90, maxLength: 220 }),
      (dts) => {
        const cyc = I.initPulseCycle(0);
        const ctx = makeCtxIn({ enemies: [{ x: 350, y: 500 }] });
        I.onEnterPhase(cyc, 'init', ctx);
        let impacts = 0;
        for (const dt of dts) {
          const before = cyc.phase;
          I.advancePulseCycle(cyc, dt, ctx);
          if (before === 'fire' && cyc.phase === 'impact') impacts++;
        }
        expect(ctx.calls.hitBoss.length).toBe(impacts);
        for (const call of ctx.calls.hitBoss) {
          expect(call).toEqual([20, 350, 500, true]);
        }
      }
    ), { numRuns: 100 });
  });

  it('does not damage when the cycle aims at a default point', () => {
    const I = loadInternals();
    const cyc = I.initPulseCycle(0);
    const ctx = makeCtxIn({ enemies: [] });
    I.onEnterPhase(cyc, 'init', ctx);
    for (let i = 0; i < 160; i++) I.advancePulseCycle(cyc, 0.025, ctx);
    expect(ctx.calls.hitBoss.length).toBe(0);
  });
});
