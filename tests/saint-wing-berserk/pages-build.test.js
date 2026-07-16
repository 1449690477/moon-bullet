import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const builderSource = readFileSync(new URL('../../tools/build_pages.py', import.meta.url), 'utf8');

function stage3LosslessPrefixes() {
  const start = builderSource.indexOf('DREAM_STAGE3_LOSSLESS_MOBILE_PREFIXES = (');
  const end = builderSource.indexOf('\n)', start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return [...builderSource.slice(start, end).matchAll(/["']([^"']+)["']/g)].map(match => match[1]);
}

describe('GitHub Pages mobile asset encoding', () => {
  it('keeps every Dream Stage 3 shark runtime layer lossless', () => {
    const prefixes = stage3LosslessPrefixes();
    const requiresLossless = path => prefixes.some(prefix => path.startsWith(prefix));

    expect(builderSource).toContain('return rel.startswith(DREAM_STAGE3_LOSSLESS_MOBILE_PREFIXES)');
    expect([
      'assets/dream_stage3/boss/dream_plush_shark_idle.png',
      'assets/dream_stage3/bullets/dream_plush_shark_tooth.png',
      'assets/dream_stage3/ui/dream_plush_shark_hp_fill.png',
      'assets/dream_stage3/vfx/dream_plush_shark_whirlpool_glow.png',
    ].every(requiresLossless)).toBe(true);
    expect(requiresLossless('assets/dream_stage3/backgrounds/dream_room_base.webp')).toBe(false);
  });
});
