# Debug Handoff: Sign-In Flow Failures

## Issue Summary

Google OAuth sign-in fails for users. The failure occurs **immediately** or very quickly after clicking "Sign in with Google." Users see one of these messages:

- "Sign-in failed. New accounts may not be accepted at this time. Contact an administrator if you need access."
- "Sign-in failed. Check NEXTAUTH_URL and proxy configuration (see README troubleshooting)."
- "Sign-in failed. Please try again or contact an administrator."

### Expected Behavior

1. **New users** (not in Existing Users list), with "Allow new account sign-ups" checked: should be created with `status: pending_approval` and redirected to `/login/pending` (approval queue).
2. **Manually added users** (in Existing Users list): should sign in successfully and reach `/dashboard`.

### Observed Behavior

- Both new users and manually added users see sign-in errors.
- Error appears immediately or very quickly after clicking the button.
- Admin has "Allow new account sign-ups (new accounts go to approval queue)" checked and saved.

---

## Architecture Overview

- **Auth**: NextAuth v4 with Prisma adapter, database sessions, Google OAuth.
- **Config**: `app_config` table, row `id: "default"`, field `allow_account_creation`.
- **Auth route**: `app/api/auth/[...nextauth]/route.ts` → `lib/auth.ts`.
- **Login page**: `app/login/page.tsx` (custom; `pages.signIn` and `pages.error` both point to `/login`).

### Key Files

| File | Purpose |
|------|---------|
| `lib/auth.ts` | Auth options, custom adapter `createUser` and `getUserByEmail` |
| `lib/app-config.ts` | `getAppConfig()`, `ensureAppConfig()` |
| `app/login/page.tsx` | Login UI, error message display |
| `app/api/admin/users/route.ts` | PATCH saves `allowAccountCreation` to `app_config` |
| `app/dashboard/admin/users/page.tsx` | User management UI, checkbox for allow sign-ups |

---

## Auth Flow (Relevant Parts)

### OAuth Sign-In (NextAuth + Prisma Adapter)

1. User clicks "Sign in with Google" → redirects to Google.
2. Google redirects back to `/api/auth/callback/google`.
3. Adapter: `getUserByAccount(provider, providerAccountId)` → if not found:
4. Adapter: `getUserByEmail(email)` → if not found:
5. Adapter: `createUser(profile)` → our custom logic runs here.
6. Adapter: `linkAccount(accountData)`.
7. Session created, `signIn` callback runs (redirects `pending_approval` users to `/login/pending`).

### Custom `createUser` Logic (`lib/auth.ts`)

- If `userCount === 0`: create first user as admin, upsert `app_config` with `allowAccountCreation: false`.
- If `!config.allowAccountCreation`: throw `ACCOUNT_CREATION_DISABLED` → NextAuth surfaces as error.
- If existing user by email (case-insensitive): return existing user (no create).
- Else: create user with `status: "pending_approval"`.

### Custom `getUserByEmail`

- Uses `findFirst` with `mode: "insensitive"` for case-insensitive email match (manually added users).

---

## Fixes Attempted

### 1. Login Page Error Differentiation

- **Change**: Only show "New accounts may not be accepted" for `error=OAuthCreateAccount` (not all errors).
- **Result**: Users still saw generic or config messages; did not resolve root cause.

### 2. Treat `Callback` as Account-Creation Error

- **Change**: Show "New accounts may not be accepted" for both `OAuthCreateAccount` and `Callback`.
- **Result**: No change in behavior; failure persisted.

### 3. Ensure `app_config` Row Exists

- **Change**: In `getAppConfig()`, when no row exists, call `ensureAppConfig()` to create default row before returning.
- **Rationale**: Avoid `allowAccountCreation` always being `false` when table is empty.
- **Result**: No change in behavior.

### 4. Config-Specific Error Messages

- **Change**: For `OAuthCallback` and `OAuthSignin`, show message about NEXTAUTH_URL and proxy.
- **Result**: User still sees errors; unclear which error code is actually returned.

### 5. Clear Error on Retry

