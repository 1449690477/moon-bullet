-- 月蚀排行榜 · 取消分数审核隔离 / 接受所有合法非负分数
-- 在 Supabase Dashboard -> SQL Editor 运行。
-- 目标：不再因为分数、击杀速度、Boss 数或轮回数触发待审核/拒绝。

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leaderboard TO anon, authenticated;

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

CREATE POLICY "anon_all_leaderboard"
  ON public.leaderboard
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_leaderboard_sanity ON public.leaderboard;

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
     OR NEW.character NOT IN ('witch','yanuxiya','anna','reaver','motherlife','skyward') THEN
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

CREATE TRIGGER trg_leaderboard_sanity
BEFORE INSERT OR UPDATE ON public.leaderboard
FOR EACH ROW EXECUTE FUNCTION public.leaderboard_sanity_guard();

SELECT 'leaderboard score review disabled' AS result;
