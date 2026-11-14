#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Preflight: what can this checkout actually do right now?
# ---------------------------------------------------------------------------
# Prints a capability and credential matrix so any agent (or human) can decide
# what is runnable before starting work, instead of discovering a missing tool
# or a missing credential halfway through a verification run.
#
# It never prints a secret value. Credentials are reported as present/absent
# only. A blocked capability is reported with the exact command that fixes it.
#
# Usage:
#   npm run preflight              # report, exit 0 when the report completes
#   PREFLIGHT_STRICT=1 npm run ... # also exit 1 when any capability is blocked
#
# Exit codes: 0 report completed; 1 a hard requirement is missing (node/git)
# or, under PREFLIGHT_STRICT=1, any capability is blocked.
# ---------------------------------------------------------------------------
set -uo pipefail

FAILURES=0
BLOCKED=0

say() { printf '%s\n' "$*"; }
section() { printf '\n==> %s\n' "$*"; }
ok() { printf '  %-38s %s\n' "$1" "$2"; }
blocked() {
  BLOCKED=$((BLOCKED + 1))
  printf '  %-10s %-34s %s\n' "BLOCKED" "$1" "$2"
}
runnable() { printf '  %-10s %-34s %s\n' "RUNNABLE" "$1" "${2:-}"; }
hard_fail() {
  FAILURES=$((FAILURES + 1))
  printf '  %-10s %-34s %s\n' "MISSING" "$1" "$2"
}

have() { command -v "$1" >/dev/null 2>&1; }

# Presence of a KEY=value line with a non-empty value. Never prints the value.
env_present() {
  local file="$1" key="$2"
  [[ -f "$file" ]] || return 1
  grep -Eq "^[[:space:]]*(export[[:space:]]+)?${key}=.+" "$file" 2>/dev/null
}

section "environment"
if have node; then ok "node" "$(node --version)"; else hard_fail "node" "required for every gate"; fi
if have npm; then ok "npm" "$(npm --version 2>/dev/null)"; else hard_fail "npm" "required for every gate"; fi
if have git; then ok "git" "$(git --version | awk '{print $3}')"; else hard_fail "git" "required"; fi

DOCKER_OK=0
if have docker; then
  if docker info >/dev/null 2>&1; then
    DOCKER_OK=1
    ok "docker" "daemon reachable"
  else
    ok "docker" "installed, daemon NOT reachable"
  fi
else
  ok "docker" "not installed"
fi

SUPABASE_OK=0
if have supabase; then
  SUPABASE_OK=1
  ok "supabase cli" "$(supabase --version 2>/dev/null | head -1)"
else
  ok "supabase cli" "not installed (hermetic suite unavailable)"
fi

CHROMIUM_OK=0
if [[ -d "${HOME}/.cache/ms-playwright" ]] && ls "${HOME}/.cache/ms-playwright" 2>/dev/null | grep -q chromium; then
  CHROMIUM_OK=1
  ok "playwright chromium" "installed"
else
  ok "playwright chromium" "not installed — npx playwright install chromium"
fi

GH_OK=0
GH_SCOPES=""
if have gh && gh auth status >/dev/null 2>&1; then
  GH_OK=1
  GH_SCOPES="$(gh auth status 2>&1 | grep -o "scopes:.*" | tr -d "'" | sed 's/scopes: //')"
  ok "gh cli" "authenticated"
  ok "gh token scopes" "${GH_SCOPES:-unknown}"
  if [[ "$GH_SCOPES" != *workflow* ]]; then
    ok "gh workflow scope" "ABSENT — pushing .github/workflows/ will be rejected"
  fi
else
  ok "gh cli" "not authenticated"
fi

if [[ -f .vercel/project.json ]]; then
  ok "vercel project" "linked: $(sed -nE 's/.*"projectName"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' .vercel/project.json)"
else
  ok "vercel project" "not linked"
fi

