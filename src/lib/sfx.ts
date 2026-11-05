/** Tiny synthesized sound effects (Web Audio, no files). Muted state persists in localStorage. */
let ctx: AudioContext | null = null;
const KEY = "blobgang-muted";
let muted = typeof window !== "undefined" && localStorage.getItem(KEY) === "1";
const listeners = new Set<(m: boolean) => void>();

export const isMuted = () => muted;
export function setMuted(m: boolean) {
  muted = m;
  try { localStorage.setItem(KEY, m ? "1" : "0"); } catch { /* ignore */ }
  listeners.forEach((l) => l(m));
}
export function onMuteChange(l: (m: boolean) => void) { listeners.add(l); return () => { listeners.delete(l); }; }

function ac() {
  if (typeof window === "undefined" || muted) return null;
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, opts: { type?: OscillatorType; vol?: number; to?: number; delay?: number } = {}) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + (opts.delay ?? 0);
  const o = c.createOscillator(); const g = c.createGain();
  o.type = opts.type ?? "sine";
  o.frequency.setValueAtTime(freq, t);
  if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(opts.vol ?? 0.15, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

export const sfx = {
  /** soft bubbly tick per correct key */
  key: () => tone(700 + Math.random() * 200, 0.05, { vol: 0.04, to: 1100 }),
  /** squishy blip on completed word */
  word: () => tone(420, 0.12, { vol: 0.09, to: 820 }),
  /** low wobble buzz on typo */
  typo: () => tone(180, 0.16, { type: "triangle", vol: 0.12, to: 110 }),
  count: () => tone(520, 0.14, { type: "triangle", vol: 0.14 }),
  go: () => { tone(780, 0.25, { type: "triangle", vol: 0.16 }); tone(1170, 0.3, { vol: 0.08, delay: 0.04 }); },
  finish: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, { type: "triangle", vol: 0.13, delay: i * 0.09 })),
  pop: () => tone(300, 0.1, { vol: 0.1, to: 900 }),
};
