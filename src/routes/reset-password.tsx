import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Blob } from "@/components/blob/Blob";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/reset-password")({
  head: () => seo({ title: "Reset your password · Blob Gang", description: "Choose a new password for your Blob Gang account using your secure recovery link.", path: "/reset-password", noindex: true }),
  component: ResetPasswordPage,
});

export function ResetPasswordPage() {
  const [status, setStatus] = useState<"checking" | "ready" | "invalid" | "done">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const isRecovery = hash.get("type") === "recovery";
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (active && event === "PASSWORD_RECOVERY") setStatus("ready");
      if (active && event === "SIGNED_OUT") setStatus("invalid");
    });
    // A normal signed-in session alone must not unlock the recovery form.
    if (isRecovery) {
      supabase.auth.getUser().then(({ data: userData, error: authError }) => {
        if (active) setStatus(userData.user && !authError ? "ready" : "invalid");
      }).catch(() => { if (active) setStatus("invalid"); });
    } else {
      setStatus("invalid");
    }
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (status !== "ready" || busy) return;
    if (password !== confirm) { setError("Passwords don’t match."); return; }
    setBusy(true);
    setError("");
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setPassword("");
      setConfirm("");
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t reset your password. Please request a new link.");
    } finally { setBusy(false); }
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-8">
      <div className="glass rounded-[2rem] p-6 sm:p-8">
        <div className="mb-4 flex justify-center"><Blob type="bubbles" size={90} animation={status === "done" ? "happy" : "idle"} /></div>
        <h1 className="text-center text-2xl font-bold">{status === "done" ? "Password reset!" : "Reset your password"}</h1>
        {status === "checking" && <p role="status" className="mt-4 text-center text-muted-foreground">Checking your reset link…</p>}
        {status === "invalid" && <div className="mt-4 space-y-4 text-center"><p className="text-muted-foreground">This reset link is missing, expired or already used. Request a new one from the login page.</p><Button asChild variant="jelly" className="min-h-11"><Link to="/auth">Back to log in</Link></Button></div>}
        {status === "done" && <div className="mt-4 space-y-4 text-center"><p role="status" className="text-muted-foreground">Your new password is saved. You’re ready to race.</p><Button asChild variant="jelly" className="min-h-11"><Link to="/home">Let’s race</Link></Button></div>}
        {status === "ready" && <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5"><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" autoComplete="new-password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 rounded-full px-4" /></div>
          <div className="space-y-1.5"><Label htmlFor="confirm-password">Confirm new password</Label><Input id="confirm-password" type="password" autoComplete="new-password" minLength={6} required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-11 rounded-full px-4" /></div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" variant="jelly" size="lg" className="w-full" disabled={busy}>{busy ? "Saving…" : "Save new password"}</Button>
        </form>}
      </div>
    </main>
  );
}