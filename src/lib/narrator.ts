import type { BlobType } from "@/lib/blobs";

const KEY_ON = "blobgang:narrator";
const KEY_RATE = "blobgang:narrator-rate";
type Listener = (s: NarratorSettings) => void;
export type NarratorSettings = { enabled: boolean; rate: number };
export const RATES = [0.8, 1, 1.2, 1.4] as const;

const VOICES: Record<string, { pitch: number; rate: number }> = {
  zippy: { pitch: 1.3, rate: 1.15 }, snooze: { pitch: 0.75, rate: 0.8 }, grumbo: { pitch: 0.7, rate: 0.95 },
  bubbles: { pitch: 1.4, rate: 1.1 }, gloop: { pitch: 0.9, rate: 1.05 }, mochi: { pitch: 1.2, rate: 1 },
};

const listeners = new Set<Listener>();
export const narratorSupported = () => typeof window !== "undefined" && "speechSynthesis" in window;

export function getNarrator(): NarratorSettings {
  if (typeof window === "undefined") return { enabled: false, rate: 1 };
  const r = Number(localStorage.getItem(KEY_RATE));
  return { enabled: localStorage.getItem(KEY_ON) === "1", rate: RATES.includes(r as never) ? r : 1 };
}
export function setNarrator(p: Partial<NarratorSettings>) {
  const next = { ...getNarrator(), ...p };
  localStorage.setItem(KEY_ON, next.enabled ? "1" : "0");
  localStorage.setItem(KEY_RATE, String(next.rate));
  if (!next.enabled) stopSpeech();
  listeners.forEach((l) => l(next));
}
export function onNarratorChange(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; }

/** Split a passage into sentence-ish chunks (Chrome stalls on long utterances). */
export function chunkText(text: string): { start: number; text: string }[] {
  const out: { start: number; text: string }[] = [];
  const re = /[^.!?;]+[.!?;]*\s*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (!m[0].trim()) continue;
    // further split very long sentences at commas
    if (m[0].length > 160) {
      let off = 0;
      for (const part of m[0].split(/(?<=,\s)/)) { out.push({ start: m.index + off, text: part }); off += part.length; }
    } else out.push({ start: m.index, text: m[0] });
  }
  return out;
}

export function speak(text: string, blob: BlobType | string, rate: number) {
  if (!narratorSupported()) return;
  const v = VOICES[blob] ?? { pitch: 1, rate: 1 };
  const u = new SpeechSynthesisUtterance(text);
  u.pitch = v.pitch; u.rate = Math.min(2, v.rate * rate); u.volume = 1;
  const en = speechSynthesis.getVoices().find((x) => x.lang.startsWith("en"));
  if (en) u.voice = en;
  speechSynthesis.speak(u);
}
export function stopSpeech() { if (narratorSupported()) speechSynthesis.cancel(); }