- **Change**: On "Sign in with Google" click, call `router.replace("/login")` before `signIn()` to clear stale `?error=` from URL.
- **Result**: No change in behavior.

---

## NextAuth Error Codes (Sign-In Page)

From NextAuth v4 docs, these can appear as `?error=` on the sign-in page:

| Code | Meaning |
|------|---------|
| `OAuthCreateAccount` | Could not create OAuth user in database |
| `OAuthCallback` | Error handling response from OAuth provider (PKCE, state, cookies) |
| `OAuthSignin` | Error constructing authorization URL |
| `Callback` | General error in OAuth callback handler |
| `OAuthAccountNotLinked` | Email already linked with different OAuth account |
| `Configuration` | Server configuration problem |
| `Default` | Catch-all |

**Unknown**: Which of these the user is actually receiving. The login page shows different messages based on the code, but the underlying failure is not fixed.

---

## Hypotheses to Investigate

1. **`allowAccountCreation` is false in DB**  
   - Admin may not have saved after checking the box, or save may not be persisting.
   - **Check**: `SELECT * FROM app_config WHERE id = 'default';` — verify `allow_account_creation = true`.

2. **NextAuth error occurs before `createUser`**  
   - `OAuthSignin` (URL construction) or `OAuthCallback` (response handling) could fail before the adapter runs.
   - **Check**: Run with `NEXTAUTH_DEBUG=1`, reproduce, inspect `[NextAuth]` logs.

3. **NEXTAUTH_URL / proxy mismatch**  
   - README: `error=Callback` often when `Host` differs from public URL (e.g. internal hostname vs public).
   - **Check**: `NEXTAUTH_URL` matches browser URL; reverse proxy forwards correct `Host`, `X-Forwarded-Proto`, `X-Forwarded-Host`.

4. **Cookie / domain issues**  
   - Cookies set for wrong domain, so not sent when Google redirects back.
   - **Check**: Cookie domain, `secure` flag, `sameSite`; proxy and `NEXTAUTH_URL` consistency.

5. **`getUserByEmail` not used for manually added users**  
   - Adapter flow might differ; manually added users might hit `createUser` instead of `linkAccount`.
   - **Check**: NextAuth v4 Prisma adapter source for exact order of `getUserByEmail` vs `createUser`.

6. **`linkAccount` failing**  
   - Manually added users have `User` but no `Account`; `linkAccount` might fail (schema, constraints, etc.).
   - **Check**: Server logs when a manually added user signs in; Prisma/DB errors.

---

## Recommended Debug Steps

1. **Capture the actual error code**
   - Add temporary logging: `console.log("error param:", searchParams.get("error"))` on the login page, or inspect the URL after redirect (e.g. `/login?error=???`).

2. **Enable NextAuth debug**
   - Set `NEXTAUTH_DEBUG=1` in `.env`, restart, reproduce, and inspect `[NextAuth]` logs for the real error.

3. **Verify `app_config`**
   - Query: `SELECT id, allow_account_creation FROM app_config WHERE id = 'default';`
   - Confirm admin has clicked Save after enabling checkbox.

4. **Verify NEXTAUTH_URL and proxy**
   - `NEXTAUTH_URL` must match the URL used in the browser.
   - If behind a proxy, ensure `Host`, `X-Forwarded-Proto`, `X-Forwarded-Host` are correct (see README).

5. **Trace adapter calls**
   - Add logging in `lib/auth.ts` in `createUser` and `getUserByEmail` (e.g. log when each is called and with what arguments).
   - Confirm whether `createUser` is reached and whether `getAppConfig().allowAccountCreation` is true.

6. **Test in isolation**
   - Local dev: `NEXTAUTH_URL=http://localhost:3000`, no proxy.
   - Compare behavior with production to narrow down proxy/config vs adapter logic.

---

## Environment / Stack

- Next.js 15, NextAuth 4.24, @next-auth/prisma-adapter 1.0.7
- PostgreSQL (Prisma)
- Optional: Docker, reverse proxy (e.g. nginx, Caddy, Cloudflare Tunnel)
- README: `docs/KIOSK-SETUP.md`, main README "Troubleshooting: login sends me back to the login screen"
