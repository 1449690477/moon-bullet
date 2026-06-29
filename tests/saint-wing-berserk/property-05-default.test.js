// Feature: saint-wing-berserk-beam-rework, Property 5: 无候选 -> 默认点 + 跳过伤害
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { loadInternals, makeCtxIn } from './setup.js';

describe('Property 5: default target skips damage', () => {
  it('returns the default point and does not call hitBoss on impact', () => {
    const I = loadInternals();
    fc.assert(fc.property(
      fc.double({ min: 0, max: 720, noNaN: true, noDefaultInfinity: true }),
      fc.double({ min: 30, max: 1280, noNaN: true, noDefaultInfinity: true }),
      (emitWX, emitWY) => {
        const target = I.selectAimTarget(emitWX, emitWY, [], null, 'mobs');
        expect(target).toEqual({ x: emitWX, y: Math.max(20, emitWY - 900), isDefault: true });
        const cyc = { phase: 'impact', phaseTime: 0, aimTarget: target, hasDamaged: false };
        const ctx = makeCtxIn({ emitWX, emitWY, enemies: [] });
        I.onEnterPhase(cyc, 'fire', ctx);
        expect(ctx.calls.hitBoss.length).toBe(0);
      }
    ), { numRuns: 100 });
  });
});
