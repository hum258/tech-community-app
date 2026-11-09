# Automatic free verification

The platform grants a badge automatically when an account is created:
- Personal account: blue badge.
- Company or organization account: silver badge.
- Always free. No application, review queue, waiting period, subscription, or payment.

## Configure Supabase

1. Open the Supabase dashboard for this project.
2. Open **SQL Editor**.
3. Run `supabase/migrations/0001_verification_system.sql` for a fresh project.
4. If the earlier request-based migration was already run, run `supabase/migrations/0002_automatic_verification.sql` instead. It removes the old request queue and converts existing profiles to automatic verification.

The Auth user-created trigger assigns the account type from registration metadata and marks the profile verified immediately. The client cannot change its own account type or verification fields.

## Badge appearance

The app should display the blue badge for `account_type = 'personal'` and the silver badge for `account_type = 'company'`, once a profile is loaded from Supabase.

## Important

The migration files are committed to GitHub but are not automatically executed by Supabase. The SQL must be run in the project's SQL Editor. Do not put any Supabase service-role or secret key in the mobile app or GitHub.
