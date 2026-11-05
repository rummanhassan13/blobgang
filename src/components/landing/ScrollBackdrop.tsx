import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useEffect, useState } from "react";
import { Blob } from "@/components/blob/Blob";
import type { BlobType } from "@/lib/blobs";

type Item = {
  kind: "color" | BlobType;
  color?: string;
  size: string; top: string; left: string;
  y: [number, number]; x: [number, number]; s: [number, number]; r: [number, number];
  mobile: boolean;
};

// Positions in vw/vh; motion ranges in px/scale/deg across the full page scroll.
const ITEMS: Item[] = [
  { kind: "color", color: "var(--ambient-1)", size: "46vmax", top: "-12vh", left: "-14vw", y: [0, 260], x: [0, 60], s: [1, 1.25], r: [0, 25], mobile: true },
  { kind: "color", color: "var(--ambient-2)", size: "40vmax", top: "40vh", left: "62vw", y: [0, -320], x: [0, -80], s: [1.1, 0.85], r: [0, -30], mobile: true },
  { kind: "color", color: "var(--ambient-3)", size: "34vmax", top: "85vh", left: "-6vw", y: [0, -420], x: [0, 90], s: [0.9, 1.2], r: [0, 20], mobile: false },
  { kind: "zippy", size: "26vmax", top: "8vh", left: "68vw", y: [0, 380], x: [0, -40], s: [1, 1.15], r: [-10, 15], mobile: false },
  { kind: "bubbles", size: "30vmax", top: "60vh", left: "18vw", y: [0, -260], x: [0, 50], s: [0.9, 1.1], r: [0, -20], mobile: true },
  { kind: "gloop", size: "22vmax", top: "95vh", left: "70vw", y: [0, -500], x: [0, -60], s: [1, 1.2], r: [10, -10], mobile: false },
];

function Floater({ item, p, still }: { item: Item; p: MotionValue<number>; still: boolean }) {
  const y = useTransform(p, [0, 1], item.y);
  const x = useTransform(p, [0, 1], item.x);
  const scale = useTransform(p, [0, 1], item.s);
  const rotate = useTransform(p, [0, 1], item.r);
  return (
    <motion.div
      className="absolute will-change-transform"
      style={{ width: item.size, height: item.size, top: item.top, left: item.left, ...(still ? {} : { x, y, scale, rotate }) }}
    >
      {item.kind === "color"
        ? <div className="h-full w-full rounded-[45%_55%_60%_40%/50%_45%_55%_50%]" style={{ background: item.color }} />
        : <div className="h-full w-full opacity-40"><Blob type={item.kind} size={1000} animation="none" className="!h-full !w-full [&>svg]:h-full [&>svg]:w-full" /></div>}
    </motion.div>
  );
}

/** Landing-only backdrop: soft pastel shapes that drift with scroll. Blur is applied once on the container. */
export function ScrollBackdrop() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const on = () => setMobile(mq.matches);
    on(); mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const items = mobile ? ITEMS.filter((i) => i.mobile) : ITEMS;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 blur-[40px] sm:blur-[64px]">
        {items.map((it, i) => <Floater key={i} item={it} p={scrollYProgress} still={!!reduce} />)}
      </div>
      {/* Soft wash keeps text crisp over the colour */}
      <div className="absolute inset-0 bg-background/45" />
    </div>
  );
}
