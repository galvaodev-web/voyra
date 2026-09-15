# Voyra — Production runbook

This release is designed for a real Next.js runtime with Supabase and keeps two revenue lanes: recurring subscriptions (Stripe) and partner intermediation (Voyra Marketplace).

## 1. Database

Use the same Supabase project for Voyra Travel and Voyra Social.

For a new environment, apply the Travel base first, then the launch and marketplace migrations, and only after that apply the Social migrations from the `voyra-social` repository:

1. `supabase/schema.sql`
2. `supabase/migrations/20260911_launch.sql`
3. `supabase/migrations/20260912_marketplace.sql`
4. `supabase/migrations/20260915_price_engine.sql`
5. Voyra Social migrations in filename order

Never disable RLS to fix integration errors.

## 2. Runtime and domains

Deploy Travel to an HTTPS origin such as `https://voyra.com` and Social to `https://social.voyra.com` using a Node-compatible Next.js host.

Set `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN=.voyra.com` in both products only after both HTTPS subdomains are controlled by the same operator. Keep it empty on localhost.

## 3. Subscriptions

Configure Stripe live credentials, monthly BRL prices and the webhook described in `docs/LAUNCH.md`. The existing Plus and Creator subscriptions remain the recurring SaaS revenue stream.

## 4. Voyra Marketplace / intermediation

The Marketplace starts the search inside Voyra and creates a server-side referral ledger before redirecting the traveler to the approved booking partner. Voyra is not the merchant of record in this release.

Set `SKYSCANNER_MEDIA_PARTNER_ID` only with the identifier assigned to the Voyra affiliate/partner account. The generated referral sends a unique `subid2`, allowing partner attribution to be reconciled back to `partner_referrals`.

The partner remains responsible for final inventory, price confirmation, ticket/reservation issuance, changes, cancellation and refund. Voyra must keep the disclosure visible to users. Do not claim that a booking is complete until the partner confirms it.

`commission_events` is the internal financial ledger for confirmed partner reporting. Do not invent commission values from clicks; ingest only values confirmed by the partner/affiliate reporting channel.

## 5. Price Engine and search

`POST /api/travel/search` is the server boundary for budget discovery. It validates input, rate limits callers, ranks normalized options and persists authenticated searches atomically. The internal catalog is always returned as `ESTIMATED`; only provider responses with live primary components may be returned as `LIVE`.

The migration creates `travel_searches`, `search_preferences`, `provider_results`, `offers`, `price_snapshots`, `price_alerts`, `notification_preferences`, `provider_health` and `analytics_events`. Estimated catalog values are never written to `price_snapshots`. Configure `RATE_LIMIT_SECRET` with at least 32 random bytes; identifiers are HMAC-pseudonymized before storage.

## 6. Social integration

Travel exposes bearer-authenticated, privacy-safe endpoints under `/social` for:

- listing the current user's usable trips;
- adding a Social discovery to an itinerary idempotently;
- publishing a sanitized trip projection;
- importing a public community route;
- listing and summarizing completed trips for Passport/Recap.

Voyra Social must point `VOYRA_TRAVEL_API_URL` at this Travel origin. Both applications must use the same Supabase Auth project.

## 7. Launch gate

Populate `.env.local`/host secrets and run:

```bash
npm ci
npm run lint
npm run typecheck
npm run test:unit
npm run test:db
npm run test:billing
npm run build
npm test
npm run check:launch
npm run check:launch -- --remote
```

The remote launch check validates the production database objects, Stripe products/portal/webhook, and required marketplace configuration without printing secrets.
