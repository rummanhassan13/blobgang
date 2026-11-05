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

  const linkCls = "rounded-full px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
      <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold">
        <Blob type="bubbles" size={34} animation="idle" mood="happy" />
        Blob Gang
      </Link>
      {!loading && (
        <nav className="flex items-center gap-1">
          {user ? (
            <>
              <Link to="/home" className={linkCls} activeProps={{ className: "bg-secondary text-foreground" }}>Play</Link>
              <Link to="/leaderboard" className={`${linkCls} hidden sm:inline-flex`} activeProps={{ className: "bg-secondary text-foreground" }}>Leaderboard</Link>
              <Link to="/profile" className="ml-1 flex shrink-0 items-center gap-2 rounded-full bg-card p-1 shadow-soft sm:pr-3">
                {profile && isBlobType(profile.blob) && <Blob type={profile.blob} size={30} animation="none" />}
                <span className="hidden max-w-24 truncate text-sm font-semibold sm:inline">{profile?.username ?? "…"}</span>
              </Link>
              <Button variant="ghost" size="sm" onClick={signOut}>Sign out</Button>
            </>
          ) : (
            <Button asChild size="sm"><Link to="/auth">Sign in</Link></Button>
          )}
        </nav>
      )}
    </header>
  );
}
