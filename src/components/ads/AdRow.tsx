import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { Ad } from "@/lib/types";
import { formatDate, formatPrice } from "@/lib/utils";
import { CategoryBadge, StatusBadge } from "@/components/shared/StatusBadge";

export function AdRow({ ad, actions, showStatus = true }: { ad: Ad; actions?: ReactNode; showStatus?: boolean }) {
  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:gap-4">
      <Link to="/ad/$adId" params={{ adId: ad.id }} className="flex min-w-0 flex-1 items-center gap-4">
        {ad.images[0] ? (
          <img src={ad.images[0]} alt="" className="h-16 w-16 shrink-0 rounded-md border object-cover" loading="lazy" />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border bg-muted text-[11px] text-muted-foreground">No photo</div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{ad.title}</p>
          <p className="text-[15px] text-primary">{formatPrice(ad.price, ad.currency)}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <CategoryBadge>{ad.subcategory ?? ad.category}</CategoryBadge>
            {showStatus && <StatusBadge status={ad.status} />}
            <span className="text-sm text-muted-foreground">{formatDate(ad.created_at)}</span>
          </div>
        </div>
      </Link>
      {actions && <div className="flex flex-wrap gap-2 sm:shrink-0">{actions}</div>}
    </li>
  );
}
