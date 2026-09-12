# PlugZone V2 roadmap

Order approved by user ("money first"). Check in after each stage.

- [x] Stage 1 — Advanced escrow (done; auto-release later disabled per user: hold until buyer confirms or admin settles)
- [x] Stage 2 — Coupons (done: seller + platform coupons, /coupons page, admin tab, checkout validation, redemptions)
- [x] Stage 3 — Affiliate commissions + referral rewards (done: reward_entries ledger, separate affiliate/referral balances + payouts, /affiliate page, admin-tunable rates, self-referral guard)
- [x] Stage 4 — Seller trust scores (done: get_seller_trust RPC, tier badge + /100 breakdown on profile and ad pages, admin-tunable weights and tier thresholds)
- [ ] Stage 5 — Seller subscriptions + promoted listings (paid from wallet balance)
- [ ] Stage 6 — Seller + admin analytics with date filters
- [ ] Stage 7 — Chat upgrades: block/report, admin moderation
- [ ] Admin V2 control center tabs for each of the above

# Migration off Supabase (auth stays put for now)

Decisions: recreate the ~60 SQL routines in Neon, start with an empty database (no data copy), uploads + polling first.

- [x] Step 1 — Realtime → polling (messages 5s/15s, notifications 20s, presence 30s heartbeat window)
- [x] Step 2 — Storage → UploadThing (server-side `uploadFile`, scoped by verified user id; ads, avatars, chat attachments)
- [ ] Step 2b — Verify a real upload end-to-end (needs a signed-in test account)
- [x] Step 3 — Neon schema applied (28 tables, all routines, triggers, indexes; auth.users mirror + auth.uid() from `app.user_id`)
- [x] Step 4 — All SQL routines ported into Neon; platform settings + owner admin email seeded
- [x] Step 5 — All data reads/writes go through `src/lib/db.ts` → server → Neon, with per-table access rules in `src/lib/data-policy.server.ts` replacing RLS
- [ ] Step 6 — Watch in real use, then remove /supabase (auth still lives there)
- [ ] Typing indicator: currently disabled (no live channel); restore later if wanted
- [ ] Rotate the Neon password (it was pasted in chat)

Verified end to end on Neon: sign-up creates the account record and profile, signed-in
pages (dashboard, orders, wallet, messages, notifications, settings) load, and saving a
profile writes back. Admin and trust-score screens use the same path.
