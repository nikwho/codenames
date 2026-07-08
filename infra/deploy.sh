#!/usr/bin/env bash
# =============================================================================
# deploy.sh — release a new build under APP_DIR/releases and atomically switch
#             the `current` symlink. Run as the deploy user (not root).
#
# If anything fails BEFORE switching `current`, the live release is untouched.
# =============================================================================
set -euo pipefail

APP_NAME="${APP_NAME:-codenames}"
APP_DIR="${APP_DIR:-/var/www/${APP_NAME}}"
REPO="${REPO:-}"
BRANCH="${BRANCH:-main}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
APP_PORT="${APP_PORT:-3001}"

# Monorepo layout (npm workspaces): shared + server + client
CLIENT_DIR_REL="${CLIENT_DIR_REL:-client}"
SERVER_DIR_REL="${SERVER_DIR_REL:-server}"
FRONTEND_DIST_REL="${FRONTEND_DIST_REL:-client/dist}"
BACKEND_ENTRY_REL="${BACKEND_ENTRY_REL:-server/dist/index.js}"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
RELEASE_DIR="${APP_DIR}/releases/${TIMESTAMP}"
SHARED_ENV="${APP_DIR}/shared/.env"
CURRENT_LINK="${APP_DIR}/current"

echo "==> Deploy ${APP_NAME}"
echo "    APP_DIR=${APP_DIR}"
echo "    REPO=${REPO:-<missing>}"
echo "    BRANCH=${BRANCH}"
echo "    KEEP_RELEASES=${KEEP_RELEASES}"
echo "    RELEASE_DIR=${RELEASE_DIR}"

if [[ "$(id -u)" -eq 0 ]]; then
  echo "ERROR: do not run deploy.sh as root. Use the deploy user." >&2
  exit 1
fi

if [[ -z "${REPO}" ]]; then
  echo "ERROR: set REPO, e.g. REPO=git@github.com:USER/REPO.git" >&2
  exit 1
fi

if [[ ! -d "${APP_DIR}" ]]; then
  echo "ERROR: APP_DIR does not exist: ${APP_DIR} (run bootstrap-vps.sh first)" >&2
  exit 1
fi
if [[ ! -d "${APP_DIR}/releases" || ! -d "${APP_DIR}/shared" ]]; then
  echo "ERROR: expected ${APP_DIR}/releases and ${APP_DIR}/shared" >&2
  exit 1
fi
if [[ ! -f "${SHARED_ENV}" ]]; then
  echo "ERROR: missing ${SHARED_ENV} — create it before deploying." >&2
  exit 1
fi

cleanup_failed_release() {
  local code=$?
  if [[ -d "${RELEASE_DIR}" ]] && [[ ! -L "${CURRENT_LINK}" || "$(readlink -f "${CURRENT_LINK}" 2>/dev/null || true)" != "$(readlink -f "${RELEASE_DIR}")" ]]; then
    echo "==> Deploy failed (exit ${code}); removing incomplete release ${RELEASE_DIR}"
    rm -rf "${RELEASE_DIR}"
  fi
  exit "${code}"
}
trap cleanup_failed_release ERR

echo "==> [1/10] Creating release directory"
mkdir -p "${RELEASE_DIR}"

echo "==> [2/10] Cloning ${REPO} (branch ${BRANCH}, depth 1)"
# Dangerous action: network git clone into a new release directory only
git clone --depth 1 --branch "${BRANCH}" "${REPO}" "${RELEASE_DIR}"

echo "==> [3/10] Installing root workspace dependencies (npm ci)"
cd "${RELEASE_DIR}"
if [[ ! -f package-lock.json ]]; then
  echo "ERROR: package-lock.json missing — npm ci requires a lockfile." >&2
  exit 1
fi
npm ci

echo "==> [4/10] Building shared package"
npm run build -w shared

echo "==> [5/10] Building backend (${SERVER_DIR_REL})"
if [[ -f "${SERVER_DIR_REL}/package.json" ]] && node -e "const p=require('./${SERVER_DIR_REL}/package.json'); process.exit(p.scripts&&p.scripts.build?0:1)"; then
  npm run build -w server
else
  echo "    No server build script; skipping"
fi

