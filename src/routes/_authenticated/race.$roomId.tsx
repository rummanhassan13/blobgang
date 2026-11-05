import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BlobState } from "@/components/BlobState";
import { Countdown } from "@/components/race/Countdown";
import { Lanes, type LaneRacer } from "@/components/race/Lanes";
import { TypingCard } from "@/components/race/TypingCard";
import { Stats } from "@/components/race/Stats";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-auth";
import { useRoomData, useRoomLive, useServerOffset } from "@/hooks/use-room";
import { useTypingEngine } from "@/hooks/use-typing";
import { supabase } from "@/integrations/supabase/client";
import { submitResult } from "@/lib/race.functions";
import { computeAccuracy, computeWpm } from "@/lib/scoring";

export const Route = createFileRoute("/_authenticated/race/$roomId")({
  head: () => ({
    meta: [
      { title: "Race · Blob Gang" },
      { name: "description", content: "Type fast and push your blob to the finish line." },
      { property: "og:title", content: "Race · Blob Gang" },
      { property: "og:description", content: "Type fast and push your blob to the finish line." },
    ],
  }),
  component: Race,
});

function Race() {
  const { roomId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const { data, isError } = useRoomData(roomId);
  const { online, progress, sendProgress } = useRoomLive(roomId, user?.id);
  const offset = useServerOffset();

  const room = data?.room;
  const text = (room?.passages as { text: string } | null)?.text ?? "";
  const startsAt = room?.starts_at ? Date.parse(room.starts_at) : null;
  const me = data?.players.find((p) => p.user_id === user?.id);

  const [now, setNow] = useState(() => Date.now());
  const serverNow = now + offset;
  const started = startsAt !== null && serverNow >= startsAt;
  const alreadyFinished = !!me?.finished_at;
  const baseCanType = started && !alreadyFinished && room?.status !== "finished" && !!me;
  const engine = useTypingEngine(text, baseCanType, startsAt !== null ? startsAt - offset : null);
  const { index, errors } = engine;
  const done = index >= text.length && text.length > 0;
  const canType = baseCanType && !done;
  const [submitted, setSubmitted] = useState(false);

  const countdown = startsAt === null ? null
    : serverNow < startsAt ? Math.ceil((startsAt - serverNow) / 1000)
    : serverNow - startsAt < 600 ? 0 : null;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (room?.status === "finished") navigate({ to: "/results/$roomId", params: { roomId } });
    if (room?.status === "lobby") navigate({ to: "/room/$code", params: { code: room.code } });
  }, [room?.status, room?.code, roomId, navigate]);

  useEffect(() => {
    if (!room || room.status === "finished" || room.status === "lobby") return;
    const id = setInterval(() => { void supabase.rpc("advance_room", { _room_id: roomId }).then(); }, 2000);
    return () => clearInterval(id);
  }, [room, roomId]);

  const startsRef = useRef(startsAt);
  startsRef.current = startsAt;
  const offsetRef = useRef(offset);
  offsetRef.current = offset;

  // Broadcast progress ~10/sec
  useEffect(() => {
    if (!user || !text) return;
    let last = -1;
    const id = setInterval(() => {
      const i = engine.live.current.index;
      if (i === last || startsRef.current === null) return;
      last = i;
      const elapsed = Date.now() + offsetRef.current - startsRef.current;
      sendProgress({ userId: user.id, progress: i / text.length, wpm: computeWpm(i, elapsed) });
    }, 100);
    return () => clearInterval(id);
  }, [user, text, sendProgress, engine.live]);

  // Anti-cheat checkpoints every 2s (char index + cumulative typos)
  const lastCp = useRef(0);
  const insertCheckpoint = useCallback(async () => {
    const { index: charIndex, errors: errs } = engine.live.current;
    if (!user || charIndex <= lastCp.current) return;
    lastCp.current = charIndex;
    await supabase.from("race_checkpoints").insert({
      room_id: roomId, user_id: user.id, char_index: charIndex, errors: errs,
      client_ts: new Date(Date.now() + offsetRef.current).toISOString(),
    });
  }, [user, roomId, engine.live]);
  useEffect(() => {
    if (!canType) return;
    const id = setInterval(() => void insertCheckpoint(), 2000);
    return () => clearInterval(id);
  }, [canType, insertCheckpoint]);

  useEffect(() => {
    if (!done || submitted || alreadyFinished) return;
    setSubmitted(true);
    (async () => {
      await insertCheckpoint();
      try {
        const res = await submitResult({ data: { roomId } });
        if (!res.ok) toast.error(`Result rejected: ${res.error}`);
        else toast.success(`Finished #${res.placement} at ${Math.round(res.wpm)} WPM!`);
      } catch {
        toast.error("Could not submit your result.");
      }
    })();
  }, [done, submitted, alreadyFinished, insertCheckpoint, roomId]);

  if (isError) {
    return <BlobState kind="error" title="This race wandered off."><Button asChild className="mt-4"><Link to="/home">Back home</Link></Button></BlobState>;
  }
  if (!data) return <BlobState kind="loading" title="Warming up the jelly…" />;
  if (!me) {
    return <BlobState kind="empty" title="You're not in this race.">Ask the host for the next room code. <Button asChild className="mt-4"><Link to="/home">Back home</Link></Button></BlobState>;
  }

  const elapsed = startsAt && started ? serverNow - startsAt : 0;
  const wpm = alreadyFinished ? Number(me.wpm) : computeWpm(index, elapsed);
  const accuracy = index > 0 ? computeAccuracy(index, errors) : 100;

  const racers: LaneRacer[] = data.players.map((p) => {
    const isMe = p.user_id === user?.id;
    const finished = !!p.finished_at || (isMe && done);
    return {
      userId: p.user_id, username: p.username, blob: p.blob, isMe, finished, placement: p.placement,
      connected: isMe || (p.connected && online.has(p.user_id)) || !!p.finished_at,
      progress: finished ? 1 : isMe ? (text ? index / text.length : 0) : progress[p.user_id]?.progress ?? 0,
      pulse: isMe && !finished ? engine.pulse : undefined,
    };
  });

  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 px-3 py-4 sm:space-y-6 sm:px-6 sm:py-6">
      <Countdown value={countdown} />
      <Lanes racers={racers} />
      <TypingCard text={text} index={alreadyFinished ? text.length : index} hasError={engine.hasError} errorTick={engine.errorTick}
        disabled={!canType} onChar={engine.onChar} onBackspace={engine.onBackspace} />
      <Stats wpm={wpm} accuracy={accuracy} waiting={done || alreadyFinished} />
    </main>
  );
}
