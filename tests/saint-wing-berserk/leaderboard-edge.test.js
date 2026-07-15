import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const edgeSource = readFileSync(new URL('../../supabase/functions/leaderboard-run/index.ts', import.meta.url), 'utf8');
const normalSql = readFileSync(new URL('../../leaderboard-security/08_allow_corruptgun.sql', import.meta.url), 'utf8');
const dreamSql = readFileSync(new URL('../../leaderboard-security/09_dream_leaderboard.sql', import.meta.url), 'utf8');
const dreamV2Sql = readFileSync(new URL('../../leaderboard-security/10_dream_v2_balance.sql', import.meta.url), 'utf8');
const dreamLevelTwoSql = readFileSync(new URL('../../leaderboard-security/11_dream_level_two.sql', import.meta.url), 'utf8');
const dreamLevelThreeSql = readFileSync(new URL('../../leaderboard-security/12_dream_level_three.sql', import.meta.url), 'utf8');
const productionCheck = readFileSync(new URL('../../tools/check_leaderboard_production.js', import.meta.url), 'utf8');

describe('leaderboard production contract', () => {
  it('publishes an explicit health contract for deployment drift checks', () => {
    expect(edgeSource).toContain('leaderboard-run-2026-07-15-dream-level3-v1');
    expect(edgeSource).toContain('action === "health"');
    expect(edgeSource).toContain('dream_leaderboard: dreamLeaderboardReady');
    expect(edgeSource).toContain('corruptgun: CHARACTERS.has("corruptgun")');
    expect(edgeSource).toContain('dream_clear_version: DREAM_ACTIVE_CLEAR_VERSION');
    expect(edgeSource).toContain('dream_stage_contract: DREAM_STAGE_CONTRACT_VERSION');
    expect(edgeSource).toContain('dream_stages: dreamStages');
    expect(edgeSource).toContain('dream_token_ttl_ms: DREAM_TOKEN_TTL_MS');
    expect(edgeSource).toContain('admin.rpc("dream_leaderboard_schema_version")');
    expect(edgeSource).toContain('admin.rpc("dream_leaderboard_stage_contract")');
    expect(productionCheck).toContain("const expectedVersion = 'leaderboard-run-2026-07-15-dream-level3-v1'");
    expect(productionCheck).toContain("const expectedDreamClearVersion = 'dream-01-v2'");
    expect(productionCheck).toContain("const expectedDreamStageContract = 'dream-03-v1'");
    expect(productionCheck).toContain('const expectedDreamStages = Object.freeze([');
    expect(productionCheck).toContain("stage_id: 'dream-01-seraph', clear_version: 'dream-01-v2', seed: 7130101");
    expect(productionCheck).toContain("stage_id: 'dream-02-zero-compile', clear_version: 'dream-02-v1', seed: 7130202");
    expect(productionCheck).toContain("stage_id: 'dream-03-plush-room'");
    expect(productionCheck).toContain("clear_version: 'dream-03-v1'");
    expect(productionCheck).toContain('seed: 7130303');
    expect(productionCheck).toContain('const missingDreamStages = expectedDreamStages.filter');
    expect(productionCheck).toContain('const expectedDreamTtlMs = 90 * 60 * 1000');
    expect(productionCheck).toContain('health.database?.dream_schema_version !== expectedDreamClearVersion');
    expect(productionCheck).toContain('health.capabilities?.dream_stage_contract !== expectedDreamStageContract');
    expect(productionCheck).toContain('health.database?.dream_stage_contract !== expectedDreamStageContract');
    expect(productionCheck).toContain('health.capabilities?.dream_stages');
    expect(productionCheck).toContain("reasons.includes('invalid stage')");
    expect(productionCheck).toContain("reasons.includes('invalid clear version')");
    expect(productionCheck).toContain("reasons.includes('invalid seed')");
  });

  it('allows corruptgun in normal and dream Edge Function routes', () => {
    expect(edgeSource).toContain('"skyward", "corruptgun"');
    expect(edgeSource).toContain('action === "dream-start"');
    expect(edgeSource).toContain('action === "dream-submit"');
    expect(edgeSource).toContain('character mismatch');
    expect(edgeSource).toContain('const DREAM_ACTIVE_CLEAR_VERSION = "dream-01-v2"');
    expect(edgeSource).toContain('const DREAM_STAGE_CONTRACT_VERSION = "dream-03-v1"');
    expect(edgeSource).toContain('const DREAM_TOKEN_TTL_MS = 90 * 60 * 1000');
    expect(edgeSource).toContain('["dream-01-seraph", { clearVersion: DREAM_ACTIVE_CLEAR_VERSION, seed: 7130101 }]');
    expect(edgeSource).toContain('["dream-02-zero-compile", { clearVersion: "dream-02-v1", seed: 7130202 }]');
    expect(edgeSource).toContain('["dream-03-plush-room", { clearVersion: "dream-03-v1", seed: 7130303 }]');
    expect(edgeSource).toContain('const releaseClaim = async');
    expect(edgeSource).toContain('.eq("submitted_at", consumedAt)');
    expect(edgeSource).toContain('await releaseClaim("score-update")');
    expect(edgeSource).toContain('await releaseClaim("score-insert")');
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
    expect(dreamLevelTwoSql).toContain("stage_id in ('dream-01-seraph', 'dream-02-zero-compile')");
    expect(dreamLevelTwoSql).toContain("clear_version in ('dream-01-v1', 'dream-01-v2', 'dream-02-v1')");
    expect(dreamLevelTwoSql).toContain('(stage_id = \'dream-02-zero-compile\' and clear_version = \'dream-02-v1\' and seed = 7130202)');
    expect(dreamLevelTwoSql).toContain('dream_runs_stage_contract_check');
    expect(dreamLevelTwoSql).toContain('dream_scores_stage_contract_check');
    expect(dreamLevelTwoSql).toContain('dream_leaderboard_stage_contract()');
    expect(dreamLevelTwoSql).toContain("select 'dream-02-v1'::text");
    expect(dreamLevelTwoSql).not.toMatch(/\bdelete\s+from\s+public\.dream_leaderboard\b/i);
    expect(dreamLevelTwoSql).not.toMatch(/\bupdate\s+public\.dream_leaderboard\b/i);
  });

  it('extends the stage contract to the plush-room third level without rewriting scores', () => {
    expect(dreamLevelThreeSql).toContain("stage_id in ('dream-01-seraph', 'dream-02-zero-compile', 'dream-03-plush-room')");
    expect(dreamLevelThreeSql).toContain("clear_version in ('dream-01-v1', 'dream-01-v2', 'dream-02-v1', 'dream-03-v1')");
    expect(dreamLevelThreeSql).toContain('seed in (7130101, 7130202, 7130303)');
    expect(dreamLevelThreeSql).toContain("(stage_id = 'dream-03-plush-room' and clear_version = 'dream-03-v1' and seed = 7130303)");
    expect(dreamLevelThreeSql).toContain("(stage_id = 'dream-03-plush-room' and clear_version = 'dream-03-v1')");
    expect(dreamLevelThreeSql).toContain('dream_runs_stage_contract_check');
    expect(dreamLevelThreeSql).toContain('dream_scores_stage_contract_check');
    expect(dreamLevelThreeSql).toContain('dream_leaderboard_stage_contract()');
    expect(dreamLevelThreeSql).toContain("select 'dream-03-v1'::text");
    expect(dreamLevelThreeSql).not.toMatch(/\bdelete\s+from\s+public\.dream_leaderboard\b/i);
    expect(dreamLevelThreeSql).not.toMatch(/\bupdate\s+public\.dream_leaderboard\b/i);
  });
});
