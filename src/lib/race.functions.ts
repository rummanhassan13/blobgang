import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeAccuracy, computePoints, computeWpm, validateRun } from "@/lib/scoring";

/**
 * submit-result: the only path that writes race stats. Finish time is the server
 * receipt time; WPM/accuracy/placement/points are computed here, never trusted from the client.
 */
export const submitResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ roomId: z.string().uuid(), errors: z.number().int().min(0).max(10000) }))
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
      .from("race_checkpoints").select("char_index, client_ts, server_ts")
      .eq("room_id", room.id).eq("user_id", userId).order("server_ts");

    const startsAt = Date.parse(room.starts_at);
    const problem = validateRun({ startsAt, receivedAt, passageLength: chars, checkpoints: checkpoints ?? [] });
    if (problem) return { ok: false as const, error: problem };

    const wpm = Math.round(computeWpm(chars, receivedAt - startsAt) * 10) / 10;
    const accuracy = Math.round(computeAccuracy(chars, data.errors) * 10) / 10;
    const { count } = await supabaseAdmin
      .from("room_players").select("*", { count: "exact", head: true })
      .eq("room_id", room.id).not("finished_at", "is", null);
    const placement = (count ?? 0) + 1;
    const points = computePoints(wpm, accuracy, placement);

    const { data: updated } = await supabaseAdmin
      .from("room_players")
      .update({ progress: 1, wpm, accuracy, errors: data.errors, placement, points, finished_at: new Date(receivedAt).toISOString() })
      .eq("room_id", room.id).eq("user_id", userId).is("finished_at", null)
      .select().maybeSingle();
    if (!updated) return { ok: true as const, placement: player.placement, wpm };

    await supabaseAdmin.from("race_results").insert({
      user_id: userId, room_id: room.id, mode: "multi", passage_id: room.passage_id, wpm, accuracy, points,
    });
    const { data: prof } = await supabaseAdmin.from("profiles").select("*").eq("id", userId).single();
    if (prof) {
      await supabaseAdmin.from("profiles").update({
        total_points: prof.total_points + points,
        best_wpm: Math.max(Number(prof.best_wpm), wpm),
        races_played: prof.races_played + 1,
      }).eq("id", userId);
    }
    await supabaseAdmin.rpc("advance_room", { _room_id: room.id });
    return { ok: true as const, placement, wpm, accuracy, points };
  });
