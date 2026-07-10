#!/usr/bin/env bash
# =============================================================================
# bootstrap-vps.sh — one-time VPS preparation (run as root on Ubuntu 22.04/24.04)
#
# Does NOT clone the app repo, deploy code, or write real secrets.
# Safe to re-run for nginx/user directory repair; will not overwrite existing .env
# or wipe releases under APP_DIR.
# =============================================================================
set -euo pipefail

# ----- configurable parameters (override via environment) --------------------
APP_NAME="${APP_NAME:-codenames}"
APP_USER="${APP_USER:-deploy}"
APP_DIR="${APP_DIR:-/var/www/${APP_NAME}}"
DOMAIN="${DOMAIN:-example.com}"
ACME_WEBROOT="${ACME_WEBROOT:-/var/www/acme}"
NODE_MAJOR="${NODE_MAJOR:-22}"
APP_PORT="${APP_PORT:-3001}"

# Vite frontend build directory relative to a release root
FRONTEND_DIST_REL="${FRONTEND_DIST_REL:-client/dist}"
FRONTEND_DIST_PATH="${APP_DIR}/current/${FRONTEND_DIST_REL}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RENDER_SCRIPT="${SCRIPT_DIR}/render-nginx.sh"
NGINX_SITE="/etc/nginx/sites-available/${APP_NAME}"
NGINX_ENABLED="/etc/nginx/sites-enabled/${APP_NAME}"

is_ip_address() {
  local host="$1"
  if [[ "${host}" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
    return 0
  fi
  if [[ "${host}" == *:* ]]; then
    return 0
  fi
  return 1
}

echo "==> Bootstrap starting"
echo "    APP_NAME=${APP_NAME}"
echo "    APP_USER=${APP_USER}"
echo "    APP_DIR=${APP_DIR}"
echo "    DOMAIN=${DOMAIN}"
echo "    NODE_MAJOR=${NODE_MAJOR}"
echo "    APP_PORT=${APP_PORT}"
echo "    FRONTEND_DIST_PATH=${FRONTEND_DIST_PATH}"
echo "    ACME_WEBROOT=${ACME_WEBROOT}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "ERROR: run this script as root (ssh root@server)." >&2
  exit 1
fi

if [[ ! -f /etc/os-release ]]; then
  echo "ERROR: /etc/os-release not found; unsupported OS." >&2
  exit 1
fi
# shellcheck source=/dev/null
. /etc/os-release
if [[ "${ID:-}" != "ubuntu" ]]; then
  echo "ERROR: only Ubuntu is supported (found ID=${ID:-unknown})." >&2
  exit 1
fi
case "${VERSION_ID:-}" in
  22.04|24.04) ;;
  *)
    echo "WARNING: tested on Ubuntu 22.04/24.04; this host reports ${VERSION_ID:-unknown}."
    ;;
esac

if [[ ! -f "${RENDER_SCRIPT}" ]]; then
  echo "ERROR: render script missing: ${RENDER_SCRIPT}" >&2
  exit 1
fi

if is_ip_address "${DOMAIN}"; then
  PUBLIC_SCHEME="http"
  USE_IP_HTTPS=1
else
  PUBLIC_SCHEME="https"
  USE_IP_HTTPS=0
fi

echo "==> Updating apt packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

echo "==> Installing base packages"
apt-get install -y \
  git \
  curl \
  nginx \
  ufw \
  fail2ban \
  build-essential \
  ca-certificates \
  gnupg \
  unzip \
  rsync

echo "==> Installing Node.js ${NODE_MAJOR}.x"
if command -v node >/dev/null 2>&1; then
  echo "    Node already present: $(node -v)"
else
  mkdir -p /etc/apt/keyrings
  curl -fsSL "https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key" \
    | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" \
    > /etc/apt/sources.list.d/nodesource.list
  apt-get update -y
  apt-get install -y nodejs
fi
echo "    node=$(node -v) npm=$(npm -v)"

echo "==> Installing PM2 globally"
npm install -g pm2

echo "==> Ensuring system user '${APP_USER}'"
if id "${APP_USER}" >/dev/null 2>&1; then
  echo "    User ${APP_USER} already exists"
else
  # Dangerous action: creating a new login user
  useradd --create-home --shell /bin/bash "${APP_USER}"
  echo "    Created user ${APP_USER}"
fi

echo "==> Creating application directories (will not delete existing releases)"
mkdir -p \
  "${APP_DIR}/releases" \
  "${APP_DIR}/shared/logs" \
  "${APP_DIR}/shared" \
  "${ACME_WEBROOT}/.well-known/acme-challenge"
