export const MAX_WPM = 250;
/** Allowed gap between a checkpoint's client clock (already offset to server time) and server receipt. */
export const MAX_CLOCK_DRIFT_MS = 5000;

export function computeWpm(chars: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  return chars / 5 / (elapsedMs / 60000);
}

export function computeAccuracy(chars: number, errors: number): number {
  const e = Math.max(0, Math.floor(errors));
  if (chars <= 0) return 0;
  return (chars / (chars + e)) * 100;
}

const PLACEMENT_BONUS = [50, 30, 20, 10];
export function computePoints(wpm: number, accuracy: number, placement: number): number {
  return Math.round(wpm * (accuracy / 100)) + (PLACEMENT_BONUS[placement - 1] ?? 5);
}

/** Solo races award half the base score; there is no placement bonus. */
export function computeSoloPoints(wpm: number, accuracy: number): number {
  return Math.round((wpm * (accuracy / 100)) / 2);
}

export type Checkpoint = { char_index: number; client_ts: string; server_ts: string; errors?: number };

/** Typo count from the checkpoint trail (cumulative, so the last one wins). */
export function checkpointErrors(checkpoints: Checkpoint[]): number {
  return Math.max(0, checkpoints.at(-1)?.errors ?? 0);
}

/** Returns an error string if the run looks impossible, otherwise null. */
export function validateRun(opts: {
  startsAt: number;
  receivedAt: number;
  passageLength: number;
  checkpoints: Checkpoint[];
}): string | null {
  const { startsAt, receivedAt, passageLength, checkpoints } = opts;
  if (receivedAt <= startsAt) return "Finished before the race started";
  if (computeWpm(passageLength, receivedAt - startsAt) > MAX_WPM) return "Impossible speed";
  if (checkpoints.length < 2) return "Not enough checkpoints";
  let last = -1;
  let lastErrors = 0;
  for (const c of checkpoints) {
    const e = c.errors ?? 0;
    if (e < lastErrors) return "Typo count went backwards";
    lastErrors = e;
    const server = Date.parse(c.server_ts);
    const client = Date.parse(c.client_ts);
    if (c.char_index < last) return "Checkpoints went backwards";
    last = c.char_index;
    if (server > receivedAt + 1000) return "Checkpoint after submission";
    if (Math.abs(client - server) > MAX_CLOCK_DRIFT_MS) return "Clock inconsistent with server";
    const elapsed = server - startsAt;
    if (c.char_index > 0 && elapsed <= 0) return "Typed before the race started";
    if (elapsed > 1000 && computeWpm(c.char_index, elapsed) > MAX_WPM * 1.1) return "Impossible speed";
  }
  if (last !== passageLength) return "Final checkpoint does not match passage";
  return null;
}
