
CREATE TYPE public.blob_type AS ENUM ('zippy','snooze','grumbo','bubbles','gloop','mochi');
CREATE TYPE public.room_status AS ENUM ('lobby','countdown','racing','finished');
CREATE TYPE public.race_mode AS ENUM ('solo','multi');

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  blob public.blob_type NOT NULL DEFAULT 'bubbles',
  total_points integer NOT NULL DEFAULT 0,
  best_wpm numeric NOT NULL DEFAULT 0,
  races_played integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX profiles_username_lower_idx ON public.profiles (lower(username));
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.username_available(_username text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = lower(trim(_username)));
$$;
GRANT EXECUTE ON FUNCTION public.username_available(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  base_name text;
  final_name text;
  chosen public.blob_type;
BEGIN
  base_name := coalesce(nullif(trim(NEW.raw_user_meta_data->>'username'), ''), split_part(NEW.email, '@', 1), 'blob');
  base_name := left(regexp_replace(base_name, '[^A-Za-z0-9_]', '', 'g'), 20);
  IF length(base_name) < 3 THEN base_name := 'blob' || base_name; END IF;
  final_name := base_name;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = lower(final_name)) LOOP
    final_name := left(base_name, 16) || floor(random() * 9000 + 1000)::int;
  END LOOP;
  BEGIN
    chosen := (NEW.raw_user_meta_data->>'blob')::public.blob_type;
  EXCEPTION WHEN others THEN chosen := 'bubbles';
  END;
  INSERT INTO public.profiles (id, username, blob) VALUES (NEW.id, final_name, coalesce(chosen, 'bubbles'));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- PASSAGES
CREATE TABLE public.passages (
  id serial PRIMARY KEY,
  text text NOT NULL,
  difficulty text NOT NULL DEFAULT 'medium',
  length integer NOT NULL
);
GRANT SELECT ON public.passages TO authenticated, anon;
GRANT ALL ON public.passages TO service_role;
ALTER TABLE public.passages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read passages" ON public.passages FOR SELECT TO anon, authenticated USING (true);

-- ROOMS
CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  host_id uuid NOT NULL,
  passage_id integer REFERENCES public.passages(id),
  status public.room_status NOT NULL DEFAULT 'lobby',
  starts_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read rooms" ON public.rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Host creates room" ON public.rooms FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Host updates room" ON public.rooms FOR UPDATE TO authenticated USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Host deletes room" ON public.rooms FOR DELETE TO authenticated USING (auth.uid() = host_id);

-- ROOM PLAYERS
CREATE TABLE public.room_players (
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  blob public.blob_type NOT NULL,
  username text NOT NULL,
  progress numeric NOT NULL DEFAULT 0,
  wpm numeric NOT NULL DEFAULT 0,
  accuracy numeric NOT NULL DEFAULT 100,
  finished_at timestamptz,
  placement integer,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_players TO authenticated;
GRANT ALL ON public.room_players TO service_role;
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read room players" ON public.room_players FOR SELECT TO authenticated USING (true);
CREATE POLICY "Players join as self" ON public.room_players FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Players update self" ON public.room_players FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Players leave or host kicks" ON public.room_players FOR DELETE TO authenticated USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.host_id = auth.uid())
);

-- RACE RESULTS
CREATE TABLE public.race_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  mode public.race_mode NOT NULL,
  passage_id integer NOT NULL REFERENCES public.passages(id),
  wpm numeric NOT NULL,
  accuracy numeric NOT NULL,
  points integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX race_results_user_idx ON public.race_results (user_id, created_at DESC);
