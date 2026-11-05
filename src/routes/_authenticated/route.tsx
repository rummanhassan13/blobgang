import { createFileRoute, Outlet, redirect, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { BlobState } from "@/components/BlobState";
import { useUser } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  // "data-only": the server renders each page's <head> (titles, share cards, noindex)
  // but the page itself renders in the browser, where the session lives.
  ssr: "data-only",
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return; // no session on the server
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", search: { redirect: location.href } });
  },
  component: AuthGate,
});

/** Client-side guard for the first, server-rendered load (beforeLoad skipped on the server). */
function AuthGate() {
  const { user, loading } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { redirect: location.href }, replace: true });
  }, [loading, user, navigate, location.href]);
  if (loading || !user) return <BlobState kind="loading" title="Wobbling in…" />;
  return <Outlet />;
}
