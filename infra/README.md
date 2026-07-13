# Infrastructure: Ubuntu VPS deploy (no Docker)

Bash-based release flow for this monorepo:

| Path | Role |
|------|------|
| `client/` | React + Vite frontend → build to `client/dist` |
| `server/` | Express + Socket.IO backend → build to `server/dist/index.js` |
| `shared/` | TypeScript package compiled for Node |

**Public URL:** the production client is built with Vite `base: /codenames/`. Nginx serves the app at `https://YOUR_DOMAIN/codenames/`. Local `npm run dev` still uses `/` (no prefix).

Layout on the server:

```text
/var/www/codenames/
  current -> releases/YYYYMMDD_HHMMSS
  releases/
  shared/.env
  shared/logs/
  deploy.sh
  rollback.sh
  setup-nginx.sh
  render-nginx.sh
  ...
```

## Prerequisites

- Fresh Ubuntu **22.04** or **24.04** VPS
- Git repository accessible via SSH from the VPS `deploy` user
- **With a domain:** DNS A/AAAA record pointing at the VPS (for `certbot --nginx`)
- **IP only (no domain):** public IPv4 or IPv6; HTTPS via Let's Encrypt IP certificates (see §8b)

## 1. Prepare the VPS (once, as root)

Copy this repo to the server temporarily (or clone it once as root), then:

```bash
ssh root@server
cd /path/to/codenames   # directory that contains infra/
# Domain (app at https://partyprotocol.ru/codenames/):
APP_NAME=codenames DOMAIN=partyprotocol.ru bash infra/bootstrap-vps.sh
# Or public IP only:
APP_NAME=codenames DOMAIN=203.0.113.10 bash infra/bootstrap-vps.sh
```

Useful overrides:

```bash
APP_NAME=codenames \
APP_USER=deploy \
APP_DIR=/var/www/codenames \
DOMAIN=partyprotocol.ru \
APP_BASE_PATH=/codenames \
NODE_MAJOR=22 \
APP_PORT=3001 \
bash infra/bootstrap-vps.sh
```

What bootstrap does:

- installs Node.js, nginx, UFW, fail2ban, PM2
- creates `deploy` user and `/var/www/codenames/{releases,shared,shared/logs}`
- writes a **placeholder** `shared/.env` only if missing
- installs nginx via `setup-nginx.sh` (app under `APP_BASE_PATH`, default `/codenames`)
- does **not** clone production code or overwrite secrets / releases

### Nginx only (refresh / shared vhost)

```bash
# Full site for this domain (default):
DOMAIN=partyprotocol.ru bash /var/www/codenames/setup-nginx.sh

# Only write the app snippet to include in an existing server { } block:
DOMAIN=partyprotocol.ru MODE=snippet bash /var/www/codenames/setup-nginx.sh
# then add:  include /etc/nginx/snippets/codenames-app.conf;
```

## 2. Configure environment

```bash
sudo nano /var/www/codenames/shared/.env
```

Expected keys (example):

```bash
NODE_ENV=production
PORT=3001
CLIENT_ORIGIN=https://partyprotocol.ru
```

`CLIENT_ORIGIN` must match the public site **origin** (scheme + host, **no** `/codenames` path). Used for Express CORS and Socket.IO CORS.

The deploy script symlinks this file to `$RELEASE/server/.env`. Real secrets must never be committed to git (`.env` is already gitignored).

## 3. SSH deploy key for Git

On the VPS as `deploy`:

```bash
ssh deploy@server
# or, once DNS points here:
ssh deploy@partyprotocol.ru
ssh-keygen -t ed25519 -C "codenames-deploy" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```

Add the public key:

- **GitHub**: repo → Settings → Deploy keys → Allow read access  
- or as a read-only machine user / SSH key with repo access

Test:

```bash
ssh -T git@github.com
```

## 4. Deploy a release

```bash
ssh deploy@server
REPO=git@github.com:nikwho/codenames.git BRANCH=main bash /var/www/codenames/deploy.sh
```

Or from a checked-out copy of `infra/deploy.sh` on the server (bootstrap already installs it under `APP_DIR`).

Overrides:

```bash
APP_NAME=codenames \
APP_DIR=/var/www/codenames \
REPO=git@github.com:USER/REPO.git \
BRANCH=main \
KEEP_RELEASES=5 \
bash /var/www/codenames/deploy.sh
```

Deploy flow:

1. Create `releases/YYYYMMDD_HHMMSS`
2. `git clone --depth 1`
3. `npm ci` (workspaces root)
4. Build `shared` → `server` → `client` (client with `base: /codenames/`)
5. Symlink `shared/.env` → `server/.env`
6. Atomically point `current` at the new release
7. `pm2 startOrReload ecosystem.config.cjs --update-env`
8. `pm2 save`, nginx test + reload
9. Prune old releases (keep `KEEP_RELEASES`)

If build fails **before** switching `current`, production stays on the last good release.

## 5. Rollback

```bash
ssh deploy@server
bash /var/www/codenames/rollback.sh
```

Switches `current` to the newest release that is not the current one, then reloads PM2 and nginx. Exits with an error if fewer than two releases exist.

