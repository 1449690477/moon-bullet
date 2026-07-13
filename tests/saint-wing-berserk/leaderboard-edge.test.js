import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const edgeSource = readFileSync(new URL('../../supabase/functions/leaderboard-run/index.ts', import.meta.url), 'utf8');
const normalSql = readFileSync(new URL('../../leaderboard-security/08_allow_corruptgun.sql', import.meta.url), 'utf8');
const dreamSql = readFileSync(new URL('../../leaderboard-security/09_dream_leaderboard.sql', import.meta.url), 'utf8');
const dreamV2Sql = readFileSync(new URL('../../leaderboard-security/10_dream_v2_balance.sql', import.meta.url), 'utf8');
const productionCheck = readFileSync(new URL('../../tools/check_leaderboard_production.js', import.meta.url), 'utf8');

describe('leaderboard production contract', () => {
  it('publishes an explicit health contract for deployment drift checks', () => {
    expect(edgeSource).toContain('leaderboard-run-2026-07-13-dream-v2');
    expect(edgeSource).toContain('action === "health"');
    expect(edgeSource).toContain('dream_leaderboard: dreamLeaderboardReady');
    expect(edgeSource).toContain('corruptgun: CHARACTERS.has("corruptgun")');
    expect(edgeSource).toContain('dream_clear_version: DREAM_ACTIVE_CLEAR_VERSION');
    expect(edgeSource).toContain('dream_token_ttl_ms: DREAM_TOKEN_TTL_MS');
    expect(edgeSource).toContain('admin.rpc("dream_leaderboard_schema_version")');
    expect(productionCheck).toContain("const expectedVersion = 'leaderboard-run-2026-07-13-dream-v2'");
    expect(productionCheck).toContain("const expectedDreamClearVersion = 'dream-01-v2'");
    expect(productionCheck).toContain('const expectedDreamTtlMs = 90 * 60 * 1000');
    expect(productionCheck).toContain('health.database?.dream_schema_version !== expectedDreamClearVersion');
  });

  it('allows corruptgun in normal and dream Edge Function routes', () => {
    expect(edgeSource).toContain('"skyward", "corruptgun"');
    expect(edgeSource).toContain('action === "dream-start"');
    expect(edgeSource).toContain('action === "dream-submit"');
    expect(edgeSource).toContain('character mismatch');
    expect(edgeSource).toContain('const DREAM_ACTIVE_CLEAR_VERSION = "dream-01-v2"');
    expect(edgeSource).toContain('const DREAM_TOKEN_TTL_MS = 90 * 60 * 1000');
  });

  it('ships both database migrations required by the production function', () => {
    expect(normalSql).toContain("'motherlife','skyward','corruptgun'");
    expect(normalSql).toContain('CREATE TRIGGER trg_leaderboard_sanity');
    expect(dreamSql).toContain('create table if not exists public.dream_leaderboard_runs');
    expect(dreamSql).toContain('create table if not exists public.dream_leaderboard');
    expect(dreamSql).toContain("'motherlife', 'skyward', 'corruptgun'");
    expect(dreamV2Sql).toContain("clear_version in ('dream-01-v1', 'dream-01-v2')");
    expect(dreamV2Sql).toContain('validate constraint dream_runs_version_check');
    expect(dreamV2Sql).toContain('validate constraint dream_scores_version_check');
    expect(dreamV2Sql).toContain('dream_leaderboard_schema_version()');
    expect(dreamV2Sql).not.toMatch(/\bdelete\s+from\s+public\.dream_leaderboard\b/i);
    expect(dreamV2Sql).not.toMatch(/\bupdate\s+public\.dream_leaderboard\b/i);
  });
});
