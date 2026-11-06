import { useEffect, useState } from "react";
import { Headphones } from "lucide-react";
import { narratorSupported, previewSpeech, RATES, setNarrator } from "@/lib/narrator";
import { useNarratorSettings } from "@/hooks/use-narrator";
import { cn } from "@/lib/utils";

export function NarratorControl({ blob = "mochi" }: { blob?: string }) {
  const { enabled, rate } = useNarratorSettings();
  const [ok, setOk] = useState(false);
  useEffect(() => setOk(narratorSupported()), []);
  if (!ok) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
      <button type="button" aria-pressed={enabled} onClick={() => { setNarrator({ enabled: !enabled }); if (!enabled) previewSpeech(blob, rate); }}
        className={cn("inline-flex min-h-11 items-center gap-2 rounded-full px-4 font-semibold transition-colors",
          enabled ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground")}>
        <Headphones className="h-4 w-4" /> {enabled ? "Narrator on" : "Listen & type"}
      </button>
      {enabled && RATES.map((r) => (
        <button key={r} type="button" aria-pressed={rate === r} onClick={() => { setNarrator({ rate: r }); previewSpeech(blob, r); }}
          className={cn("min-h-11 min-w-11 rounded-full px-3 font-semibold",
            rate === r ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-secondary")}>
          {r}x
        </button>
      ))}
    </div>
  );
}
