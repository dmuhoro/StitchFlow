#!/usr/bin/env bash
# ============================================================================
# Hermetic browser suite: disposable Supabase stack + deterministic fixtures.
#
#   npm run test:e2e:hermetic
#
# What makes this hermetic:
#   - a throwaway Supabase stack on loopback ports, destroyed on exit;
#   - the schema is rebuilt from tracked migrations and seed on every run, so a
#     slot consumed by the previous run cannot make this one pass or fail for
#     the wrong reason;
#   - the build is the real Supabase-mode bundle, pointed at that stack;
#   - no hosted project, no hosted credential, and no residual state.
#
# Nothing here reads `.env.local` (the developer's hosted configuration) and
# nothing here can reach the hosted project: `scripts/e2e/seed-local.mjs`
# refuses a non-loopback URL, and the build gate rejects a loopback URL for a
# production deploy.
#
# Exit codes: 0 all green; 1 a gate failed; 2 a precondition is missing.
# ============================================================================
set -euo pipefail
set +x

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

# A developer shell (or an agent harness) can export the hosted configuration.
# Vite gives the process environment priority over every `.env` file, so an
# ambient `VITE_SUPABASE_URL` would silently win over `.env.test.local` and the
# "hermetic" suite would test the real project. Drop them here and rebuild the
# three values from the disposable stack below. This is the boundary guard: the
# values are never inherited.
unset VITE_SUPABASE_URL VITE_SUPABASE_PUBLISHABLE_KEY VITE_DATA_MODE
unset STITCHFLOW_E2E_BASE_URL
unset STITCHFLOW_E2E_OWNER_EMAIL STITCHFLOW_E2E_OWNER_PASSWORD
unset STITCHFLOW_E2E_EMPLOYEE_EMAIL STITCHFLOW_E2E_EMPLOYEE_PASSWORD
unset STITCHFLOW_E2E_PATRON_EMAIL STITCHFLOW_E2E_PATRON_PASSWORD
unset STITCHFLOW_E2E_EMAIL STITCHFLOW_E2E_PASSWORD STITCHFLOW_E2E_INVITE_CODE
unset STITCHFLOW_E2E_EXPECTED_ROLE STITCHFLOW_E2E_OWN_ORDER STITCHFLOW_E2E_FOREIGN_ORDER
unset STITCHFLOW_E2E_BOOKING_DATE STITCHFLOW_E2E_BOOKING_TIME
unset STITCHFLOW_E2E_BOOKING_RESOURCE_NAME STITCHFLOW_E2E_BOOKING_REQUEST_LABEL

PREVIEW_PORT="${STITCHFLOW_E2E_PREVIEW_PORT:-4173}"
KEEP="${STITCHFLOW_E2E_KEEP:-0}"

blocked() {
  printf '\nBLOCKED: %s\n' "$1"
  if [[ -n "${2:-}" ]]; then printf '  remedy: %s\n' "$2"; fi
  exit 2
}

fail() {
  printf '\nFAIL: %s\n' "$1"
  exit 1
}

# --- preconditions ----------------------------------------------------------
command -v docker >/dev/null 2>&1 || blocked "docker is not installed." "Install Docker Engine."
docker info >/dev/null 2>&1 || blocked "the Docker daemon is not reachable." "Start Docker."
command -v supabase >/dev/null 2>&1 || blocked "the Supabase CLI is not installed." "npm i -g supabase"
command -v node >/dev/null 2>&1 || blocked "node is not installed." "Install Node 22+."
[[ -d node_modules ]] || blocked "node_modules is missing." "npm ci"

port_free() {
  ! ss -ltn 2>/dev/null | grep -qE "[:.]$1[[:space:]]"
}

# The conventional 5432x block is often already taken by another local Supabase
# project. Pick a base where the whole block this stack needs is free.
BASE=""
for candidate in 54521 54621 54721 54821 54921; do
  ok=1
  for offset in -1 0 1 2 3 6 8; do
    if ! port_free "$((candidate + offset))"; then ok=0; break; fi
  done
  if [[ "$ok" == "1" ]]; then BASE="$candidate"; break; fi
