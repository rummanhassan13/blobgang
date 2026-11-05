import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { isMuted, onMuteChange, setMuted, sfx } from "@/lib/sfx";

export function SoundToggle() {
  const [m, setM] = useState(false);
  useEffect(() => { setM(isMuted()); return onMuteChange(setM); }, []);
  return (
    <button type="button" aria-label={m ? "Turn sound on" : "Turn sound off"} aria-pressed={!m}
      onClick={() => { setMuted(!m); if (m) sfx.pop(); }}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
      {m ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
    </button>
  );
}
