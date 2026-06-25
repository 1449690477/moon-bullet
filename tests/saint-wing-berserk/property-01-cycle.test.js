// Feature: saint-wing-berserk-beam-rework, Property 1: 状态机循环顺序与总周期时长
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { loadInternals, makeCtxIn } from './setup.js';

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