section "repository"
ok "branch" "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
DIRTY="$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
ok "worktree" "${DIRTY} changed path(s)"
ok "last tag" "$(git describe --tags --abbrev=0 2>/dev/null || echo none)"
UPSTREAM="$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)"
if [[ -n "$UPSTREAM" ]]; then
  AHEAD="$(git rev-list --count "${UPSTREAM}..HEAD" 2>/dev/null || echo '?')"
  ok "remote sync" "ahead ${AHEAD} of ${UPSTREAM}"
else
  ok "remote sync" "no upstream configured"
fi

section "runtime contract"
# The declared runtime must match in both tracked places, and this shell should
# actually run it. A mismatch is a capability report, never a silent pass: a
# build on an unproven Node.js major is not evidence.
DECLARED_NODE="$(tr -d '[:space:]' < .nvmrc 2>/dev/null || true)"
DECLARED_ENGINE="$(node -p "require('./package.json').engines?.node||''" 2>/dev/null || true)"
RUNNING_NODE="$(node -p "process.versions.node" 2>/dev/null || echo unknown)"
if node scripts/ci/check-node-version.mjs >/dev/null 2>&1; then
  ok "declarations agree" ".nvmrc=${DECLARED_NODE:-absent} engines=${DECLARED_ENGINE:-absent}"
else
  blocked "node declarations" "drift — run npm run check:node"
fi
if [[ -n "$DECLARED_NODE" && "${RUNNING_NODE%%.*}" == "${DECLARED_NODE#v}" ]]; then
  ok "running node" "${RUNNING_NODE}"
else
  blocked "running node" "${RUNNING_NODE} != declared ${DECLARED_NODE:-unknown} (npm run check:node)"
fi
if command -v vercel >/dev/null 2>&1; then
  LINKED_NODE="$(node -p "require('./.vercel/project.json').settings?.nodeVersion||''" 2>/dev/null || true)"
  if [[ -n "$LINKED_NODE" ]]; then
    ok "vercel project node" "${LINKED_NODE} (recorded at link time)"
  else
    ok "vercel project node" "unknown — run vercel project inspect"
  fi
else
  ok "vercel cli" "not installed"
fi

section "credentials (presence only; values are never printed)"
OPS_ENV="${STITCHFLOW_OPS_ENV:-$HOME/.config/stitchflow/ops.env}"
if [[ -f "$OPS_ENV" ]]; then
  PERMS="$(stat -c '%a' "$OPS_ENV" 2>/dev/null || echo unknown)"
  if [[ "$PERMS" == "600" ]]; then
    ok "ops secret file" "present, mode 600"
  else
    ok "ops secret file" "present, mode ${PERMS} — must be 600"
  fi
else
  ok "ops secret file" "absent (${OPS_ENV})"
fi

if [[ -n "${SOURCE_DB_URL:-}" ]]; then
  ok "SOURCE_DB_URL" "present in the environment"
elif env_present "$OPS_ENV" SOURCE_DB_URL; then
  ok "SOURCE_DB_URL" "present in the ops secret file"
else
  ok "SOURCE_DB_URL" "ABSENT — live dump/restore is blocked"
fi

for f in .env.local .env.test .env.pilot; do
  if [[ -f "$f" ]]; then ok "$f" "present"; else ok "$f" "absent"; fi
done

if env_present .env.pilot STITCHFLOW_E2E_OWNER_PASSWORD; then
  ok "pilot identities" "present in .env.pilot"
else
  ok "pilot identities" "absent — regenerate with npm run seed:pilot"
fi

section "published-secret scan"
# Vite inlines every public-prefixed variable into the browser bundle. A name
# that describes a credential must never carry that prefix. Both the shell and
# the env files are checked: an exported variable is inherited by every build in
# the session, which is exactly how a "deleted from .env.local" secret lingers.
PUBLISHED_SECRETS=0
scan_public_secret_name() {
  local where="$1" key="$2"
  [[ -n "$key" ]] || return 0
  PUBLISHED_SECRETS=$((PUBLISHED_SECRETS + 1))
  ok "$where" "defines ${key} — the build would publish it"
}
for key in $(printenv | cut -d= -f1 | grep -E '^(VITE_|NEXT_PUBLIC_|REACT_APP_)'); do
  if printf '%s' "${key#VITE_}" | grep -qEi '(PASSWORD|PASSPHRASE|SECRET|SERVICE_ROLE|SERVICE_KEY|PRIVATE_KEY|ACCESS_KEY|CREDENTIAL|TOKEN|DATABASE_URL|POSTGRES|_DB_URL)'; then
    scan_public_secret_name "shell environment" "$key"
  fi
