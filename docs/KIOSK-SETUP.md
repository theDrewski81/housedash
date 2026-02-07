# Kiosk mode setup (tablet only)

Kiosk mode lets a tablet open the dashboard without signing in with Google. Phones always get the standard mobile web (Google sign-in only).

## 1. Add `KIOSK_TOKEN` to `.env`

Generate a secret token and set it in `.env`:

**PowerShell:**
```powershell
# Generate (copy the output into .env as KIOSK_TOKEN=...)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```
Or use OpenSSL if available: `openssl rand -hex 32`

Then in `.env`:
```env
KIOSK_TOKEN=<paste-the-generated-token-here>
```

## 2. Link a user to the token

The tablet will sign in as an existing user whose `kioskToken` matches `KIOSK_TOKEN`.

**Option A – Prisma Studio**

1. Run `npm run db:studio`.
2. Open the `users` table.
3. Find the user that should be the “kiosk” account (e.g. the main household account).
4. Set `kiosk_token` to the same value as `KIOSK_TOKEN` in `.env`. Save.

**Option B – SQL**

```sql
UPDATE users SET kiosk_token = 'YOUR_KIOSK_TOKEN_VALUE' WHERE email = 'your@email.com';
```

Use the exact same string as in `.env` for `KIOSK_TOKEN`.

## 3. Use kiosk on the tablet

- **First time:** On the tablet, open:  
  `https://your-app-url/login?kiosk=YOUR_KIOSK_TOKEN`  
  (Replace `YOUR_KIOSK_TOKEN` with the value from `.env`.)  
  The app will sign in and redirect to the dashboard. The token is stored on the tablet for next time.
- **Later:** Open `https://your-app-url/login` on the same tablet; if the stored token is still present, it will sign in automatically.

**Security:** Use `KIOSK_TOKEN` only in `.env`; never commit it. Only use the `?kiosk=...` URL on the tablet. Phones do not use kiosk and always see the normal Google sign-in.

## Tablet vs phone

| Device   | Login experience |
|----------|-------------------|
| Tablet   | Google sign-in **or** kiosk (`?kiosk=TOKEN` / stored token). |
| Phone    | Google sign-in only (standard mobile web); kiosk is hidden and ignored. |

Tablet is detected by viewport width ≥ 768px. Resizing a desktop browser above/below that will show or hide the kiosk hint.
