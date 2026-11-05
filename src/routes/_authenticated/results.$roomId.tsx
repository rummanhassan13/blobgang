import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Blob } from "@/components/blob/Blob";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-auth";
import { useRoomData } from "@/hooks/use-room";
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

function Results() {
  const { roomId } = Route.useParams();
  const { user } = useUser();
  const { data } = useRoomData(roomId);
  const players = [...(data?.players ?? [])].sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99));

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-center text-4xl font-bold">Results</h1>
      <div className="glass divide-y divide-dashed divide-border rounded-[2rem] p-4 sm:p-6">
        {players.map((p, i) => (
          <motion.div key={p.user_id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className={cn("flex items-center gap-4 py-3", p.user_id === user?.id && "font-bold")}>
            <span className="w-10 text-center font-display text-2xl font-bold">{p.placement ? `#${p.placement}` : "–"}</span>
            <Blob type={isBlobType(p.blob) ? p.blob : "bubbles"} size={48} animation={p.placement === 1 ? "happy" : "idle"}
              mood={p.placement ? undefined : "sleepy"} />
            <span className="flex-1 truncate">{p.username}</span>
            {p.finished_at ? (
              <span className="text-right text-sm text-muted-foreground">
                <b className="text-foreground">{Math.round(Number(p.wpm))}</b> wpm · {Math.round(Number(p.accuracy))}% · +{p.points} pts
              </span>
            ) : <span className="text-sm text-muted-foreground">did not finish</span>}
          </motion.div>
        ))}
      </div>
      <div className="mt-8 flex justify-center"><Button asChild variant="jelly" size="lg"><Link to="/home">Play again</Link></Button></div>
    </main>
  );
}
