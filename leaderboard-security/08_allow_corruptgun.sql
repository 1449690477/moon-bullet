-- ============================================================
-- 月蚀排行榜 · 允许 7 号战机 corruptgun 上榜
-- 在 Supabase Dashboard → SQL Editor 整段粘贴运行
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
     OR NEW.character NOT IN (
       'witch','yanuxiya','anna','reaver','motherlife','skyward','corruptgun'
     ) THEN
    RAISE EXCEPTION 'leaderboard guard: invalid character %', NEW.character;
  END IF;

  IF NEW.player_name IS NULL
     OR length(btrim(NEW.player_name)) = 0
     OR length(NEW.player_name) > 24 THEN
    RAISE EXCEPTION 'leaderboard guard: invalid player_name';
  END IF;

  IF NEW.elapsed > 7200 THEN
    RAISE EXCEPTION 'leaderboard guard: elapsed out of range (%)', NEW.elapsed;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leaderboard_sanity ON public.leaderboard;
CREATE TRIGGER trg_leaderboard_sanity
BEFORE INSERT OR UPDATE ON public.leaderboard
FOR EACH ROW EXECUTE FUNCTION public.leaderboard_sanity_guard();

SELECT 'corruptgun allowed on leaderboard' AS result;
