import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import type { AdWithSeller } from "@/lib/types";
import { formatPrice, timeAgo } from "@/lib/utils";
import { CategoryBadge } from "@/components/shared/StatusBadge";

export function FeedCard({ ad }: { ad: AdWithSeller }) {
  return (
    <li className="market-card">
      <Link to="/ad/$adId" params={{ adId: ad.id }} className="block">
        {ad.images[0] ? (
          <img src={ad.images[0]} alt={ad.title} className="market-card-image" loading="lazy" />
        ) : (
          <div className="market-card-image flex items-center justify-center bg-muted text-sm text-muted-foreground">No photo</div>
        )}
      </Link>
      <div className="market-card-body">
        <Link to="/ad/$adId" params={{ adId: ad.id }} className="market-card-title hover:text-primary">
          {ad.title}
        </Link>
        <p className="market-card-price">{formatPrice(ad.price, ad.currency)}</p>
        <div className="market-card-meta">
          <CategoryBadge>{ad.category}</CategoryBadge>
          {ad.location && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin size={12} aria-hidden="true" />
              {ad.location}
            </span>
          )}
        </div>
        <div className="market-card-footer">
          <Link to="/user/$username" params={{ username: ad.seller.username }} className="truncate font-medium hover:text-primary">
            @{ad.seller.username}
          </Link>
          <span className="shrink-0">{timeAgo(ad.created_at)}</span>
        </div>
      </div>
    </li>
  );
}

export function FeedCardSkeleton() {
  return (
    <li className="market-card" aria-hidden="true">
      <div className="skeleton market-card-image" />
      <div className="market-card-body space-y-2">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-5 w-1/3" />
        <div className="skeleton h-3 w-1/2" />
      </div>
    </li>
  );
}
