import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Blob } from "@/components/blob/Blob";
import { BlobState } from "@/components/BlobState";
import { Countdown } from "@/components/race/Countdown";
import { Lanes, Splash } from "@/components/race/Lanes";
import { Stats } from "@/components/race/Stats";
import { TypingCard } from "@/components/race/TypingCard";
import { Button } from "@/components/ui/button";
import { useProfile, useUser } from "@/hooks/use-auth";
import { useServerOffset } from "@/hooks/use-room";
import { useTypingEngine } from "@/hooks/use-typing";
import { supabase } from "@/integrations/supabase/client";
import { isBlobType } from "@/lib/blobs";
import { startSolo, submitSolo, type GhostInfo } from "@/lib/solo.functions";
import { computeAccuracy, computeWpm } from "@/lib/scoring";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/solo")({
  head: () => ({
    meta: [
      { title: "Solo ghost race · Blob Gang" },
      { name: "description", content: "Race the ghost of your best run and beat your own record." },
      { property: "og:title", content: "Solo ghost race · Blob Gang" },
      { property: "og:description", content: "Race the ghost of your best run and beat your own record." },
    ],
  }),
  component: Solo,
});

type Difficulty = "any" | "easy" | "medium" | "hard";
type Session = { soloId: string; startsAt: string; passage: { id: number; text: string; difficulty: string }; ghost: GhostInfo };
type Result = { wpm: number; accuracy: number; points: number; newBest: boolean };

const DIFFS: { id: Difficulty; label: string }[] = [
  { id: "any", label: "Surprise me" }, { id: "easy", label: "Easy" }, { id: "medium", label: "Medium" }, { id: "hard", label: "Hard" },
];

function ghostChars(g: GhostInfo, elapsed: number, len: number) {
  if (elapsed <= 0) return 0;
  if (g.timeline) {
    let lo = 0, hi = g.timeline.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (g.timeline[m]! <= elapsed) lo = m + 1; else hi = m; }
    return lo;
  }
  return Math.min(len, (g.wpm * 5 * elapsed) / 60000);
}

