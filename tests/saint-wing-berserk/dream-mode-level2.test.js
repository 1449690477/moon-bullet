import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { loadDreamModeInternals } from './setup.js';

const LEVEL_ONE = 'dream-01-seraph';
const LEVEL_TWO = 'dream-02-zero-compile';
const LEVEL_THREE = 'dream-03-plush-room';

describe('dream mode level two: Zero Compile Domain', () => {
  const dream = loadDreamModeInternals();
  const source = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const edgeSource = readFileSync(new URL('../../supabase/functions/leaderboard-run/index.ts', import.meta.url), 'utf8');

  it('keeps level two selectable after the third level is registered', () => {
    expect(typeof dream.levelsSpec).toBe('function');
    expect(dream.levelsSpec()).toEqual([
      expect.objectContaining({ id: LEVEL_ONE, version: 'dream-01-v2', seed: 7130101, bossKey: 'seraph', unlocked: true }),
      expect.objectContaining({ id: LEVEL_TWO, version: 'dream-02-v1', seed: 7130202, name: '零界编译域', bossKey: 'suiyi', unlocked: true }),
      expect.objectContaining({ id: LEVEL_THREE, version: 'dream-03-v1', seed: 7130303, name: '绒梦玩偶屋', bossKey: null, unlocked: true }),
    ]);
    expect(dream.levelSpec(LEVEL_TWO)).toMatchObject({
      id: LEVEL_TWO,
      version: 'dream-02-v1',
      name: '零界编译域',
      seed: 7130202,
      waveCount: 10,
      mobTargetSeconds: 500,
      bossTargetSeconds: 128,
      bossKey: 'suiyi',
    });
    expect(dream.levelSpec(LEVEL_TWO)).not.toMatchObject({ bossKey: dream.levelSpec(LEVEL_ONE).bossKey });
    expect(dream.modeSpec()).toMatchObject({ levelCount: 10, unlockedLevels: 3 });
    expect(dream.uiSpec()).toMatchObject({ availableLevels: [1, 2, 3] });
    expect(dream.previewSpec(LEVEL_TWO)).toMatchObject({ showsMobs: 4, showsBossPhases: 6, showsWaveRules: true, showsStarRules: true });
  });

  it('uses four completely different technology enemies and eight bodies per wave', () => {
    const mobs = dream.mobSpec(LEVEL_TWO);
    expect(mobs).toEqual([
      expect.objectContaining({ key: 'codebug', name: '漏码虫', sprite: 'enSuiyiCodeBug', hp: 92000, size: 108, r: 24, role: 'bit' }),
      expect.objectContaining({ key: 'coredrone', name: '核心监视器', sprite: 'enSuiyiCoreDrone', hp: 124000, size: 124, r: 30, role: 'core' }),
      expect.objectContaining({ key: 'servernode', name: '终端节点', sprite: 'enSuiyiServerNode', hp: 166000, size: 132, r: 34, role: 'node' }),
      expect.objectContaining({ key: 'crystalcompiler', name: '晶体编译器', sprite: 'enSuiyiCrystalCompiler', hp: 150000, size: 134, r: 33, role: 'compiler' }),
    ]);
    const firstSprites = new Set(dream.mobSpec(LEVEL_ONE).map((mob) => mob.sprite));
    expect(mobs.every((mob) => !firstSprites.has(mob.sprite))).toBe(true);
    for (const path of [
      '../../assets/enemies/suiyi_tech/code_bug.png',
      '../../assets/enemies/suiyi_tech/core_drone.png',
      '../../assets/enemies/suiyi_tech/server_node.png',
      '../../assets/enemies/suiyi_tech/crystal_compiler.png',
    ]) expect(existsSync(new URL(path, import.meta.url)), path).toBe(true);
  });

  it('builds ten deterministic 2-by-4 waves with a slightly steeper HP curve', () => {
    const expectedNames = ['冷启动脉冲', '二进制门阵', '递归调用', '镜像断点', '内存泄漏', '死锁线程', '校验矩阵', '热更新风暴', '栈溢出', '零界重编译'];
    const expectedMultipliers = [1, 1.11, 1.22, 1.34, 1.47, 1.61, 1.76, 1.92, 2.1, 2.3];
    const waves = dream.waveSpec(LEVEL_TWO);
    expect(waves).toHaveLength(10);
    expect(waves.map((wave) => wave.name)).toEqual(expectedNames);
    expect(waves.map((wave) => wave.hpMultiplier)).toEqual(expectedMultipliers);
    for (let wave = 1; wave <= 10; wave += 1) {
      expect(waves[wave - 1]).toMatchObject({ count: 8, composition: [2, 2, 2, 2], batches: [3, 3, 2], batchDelays: [0, 4.7, 9] });
      const roster = dream.waveRosterForTest(wave, { stageId: LEVEL_TWO });
      const counts = roster.reduce((result, enemy) => {
        result[enemy.key] = (result[enemy.key] || 0) + 1;
        return result;
      }, {});
      expect(roster).toHaveLength(8);
      expect(Object.values(counts).sort()).toEqual([2, 2, 2, 2]);
    }
    expect(expectedMultipliers.at(-1)).toBeGreaterThan(dream.waveSpec(LEVEL_ONE).at(-1).hpMultiplier);
    expect(dream.formationSpec(LEVEL_TWO)).toHaveLength(5);
    expect(dream.formationSpec(LEVEL_TWO).every((formation) => formation.batches.flat().length === 8)).toBe(true);
  });

  it('replays the second seed exactly and changes order for another seed', () => {
    const first = dream.waveRosterForTest(7, { stageId: LEVEL_TWO });
    const second = dream.waveRosterForTest(7, { stageId: LEVEL_TWO });
    const alternate = dream.waveRosterForTest(7, { stageId: LEVEL_TWO, seed: 7130203 });
    expect(second).toEqual(first);
    expect(alternate).not.toEqual(first);
    expect(first).not.toEqual(dream.waveRosterForTest(7, { stageId: LEVEL_ONE }));
  });

  it('defines a unique low-count conductor with complete groups and readable gaps', () => {
    const patterns = dream.patternSpec(LEVEL_TWO);
    const firstVoices = new Set(dream.patternSpec(LEVEL_ONE).flatMap((pattern) => pattern.voices));
    const secondVoices = new Set(patterns.flatMap((pattern) => pattern.voices));
    expect(patterns).toHaveLength(10);
    expect(secondVoices.size).toBeGreaterThanOrEqual(16);
    expect([...secondVoices].every((voice) => !firstVoices.has(voice))).toBe(true);
    for (const pattern of patterns) {
      expect(pattern).toMatchObject({ completeGroupOnly: true, minGap: expect.any(Number) });
      expect(pattern.voices.length).toBeGreaterThanOrEqual(2);
      expect(pattern.maxVoices).toBeGreaterThanOrEqual(2);
      expect(pattern.maxVoices).toBeLessThanOrEqual(3);
      expect(pattern.minGap).toBeGreaterThanOrEqual(24);
    }
    expect(patterns.filter((pattern) => pattern.minGap >= 104).length).toBeGreaterThanOrEqual(5);
    expect(dream.patternBudgetSpec(LEVEL_TWO)).toMatchObject({
      enemyCap: 8,
      logicalBulletCap: 96,
      warningCap: 4,
      laserCap: 4,
      poolSize: 128,
      accentThreshold: 72,
      aimedWarningMin: expect.any(Number),
      laserWarningMin: expect.any(Number),
      corridorGapMin: 104,
      cullsLogicalBulletsByQuality: false,
    });
    expect(dream.patternBudgetSpec(LEVEL_TWO).aimedWarningMin).toBeGreaterThanOrEqual(0.45);
    expect(dream.patternBudgetSpec(LEVEL_TWO).laserWarningMin).toBeGreaterThanOrEqual(0.75);
  });

  it('uses only the ten local Suiyi projectile families for level two', () => {
    const expectedAssets = [
      'suiyiMobCodeBolt', 'suiyiMobBinaryOrb', 'suiyiMobCursorShard', 'suiyiMobCrystalShard',
      'suiyiBulletCodeArrow', 'suiyiBulletCrystalNeedle', 'suiyiBulletBinaryDiamond',
      'suiyiBulletDataCube', 'suiyiBulletCursor', 'suiyiBulletCrashFragment',
    ];
    const levelTwoSkins = dream.bulletSkinSpec(LEVEL_TWO);
    const levelOneAssets = new Set(dream.bulletSkinSpec(LEVEL_ONE).map((skin) => skin.assetKey));
    expect([...new Set(levelTwoSkins.map((skin) => skin.assetKey))].sort()).toEqual([...expectedAssets].sort());
    expect(levelTwoSkins.every((skin) => !levelOneAssets.has(skin.assetKey))).toBe(true);
    for (const skin of levelTwoSkins) {
      expect(skin.assetPath).toMatch(/^assets\/bullets\/suiyi(?:_tech)?\/.+\.png$/);
      expect(existsSync(new URL(`../../${skin.assetPath}`, import.meta.url)), `${skin.key}: ${skin.assetPath}`).toBe(true);
    }
  });

  it('keeps all four quality modes logically identical and below 96 bullets', () => {
    const qualities = ['high', 'medium', 'low', 'ultra'];
    const allowedAssets = new Set(dream.bulletSkinSpec(LEVEL_TWO).map((skin) => skin.assetKey));
    const patterns = dream.patternSpec(LEVEL_TWO);
    const allowedEmitters = new Set(patterns.flatMap((pattern) => pattern.voices));
    const globalAssets = new Set();
    const globalMotions = new Set();
    const globalEmitters = new Set();
    for (let wave = 1; wave <= 10; wave += 1) {
      for (const elapsed of [2.4, 6.8, 10.6]) {
        const samples = qualities.map((quality) => dream.bulletSnapshotForTest({ stageId: LEVEL_TWO, wave, elapsed, quality }));
        expect(samples.map((sample) => sample.logicalCount)).toEqual(qualities.map(() => samples[0].logicalCount));
        expect(samples.map((sample) => sample.logicHash)).toEqual(qualities.map(() => samples[0].logicHash));
        expect(samples[0].logicalCount).toBeGreaterThan(0);
        expect(samples[0].logicalCount).toBeLessThanOrEqual(96);
        for (const bullet of samples[0].bullets) {
          expect(allowedAssets.has(bullet.assetKey), bullet.assetKey).toBe(true);
          expect(allowedEmitters.has(bullet.emitter), bullet.emitter).toBe(true);
          expect(bullet.fallback).toBe(false);
          globalAssets.add(bullet.assetKey);
          globalMotions.add(bullet.motion);
          globalEmitters.add(bullet.emitter);
        }
      }
    }
    expect(globalAssets.size).toBe(10);
    expect(globalMotions.size).toBeGreaterThanOrEqual(12);
    expect(globalEmitters.size).toBeGreaterThanOrEqual(16);
  });

  it('ports technology grammar into the dream pool without per-bullet history or random wrap', () => {
    const start = source.indexOf('function dreamEmitBootBitFan');
    const end = source.indexOf('function updateDreamConductor', start);
    const block = source.slice(start, end);
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    expect(block).toContain('addDreamBullet(');
    expect(block).toContain('dreamTryAtomicBulletGroup(');
    expect(block).not.toContain('spawnSuiyiBullet(');
    expect(block).not.toContain('addEnemyBullet(');
    expect(block).not.toContain('hist = []');
    expect(block).not.toContain("behavior: 'screen_wrap'");
    expect(block).not.toContain("behavior: 'homing_weak'");
  });

  it('is only slightly harder than level one and uses a distinct six-phase boss', () => {
    const first = dream.balanceSpec(LEVEL_ONE);
    const second = dream.balanceSpec(LEVEL_TWO);
    expect(second).toMatchObject({
      targetTotalSeconds: 628,
      mobTargetSeconds: 500,
      bossTargetSeconds: 128,
      mobDamageFloorSeconds: 39,
      mobInitialCreditRatio: 0.05,
      bossHp: 335000,
      bossDpsCap: 2500,
      bossCreditCap: 15000,
      bossTargetRange: [116, 142],
      enemyDamageBudget: true,
    });
    expect(second.targetTotalSeconds).toBeGreaterThan(first.targetTotalSeconds);
    expect(second.targetTotalSeconds - first.targetTotalSeconds).toBeLessThanOrEqual(40);
    expect(second.mobDamageFloorSeconds).toBeGreaterThan(first.mobDamageFloorSeconds);
    expect(second.bossHp).toBeGreaterThan(first.bossHp);
    expect(dream.bossSpec(LEVEL_TWO)).toMatchObject({
      key: 'suiyi',
      name: expect.stringContaining('随意'),
      hp: 335000,
      creditCap: 15000,
      creditRechargePerSecond: 2500,
      targetSeconds: [116, 142],
      phaseThresholds: [0.86, 0.7, 0.52, 0.34, 0.15],
      patternNames: ['启动校验', '递归展开', '内存泄漏', '死锁线程', '热更新·重写', 'System Crash'],
      pooledVoices: true,
      logicalBulletCap: 96,
      completeGroupOnly: true,
      reusesNormalBossDefinition: false,
    });
    expect(dream.bossSpec(LEVEL_TWO).phaseVoices).toHaveLength(6);
    expect(dream.bossSpec(LEVEL_TWO).phaseVoices.every((voices) => voices.length >= 2)).toBe(true);
    const bossStart = source.indexOf('function dreamSuiyiPatterns');
    const bossEnd = source.indexOf('function suiyiPatterns', bossStart);
    const bossBlock = source.slice(bossStart, bossEnd);
    expect(bossBlock).toContain('dreamBossVoice(key');
    expect(source).toContain('dreamRun.waveElapsed = boss.suiyiPhaseTimer');
    const patchStart = source.indexOf('function dreamEmitPatchRelay');
    const patchEnd = source.indexOf('function dreamEmitRollbackRing', patchStart);
    expect(source.slice(patchStart, patchEnd)).toContain("dreamSourceAny(['bit', 'core'])");
  });

  it('binds level-two leaderboard payloads and the server whitelist to its own version and seed', () => {
    expect(dream.buildLeaderboardPayloadForTest({
      stage_id: LEVEL_TWO,
      player_name: 'COMPILER',
      character: 'corruptgun',
      wing_loadout: ['nightcoffin'],
      stars: 3,
      hit_count: 0,
      elapsed_ms: 628000,
      avatar_data: '',
    })).toEqual({
      stage_id: LEVEL_TWO,
      clear_version: 'dream-02-v1',
      seed: 7130202,
      player_name: 'COMPILER',
      character: 'corruptgun',
      wing_loadout: ['nightcoffin'],
      stars: 3,
      hit_count: 0,
      elapsed_ms: 628000,
      avatar_data: '',
    });
    expect(edgeSource).toContain(`"${LEVEL_TWO}"`);
    expect(edgeSource).toContain('dream-02-v1');
    expect(edgeSource).toContain('7130202');
    expect(source).toContain("const DREAM_LEADERBOARD_BEST_VIEW = 'dream_leaderboard_best'");
    expect(source).toContain("requestFilter === 'all' ? DREAM_LEADERBOARD_BEST_VIEW : DREAM_LEADERBOARD_TABLE");
  });

  it('keeps a visible recovery path for nickname setup and retryable uploads', () => {
    const submitStart = source.indexOf('async function submitDreamResult()');
    const submitEnd = source.indexOf('function characterDisplayName', submitStart);
    const submitBlock = source.slice(submitStart, submitEnd);
    const dialogStart = source.indexOf('function hideLeaderboardNameDialog()');
    const dialogEnd = source.indexOf('function updateGuestbookDialogPreview', dialogStart);
    const dialogBlock = source.slice(dialogStart, dialogEnd);
    expect(submitStart).toBeGreaterThan(0);
    expect(submitBlock.indexOf('if (dreamLeaderboardSubmitInFlight)')).toBeLessThan(submitBlock.indexOf('if (!dreamLeaderboardRunToken)'));
    expect(source).toContain("showLeaderboardNameDialog('dream')");
    expect(source).toContain("let dreamLeaderboardSubmitInFlight = false");
    expect(source).toContain('let dreamLeaderboardSubmitSerial = 0');
    expect(source).toContain("if (dreamLeaderboardSubmitInFlight) return { ok: false, reason: 'pending' }");
    expect(submitBlock).toContain('dreamSubmissionContractMatches(submitSerial, payload)');
    expect(submitBlock).toContain("return { ok: true, stale: true }");
    expect(submitBlock).toContain("return { ok: false, reason: 'stale', error: err }");
    expect(submitBlock).toContain('if (submitSerial === dreamLeaderboardSubmitSerial) dreamLeaderboardSubmitInFlight = false');
    expect(dialogBlock).toContain("leaderboardNameDialogReason = 'manual'");
    const dreamDialogBranch = dialogBlock.slice(dialogBlock.indexOf("if (reason === 'dream')"));
    expect(dreamDialogBranch.indexOf('return;')).toBeLessThan(dreamDialogBranch.indexOf('submitLeaderboardScore()'));
    expect(source).toContain("dreamLeaderboardUploadStatus === 'needsName'");
    expect(source).toContain("dreamLeaderboardUploadStatus === 'fail' && !!dreamLeaderboardRunToken");
    expect(source).toContain("'设置昵称' : (canRetryUpload ? '重试上传' : '本关排行')");
    expect(source).toContain("needsDreamName || canRetryUpload ? 'resultUpload' : 'resultRank'");
    expect(source).toContain("uploadPending ? '上传中...' ");
    expect(source).toContain("uploadPending ? 'resultUploadPending'");
    expect(source).toContain("if (action === 'resultUpload')");
    expect(source).toContain("if (action === 'resultUploadPending') return true");
  });
});