done
[[ -n "$BASE" ]] || blocked "no free Supabase port block (tried 54521-54929)." "Free a port range or set STITCHFLOW_E2E_BASE_PORT."
if [[ -n "${STITCHFLOW_E2E_BASE_PORT:-}" ]]; then
  BASE="$STITCHFLOW_E2E_BASE_PORT"
  for offset in -1 0 1 2 3 6 8; do
    port_free "$((BASE + offset))" \
      || blocked "requested Supabase port block is occupied." "Choose a free STITCHFLOW_E2E_BASE_PORT."
  done
fi

port_free "$PREVIEW_PORT" || blocked "port $PREVIEW_PORT is already in use." "Set STITCHFLOW_E2E_PREVIEW_PORT to a free port."

API_PORT="$BASE"
DB_PORT="$((BASE + 1))"
SHADOW_PORT="$((BASE - 1))"
STUDIO_PORT="$((BASE + 2))"
SMTP_PORT="$((BASE + 3))"
ANALYTICS_PORT="$((BASE + 6))"
POOLER_PORT="$((BASE + 8))"

STACK="${STITCHFLOW_E2E_WORKDIR:-$(mktemp -d -t stitchflow-e2e-XXXXXX)}"
OWNS_STACK=1
if [[ -n "${STITCHFLOW_E2E_WORKDIR:-}" && -f "$STACK/supabase/config.toml" ]]; then
  OWNS_STACK=0
fi

existing_stack=0
if supabase status --workdir "$STACK" >/dev/null 2>&1; then
  existing_stack=1
  echo "==> reusing the local stack in $STACK"
fi

cleanup() {
  local status=$?
  if [[ "$existing_stack" == "0" && "$KEEP" != "1" ]]; then
    echo "==> stopping the disposable stack"
    supabase stop --workdir "$STACK" --no-backup >/dev/null 2>&1 || true
  fi
  if [[ "$OWNS_STACK" == "1" && "$KEEP" != "1" ]]; then rm -rf "$STACK"; fi
  rm -f "$ROOT/.env.test.local"
  exit "$status"
}
trap cleanup EXIT INT TERM

# --- stack ------------------------------------------------------------------
if [[ "$existing_stack" == "0" ]]; then
  echo "==> preparing a disposable stack in $STACK (api $API_PORT, db $DB_PORT)"
  mkdir -p "$STACK/supabase"
  cp supabase/config.toml "$STACK/supabase/config.toml"
  cp -r supabase/migrations "$STACK/supabase/migrations"
  cp supabase/seed.sql "$STACK/supabase/seed.sql"

  # Isolate this stack: distinct project id (container/volume names) and remapped
  # ports so it cannot collide with another local Supabase project.
  sed -i \
    -e "s/^project_id = \"StitchFlow\"/project_id = \"StitchFlowE2E\"/" \
    -e "0,/^port = 54321$/s//port = $API_PORT/" \
    -e "0,/^port = 54322$/s//port = $DB_PORT/" \
    -e "0,/^shadow_port = 54320$/s//shadow_port = $SHADOW_PORT/" \
    -e "0,/^port = 54323$/s//port = $STUDIO_PORT/" \
    -e "0,/^port = 54324$/s//port = $SMTP_PORT/" \
    -e "0,/^port = 54329$/s//port = $POOLER_PORT/" \
    -e "0,/^port = 54327$/s//port = $ANALYTICS_PORT/" \
    "$STACK/supabase/config.toml"

  supabase stop --workdir "$STACK" --no-backup >/dev/null 2>&1 || true
  # Supabase CLI prints local anon and service-role keys during startup. Discard
  # that output so key values never enter a terminal, log, or evidence file.
  supabase start --workdir "$STACK" --exclude studio,imgproxy,logflare,vector,edge-runtime \
    >/dev/null 2>&1 \
    || fail "the disposable Supabase stack did not start."
fi

# The fixture command verifies this is the dedicated loopback stack, then resets
# it from tracked migrations and seed.sql. That recreates the pending booking
# request before every run, including an immediate re-run.
echo "==> recreating the pending fitting fixture from tracked migrations and seed"
STITCHFLOW_E2E_LOCAL_SEED=1 \
STITCHFLOW_E2E_WORKDIR="$STACK" \
  npm run seed:pilot-fitting \
  || fail "the pending local fitting fixture could not be recreated."

