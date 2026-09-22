# Backup and restore runbook

Voyra Travel and Social share one Supabase project. Treat PostgreSQL, Auth metadata and private Storage as one recovery set. Stripe and external providers are not restored from the database.

## Backup

1. Put release metadata in the incident record: environment, UTC time, Git SHA and last applied migration.
2. Create an encrypted PostgreSQL custom-format backup from a trusted runner:

   ```bash
   pg_dump --format=custom --no-owner --no-acl --file=voyra.dump "$DATABASE_URL"
   pg_restore --list voyra.dump > voyra-manifest.txt
   ```

3. Export a Storage inventory for every private bucket, including object name, size, MIME and creation time. Download objects through a server-side job using the service key; encrypt the archive at rest.
4. Store the dump, manifest, Storage archive and checksums in a separate account/region with retention and access logging.
5. Never put database URLs, JWTs, service keys, documents or backups in Git or CI artifacts.

## Restore Test

1. Create an isolated Supabase/staging project with no production callbacks.
2. Restore the database:

   ```bash
   createdb voyra_restore_test
   pg_restore --clean --if-exists --no-owner --no-acl --dbname="$RESTORE_DATABASE_URL" voyra.dump
   ```

3. Recreate private buckets and upload the Storage archive with the original object paths.
4. Apply only migrations newer than the backup. Never apply the base migration or consolidated `schema.sql` over an existing restore.
5. Configure temporary server secrets, expose the `social` schema, and run database/RLS tests plus the staging smoke tests.
6. Verify counts for users, trips, posts, tokens, passports, referrals and Storage objects. Open sampled signed URLs with disposable test identities.
7. Destroy the restore environment and record recovery time and discrepancies.

## Production Recovery

Freeze writes, capture a final forensic backup, select the last known-good restore point and restore into a new project/database when possible. Rotate service keys after recovery, update runtime secrets, then reopen traffic after smoke tests.

Stripe remains the source of truth for subscriptions and payments. After a database restore, replay signed Stripe events or run the existing reconciliation path; do not manufacture paid status. Partner referral/commission reconciliation must likewise use trusted partner reports.

For deploy-only regressions, roll back the application to the previous immutable build. Do not roll back a database migration by deleting columns unless a reviewed down migration and fresh backup exist.
