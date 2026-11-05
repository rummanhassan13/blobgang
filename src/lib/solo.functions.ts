import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkpointErrors, computeAccuracy, computeSoloPoints, computeWpm, validateRun } from "@/lib/scoring";

export const BOT_WPM = 35;

export type GhostInfo = { kind: "best" | "average" | "bot"; wpm: number; timeline: number[] | null };

export const startSolo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ difficulty: z.enum(["any", "easy", "medium", "hard"]) }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("passages").select("id, text, difficulty");
    if (data.difficulty !== "any") q = q.eq("difficulty", data.difficulty);
    const { data: list } = await q;
    if (!list?.length) throw new Error("No passages available");
    const passage = list[Math.floor(Math.random() * list.length)]!;

    const { data: now } = await supabaseAdmin.rpc("server_time");
    const startsAt = new Date(Date.parse(now ?? new Date().toISOString()) + 3000).toISOString();
    const { data: session, error } = await supabaseAdmin
      .from("solo_sessions").insert({ user_id: context.userId, passage_id: passage.id, starts_at: startsAt })
      .select().single();
    if (error || !session) throw new Error("Could not start solo race");

    const { data: best } = await supabaseAdmin
      .from("ghost_runs").select("wpm, timeline").eq("user_id", context.userId).eq("passage_id", passage.id).maybeSingle();
    let ghost: GhostInfo;
    if (best) {
      const tl = Array.isArray(best.timeline) ? (best.timeline as number[]) : null;
      ghost = { kind: "best", wpm: Number(best.wpm), timeline: tl && tl.length === passage.text.length ? tl : null };
    } else {
      const { data: recent } = await supabaseAdmin
        .from("race_results").select("wpm").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(20);
      const avg = recent?.length ? recent.reduce((s, r) => s + Number(r.wpm), 0) / recent.length : 0;
      ghost = avg > 0 ? { kind: "average", wpm: Math.round(avg), timeline: null } : { kind: "bot", wpm: BOT_WPM, timeline: null };
    }
    return { soloId: session.id, startsAt: session.starts_at, passage, ghost };
  });

export const submitSolo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ soloId: z.string().uuid(), timeline: z.array(z.number().min(0)).max(2000) }))
  .handler(async ({ data, context }) => {
    const receivedAt = Date.now();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;
    const { data: session } = await supabaseAdmin
      .from("solo_sessions").select("*, passages(text)").eq("id", data.soloId).eq("user_id", userId).single();
    if (!session) throw new Error("Solo race not found");
    if (session.finished_at) return { ok: false as const, error: "Already submitted" };
    const text = (session.passages as { text: string } | null)?.text ?? "";
    const chars = text.length;

    const { data: checkpoints } = await supabaseAdmin
      .from("solo_checkpoints").select("char_index, client_ts, server_ts, errors")
      .eq("solo_id", session.id).order("server_ts");
    const startsAt = Date.parse(session.starts_at);
    const problem = validateRun({ startsAt, receivedAt, passageLength: chars, checkpoints: checkpoints ?? [] });

    const { data: claimed } = await supabaseAdmin
      .from("solo_sessions").update({ finished_at: new Date(receivedAt).toISOString() })
      .eq("id", session.id).is("finished_at", null).select("id").maybeSingle();
    if (!claimed) return { ok: false as const, error: "Already submitted" };
    if (problem) return { ok: false as const, error: problem };

    const elapsed = receivedAt - startsAt;
    const wpm = Math.round(computeWpm(chars, elapsed) * 10) / 10;
    const accuracy = Math.round(computeAccuracy(chars, checkpointErrors(checkpoints ?? [])) * 10) / 10;
    const points = computeSoloPoints(wpm, accuracy);

    await supabaseAdmin.from("race_results").insert({
      user_id: userId, room_id: null, mode: "solo", passage_id: session.passage_id, wpm, accuracy, points,
    });

    const { data: prevGhost } = await supabaseAdmin
      .from("ghost_runs").select("wpm").eq("user_id", userId).eq("passage_id", session.passage_id).maybeSingle();
    const newBest = !prevGhost || wpm > Number(prevGhost.wpm);
    if (newBest) {
      // Timeline is only for replay visuals; rescale it to the server-verified duration.
      const tl = data.timeline;
      const valid = tl.length === chars && tl.every((t, i) => i === 0 || t >= tl[i - 1]!) && tl[chars - 1]! > 0;
      const scale = valid ? elapsed / tl[chars - 1]! : 1;
      const timeline = valid ? tl.map((t) => Math.round(t * scale)) : [];
      await supabaseAdmin.from("ghost_runs").upsert({ user_id: userId, passage_id: session.passage_id, wpm, timeline });
    }

    await supabaseAdmin.rpc("apply_profile_result", { _user_id: userId, _points: points, _wpm: wpm });
    return { ok: true as const, wpm, accuracy, points, newBest, previousBest: prevGhost ? Number(prevGhost.wpm) : null };
  });
