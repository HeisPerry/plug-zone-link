import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserActiveAds } from "@/hooks/useAds";
import { useFriendGraph } from "@/hooks/useFriends";
import { useStartConversation } from "@/hooks/useMessages";
import { PublicHeader } from "@/components/layout/PageLayout";
import { Avatar } from "@/components/shared/Avatar";
import { AdRow } from "@/components/ads/AdRow";
import { Skeleton, ListSkeleton } from "@/components/shared/SkeletonLoader";
import { EmptyState } from "@/components/shared/EmptyState";
import { RelationshipButton } from "./_authenticated/friends";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/shared/Toast";

export const Route = createFileRoute("/user/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — PlugZone` },
      { name: "description", content: `See @${params.username}'s active ads and profile on PlugZone.` },
      { property: "og:title", content: `@${params.username} on PlugZone` },
      { property: "og:description", content: `See @${params.username}'s active ads and profile.` },
    ],
  }),
  component: UserProfilePage,
});

function useProfileByUsername(username: string) {
  return useQuery({
    queryKey: ["profile", username.toLowerCase()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, bio, created_at")
        .eq("username", username.toLowerCase())
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { data: stats } = await supabase.rpc("get_profile_stats", { p_user: data.id });
      return { ...data, stats: stats?.[0] ?? { ads_count: 0, completed_orders: 0, referrals: 0 } };
    },
  });
}

function UserProfilePage() {
  const { username } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: p, isLoading } = useProfileByUsername(username);
  const ads = useUserActiveAds(p?.id);
  const graph = useFriendGraph();
  const start = useStartConversation();
  const isMe = !!user && p?.id === user.id;

  const headerRight = user ? (
    <Link to="/dashboard" className="btn btn-secondary btn-sm">
      Dashboard
    </Link>
  ) : (
    <Link to="/signup" className="btn btn-primary btn-sm">
      Create Account
    </Link>
  );

  return (
    <div className="min-h-screen">
      <PublicHeader right={headerRight} />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
        {isLoading ? (
          <div className="flex gap-5">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-80" />
            </div>
          </div>
        ) : !p ? (
          <div className="py-16">
            <h1 className="text-2xl">No one goes by @{username}</h1>
            <p className="mt-2 text-[15px] text-muted-foreground">Check the spelling or search from your Friends page.</p>
          </div>
        ) : (
          <>
            <section className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <Avatar name={p.display_name} username={p.username} src={p.avatar_url} size={80} />
              <div className="min-w-0 flex-1">
                <h1 className="text-[28px] sm:text-[34px]">{p.display_name}</h1>
                <p className="text-[15px] text-muted-foreground">@{p.username}</p>
                {p.bio && <p className="mt-3 max-w-xl text-[15px]">{p.bio}</p>}
                <p className="mt-2 text-sm text-muted-foreground">Member since {formatDate(p.created_at)}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                {isMe ? (
                  <Link to="/settings" className="btn btn-secondary">
                    Edit Profile
                  </Link>
                ) : user ? (
                  <>
                    {graph.data && <RelationshipButton rel={graph.data.relationshipWith(p.id)} userId={p.id} className="btn" />}
                    <button
                      className="btn btn-secondary"
                      disabled={start.isPending}
                      onClick={() => start.mutate(p.id, { onSuccess: (cid) => navigate({ to: "/messages", search: { c: cid } }), onError: (e) => toast.error(e.message) })}
                    >
                      Send Message
                    </button>
                  </>
                ) : (
                  <Link to="/login" className="btn btn-secondary">
                    Sign in to message
                  </Link>
                )}
              </div>
            </section>

            <dl className="mt-8 flex gap-8 border-y py-5">
              {[
                { l: "Ads posted", v: p.stats.ads_count },
                { l: "Completed orders", v: p.stats.completed_orders },
                { l: "Referrals", v: p.stats.referrals },
              ].map((s) => (
                <div key={s.l}>
                  <dd className="font-heading text-2xl font-bold">{Number(s.v)}</dd>
                  <dt className="text-sm text-muted-foreground">{s.l}</dt>
                </div>
              ))}
            </dl>

            <section className="mt-10">
              <h2 className="text-xl">Active ads</h2>
              <div className="mt-3">
                {ads.isLoading ? (
                  <ListSkeleton rows={3} />
                ) : !ads.data?.length ? (
                  <EmptyState title={isMe ? "You have no active ads" : `${p.display_name} has no active ads`} body={isMe ? "Post an ad and it will show up here." : "Check back later."} />
                ) : (
                  <ul className="divide-y border-y">
                    {ads.data.map((ad) => (
                      <AdRow key={ad.id} ad={ad} showStatus={false} />
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
