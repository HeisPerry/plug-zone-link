/**
 * Access rules for every table the app reads or writes.
 *
 * These mirror, one for one, the row-level rules the database used to enforce
 * on its own. Each entry returns a SQL condition that is ANDed into the
 * caller's query, so a request can only ever touch rows that belong to them
 * (or anything, when they are an admin).
 */

export type Ctx = { userId: string | null; isAdmin: boolean };
export type Bind = (value: unknown) => string;

type Values = Record<string, unknown>;

export type TableRules = {
  select?: (c: Ctx, b: Bind) => string | null;
  update?: (c: Ctx, b: Bind) => string | null;
  delete?: (c: Ctx, b: Bind) => string | null;
  /** Boolean SQL expression evaluated before the row is written. */
  insert?: (c: Ctx, b: Bind, v: Values) => string | null;
  /** Columns forced onto an inserted row, whatever the browser sent. */
  force?: (c: Ctx) => Values;
  /** Columns the browser is allowed to set on insert/update. */
  writable?: string[];
};

const me = (c: Ctx, b: Bind) => (c.userId ? b(c.userId) : "null");
const adm = (c: Ctx) => (c.isAdmin ? "true" : "false");
const signedIn = (c: Ctx) => (c.userId ? "true" : "false");

const orderParty = (c: Ctx, b: Bind, col: string) =>
  `(exists (select 1 from public.orders o where o.id = t.${col} and (o.buyer_id = ${me(c, b)} or o.seller_id = ${me(c, b)})) or ${adm(c)})`;

