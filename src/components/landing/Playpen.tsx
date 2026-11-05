import { useEffect, useRef, useState } from "react";
import { Blob } from "@/components/blob/Blob";
import { BLOB_INFO, BLOB_TYPES } from "@/lib/blobs";
import { sfx } from "@/lib/sfx";

type Body = { x: number; y: number; vx: number; vy: number; dir: number; sq: number; scared: number };
const S = 64, CRUISE = 40, MAX = 1400, FLEE_R = 170, FLEE_F = 4200, DAMP = 0.992;

/** Zero-gravity playpen: blobs drift on their own paths; grab one and it gets furious, everyone flees. Pauses off-screen. */
export function Playpen() {
  const boxRef = useRef<HTMLDivElement>(null);
  const els = useRef<(HTMLDivElement | null)[]>([]);
  const [angry, setAngry] = useState<number | null>(null);
  const [scared, setScared] = useState<boolean[]>(() => BLOB_TYPES.map(() => false));

  useEffect(() => {
    const box = boxRef.current; if (!box) return;
    let W = box.clientWidth, H = box.clientHeight;
    const bodies: Body[] = BLOB_TYPES.map(() => {
      const dir = Math.random() * Math.PI * 2;
      return { x: Math.random() * (W - S), y: Math.random() * (H - S), vx: Math.cos(dir) * CRUISE, vy: Math.sin(dir) * CRUISE, dir, sq: 0, scared: 0 };
    });
    let drag: { i: number; ox: number; oy: number; px: number; py: number; t: number } | null = null;
    let raf = 0, last = 0, visible = true, lastBonk = 0;
    const scaredState = bodies.map(() => false);

    const draw = () => bodies.forEach((b, i) => {
      const el = els.current[i]; if (!el) return;
      const s = Math.max(-0.25, Math.min(0.25, b.sq));
      el.style.transform = `translate3d(${b.x}px,${b.y}px,0) scale(${1 + s},${1 - s})`;
    });
    const step = (t: number) => {
      const dt = Math.min(0.033, (t - last) / 1000 || 0.016); last = t;
      let changed = false;
      bodies.forEach((b, i) => {
        if (drag && drag.i === i) { b.sq *= 0.85; return; }
        // wander: each blob slowly turns on its own
        b.dir += (Math.random() - 0.5) * 1.6 * dt;
        b.vx += Math.cos(b.dir) * 30 * dt; b.vy += Math.sin(b.dir) * 30 * dt;
        if (drag) {
          const d = bodies[drag.i]!; const dx = b.x - d.x, dy = b.y - d.y, dist = Math.hypot(dx, dy) || 1;
          if (dist < FLEE_R) { const f = (1 - dist / FLEE_R) * FLEE_F * dt; b.vx += (dx / dist) * f; b.vy += (dy / dist) * f; b.scared = 1.2; }
        }
        b.scared = Math.max(0, b.scared - dt);
        const sp = Math.hypot(b.vx, b.vy);
        if (sp > CRUISE) { const k = Math.max(DAMP ** (dt * 60), CRUISE / sp); b.vx *= k; b.vy *= k; }
        if (sp > MAX) { b.vx *= MAX / sp; b.vy *= MAX / sp; }
        b.x += b.vx * dt; b.y += b.vy * dt;
        let hit = 0;
        if (b.x < 0) { b.x = 0; hit = Math.abs(b.vx); b.vx = Math.abs(b.vx) * 0.85; b.sq = -Math.min(0.25, hit / 3000); }
        if (b.x > W - S) { b.x = W - S; hit = Math.abs(b.vx); b.vx = -Math.abs(b.vx) * 0.85; b.sq = -Math.min(0.25, hit / 3000); }
        if (b.y < 0) { b.y = 0; hit = Math.abs(b.vy); b.vy = Math.abs(b.vy) * 0.85; b.sq = Math.min(0.25, hit / 3000); }
        if (b.y > H - S) { b.y = H - S; hit = Math.abs(b.vy); b.vy = -Math.abs(b.vy) * 0.85; b.sq = Math.min(0.25, hit / 3000); }
        if (hit) { b.dir = Math.atan2(b.vy, b.vx); if (hit > 300 && t - lastBonk > 120) { sfx.bonk(); lastBonk = t; } }
        b.sq *= 0.88;
        const sc = b.scared > 0; if (sc !== scaredState[i]) { scaredState[i] = sc; changed = true; }
      });
      if (changed) setScared([...scaredState]);
      draw();
      raf = visible ? requestAnimationFrame(step) : 0;
    };
    const start = () => { if (!raf && visible) { last = performance.now(); raf = requestAnimationFrame(step); } };

    const local = (e: PointerEvent) => { const r = box.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const down = (e: PointerEvent) => {
      const i = els.current.findIndex((el) => el?.contains(e.target as Node)); if (i < 0) return;
      e.preventDefault(); box.setPointerCapture(e.pointerId);
      const p = local(e), b = bodies[i]!;
      drag = { i, ox: p.x - b.x, oy: p.y - b.y, px: p.x, py: p.y, t: performance.now() };
      b.vx = b.vy = 0; b.sq = -0.2; sfx.scream(); setAngry(i);
    };
    const move = (e: PointerEvent) => {
      if (!drag) return; const p = local(e), b = bodies[drag.i]!, now = performance.now(), dt = Math.max(1, now - drag.t) / 1000;
      b.vx = (p.x - drag.px) / dt; b.vy = (p.y - drag.py) / dt;
      b.x = Math.max(0, Math.min(W - S, p.x - drag.ox)); b.y = Math.max(0, Math.min(H - S, p.y - drag.oy));
      drag.px = p.x; drag.py = p.y; drag.t = now;
    };
    const up = () => {
      if (!drag) return; const b = bodies[drag.i]!;
      b.dir = Math.atan2(b.vy, b.vx); drag = null; setAngry(null);
    };
    const resize = () => { W = box.clientWidth; H = box.clientHeight; bodies.forEach((b) => { b.x = Math.min(b.x, W - S); b.y = Math.min(b.y, H - S); }); draw(); };
    const io = new IntersectionObserver(([en]) => { visible = !!en?.isIntersecting; if (visible) start(); });
    io.observe(box);
    box.addEventListener("pointerdown", down); box.addEventListener("pointermove", move);
    box.addEventListener("pointerup", up); box.addEventListener("pointercancel", up);
    window.addEventListener("resize", resize);
    draw(); start();
    return () => { cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener("resize", resize);
      box.removeEventListener("pointerdown", down); box.removeEventListener("pointermove", move);
      box.removeEventListener("pointerup", up); box.removeEventListener("pointercancel", up); };
  }, []);

  return (
    <div className="mt-14 w-full">
      <div ref={boxRef} role="img" aria-label="A floating playpen of the six blobs. Grab one and it gets furious; the others flee."
        className="glass relative h-72 w-full select-none overflow-hidden rounded-[2.5rem] sm:h-80">
        {BLOB_TYPES.map((t, i) => (
          <div key={t} ref={(el) => { els.current[i] = el; }} title={BLOB_INFO[t].name}
            className="absolute left-0 top-0 cursor-grab touch-none will-change-transform active:cursor-grabbing"
            style={{ transformOrigin: "50% 50%" }}>
            <Blob type={t} size={S}
              animation={angry === i ? "jiggle" : "none"}
              mood={angry === i ? "grumpy" : scared[i] ? "shocked" : undefined} />
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">Grab a blob to make it furious. Everyone else will float for their lives.</p>
    </div>
  );
}
