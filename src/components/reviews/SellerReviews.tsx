import { useState } from "react";
import { Avatar } from "@/components/shared/Avatar";
import { EmptyState } from "@/components/shared/EmptyState";
import { ListSkeleton } from "@/components/shared/SkeletonLoader";
import { useToast } from "@/components/shared/Toast";
import { Stars, StarPicker } from "./Stars";
import { useReviewableOrders, useSellerReviews, useSubmitReview } from "@/hooks/useReviews";
import { formatDate } from "@/lib/utils";

export function SellerReviews({ sellerId, sellerName, isMe }: { sellerId: string; sellerName: string; isMe: boolean }) {
  const reviews = useSellerReviews(sellerId);
  const reviewable = useReviewableOrders(isMe ? null : sellerId);
  const submit = useSubmitReview();
  const toast = useToast();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const pending = reviewable.data?.[0];

  return (
    <section className="mt-10">
      <h2 className="text-xl">Reviews</h2>

      {pending && (
        <div className="panel mt-4 p-5">
          <p className="text-[15px] font-medium">Rate your order with {sellerName}</p>
          <p className="mt-1 text-sm text-muted-foreground">Only buyers with a completed order can leave a review.</p>
          <div className="mt-3">
            <StarPicker value={rating} onChange={setRating} disabled={submit.isPending} />
          </div>
          <textarea
            className="input mt-3 min-h-24"
            placeholder="How was the item and the seller? (optional)"
            value={comment}
            maxLength={600}
            onChange={(e) => setComment(e.target.value)}
          />
          <button
            className="btn btn-primary mt-3"
            disabled={submit.isPending}
            onClick={() =>
              submit.mutate(
                { orderId: pending.id, adId: pending.ad_id, sellerId, rating, comment },
                {
                  onSuccess: () => {
                    toast.success("Review posted");
                    setComment("");
                    setRating(5);
                  },
                  onError: (e) => toast.error(e.message),
                },
              )
            }
          >
            Post Review
          </button>
        </div>
      )}

      <div className="mt-4">
        {reviews.isLoading ? (
          <ListSkeleton rows={2} />
        ) : !reviews.data?.length ? (
          <EmptyState title="No reviews yet" body={isMe ? "Reviews appear here once buyers complete orders with you." : `${sellerName} has not been reviewed yet.`} />
        ) : (
          <ul className="divide-y border-y">
            {reviews.data.map((r) => (
              <li key={r.id} className="flex gap-3 py-4">
                <Avatar name={r.reviewer.display_name} username={r.reviewer.username} src={r.reviewer.avatar_url} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-medium">{r.reviewer.display_name}</span>
                    <Stars value={r.rating} size={14} />
                    <span className="text-sm text-muted-foreground">{formatDate(r.created_at)}</span>
                  </div>
                  {r.comment && <p className="mt-1 text-[15px]">{r.comment}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
