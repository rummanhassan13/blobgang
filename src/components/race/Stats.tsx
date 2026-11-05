export function Stats({ wpm, accuracy, waiting }: { wpm: number; accuracy: number; waiting?: boolean }) {
  return (
    <div className="flex flex-wrap justify-center gap-x-8 gap-y-1 text-sm text-muted-foreground">
      <span><b className="font-display text-lg text-foreground">{Math.round(wpm || 0)}</b> wpm</span>
      <span><b className="font-display text-lg text-foreground">{Math.round(accuracy)}%</b> accuracy</span>
      {waiting && <span>Waiting for the others…</span>}
    </div>
  );
}
