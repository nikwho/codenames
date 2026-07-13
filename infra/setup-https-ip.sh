#!/usr/bin/env bash
# =============================================================================
# setup-https-ip.sh — obtain a Let's Encrypt certificate for a public IP address
# and enable HTTPS in nginx.
#
# Requires Certbot >= 5.4 (--ip-address + --webroot for IP certs).
# LE IP certificates use the "shortlived" profile (~6 days); renewal is automatic
# via systemd timer + deploy-hook that reloads nginx.
#
# Run as root AFTER bootstrap-vps.sh and at least one successful deploy (so
# nginx serves the app on port 80 and ACME challenges work).
# =============================================================================
set -euo pipefail

APP_NAME="${APP_NAME:-codenames}"
APP_DIR="${APP_DIR:-/var/www/${APP_NAME}}"
DOMAIN="${DOMAIN:-}"
APP_PORT="${APP_PORT:-3001}"
APP_BASE_PATH="${APP_BASE_PATH:-/codenames}"
ACME_WEBROOT="${ACME_WEBROOT:-/var/www/acme}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"
CERTBOT_STAGING="${CERTBOT_STAGING:-0}"

if [[ "${APP_BASE_PATH}" != "/" ]]; then
  APP_BASE_PATH="/${APP_BASE_PATH#/}"
  APP_BASE_PATH="${APP_BASE_PATH%/}"
fi

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

require_certbot_version() {
  local min_major=5
  local min_minor=4
  local version major minor

  if ! command -v certbot >/dev/null 2>&1; then
    return 1
  fi

  version="$(certbot --version 2>&1 | awk '{print $2}')"
  major="${version%%.*}"
  minor="$(echo "${version#*.}" | cut -d. -f1)"
  if (( major > min_major || (major == min_major && minor >= min_minor) )); then
    return 0
  fi
  return 1
}

install_certbot_snap() {
  echo "==> Installing Certbot via snap (need >= 5.4 for IP + webroot)"
  if ! command -v snap >/dev/null 2>&1; then
    echo "ERROR: snap is required to install a recent Certbot." >&2
    exit 1
  fi
  snap install core
  snap refresh core
  snap install --classic certbot
  ln -sf /snap/bin/certbot /usr/bin/certbot
}

echo "==> HTTPS setup for public IP"
echo "    APP_NAME=${APP_NAME}"
echo "    APP_DIR=${APP_DIR}"
echo "    DOMAIN=${DOMAIN:-<missing>}"
echo "    ACME_WEBROOT=${ACME_WEBROOT}"
echo "    CERTBOT_STAGING=${CERTBOT_STAGING}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "ERROR: run as root." >&2
  exit 1
fi

if [[ -z "${DOMAIN}" ]]; then
  echo "ERROR: set DOMAIN to your server's public IP, e.g. DOMAIN=203.0.113.10" >&2
  exit 1
fi

if ! is_ip_address "${DOMAIN}"; then
  echo "ERROR: DOMAIN='${DOMAIN}' does not look like an IP address." >&2
  echo "       For domain names use: certbot --nginx -d your-domain.com" >&2
  exit 1
fi

if [[ -z "${CERTBOT_EMAIL}" ]]; then
  echo "ERROR: set CERTBOT_EMAIL for Let's Encrypt account notifications." >&2
  exit 1
fi

if [[ ! -f "${RENDER_SCRIPT}" ]]; then
  echo "ERROR: render script missing: ${RENDER_SCRIPT}" >&2
  exit 1
fi

if [[ ! -f "${NGINX_SITE}" ]]; then
  echo "ERROR: nginx site missing (${NGINX_SITE}). Run bootstrap-vps.sh first." >&2
  exit 1
fi

mkdir -p "${ACME_WEBROOT}/.well-known/acme-challenge"
chmod -R 755 "${ACME_WEBROOT}"

if ! require_certbot_version; then
  install_certbot_snap
fi
if ! require_certbot_version; then
  echo "ERROR: Certbot $(certbot --version 2>&1) is too old; need >= 5.4." >&2
  exit 1
fi
echo "    certbot $(certbot --version 2>&1 | awk '{print $2}')"

CERTBOT_ARGS=(
  certonly
  --non-interactive
  --agree-tos
  --email "${CERTBOT_EMAIL}"
  --preferred-profile shortlived
  --webroot
  --webroot-path "${ACME_WEBROOT}"
  --ip-address "${DOMAIN}"
  --deploy-hook "nginx -t && systemctl reload nginx"
)

if [[ "${CERTBOT_STAGING}" == "1" ]]; then
  echo "==> Using Let's Encrypt STAGING (untrusted certificate)"
  CERTBOT_ARGS+=(--staging)
fi

echo "==> Requesting certificate for IP ${DOMAIN}"
certbot "${CERTBOT_ARGS[@]}"

SSL_CERT_PATH="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
SSL_KEY_PATH="/etc/letsencrypt/live/${DOMAIN}/privkey.pem"
if [[ ! -f "${SSL_CERT_PATH}" || ! -f "${SSL_KEY_PATH}" ]]; then
  echo "ERROR: certificate files not found under /etc/letsencrypt/live/${DOMAIN}/" >&2
  exit 1
fi

export APP_NAME APP_DIR DOMAIN APP_PORT APP_BASE_PATH ACME_WEBROOT SSL_CERT_PATH SSL_KEY_PATH SSL_MODE=https
bash "${RENDER_SCRIPT}"

ln -sfn "${NGINX_SITE}" "${NGINX_ENABLED}"

echo "==> Testing and reloading nginx"
nginx -t
systemctl reload nginx

SHARED_ENV="${APP_DIR}/shared/.env"
if [[ -f "${SHARED_ENV}" ]]; then
  ORIGIN="https://${DOMAIN}"
  if grep -q '^CLIENT_ORIGIN=' "${SHARED_ENV}"; then
    sed -i "s|^CLIENT_ORIGIN=.*|CLIENT_ORIGIN=${ORIGIN}|" "${SHARED_ENV}"
  else
    echo "CLIENT_ORIGIN=${ORIGIN}" >> "${SHARED_ENV}"
  fi
  echo "==> Updated ${SHARED_ENV}: CLIENT_ORIGIN=${ORIGIN}"
  echo "    Reload the API so CORS picks up the new origin:"
  echo "    su - deploy -c 'cd ${APP_DIR} && pm2 startOrReload ecosystem.config.cjs --update-env && pm2 save'"
fi

echo
echo "==> HTTPS enabled for https://${DOMAIN}${APP_BASE_PATH}/"
echo "    Certificate lifetime is ~6 days; certbot.timer renews automatically."
echo "    Test: curl -fsS https://${DOMAIN}${APP_BASE_PATH}/api/health"
if [[ "${CERTBOT_STAGING}" == "1" ]]; then
  echo "    STAGING cert is not browser-trusted — re-run without CERTBOT_STAGING=1 for production."
fi