GRANT SELECT, INSERT ON public.race_results TO authenticated;
GRANT ALL ON public.race_results TO service_role;
ALTER TABLE public.race_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read results" ON public.race_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own results" ON public.race_results FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- GHOST RUNS
CREATE TABLE public.ghost_runs (
  user_id uuid NOT NULL,
  passage_id integer NOT NULL REFERENCES public.passages(id) ON DELETE CASCADE,
  timeline jsonb NOT NULL DEFAULT '[]'::jsonb,
  wpm numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, passage_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ghost_runs TO authenticated;
GRANT ALL ON public.ghost_runs TO service_role;
ALTER TABLE public.ghost_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own ghosts" ON public.ghost_runs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own ghosts" ON public.ghost_runs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own ghosts" ON public.ghost_runs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own ghosts" ON public.ghost_runs FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- SEED PASSAGES
INSERT INTO public.passages (text, difficulty, length) SELECT t, CASE WHEN n < 25 THEN 'easy' WHEN n < 42 THEN 'medium' ELSE 'hard' END, n FROM (
  SELECT t, array_length(regexp_split_to_array(t, '\s+'), 1) AS n FROM unnest(ARRAY[
'The jelly blob woke up early, stretched its wobbly arms, and rolled down the hill to find some breakfast.',
'Every morning the town baker sings a quiet song while the bread rises in the warm stone oven.',
'A tiny paper boat drifted down the gutter after the rain, carrying a single brave ladybug.',
'Bright kites danced over the beach as children laughed and chased the foamy waves back to sea.',
'The old lighthouse keeper polished the giant lens until it sparkled like a star on the cliff.',
'Snails are not in a hurry. They carry their homes on their backs and never miss a sunset.',
'She opened the window, and the smell of fresh cut grass filled the whole sleepy kitchen.',
'My cat believes every cardboard box is a castle, and she is the queen of all of them.',
'The garden gnome kept a secret diary full of notes about worms, beetles, and passing clouds.',
'A soft breeze carried the scent of lemons across the market square on a lazy afternoon.',
'The robot learned to paint by watching the sky change colour from pink to purple to deep blue.',
'Practice makes progress. Type slowly at first, and your fingers will learn the rhythm on their own.',
'The penguins held a meeting on the ice to decide who would guard the fish for the winter.',
'Under the bridge lived a friendly troll who fixed bicycles for free and asked only for a joke in return.',
'He packed a sandwich, a map, and a yellow umbrella, then set off to climb the tallest hill in the county.',
'Clouds gathered over the valley, and soon the first fat drops of rain began to drum on the tin roof.',
'The library was so quiet that you could hear the pages turning three rows away.',
'A group of ducks marched in a neat line across the park path, ignoring every bicycle bell.',
'Fresh snow covered the city overnight, and in the morning the streets looked brand new and silent.',
'The tiny dragon could not breathe fire yet, so it practiced by blowing warm bubbles into the pond.',
'Our neighbor grows pumpkins so large that he needs a wagon and two friends to move each one.',
'The moon rose slowly over the mountains, painting the lake with a long silver stripe of light.',
'Keep your wrists relaxed and your eyes on the words. Speed comes after accuracy, never before it.',
'A hot cup of cocoa, a thick blanket, and a good book can turn any gray day into a great one.',
'The squirrel hid forty acorns in the yard and then forgot where it put thirty nine of them.',
'The marching band practiced in the empty parking lot every evening, filling the air with brassy music and the steady thump of a big bass drum.',
'Deep in the forest, an owl watched the fireflies blink on and off like tiny lanterns guiding lost travelers back toward the road.',
'The scientist mixed two clear liquids in a glass beaker, and to her delight the mixture turned a brilliant shade of green and began to glow.',
'Every summer the whole family drives to the coast, sings loudly in the car, and argues happily about which snack is the best.',
'The train rattled through the countryside, past sleepy farms and golden fields, while passengers dozed with their heads against the cool windows.',
'When the power went out, we lit candles, told ghost stories, and laughed so much that nobody noticed the lights coming back on.',
'Learning to juggle takes patience. You drop the balls a hundred times, then suddenly your hands find the pattern and everything clicks.',
'The museum guard had seen every painting a thousand times, yet each morning he still paused in front of the stormy sea and smiled.',
'Two friends built a treehouse with spare planks and bent nails. It leaned a little to the left, but it was perfect to them.',
'At the night market, lanterns swayed above stalls selling grilled corn, sweet dumplings, handmade bracelets, and jars of spicy honey.',
'The hiker reached the summit just as the sun broke through the clouds, and for a moment the entire valley seemed to hold its breath.',
'A good typist does not look at the keyboard. Trust your fingers, keep a steady pace, and let the words flow from the page to the screen.',
'The chef tasted the soup, frowned, added a pinch of salt and a squeeze of lime, then tasted it again and finally nodded with approval.',
'Bees spend their whole lives visiting flowers, dancing to share directions, and turning tiny drops of nectar into golden jars of honey.',
'The astronaut floated near the window of the station, watching storms flash silently over oceans and continents far below her feet.',
'Grandma keeps a tin of buttons in the closet. Each one has a story, from the brass one off a soldier coat to the tiny pearl from a wedding dress.',
'The orchestra tuned their instruments in a swirl of squeaks and hums, and then the conductor raised her baton and the hall fell perfectly still.',
'On rainy weekends we build enormous blanket forts in the living room, complete with pillow walls, flashlight lamps, and a strict password for entry.',
'The city never fully sleeps. Delivery trucks rumble past at dawn, bakers knead dough in the dark, and street sweepers hum along the empty avenues before the first commuters arrive.',
'Rivers carve canyons not through strength but through persistence. A trickle of water, given enough time, can shape mountains and reveal layers of ancient stone.',
'The inventor filled her workshop with strange machines: a toaster that sang, a broom that swept by itself, and a clock that ran backward every Tuesday afternoon.',
'Typing quickly is a skill built from thousands of small repetitions. Each session strengthens the connection between thought and motion until the keyboard feels like an extension of your mind.',
'At the edge of the harbor, fishing boats returned one by one, their decks crowded with nets and buckets, while hungry gulls circled overhead and shouted their complaints to anyone who would listen.',
'The old map showed an island shaped like a sleeping cat, surrounded by tiny drawings of sea monsters, swirling currents, and a single red cross marked with the words dig here at noon.',
'Some of the best ideas arrive at strange moments: in the shower, on a long walk, or just before sleep. Keep a notebook nearby, because inspiration rarely waits for a convenient time to appear.'
  ]) AS t
) s;
