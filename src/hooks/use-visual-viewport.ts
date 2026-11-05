import { useEffect, useState } from "react";

/** Tracks the visual viewport (area above the on-screen keyboard on phones). */
export function useVisualViewport() {
  const [state, setState] = useState<{ height: number; top: number; keyboardOpen: boolean } | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        // Keyboard is "open" when the visual viewport is notably shorter than the layout viewport
        const keyboardOpen = window.innerWidth < 1024 && vv.height < window.innerHeight * 0.8;
        setState({ height: Math.round(vv.height), top: Math.round(vv.offsetTop), keyboardOpen });
      });
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => { cancelAnimationFrame(raf); vv.removeEventListener("resize", update); vv.removeEventListener("scroll", update); };
  }, []);
  return state;
}
