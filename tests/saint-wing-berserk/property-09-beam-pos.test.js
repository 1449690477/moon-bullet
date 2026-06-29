// Feature: saint-wing-berserk-beam-rework, Property 9: Beam_Bullet 线性插值与边界
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { loadInternals } from './setup.js';

describe('Property 9: beam bullet interpolation', () => {
  it('linearly interpolates only during fire', () => {
    const I = loadInternals();
    fc.assert(fc.property(
      fc.record({
        x: fc.double({ min: -2000, max: 2000, noNaN: true, noDefaultInfinity: true }),
        y: fc.double({ min: -2000, max: 2000, noNaN: true, noDefaultInfinity: true }),
      }),
      fc.record({
        x: fc.double({ min: -2000, max: 2000, noNaN: true, noDefaultInfinity: true }),
        y: fc.double({ min: -2000, max: 2000, noNaN: true, noDefaultInfinity: true }),
      }),
      fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
      (emit, aim, t) => {
        const pos = I.beamBulletPos('fire', t * 0.15, emit, aim);
        expect(pos.curX).toBeCloseTo(emit.x + (aim.x - emit.x) * t, 9);
        expect(pos.curY).toBeCloseTo(emit.y + (aim.y - emit.y) * t, 9);
        expect(pos.progress).toBeCloseTo(t, 9);
        expect(I.beamBulletPos('charge', t * 0.15, emit, aim)).toBeNull();
        expect(I.beamBulletPos('impact', t * 0.15, emit, aim)).toBeNull();
        expect(I.beamBulletPos('cooldown', t * 0.15, emit, aim)).toBeNull();
      }
    ), { numRuns: 100 });
  });
});