chmod -R 755 "${ACME_WEBROOT}"

if [[ ! -f "${APP_DIR}/shared/.env" ]]; then
  echo "==> Creating placeholder shared/.env (edit before first deploy)"
  cat > "${APP_DIR}/shared/.env" <<EOF
# Production environment for ${APP_NAME}
# Edit this file: sudo nano ${APP_DIR}/shared/.env
# Do NOT commit real secrets to git.

NODE_ENV=production
PORT=${APP_PORT}

# Must match the public site origin served by nginx (scheme + host, no trailing slash)
# For IP deploys: use http until setup-https-ip.sh finishes, then https.
CLIENT_ORIGIN=${PUBLIC_SCHEME}://${DOMAIN}
EOF
  chmod 640 "${APP_DIR}/shared/.env"
else
  echo "==> Preserving existing ${APP_DIR}/shared/.env (not overwritten)"
fi

echo "==> Installing helper scripts into ${APP_DIR}"
install -m 755 "${SCRIPT_DIR}/deploy.sh" "${APP_DIR}/deploy.sh"
install -m 755 "${SCRIPT_DIR}/rollback.sh" "${APP_DIR}/rollback.sh"
for tpl in nginx.conf.template nginx.ssl.conf.template nginx.app.conf.template; do
  install -m 644 "${SCRIPT_DIR}/${tpl}" "${APP_DIR}/${tpl}"
done
install -m 755 "${SCRIPT_DIR}/render-nginx.sh" "${APP_DIR}/render-nginx.sh"
install -m 755 "${SCRIPT_DIR}/setup-https-ip.sh" "${APP_DIR}/setup-https-ip.sh"

echo "==> Setting ownership on ${APP_DIR}"
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"

echo "==> Allowing ${APP_USER} limited sudo for nginx reload"
SUDOERS_FILE="/etc/sudoers.d/${APP_USER}-nginx"
cat > "${SUDOERS_FILE}" <<EOF
# Managed by ${APP_NAME} bootstrap — nginx check/reload only
${APP_USER} ALL=(root) NOPASSWD: /usr/sbin/nginx -t, /bin/systemctl reload nginx, /usr/bin/systemctl reload nginx
EOF
chmod 440 "${SUDOERS_FILE}"
visudo -cf "${SUDOERS_FILE}"

echo "==> Configuring UFW (OpenSSH + Nginx Full)"
ufw allow OpenSSH
ufw allow 'Nginx Full'
# Dangerous action: enabling firewall. Existing SSH session should remain allowed.
ufw --force enable
ufw status

echo "==> Enabling fail2ban"
systemctl enable --now fail2ban

echo "==> Generating nginx site from template"
export APP_NAME APP_DIR DOMAIN APP_PORT ACME_WEBROOT FRONTEND_DIST_PATH SSL_MODE=http
bash "${RENDER_SCRIPT}"

if [[ -L /etc/nginx/sites-enabled/default ]] || [[ -f /etc/nginx/sites-enabled/default ]]; then
  echo "==> Removing nginx default site"
  rm -f /etc/nginx/sites-enabled/default
fi

ln -sfn "${NGINX_SITE}" "${NGINX_ENABLED}"

echo "==> Testing and reloading nginx"
nginx -t
systemctl enable nginx
systemctl reload nginx

echo
echo "==> Bootstrap complete"
echo "Next steps:"
echo "  1) Edit env:   sudo nano ${APP_DIR}/shared/.env"
echo "  2) SSH key:    set up deploy key for user ${APP_USER} (see infra/README.md)"
echo "  3) Deploy:     su - ${APP_USER} -c 'REPO=git@github.com:USER/REPO.git BRANCH=main bash ${APP_DIR}/deploy.sh'"
if [[ "${USE_IP_HTTPS}" -eq 1 ]]; then
  echo "  4) HTTPS (IP): CERTBOT_EMAIL=you@example.com DOMAIN=${DOMAIN} bash ${APP_DIR}/setup-https-ip.sh"
  echo "               (after first deploy; needs Certbot >= 5.4 — see infra/README.md)"
else
  echo "  4) HTTPS:      sudo certbot --nginx -d ${DOMAIN}   (after DNS points here)"
fi
echo
echo "Note: until the first successful deploy, ${FRONTEND_DIST_PATH} will not exist yet;"
echo "nginx may 404 static files until current/ is created."
