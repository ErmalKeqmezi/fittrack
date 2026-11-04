# Deploying FitTrack

FitTrack runs on **Vercel** (Next.js) with a hosted **Supabase** project (Postgres + Auth).
Both have free tiers that are enough for one person. Allow about 20 minutes.

## 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com). Pick the region closest to you and
   save the database password somewhere safe.
2. From the repository, link the project and apply the migrations:

   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npm run db:push
   ```

   This creates all tables, constraints, Row Level Security policies, functions and the built-in
   exercise library. Re-run `npm run db:push` whenever a new migration is added.
3. **Authentication → Sign In / Providers → Email**
   - Keep **Confirm email** on.
   - Minimum password length **10**, password requirements **lowercase, uppercase and digits**.
4. **Authentication → URL Configuration**
   - Site URL: `https://<your-domain>`
   - Redirect URLs: `https://<your-domain>/auth/confirm`
5. **Authentication → Email Templates → Confirm signup**: set the button link to

   ```
   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard
   ```

6. **Project Settings → API Keys**: copy the **Project URL** and the **publishable key**
   (`sb_publishable_…`). Do **not** copy the secret key; FitTrack never uses it.

## 2. Vercel project

1. Import the Git repository in Vercel (framework preset: Next.js). Node.js **22.x**.
2. Add the environment variables (Production and Preview):

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL from step 1.6 |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key from step 1.6 |
   | `NEXT_PUBLIC_SITE_URL` | `https://<your-domain>` (no trailing slash) |

3. Deploy. Optionally add a custom domain, then update `NEXT_PUBLIC_SITE_URL` and the Supabase
   URL configuration to match, and redeploy.

## 3. First run

1. Open `https://<your-domain>/setup`, create your account and confirm the email.
2. In Supabase, **Authentication → Sign In / Providers**, turn **off "Allow new users to sign up"**.
   The database allows at most two accounts, so leave this off or a stranger could claim the second one.
3. Install the app:
   - **iPhone (Safari):** Share → *Add to Home Screen*.
   - **Android (Chrome):** menu → *Install app*.
   - **Desktop (Chrome/Edge):** install icon in the address bar.
4. **Optional second account:** in Supabase, **Authentication → Users → Add user → Create new user**.
   Enter the email and a password and tick **Auto Confirm User**. The person signs in at `/login` and
   sets their name and timezone in Settings. Their data is private to their account.

## Pre-release checklist

Run locally before pushing a release:

```bash
npm run lint && npm run typecheck && npm test
```

```bash
npm run db:reset && npm run test:db && npm run db:reset
```

```bash
npm run test:e2e
```

- [ ] New migrations applied with `npm run db:push` **before** deploying code that needs them.
- [ ] `npm run db:types` re-run after schema changes, and the result committed.
- [ ] No secret or service-role key in any `NEXT_PUBLIC_*` variable or in the repository.
- [ ] After deploying: sign in, start a workout, log a set, finish it, and check History.

## Backups and rollback

- Supabase takes daily backups on paid plans. On the free plan, export regularly:
  `npx supabase db dump --data-only -f backup.sql` (requires the database password).
- Roll back the app from the Vercel dashboard (*Deployments → Promote* an earlier deployment).
  Migrations are additive; if a migration must be undone, write a new migration that reverses it
  rather than editing an applied one.

## Offline behaviour

The service worker (`public/sw.js`, production builds only) caches the app shell and the pages
you have opened. A workout in progress keeps every change in an on-device draft and syncs when
the connection returns. Signing out clears the offline caches. Bump `VERSION` in `public/sw.js`
to force all clients to drop old caches.
