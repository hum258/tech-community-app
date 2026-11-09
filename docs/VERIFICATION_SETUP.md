# Real verification setup

The product policy is **free verification**:
- Personal accounts: blue check badge.
- Company/organization accounts: silver check badge.
- No payment, subscription, or paid badge tier.
- A badge is displayed only when the server-side profile status is `approved`.

## 1. Create the backend
Create a Supabase project, then open **SQL Editor** and run:
`supabase/migrations/0001_verification_system.sql`

This creates profiles, verification requests, the account type, approval state, row-level security, and a profile creation trigger.

## 2. Deploy the review endpoint
Install the Supabase CLI, log in, link the project, then deploy:
```bash
supabase functions deploy review-verification
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```
Supabase provides `SUPABASE_URL` and `SUPABASE_ANON_KEY` to Edge Functions. If your project does not inject them automatically, set them as function secrets too.

**Never put the service-role key in the mobile app or GitHub.**

## 3. Grant admin access
Use Supabase Auth user management to assign `app_metadata.role = "admin"` to the trusted administrator account. Do not use editable user metadata for this role. Only that server-controlled role can call the review endpoint.

## 4. Review flow
1. A signed-in member submits a verification request.
2. The request is stored as `pending`; the member can read only their own request.
3. An administrator checks the account and supporting public evidence.
4. The admin endpoint approves or rejects it.
5. Approval updates the profile status and timestamp. The client must render the blue/silver badge from the approved profile state, never from a local toggle.

## 5. Suggested review criteria
- Personal: genuine, complete professional profile and a consistent history of useful participation. Do not request government identity documents from minors.
- Company: verifiable organization website or official-domain email and a clear relationship between the applicant and organization. Do not publish private documents.
- Verification is not an endorsement of every post or service.

## Current implementation status
The database migration and protected admin review Edge Function are committed. The current Expo screens still show a **design preview**, and the app is not yet connected to a Supabase project. Live requests, live badges, Google sign-in, and the admin dashboard will work only after project credentials are configured and the client integration is completed. No service-role secret is stored in this repository.
