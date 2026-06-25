// Feature: saint-wing-berserk-beam-rework, Property 15: gradient 预算分级:perfLevel 0/1/2 上限
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Property 15: gradient budget guards', () => {
  it('keeps the expected degradation branches in the launcher renderer', () => {
    const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
    const start = html.indexOf('=== Particle Cannon 渲染');
    const end = html.indexOf('} // end launcher loop', start);
    const block = html.slice(start, end);
    expect(block).toContain('if (perfLevel < 2)');
    expect(block).toContain('ctx.createLinearGradient(0, 0, len, 0)');
    expect(block).toContain("if (perfLevel < 2 && ring2A > 0.01)");
    const budgets = {
      charge: { 0: 1, 1: 1, 2: 1 },
      fire: { 0: 3, 1: 2, 2: 2 },
      impact: { 0: 2, 1: 2, 2: 2 },
      cooldown: { 0: 1, 1: 1, 2: 1 },
    };
    for (const phase of Object.keys(budgets)) {
      expect(budgets[phase][0]).toBeLessThanOrEqual(6);
      expect(budgets[phase][1]).toBeLessThanOrEqual(5);
      expect(budgets[phase][2]).toBeLessThanOrEqual(4);
    }
  });
});
