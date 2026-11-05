import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PageStub } from "@/components/PageStub";
import { Countdown } from "@/components/race/Countdown";
import { Lanes, type LaneRacer } from "@/components/race/Lanes";
import { TypingCard } from "@/components/race/TypingCard";
import { useUser } from "@/hooks/use-auth";
import { useRoomData, useRoomLive, useServerOffset } from "@/hooks/use-room";
import { supabase } from "@/integrations/supabase/client";
import type { BlobAnimation } from "@/lib/blobs";
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
  component: RaceRoute,
});

function RaceRoute() {
  const { roomId } = Route.useParams();
  if (roomId === "solo") return <PageStub title="Solo practice" blob="snooze">Solo ghost races arrive in the next step.</PageStub>;
  return <Race roomId={roomId} />;
}

function Race({ roomId }: { roomId: string }) {
  const navigate = useNavigate();
  const { user } = useUser();
  const { data } = useRoomData(roomId);
  const { online, progress, sendProgress } = useRoomLive(roomId, user?.id);
  const offset = useServerOffset();

  const room = data?.room;
  const text = (room?.passages as { text: string } | null)?.text ?? "";
  const startsAt = room?.starts_at ? Date.parse(room.starts_at) : null;
  const me = data?.players.find((p) => p.user_id === user?.id);

  const [now, setNow] = useState(() => Date.now());
  const [index, setIndex] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [errors, setErrors] = useState(0);
  const [errorTick, setErrorTick] = useState(0);
  const [pulse, setPulse] = useState<{ anim: BlobAnimation; n: number }>();
  const [submitted, setSubmitted] = useState(false);
  const pulseN = useRef(0);

  const serverNow = now + offset;
  const started = startsAt !== null && serverNow >= startsAt;
  const done = index >= text.length && text.length > 0;
  const alreadyFinished = !!me?.finished_at;
  const canType = started && !done && !alreadyFinished && room?.status !== "finished" && !!me;
  const countdown = startsAt === null ? null
    : serverNow < startsAt ? Math.ceil((startsAt - serverNow) / 1000)
    : serverNow - startsAt < 600 ? 0 : null;

  // Clock tick
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  // Route to results when room finishes
  useEffect(() => {
    if (room?.status === "finished") navigate({ to: "/results/$roomId", params: { roomId } });
    if (room?.status === "lobby") navigate({ to: "/room/$code", params: { code: room.code } });
  }, [room?.status, room?.code, roomId, navigate]);

  // Nudge the server to advance status (countdown->racing, racing->finished)
  useEffect(() => {
    if (!room || room.status === "finished" || room.status === "lobby") return;
    const id = setInterval(() => { void supabase.rpc("advance_room", { _room_id: roomId }).then(); }, 2000);
    return () => clearInterval(id);
  }, [room, roomId]);

  // Refs for intervals
  const indexRef = useRef(0);
  indexRef.current = index;
  const startsRef = useRef(startsAt);
  startsRef.current = startsAt;
  const offsetRef = useRef(offset);
  offsetRef.current = offset;

  // Broadcast progress ~10/sec
  useEffect(() => {
    if (!user || !text) return;
    let last = -1;
    const id = setInterval(() => {
      const i = indexRef.current;
      if (i === last || startsRef.current === null) return;
      last = i;
      const elapsed = Date.now() + offsetRef.current - startsRef.current;
      sendProgress({ userId: user.id, progress: i / text.length, wpm: computeWpm(i, elapsed) });
    }, 100);
    return () => clearInterval(id);
  }, [user, text, sendProgress]);

  // Anti-cheat checkpoints every 2s
  const lastCp = useRef(0);
  const insertCheckpoint = useCallback(async (charIndex: number) => {
    if (!user || charIndex <= lastCp.current) return;
    lastCp.current = charIndex;
    await supabase.from("race_checkpoints").insert({
      room_id: roomId, user_id: user.id, char_index: charIndex,
      client_ts: new Date(Date.now() + offsetRef.current).toISOString(),
    });
  }, [user, roomId]);
  useEffect(() => {
    if (!canType) return;
    const id = setInterval(() => insertCheckpoint(indexRef.current), 2000);
    return () => clearInterval(id);
  }, [canType, insertCheckpoint]);

  // Final submission
  useEffect(() => {
    if (!done || submitted || alreadyFinished) return;
    setSubmitted(true);
    (async () => {
      await insertCheckpoint(text.length);
      try {
        const res = await submitResult({ data: { roomId, errors } });
        if (!res.ok) toast.error(`Result rejected: ${res.error}`);
        else toast.success(`Finished #${res.placement} at ${Math.round(res.wpm)} WPM!`);
      } catch {
        toast.error("Could not submit your result.");
      }
    })();
  }, [done, submitted, alreadyFinished, insertCheckpoint, text.length, roomId, errors]);

  const bump = (anim: BlobAnimation) => { pulseN.current += 1; setPulse({ anim, n: pulseN.current }); };

  const onChar = (ch: string) => {
    if (!canType) return;
    if (!hasError && ch === text[index]) {
      const next = index + 1;
      setIndex(next);
      if (ch === " " || next === text.length) bump("jiggle");
    } else {
      setHasError(true);
      setErrors((e) => e + 1);
      setErrorTick((t) => t + 1);
      bump("shake");
    }
  };
  const onBackspace = () => { if (hasError) setHasError(false); };

  const elapsed = startsAt && started ? serverNow - startsAt : 0;
  const wpm = alreadyFinished ? Number(me?.wpm) : computeWpm(index, elapsed);
  const accuracy = index > 0 ? computeAccuracy(index, errors) : 100;

  const racers: LaneRacer[] = (data?.players ?? []).map((p) => {
    const isMe = p.user_id === user?.id;
    const finished = !!p.finished_at || (isMe && done);
    return {
      userId: p.user_id,
      username: p.username,
      blob: p.blob,
      isMe,
      finished,
      placement: p.placement,
      connected: isMe || (p.connected && online.has(p.user_id)) || !!p.finished_at,
      progress: finished ? 1 : isMe ? (text ? index / text.length : 0) : progress[p.user_id]?.progress ?? 0,
      pulse: isMe && !finished ? pulse : undefined,
    };
  });

  if (!data) return <main className="flex flex-1 items-center justify-center text-muted-foreground">Loading race…</main>;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <Countdown value={countdown} />
      <Lanes racers={racers} />
      <TypingCard text={text} index={alreadyFinished ? text.length : index} hasError={hasError} errorTick={errorTick}
        disabled={!canType} onChar={onChar} onBackspace={onBackspace} />
      <div className="flex justify-center gap-8 text-sm text-muted-foreground">
        <span><b className="font-display text-lg text-foreground">{Math.round(wpm || 0)}</b> wpm</span>
        <span><b className="font-display text-lg text-foreground">{Math.round(accuracy)}%</b> accuracy</span>
        {(done || alreadyFinished) && <span>Waiting for the others…</span>}
      </div>
    </main>
  );
}
