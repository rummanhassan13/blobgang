import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Blob } from "@/components/blob/Blob";
import { Button } from "@/components/ui/button";
import { useProfile, useUser } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { isBlobType } from "@/lib/blobs";

export function AppNav() {
  const { user, loading } = useUser();
  const { data: profile } = useProfile(user?.id);
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const linkCls = "inline-flex min-h-11 items-center rounded-full px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-3 pb-3 pt-[max(1rem,env(safe-area-inset-top))] sm:gap-3 sm:px-6">
      <Link to="/" aria-label="Blob Gang home" className="flex min-h-11 min-w-11 shrink-0 items-center gap-2 font-display text-xl font-bold">
        <Blob type="bubbles" size={34} animation="idle" mood="happy" />
        <span className="hidden min-[420px]:inline">Blob Gang</span>
      </Link>
      {!loading && (
        <nav className="flex min-w-0 items-center gap-0.5 sm:gap-1">
          {user ? (
            <>
              <Link to="/home" className={linkCls} activeProps={{ className: "bg-secondary text-foreground" }}>Play</Link>
              <Link to="/leaderboard" className={linkCls} activeProps={{ className: "bg-secondary text-foreground" }}>
                <span className="sm:hidden">Ranks</span><span className="hidden sm:inline">Leaderboard</span>
              </Link>
              <Link to="/profile" aria-label="Your profile" className="ml-1 flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-full bg-card p-1 shadow-soft sm:pr-3">
                {profile && isBlobType(profile.blob) && <Blob type={profile.blob} size={30} animation="none" />}
                <span className="hidden max-w-24 truncate text-sm font-semibold sm:inline">{profile?.username ?? "…"}</span>
              </Link>
              <Button variant="ghost" size="sm" className="min-h-11 px-2 sm:px-3" onClick={signOut}>Sign out</Button>
            </>
          ) : (
            <Button asChild size="sm" className="min-h-11"><Link to="/auth">Sign in</Link></Button>
          )}
        </nav>
      )}
    </header>
  );
}
