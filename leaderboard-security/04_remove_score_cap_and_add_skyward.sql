-- ============================================================
-- 月蚀排行榜 · 解除 500 万分上限 + 允许苍穹圣巡上榜
--
-- 用途：
-- 1) 旧版临时触发器会挡住 score > 5,000,000。
-- 2) 旧版角色白名单没有 skyward。
-- 跑完后：正式榜不再按总分上限拦截，仍保留分/秒、击杀/秒、Boss/轮回等基础异常检查。
-- ============================================================

CREATE OR REPLACE FUNCTION public.leaderboard_sanity_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.score IS NULL OR NEW.score < 0
     OR NEW.kill_count IS NULL OR NEW.kill_count < 0
     OR NEW.loop_count IS NULL OR NEW.loop_count < 0
     OR NEW.bosses_cleared IS NULL OR NEW.bosses_cleared < 0
     OR NEW.elapsed IS NULL OR NEW.elapsed < 0 THEN
    RAISE EXCEPTION 'leaderboard guard: invalid numeric fields';
  END IF;

  IF NEW.character IS NULL
     OR NEW.character NOT IN ('witch','yanuxiya','anna','reaver','motherlife','skyward','corruptgun') THEN
    RAISE EXCEPTION 'leaderboard guard: invalid character %', NEW.character;
  END IF;

  IF NEW.player_name IS NULL
     OR length(btrim(NEW.player_name)) = 0
     OR length(NEW.player_name) > 24 THEN
    RAISE EXCEPTION 'leaderboard guard: invalid player_name';
  END IF;

  IF NEW.elapsed < 5 OR NEW.elapsed > 7200 THEN
    RAISE EXCEPTION 'leaderboard guard: elapsed out of range (%)', NEW.elapsed;
  END IF;

  -- 新赛季取消旧的分数速度限制，避免 500 万以上正常成绩被误拦。
  IF (NEW.elapsed > 0 AND NEW.kill_count::numeric / NEW.elapsed > 20)
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
