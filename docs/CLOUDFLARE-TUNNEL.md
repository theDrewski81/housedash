# Cloudflare Tunnel (502 fix)

A **502 Bad Gateway** from Cloudflare usually means the tunnel cannot reach your app, or the app rejects/redirects in a way Cloudflare treats as a bad gateway. Use the steps below to fix it.

## 1. Tunnel ingress (most common 502 cause)

`cloudflared` must connect to the **same host/port** where the app is reachable from the process running `cloudflared`.

- **cloudflared on the same VM as the app (Docker on that VM)**  
  Point the tunnel at the **host** port that maps to the app (e.g. `3000` if you use `ports: "3000:3000"`):

  ```yaml
  ingress:
    - hostname: your-tunnel-hostname.example.com
      service: http://localhost:3000
    - service: http_status:404
  ```

- **cloudflared in Docker on the same host as the app container**  
  Use the Docker service name and **internal** port (e.g. `http://housedash-app:3000`), or use the host’s gateway IP and the **published** port (e.g. `http://172.17.0.1:3000` on Linux). Prefer the service name if both are on the same Compose network.

- **cloudflared on another machine**  
  Use the VM’s LAN IP and the port where the app is exposed (e.g. `http://192.168.1.10:3000`). Ensure the VM firewall allows that port from the machine running `cloudflared`.

Check: from the **same environment** where `cloudflared` runs, `curl http://<origin>/api/health` (using the same host/port as in your config) should return 200.

## 2. App must listen on all interfaces

The app must bind to `0.0.0.0` so the tunnel (or Docker network) can reach it. This repo’s Dockerfile already sets `HOSTNAME="0.0.0.0"`. If you run Next.js directly (e.g. `next start`), use:

```bash
next start -H 0.0.0.0 -p 3000
```

(or set `HOSTNAME=0.0.0.0` in the environment).

## 3. NEXTAUTH_URL = public URL

NextAuth and OAuth callbacks must use the **public** URL that users (and Cloudflare) use to reach the app.

- In **.env** (and in Docker/env for the app container), set:

  ```env
  NEXTAUTH_URL=https://your-tunnel-hostname.example.com
  ```

  Use the exact host (and path, if any) that Cloudflare shows in the browser. No trailing slash.

- **Do not** use `http://localhost:3000` or the VM’s private IP for `NEXTAUTH_URL` when accessing the app through the tunnel.

- Optional: if OAuth still fails with `?error=OAuthCallback` after the above, set `AUTH_TRUST_HOST=1` so NextAuth v4 builds the callback origin from `X-Forwarded-Host` / `X-Forwarded-Proto` (Cloudflare Tunnel usually sends these). Only use this if those headers are correct.

## 4. Google OAuth redirect URI

In [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → your OAuth 2.0 Client ID → Authorized redirect URIs, add:

```text
https://your-tunnel-hostname.example.com/api/auth/callback/google
```

Must match your public URL exactly (protocol, host, path).

---

## Verify

1. **Origin reachable**: From the machine/container where `cloudflared` runs:  
   `curl -s -o /dev/null -w "%{http_code}" http://<origin>/api/health` → `200`.
2. **Tunnel**: Open `https://your-tunnel-hostname.example.com/api/health` in a browser → 200 or JSON.
3. **Login**: Open `https://your-tunnel-hostname.example.com/login` and sign in with Google; no 502 on callback.
4. **Cloudflare dashboard**: Zero Trust → Tunnels → your tunnel → check for connection/errors.

If 502 persists, check `cloudflared` logs for “connection refused” or “dial” errors and confirm the host/port in `ingress` matches the environment where `cloudflared` runs.
