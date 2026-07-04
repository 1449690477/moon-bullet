-- ============================================================
-- 月蚀排行榜 · 第一步：立即止血
-- 在 Supabase 控制台 → SQL Editor 整段粘贴运行（约 10 秒）。
-- 作用：① 删除作弊第一名；② 上一道临时护栏，挡住「直接 POST 超高分」。
--       这一步不需要改前端、不需要重新部署，跑完刷新榜单即可见效。
-- ============================================================

-- 1) 删除伪造的第一名（SEC_TEST / luna / 99999999，0 击杀 1 秒）
DELETE FROM public.leaderboard
WHERE id = 18
   OR (player_name = 'SEC_TEST' AND score = 99999999)
   OR character = 'luna';          -- luna 不是合法角色，属注入数据

-- 2) （可选）清理其它「明显不可能」的脏数据
--    先只看，确认无误后再取消最后那段 DELETE 的注释执行。
-- SELECT id, player_name, character, score, kill_count, elapsed, bosses_cleared, loop_count, created_at
-- FROM public.leaderboard
-- WHERE elapsed < 5
--    OR (elapsed > 0 AND score::numeric / elapsed > 12000)
--    OR (elapsed > 0 AND kill_count::numeric / elapsed > 20)
--    OR character NOT IN ('witch','yanuxiya','anna','reaver','motherlife','skyward')
-- ORDER BY score DESC;
--
-- DELETE FROM public.leaderboard
-- WHERE elapsed < 5
--    OR (elapsed > 0 AND score::numeric / elapsed > 12000)
--    OR (elapsed > 0 AND kill_count::numeric / elapsed > 20)
--    OR character NOT IN ('witch','yanuxiya','anna','reaver','motherlife','skyward');

-- 3) 临时护栏：在正式 Edge Function 上线前，先用触发器拦截异常成绩。
--    合法成绩照常写入；像 99999999 这种会被直接拒绝（即使有人拿公开 key 直插）。
CREATE OR REPLACE FUNCTION public.leaderboard_sanity_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- 字段必须是合理的非负数
  IF NEW.score IS NULL OR NEW.score < 0
     OR NEW.kill_count IS NULL OR NEW.kill_count < 0
     OR NEW.loop_count IS NULL OR NEW.loop_count < 0
     OR NEW.bosses_cleared IS NULL OR NEW.bosses_cleared < 0
     OR NEW.elapsed IS NULL OR NEW.elapsed < 0 THEN
    RAISE EXCEPTION 'leaderboard guard: invalid numeric fields';
  END IF;

  -- 角色白名单（luna 这类直接挡掉）
  IF NEW.character IS NULL
     OR NEW.character NOT IN ('witch','yanuxiya','anna','reaver','motherlife','skyward') THEN
    RAISE EXCEPTION 'leaderboard guard: invalid character %', NEW.character;
  END IF;

  -- 昵称
  IF NEW.player_name IS NULL
     OR length(btrim(NEW.player_name)) = 0
     OR length(NEW.player_name) > 24 THEN
    RAISE EXCEPTION 'leaderboard guard: invalid player_name';
  END IF;

  -- 时长边界（秒）
  IF NEW.elapsed < 5 OR NEW.elapsed > 7200 THEN
    RAISE EXCEPTION 'leaderboard guard: elapsed out of range (%)', NEW.elapsed;
  END IF;

  -- 异常分数阈值（与 Edge Function 的隔离规则一致）：不再按总分上限拦截，允许 500 万以上正常高分。
  IF (NEW.elapsed > 0 AND NEW.score::numeric / NEW.elapsed > 12000)
     OR (NEW.elapsed > 0 AND NEW.kill_count::numeric / NEW.elapsed > 20)
     OR NEW.bosses_cleared > floor(NEW.elapsed / 80.0) + 1
     OR NEW.loop_count > NEW.bosses_cleared + 1 THEN
    RAISE EXCEPTION 'leaderboard guard: score failed sanity check';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leaderboard_sanity ON public.leaderboard;
CREATE TRIGGER trg_leaderboard_sanity
BEFORE INSERT OR UPDATE ON public.leaderboard
FOR EACH ROW EXECUTE FUNCTION public.leaderboard_sanity_guard();

-- 完成。刷新游戏里的排行榜：SEC_TEST 应已消失；
-- 此时即便有人用公开 key 直插 99999999 也会被触发器拒绝。
