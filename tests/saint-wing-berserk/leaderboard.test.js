import { describe, expect, it } from 'vitest';
import { loadLeaderboardInternals } from './setup.js';

describe('online leaderboard and avatar upload spec', () => {
  const board = loadLeaderboardInternals();

  it('uses Supabase REST without adding the Supabase SDK', () => {
    const spec = board.configSpec();
    expect(spec.supabaseUrl).toBe('https://tdlqugkkojwysqnsunqt.supabase.co');
    expect(spec.table).toBe('leaderboard');
    expect(spec.topLimit).toBe(50);
    expect(spec.usesRestApi).toBe(true);
    expect(spec.noSupabaseSdkDependency).toBe(true);
    expect(spec.optionalAvatarColumn).toBe('avatar_data');
  });

  it('validates a compact 3-12 character player name', () => {
    expect(board.normalizeNameForTest('  WANG   HAN  ')).toBe('WANG HAN');
    expect(board.validateNameForTest('AB').ok).toBe(false);
    expect(board.validateNameForTest('WANG HAN').ok).toBe(true);
    expect(board.validateNameForTest('ABCDEFGHIJKLMN').name).toBe('ABCDEFGHIJKL');
  });

  it('builds the exact leaderboard payload shape including optional avatar data', () => {
    const payload = board.buildPayloadForTest({
      player_name: 'WANG HAN',
      character: 'motherlife',
      score: 938420.8,
      kill_count: 1420,
      loop_count: 3,
      elapsed: 726.7,
      bosses_cleared: 9,
      avatar_data: 'data:image/webp;base64,abc',
    });
    expect(payload).toEqual({
      player_name: 'WANG HAN',
      character: 'motherlife',
      score: 938420,
      kill_count: 1420,
      loop_count: 3,
      elapsed: 726,
      bosses_cleared: 9,
      avatar_data: 'data:image/webp;base64,abc',
    });
  });

  it('only submits scores that beat the remote best score', () => {
    expect(board.shouldSubmitForTest(1000, 999)).toBe(true);
    expect(board.shouldSubmitForTest(1000, 1000)).toBe(false);
    expect(board.shouldSubmitForTest(900, 1000)).toBe(false);
  });

  it('defines compressed avatar and themed UI surfaces', () => {
    const avatar = board.avatarSpec();
    expect(avatar.mode).toBe('client-compressed-data-url');
    expect(avatar.size).toBe(96);
    expect(avatar.maxDataUrlLength).toBeLessThanOrEqual(22000);
    expect(avatar.fallbackWhenColumnMissing).toBe(true);

    const ui = board.uiSpec();
    expect(ui.mode).toBe('moon-eclipse-glass-panel-with-avatar-ranking');
    expect(ui.avatarUpload).toBe(true);
    expect(ui.backgroundAssets).toEqual(expect.arrayContaining(['suiyiMapVirtualCore', 'bgEclipse', 'uiEmblemLoop']));
    expect(ui.buttons).toEqual(expect.arrayContaining(['titleOpen', 'resultRetry', 'resultProfile']));
  });

  it('requires hell mode for leaderboard eligibility and defaults it on', () => {
    const hell = board.hellModeSpec();
    expect(hell.defaultEnabled).toBe(true);
    expect(hell.leaderboardRequiresHellMode).toBe(true);
    expect(hell.promptOnStart).toBe(true);
    expect(hell.oneHostileHitKills).toBe(true);
    expect(hell.ignoresInvulnerability).toBe(true);
    expect(hell.uploadOnlyWhenEligible).toBe(true);

    expect(board.leaderboardEligibilityForTest(true).canUpload).toBe(true);
    expect(board.leaderboardEligibilityForTest(false).canUpload).toBe(false);
  });

  it('makes a hell-mode hostile hit kill through invulnerability and ultimate protection', () => {
    const hit = board.simulateHellDamageForTest({ hellMode: true, inv: 9, ultimate: true, lives: 2 });
    expect(hit.outcome).toBe('lose');
    expect(hit.hpAfter).toBe(0);
    expect(hit.livesAfter).toBe(0);
    expect(hit.ignoredInvulnerability).toBe(true);
    expect(hit.ignoredUltimate).toBe(true);
    expect(hit.leaderboardEligible).toBe(true);

    const normal = board.simulateHellDamageForTest({ hellMode: false, inv: 9, ultimate: true, lives: 2 });
    expect(normal.outcome).toBe('ignoredByInvulnerability');
    expect(normal.leaderboardEligible).toBe(false);
  });

  it('can rank the current player from fetched rows', () => {
    const rows = board.sampleRowsForTest();
    expect(board.rankForTest(rows, rows[0].player_name)).toBe(1);
    expect(board.rankForTest(rows, 'not-on-board')).toBe(null);
  });
});
