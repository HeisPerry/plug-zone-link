import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { rememberReferral } from "@/hooks/useAffiliate";

export const Route = createFileRoute("/join")({
  ssr: false,
  validateSearch: z.object({ ref: z.string().max(12).optional() }),
  head: () => ({
    meta: [
      { title: "Join PlugZone" },
      { name: "description", content: "You've been invited to PlugZone. Create an account to start buying and selling directly." },
      { property: "og:title", content: "Join PlugZone" },
      { property: "og:description", content: "You've been invited to PlugZone." },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  const { ref } = Route.useSearch();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (ref) {
        const code = ref.toUpperCase();
        const { data } = await supabase.rpc("record_affiliate_click", { p_code: code });
        if (!cancelled) rememberReferral(code, data ?? null);
      }
      if (!cancelled) navigate({ to: "/signup", search: { ref: ref?.toUpperCase() }, replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [ref, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-[15px] text-muted-foreground">Taking you to sign up…</p>
    </div>
  );
}
