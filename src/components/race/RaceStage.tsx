import { useEffect, type ReactNode } from "react";
import { useVisualViewport } from "@/hooks/use-visual-viewport";
import { cn } from "@/lib/utils";

/**
 * Race layout. When a phone keyboard is open, the stage pins itself to the visible
 * area above the keyboard so lanes + typing card both stay on screen and the page can't scroll.
 */
export function RaceStage({ children, lanes, footer }: { children: ReactNode; lanes: (compact: boolean) => ReactNode; footer?: ReactNode }) {
  const vv = useVisualViewport();
  const pinned = !!vv?.keyboardOpen;

  useEffect(() => {
    if (!pinned) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => { html.style.overflow = prev; };
  }, [pinned]);

  return (
    <main
      data-pinned={pinned || undefined}
      className={cn(
        "mx-auto flex w-full max-w-5xl flex-col",
        pinned
          ? "fixed inset-x-0 top-0 z-40 gap-2 bg-background px-2 pb-1 pt-[max(0.5rem,env(safe-area-inset-top))]"
          : "gap-4 px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:gap-6 sm:px-6 sm:py-6",
      )}
      style={pinned && vv ? { height: vv.height, transform: `translateY(${vv.top}px)` } : undefined}
    >
      <div className="shrink-0">{lanes(pinned)}</div>
      <div className={cn("flex flex-col", pinned && "min-h-0 flex-1")}>{children}</div>
      {footer && <div className="shrink-0">{footer}</div>}
    </main>
  );
}
