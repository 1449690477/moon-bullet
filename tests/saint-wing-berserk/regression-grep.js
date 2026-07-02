import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const suiyiTechCapture = readFileSync(new URL('../../tools/capture_suiyi_tech_mobs_acceptance.js', import.meta.url), 'utf8');
const randomBalanceCapture = readFileSync(new URL('../../tools/capture_random_balance_acceptance.js', import.meta.url), 'utf8');
const miguaCapture = readFileSync(new URL('../../tools/capture_migua_acceptance.js', import.meta.url), 'utf8');
const leaderboardRunFunction = readFileSync(new URL('../../supabase/functions/leaderboard-run/index.ts', import.meta.url), 'utf8');
function fail(message) {
  console.error(message);
  process.exit(1);
}
const start = html.indexOf('function drawSaintWing()');
const end = html.indexOf('function updateScFx(dt)', start);
if (start < 0 || end < 0) {
  fail('Could not locate drawSaintWing/updateScFx boundaries');
}

const block = html.slice(start, end);
const withoutComments = block
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '');
const oldPhase = /\b(sustain|finalburst|dissipate)\b/.exec(withoutComments);
if (oldPhase) {
  const prefix = block.slice(0, oldPhase.index);
  const line = html.slice(0, start + prefix.length).split('\n').length;
  fail(`Old continuous-beam phase "${oldPhase[1]}" found near index.html:${line}`);
}

if (!/leftSrc\s*=\s*\{\s*sx:\s*411,\s*sy:\s*20,\s*sw:\s*99,\s*sh:\s*260\s*\}/.test(block)) {
  fail('leftSrc crop literal changed');
}
if (!/rightSrc\s*=\s*\{\s*sx:\s*601,\s*sy:\s*20,\s*sw:\s*111,\s*sh:\s*260\s*\}/.test(block)) {
  fail('rightSrc crop literal changed');
}

