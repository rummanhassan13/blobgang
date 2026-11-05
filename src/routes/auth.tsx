import { seo } from "@/lib/seo";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Blob } from "@/components/blob/Blob";
import { BlobPicker } from "@/components/blob/BlobPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { BlobType } from "@/lib/blobs";

function safeRedirect(v: unknown): string {
  return typeof v === "string" && v.startsWith("/") && !v.startsWith("//") ? v : "/home";
}

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } =>
    typeof s["redirect"] === "string" ? { redirect: s["redirect"] } : {},
  head: () => seo({ title: "Sign in or join · Blob Gang", description: "Sign in or pick your blob and join Blob Gang, the squishy multiplayer typing race.", path: "/auth", noindex: true }),
  component: AuthPage,
});

const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const next = safeRedirect(search.redirect);
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [blob, setBlob] = useState<BlobType>("zippy");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [wrong, setWrong] = useState(0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSent(true);
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { setWrong((w) => w + 1); throw error; }
        navigate({ to: next });
      } else {
        if (!USERNAME_RE.test(username)) throw new Error("Username: 3-20 letters, numbers or underscores.");
        const { data: ok, error: rpcErr } = await supabase.rpc("username_available", { _username: username });
        if (rpcErr) throw rpcErr;
        if (!ok) throw new Error("That username is taken.");
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + next, data: { username, blob } },
        });
        if (error) throw error;
        setSent(true);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-12 text-center">
        <div className="glass flex flex-col items-center rounded-[2rem] p-10">
          <Blob type={mode === "forgot" ? "bubbles" : blob} size={120} animation="happy" />
          <h1 className="mt-4 text-2xl font-bold">Check your inbox!</h1>
          <p className="mt-2 text-muted-foreground">{mode === "forgot" ? <>If an account exists for <b>{email}</b>, you’ll receive a password reset link. Check your spam folder too.</> : <>We sent a confirmation link to <b>{email}</b>. Click it and your blob is ready to roll.</>}</p>
          {mode === "forgot" && <Button variant="ghost" className="mt-4 min-h-11" onClick={() => { setSent(false); setMode("login"); }}>Back to log in</Button>}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-8">
      <div className="glass rounded-[2rem] p-6 sm:p-8">
        <h1 className={mode === "forgot" ? "mb-4 text-center text-2xl font-bold" : "sr-only"}>{mode === "forgot" ? "Forgot your password?" : mode === "login" ? "Log in to Blob Gang" : "Join Blob Gang"}</h1>
        <div className="mb-6 flex justify-center">
          <Blob key={wrong} type={mode === "signup" ? blob : "grumbo"} size={90}
            animation={wrong > 0 && mode === "login" ? "shake" : "idle"} mood={mode === "login" ? "neutral" : undefined} />
        </div>
        {mode !== "forgot" && <div className="mb-6 grid grid-cols-2 rounded-full bg-secondary p-1">
          {(["login", "signup"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className="relative min-h-11 rounded-full py-2 font-display text-sm font-semibold">
              {mode === m && <motion.span layoutId="authtab" className="absolute inset-0 rounded-full bg-card shadow-soft" transition={{ type: "spring", stiffness: 400, damping: 30 }} />}
              <span className="relative">{m === "login" ? "Log in" : "Sign up"}</span>
            </button>
          ))}
        </div>}
        <form onSubmit={submit} className="space-y-4">
          <AnimatePresence initial={false}>
            {mode === "signup" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-4 overflow-hidden">
                <div className="space-y-1.5">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required={mode === "signup"} className="h-11 rounded-full px-4" placeholder="jellyfast" autoComplete="username" />
                </div>
                <div className="space-y-1.5">
                  <Label>Pick your blob</Label>
                  <BlobPicker value={blob} onChange={setBlob} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11 rounded-full px-4" autoComplete="email" />
          </div>
          {mode !== "forgot" && <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="h-11 rounded-full px-4"
              autoComplete={mode === "login" ? "current-password" : "new-password"} />
          </div>}
          <Button type="submit" variant="jelly" size="lg" className="w-full" disabled={busy}>
            {busy ? "Wobbling…" : mode === "forgot" ? "Send reset link" : mode === "login" ? "Let's race" : "Join the gang"}
          </Button>
          {mode !== "signup" && <Button type="button" variant="ghost" className="min-h-11 w-full" disabled={busy} onClick={() => setMode(mode === "forgot" ? "login" : "forgot")}>{mode === "forgot" ? "Back to log in" : "Forgot password?"}</Button>}
        </form>
      </div>
    </main>
  );
}
