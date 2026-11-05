import type { ReactNode } from "react";
import { Blob } from "@/components/blob/Blob";
import type { BlobAnimation, BlobMood, BlobType } from "@/lib/blobs";

const PRESETS: Record<"loading" | "error" | "empty", { blob: BlobType; anim: BlobAnimation; mood?: BlobMood }> = {
  loading: { blob: "bubbles", anim: "squash" },
  error: { blob: "grumbo", anim: "shake", mood: "grumpy" },
  empty: { blob: "snooze", anim: "idle", mood: "sleepy" },
};

export function BlobState({ kind, title, children }: { kind: keyof typeof PRESETS; title: string; children?: ReactNode }) {
  const p = PRESETS[kind];
  return (
    <div role={kind === "error" ? "alert" : "status"} className="flex flex-col items-center px-4 py-12 text-center">
      <Blob type={p.blob} size={88} animation={p.anim} mood={p.mood} />
      <p className="mt-3 font-display text-lg font-semibold">{title}</p>
      {children && <div className="mt-1 text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}
