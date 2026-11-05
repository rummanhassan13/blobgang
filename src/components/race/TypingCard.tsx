import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  text: string;
  index: number; // count of correctly typed chars
  hasError: boolean;
  errorTick: number;
  disabled: boolean;
  onChar: (ch: string) => void;
  onBackspace: () => void;
  /** Fill the remaining height and scroll internally (phone keyboard open). */
  fill?: boolean;
};

const block = (e: React.SyntheticEvent) => e.preventDefault();
const REJECT_TYPES = new Set(["insertFromPaste", "insertFromDrop", "insertReplacementText", "insertFromYank", "insertFromPasteAsQuotation", "insertTranspose"]);

let lastWarn = 0;
function warnMulti() {
  const now = Date.now();
  if (now - lastWarn < 3000) return;
  lastWarn = now;
  toast("One letter at a time!", { description: "Autocomplete and pasted text don't count. Turn off predictive text if this keeps happening." });
}

export function TypingCard({ text, index, hasError, errorTick, disabled, onChar, onBackspace, fill }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  const cb = useRef({ onChar, onBackspace });
  cb.current = { onChar, onBackspace };

  useEffect(() => {
    if (!disabled) inputRef.current?.focus({ preventScroll: true });
  }, [disabled]);

  // Keep focus: any key press returns to the hidden input
  useEffect(() => {
    const refocus = () => { if (!disabled) inputRef.current?.focus({ preventScroll: true }); };
    window.addEventListener("keydown", refocus);
    return () => window.removeEventListener("keydown", refocus);
  }, [disabled]);

  // Native input handling. Exactly one character per insertion is accepted; anything that
  // inserts several characters at once (paste, autocomplete, predictive text, IME commits)
  // is rejected and never reaches the typing engine.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    let composing = false;
    let compValue = "";
    let backspaceFromKey = false;

    const reset = () => { el.value = ""; compValue = ""; };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Backspace" && !composing) {
        e.preventDefault();
        backspaceFromKey = true;
        cb.current.onBackspace();
        queueMicrotask(() => { backspaceFromKey = false; });
      }
      if (e.key === "Enter") e.preventDefault();
    };

    const onBeforeInput = (e: InputEvent) => {
      if (REJECT_TYPES.has(e.inputType)) { e.preventDefault(); warnMulti(); return; }
      if (e.inputType === "insertCompositionText") return; // not cancelable; diffed in onInput
      if (e.inputType.startsWith("delete")) {
        e.preventDefault();
        if (!backspaceFromKey && e.inputType === "deleteContentBackward") cb.current.onBackspace();
        return;
      }
      if (e.inputType === "insertText") {
        e.preventDefault();
        const data = e.data ?? "";
        if (Array.from(data).length === 1) cb.current.onChar(data);
        else if (data.length > 1) warnMulti();
        return;
      }
      e.preventDefault();
    };

    // Composition (Android keyboards, IMEs): accept only single-character steps.
    const onInput = () => {
      if (!composing) { reset(); return; }
      const next = el.value;
      if (next.startsWith(compValue) && Array.from(next).length === Array.from(compValue).length + 1) {
        cb.current.onChar(next.slice(compValue.length));
      } else if (compValue.startsWith(next) && Array.from(compValue).length === Array.from(next).length + 1) {
        cb.current.onBackspace();
      } else if (next !== compValue) {
        warnMulti();
      }
      compValue = next;
    };
    const onCompStart = () => { composing = true; compValue = el.value; };
    const onCompEnd = () => { composing = false; reset(); };

    el.addEventListener("keydown", onKeyDown);
    el.addEventListener("beforeinput", onBeforeInput);
    el.addEventListener("input", onInput);
    el.addEventListener("compositionstart", onCompStart);
    el.addEventListener("compositionend", onCompEnd);
    return () => {
      el.removeEventListener("keydown", onKeyDown);
      el.removeEventListener("beforeinput", onBeforeInput);
      el.removeEventListener("input", onInput);
      el.removeEventListener("compositionstart", onCompStart);
      el.removeEventListener("compositionend", onCompEnd);
    };
  }, []);

  // Keep the active character visible inside the card
  useEffect(() => {
    const box = textRef.current;
    const cur = box?.querySelector<HTMLElement>("[data-current]");
    if (!box || !cur || box.scrollHeight <= box.clientHeight) return;
    const top = cur.offsetTop - box.offsetTop;
    if (top < box.scrollTop + 8 || top + cur.offsetHeight > box.scrollTop + box.clientHeight - 8) {
      box.scrollTo({ top: Math.max(0, top - box.clientHeight / 3), behavior: "smooth" });
    }
  }, [index, fill]);

  const words = useMemo(() => {
    const out: { start: number; chars: string }[] = [];
    let i = 0;
    for (const w of text.split(/(?<= )/)) { out.push({ start: i, chars: w }); i += w.length; }
    return out;
  }, [text]);

  return (
    <div
      className={cn("glass relative flex flex-col rounded-[2rem]", fill ? "min-h-0 flex-1 p-4" : "p-5 sm:p-10")}
      onClick={() => inputRef.current?.focus({ preventScroll: true })}
    >
      <input
        ref={inputRef}
        aria-label="Type the passage"
        // Covers the card so a tap opens the mobile keyboard; 16px avoids iOS focus zoom
        className="absolute inset-0 z-10 h-full w-full cursor-default rounded-[2rem] text-[16px] opacity-0"
        type="text"
        name="blob-race-input"
        inputMode="text"
        enterKeyHint="next"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
        data-gramm="false" data-lpignore="true" data-1p-ignore
        disabled={disabled}
        defaultValue=""
        onPaste={block} onDrop={block} onCut={block} onContextMenu={block} onCopy={block}
      />
      <div ref={textRef} className={cn("relative", fill && "min-h-0 flex-1 overflow-y-auto overscroll-contain")}>
        <p data-index={index} className={cn("select-none font-read leading-[1.7] tracking-wide text-foreground", fill ? "text-lg" : "text-xl sm:text-[1.7rem]")}>
          {words.map((w) => (
            <span key={w.start} className="inline-block whitespace-pre">
              {Array.from(w.chars).map((ch, j) => {
                const i = w.start + j;
                const done = i < index;
                const current = i === index;
                if (current) {
                  return (
                    <motion.span
                      data-current
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
      </div>
      {disabled && index === 0 && <p className="mt-4 text-center text-sm text-muted-foreground">Get ready…</p>}
      {!disabled && !focused && (
        <p className="mt-4 text-center text-sm font-semibold text-primary">Tap here (or press any key) to keep typing</p>
      )}
    </div>
  );
}
