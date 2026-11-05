CREATE OR REPLACE FUNCTION public.join_room(_code text)
 RETURNS rooms LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r public.rooms; p public.profiles;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_signed_in'; END IF;
  SELECT * INTO r FROM public.rooms WHERE code = upper(trim(_code));
  IF NOT FOUND THEN RAISE EXCEPTION 'room_not_found'; END IF;
  IF EXISTS (SELECT 1 FROM public.room_players WHERE room_id = r.id AND user_id = auth.uid()) THEN
    UPDATE public.room_players SET connected = true WHERE room_id = r.id AND user_id = auth.uid();
    RETURN r;
  END IF;
  IF r.status = 'finished' THEN RAISE EXCEPTION 'race_finished'; END IF;
  IF r.status <> 'lobby' THEN RAISE EXCEPTION 'race_in_progress'; END IF;
  IF (SELECT count(*) FROM public.room_players WHERE room_id = r.id) >= 8 THEN RAISE EXCEPTION 'room_full'; END IF;
  SELECT * INTO p FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.room_players (room_id, user_id, blob, username) VALUES (r.id, auth.uid(), p.blob, p.username);
  RETURN r;
END; $function$;