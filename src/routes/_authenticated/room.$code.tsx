import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Blob } from "@/components/blob/Blob";
import { Button } from "@/components/ui/button";
import { BlobState } from "@/components/BlobState";
import { useUser } from "@/hooks/use-auth";
import { useRoomData, useRoomLive } from "@/hooks/use-room";
import { supabase } from "@/integrations/supabase/client";
import { isBlobType } from "@/lib/blobs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/room/$code")({
  head: () => ({
    meta: [
      { title: "Lobby · Blob Gang" },
      { name: "description", content: "Wait for your gang to join before the race starts." },
      { property: "og:title", content: "Join my Blob Gang race" },
      { property: "og:description", content: "Wait for your gang to join before the race starts." },
    ],
  }),
  component: Lobby,
});

const JOIN_ERRORS: Record<string, string> = {
  room_not_found: "We couldn't find that room.",
  race_in_progress: "That race already started. Ask for a new room!",
  room_full: "That room is full.",
  race_finished: "That race is already over. Ask for a new room!",
};

function Lobby() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const [roomId, setRoomId] = useState<string>();
  const [joinError, setJoinError] = useState<string>();

  useEffect(() => {
    if (!user) return;
    supabase.rpc("join_room", { _code: code }).then(({ data, error }) => {
      if (error) {
        const key = Object.keys(JOIN_ERRORS).find((k) => error.message.includes(k));
        setJoinError(key ? JOIN_ERRORS[key] : "Could not join this room.");
      } else if (data) setRoomId(data.id);
    });
  }, [code, user]);

  const { data } = useRoomData(roomId);
  const { online } = useRoomLive(roomId, user?.id);
  const room = data?.room;

  useEffect(() => {
    if (room && room.status !== "lobby") {
      navigate({ to: room.status === "finished" ? "/results/$roomId" : "/race/$roomId", params: { roomId: room.id } });
    }
  }, [room, navigate]);

  if (joinError) {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-12">
        <div className="glass flex flex-col items-center rounded-[2rem] p-10 text-center">
          <Blob type="grumbo" size={100} animation="shake" />
          <h1 className="mt-4 text-2xl font-bold">{joinError}</h1>
          <Button asChild className="mt-6"><Link to="/home">Back home</Link></Button>
        </div>
      </main>
    );
  }

  const isHost = !!room && room.host_id === user?.id;
  const players = data?.players ?? [];

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied!");
  }
  async function start() {
    if (!roomId) return;
    const { error } = await supabase.rpc("start_race", { _room_id: roomId });
    if (error) toast.error("Could not start the race.");
  }
  async function leave() {
    if (roomId) await supabase.rpc("leave_room", { _room_id: roomId });
    navigate({ to: "/home" });
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-3 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:flex sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-muted-foreground">Room code</p>
          <h1 className="font-display text-4xl font-bold tracking-[0.15em] sm:text-5xl sm:tracking-[0.2em]">{code}</h1>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="soft" onClick={copyLink}>Copy link</Button>
          <Button variant="ghost" onClick={leave}>Leave</Button>
        </div>
      </div>

      <div className="glass rounded-[2rem] p-4 sm:p-6">
        {players.length === 0 && <BlobState kind="loading" title="Squishing into the room…" />}
        <div className="divide-y divide-dashed divide-border">
          {players.map((p, i) => {
            const connected = p.connected && (online.has(p.user_id) || p.user_id === user?.id);
            const type = isBlobType(p.blob) ? p.blob : "bubbles";
            return (
              <motion.div key={p.user_id} layout initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
                className={cn("flex items-center gap-4 py-3", !connected && "opacity-45 grayscale")}>
                <div className="relative">
                  {p.user_id === room?.host_id && (
                    <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 text-xl" role="img" aria-label="Host">👑</span>
                  )}
                  <motion.div animate={connected ? { y: [0, -10, 0] } : {}} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}>
                    <Blob type={type} size={60} animation={connected ? "squash" : "idle"} mood={connected ? undefined : "sleepy"} />
                  </motion.div>
                </div>
                <div className="flex-1">
                  <div className="font-display text-lg font-semibold">{p.username}{p.user_id === user?.id && " (you)"}</div>
                  <div className="text-xs text-muted-foreground">{connected ? "ready to wobble" : "disconnected"}</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        {isHost ? (
          <Button variant="jelly" size="lg" className="h-16 w-full px-14 text-lg sm:w-auto" onClick={start}>Start race</Button>
        ) : (
          <p className="text-muted-foreground">Waiting for the host to start…</p>
        )}
      </div>
    </main>
  );
}
