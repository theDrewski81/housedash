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

## 2. User setup (optional)

Kiosk works **without manual user setup**. On first kiosk login with a valid token, a minimal kiosk user is created automatically. The dashboard shows shared household data when `household_user_id` is set in Admin Settings; otherwise it shows the kiosk user's data (empty until an admin adds content).

**Optional – link kiosk to an existing user:** If you want the kiosk to sign in as a specific account (e.g. the main household account), set that user's `kiosk_token` to match `KIOSK_TOKEN`. The auto-created user is then unused.

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

**Reserved:** The email `kiosk@household.local` is reserved for the auto-created kiosk user. Do not create a normal user with this email.

## 3. Use kiosk on the tablet

- **First time:** On the tablet, open:  
  `https://your-app-url/login?kiosk=YOUR_KIOSK_TOKEN`  
  (Replace `YOUR_KIOSK_TOKEN` with the value from `.env`.)  
  The app will sign in and redirect to the dashboard. The token is stored on the tablet for next time.
- **Later:** Open `https://your-app-url/login` on the same tablet; if the stored token is still present, it will sign in automatically.

### Full-screen kiosk (no browser tabs or URL bar)

To run the dashboard in full-screen kiosk style (no browser chrome):

1. On the tablet, open the app in the browser and sign in with kiosk (or go to the login URL with `?kiosk=...`).
2. **Install the app** so it opens in its own window:
   - **Chrome (Android):** Menu → “Install app” or “Add to Home screen”.
   - **Safari (iOS):** Share → “Add to Home Screen”.
   - **Edge (Windows):** Menu → “Apps” → “Install this site as an app”.
3. Open the app from the home screen (or Start menu). It will open in **fullscreen** with no tabs or URL bar.

Optional: add `public/icon-192.png` and `public/icon-512.png` for a proper install icon; otherwise the browser may use a default.

**Security:** Use `KIOSK_TOKEN` only in `.env`; never commit it. Only use the `?kiosk=...` URL on the tablet. Phones do not use kiosk and always see the normal Google sign-in.

## Tablet vs phone

| Device   | Login experience |
|----------|-------------------|
| Tablet   | Google sign-in **or** kiosk (`?kiosk=TOKEN` / stored token). |
| Phone    | Google sign-in only (standard mobile web); kiosk is hidden and ignored. |

Tablet is detected by viewport width ≥ 768px. Resizing a desktop browser above/below that will show or hide the kiosk hint.
