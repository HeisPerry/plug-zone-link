import {
  MessageSquare,
  Tag,
  CheckCircle2,
  XCircle,
  Repeat,
  UserPlus,
  UserCheck,
  Package,
  ShoppingBag,
  Clock,
  Star,
  BadgeCheck,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  RotateCcw,
  Wallet,
  Bell,
  type LucideIcon,
} from "lucide-react";
import type { PushCategory } from "./types";

export const NOTIFICATION_TYPES: Record<string, { label: string; icon: LucideIcon; category: PushCategory }> = {
  new_message: { label: "New message", icon: MessageSquare, category: "messages" },
  new_offer: { label: "New offer", icon: Tag, category: "offers" },
  offer_accepted: { label: "Offer accepted", icon: CheckCircle2, category: "offers" },
  offer_rejected: { label: "Offer declined", icon: XCircle, category: "offers" },
  counter_offer: { label: "Counter offer", icon: Repeat, category: "offers" },
  offer_expired: { label: "Offer expired", icon: Clock, category: "offers" },
  new_follower: { label: "New follower", icon: UserPlus, category: "friends" },
  friend_request: { label: "Friend request", icon: UserPlus, category: "friends" },
  friend_request_accepted: { label: "Friend request accepted", icon: UserCheck, category: "friends" },
  friend_new_ad: { label: "New ad from a friend", icon: Package, category: "activity" },
  new_order: { label: "New order", icon: ShoppingBag, category: "orders" },
  order_status: { label: "Order update", icon: ShoppingBag, category: "orders" },
  ad_expiring: { label: "Ad expiring soon", icon: Clock, category: "activity" },
  review_received: { label: "Review received", icon: Star, category: "activity" },
  seller_verification: { label: "Seller verification", icon: BadgeCheck, category: "activity" },
  payment_received: { label: "Payment received", icon: ArrowDownLeft, category: "payments" },
  payment_sent: { label: "Payment sent", icon: ArrowUpRight, category: "payments" },
  payment_status: { label: "Payment update", icon: CreditCard, category: "payments" },
  refund_dispute: { label: "Refund or dispute", icon: RotateCcw, category: "payments" },
  wallet: { label: "Wallet", icon: Wallet, category: "payments" },
  other: { label: "Marketplace activity", icon: Bell, category: "activity" },
};

export const PUSH_CATEGORIES: { key: PushCategory; label: string }[] = [
  { key: "messages", label: "Messages" },
  { key: "offers", label: "Offers and counter-offers" },
  { key: "orders", label: "Orders" },
  { key: "friends", label: "Friend requests" },
  { key: "payments", label: "Payments, refunds and wallet" },
  { key: "activity", label: "Other marketplace activity" },
];

export function notificationMeta(type: string) {
  return NOTIFICATION_TYPES[type] ?? NOTIFICATION_TYPES["other"]!;
}
