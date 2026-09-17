# Voyra ecosystem staging

Provision Travel and Social against one dedicated Supabase staging project and separate Vercel projects on HTTPS. Apply this repository's schema and migrations first, then every Social migration in filename order. Use Stripe test mode and synthetic accounts only.

Set the same Supabase URL/anon key and `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN=.voyra.com` in both products only when both staging hosts are trusted subdomains. Point Social `VOYRA_TRAVEL_API_URL` to the Travel staging origin. Keep video disabled.

Run the local and remote launch checks in both repositories, then execute the full acceptance list in `voyra-social/docs/STAGING.md`. The required gate covers Auth lifecycle, two-account RLS isolation, shared session, Storage, Stripe, Discover to trip creation, Social imports, Passport/Recap, moderation, export and ecosystem deletion.

Before promotion, record both commit SHAs, migration versions, Vercel deployment IDs, Stripe webhook endpoint and Supabase backup timestamp. Roll back application code by redeploying the prior immutable commit. Correct database changes with a forward migration; restore into an isolated project first when recovery from backup is unavoidable.
