-- 6. Defense in depth: strip default grants, re-grant only what the app uses
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.ghost_runs, public.passages, public.profiles, public.race_checkpoints, public.race_results, public.room_players, public.rooms, public.solo_checkpoints, public.solo_sessions FROM anon, authenticated;
REVOKE ALL ON public.ghost_runs, public.profiles, public.race_checkpoints, public.race_results, public.room_players, public.rooms, public.solo_checkpoints, public.solo_sessions FROM anon;
GRANT INSERT ON public.race_checkpoints, public.solo_checkpoints TO authenticated;
GRANT INSERT, DELETE ON public.rooms TO authenticated;
GRANT DELETE ON public.room_players TO authenticated;
GRANT UPDATE (blob) ON public.profiles TO authenticated;
DROP POLICY IF EXISTS "Users insert own ghosts" ON public.ghost_runs;
DROP POLICY IF EXISTS "Users update own ghosts" ON public.ghost_runs;
DROP POLICY IF EXISTS "Users delete own ghosts" ON public.ghost_runs;

-- 1. Server-stamped checkpoint time (re-create triggers to be sure they overwrite)
CREATE OR REPLACE FUNCTION public.stamp_checkpoint() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$ BEGIN NEW.server_ts := now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS stamp_checkpoint ON public.race_checkpoints;
CREATE TRIGGER stamp_checkpoint BEFORE INSERT ON public.race_checkpoints FOR EACH ROW EXECUTE FUNCTION public.stamp_checkpoint();
DROP TRIGGER IF EXISTS stamp_solo_checkpoint ON public.solo_checkpoints;
CREATE TRIGGER stamp_solo_checkpoint BEFORE INSERT ON public.solo_checkpoints FOR EACH ROW EXECUTE FUNCTION public.stamp_checkpoint();

-- 2. Rooms always start as a fresh lobby
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS starting_players integer;
CREATE OR REPLACE FUNCTION public.sanitize_new_room() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$ BEGIN
  NEW.status := 'lobby'; NEW.starts_at := NULL; NEW.next_room_code := NULL;
  NEW.starting_players := NULL; NEW.created_at := now();
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS sanitize_new_room ON public.rooms;
CREATE TRIGGER sanitize_new_room BEFORE INSERT ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.sanitize_new_room();

-- 3. Record how many connected players were in the race at start
CREATE OR REPLACE FUNCTION public.start_race(_room_id uuid) RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE ts timestamptz;
BEGIN
  UPDATE public.rooms SET status = 'countdown', starts_at = now() + interval '3 seconds',
    starting_players = (SELECT count(*) FROM public.room_players WHERE room_id = _room_id AND connected)
  WHERE id = _room_id AND host_id = auth.uid() AND status = 'lobby'
  RETURNING starts_at INTO ts;
  IF ts IS NULL THEN RAISE EXCEPTION 'cannot_start'; END IF;
  RETURN ts;
END; $$;

-- 4+5. Atomic finish: lock room, assign placement, score, write result and profile in one transaction
CREATE OR REPLACE FUNCTION public.record_multi_result(_room_id uuid, _user_id uuid, _wpm numeric, _accuracy numeric, _errors integer, _finished_at timestamptz)
RETURNS TABLE(placement integer, points integer, already boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE r public.rooms; pl integer; pts integer; base integer; prev public.room_players;
  bonus integer[] := ARRAY[50, 30, 20, 10];
BEGIN
  SELECT * INTO r FROM public.rooms WHERE id = _room_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'room_not_found'; END IF;
  SELECT * INTO prev FROM public.room_players WHERE room_id = _room_id AND user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_in_room'; END IF;
  IF prev.finished_at IS NOT NULL THEN
    RETURN QUERY SELECT prev.placement, prev.points, true; RETURN;
  END IF;
  SELECT count(*) + 1 INTO pl FROM public.room_players WHERE room_id = _room_id AND finished_at IS NOT NULL;
  IF coalesce(r.starting_players, 0) >= 2 THEN
    pts := round(_wpm * _accuracy / 100) + coalesce(bonus[pl], 5);
  ELSE
    pts := round(_wpm * _accuracy / 100 / 2);
  END IF;
  UPDATE public.room_players SET progress = 1, wpm = _wpm, accuracy = _accuracy, errors = _errors,
    placement = pl, points = pts, finished_at = _finished_at
  WHERE room_id = _room_id AND user_id = _user_id;
  INSERT INTO public.race_results (user_id, room_id, mode, passage_id, wpm, accuracy, points)
  VALUES (_user_id, _room_id, 'multi', r.passage_id, _wpm, _accuracy, pts);
  UPDATE public.profiles SET total_points = total_points + pts, best_wpm = greatest(best_wpm, _wpm),
    races_played = races_played + 1 WHERE id = _user_id;
  RETURN QUERY SELECT pl, pts, false;
END; $$;

CREATE OR REPLACE FUNCTION public.apply_profile_result(_user_id uuid, _points integer, _wpm numeric)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $$
  UPDATE public.profiles SET total_points = total_points + _points, best_wpm = greatest(best_wpm, _wpm),
    races_played = races_played + 1 WHERE id = _user_id;
$$;

REVOKE EXECUTE ON FUNCTION public.record_multi_result(uuid, uuid, numeric, numeric, integer, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_profile_result(uuid, integer, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_multi_result(uuid, uuid, numeric, numeric, integer, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_profile_result(uuid, integer, numeric) TO service_role;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.advance_room(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.start_race(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.join_room(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.leave_room(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.race_again(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_player_connected(uuid, uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_leaderboard(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.advance_room(uuid), public.start_race(uuid), public.join_room(text), public.leave_room(uuid), public.race_again(uuid), public.set_player_connected(uuid, uuid, boolean), public.get_leaderboard(text, integer) TO authenticated, service_role;