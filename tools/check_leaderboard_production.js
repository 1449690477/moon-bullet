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
const expectedVersion = 'leaderboard-run-2026-07-13-dream-v2';
const expectedDreamClearVersion = 'dream-01-v2';
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
  if (health.capabilities?.dream_token_ttl_ms !== expectedDreamTtlMs) failures.push(`Dream token TTL is ${health.capabilities?.dream_token_ttl_ms || 'missing'}, expected ${expectedDreamTtlMs}`);
  if (health.database?.dream_schema_version !== expectedDreamClearVersion) failures.push(`Dream database schema is ${health.database?.dream_schema_version || 'missing'}, expected ${expectedDreamClearVersion}`);

  const tableResponse = await fetch(`${base}/rest/v1/dream_leaderboard?select=id&limit=0`, { headers });
  const tableBody = await readJson(tableResponse);
  report.dreamTable = { status: tableResponse.status, body: tableBody };
  if (!tableResponse.ok) failures.push(`dream_leaderboard REST check returned ${tableResponse.status}`);

  // Deliberately invalid wing: validates the route and corruptgun allowlist without creating a run row.
  const routeResponse = await fetch(`${base}/functions/v1/leaderboard-run/dream-start`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      stage_id: 'dream-01-seraph',
      clear_version: expectedDreamClearVersion,
      seed: 7130101,
      character: 'corruptgun',
      wing_loadout: ['__deployment_probe__'],
      client_version: 'production-readiness-probe',
    }),
  });
  const route = await readJson(routeResponse);
  const reasons = Array.isArray(route.reasons) ? route.reasons : [];
  report.dreamRoute = { status: routeResponse.status, body: route };
  if (routeResponse.status !== 400 || !reasons.includes('invalid wing loadout')) {
    failures.push('dream-start route did not reach the current validator');
  }
  if (reasons.includes('invalid character')) failures.push('dream-start rejected corruptgun');

  console.log(JSON.stringify({ ok: failures.length === 0, failures, report }, null, 2));
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, failures: [error.message] }, null, 2));
  process.exitCode = 1;
});
