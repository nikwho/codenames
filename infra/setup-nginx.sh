#!/usr/bin/env bash
# =============================================================================
# setup-nginx.sh — configure nginx for the app under APP_BASE_PATH on DOMAIN.
#
# Run as root on the VPS (after bootstrap, or anytime to refresh nginx config).
#
# Modes:
#   MODE=site     (default) — full site under sites-available + enable + reload
#   MODE=snippet  — only write /etc/nginx/snippets/<app>-app.conf for an
#                   existing server block (e.g. shared partyprotocol.ru vhost)
#
# Examples:
#   DOMAIN=partyprotocol.ru bash /var/www/codenames/setup-nginx.sh
#   DOMAIN=partyprotocol.ru APP_BASE_PATH=/codenames MODE=snippet bash setup-nginx.sh
#   DOMAIN=partyprotocol.ru SSL_MODE=https \
#     SSL_CERT_PATH=/etc/letsencrypt/live/partyprotocol.ru/fullchain.pem \
#     SSL_KEY_PATH=/etc/letsencrypt/live/partyprotocol.ru/privkey.pem \
#     bash setup-nginx.sh
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

APP_NAME="${APP_NAME:-codenames}"
APP_DIR="${APP_DIR:-/var/www/${APP_NAME}}"
DOMAIN="${DOMAIN:-}"
APP_PORT="${APP_PORT:-3001}"
APP_BASE_PATH="${APP_BASE_PATH:-/codenames}"
ACME_WEBROOT="${ACME_WEBROOT:-/var/www/acme}"
FRONTEND_DIST_REL="${FRONTEND_DIST_REL:-client/dist}"
FRONTEND_DIST_PATH="${FRONTEND_DIST_PATH:-${APP_DIR}/current/${FRONTEND_DIST_REL}}"
MODE="${MODE:-site}"
SSL_MODE="${SSL_MODE:-http}"
NGINX_SITE="/etc/nginx/sites-available/${APP_NAME}"
NGINX_ENABLED="/etc/nginx/sites-enabled/${APP_NAME}"
NGINX_APP_SNIPPET="/etc/nginx/snippets/${APP_NAME}-app.conf"
RENDER_SCRIPT="${SCRIPT_DIR}/render-nginx.sh"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "ERROR: run as root (sudo bash setup-nginx.sh)." >&2
  exit 1
fi

if [[ -z "${DOMAIN}" ]]; then
  echo "ERROR: set DOMAIN, e.g. DOMAIN=partyprotocol.ru" >&2
  exit 1
fi

if [[ ! -f "${RENDER_SCRIPT}" ]]; then
  echo "ERROR: render script missing: ${RENDER_SCRIPT}" >&2
  exit 1
fi

# Normalize base path
if [[ "${APP_BASE_PATH}" != "/" ]]; then
  APP_BASE_PATH="/${APP_BASE_PATH#/}"
  APP_BASE_PATH="${APP_BASE_PATH%/}"
fi

echo "==> setup-nginx"
echo "    DOMAIN=${DOMAIN}"
echo "    APP_NAME=${APP_NAME}"
echo "    APP_BASE_PATH=${APP_BASE_PATH}"
echo "    APP_PORT=${APP_PORT}"
echo "    MODE=${MODE}"
echo "    SSL_MODE=${SSL_MODE}"
echo "    FRONTEND_DIST_PATH=${FRONTEND_DIST_PATH}"

mkdir -p "${ACME_WEBROOT}/.well-known/acme-challenge"
chmod -R 755 "${ACME_WEBROOT}"
mkdir -p /etc/nginx/snippets

export APP_NAME APP_DIR DOMAIN APP_PORT APP_BASE_PATH ACME_WEBROOT FRONTEND_DIST_PATH
export SSL_CERT_PATH="${SSL_CERT_PATH:-}"
export SSL_KEY_PATH="${SSL_KEY_PATH:-}"
export NGINX_SITE

case "${MODE}" in
  snippet)
    SSL_MODE=snippet bash "${RENDER_SCRIPT}"
    echo
    echo "==> Snippet installed: ${NGINX_APP_SNIPPET}"
    echo "Add inside your existing server { ... } for ${DOMAIN}:"
    echo
    echo "    include ${NGINX_APP_SNIPPET};"
    echo
    echo "Then: nginx -t && systemctl reload nginx"
    ;;
  site)
    case "${SSL_MODE}" in
      http|https) ;;
      *)
        echo "ERROR: for MODE=site, SSL_MODE must be http or https (got '${SSL_MODE}')" >&2
        exit 1
        ;;
    esac
    SSL_MODE="${SSL_MODE}" bash "${RENDER_SCRIPT}"

    if [[ -L /etc/nginx/sites-enabled/default ]] || [[ -f /etc/nginx/sites-enabled/default ]]; then
      echo "==> Removing nginx default site"
      rm -f /etc/nginx/sites-enabled/default
    fi

    ln -sfn "${NGINX_SITE}" "${NGINX_ENABLED}"
    echo "==> Enabled site ${NGINX_ENABLED}"

    echo "==> Testing nginx config"
    nginx -t
    systemctl enable nginx >/dev/null 2>&1 || true
    systemctl reload nginx
    echo "==> nginx reloaded"
    ;;
  *)
    echo "ERROR: MODE must be 'site' or 'snippet' (got '${MODE}')" >&2
    exit 1
    ;;
esac

echo
echo "Public URLs (after deploy + DNS):"
echo "  App:     http://${DOMAIN}${APP_BASE_PATH}/"
echo "  Health:  http://${DOMAIN}${APP_BASE_PATH}/api/health"
echo "  Socket:  http://${DOMAIN}${APP_BASE_PATH}/socket.io/"
echo
echo "CLIENT_ORIGIN in ${APP_DIR}/shared/.env must be the origin only (no path):"
echo "  CLIENT_ORIGIN=https://${DOMAIN}"
echo
if [[ "${MODE}" == "site" && "${SSL_MODE}" == "http" ]]; then
  echo "HTTPS (domain):"
  echo "  sudo apt-get install -y certbot python3-certbot-nginx"
  echo "  sudo certbot --nginx -d ${DOMAIN}"
  echo "  # After certbot, re-check that ${APP_BASE_PATH} locations still work;"
  echo "  # if certbot rewrote the site oddly, re-run:"
  echo "  #   SSL_MODE=https SSL_CERT_PATH=/etc/letsencrypt/live/${DOMAIN}/fullchain.pem \\"
  echo "  #   SSL_KEY_PATH=/etc/letsencrypt/live/${DOMAIN}/privkey.pem \\"
  echo "  #   DOMAIN=${DOMAIN} bash ${SCRIPT_DIR}/setup-nginx.sh"
fi
