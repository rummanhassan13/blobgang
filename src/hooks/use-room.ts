import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type ProgressMsg = { userId: string; progress: number; wpm: number };

export function roomQueryKey(roomId: string | undefined) {
  return ["room", roomId] as const;
}

export function useRoomData(roomId: string | undefined) {
  return useQuery({
    queryKey: roomQueryKey(roomId),
    enabled: !!roomId,
    queryFn: async () => {
      const [{ data: room, error }, { data: players }] = await Promise.all([
        supabase.from("rooms").select("*, passages(text)").eq("id", roomId!).single(),
        supabase.from("room_players").select("*").eq("room_id", roomId!).order("joined_at"),
      ]);
      if (error) throw error;
      return { room, players: players ?? [] };
    },
  });
}

/** Server clock offset in ms (server = Date.now() + offset). */
export function useServerOffset() {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const samples: number[] = [];
      for (let i = 0; i < 3; i++) {
        const t0 = Date.now();
        const { data } = await supabase.rpc("server_time");
        const t1 = Date.now();
        if (data) samples.push(Date.parse(data) - (t0 + t1) / 2);
      }
      if (!cancelled && samples.length) setOffset(samples.sort((a, b) => a - b)[Math.floor(samples.length / 2)]!);
    })();
    return () => { cancelled = true; };
  }, []);
  return offset;
}

/**
 * Live room: postgres changes on rooms/room_players -> refetch, Presence for connectivity,
 * Broadcast for smooth progress.
 */
export function useRoomLive(roomId: string | undefined, userId: string | undefined) {
  const qc = useQueryClient();
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<Record<string, ProgressMsg>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribed = useRef(false);

  useEffect(() => {
    if (!roomId || !userId) return;
    const invalidate = () => qc.invalidateQueries({ queryKey: roomQueryKey(roomId) });
    const db = supabase
      .channel(`room-db-${roomId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${roomId}` }, invalidate)
      .subscribe();

    const live = supabase.channel(`room-live-${roomId}`, { config: { presence: { key: userId }, broadcast: { self: false } } });
    live
      .on("presence", { event: "sync" }, () => console.log("[sync]", userId?.slice(0,4), Object.keys(live.presenceState())) || setOnline(new Set(Object.keys(live.presenceState()))))
      .on("presence", { event: "leave" }, ({ key }) => {
        if (key && key !== userId) supabase.rpc("set_player_connected", { _room_id: roomId, _user_id: key, _connected: false });
      })
      .on("broadcast", { event: "progress" }, ({ payload }) => {
        const p = payload as ProgressMsg;
        setProgress((prev) => ({ ...prev, [p.userId]: p }));
      })
      .subscribe(async (status, err) => {
        console.log("[live]", userId?.slice(0,4), status, err?.message);
        if (status === "SUBSCRIBED") {
          subscribed.current = true;
          await live.track({ at: Date.now() });
          await supabase.rpc("set_player_connected", { _room_id: roomId, _user_id: userId, _connected: true });
        }
      });
    channelRef.current = live;
    return () => {
      subscribed.current = false;
      channelRef.current = null;
      supabase.removeChannel(db);
      supabase.removeChannel(live);
    };
  }, [roomId, userId, qc]);

  const sendProgress = (msg: ProgressMsg) => {
    if (subscribed.current) channelRef.current?.send({ type: "broadcast", event: "progress", payload: msg });
  };
  return { online, progress, sendProgress };
}
