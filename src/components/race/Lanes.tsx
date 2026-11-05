import { AnimatePresence, motion } from "framer-motion";
import { Blob } from "@/components/blob/Blob";
import { isBlobType, type BlobAnimation } from "@/lib/blobs";
import { cn } from "@/lib/utils";

export type LaneRacer = {
  userId: string;
  username: string;
  blob: string;
  progress: number; // 0..1
  connected: boolean;
  finished: boolean;
  placement?: number | null | undefined;
  isMe?: boolean;
  ghost?: boolean;
  /** transient animation for own blob, keyed by `pulse` */
  pulse?: { anim: BlobAnimation; n: number } | undefined;
};

const WAVE_A = "M0 10 Q 25 4 50 10 T 100 10 T 150 10 T 200 10";
const WAVE_B = "M0 10 Q 25 16 50 10 T 100 10 T 150 10 T 200 10";

export function Splash() {
  return (
    <div className="pointer-events-none absolute inset-0">
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 h-2.5 w-2.5 rounded-full bg-primary"
            initial={{ x: 0, y: 0, scale: 1, opacity: 0.9 }}
            animate={{ x: Math.cos(a) * 38, y: Math.sin(a) * 26 - 8, scale: 0.2, opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}

export function Lanes({ racers, size = 52 }: { racers: LaneRacer[]; size?: number }) {
  return (
    <div className="glass space-y-1 rounded-[2rem] px-4 py-4 sm:px-6">
      {racers.map((r, i) => {
        const type = isBlobType(r.blob) ? r.blob : "bubbles";
        const anim: BlobAnimation = !r.connected ? "idle" : r.finished ? "happy" : r.pulse?.anim ?? (r.progress > 0 ? "squash" : "idle");
        return (
          <div key={r.userId} className={cn("relative h-[76px] transition-opacity", !r.connected && "opacity-45 grayscale")}>
            <svg className="absolute inset-x-0 bottom-3 h-5 w-full overflow-visible" viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden>
              <motion.path
                d={WAVE_A}
                animate={{ d: [WAVE_A, WAVE_B, WAVE_A] }}
                transition={{ duration: 3 + (i % 3), repeat: Infinity, ease: "easeInOut" }}
                fill="none"
                stroke={`var(--blob-${type})`}
                strokeWidth="2"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                opacity={r.isMe ? 0.9 : 0.5}
              />
            </svg>
            <div className="absolute bottom-3 right-0 h-6 w-1 rounded-full bg-border" aria-hidden />
            <motion.div
              className="absolute bottom-3 flex flex-col items-center"
              style={{ x: "-50%" }}
              initial={false}
              animate={{ left: `calc(${size / 2}px + ${Math.min(1, r.progress)} * (100% - ${size}px))` }}
              transition={{ type: "spring", stiffness: 120, damping: 20, mass: 0.6 }}
            >
              <div className="relative">
                <Blob
                  key={r.pulse ? `${r.pulse.anim}-${r.pulse.n}` : anim}
                  type={type}
                  size={size}
                  animation={anim}
                  mood={!r.connected ? "sleepy" : r.finished ? "happy" : undefined}
                  ghost={r.ghost}
                />
                <AnimatePresence>{r.finished && !r.ghost && <Splash key="splash" />}</AnimatePresence>
              </div>
            </motion.div>
            <div className="absolute left-0 top-0 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <span className={cn(r.isMe && "text-foreground")}>{r.username}{r.isMe && " (you)"}</span>
              {!r.connected && <span className="rounded-full bg-muted px-2 py-0.5">disconnected</span>}
              {r.placement != null && <span className="rounded-full bg-accent px-2 py-0.5 text-accent-foreground">#{r.placement}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
