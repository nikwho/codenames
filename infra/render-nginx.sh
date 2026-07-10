#!/usr/bin/env bash
# Render nginx site config from infra templates.
# Usage: SSL_MODE=http|https bash render-nginx.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

APP_NAME="${APP_NAME:-codenames}"
APP_DIR="${APP_DIR:-/var/www/${APP_NAME}}"
DOMAIN="${DOMAIN:-example.com}"
APP_PORT="${APP_PORT:-3001}"
ACME_WEBROOT="${ACME_WEBROOT:-/var/www/acme}"
FRONTEND_DIST_REL="${FRONTEND_DIST_REL:-client/dist}"
FRONTEND_DIST_PATH="${APP_DIR}/current/${FRONTEND_DIST_REL}"
SSL_MODE="${SSL_MODE:-http}"

NGINX_APP_SNIPPET="/etc/nginx/snippets/${APP_NAME}-app.conf"
NGINX_SITE="${NGINX_SITE:-/etc/nginx/sites-available/${APP_NAME}}"

APP_TEMPLATE="${SCRIPT_DIR}/nginx.app.conf.template"
HTTP_TEMPLATE="${SCRIPT_DIR}/nginx.conf.template"
HTTPS_TEMPLATE="${SCRIPT_DIR}/nginx.ssl.conf.template"

if [[ ! -f "${APP_TEMPLATE}" || ! -f "${HTTP_TEMPLATE}" ]]; then
  echo "ERROR: missing nginx templates under ${SCRIPT_DIR}" >&2
  exit 1
fi

render_template() {
  local template="$1"
  sed \
    -e "s|{{DOMAIN}}|${DOMAIN}|g" \
    -e "s|{{APP_DIR}}|${APP_DIR}|g" \
    -e "s|{{APP_PORT}}|${APP_PORT}|g" \
    -e "s|{{FRONTEND_DIST_PATH}}|${FRONTEND_DIST_PATH}|g" \
    -e "s|{{ACME_WEBROOT}}|${ACME_WEBROOT}|g" \
    -e "s|{{APP_NAME}}|${APP_NAME}|g" \
    -e "s|{{SSL_CERT_PATH}}|${SSL_CERT_PATH:-}|g" \
    -e "s|{{SSL_KEY_PATH}}|${SSL_KEY_PATH:-}|g" \
    "${template}"
}

mkdir -p "$(dirname "${NGINX_APP_SNIPPET}")"
render_template "${APP_TEMPLATE}" > "${NGINX_APP_SNIPPET}"

TMP_CONF="$(mktemp)"
case "${SSL_MODE}" in
  http)
    render_template "${HTTP_TEMPLATE}" > "${TMP_CONF}"
    ;;
  https)
    if [[ ! -f "${HTTPS_TEMPLATE}" ]]; then
      echo "ERROR: missing ${HTTPS_TEMPLATE}" >&2
      exit 1
    fi
    if [[ -z "${SSL_CERT_PATH:-}" || -z "${SSL_KEY_PATH:-}" ]]; then
      echo "ERROR: SSL_CERT_PATH and SSL_KEY_PATH are required when SSL_MODE=https" >&2
      exit 1
    fi
    render_template "${HTTPS_TEMPLATE}" > "${TMP_CONF}"
    ;;
  *)
    echo "ERROR: SSL_MODE must be 'http' or 'https' (got '${SSL_MODE}')" >&2
    exit 1
    ;;
esac

install -m 644 "${TMP_CONF}" "${NGINX_SITE}"
rm -f "${TMP_CONF}"

echo "Rendered ${NGINX_SITE} (SSL_MODE=${SSL_MODE})"
