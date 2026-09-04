import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import type { AdWithSeller } from "@/lib/types";
import { formatPrice, timeAgo } from "@/lib/utils";
import { CategoryBadge } from "@/components/shared/StatusBadge";

export function FeedCard({ ad }: { ad: AdWithSeller }) {
  return (
    <li className="panel flex flex-col overflow-hidden transition-colors hover:border-primary">
      <Link to="/ad/$adId" params={{ adId: ad.id }} className="block">
        {ad.images[0] ? (
          <img src={ad.images[0]} alt={ad.title} className="aspect-[4/3] w-full border-b object-cover" loading="lazy" />
        ) : (
          <div className="flex aspect-[4/3] w-full items-center justify-center border-b bg-muted text-sm text-muted-foreground">No photo</div>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link to="/ad/$adId" params={{ adId: ad.id }} className="line-clamp-2 font-medium hover:text-primary">
          {ad.title}
        </Link>
        <p className="mt-1 font-heading text-lg font-bold text-primary">{formatPrice(ad.price, ad.currency)}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <CategoryBadge>{ad.category}</CategoryBadge>
          {ad.location && (
            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin size={14} aria-hidden="true" />
              {ad.location}
            </span>
          )}
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-sm text-muted-foreground">
          <Link to="/user/$username" params={{ username: ad.seller.username }} className="truncate hover:text-primary">
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
    <li className="panel overflow-hidden" aria-hidden="true">
      <div className="skeleton aspect-[4/3] w-full rounded-none" />
      <div className="space-y-2 p-4">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-5 w-1/3" />
        <div className="skeleton h-3 w-1/2" />
      </div>
    </li>
  );
}
