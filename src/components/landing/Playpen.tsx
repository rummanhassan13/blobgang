import { useEffect, useRef } from "react";
import { Blob } from "@/components/blob/Blob";
import { BLOB_INFO, BLOB_TYPES } from "@/lib/blobs";
import { sfx } from "@/lib/sfx";

type Body = { x: number; y: number; vx: number; vy: number; sq: number };
const GRAVITY = 2200, BOUNCE = 0.55, FRICTION = 0.985, FLEE_R = 150, FLEE_F = 5200;

/** Lightweight hand-rolled physics box: drag & fling a blob, the others scatter. Pauses when idle or off-screen. */
export function Playpen() {
  const boxRef = useRef<HTMLDivElement>(null);
  const els = useRef<(HTMLDivElement | null)[]>([]);
  const kick = useRef<() => void>(() => {});

  useEffect(() => {
    const box = boxRef.current; if (!box) return;
    const size = () => (box.clientWidth < 480 ? 56 : 72);
    let S = size(), W = box.clientWidth, H = box.clientHeight;
    const bodies: Body[] = BLOB_TYPES.map((_, i) => ({ x: (W - S) * ((i + 0.5) / BLOB_TYPES.length), y: H - S, vx: 0, vy: 0, sq: 0 }));
    let drag: { i: number; ox: number; oy: number; px: number; py: number; t: number } | null = null;
    let raf = 0, last = 0, visible = true, lastSound = 0;

    const draw = () => bodies.forEach((b, i) => {
      const el = els.current[i]; if (!el) return;
      const s = Math.max(-0.3, Math.min(0.3, b.sq));
      el.style.transform = `translate3d(${b.x}px,${b.y}px,0) scale(${1 + s},${1 - s})`;
    });
    const step = (t: number) => {
      const dt = Math.min(0.033, (t - last) / 1000 || 0.016); last = t;
      let moving = !!drag;
      bodies.forEach((b, i) => {
        if (drag && drag.i === i) { b.sq *= 0.8; return; }
        if (drag) {
          const d = bodies[drag.i]!; const dx = b.x - d.x, dy = b.y - d.y, dist = Math.hypot(dx, dy) || 1;
          if (dist < FLEE_R) { const f = (1 - dist / FLEE_R) * FLEE_F * dt; b.vx += (dx / dist) * f; b.vy += (dy / dist) * f - 30; }
        }
        b.vy += GRAVITY * dt; b.vx *= FRICTION;
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.y > H - S) {
          const impact = b.vy; b.y = H - S; b.vy = -b.vy * BOUNCE; b.vx *= 0.9;
          if (impact > 500) { b.sq = Math.min(0.3, impact / 4000); if (t - lastSound > 120) { sfx.pop(); lastSound = t; } }
          if (Math.abs(b.vy) < 60) b.vy = 0;
        }
        if (b.y < 0) { b.y = 0; b.vy = Math.abs(b.vy) * BOUNCE; }
        if (b.x < 0) { b.x = 0; b.vx = Math.abs(b.vx) * BOUNCE; }
        if (b.x > W - S) { b.x = W - S; b.vx = -Math.abs(b.vx) * BOUNCE; }
        b.sq *= 0.85;
        if (Math.abs(b.vx) > 5 || Math.abs(b.vy) > 5 || b.y < H - S - 1 || Math.abs(b.sq) > 0.01) moving = true;
      });
      draw();
      raf = moving && visible ? requestAnimationFrame(step) : 0;
    };
    const start = () => { if (!raf && visible) { last = performance.now(); raf = requestAnimationFrame(step); } };
    kick.current = start;

    const local = (e: PointerEvent) => { const r = box.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const down = (e: PointerEvent) => {
      const i = els.current.findIndex((el) => el?.contains(e.target as Node)); if (i < 0) return;
      e.preventDefault(); box.setPointerCapture(e.pointerId);
      const p = local(e), b = bodies[i]!;
      drag = { i, ox: p.x - b.x, oy: p.y - b.y, px: p.x, py: p.y, t: performance.now() };
      b.vx = b.vy = 0; b.sq = -0.2; sfx.word(); start();
    };
    const move = (e: PointerEvent) => {
      if (!drag) return; const p = local(e), b = bodies[drag.i]!, now = performance.now(), dt = Math.max(1, now - drag.t) / 1000;
      b.vx = (p.x - drag.px) / dt; b.vy = (p.y - drag.py) / dt;
      b.x = Math.max(0, Math.min(W - S, p.x - drag.ox)); b.y = Math.max(0, Math.min(H - S, p.y - drag.oy));
      drag.px = p.x; drag.py = p.y; drag.t = now;
    };
    const up = () => {
      if (!drag) return; const b = bodies[drag.i]!;
      b.vx = Math.max(-2500, Math.min(2500, b.vx)); b.vy = Math.max(-2500, Math.min(2500, b.vy)); drag = null; start();
    };
    const resize = () => { S = size(); W = box.clientWidth; H = box.clientHeight; bodies.forEach((b) => { b.x = Math.min(b.x, W - S); b.y = Math.min(b.y, H - S); }); draw(); start(); };
    const io = new IntersectionObserver(([en]) => { visible = !!en?.isIntersecting; if (visible) start(); });
    io.observe(box);
    box.addEventListener("pointerdown", down); box.addEventListener("pointermove", move);
    box.addEventListener("pointerup", up); box.addEventListener("pointercancel", up);
    window.addEventListener("resize", resize);
    draw();
    return () => { cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener("resize", resize);
      box.removeEventListener("pointerdown", down); box.removeEventListener("pointermove", move);
      box.removeEventListener("pointerup", up); box.removeEventListener("pointercancel", up); };
  }, []);

  return (
    <div className="mt-14 w-full">
      <div ref={boxRef} role="img" aria-label="A playpen of the six blobs. Grab one and fling it; the others scatter."
        className="glass relative h-72 w-full select-none overflow-hidden rounded-[2.5rem] sm:h-80">
        {BLOB_TYPES.map((t, i) => (
          <div key={t} ref={(el) => { els.current[i] = el; }} title={BLOB_INFO[t].name}
            className="absolute left-0 top-0 cursor-grab touch-none will-change-transform active:cursor-grabbing"
            style={{ transformOrigin: "50% 100%" }}>
            <Blob type={t} size={72} animation="none" className="h-14 w-14 sm:h-[72px] sm:w-[72px] [&>svg]:h-full [&>svg]:w-full" />
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">Grab a blob and fling it. Everyone else will run for it.</p>
    </div>
  );
}