done
for envfile in .env .env.local .env.production .env.production.local .env.test .env.pilot; do
  [[ -f "$envfile" ]] || continue
  while IFS= read -r key; do
    scan_public_secret_name "$envfile" "$key"
  done < <(sed -nE 's/^[[:space:]]*(export[[:space:]]+)?((VITE_|NEXT_PUBLIC_|REACT_APP_)[A-Za-z0-9_]*(PASSWORD|PASSPHRASE|SECRET|SERVICE_ROLE|SERVICE_KEY|PRIVATE_KEY|ACCESS_KEY|CREDENTIAL|TOKEN|DATABASE_URL|POSTGRES|_DB_URL)[A-Za-z0-9_]*)=.*/\2/p' "$envfile")
done
if [[ "$PUBLISHED_SECRETS" == "0" ]]; then
  ok "public-prefixed credentials" "none in the shell or in any env file"
fi

section "capabilities"
runnable "npm run lint" "tsc --noEmit"
runnable "npm run test:unit" "vitest"
runnable "npm run check:docs" "link check"
if [[ "$PUBLISHED_SECRETS" == "0" ]]; then
  runnable "npm run build" "artifact gate"
else
  blocked "npm run build" "${PUBLISHED_SECRETS} credential(s) with a public prefix"
fi

if [[ "$DOCKER_OK" == "1" ]]; then
  runnable "npm run verify:db" "docker"
  runnable "npm run rehearse:restore" "local source, no credential"
else
  blocked "npm run verify:db" "docker daemon unreachable"
  blocked "npm run rehearse:restore" "docker daemon unreachable"
fi

if [[ "$DOCKER_OK" == "1" && "$SUPABASE_OK" == "1" && "$CHROMIUM_OK" == "1" ]]; then
  runnable "npm run test:e2e:hermetic" "6 browser journeys"
  runnable "npm run verify:controls" "negative controls; each must reject its failure"
else
  MISSING=""
  [[ "$DOCKER_OK" == "1" ]] || MISSING+="docker "
  [[ "$SUPABASE_OK" == "1" ]] || MISSING+="supabase-cli "
  [[ "$CHROMIUM_OK" == "1" ]] || MISSING+="chromium "
  blocked "npm run test:e2e:hermetic" "missing: ${MISSING}"
  blocked "npm run verify:controls" "missing: ${MISSING}"
fi

if [[ -n "${SOURCE_DB_URL:-}" ]] || env_present "$OPS_ENV" SOURCE_DB_URL; then
  runnable "npm run rehearse:restore:hosted" "configured; reachability/auth probed at runtime"
else
  blocked "npm run rehearse:restore:hosted" "SOURCE_DB_URL absent — owner-held"
fi

if [[ "$GH_OK" == "1" && "$GH_SCOPES" == *workflow* ]]; then
  runnable "git push (workflow files)" "workflow scope present"
else
  blocked "git push (workflow files)" "gh token lacks workflow scope"
fi

section "next"
if [[ "$BLOCKED" == "0" ]]; then
  say "  Every capability is runnable. Read docs/runbooks/agent-operating-guide.md, then work."
else
  say "  ${BLOCKED} capability(ies) blocked. That is a state to report, never to work around:"
  say "  do not stub a credential, skip a gate, or weaken an assertion to make a blocked"
  say "  capability look runnable. Read docs/runbooks/agent-operating-guide.md."
fi

if [[ "$FAILURES" -gt 0 ]]; then
  say ""
  say "FAIL: ${FAILURES} hard requirement(s) missing."
  exit 1
fi
if [[ "${PREFLIGHT_STRICT:-0}" == "1" && "$BLOCKED" -gt 0 ]]; then
  say ""
  say "FAIL (strict): ${BLOCKED} capability(ies) blocked."
  exit 1
fi
exit 0