if [[ ! -f "${RELEASE_DIR}/${BACKEND_ENTRY_REL}" ]]; then
  echo "ERROR: backend entrypoint missing after build: ${BACKEND_ENTRY_REL}" >&2
  exit 1
fi

echo "==> [6/10] Building frontend (${CLIENT_DIR_REL})"
npm run build -w client
if [[ ! -d "${RELEASE_DIR}/${FRONTEND_DIST_REL}" ]]; then
  echo "ERROR: frontend dist missing: ${FRONTEND_DIST_REL}" >&2
  exit 1
fi

echo "==> [7/10] Linking shared .env → ${SERVER_DIR_REL}/.env"
# Do not copy secrets into the release tree as a normal file; use a symlink.
ln -sfn "${SHARED_ENV}" "${RELEASE_DIR}/${SERVER_DIR_REL}/.env"

echo "==> [8/10] Atomically switching current → ${RELEASE_DIR}"
# Dangerous action: switches production symlink (previous release remains on disk)
TMP_LINK="${APP_DIR}/current.tmp.$$"
ln -sfn "${RELEASE_DIR}" "${TMP_LINK}"
mv -Tf "${TMP_LINK}" "${CURRENT_LINK}"
echo "    current -> $(readlink "${CURRENT_LINK}")"

# Refresh helper scripts on APP_DIR from this release (if present)
if [[ -d "${RELEASE_DIR}/infra" ]]; then
  echo "==> Refreshing scripts in ${APP_DIR} from release infra/"
  install -m 755 "${RELEASE_DIR}/infra/deploy.sh" "${APP_DIR}/deploy.sh"
  install -m 755 "${RELEASE_DIR}/infra/rollback.sh" "${APP_DIR}/rollback.sh"
  if [[ -f "${RELEASE_DIR}/infra/nginx.conf.template" ]]; then
    install -m 644 "${RELEASE_DIR}/infra/nginx.conf.template" "${APP_DIR}/nginx.conf.template"
  fi
  if [[ -f "${RELEASE_DIR}/ecosystem.config.cjs" ]]; then
    install -m 644 "${RELEASE_DIR}/ecosystem.config.cjs" "${APP_DIR}/ecosystem.config.cjs"
  fi
fi

echo "==> [9/10] Reloading PM2 (fork mode, single instance)"
ECOSYSTEM="${CURRENT_LINK}/ecosystem.config.cjs"
if [[ ! -f "${ECOSYSTEM}" ]]; then
  ECOSYSTEM="${APP_DIR}/ecosystem.config.cjs"
fi
if [[ ! -f "${ECOSYSTEM}" ]]; then
  echo "ERROR: ecosystem.config.cjs not found in current release or ${APP_DIR}" >&2
  exit 1
fi
export APP_DIR
export APP_PORT
export PORT="${APP_PORT}"
# Point PM2 at APP_DIR so cwd resolves via current/
cd "${APP_DIR}"
pm2 startOrReload "${ECOSYSTEM}" --update-env
pm2 save

echo "==> Reloading nginx"
sudo nginx -t
sudo systemctl reload nginx

echo "==> [10/10] Pruning old releases (keeping ${KEEP_RELEASES})"
# Dangerous action: deletes old release directories beyond KEEP_RELEASES
mapfile -t ALL_RELEASES < <(find "${APP_DIR}/releases" -mindepth 1 -maxdepth 1 -type d | sort)
COUNT="${#ALL_RELEASES[@]}"
if (( COUNT > KEEP_RELEASES )); then
  TO_DELETE=$(( COUNT - KEEP_RELEASES ))
  for (( i = 0; i < TO_DELETE; i++ )); do
    OLD="${ALL_RELEASES[$i]}"
    # Never delete the live current target
    if [[ "$(readlink -f "${CURRENT_LINK}")" == "$(readlink -f "${OLD}")" ]]; then
      continue
    fi
    echo "    removing ${OLD}"
    rm -rf "${OLD}"
  done
fi

trap - ERR

echo
echo "==> Deploy succeeded: ${TIMESTAMP}"
echo "    Health: curl -fsS http://127.0.0.1:${APP_PORT}/api/health || true"
curl -fsS "http://127.0.0.1:${APP_PORT}/api/health" && echo || echo "WARNING: local health check failed — inspect with: pm2 logs ${APP_NAME}-api"
