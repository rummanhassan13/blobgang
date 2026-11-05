import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Blob } from "@/components/blob/Blob";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProfile, useUser } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { isBlobType } from "@/lib/blobs";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Play · Blob Gang" },
      { name: "description", content: "Create a room, join your friends by code, or race solo." },
      { property: "og:title", content: "Play · Blob Gang" },
      { property: "og:description", content: "Create a room, join your friends by code, or race solo." },
    ],
  }),
  component: Home,
});

function makeCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function Home() {
  const { user } = useUser();
  const { data: profile } = useProfile(user?.id);
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [creating, setCreating] = useState(false);

  async function createRoom() {
    if (!user || !profile) return;
    setCreating(true);
    const { data: passages } = await supabase.from("passages").select("id");
    const passage = passages?.[Math.floor(Math.random() * passages.length)];
    const { data: room, error } = await supabase
      .from("rooms")
      .insert({ code: makeCode(), host_id: user.id, passage_id: passage?.id })
      .select()
      .single();
    if (error || !room) {
      setCreating(false);
      return toast.error("Could not create a room. Try again.");
    }
    await supabase.from("room_players").insert({ room_id: room.id, user_id: user.id, blob: profile.blob, username: profile.username });
    navigate({ to: "/lobby/$code", params: { code: room.code } });
  }

  function join(e: React.FormEvent) {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (c.length < 4) return toast.error("Enter a room code");
    navigate({ to: "/lobby/$code", params: { code: c } });
  }

  const blob = profile && isBlobType(profile.blob) ? profile.blob : "bubbles";
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-center gap-4">
        <Blob type={blob} size={80} animation="happy" />
        <div>
          <p className="text-muted-foreground">Ready to race,</p>
          <h1 className="text-3xl font-bold sm:text-4xl">{profile?.username ?? "blob"}?</h1>
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        <Card blob="gloop" title="Create a room" text="Get a code and invite your gang.">
          <Button variant="jelly" className="w-full" onClick={createRoom} disabled={creating || !profile}>
            {creating ? "Creating…" : "Create room"}
          </Button>
        </Card>
        <Card blob="bubbles" title="Join by code" text="Got a code from a friend?">
          <form onSubmit={join} className="flex gap-2">
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ABCDE" maxLength={6}
              className="h-11 rounded-full text-center font-display text-lg uppercase tracking-widest" />
            <Button type="submit">Go</Button>
          </form>
        </Card>
        <Card blob="snooze" title="Solo practice" text="Race your own ghost at your own pace.">
          <Button variant="soft" className="w-full" onClick={() => navigate({ to: "/race/$roomId", params: { roomId: "solo" } })}>
            Start solo
          </Button>
        </Card>
      </div>
    </main>
  );
}

function Card({ blob, title, text, children }: { blob: "gloop" | "bubbles" | "snooze"; title: string; text: string; children: React.ReactNode }) {
  return (
    <motion.section whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 300, damping: 18 }}
      className="glass flex flex-col gap-4 rounded-[2rem] p-6">
      <Blob type={blob} size={64} animation="idle" />
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
      <div className="mt-auto">{children}</div>
    </motion.section>
  );
}
