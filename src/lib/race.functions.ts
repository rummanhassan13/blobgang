import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkpointErrors, computeAccuracy, computeWpm, validateRun } from "@/lib/scoring";

/**
 * submit-result: the only path that writes race stats. Finish time is the server
 * receipt time; WPM/accuracy/placement/points are computed here, never trusted from the client.
 */
export const submitResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ roomId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const receivedAt = Date.now();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    const { data: room } = await supabaseAdmin.from("rooms").select("*").eq("id", data.roomId).single();
    if (!room || !room.starts_at || !room.passage_id) throw new Error("Room not found");
    if (room.status !== "racing" && room.status !== "countdown") throw new Error("Race is not running");

    const { data: player } = await supabaseAdmin
      .from("room_players").select("*").eq("room_id", room.id).eq("user_id", userId).single();
    if (!player) throw new Error("Not in this room");
    if (player.finished_at) return { ok: true as const, placement: player.placement, wpm: Number(player.wpm) };

    const { data: passage } = await supabaseAdmin.from("passages").select("text").eq("id", room.passage_id).single();
    if (!passage) throw new Error("Passage missing");
    const chars = passage.text.length;

    const { data: checkpoints } = await supabaseAdmin
      .from("race_checkpoints").select("char_index, client_ts, server_ts, errors")
      .eq("room_id", room.id).eq("user_id", userId).order("server_ts");

    const startsAt = Date.parse(room.starts_at);
    const problem = validateRun({ startsAt, receivedAt, passageLength: chars, checkpoints: checkpoints ?? [] });
    if (problem) return { ok: false as const, error: problem };

    const wpm = Math.round(computeWpm(chars, receivedAt - startsAt) * 10) / 10;
    const errors = checkpointErrors(checkpoints ?? []);
    const accuracy = Math.round(computeAccuracy(chars, errors) * 10) / 10;
    // Placement, points, result row and profile totals are written atomically under a room lock.
    const { data: rec, error: recErr } = await supabaseAdmin.rpc("record_multi_result", {
      _room_id: room.id, _user_id: userId, _wpm: wpm, _accuracy: accuracy, _errors: errors,
      _finished_at: new Date(receivedAt).toISOString(),
    });
    const row = rec?.[0];
    if (recErr || !row) throw new Error("Could not record result");
    if (row.already) return { ok: true as const, placement: row.placement, wpm };
    const { placement, points } = row;
    await supabaseAdmin.rpc("advance_room", { _room_id: room.id });
    return { ok: true as const, placement, wpm, accuracy, points };
  });
