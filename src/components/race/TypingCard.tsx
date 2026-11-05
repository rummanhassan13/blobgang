import { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Props = {
  text: string;
  index: number; // count of correctly typed chars
  hasError: boolean;
  errorTick: number;
  disabled: boolean;
  onChar: (ch: string) => void;
  onBackspace: () => void;
};

const block = (e: React.SyntheticEvent) => e.preventDefault();

export function TypingCard({ text, index, hasError, errorTick, disabled, onChar, onBackspace }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  // Keep focus: clicking anywhere / tabbing back returns to the hidden input
  useEffect(() => {
    const refocus = () => { if (!disabled) inputRef.current?.focus(); };
    window.addEventListener("keydown", refocus);
    return () => window.removeEventListener("keydown", refocus);
  }, [disabled]);

  const words = useMemo(() => {
    const out: { start: number; chars: string }[] = [];
    let i = 0;
    for (const w of text.split(/(?<= )/)) { out.push({ start: i, chars: w }); i += w.length; }
    return out;
  }, [text]);

  return (
    <div className="glass relative rounded-[2rem] p-6 sm:p-10" onClick={() => inputRef.current?.focus()}>
      <input
        ref={inputRef}
        aria-label="Type the passage"
        className="absolute h-px w-px opacity-0"
        autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
        disabled={disabled}
        value=""
        onChange={(e) => { for (const ch of e.target.value) onChar(ch); }}
        onKeyDown={(e) => { if (e.key === "Backspace") { e.preventDefault(); onBackspace(); } }}
        onPaste={block} onDrop={block} onCut={block} onContextMenu={block} onCopy={block}
      />
      <p className="select-none font-read text-2xl leading-[1.7] tracking-wide text-foreground sm:text-[1.7rem]">
        {words.map((w) => (
          <span key={w.start} className="inline-block whitespace-pre">
            {Array.from(w.chars).map((ch, j) => {
              const i = w.start + j;
              const done = i < index;
              const current = i === index;
              if (current) {
                return (
                  <motion.span
                    key={`${i}-${hasError ? errorTick : "ok"}`}
                    className={cn("relative rounded-md", hasError ? "bg-destructive/20 text-destructive" : "bg-primary/15")}
                    animate={hasError ? { x: [0, -3, 3, -2, 2, 0] } : { scale: [1, 1.08, 1] }}
                    transition={{ duration: hasError ? 0.25 : 1.2, repeat: hasError ? 0 : Infinity }}
                  >
                    {ch === " " ? "\u00a0" : ch}
                    {!hasError && <motion.span layoutId="caret" className="absolute -bottom-0.5 left-0 right-0 h-[3px] rounded-full bg-primary" />}
                  </motion.span>
                );
              }
              return <span key={i} className={cn("transition-colors duration-300", done && "text-muted-foreground/45")}>{ch}</span>;
            })}
          </span>
        ))}
      </p>
      {disabled && index === 0 && <p className="mt-4 text-center text-sm text-muted-foreground">Get ready…</p>}
    </div>
  );
}