export const RULES: Record<string, TableRules> = {
  ads: {
    select: (c, b) => `(t.status = 'active' or t.seller_id = ${me(c, b)} or ${adm(c)})`,
    insert: (c) => (c.userId ? "true" : null),
    force: (c) => ({ seller_id: c.userId }),
    update: (c, b) => `(t.seller_id = ${me(c, b)} or ${adm(c)})`,
    delete: (c, b) => `t.seller_id = ${me(c, b)}`,
    writable: [
      "title", "description", "price", "currency", "category", "subcategory",
      "images", "status", "location", "details", "updated_at",
    ],
  },

  profiles: {
    select: () => "true",
    update: (c, b) => `t.id = ${me(c, b)}`,
    writable: [
      "username", "display_name", "bio", "avatar_url", "phone_number",
      "notification_prefs", "show_last_seen",
    ],
  },

  orders: {
    select: (c, b) => `(t.buyer_id = ${me(c, b)} or t.seller_id = ${me(c, b)} or ${adm(c)})`,
    insert: (c, b, v) =>
      c.userId ? `${b(v["buyer_id"])} = ${me(c, b)} and ${b(v["buyer_id"])} <> ${b(v["seller_id"])}` : null,
    update: (c) => (c.isAdmin ? "true" : null),
  },

  order_events: { select: (c, b) => orderParty(c, b, "order_id") },
  escrow_ledger: { select: (c, b) => orderParty(c, b, "order_id") },

  transactions: {
    select: (c, b) => `(t.payer_id = ${me(c, b)} or t.payee_id = ${me(c, b)})`,
  },

  conversations: {
    select: (c, b) => `(t.participant_one = ${me(c, b)} or t.participant_two = ${me(c, b)})`,
  },

  messages: {
    select: (c, b) => `(t.sender_id = ${me(c, b)} or t.receiver_id = ${me(c, b)})`,
    insert: (c, b, v) =>
      c.userId
        ? `${b(v["sender_id"])} = ${me(c, b)} and exists (select 1 from public.conversations c where c.id = ${b(v["conversation_id"])} and ((c.participant_one = ${b(v["sender_id"])} and c.participant_two = ${b(v["receiver_id"])}) or (c.participant_two = ${b(v["sender_id"])} and c.participant_one = ${b(v["receiver_id"])})))`
        : null,
    update: (c, b) => `t.receiver_id = ${me(c, b)}`,
    writable: ["read", "read_at", "delivered_at"],
  },

  notifications: {
    select: (c, b) => `t.user_id = ${me(c, b)}`,
    update: (c, b) => `t.user_id = ${me(c, b)}`,
    writable: ["read_at"],
  },

  reviews: {
    select: () => "true",
    insert: (c, b, v) =>
      c.userId
        ? `${b(v["reviewer_id"])} = ${me(c, b)} and ${b(v["reviewer_id"])} <> ${b(v["seller_id"])} and exists (select 1 from public.orders o where o.id = ${b(v["order_id"])} and o.buyer_id = ${me(c, b)} and o.seller_id = ${b(v["seller_id"])} and o.status = 'completed')`
        : null,
    update: (c, b) => `t.reviewer_id = ${me(c, b)}`,
    delete: (c, b) => `t.reviewer_id = ${me(c, b)}`,
    writable: ["rating", "comment", "updated_at"],
  },

  coupons: {
    select: (c, b) => `(t.owner_id = ${me(c, b)} or ${adm(c)})`,
    insert: (c, b, v) =>
      c.isAdmin
        ? "true"
        : c.userId
          ? `${b(v["scope"] ?? "seller")} = 'seller' and ${b(v["owner_id"])} = ${me(c, b)} and exists (select 1 from public.seller_profiles sp where sp.user_id = ${me(c, b)} and sp.status = 'active') and (${v["ad_id"] ? `exists (select 1 from public.ads a where a.id = ${b(v["ad_id"])} and a.seller_id = ${me(c, b)})` : "true"})`
          : null,
    update: (c, b) => `(t.owner_id = ${me(c, b)} or ${adm(c)})`,
    delete: (c, b) => `(t.owner_id = ${me(c, b)} or ${adm(c)})`,
    writable: [
      "is_active", "description", "expires_at", "starts_at", "max_uses",
      "per_user_limit", "discount_value", "discount_type", "max_discount",
      "min_order_value", "first_order_only", "category", "ad_id", "updated_at",
    ],
  },

  coupon_redemptions: {
    select: (c, b) => `(t.user_id = ${me(c, b)} or ${adm(c)})`,
  },

  friend_requests: {
    select: (c, b) => `(t.sender_id = ${me(c, b)} or t.receiver_id = ${me(c, b)})`,
    insert: (c, b, v) => (c.userId ? `${b(v["sender_id"])} = ${me(c, b)}` : null),
    update: (c, b) => `t.receiver_id = ${me(c, b)}`,
    delete: (c, b) => `t.sender_id = ${me(c, b)}`,
    writable: ["status"],
  },

  friendships: {
    select: (c, b) => `(t.user_one = ${me(c, b)} or t.user_two = ${me(c, b)})`,
    delete: (c, b) => `(t.user_one = ${me(c, b)} or t.user_two = ${me(c, b)})`,
  },

  data_airtime_orders: {
    select: (c, b) => `t.user_id = ${me(c, b)}`,
    insert: (c, b, v) => (c.userId ? `${b(v["user_id"])} = ${me(c, b)}` : null),
  },

  disputes: {
    select: (c, b) => `(t.buyer_id = ${me(c, b)} or t.seller_id = ${me(c, b)} or ${adm(c)})`,
    update: (c) => (c.isAdmin ? "true" : null),
  },

  dispute_messages: {
    select: (c, b) =>
      `(exists (select 1 from public.disputes d where d.id = t.dispute_id and (d.buyer_id = ${me(c, b)} or d.seller_id = ${me(c, b)})) or ${adm(c)})`,
    insert: (c, b, v) =>
      c.userId
        ? `${b(v["author_id"])} = ${me(c, b)} and (exists (select 1 from public.disputes d where d.id = ${b(v["dispute_id"])} and (d.buyer_id = ${me(c, b)} or d.seller_id = ${me(c, b)})) or ${adm(c)})`
        : null,
  },

  withdrawals: {
    select: (c, b) => `(t.seller_id = ${me(c, b)} or ${adm(c)})`,
    update: (c) => (c.isAdmin ? "true" : null),
  },

  seller_profiles: {
    select: (c, b) => `(t.user_id = ${me(c, b)} or ${adm(c)})`,
    insert: (c, b, v) => (c.userId ? `${b(v["user_id"])} = ${me(c, b)}` : null),
    update: (c, b) => `(t.user_id = ${me(c, b)} or ${adm(c)})`,
    writable: [
      "business_name", "about", "contact_email", "contact_phone",
      "payout_method", "payout_account_name", "payout_bank", "status", "updated_at",
    ],
  },

  platform_settings: {
    select: (c) => signedIn(c),
    update: (c) => (c.isAdmin ? "true" : null),
    insert: (c) => (c.isAdmin ? "true" : null),
  },

  admin_invites: {
    select: (c, b) => `(t.invitee_id = ${me(c, b)} or ${adm(c)})`,
  },

  admin_emails: {
    select: (c) => (c.isAdmin ? "true" : "false"),
  },

  user_roles: {
    select: (c, b) => `(t.user_id = ${me(c, b)} or ${adm(c)})`,
  },

  reward_entries: {
    select: (c, b) => `(t.user_id = ${me(c, b)} or ${adm(c)})`,
  },

  affiliate_clicks: {
    select: (c, b) => `t.affiliate_user_id = ${me(c, b)}`,
  },

  daily_checkins: {
    select: (c, b) => `t.user_id = ${me(c, b)}`,
  },

  negotiations: {
    select: (c, b) => `(t.buyer_id = ${me(c, b)} or t.seller_id = ${me(c, b)} or ${adm(c)})`,
  },
};

