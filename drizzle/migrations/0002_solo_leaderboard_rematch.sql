
ALTER TABLE public.race_checkpoints ADD COLUMN errors integer NOT NULL DEFAULT 0;
ALTER TABLE public.rooms ADD COLUMN next_room_code text;

CREATE TABLE public.solo_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  passage_id integer NOT NULL REFERENCES public.passages(id),
  starts_at timestamptz NOT NULL,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.solo_sessions TO authenticated;
GRANT ALL ON public.solo_sessions TO service_role;
ALTER TABLE public.solo_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own solo sessions" ON public.solo_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.solo_checkpoints (
  id bigserial PRIMARY KEY,
  solo_id uuid NOT NULL REFERENCES public.solo_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  char_index integer NOT NULL,
  errors integer NOT NULL DEFAULT 0,
  client_ts timestamptz NOT NULL,
  server_ts timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX solo_checkpoints_lookup ON public.solo_checkpoints (solo_id, server_ts);
GRANT SELECT, INSERT ON public.solo_checkpoints TO authenticated;
GRANT USAGE ON SEQUENCE public.solo_checkpoints_id_seq TO authenticated;
GRANT ALL ON public.solo_checkpoints TO service_role;
ALTER TABLE public.solo_checkpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Insert own solo checkpoints" ON public.solo_checkpoints FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.solo_sessions s WHERE s.id = solo_id AND s.user_id = auth.uid() AND s.finished_at IS NULL));
CREATE POLICY "Read own solo checkpoints" ON public.solo_checkpoints FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER stamp_solo_checkpoint BEFORE INSERT ON public.solo_checkpoints FOR EACH ROW EXECUTE FUNCTION public.stamp_checkpoint();

CREATE INDEX race_results_created_idx ON public.race_results (created_at DESC, user_id);

CREATE OR REPLACE FUNCTION public.get_leaderboard(_period text, _limit integer DEFAULT 50)
RETURNS TABLE (rank bigint, user_id uuid, username text, blob public.blob_type, best_wpm numeric, points bigint, is_me boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH scores AS (
    SELECT p.id, p.username, p.blob, p.best_wpm,
      CASE WHEN _period = 'daily'
        THEN COALESCE((SELECT sum(r.points) FROM public.race_results r
              WHERE r.user_id = p.id AND r.created_at >= date_trunc('day', now() AT TIME ZONE 'utc') AT TIME ZONE 'utc'), 0)
        ELSE p.total_points END::bigint AS pts
    FROM public.profiles p
  ), ranked AS (
    SELECT rank() OVER (ORDER BY pts DESC, best_wpm DESC) AS rk, * FROM scores WHERE pts > 0
  )
  SELECT rk, id, username, blob, best_wpm, pts, id = auth.uid()
  FROM ranked WHERE auth.uid() IS NOT NULL AND (rk <= LEAST(GREATEST(_limit, 1), 100) OR id = auth.uid())
  ORDER BY rk, username;
$$;
REVOKE EXECUTE ON FUNCTION public.get_leaderboard(text, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.race_again(_room_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE old public.rooms; new_code text; new_id uuid; pid integer;
BEGIN
  SELECT * INTO old FROM public.rooms WHERE id = _room_id FOR UPDATE;
  IF NOT FOUND OR old.host_id <> auth.uid() THEN RAISE EXCEPTION 'not_host'; END IF;
  IF old.next_room_code IS NOT NULL THEN RETURN old.next_room_code; END IF;
  SELECT id INTO pid FROM public.passages WHERE id IS DISTINCT FROM old.passage_id ORDER BY random() LIMIT 1;
  LOOP
    new_code := (SELECT string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', (floor(random()*31)+1)::int, 1), '') FROM generate_series(1,5));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.rooms WHERE code = new_code);
  END LOOP;
  INSERT INTO public.rooms (code, host_id, passage_id) VALUES (new_code, auth.uid(), pid) RETURNING id INTO new_id;
  INSERT INTO public.room_players (room_id, user_id, blob, username, connected)
    SELECT new_id, rp.user_id, pr.blob, pr.username, rp.user_id = auth.uid()
    FROM public.room_players rp JOIN public.profiles pr ON pr.id = rp.user_id WHERE rp.room_id = old.id;
  UPDATE public.rooms SET next_room_code = new_code WHERE id = old.id;
  RETURN new_code;
END; $$;
GRANT EXECUTE ON FUNCTION public.race_again(uuid) TO authenticated;
