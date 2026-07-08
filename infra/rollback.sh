#!/usr/bin/env bash
# =============================================================================
# rollback.sh — point `current` at the previous release and reload PM2/nginx.
# Run as the deploy user.
# =============================================================================
set -euo pipefail

APP_NAME="${APP_NAME:-codenames}"
APP_DIR="${APP_DIR:-/var/www/${APP_NAME}}"
APP_PORT="${APP_PORT:-3001}"

CURRENT_LINK="${APP_DIR}/current"
RELEASES_DIR="${APP_DIR}/releases"

echo "==> Rollback ${APP_NAME}"
echo "    APP_DIR=${APP_DIR}"

if [[ "$(id -u)" -eq 0 ]]; then
  echo "ERROR: do not run rollback.sh as root. Use the deploy user." >&2
  exit 1
fi

if [[ ! -d "${RELEASES_DIR}" ]]; then
  echo "ERROR: releases directory missing: ${RELEASES_DIR}" >&2
  exit 1
fi

if [[ ! -L "${CURRENT_LINK}" ]]; then
  echo "ERROR: ${CURRENT_LINK} is not a symlink — nothing to roll back from." >&2
  exit 1
fi

CURRENT_TARGET="$(readlink -f "${CURRENT_LINK}")"
echo "    Current release: ${CURRENT_TARGET}"

mapfile -t ALL_RELEASES < <(find "${RELEASES_DIR}" -mindepth 1 -maxdepth 1 -type d | sort)
if (( ${#ALL_RELEASES[@]} < 2 )); then
  echo "ERROR: no previous release found under ${RELEASES_DIR}." >&2
  echo "       Need at least two successful deploys to rollback." >&2
  exit 1
fi

PREVIOUS=""
for (( i = ${#ALL_RELEASES[@]} - 1; i >= 0; i-- )); do
  CANDIDATE="$(readlink -f "${ALL_RELEASES[$i]}")"
  if [[ "${CANDIDATE}" != "${CURRENT_TARGET}" ]]; then
    # Prefer the newest release that is not current
    PREVIOUS="${CANDIDATE}"
    break
  fi
done

if [[ -z "${PREVIOUS}" ]]; then
  echo "ERROR: could not resolve a previous release (all candidates match current)." >&2
  exit 1
fi

echo "==> Switching current → ${PREVIOUS}"
# Dangerous action: production symlink rollback
TMP_LINK="${APP_DIR}/current.tmp.$$"
ln -sfn "${PREVIOUS}" "${TMP_LINK}"
mv -Tf "${TMP_LINK}" "${CURRENT_LINK}"
echo "    current -> $(readlink "${CURRENT_LINK}")"

ECOSYSTEM="${CURRENT_LINK}/ecosystem.config.cjs"
if [[ ! -f "${ECOSYSTEM}" ]]; then
  ECOSYSTEM="${APP_DIR}/ecosystem.config.cjs"
fi
if [[ ! -f "${ECOSYSTEM}" ]]; then
  echo "ERROR: ecosystem.config.cjs not found" >&2
  exit 1
fi

echo "==> Reloading PM2"
export APP_DIR
export APP_PORT
export PORT="${APP_PORT}"
cd "${APP_DIR}"
pm2 startOrReload "${ECOSYSTEM}" --update-env
pm2 save

echo "==> Reloading nginx"
sudo nginx -t
sudo systemctl reload nginx

echo
echo "==> Rollback complete"
curl -fsS "http://127.0.0.1:${APP_PORT}/api/health" && echo || echo "WARNING: local health check failed — pm2 logs ${APP_NAME}-api"
