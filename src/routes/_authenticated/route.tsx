import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/layout/PageLayout";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Local session read (no network round trip) — RLS still verifies the token on every query.
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) throw redirect({ to: "/login" });
    return { user: data.session.user };
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