STATUS_JSON="$(supabase status --workdir "$STACK" -o json)" || fail "supabase status failed."
read_status() {
  STATUS_JSON="$STATUS_JSON" node -e '
    const raw = process.env.STATUS_JSON;
    const status = JSON.parse(raw.slice(raw.indexOf("{")));
    for (const key of process.argv.slice(1)) {
      const value = status[key];
      if (value) { process.stdout.write(String(value)); process.exit(0); }
    }
    process.exit(1);
  ' "$@"
}
API_URL="$(read_status API_URL api_url)" || fail "could not read API_URL from supabase status."
ANON_KEY="$(read_status ANON_KEY PUBLISHABLE_KEY anon_key publishable_key)" \
  || fail "could not read the local anon/publishable key from supabase status."
SERVICE_KEY="$(read_status SERVICE_ROLE_KEY SECRET_KEY service_role_key secret_key)" \
  || fail "could not read the local service-role key from supabase status."

case "$API_URL" in
  http://127.0.0.1:*|http://localhost:*) ;;
  *) fail "the local stack reported a non-loopback API URL ($API_URL)." ;;
esac

printf 'VITE_SUPABASE_URL=%s\nVITE_SUPABASE_PUBLISHABLE_KEY=%s\n' "$API_URL" "$ANON_KEY" > .env.test.local
chmod 600 .env.test.local

# --- fixtures ---------------------------------------------------------------
echo "==> seeding local identities and the pending fitting request"
FIXTURE_CREDENTIALS="$(
  SUPABASE_LOCAL_URL="$API_URL" \
  SUPABASE_LOCAL_ANON_KEY="$ANON_KEY" \
  SUPABASE_LOCAL_SERVICE_ROLE_KEY="$SERVICE_KEY" \
    node scripts/e2e/seed-local.mjs
)" || fail "local fixture seeding failed."

# --- build ------------------------------------------------------------------
# The real Supabase-mode bundle. `--mode test` layers `.env.test` and
# `.env.test.local` on top; the loopback artifact exception is explicit.
echo "==> building the Supabase-mode bundle for the local stack"
STITCHFLOW_LOCAL_SUPABASE_BUILD=1 \
VITE_DATA_MODE=supabase \
VITE_SUPABASE_URL="$API_URL" \
VITE_SUPABASE_PUBLISHABLE_KEY="$ANON_KEY" \
  npx vite build --config vite.pilot.config.ts --mode test \
  || fail "the Supabase-mode bundle failed to build."

STITCHFLOW_LOCAL_SUPABASE_BUILD=1 \
VITE_DATA_MODE=supabase \
VITE_SUPABASE_URL="$API_URL" \
VITE_SUPABASE_PUBLISHABLE_KEY="$ANON_KEY" \
  node scripts/ci/verify-build.mjs \
  || fail "the local Supabase artifact did not pass the build gate."

# `scripts/ci/verify-build.mjs` deliberately does not require a hosted project
# ref for a loopback build, so scan for one here. A bundle that embeds the
# production project would send browser writes to live pilot data while every
# other assertion still passed.
if grep -rEq 'https://[a-z0-9-]+\.supabase\.co|qkhfjlxhulekjrfgrdbz' dist; then
  fail "the hermetic bundle embeds a hosted Supabase URL; refusing to run the suite against it."
fi

# --- suite ------------------------------------------------------------------
echo "==> running the browser suite"
# STITCHFLOW_E2E_BASE_URL is deliberately left unset: the Playwright config then
# owns the preview-server lifecycle (start on the chosen port, stop afterwards).
STITCHFLOW_E2E_PREVIEW_PORT="$PREVIEW_PORT" \
STITCHFLOW_ENV_REQUIRE_LOOPBACK=1 \
STITCHFLOW_E2E_CREDENTIALS_JSON="$FIXTURE_CREDENTIALS" \
  node scripts/e2e/env-run.mjs .env.test .env.test.local -- \
    npx playwright test --workers=1 \
  || fail "the browser suite failed."
unset FIXTURE_CREDENTIALS

echo
echo "PASS: hermetic browser suite is green against a disposable stack."
