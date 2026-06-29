// Feature: saint-wing-berserk-beam-rework, Property 4: 目标筛选最近性 + 0.5 像素 tie-breaking
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { loadInternals } from './setup.js';

describe('Property 4: nearest valid target', () => {
  it('selects a target within the 0.5px^2 nearest tie tolerance', () => {
    const I = loadInternals();
    fc.assert(fc.property(
      fc.double({ min: 0, max: 720, noNaN: true, noDefaultInfinity: true }),
      fc.double({ min: 120, max: 1200, noNaN: true, noDefaultInfinity: true }),
      fc.array(fc.record({
        x: fc.double({ min: 0, max: 720, noNaN: true, noDefaultInfinity: true }),
        y: fc.double({ min: 21, max: 1270, noNaN: true, noDefaultInfinity: true }),
      }), { minLength: 1, maxLength: 30 }),
      (emitWX, emitWY, enemies) => {
        const candidates = enemies.filter((e) => e.y > 20 && e.y < emitWY);
        fc.pre(candidates.length > 0);
        const target = I.selectAimTarget(emitWX, emitWY, enemies, null, 'mobs');
        const d2 = (target.x - emitWX) ** 2 + (target.y - emitWY) ** 2;
        const minD2 = Math.min(...candidates.map((e) => (e.x - emitWX) ** 2 + (e.y - emitWY) ** 2));
        expect(d2).toBeLessThanOrEqual(minD2 + 0.5);
        expect(target.isDefault).toBe(false);
      }
    ), { numRuns: 100 });
  });
});
