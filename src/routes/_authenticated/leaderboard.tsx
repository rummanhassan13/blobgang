import { seo } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Blob } from "@/components/blob/Blob";
import { BlobState } from "@/components/BlobState";
import { supabase } from "@/integrations/supabase/client";
import { isBlobType } from "@/lib/blobs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => seo({ title: "Leaderboard · Blob Gang", description: "The fastest, squishiest typists in Blob Gang, ranked by points today and all time.", path: "/leaderboard" }),
  component: Leaderboard,
});

type Period = "daily" | "all";

function Leaderboard() {
  const [period, setPeriod] = useState<Period>("daily");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["leaderboard", period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_leaderboard", { _period: period, _limit: 50 });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <main className="mx-auto w-full max-w-3xl px-3 py-6 sm:px-6 sm:py-8">
      <h1 className="text-center text-4xl font-bold">Leaderboard</h1>
      <div className="mx-auto mt-5 grid max-w-xs grid-cols-2 rounded-full bg-secondary p-1" role="tablist">
        {(["daily", "all"] as const).map((p) => (
          <button key={p} role="tab" aria-selected={period === p} onClick={() => setPeriod(p)}
            className="relative rounded-full py-2 font-display text-sm font-semibold">
            {period === p && <motion.span layoutId="lbtab" className="absolute inset-0 rounded-full bg-card shadow-soft" transition={{ type: "spring", stiffness: 400, damping: 30 }} />}
            <span className="relative">{p === "daily" ? "Today (UTC)" : "All-time"}</span>
          </button>
        ))}
      </div>

      <div className="glass mt-6 rounded-[2rem] p-2 sm:p-4">
        {isLoading ? <BlobState kind="loading" title="Tallying points…" />
          : isError ? <BlobState kind="error" title="The leaderboard fell over." >Try again in a moment.</BlobState>
          : !data?.length ? <BlobState kind="empty" title={period === "daily" ? "No races yet today." : "No races yet."}>Be the first blob on the board!</BlobState>
          : (
            <ol>
              {data.map((r, i) => (
                <motion.li key={r.user_id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 15) * 0.03 }}
                  className={cn("grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-2 rounded-2xl px-2 py-2 sm:grid-cols-[3rem_minmax(0,1fr)_5rem_5rem]",
                    r.is_me && "bg-primary/10 ring-2 ring-primary/40",
                    r.is_me && i > 0 && Number(data[i - 1]!.rank) + 1 < Number(r.rank) && "mt-3")}>
                  <span className="text-center font-display text-lg font-bold">{Number(r.rank)}</span>
                  <div className="flex min-w-0 items-center gap-2">
                    <Blob type={isBlobType(r.blob) ? r.blob : "bubbles"} size={36} animation={Number(r.rank) === 1 ? "happy" : "none"} className="shrink-0" />
                    <span className="truncate font-semibold">{r.username}{r.is_me && " (you)"}</span>
                  </div>
                  <span className="hidden text-right text-sm text-muted-foreground sm:block">{Math.round(Number(r.best_wpm))} wpm</span>
                  <span className="text-right font-display font-bold">{Number(r.points)} <span className="text-xs font-normal text-muted-foreground">pts</span></span>
                </motion.li>
              ))}
            </ol>
          )}
      </div>
    </main>
  );
}
