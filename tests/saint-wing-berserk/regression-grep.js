import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
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

console.log('regression grep ok');
