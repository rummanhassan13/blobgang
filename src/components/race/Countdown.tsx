import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { sfx } from "@/lib/sfx";

export function Countdown({ value }: { value: number | null }) {
  useEffect(() => { if (value === null) return; if (value === 0) sfx.go(); else sfx.count(); }, [value]);
  return (
    <AnimatePresence>
      {value !== null && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-background/40 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <AnimatePresence mode="popLayout">
            <motion.div
              key={value}
              className="flex h-48 w-48 items-center justify-center rounded-[45%_55%_50%_50%/55%_45%_55%_45%] bg-gradient-jelly font-display text-8xl font-bold text-primary-foreground shadow-pop"
              initial={{ scale: 0.2, rotate: -20, opacity: 0 }}
              animate={{ scale: [0.2, 1.25, 0.9, 1], scaleY: [0.2, 0.85, 1.1, 1], rotate: 0, opacity: 1 }}
              exit={{ scale: 1.6, opacity: 0 }}
              transition={{ duration: 0.55 }}
            >
              {value === 0 ? "Go!" : value}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
