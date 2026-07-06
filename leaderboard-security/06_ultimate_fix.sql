-- ============================================================
-- 月蚀排行榜 · 终极修复（一次跑完）
-- 在 Supabase Dashboard → SQL Editor 整段粘贴运行
-- 作用：① 恢复 anon 写入权限 ② 重建无上限触发器 ③ 恢复归档数据
-- ============================================================

-- 1) 恢复 anon 角色的读写删权限（被 03_full_hardening.sql 撤销了）
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leaderboard TO anon, authenticated;

-- 2) 确保 RLS 策略允许匿名读写删
-- 先删旧策略
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'leaderboard'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.leaderboard', p.policyname);
  END LOOP;
END $$;

-- 再建新策略：anon 可以读写删
CREATE POLICY "anon_all_leaderboard"
  ON public.leaderboard
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 3) 删除旧触发器
DROP TRIGGER IF EXISTS trg_leaderboard_sanity ON public.leaderboard;

-- 4) 重建触发器函数 —— 无 score 上限，只做基础合理性检查
CREATE OR REPLACE FUNCTION public.leaderboard_sanity_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- 字段非负
  IF NEW.score IS NULL OR NEW.score < 0
     OR NEW.kill_count IS NULL OR NEW.kill_count < 0
     OR NEW.loop_count IS NULL OR NEW.loop_count < 0
     OR NEW.bosses_cleared IS NULL OR NEW.bosses_cleared < 0
     OR NEW.elapsed IS NULL OR NEW.elapsed < 0 THEN
    RAISE EXCEPTION 'leaderboard guard: invalid numeric fields';
  END IF;

  -- 角色白名单
  IF NEW.character IS NULL
     OR NEW.character NOT IN ('witch','yanuxiya','anna','reaver','motherlife','skyward') THEN
    RAISE EXCEPTION 'leaderboard guard: invalid character %', NEW.character;
  END IF;

  -- 昵称长度
  IF NEW.player_name IS NULL
     OR length(btrim(NEW.player_name)) = 0
     OR length(NEW.player_name) > 24 THEN
    RAISE EXCEPTION 'leaderboard guard: invalid player_name';
  END IF;

  -- 时长范围（0-7200秒，即2小时内）
  IF NEW.elapsed > 7200 THEN
    RAISE EXCEPTION 'leaderboard guard: elapsed out of range (%)', NEW.elapsed;
  END IF;

  -- 基础合理性检查（不限制 score 上限）
  IF (NEW.elapsed > 0 AND NEW.kill_count::numeric / NEW.elapsed > 30)
     OR NEW.bosses_cleared > floor(NEW.elapsed / 60.0) + 2
     OR NEW.loop_count > NEW.bosses_cleared + 1 THEN
    RAISE EXCEPTION 'leaderboard guard: sanity check failed';
  END IF;

  RETURN NEW;
END;
$$;

-- 5) 重新绑定触发器
CREATE TRIGGER trg_leaderboard_sanity
BEFORE INSERT OR UPDATE ON public.leaderboard
FOR EACH ROW EXECUTE FUNCTION public.leaderboard_sanity_guard();

-- 6) 清理测试数据
DELETE FROM public.leaderboard WHERE player_name LIKE '_test%';

-- 7) 从归档表恢复数据（如果归档成功的话）
INSERT INTO public.leaderboard (player_name, character, score, kill_count, loop_count, elapsed, bosses_cleared, created_at)
SELECT
  player_name, character, score, kill_count, loop_count, elapsed, bosses_cleared, created_at
FROM public.leaderboard_history
WHERE season_id = 'season-2026-07-05-pre-reset'
  AND score > 0
ON CONFLICT DO NOTHING;

-- 8) 确认结果
SELECT '修复完成！当前排行榜记录数：' || count(*)::text AS result FROM public.leaderboard;
SELECT '归档表记录数：' || count(*)::text AS result FROM public.leaderboard_history;
