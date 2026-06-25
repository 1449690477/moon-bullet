// Feature: saint-wing-berserk-beam-rework, Property 10: Impact_Halo 扩散环单调性
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { loadInternals } from './setup.js';

describe('Property 10: halo monotonicity', () => {
  it('radius grows and alpha fades for every halo layer', () => {
    const I = loadInternals();
    fc.assert(fc.property(
      fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
      fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
      (a, b) => {
        const ip1 = Math.min(a, b);
        const ip2 = Math.max(a, b);
        for (const layer of ['core', 'ring1', 'ring2']) {
          expect(I.haloRingRadius(layer, ip1)).toBeLessThanOrEqual(I.haloRingRadius(layer, ip2) + 1e-9);
          expect(I.haloRingAlpha(layer, ip1)).toBeGreaterThanOrEqual(I.haloRingAlpha(layer, ip2) - 1e-9);
        }
        expect(I.haloRingRadius('core', 1 / 3)).toBeGreaterThanOrEqual(60);
        expect(I.haloRingRadius('ring1', 2 / 3)).toBeGreaterThanOrEqual(80);
        expect(I.haloRingRadius('ring2', 1)).toBeGreaterThanOrEqual(120);
      }
    ), { numRuns: 100 });
  });
});
