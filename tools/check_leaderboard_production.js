#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function readConst(name) {
  const match = html.match(new RegExp(`const\\s+${name}\\s*=\\s*'([^']+)'`));
  if (!match) throw new Error(`Missing ${name} in index.html`);
  return match[1];
}

const base = readConst('SUPABASE_URL');
const key = readConst('SUPABASE_PUBLISHABLE_KEY');
const expectedVersion = 'leaderboard-run-2026-07-15-dream-level3-v1';
const expectedDreamClearVersion = 'dream-01-v2';
const expectedDreamStageContract = 'dream-03-v1';
const expectedDreamStages = Object.freeze([
  Object.freeze({ stage_id: 'dream-01-seraph', clear_version: 'dream-01-v2', seed: 7130101 }),
  Object.freeze({ stage_id: 'dream-02-zero-compile', clear_version: 'dream-02-v1', seed: 7130202 }),
  Object.freeze({ stage_id: 'dream-03-plush-room', clear_version: 'dream-03-v1', seed: 7130303 }),
]);
const expectedDreamStageThree = expectedDreamStages[2];
const expectedDreamTtlMs = 90 * 60 * 1000;
const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
};

async function readJson(response) {
  const text = await response.text();
  try { return text ? JSON.parse(text) : {}; }
  catch { return { raw: text }; }
}

async function main() {
  const failures = [];
  const report = {};

  const healthResponse = await fetch(`${base}/functions/v1/leaderboard-run/health`, {
    method: 'POST',
    headers,
    body: '{}',
  });
  const health = await readJson(healthResponse);
  report.health = { status: healthResponse.status, body: health };
  if (!healthResponse.ok) failures.push(`health endpoint returned ${healthResponse.status}`);
  if (health.edge_version !== expectedVersion) failures.push(`Edge version is ${health.edge_version || 'missing'}, expected ${expectedVersion}`);
  if (health.capabilities?.corruptgun !== true) failures.push('corruptgun is missing from the deployed Edge allowlist');
  if (health.capabilities?.dream_leaderboard !== true) failures.push('deployed Edge Function cannot read dream_leaderboard');
  if (health.capabilities?.dream_clear_version !== expectedDreamClearVersion) failures.push(`Dream clear version is ${health.capabilities?.dream_clear_version || 'missing'}, expected ${expectedDreamClearVersion}`);
  if (health.capabilities?.dream_stage_contract !== expectedDreamStageContract) failures.push(`Dream stage contract is ${health.capabilities?.dream_stage_contract || 'missing'}, expected ${expectedDreamStageContract}`);
  const deployedDreamStages = Array.isArray(health.capabilities?.dream_stages) ? health.capabilities.dream_stages : [];
  const missingDreamStages = expectedDreamStages.filter((expected) => !deployedDreamStages.some((stage) => (
    stage?.stage_id === expected.stage_id
    && stage?.clear_version === expected.clear_version
    && Number(stage?.seed) === expected.seed
  )));
  if (missingDreamStages.length) {
    failures.push(`deployed Edge Function is missing dream stage contracts: ${missingDreamStages.map((stage) => `${stage.stage_id} / ${stage.clear_version} / ${stage.seed}`).join(', ')}`);
  }
  if (health.capabilities?.dream_token_ttl_ms !== expectedDreamTtlMs) failures.push(`Dream token TTL is ${health.capabilities?.dream_token_ttl_ms || 'missing'}, expected ${expectedDreamTtlMs}`);
  if (health.database?.dream_schema_version !== expectedDreamClearVersion) failures.push(`Dream database schema is ${health.database?.dream_schema_version || 'missing'}, expected ${expectedDreamClearVersion}`);
  if (health.database?.dream_stage_contract !== expectedDreamStageContract) failures.push(`Dream database stage contract is ${health.database?.dream_stage_contract || 'missing'}, expected ${expectedDreamStageContract}`);

  const tableResponse = await fetch(`${base}/rest/v1/dream_leaderboard?select=id&limit=0`, { headers });
  const tableBody = await readJson(tableResponse);
  report.dreamTable = { status: tableResponse.status, body: tableBody };
  if (!tableResponse.ok) failures.push(`dream_leaderboard REST check returned ${tableResponse.status}`);

  // Deliberately invalid wing: validates the level-three route and corruptgun allowlist without creating a run row.
  const routeResponse = await fetch(`${base}/functions/v1/leaderboard-run/dream-start`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      stage_id: expectedDreamStageThree.stage_id,
      clear_version: expectedDreamStageThree.clear_version,
      seed: expectedDreamStageThree.seed,
      character: 'corruptgun',
      wing_loadout: ['__deployment_probe__'],
      client_version: 'production-readiness-probe',
    }),
  });
  const route = await readJson(routeResponse);
  const reasons = Array.isArray(route.reasons) ? route.reasons : [];
  report.dreamLevelThreeRoute = { status: routeResponse.status, body: route };
  if (routeResponse.status !== 400 || !reasons.includes('invalid wing loadout')) {
    failures.push('dream-start level-three route did not reach the current validator');
  }
  if (reasons.includes('invalid stage')) failures.push('dream-start rejected the level-three stage id');
  if (reasons.includes('invalid clear version')) failures.push('dream-start rejected the level-three clear version');
  if (reasons.includes('invalid seed')) failures.push('dream-start rejected the level-three seed');
  if (reasons.includes('invalid character')) failures.push('dream-start rejected corruptgun');

  console.log(JSON.stringify({ ok: failures.length === 0, failures, report }, null, 2));
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, failures: [error.message] }, null, 2));
  process.exitCode = 1;
});
