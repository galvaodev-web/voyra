# Voyra Web 1.0 production checklist

## Database

- [ ] Take a PostgreSQL backup and record the migration version.
- [ ] Apply Travel migrations through `20260918_web_1_0.sql`, then all Social migrations.
- [ ] Run `npm run test:db` and the Social RLS suite against the release commit.
- [ ] Verify RLS remains enabled and `service_role` is server-only.

## Auth

- [ ] Use the same Supabase project for Travel and Social.
- [ ] Configure both callback URLs, confirmation email and password recovery.
- [ ] Enable Google only after OAuth verification.
- [ ] Set `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN=.voyra.com` only on controlled HTTPS subdomains.
- [ ] Smoke-test login, refresh, logout and recovery across both subdomains.

## Storage

- [ ] Keep `travel-documents`, `social-images`, `social-videos` and `avatars` private.
- [ ] Confirm MIME and size limits and test signed URL expiry.
- [ ] Run storage and account cleanup crons with `CRON_SECRET`.

## Stripe

- [ ] Configure live products/prices, portal and the signed webhook.
- [ ] Test checkout, cancellation, replay and out-of-order events.
- [ ] Confirm account deletion cancels the Stripe customer before Auth deletion.

## Marketplace

- [ ] Add the approved partner identifier and verify generated attribution links.
- [ ] Keep the intermediation disclosure visible.
- [ ] Reconcile only trusted partner callbacks/reports; a click remains `CLICKED`.

## Domains And Email

- [ ] Configure `voyra.com`, `social.voyra.com`, TLS, DNS and canonical site URLs.
- [ ] Configure Supabase SMTP and optional Resend alert delivery.
- [ ] Validate SPF, DKIM, DMARC and password-recovery delivery.

## Legal And Monitoring

- [ ] Publish reviewed Terms, Privacy, support contact and legal entity details.
- [ ] Configure `SENTRY_DSN` and optional consent-gated PostHog.
- [ ] Monitor `/api/health`, cron failures, Stripe webhooks and deletion jobs.

## Backups And Staging

- [ ] Complete [backup and restore](docs/BACKUP_RESTORE.md) in an isolated project.
- [ ] Complete [staging validation](docs/STAGING.md) with two real test users.
- [ ] Record rollback owner, release SHA and database restore point.

## Smoke Tests

- [ ] Signup -> Social onboarding -> feed -> add place -> open Travel.
- [ ] Search -> select -> create trip with preserved search context.
- [ ] Marketplace referral -> approved partner redirect and disclosure.
- [ ] Complete eligible trip -> Tokens -> Passport -> Recap -> Social share.
- [ ] Import a public route as another user without private creator data.
- [ ] Export and delete a disposable account; verify Storage and Auth cleanup.
