import { useCallback, useEffect, useRef, useState } from "react";
import type { BlobAnimation } from "@/lib/blobs";

/** Shared typing engine for multiplayer and solo races. */
export function useTypingEngine(text: string, canType: boolean, startLocalMs: number | null, resetKey?: string) {
  const [index, setIndex] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [errors, setErrors] = useState(0);
  const [errorTick, setErrorTick] = useState(0);
  const [pulse, setPulse] = useState<{ anim: BlobAnimation; n: number }>();
  const pulseN = useRef(0);
  const timeline = useRef<number[]>([]);
  const st = useRef({ index: 0, hasError: false, errors: 0 });

  useEffect(() => {
    setIndex(0); setHasError(false); setErrors(0); timeline.current = [];
    st.current = { index: 0, hasError: false, errors: 0 };
  }, [text, resetKey]);

  const bump = (anim: BlobAnimation) => { pulseN.current += 1; setPulse({ anim, n: pulseN.current }); };

  const onChar = useCallback((ch: string) => {
    console.log('DBGCHAR', ch, canType, st.current.index, st.current.hasError, JSON.stringify(text[st.current.index]));
    if (!canType) return;
    const s = st.current;
    if (s.index >= text.length) return;
    if (!s.hasError && ch === text[s.index]) {
      s.index += 1;
      timeline.current[s.index - 1] = startLocalMs ? Math.max(0, Date.now() - startLocalMs) : 0;
      setIndex(s.index);
      if (ch === " " || s.index === text.length) bump("jiggle");
    } else {
      s.hasError = true;
      s.errors += 1;
      setHasError(true);
      setErrors(s.errors);
      setErrorTick((t) => t + 1);
      bump("shake");
    }
  }, [canType, text, startLocalMs]);

  const onBackspace = useCallback(() => {
    if (st.current.hasError) { st.current.hasError = false; setHasError(false); }
  }, []);

  /** Resume a race after a page refresh from the last server checkpoint. */
  const restore = useCallback((i: number, errs: number) => {
    const idx = Math.max(0, Math.min(i, text.length));
    st.current = { index: idx, hasError: false, errors: Math.max(0, errs) };
    setIndex(idx); setErrors(Math.max(0, errs)); setHasError(false);
  }, [text]);

  return { index, hasError, errors, errorTick, pulse, onChar, onBackspace, restore, timeline, live: st };
}
