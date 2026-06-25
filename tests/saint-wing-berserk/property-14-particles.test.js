// Feature: saint-wing-berserk-beam-rework, Property 14: 粒子角度均匀分布 + perfLevel 数量分级
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { angleOf, loadInternals, makeCtxIn } from './setup.js';

describe('Property 14: impact particle distribution', () => {
  it('emits uniformly spaced particles with perf-level counts', () => {
    const I = loadInternals();
    fc.assert(fc.property(fc.integer({ min: 0, max: 2 }), (perfLevel) => {
      const cyc = { phase: 'impact', phaseTime: 0, aimTarget: { x: 300, y: 400, isDefault: false }, hasDamaged: false };
      const ctx = makeCtxIn({ perfLevel });
      I.onEnterPhase(cyc, 'fire', ctx);
      const N = ctx.calls.particles.length;
      expect(N).toBeGreaterThanOrEqual(perfLevel >= 2 ? 8 : 24);
      for (let i = 0; i < N; i++) {
        const [, , vx, vy] = ctx.calls.particles[i];
        const expected = (i / N) * Math.PI * 2;
        expect(Math.abs(angleOf(vx, vy) - expected)).toBeLessThan(1e-6);
      }
    }), { numRuns: 100 });
  });
});
