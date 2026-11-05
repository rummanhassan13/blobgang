export const BLOB_TYPES = ["zippy", "snooze", "grumbo", "bubbles", "gloop", "mochi"] as const;
export type BlobType = (typeof BLOB_TYPES)[number];
export type BlobMood = "happy" | "neutral" | "sleepy" | "grumpy" | "shocked";
export type BlobAnimation = "idle" | "squash" | "jiggle" | "shake" | "happy" | "none";

export const BLOB_INFO: Record<BlobType, { name: string; tagline: string; mood: BlobMood }> = {
  zippy: { name: "Zippy", tagline: "Lime teardrop. Always first out the gate.", mood: "happy" },
  snooze: { name: "Snooze", tagline: "Lavender pancake. Fast, eventually.", mood: "sleepy" },
  grumbo: { name: "Grumbo", tagline: "Square-ish grump. Hates typos.", mood: "grumpy" },
  bubbles: { name: "Bubbles", tagline: "Pink sphere of pure bounce.", mood: "neutral" },
  gloop: { name: "Captain Gloop", tagline: "Blue sailor. Navigates every comma.", mood: "neutral" },
  mochi: { name: "Mochi", tagline: "Peach softie with rosy cheeks.", mood: "happy" },
};

export function isBlobType(v: unknown): v is BlobType {
  return typeof v === "string" && (BLOB_TYPES as readonly string[]).includes(v);
}
