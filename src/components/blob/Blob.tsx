import { motion, type TargetAndTransition, type Transition } from "framer-motion";
import { BLOB_INFO, type BlobAnimation, type BlobMood, type BlobType } from "@/lib/blobs";

type Props = {
  type: BlobType;
  size?: number;
  mood?: BlobMood | undefined;
  animation?: BlobAnimation | undefined;
  className?: string | undefined;
  title?: string | undefined;
  ghost?: boolean | undefined;
};

const BODY: Record<BlobType, string> = {
  zippy: "M50 10 C60 30 84 46 84 66 C84 84 68 92 50 92 C32 92 16 84 16 66 C16 46 40 30 50 10Z",
  snooze: "M8 72 C8 56 28 50 50 50 C72 50 92 56 92 72 C92 86 72 90 50 90 C28 90 8 86 8 72Z",
  grumbo: "M18 34 C18 26 24 22 32 22 L68 22 C76 22 82 26 82 34 L84 78 C84 86 78 90 70 90 L30 90 C22 90 16 86 16 78Z",
  bubbles: "M50 18 C72 18 88 34 88 56 C88 78 72 92 50 92 C28 92 12 78 12 56 C12 34 28 18 50 18Z",
  gloop: "M16 70 C10 48 28 30 52 32 C76 34 92 50 86 72 C82 88 64 92 48 91 C30 90 20 84 16 70Z",
  mochi: "M12 74 C12 50 28 34 50 34 C72 34 88 50 88 74 C88 86 72 91 50 91 C28 91 12 86 12 74Z",
};

// Eye centre y per blob
const EYE_Y: Record<BlobType, number> = { zippy: 62, snooze: 68, grumbo: 54, bubbles: 54, gloop: 60, mochi: 62 };

const ANIMS: Record<Exclude<BlobAnimation, "none">, { animate: TargetAndTransition; transition: Transition }> = {
  idle: {
    animate: { scaleX: [1, 1.04, 0.98, 1], scaleY: [1, 0.96, 1.03, 1] },
    transition: { duration: 2.6, repeat: Infinity, ease: "easeInOut" },
  },
  squash: {
    animate: { scaleX: [1, 1.25, 0.85, 1.05, 1], scaleY: [1, 0.75, 1.2, 0.97, 1], y: [0, 0, -14, 0, 0] },
    transition: { duration: 0.9, repeat: Infinity, repeatDelay: 0.3, ease: "easeInOut" },
  },
  jiggle: {
    animate: { rotate: [0, -6, 6, -4, 4, 0], scaleY: [1, 0.95, 1.04, 0.98, 1, 1] },
    transition: { duration: 0.6, repeat: Infinity, repeatDelay: 0.8 },
  },
  shake: {
    animate: { x: [0, -6, 6, -5, 5, -2, 0] },
    transition: { duration: 0.45 },
  },
  happy: {
    animate: { y: [0, -18, 0, -8, 0], scaleX: [1, 0.9, 1.15, 0.95, 1], scaleY: [1, 1.12, 0.88, 1.05, 1], rotate: [0, -4, 4, 0, 0] },
    transition: { duration: 1, repeat: Infinity, repeatDelay: 0.2, ease: "easeOut" },
  },
};

function Eyes({ mood, y }: { mood: BlobMood; y: number }) {
  const lx = 38, rx = 62;
  const ink = "var(--blob-ink)";
  switch (mood) {
    case "sleepy":
      return (
        <g stroke={ink} strokeWidth={3} strokeLinecap="round" fill="none">
          <path d={`M${lx - 5} ${y} Q${lx} ${y + 3} ${lx + 5} ${y}`} />
          <path d={`M${rx - 5} ${y} Q${rx} ${y + 3} ${rx + 5} ${y}`} />
        </g>
      );
    case "happy":
      return (
        <g stroke={ink} strokeWidth={3.2} strokeLinecap="round" fill="none">
          <path d={`M${lx - 5} ${y + 2} Q${lx} ${y - 5} ${lx + 5} ${y + 2}`} />
          <path d={`M${rx - 5} ${y + 2} Q${rx} ${y - 5} ${rx + 5} ${y + 2}`} />
        </g>
      );
    case "grumpy":
      return (
        <g>
          <g stroke={ink} strokeWidth={3.5} strokeLinecap="round">
            <line x1={lx - 7} y1={y - 9} x2={lx + 5} y2={y - 5} />
            <line x1={rx + 7} y1={y - 9} x2={rx - 5} y2={y - 5} />
          </g>
          <circle cx={lx} cy={y + 1} r={3.6} fill={ink} />
          <circle cx={rx} cy={y + 1} r={3.6} fill={ink} />
        </g>
      );
    case "shocked":
      return (
        <g fill={ink}>
          <circle cx={lx} cy={y} r={5} />
          <circle cx={rx} cy={y} r={5} />
          <ellipse cx={50} cy={y + 13} rx={3.5} ry={4.5} />
        </g>
      );
    default:
      return (
        <g fill={ink}>
          <circle cx={lx} cy={y} r={4} />
          <circle cx={rx} cy={y} r={4} />
        </g>
      );
  }
}

export function Blob({ type, size = 96, mood, animation = "idle", className, title, ghost }: Props) {
  const m = mood ?? BLOB_INFO[type].mood;
  const eyeY = EYE_Y[type];
  const anim = animation === "none" ? undefined : ANIMS[animation];
  return (
    <motion.div
      style={{ width: size, height: size, transformOrigin: "50% 90%", opacity: ghost ? 0.5 : 1 }}
      {...(anim ? { animate: anim.animate, transition: anim.transition } : {})}
      {...(className ? { className } : {})}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={title ?? BLOB_INFO[type].name}>
        <ellipse cx="50" cy="95" rx="30" ry="3.5" fill="var(--blob-ink)" opacity="0.1" />
        <path d={BODY[type]} fill={`var(--blob-${type})`} fillOpacity={ghost ? 0.45 : 1} stroke={ghost ? "var(--blob-ink)" : "none"} strokeWidth={ghost ? 2 : 0} strokeDasharray={ghost ? "5 4" : undefined} strokeOpacity={0.6} />
        <ellipse cx={type === "snooze" ? 30 : 34} cy={type === "snooze" ? 60 : eyeY - 18} rx="8" ry="4.5" fill="var(--blob-shine)" transform={`rotate(-25 34 ${eyeY - 18})`} />
        {type === "mochi" && (
          <g fill="var(--blob-cheek)">
            <ellipse cx="29" cy={eyeY + 9} rx="6" ry="3.5" />
            <ellipse cx="71" cy={eyeY + 9} rx="6" ry="3.5" />
          </g>
        )}
        {type === "gloop" && (
          <g>
            <path d="M34 34 C34 22 66 22 66 34 Z" fill="var(--blob-hat)" />
            <rect x="30" y="31" width="40" height="6" rx="3" fill="var(--blob-hat-band)" />
            <circle cx="50" cy="26" r="2.4" fill="var(--blob-hat-band)" />
          </g>
        )}
        <Eyes mood={m} y={eyeY} />
      </svg>
    </motion.div>
  );
}
