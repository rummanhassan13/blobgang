import { motion } from "framer-motion";
import { Blob } from "./Blob";
import { BLOB_INFO, BLOB_TYPES, type BlobType } from "@/lib/blobs";
import { cn } from "@/lib/utils";

export function BlobPicker({ value, onChange }: { value: BlobType; onChange: (b: BlobType) => void }) {
  return (
    <div role="radiogroup" aria-label="Choose your blob" className="grid grid-cols-3 gap-3">
      {BLOB_TYPES.map((t) => {
        const selected = value === t;
        return (
          <motion.button
            key={t}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(t)}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.94 }}
            className={cn(
              "flex flex-col items-center rounded-3xl border-2 bg-card px-2 pb-2 pt-3 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              selected ? "border-primary bg-secondary" : "border-transparent hover:border-border",
            )}
          >
            <Blob type={t} size={60} animation={selected ? "happy" : "idle"} />
            <span className="mt-1 font-display text-xs font-semibold">{BLOB_INFO[t].name}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
