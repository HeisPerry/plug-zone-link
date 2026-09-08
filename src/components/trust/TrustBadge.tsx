import { ShieldCheck } from "lucide-react";
import { useSellerTrust } from "@/hooks/useTrust";
import { cn } from "@/lib/utils";

/** Small tier pill with the score out of 100. */
export function TrustBadge({ sellerId, className }: { sellerId: string; className?: string }) {
  const { data } = useSellerTrust(sellerId);
  if (!data) return null;
  return (
    <span className={cn("pill", data.tier === "New" && "pill-muted", "gap-1.5 text-xs", className)}>
      <ShieldCheck size={13} aria-hidden="true" />
      {data.tier} · {data.score}/100
    </span>
  );
}

/** Full breakdown card shown on a seller's profile. */
export function TrustPanel({ sellerId, isMe, name }: { sellerId: string; isMe: boolean; name: string }) {
  const { data } = useSellerTrust(sellerId);
  if (!data) return null;

  const rows = [
    { label: "Completed sales", points: data.salesPoints, max: data.maxSales, detail: `${data.completedOrders} completed` },
    { label: "Buyer ratings", points: data.ratingPoints, max: data.maxRating, detail: data.reviewCount ? `${data.avgRating.toFixed(1)} from ${data.reviewCount} review${data.reviewCount === 1 ? "" : "s"}` : "No reviews yet" },
    { label: "Orders seen through", points: data.completionPoints, max: data.maxCompletion, detail: data.totalOrders ? `${data.completedOrders} of ${data.totalOrders} orders` : "No orders yet" },
    { label: "Clean record", points: data.disputePoints, max: data.maxDisputes, detail: data.disputes ? `${data.disputes} problem${data.disputes === 1 ? "" : "s"} reported` : "No problems reported" },
  ];

  return (
    <section className="mt-10">
      <h2 className="text-xl">Trust score</h2>
      <div className="panel mt-4 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="icon-tile h-11 w-11 rounded-2xl">
            <ShieldCheck size={18} />
          </span>
          <div>
            <p className="font-heading text-[24px] font-extrabold leading-none">{data.score}/100</p>
            <p className="mt-1 text-sm text-muted-foreground">{data.tier} seller</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {isMe ? "Your score grows as you complete more orders and earn good ratings." : `How ${name} has performed on PlugZone so far.`}
        </p>
        <ul className="mt-4 space-y-3">
          {rows.map((r) => (
            <li key={r.label}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium">{r.label}</span>
                <span className="text-muted-foreground">
                  {r.points} / {r.max}
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${r.max ? Math.min((r.points / r.max) * 100, 100) : 0}%` }} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{r.detail}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