function Solo() {
  const { user } = useUser();
  const { data: profile } = useProfile(user?.id);
  const offset = useServerOffset();
  const [difficulty, setDifficulty] = useState<Difficulty>("any");
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [rejected, setRejected] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const text = session?.passage.text ?? "";
  const startsAt = session ? Date.parse(session.startsAt) : null;
  const serverNow = now + offset;
  const started = startsAt !== null && serverNow >= startsAt;
  const engine = useTypingEngine(text, started && !result, startsAt !== null ? startsAt - offset : null, session?.soloId);
  const done = text.length > 0 && engine.index >= text.length;
  const canType = started && !done && !result;
  const blob = profile && isBlobType(profile.blob) ? profile.blob : "bubbles";

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 50);
    return () => clearInterval(id);
  }, []);

  async function begin(d: Difficulty) {
    setDifficulty(d);
    setLoading(true);
    setResult(null);
    setRejected(null);
    setSession(null);
    lastCp.current = 0;
    submittedFor.current = null;
    try {
      setSession(await startSolo({ data: { difficulty: d } }));
    } catch {
      toast.error("Could not start a solo race.");
    } finally {
      setLoading(false);
    }
  }

  const offsetRef = useRef(offset);
  offsetRef.current = offset;
  const lastCp = useRef(0);
  const insertCheckpoint = useCallback(async () => {
    const { index, errors } = engine.live.current;
    if (!user || !session || index <= lastCp.current) return;
    lastCp.current = index;
    await supabase.from("solo_checkpoints").insert({
      solo_id: session.soloId, user_id: user.id, char_index: index, errors,
      client_ts: new Date(Date.now() + offsetRef.current).toISOString(),
    });
  }, [user, session, engine.live]);

  useEffect(() => {
    if (!canType) return;
    const id = setInterval(() => void insertCheckpoint(), 2000);
    return () => clearInterval(id);
  }, [canType, insertCheckpoint]);

  const submittedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!done || !session || submittedFor.current === session.soloId) return;
    submittedFor.current = session.soloId;
    (async () => {
      await insertCheckpoint();
      try {
        const res = await submitSolo({ data: { soloId: session.soloId, timeline: engine.timeline.current } });
        if (res.ok) setResult(res);
        else setRejected(res.error);
      } catch {
        setRejected("Could not submit your result.");
      }
    })();
  }, [done, session, insertCheckpoint, engine.timeline]);

  if (!session) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div className="glass flex flex-col items-center rounded-[2rem] p-6 text-center sm:p-10">
          <div className="flex items-end gap-2">
            <Blob type={blob} size={96} animation="happy" />
            <Blob type={blob} size={96} animation="idle" ghost />
          </div>
          <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Race your ghost</h1>
          <p className="mt-2 max-w-md text-muted-foreground">Your best run on each passage comes back as a ghost. New passage? A gentle pace-bot keeps you company.</p>
          <div className="mt-6 grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
            {DIFFS.map((d) => (
              <Button key={d.id} variant={d.id === "any" ? "jelly" : "soft"} disabled={loading} onClick={() => begin(d.id)}>{d.label}</Button>
            ))}
          </div>
          {loading && <BlobState kind="loading" title="Summoning your ghost…" />}
        </div>
      </main>
    );
  }

  const elapsed = started && startsAt ? serverNow - startsAt : 0;
  const ghostIdx = ghostChars(session.ghost, elapsed, text.length);
  const ghostLabel = session.ghost.kind === "best" ? `Best ghost · ${Math.round(session.ghost.wpm)} wpm`
    : session.ghost.kind === "average" ? `Your average · ${session.ghost.wpm} wpm` : `Pace-bot · ${session.ghost.wpm} wpm`;
  const myWpm = result ? result.wpm : computeWpm(engine.index, elapsed);
  const acc = result ? result.accuracy : engine.index > 0 ? computeAccuracy(engine.index, engine.errors) : 100;
  const countdown = startsAt === null ? null : serverNow < startsAt ? Math.ceil((startsAt - serverNow) / 1000) : serverNow - startsAt < 600 ? 0 : null;
  const diff = result ? result.wpm - session.ghost.wpm : 0;
  const beat = diff > 0;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 px-3 py-4 sm:space-y-6 sm:px-6 sm:py-6">
      <Countdown value={countdown} />
      <Lanes racers={[
        { userId: "me", username: profile?.username ?? "you", blob, isMe: true, connected: true, finished: done,
          progress: text ? engine.index / text.length : 0, pulse: done ? undefined : engine.pulse },
        { userId: "ghost", username: ghostLabel, blob, ghost: true, connected: true, finished: ghostIdx >= text.length,
          progress: text ? ghostIdx / text.length : 0 },
      ]} />
      {result || rejected ? (
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass flex flex-col items-center rounded-[2rem] p-6 text-center sm:p-10">
          <div className="relative">
            <Blob type={blob} size={110} animation={beat ? "happy" : "idle"} mood={rejected ? "grumpy" : beat ? "happy" : "sleepy"} />
            {beat && <Splash />}
          </div>
          {rejected ? (
            <><h2 className="mt-3 text-2xl font-bold">Result not counted</h2><p className="text-muted-foreground">{rejected}</p></>
          ) : result && (
            <>
              <h2 className="mt-3 text-3xl font-bold">{beat ? `You beat your ghost by ${Math.round(diff * 10) / 10} wpm!` : "Ghost wins this time"}</h2>
              <p className="mt-1 text-muted-foreground">
                {Math.round(result.wpm)} wpm · {Math.round(result.accuracy)}% accuracy · +{result.points} pts
                {result.newBest && " · new best on this passage!"}
              </p>
            </>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button variant="jelly" onClick={() => begin(difficulty)}>Race again</Button>
            <Button variant="soft" onClick={() => setSession(null)}>Change difficulty</Button>
            <Button asChild variant="ghost"><Link to="/leaderboard">Leaderboard</Link></Button>
          </div>
        </motion.section>
      ) : (
        <>
          <TypingCard text={text} index={engine.index} hasError={engine.hasError} errorTick={engine.errorTick}
            disabled={!canType} onChar={engine.onChar} onBackspace={engine.onBackspace} />
          <Stats wpm={myWpm} accuracy={acc} />
          <p className={cn("text-center text-xs text-muted-foreground", done && "animate-pulse")}>
            {done ? "Checking your run…" : `${session.passage.difficulty} passage`}
          </p>
        </>
      )}
    </main>
  );
}
