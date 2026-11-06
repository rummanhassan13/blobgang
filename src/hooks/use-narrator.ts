import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_RATE, chunkText, getNarrator, onNarratorChange, speak, stopSpeech, type NarratorSettings } from "@/lib/narrator";
import { isMuted } from "@/lib/sfx";

export function useNarratorSettings() {
  const [s, setS] = useState<NarratorSettings>(() => ({ enabled: false, rate: DEFAULT_RATE }));
  useEffect(() => { setS(getNarrator()); return onNarratorChange(setS); }, []);
  return s;
}

/** Reads the passage aloud one sentence ahead of the typist, starting on "Go!". */
export function useNarrator(text: string, index: number, active: boolean, blob: string) {
  const { enabled, rate } = useNarratorSettings();
  const chunks = useMemo(() => chunkText(text), [text]);
  const spoken = useRef(-1);

  useEffect(() => { spoken.current = -1; stopSpeech(); }, [text]);
  useEffect(() => { if (!active || !enabled) { stopSpeech(); spoken.current = -1; } }, [active, enabled]);
  useEffect(() => () => stopSpeech(), []);

  useEffect(() => {
    if (!active || !enabled || isMuted() || !chunks.length) return;
    // current chunk the typist is in
    let cur = 0;
    for (let i = 0; i < chunks.length; i++) if (chunks[i]!.start <= index) cur = i;
    if (spoken.current < 0 && cur > 0) spoken.current = cur - 1; // resumed mid-race
    // speak current chunk, plus queue the next when past half of current
    const c = chunks[cur]!;
    const target = index - c.start > c.text.length * 0.8 ? Math.min(cur + 1, chunks.length - 1) : cur;
    while (spoken.current < target) { spoken.current += 1; speak(chunks[spoken.current]!.text, blob, rate); }
  }, [active, enabled, index, chunks, blob, rate]);
}
