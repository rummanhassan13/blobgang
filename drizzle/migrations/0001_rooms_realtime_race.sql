
ALTER TABLE public.room_players ADD COLUMN connected boolean NOT NULL DEFAULT true;
ALTER TABLE public.room_players ADD COLUMN errors integer NOT NULL DEFAULT 0;
ALTER TABLE public.room_players ADD COLUMN points integer NOT NULL DEFAULT 0;

-- Clients may no longer write race stats directly
DROP POLICY IF EXISTS "Players update self" ON public.room_players;
DROP POLICY IF EXISTS "Players join as self" ON public.room_players;
REVOKE INSERT, UPDATE ON public.room_players FROM authenticated;
DROP POLICY IF EXISTS "Host updates room" ON public.rooms;
REVOKE UPDATE ON public.rooms FROM authenticated;
DROP POLICY IF EXISTS "Users insert own results" ON public.race_results;
REVOKE INSERT ON public.race_results FROM authenticated;
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (blob) ON public.profiles TO authenticated;

-- Checkpoints for anti-cheat
CREATE TABLE public.race_checkpoints (
  id bigserial PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  char_index integer NOT NULL,
  client_ts timestamptz NOT NULL,
  server_ts timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX race_checkpoints_lookup ON public.race_checkpoints (room_id, user_id, server_ts);
GRANT SELECT, INSERT ON public.race_checkpoints TO authenticated;
GRANT USAGE ON SEQUENCE public.race_checkpoints_id_seq TO authenticated;
GRANT ALL ON public.race_checkpoints TO service_role;
ALTER TABLE public.race_checkpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Insert own checkpoints in racing room" ON public.race_checkpoints FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.room_players p WHERE p.room_id = race_checkpoints.room_id AND p.user_id = auth.uid()));
CREATE POLICY "Read own checkpoints" ON public.race_checkpoints FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.stamp_checkpoint() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.server_ts := now(); RETURN NEW; END; $$;
CREATE TRIGGER stamp_checkpoint BEFORE INSERT ON public.race_checkpoints FOR EACH ROW EXECUTE FUNCTION public.stamp_checkpoint();

CREATE OR REPLACE FUNCTION public.server_time() RETURNS timestamptz LANGUAGE sql STABLE AS $$ SELECT now() $$;
GRANT EXECUTE ON FUNCTION public.server_time() TO authenticated;

CREATE OR REPLACE FUNCTION public.join_room(_code text)
RETURNS public.rooms LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.rooms; p public.profiles;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_signed_in'; END IF;
  SELECT * INTO r FROM public.rooms WHERE code = upper(trim(_code));
  IF NOT FOUND THEN RAISE EXCEPTION 'room_not_found'; END IF;
  IF EXISTS (SELECT 1 FROM public.room_players WHERE room_id = r.id AND user_id = auth.uid()) THEN
    UPDATE public.room_players SET connected = true WHERE room_id = r.id AND user_id = auth.uid();
    RETURN r;
  END IF;
  IF r.status <> 'lobby' THEN RAISE EXCEPTION 'race_in_progress'; END IF;
  IF (SELECT count(*) FROM public.room_players WHERE room_id = r.id) >= 8 THEN RAISE EXCEPTION 'room_full'; END IF;
  SELECT * INTO p FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.room_players (room_id, user_id, blob, username) VALUES (r.id, auth.uid(), p.blob, p.username);
  RETURN r;
END; $$;
GRANT EXECUTE ON FUNCTION public.join_room(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.leave_room(_room_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.room_players p USING public.rooms r
  WHERE p.room_id = _room_id AND p.user_id = auth.uid() AND r.id = p.room_id AND r.status = 'lobby';
$$;
GRANT EXECUTE ON FUNCTION public.leave_room(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_player_connected(_room_id uuid, _user_id uuid, _connected boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.room_players WHERE room_id = _room_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'not_in_room';
  END IF;
  -- Only you can mark yourself back online; any member can report a drop
  IF _connected AND _user_id <> auth.uid() THEN RETURN; END IF;
  UPDATE public.room_players SET connected = _connected
  WHERE room_id = _room_id AND user_id = _user_id AND connected <> _connected;
END; $$;
GRANT EXECUTE ON FUNCTION public.set_player_connected(uuid, uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.start_race(_room_id uuid)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ts timestamptz;
BEGIN
  UPDATE public.rooms SET status = 'countdown', starts_at = now() + interval '3 seconds'
  WHERE id = _room_id AND host_id = auth.uid() AND status = 'lobby'
  RETURNING starts_at INTO ts;
  IF ts IS NULL THEN RAISE EXCEPTION 'cannot_start'; END IF;
  RETURN ts;
END; $$;
GRANT EXECUTE ON FUNCTION public.start_race(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.advance_room(_room_id uuid)
RETURNS public.room_status LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.rooms; first_finish timestamptz;
BEGIN
  SELECT * INTO r FROM public.rooms WHERE id = _room_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'room_not_found'; END IF;
  IF r.status = 'countdown' AND now() >= r.starts_at THEN
    UPDATE public.rooms SET status = 'racing' WHERE id = r.id; r.status := 'racing';
  END IF;
  IF r.status = 'racing' THEN
    SELECT min(finished_at) INTO first_finish FROM public.room_players WHERE room_id = r.id;
    IF NOT EXISTS (SELECT 1 FROM public.room_players WHERE room_id = r.id AND connected AND finished_at IS NULL)
       OR (first_finish IS NOT NULL AND now() > first_finish + interval '60 seconds')
       OR now() > r.starts_at + interval '10 minutes' THEN
      UPDATE public.rooms SET status = 'finished' WHERE id = r.id; r.status := 'finished';
    END IF;
  END IF;
  RETURN r.status;
END; $$;
GRANT EXECUTE ON FUNCTION public.advance_room(uuid) TO authenticated, service_role;

ALTER TABLE public.rooms REPLICA IDENTITY FULL;
ALTER TABLE public.room_players REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_players;