if (!/motherhive:\s*false/.test(html)) {
  fail('motherhive default equipment flag missing');
}
if (!/\{\s*key:\s*'motherhive',\s*name:\s*'母巢蝶环'[\s\S]*exclusive:\s*'生命之母专属'/.test(html)) {
  fail('motherhive wing option or exclusive label missing');
}
for (const key of ['mhrFrontFlowerBud', 'mhrFrontFlowerOpen1', 'mhrFrontFlowerOpen2', 'mhrFrontFlowerOpen3', 'mhrFrontFlowerOverload', 'mhrFrontFlowerBurst']) {
  if (!html.includes(key)) fail(`${key} asset key missing`);
}
for (const key of ['mhrV3FlowerBud', 'mhrV3FlowerOpen1', 'mhrV3FlowerOpen2', 'mhrV3FlowerOverload', 'mhrV3FlowerBurst', 'mhrV3Butterfly1', 'mhrV3ButterflyTrail1', 'mhrV3RibbonTrailLong', 'mhrV3VortexRingBand', 'mhrV3VortexCurlBand', 'mhrV3HeadCrown', 'mhrVortexArm1', 'mhrVortexCore1', 'mhrFlowRibbon1', 'mhrCrystalShard1', 'mhrBurstCore1']) {
  if (!html.includes(key)) fail(`${key} V3 asset key missing`);
}
for (const key of ['mhrBhDisk01', 'mhrBhDisk02', 'mhrBhDisk03', 'mhrBhArm01', 'mhrBhArm02', 'mhrBhArm03', 'mhrBhArm04', 'mhrBhCore01', 'mhrBhCore02', 'mhrBhInnerRing01', 'mhrBhCenterGlow01', 'mhrBhBurst01', 'mhrBhBurst02', 'mhrButterflyTrail01', 'mhrButterflyTrail02', 'mhrButterflyTrailFragment01']) {
  if (!html.includes(key)) fail(`${key} black-hole V5 asset key missing`);
}
if (!html.includes('function motherHiveStartUltimateLink()')) {
  fail('motherHiveStartUltimateLink state machine missing');
}
if (!html.includes('linkV3: {')) {
  fail('mother hive V3 link state object missing');
}
const startLinkBlockAt = html.indexOf('function motherHiveOnUltimateStart()');
const endLinkBlockAt = html.indexOf('function motherHiveOnUltimateFinalBurst()', startLinkBlockAt);
if (startLinkBlockAt < 0 || endLinkBlockAt < 0) fail('Could not locate motherHive ultimate link hooks');
const startLinkBlock = html.slice(startLinkBlockAt, endLinkBlockAt);
if (!startLinkBlock.includes('motherHiveStartUltimateLink()')) {
  fail('motherHiveOnUltimateStart must start the front flower link');
}
if (startLinkBlock.includes('motherHiveStartPurify(true)')) {
  fail('motherHiveOnUltimateStart must not use the old purify field for V2 ultimate link');
}
const finalOverlayAt = html.indexOf('function drawMotherHiveFinalButterflyOverlay()');
const finalOverlayEnd = html.indexOf('if (typeof window', finalOverlayAt);
if (finalOverlayAt < 0 || finalOverlayEnd < 0) fail('Could not locate final butterfly overlay');
const finalOverlayBlock = html.slice(finalOverlayAt, finalOverlayEnd);
if (finalOverlayBlock.includes('mhrUltButterflyLight')) {
  fail('V3 final butterfly overlay must not draw the old white butterfly light');
}
if (!finalOverlayBlock.includes("globalCompositeOperation = 'source-over'")) {
  fail('V3 final butterfly body must be drawn source-over');
}
if (!html.includes('function drawMotherHiveV3Vortex(')) {
  fail('V3 mother hive code-drawn vortex function missing');
}
if (!html.includes('function drawMotherHiveV3FlowBand(')) {
  fail('V3 vortex must draw wide translucent flow bands');
}
for (const fn of ['drawMotherHiveV3AbsorbVortex', 'drawMotherHiveAbsorbOuterArms', 'drawMotherHiveAbsorbInwardStreams', 'drawMotherHiveAbsorbFieldParticles', 'drawUltimateBulletCaptureStreams', 'drawUltimateFlowerEnergyCore']) {
  if (!html.includes(`function ${fn}(`)) fail(`V3 ultimate absorb renderer missing ${fn}`);
}
for (const fn of ['drawMotherHiveBlackHoleField', 'drawMotherHiveAccretionDiskBase', 'drawMotherHiveBlackHoleSequence', 'motherHiveBlackHoleSequenceFrame', 'drawMotherHiveAccretionEdgeHighlights', 'drawMotherHiveInwardEnergyStreams', 'drawMotherHiveBlackHoleCore', 'drawMotherHiveVortexFlowParticles', 'drawMotherHiveSingularityCore', 'drawMotherHiveBlackHoleBurst', 'drawMotherHiveButterflyTrailOverlay']) {
  if (!html.includes(`function ${fn}(`)) fail(`V7 black-hole renderer missing ${fn}`);
}
if (!html.includes('const DEBUG_MHR_BLACKHOLE = false') || !html.includes('const DEBUG_MHR_VORTEX_VISIBLE = DEBUG_MHR_BLACKHOLE')) {
  fail('V5 black-hole vortex must expose a disabled-by-default debug switch');
}
if (!html.includes('function drawMotherHiveV3EventHorizon(')) {
  fail('V3 vortex must keep a small event horizon energy core');
}
if (!html.includes("vortexFillMode: 'fluid-accretion-field-with-sequence-undertone'")) {
  fail('V10 vortex must use fluid accretion bands as the main field with sequence undertone');
}
const vortexAt = html.indexOf('function drawMotherHiveV3AbsorbVortex(');
const vortexEnd = html.indexOf('function drawMotherHiveDomain()', vortexAt);
const vortexBlock = vortexAt >= 0 && vortexEnd > vortexAt ? html.slice(vortexAt, vortexEnd) : '';
if (vortexBlock.includes('ctx.beginPath(); ctx.ellipse(0, 0, rx * pulse, ry * pulse, 0, 0, TAU); ctx.fill();')) {
  fail('V3 vortex must not draw a full transparent ellipse cover');
}
if (vortexBlock.includes('setLineDash') || vortexBlock.includes('lineDashOffset')) {
  fail('V3 vortex must not use dashed guide arcs as the main body');
}
if (html.includes('drawImage(canvas')) {
  fail('V3 vortex must not re-sample the live canvas; it caused full-screen flashing');
}
if (html.includes('0.05 + deploy * 0.15')) {
  fail('V3 vortex must not keep the old weak alpha formula');
}
if (!html.includes("vortexBodyMode: 'procedural-pink-white-life-fluid-disk'")
  || !html.includes("vortexSpriteRole: 'accent-textures-only-no-orbit-sprites'")
  || !html.includes("vortexPrimaryBody: 'procedural-fluid-bands-over-low-alpha-sequence'")
  || !html.includes("vortexCoreStyle: 'dark-core-during-absorb'")
  || !html.includes("vortexMainDiskTexture: 'very-low-alpha-blackhole_sequence'")
  || !html.includes('vortexMainDiskMaxCopies: 1')
  || !html.includes('vortexNoOrbitSprites: true')
  || !html.includes('vortexUsesOffscreenMask: false')
  || !html.includes("vortexMaskComposite: 'not-primary'")
  || !html.includes('vortexProceduralParticles: true')
  || !html.includes("blackHoleSequenceWorkflow: 'keyframes-interpolated-sequence-plus-realtime-overlays'")
  || !html.includes('motherHiveV3CollapseProgress')) {
  fail('V6.1 vortex must use sequence frames with realtime overlays and support collapse into a singularity');
}
if (!html.includes("vortexPriority: 'visibility-first'") || !html.includes("vortexArmCount: 'fluid-accretion-bands-plus-realtime-flow-particles'")) {
  fail('V10 vortex must lock the fluid accretion-band field spec');
}
if (!html.includes('MHR_BLACKHOLE_SEQUENCE_PHASES')
  || !html.includes('MHR_BLACKHOLE_SEQUENCE_ALL_KEYS')
  || !html.includes('blackhole_sequence/${phase}/bh_${phase}_${idx}.png')) {
  fail('V6.1 vortex sequence frames must be registered as loadable assets');
}
if (!html.includes("l.state = 'SINGULARITY'")
  || !html.includes("singularityPhase:")
  || !html.includes("vortexOuterBoundary: 'hidden-no-transparent-ellipse'")
  || !html.includes("vortexFlowParticles: { perf0: 108, perf1: 64, perf2: 34 }")
  || !html.includes('motherHiveReleasePendingFinalButterflies')
  || !html.includes('pendingFinalBurst')) {
  fail('V9 vortex must collapse into a timed singularity before releasing butterflies');
}
if (!vortexBlock.includes('drawMotherHiveBlackHoleField(m)')) {
  fail('V8 vortex main path must use the unified black-hole field renderer');
}
if (vortexBlock.includes('drawMotherHiveBlackHoleOuterArms(m)')
  || vortexBlock.includes('drawMotherHiveBlackHoleMidSwirl(m)')) {
  fail('V8 vortex main path must not draw arm helpers directly outside the field renderer');
}
const fieldAt = html.indexOf('function drawMotherHiveBlackHoleField(');
const fieldEnd = html.indexOf('function drawMotherHiveV3DebugVortexGuides(', fieldAt);
const fieldBlock = fieldAt >= 0 && fieldEnd > fieldAt ? html.slice(fieldAt, fieldEnd) : '';
if (!fieldBlock.includes('drawMotherHiveAccretionDiskBase(m)')
  || !html.includes('if (drawMotherHiveBlackHoleSequence(m)) return true;')
  || !fieldBlock.includes('drawMotherHiveAccretionEdgeHighlights(m)')) {
  fail('V6.1 black-hole field must draw sequence frames as the main body with secondary edge highlights');
}
if (fieldBlock.includes('drawMotherHiveMaskedSpiralArms(m)')) {
  fail('V8 black-hole field must not use the old masked spiral arcs as the main body');
}
if (!html.includes('function motherHiveVortexPoint(') || !html.includes('function drawMotherHiveVortexRibbonPath(')) {
  fail('V8 must expose procedural vortex point and ribbon path helpers');
}
if (!html.includes('_legacySpriteOrbitSuppressed')) {
  fail('V8 vortex must explicitly suppress legacy sprite-orbit renderer paths');
}
if (!html.includes('motherHiveLinkApplyBulletGravity')) {
  fail('V3 link must actively pull bullets with a black-hole gravity field');
}
if (!html.includes('function drawMotherHiveFinalRibbonTrail(')) {
  fail('V3 final butterfly ribbon trail renderer missing');
}
const ribbonCallMatch = /drawMotherHiveFinalRibbonTrail\(s,\s*trailSz(?:,\s*trailFade)?\);/.exec(finalOverlayBlock);
const ribbonCall = ribbonCallMatch ? finalOverlayBlock.indexOf(ribbonCallMatch[0]) : -1;
const bodyComposite = finalOverlayBlock.indexOf("globalCompositeOperation = 'source-over'");
if (ribbonCall < 0 || bodyComposite < 0 || ribbonCall > bodyComposite) {
  fail('V3 final butterfly ribbon trail must be drawn before the source-over body');
}
if (finalOverlayBlock.includes("mhrV3ButterflyTrail1') ?")) {
  fail('V3 final butterfly trail must not rely on the old local sprite tail overlay');
}
if (!html.includes("finalFlightMode: 'quick-spread-fast-lock-rush-hit-target-facing-flutter'")) {
  fail('V10 final butterflies must use quick-spread fast-lock target-facing flutter, not paper-like spinning');
}
if (!html.includes('mhrBurstDelay: spreadTime')
  || !html.includes('finalSpreadMin: 0.07')
  || !html.includes('finalSpreadMax: 0.13')
  || !html.includes('finalLockWaveDelay: 0.006')) {
  fail('V10 final butterflies must use a short launch beat before quickly locking targets');
}
if (!html.includes("finalTrailMode: 'continuous-ribbon-mesh'")) {
  fail('V3 final butterflies must use a continuous ribbon mesh trail');
}
if (!html.includes("finalTargetMode: 'distributed-locked-continuous-retarget'")
  || !html.includes("finalTargetCoverage: 'one-butterfly-per-live-target-within-cap'")
  || !html.includes("butterflyFlapFrames: ['mhrV3Butterfly1', 'mhrV3Butterfly2', 'mhrV3Butterfly3', 'mhrV3Butterfly4']")
  || !html.includes("butterflyMainSprite: 'mhrV3Butterfly1-4'")
  || !html.includes("finalRibbonFlowTrail: 'visible-v3-textured-life-ribbon-trail'")
  || !html.includes('mhrOriginX')
  || !html.includes('mhrRetargeted')
  || !html.includes('mhrRetargetT')
  || !html.includes('motherHiveAssignFinalButterflyTargets')) {
  fail('V9 final butterflies must use locked distributed targeting, continuous retargeting, 4-frame flap animation and flowing ribbon tails');
}
if (!html.includes('if (isButterfly && !isFinal && s.hist && s.hist.length > 1)')) {
  fail('mhrfinal must be excluded from the generic butterfly history trail');
}
if (!html.includes('} else if (isButterfly && !isFinal)')) {
  fail('mhrfinal must be excluded from the generic butterfly body renderer');
}

for (const key of [
  'mhrEmitterCrystal1',
  'mhrEmitterCrystal2',
  'mhrEmitterCrystal3',
  'mhrLaceSpikeNormal1',
  'mhrLaceSpikeBerserk1',
  'mhrRibbonTrailCore',
  'mhrLifeMarkCore',
  'mhrLifeMarkExplosionCore',
  'mhrSpikeHitFlash',
]) {
  if (!html.includes(key)) fail(`${key} crystal spike / life mark asset key missing`);
}
for (const needle of [
  'const MHR_LIFE_MARK = {',
  "kind = berserk ? 'mhrlacespike_berserk' : 'mhrlacespike'",
  "shot.kind === 'mhrlacespike' || shot.kind === 'mhrlacespike_berserk'",
  "motherLifeDamageTarget(r.main, mainDamage, false, 'resonanceMain')",
  "motherLifeDamageTarget(target, mainDamage * MOTHER_LIFE.resonanceShare, false, 'resonanceBranch')",
  "motherLifeDamageTarget(target, dps * step, false, 'normalRibbon')",
  'MHR_LIFE_MARK.ribbonSourceTags.includes(sourceTag)',
  'motherHive.linkV3.active || motherLifeState.ultimate.active',
]) {
  if (!html.includes(needle)) fail(`V2 crystal spike / Life Mark invariant missing: ${needle}`);
}

const castStart = html.indexOf('function castWombOfAll()');
const castEnd = html.indexOf('function motherLifeFinalBurst()', castStart);
if (castStart < 0 || castEnd < 0) fail('Could not locate castWombOfAll/motherLifeFinalBurst boundaries');
const castBlock = html.slice(castStart, castEnd);
const castHook = castBlock.indexOf('motherHiveOnUltimateStart();');
const castClear = castBlock.indexOf('enemyBullets.length = 0; warnings.length = 0; lasers.length = 0;');
if (castHook < 0 || castClear < 0 || castHook > castClear) {
  fail('motherHiveOnUltimateStart must run before Womb of All clears enemy bullets');
}

const burstStart = castEnd;
const burstEnd = html.indexOf('function updateMotherLifeUltimate(dt)', burstStart);
if (burstEnd < 0) fail('Could not locate motherLifeFinalBurst/updateMotherLifeUltimate boundaries');
const burstBlock = html.slice(burstStart, burstEnd);
const burstHook = burstBlock.indexOf('motherHiveOnUltimateFinalBurst();');
const burstClear = burstBlock.indexOf('enemyBullets.length = 0; warnings.length = 0; lasers.length = 0;');
if (burstHook < 0 || burstClear < 0 || burstHook > burstClear) {
  fail('motherHiveOnUltimateFinalBurst must run before final burst clears enemy bullets');
}

for (const key of [
  'suiyiMapVirtualCore',
  'suiyiMapControlHall',
  'suiyiMapDigitalRuins',
  'suiyiMapCrystalSanctum',
  'suiyiIdle',
  'suiyiCrash',
	  'suiyiBulletCodeArrow',
	  'suiyiErrorWindowLarge',
	  'suiyiCrashCore',
	  'suiyiTargetLock',
	  'suiyiCodeRainStrip',
	  'suiyiImpactBurst',
	]) {
  if (!html.includes(key)) fail(`${key} suiyi asset key missing`);
}
for (const needle of [
  'const SUIYI_PHASE_HP = Object.freeze({',
  'const SUIYI_MAP_KEYS = Object.freeze',
  'function suiyiPatterns(t, dt)',
  'function updateSuiyiBoss(dt)',
	  'function drawSuiyiBoss()',
	  'function updateSuiyiEnemyBullet(b, dt)',
	  'function suiyiCompileFan(phase)',
	  'function suiyiBinaryGateSweep(phase)',
	  'function suiyiCodeSnakeWeave(phase)',
	  'function suiyiDebugGridWeave(phase)',
	  'function suiyiVirusBloom(phase)',
	  'function suiyiTargetLockFork(phase)',
	  'function suiyiOverclockCrossLanes(phase)',
	  'function drawHostileBulletRedEdge(b',
	  'function drawHostileBulletRimOverlay(b',
	  'window.__suiyiBossInternals__',
  "'unlocked-random-wave-and-formation-pool'",
  'function eligibleStageWaves(',
  'const GLOBAL_STAGE_POOL = Object.freeze',
  'const GLOBAL_BACKGROUND_POOL = Object.freeze',
  'const GLOBAL_BOSS_POOL = Object.freeze(Object.keys(BOSS_DEFS))',
  "suiyi:       { hp:",
  "if (segment === 'stage10')",
  "boss.kind === 'suiyi'",
]) {
  if (!html.includes(needle)) fail(`Suiyi boss invariant missing: ${needle}`);
}
if (!html.includes("code_arrow: 'straight'")
  || !html.includes("binary_digit: 'slow_then_fast'")
  || !html.includes("warning_triangle: 'delayed_burst'")
  || !html.includes("crash_fragment: 'spiral'")
  || !html.includes("debug_bit: 'screen_wrap'")
  || !html.includes("virus_node: 'homing_weak'")
  || !html.includes("logic_gate: 'slow_then_fast'")
  || !html.includes("scan_shard: 'curve'")) {
  fail('Suiyi bullet behavior table must cover V2 behavior set');
}
for (const needle of [
  "'Compile Fan'",
  "'Binary Gate'",
  "'Code Snake'",
  "'Debug Grid'",
  "'Virus Bloom'",
  "'Target Lock Fork'",
  "'Overclock Cross Lanes'",
  'SUIYI_CODE_TRAIL_GLYPHS',
  'SUIYI_READABLE_DANMAKU',
  'function clearSuiyiCombatLayers',
  'programmatic-lanes-no-wide-uncropped-texture',
  'short-code-ribbons-no-solid-red-pink-lines',
  'ENEMY_ATTACK_LAYER_SPEC',
  'relative-drag-no-snap',
  'function startRelativeTouchMove',
  'function addRelativeTouchDelta',
  'layeringSpec',
  'touchControlSpec',
  'HOSTILE_BULLET_RED_EDGE',
  'GLOBAL_BACKGROUND_POOL',
  'STAGE_THEME_TECH',
  'TECH_STAGE_WAVES',
  'mobStageWaveTarget',
  'mobStageMinDuration',
  'bossDamageMul',
  'function bossAssetKeys',
  'prefetchBossAssets',
  'QUALITY_PRESETS',
  'formatMobWaveStatus',
  'waveHudSpec',
  'window.__randomBalanceInternals__',
  'techThemeOnlySpawnsTechMobsAndSuiyi: true',
  'SUPABASE_URL',
  'sb_publishable_3z85P8qcxCMc9wweII4oDw_BeXUoGmE',
  'LEADERBOARD_TABLE',
  'LEADERBOARD_AVATAR_SPEC',
  'avatar_data',
  'function compressAvatarFile',
  'function submitLeaderboardScore',
  'function drawLeaderboardView',
  'function drawLeaderboardBackdrop',
  'GUESTBOOK_TABLE',
  'guestbook_messages',
  'GUESTBOOK_UI_SPEC',
  'function drawGuestbookPanelFrame',
  'function submitGuestbookMessage',
  'function showGuestbookDialog',
  'guestbookSidePanel',
  'leaderboardPaginationSpecForTest',
  'leaderboardNext',
  'guestbookCompose',
  'window.__leaderboardInternals__',
  'window.__leaderboardCapture__',
  'LEADERBOARD_FN_BASE',
  'function startRankedRun',
  'writeEndpointForTest',
  'submitRouteSpecForTest',
  'hell_mode: hellModeActive === true',
  'directClientWrites: false',
  'HELL_MODE_SPEC',
  '地狱排行榜模式',
  'function requestStartGame',
  'function showHellModeStartDialog',
  'function endRunByHellMode',
  'leaderboardRequiresHellMode',
  '普通模式不参与排行榜',
  "if (e.code === 'KeyG') { if (!hellModeActive) player.energy = player.maxEnergy; }",
]) {
  if (!html.includes(needle)) fail(`Suiyi expanded STG pattern invariant missing: ${needle}`);
}
const submitStart = html.indexOf('async function submitLeaderboardScore');
const submitEnd = html.indexOf('function requestLeaderboardUploadAfterRun', submitStart);
if (submitStart < 0 || submitEnd < 0) fail('Could not locate submitLeaderboardScore block');
const submitBlock = html.slice(submitStart, submitEnd);
for (const forbidden of ['insertLeaderboardPayload(', "method: 'DELETE'", 'getRemoteBestForName(']) {
  if (submitBlock.includes(forbidden)) fail(`submitLeaderboardScore must not use direct client write path: ${forbidden}`);
}
for (const needle of [
  'leaderboard_runs',
  'leaderboard_quarantine',
  'LB_SALT',
  'status: "quarantined"',
  'not hell mode',
  'action === "message"',
  'guestbook_messages',
  'invalid message',
  'https://1449690477.github.io',
]) {
  if (!leaderboardRunFunction.includes(needle)) fail(`leaderboard Edge Function invariant missing: ${needle}`);
}
const drawOrder = [
  'drawPlayer();',
  'drawPlayerHitbox();',
  'drawMotherHiveFinalButterflyOverlay();',
  'drawSuiyiHazards();',
  'drawEnemyBullets();',
  'drawWarnings();',
  'drawLasers();',
  'drawUI();',
];
for (let i = 1; i < drawOrder.length; i++) {
  if (html.indexOf(drawOrder[i - 1]) < 0 || html.indexOf(drawOrder[i]) < 0 || html.indexOf(drawOrder[i - 1]) > html.indexOf(drawOrder[i])) {
    fail('Enemy attack layer must render after player/hitbox/effects and before UI');
  }
}
for (const key of [
  'enSuiyiCodeBug',
  'enSuiyiCoreDrone',
  'enSuiyiServerNode',
  'enSuiyiCrystalCompiler',
  'suiyiMobCodeBolt',
  'suiyiMobBinaryOrb',
  'suiyiMobCursorShard',
  'suiyiMobCrystalRing',
  'suiyiMobCrystalShard',
  'suiyiMobCompileBurst',
]) {
  if (!html.includes(key)) fail(`${key} suiyi tech mob asset key missing`);
}
for (const needle of [
  'const SUIYI_TECH_MOB_TYPES = Object.freeze',
  'function drawSuiyiTechMapFlowOverlay(',
  'function patTechBitFan(e)',
  'function patTechCompileRing(e)',
  'function patTechCodeRain(e)',
  'function patTechCrystalBloom(e)',
  "m === 'techSwarm'",
  "m === 'techHover'",
  "m === 'techAnchor'",
  "m === 'techPhase'",
  "'codeGrid'",
  "'compilerChevron'",
  "'terminalColumn'",
  "'techPincer'",
  "const TECH_STAGE_POOL = Object.freeze([...SUIYI_TECH_MOB_TYPES])",
  "poolMode: 'exclusive-tech-theme-pool'",
  "window.__suiyiTechMobInternals__",
  "window.__suiyiTechMobCapture__",
]) {
  if (!html.includes(needle)) fail(`Suiyi tech mob invariant missing: ${needle}`);
}
for (const needle of [
  '__suiyiTechMobCapture__',
  '01_tech_map_code_flow.png',
  '06_mixed_high_pressure_wave.png',
]) {
  if (!suiyiTechCapture.includes(needle)) fail(`Suiyi tech mob capture script invariant missing: ${needle}`);
}
for (const needle of [
  '__randomBalanceCapture__',
  '01_normal_map_normal_mobs.png',
  '02_tech_map_tech_mobs.png',
  '07_red_hitbox_and_bullet_rim.png',
  '08_abysswalker_boss_asset.png',
]) {
  if (!randomBalanceCapture.includes(needle)) fail(`Random balance capture script invariant missing: ${needle}`);
}
if (html.includes("if (bossKind === 'finalboss') {\n        // Final boss defeated")) {
  fail('finalboss must not end the loop unless the current segment is stage10');
}
const spawnEnemyAt = html.indexOf('function spawnEnemy(type, x, y, move, hoverY)');
const spawnEnemyEnd = html.indexOf('function spawnEnemyRise(', spawnEnemyAt);
if (spawnEnemyAt < 0 || spawnEnemyEnd < 0) fail('Could not locate spawnEnemy block');
const spawnEnemyBlock = html.slice(spawnEnemyAt, spawnEnemyEnd);
if (spawnEnemyBlock.includes('activateSuiyiTechMobMap')) {
  fail('Tech mobs must not activate/replace the base map from spawnEnemy');
}
const normalStagePoolAt = html.indexOf('const STAGE_POOL = {');
const normalStagePoolEnd = html.indexOf('const GLOBAL_STAGE_POOL', normalStagePoolAt);
if (normalStagePoolAt < 0 || normalStagePoolEnd < 0) fail('Could not locate STAGE_POOL block');
const normalStagePoolBlock = html.slice(normalStagePoolAt, normalStagePoolEnd);
for (const techType of ['codebug', 'coredrone', 'servernode', 'crystalcompiler']) {
  if (normalStagePoolBlock.includes(`'${techType}'`)) fail(`${techType} must not leak into normal STAGE_POOL`);
}
for (const key of [
  'miguaMapGreenhouse',
  'miguaMapJuiceFactory',
  'miguaMapFloatingCity',
  'miguaBossFinal',
  'enMiguaDrone',
  'enMiguaSliceSpider',
  'enMiguaTurret',
  'enMiguaJellyMine',
  'enMiguaBeeStinger',
  'enMiguaArmorTurtle',
  'miguaSeedBlackSmall',
  'miguaSeedGoldHeavy',
  'miguaSliceArc',
  'miguaCrescentSlice',
  'miguaJuiceSplashLarge',
  'miguaMelonBubble',
  'miguaMelonBubbleLarge',
  'miguaMelonSun',
  'miguaSeedHalo',
  'miguaJuicePuddle',
  'miguaBossBarFrame',
  'miguaBarFrame',
  'miguaBarEmpty',
  'miguaBarFillGreen',
  'miguaBarFillYellow',
  'miguaBarFillRed',
  'miguaBarGloss',
  'miguaBarSeedTicks',
  'miguaBarCrack',
  'miguaBarMask',
  'miguaBarDanger',
]) {
  if (!html.includes(key)) fail(`${key} Migua asset key missing`);
}
for (const needle of [
  'const MIGUA_MAP_KEYS = Object.freeze',
  'const MIGUA_MOB_TYPES = Object.freeze',
  'const MIGUA_STAGE_WAVES = Object.freeze',
  "const MIGUA_BOSS_POOL = Object.freeze(['migua'])",
  'function drawMiguaBossBar()',
  'function drawMiguaMapFlowOverlay(',
  'function spawnMiguaBullet(',
  'function updateMiguaBoss(dt)',
  'function drawMiguaEnemyBullet(b)',
  'function drawMiguaBoss()',
  'function miguaBossBarLayoutForRate(',
  'function drawMiguaLayerWithMask(',
  'function drawMiguaBarGloss(',
  'function getMiguaHpState(',
  'window.__miguaInternals__',
  'bossBarLayoutForTest',
  'usesLayeredMaskFill: true',
  "maskComposite: 'destination-in'",
  "renderOrder: ['empty-underlay', 'masked-fill', 'masked-gloss', 'seed-ticks', 'crack', 'pulse-danger', 'frame', 'portrait-name-text']",
  "layeredDraw: ['fruit-specific-short-tail', 'sprite-body-shadow-edge', 'fruit-palette-damage-boundary']",
  "redRim: 'fruit-palette-boundary-no-red-rim'",
  "clarity: 'dark-fruit-outline-and-light-hit-boundary'",
  'function drawMiguaReadableSeedBoundary(',
  'function drawMiguaRoundDamageBoundary(',
  "UPDATE_NOTICE_VERSION = '2026-07-02-tianyao-tech-ui'",
  'function showUpdateNoticeDialog(',
  'function showUpdateNoticeIfNeeded(',
  "'更新公告', 'updateNotice'",
  "updateNotice: { version: UPDATE_NOTICE_VERSION",
  "b.miguaBehavior === 'melon_throw'",
  "b.miguaSplitMode === 'melon_burst'",
  'function miguaThrowMelonBomb(',
  "STAGE_THEME_MIGUA = 'migua'",
  'miguaThemeOnlySpawnsMiguaMobsAndMiguaBoss',
]) {
  if (!html.includes(needle)) fail(`Migua content invariant missing: ${needle}`);
}
for (const miguaType of ['miguadrone', 'miguaslicespider', 'miguaturret', 'miguajellymine', 'miguabeestinger', 'miguaarmorturtle']) {
  if (normalStagePoolBlock.includes(`'${miguaType}'`)) fail(`${miguaType} must not leak into normal STAGE_POOL`);
}
for (const needle of [
  '__miguaCapture__',
  '01_migua_greenhouse_stage.png',
  '04_migua_boss_entry_bar.png',
  '08_migua_final_burst.png',
  '09_migua_bar_full.png',
  '12_migua_bar_critical.png',
  '15_migua_fruit_bubbles.png',
]) {
  if (!miguaCapture.includes(needle)) fail(`Migua capture script invariant missing: ${needle}`);
}

console.log('regression grep ok');
