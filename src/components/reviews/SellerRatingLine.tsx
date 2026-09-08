import { Stars } from "./Stars";
import { TrustBadge } from "@/components/trust/TrustBadge";
import { useSellerStats } from "@/hooks/useReviews";

export function SellerRatingLine({ sellerId }: { sellerId: string }) {
  const { data } = useSellerStats(sellerId);
  const rating = Number(data?.avg_rating ?? 0) || 0;
  const reviews = Number(data?.review_count ?? 0);
  const sales = Number(data?.completed_orders ?? 0);

  return (
    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
      <Stars value={rating} size={14} />
      <span className="font-medium">{reviews ? rating.toFixed(1) : "New seller"}</span>
      <span className="text-muted-foreground">
        {reviews ? `${reviews} review${reviews === 1 ? "" : "s"}` : "No reviews yet"} · {sales} sales
      </span>
      <TrustBadge sellerId={sellerId} />
    </div>
  );
}