/** Relations the browser may pull in alongside a row. */
export const EMBEDS: Record<string, { table: string; localColumn: string; foreignColumn: string }> = {
  "ads.seller": { table: "profiles", localColumn: "seller_id", foreignColumn: "id" },
  "ads.profiles": { table: "profiles", localColumn: "seller_id", foreignColumn: "id" },
  "orders.ad": { table: "ads", localColumn: "ad_id", foreignColumn: "id" },
  "orders.ads": { table: "ads", localColumn: "ad_id", foreignColumn: "id" },
  "orders.buyer": { table: "profiles", localColumn: "buyer_id", foreignColumn: "id" },
  "orders.seller": { table: "profiles", localColumn: "seller_id", foreignColumn: "id" },
  "reviews.reviewer": { table: "profiles", localColumn: "reviewer_id", foreignColumn: "id" },
  "reviews.ad": { table: "ads", localColumn: "ad_id", foreignColumn: "id" },
  "messages.sender": { table: "profiles", localColumn: "sender_id", foreignColumn: "id" },
  "disputes.order": { table: "orders", localColumn: "order_id", foreignColumn: "id" },
  "disputes.buyer": { table: "profiles", localColumn: "buyer_id", foreignColumn: "id" },
  "disputes.seller": { table: "profiles", localColumn: "seller_id", foreignColumn: "id" },
  "dispute_messages.author": { table: "profiles", localColumn: "author_id", foreignColumn: "id" },
  "coupons.ad": { table: "ads", localColumn: "ad_id", foreignColumn: "id" },
  "withdrawals.seller": { table: "profiles", localColumn: "seller_id", foreignColumn: "id" },
  "admin_invites.invitee": { table: "profiles", localColumn: "invitee_id", foreignColumn: "id" },
  "notifications.actor": { table: "profiles", localColumn: "actor_id", foreignColumn: "id" },
  "reward_entries.source": { table: "profiles", localColumn: "source_user_id", foreignColumn: "id" },
};

/** Stored routines the browser may call. Each one checks the caller itself. */
export const ALLOWED_RPCS = new Set([
  "accept_friend_request",
  "admin_overview",
  "admin_settle_order",
  "admin_weekly_stats",
  "auto_release_due_escrows",
  "award_referral_rewards",
  "become_seller",
  "cancel_order",
  "confirm_receipt",
  "coupon_quote",
  "daily_check_in",
  "delete_my_account",
  "display_name_of",
  "expire_stale_negotiations",
  "get_or_create_conversation",
  "get_profile_stats",
  "get_public_stats",
  "get_reward_balances",
  "get_seller_earnings",
  "get_seller_trust",
  "has_role",
  "invite_admin",
  "is_super_admin",
  "is_username_available",
  "list_admins",
  "make_offer",
  "mark_all_notifications_read",
  "mark_messages_delivered",
  "open_dispute",
  "pay_order_test_mode",
  "place_order",
  "record_affiliate_click",
  "remove_admin",
  "request_refund",
  "request_withdrawal",
  "resolve_dispute",
  "respond_admin_invite",
  "respond_refund_request",
  "respond_to_offer",
  "revoke_admin_invite",
  "seller_accept_order",
  "set_order_fulfilment",
  "set_withdrawal_status",
  "touch_last_seen",
  "update_setting",
  "validate_coupon",
  "withdraw_refund_request",
]);