## 6. Logs

```bash
pm2 status
pm2 logs codenames-api
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

Per-domain nginx logs (from template): `/var/log/nginx/your-domain.com.access.log` and `.error.log`.

## 7. Health check

Backend (direct / via nginx):

```bash
curl http://127.0.0.1:3001/api/health
curl https://partyprotocol.ru/codenames/api/health
# IP-only:
curl https://203.0.113.10/codenames/api/health
```

Expected JSON shape:

```json
{ "ok": true, "uptime": "12s", "time": "2026-07-08T09:00:00.000Z" }
```

## 8. HTTPS

### 8a. Domain (DNS → VPS)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d partyprotocol.ru
```

Certbot will extend the nginx site for TLS. If locations under `/codenames` look wrong after certbot, re-apply:

```bash
DOMAIN=partyprotocol.ru \
SSL_MODE=https \
SSL_CERT_PATH=/etc/letsencrypt/live/partyprotocol.ru/fullchain.pem \
SSL_KEY_PATH=/etc/letsencrypt/live/partyprotocol.ru/privkey.pem \
bash /var/www/codenames/setup-nginx.sh
```

### 8b. Public IP only (no domain)

Let's Encrypt issues **trusted** certificates for public IP addresses (IPv4/IPv6) via the **shortlived** profile (~6 days). Certbot **≥ 5.4** is required; `certbot --nginx` does **not** support IP certs yet — use `infra/setup-https-ip.sh`.

**Order matters:**

1. Bootstrap with your public IP as `DOMAIN`
2. First deploy (app must be served on HTTP port 80)
3. Run HTTPS setup as root

```bash
# 1. Bootstrap (root)
APP_NAME=codenames DOMAIN=203.0.113.10 bash infra/bootstrap-vps.sh

# 2. Deploy (deploy user) — see §4
REPO=git@github.com:USER/REPO.git BRANCH=main bash /var/www/codenames/deploy.sh

# 3. HTTPS (root) — test with staging first if you like
CERTBOT_STAGING=1 CERTBOT_EMAIL=you@example.com DOMAIN=203.0.113.10 \
  bash /var/www/codenames/setup-https-ip.sh

# Production certificate (browser-trusted):
CERTBOT_EMAIL=you@example.com DOMAIN=203.0.113.10 \
  bash /var/www/codenames/setup-https-ip.sh

# 4. Reload API so CORS matches https://
su - deploy -c 'cd /var/www/codenames && pm2 startOrReload ecosystem.config.cjs --update-env && pm2 save'
```

`setup-https-ip.sh` will:

- install Certbot via snap if the system package is too old
- obtain a certificate with `--webroot` + `--ip-address` + `--preferred-profile shortlived`
- switch nginx to HTTP (ACME + redirect) + HTTPS (app under `/codenames`)
- set `CLIENT_ORIGIN=https://YOUR_IP` in `shared/.env`

Renewal is handled by `certbot.timer` (twice daily). A deploy-hook reloads nginx after each renewal.

**Notes:**

- Until step 3 completes, use `CLIENT_ORIGIN=http://YOUR_IP` (bootstrap sets this for IP hosts).
- Certificate lifetime is ~6 days (LE policy for IP addresses).
- `curl https://YOUR_IP/codenames/api/health` should work without `-k` after a production cert is issued.

## 9. End-to-end flow

```text
local fix → git commit → git push
  → ssh deploy@partyprotocol.ru
  → REPO=... BRANCH=main bash /var/www/codenames/deploy.sh
  → curl https://partyprotocol.ru/codenames/api/health + pm2 logs
  → bash /var/www/codenames/rollback.sh   # if needed
```

## Nginx routing

| Location | Target |
|----------|--------|
| `/` | redirect → `/codenames/` |
| `/codenames/` | static React from `current/client/dist` (SPA fallback) |
| `/codenames/api/` | `http://127.0.0.1:3001/api/` |
| `/codenames/socket.io/` | same backend `/socket.io/` with WebSocket upgrade |
| `/codenames/health` | proxied `GET /api/health` |

PM2 runs **one** fork instance (`codenames-api`) — required for Socket.IO without sticky sessions.

Override mount path with `APP_BASE_PATH` (must match Vite `base` in production; default `/codenames`).

## Project paths used by scripts (verify if you rename packages)

| Item | Value |
|------|------|
| Frontend app | `client/` |
| Frontend build out | `client/dist` |
| Frontend Vite base (prod) | `/codenames/` |
| Backend app | `server/` |
| Backend entry | `server/dist/index.js` (`npm start` → `node dist/index.js`) |
| Shared package | `shared/` (must build before server) |
| Socket.IO path (Node) | `/socket.io/` |
| Socket.IO path (browser prod) | `/codenames/socket.io` |
| Health (Node) | `GET /api/health` (also `/health`) |
| Health (public) | `GET /codenames/api/health` |

Frontend Socket.IO client connects to the **same origin** in production (`path: "/codenames/socket.io"`). For local Vite (`npm run dev`) it still uses `http://localhost:3001` and `path: "/socket.io"`. Override with `VITE_SERVER_URL` if needed.
