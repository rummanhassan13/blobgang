import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Blob } from "@/components/blob/Blob";
import { BlobState } from "@/components/BlobState";
import { Splash } from "@/components/race/Lanes";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-auth";
import { useRoomData, useRoomLive } from "@/hooks/use-room";
import { supabase } from "@/integrations/supabase/client";
import { isBlobType } from "@/lib/blobs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/results/$roomId")({
  head: () => ({
    meta: [
      { title: "Results · Blob Gang" },
      { name: "description", content: "See who wobbled across the line first." },
      { property: "og:title", content: "Results · Blob Gang" },
      { property: "og:description", content: "See who wobbled across the line first." },
    ],
  }),
  component: Results,
});

const STEP_H = { 1: "h-28 sm:h-36", 2: "h-20 sm:h-24", 3: "h-14 sm:h-16" } as const;

function Results() {
  const { roomId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const { data, isError } = useRoomData(roomId);
  useRoomLive(roomId, user?.id); // live updates (late finishers, rematch)
  const [busy, setBusy] = useState(false);

  const room = data?.room;
  const players = [...(data?.players ?? [])].sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99));
  const finishers = players.filter((p) => p.placement);
  const lastPlace = finishers.length > 1 ? finishers.at(-1)!.user_id : null;
  const isHost = room?.host_id === user?.id;

  // Ask the server to close out the race if it is still waiting on stragglers
  useEffect(() => {
    if (room && room.status !== "finished") void supabase.rpc("advance_room", { _room_id: roomId }).then();
  }, [room, roomId]);

  async function raceAgain() {
    setBusy(true);
    const { data: code, error } = await supabase.rpc("race_again", { _room_id: roomId });
    setBusy(false);
    if (error || !code) { toast.error("Could not create a rematch."); return; }
    navigate({ to: "/room/$code", params: { code } });
  }

  if (isError) return <BlobState kind="error" title="Couldn't load these results." />;
  if (!data) return <BlobState kind="loading" title="Counting the wobbles…" />;
  if (!players.length) return <BlobState kind="empty" title="Nobody raced here." />;

  const podium = [finishers[1], finishers[0], finishers[2]].filter(Boolean) as typeof finishers;

  return (
    <main className="mx-auto w-full max-w-3xl px-3 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-6 text-center text-4xl font-bold">Results</h1>

      {podium.length > 0 && (
        <div className="mb-6 flex items-end justify-center gap-2 sm:gap-4">
          {podium.map((p) => {
            const place = p.placement as 1 | 2 | 3;
            const isLast = p.user_id === lastPlace;
            return (
              <motion.div key={p.user_id} className="flex w-24 min-w-0 flex-col items-center sm:w-36"
                initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (3 - place) * 0.2, type: "spring", stiffness: 160, damping: 14 }}>
                <div className="relative">
                  <Blob type={isBlobType(p.blob) ? p.blob : "bubbles"} size={place === 1 ? 88 : 66}
                    animation={place === 1 ? "happy" : isLast ? "none" : "idle"} mood={place === 1 ? "happy" : isLast ? "sleepy" : undefined}
                    className={cn(isLast && "translate-y-1 scale-y-90")} />
                  {place === 1 && <Splash />}
                </div>
                <span className="mt-1 w-full truncate text-center text-sm font-semibold">{p.username}</span>
                <div className={cn("mt-1 flex w-full items-start justify-center rounded-t-3xl pt-2 font-display text-2xl font-bold",
                  STEP_H[place], place === 1 ? "bg-gradient-jelly text-primary-foreground shadow-pop" : "bg-secondary text-secondary-foreground")}>
                  {place}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="glass overflow-x-auto rounded-[2rem] p-2 sm:p-4">
        <table className="w-full min-w-[22rem] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="px-2 py-2 font-semibold">#</th>
              <th className="px-2 py-2 font-semibold">Blob</th>
              <th className="px-2 py-2 text-right font-semibold">WPM</th>
              <th className="px-2 py-2 text-right font-semibold">Acc</th>
              <th className="px-2 py-2 text-right font-semibold">Pts</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.user_id} className={cn("border-t border-dashed border-border", p.user_id === user?.id && "bg-secondary/60 font-bold")}>
                <td className="px-2 py-2 font-display text-lg">{p.placement ?? "–"}</td>
                <td className="px-2 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Blob type={isBlobType(p.blob) ? p.blob : "bubbles"} size={32} animation="none" mood={p.placement ? undefined : "sleepy"} className="shrink-0" />
                    <span className="truncate">{p.username}</span>
                  </div>
                </td>
                {p.finished_at ? (
                  <>
                    <td className="px-2 py-2 text-right">{Math.round(Number(p.wpm))}</td>
                    <td className="px-2 py-2 text-right">{Math.round(Number(p.accuracy))}%</td>
                    <td className="px-2 py-2 text-right">+{p.points}</td>
                  </>
                ) : <td colSpan={3} className="px-2 py-2 text-right text-muted-foreground">{room?.status === "finished" ? "did not finish" : "still racing…"}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {room?.next_room_code ? (
          <Button variant="jelly" size="lg" onClick={() => navigate({ to: "/room/$code", params: { code: room.next_room_code! } })}>Join rematch</Button>
        ) : isHost ? (
          <Button variant="jelly" size="lg" disabled={busy} onClick={raceAgain}>Race again</Button>
        ) : (
          <span className="self-center text-sm text-muted-foreground">Waiting for the host to call a rematch…</span>
        )}
        <Button asChild variant="soft" size="lg"><Link to="/home">Home</Link></Button>
        <Button asChild variant="ghost" size="lg"><Link to="/leaderboard">Leaderboard</Link></Button>
      </div>
    </main>
  );
}
