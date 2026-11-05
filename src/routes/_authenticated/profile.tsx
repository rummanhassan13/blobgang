import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Blob } from "@/components/blob/Blob";
import { BlobPicker } from "@/components/blob/BlobPicker";
import { Button } from "@/components/ui/button";
import { useProfile, useUser } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { isBlobType, type BlobType } from "@/lib/blobs";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile · Blob Gang" },
      { name: "description", content: "Your blob, your stats, your racing history." },
      { property: "og:title", content: "Profile · Blob Gang" },
      { property: "og:description", content: "Your blob, your stats, your racing history." },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { user } = useUser();
  const { data: profile } = useProfile(user?.id);
  const qc = useQueryClient();
  const [blob, setBlob] = useState<BlobType>("bubbles");
  useEffect(() => { if (profile && isBlobType(profile.blob)) setBlob(profile.blob); }, [profile]);

  async function save() {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ blob }).eq("id", user.id);
    if (error) return toast.error("Could not save");
    toast.success("Blob updated!");
    qc.invalidateQueries({ queryKey: ["profile", user.id] });
  }

  if (!profile) return null;
  const stats = [
    { label: "Points", value: profile.total_points },
    { label: "Best WPM", value: Math.round(Number(profile.best_wpm)) },
    { label: "Races", value: profile.races_played },
  ];
  return (
    <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 sm:px-6 md:grid-cols-2">
      <section className="glass flex flex-col items-center rounded-[2rem] p-8 text-center">
        <Blob type={blob} size={140} animation="happy" />
        <h1 className="mt-3 text-3xl font-bold">{profile.username}</h1>
        <div className="mt-6 grid w-full grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-3xl bg-secondary p-4">
              <div className="font-display text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </section>
      <section className="glass rounded-[2rem] p-6">
        <h2 className="mb-4 text-xl font-bold">Switch blob</h2>
        <BlobPicker value={blob} onChange={setBlob} />
        <Button className="mt-5 w-full" onClick={save} disabled={profile.blob === blob}>Save</Button>
      </section>
    </main>
  );
}
