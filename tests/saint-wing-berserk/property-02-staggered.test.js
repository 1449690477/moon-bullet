// Feature: saint-wing-berserk-beam-rework, Property 2: 双发射器错相互斥
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { loadInternals, makeCtxIn } from './setup.js';

describe('Property 2: staggered launchers', () => {
  it('never fires both launchers or peaks both impacts at the same sampled time', () => {
    const I = loadInternals();
    fc.assert(fc.property(
      fc.array(fc.double({ min: 0.001, max: 0.04, noNaN: true, noDefaultInfinity: true }), { minLength: 50, maxLength: 180 }),
      (dts) => {
        const cycles = [I.initPulseCycle(0), I.initPulseCycle(1)];
        const w = { _beamBullet: [null, null] };
        I.onEnterPhase(cycles[0], 'init', makeCtxIn({ w, li: 0 }));
        for (const dt of dts) {
          I.advancePulseCycle(cycles[0], dt, makeCtxIn({ w, li: 0 }));
          I.advancePulseCycle(cycles[1], dt, makeCtxIn({ w, li: 1 }));
          expect(cycles[0].phase === 'fire' && cycles[1].phase === 'fire').toBe(false);
          expect(cycles[0].phase === 'impact' && cycles[0].phaseTime < 0.10 &&
                 cycles[1].phase === 'impact' && cycles[1].phaseTime < 0.10).toBe(false);
        }
      }
    ), { numRuns: 100 });
  });
});
