#!/usr/bin/env bash
# ============================================================================
# NEGATIVE CONTROLS
# ----------------------------------------------------------------------------
# A gate that has never been observed rejecting something is decoration. This
# script proves each gate actually fires by feeding it the failure it exists to
# catch, and asserting a non-zero exit.
#
#   npm run verify:controls
#
# Covered:
#   1. The production deploy gate rejects a demo-mode artifact.
#   2. The hermetic local-build exception is opt-in and loopback-only, so it can
#      never be used to relax a production build.
#   3. The protected browser flow fails against a demo-mode build instead of
#      reporting success or skipping.
#   4. A credential with a public prefix is refused before an artifact exists,
#      because Vite would inline it into the browser bundle.
#   5. The hosted-rehearsal probe classifies an unreachable source as a missing
#      precondition (exit 2) and never as a restore-gate rejection (exit 1).
#   6. The hidden credential prompt refuses trailing arguments before writing.
#   7. The Node.js version guard accepts agreement and refuses drifted
#      declarations, so the build cannot silently run an unproven runtime.
#
# Exit codes: 0 all controls behaved; 1 a control did not fire.
# ============================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

LOG_DIR="$(mktemp -d -t stitchflow-controls-XXXXXX)"
CASES=0
PROBLEMS=0

trap 'rm -rf "$LOG_DIR"' EXIT

# A developer shell can export the hosted configuration. Every case below sets
# what it needs, so clear the inherited values once: otherwise an ambient
# `VITE_DATA_MODE=supabase` would change what the "demo artifact" case proves.
unset VITE_DATA_MODE VITE_SUPABASE_URL VITE_SUPABASE_PUBLISHABLE_KEY
unset VITE_SUPABASE_PASSWORD VITE_POSTGRESQL_URL VITE_SUPABASE_PERSONAL_ACCESS_TOKEN
unset CONTEXT NETLIFY_CONTEXT VERCEL_ENV STITCHFLOW_DEPLOY_CONTEXT
unset STITCHFLOW_E2E_BASE_URL

# run_case <expected: pass|fail|blocked> <label> <command...>
#   pass=0, fail=1, blocked=2. A blocked case proves a missing precondition is
#   reported as exit 2, never confused with a gate rejecting its input (exit 1).
run_case() {
  local expected="$1" label="$2"
  shift 2
  CASES=$((CASES + 1))
  local log="$LOG_DIR/case-$CASES.log"
  local expected_code actual_code actual
  case "$expected" in
    pass) expected_code=0 ;;
    fail) expected_code=1 ;;
    blocked) expected_code=2 ;;
    *) echo "FAIL: unknown expectation '$expected' for \"$label\"."; PROBLEMS=$((PROBLEMS + 1)); return ;;
  esac
  if "$@" >"$log" 2>&1; then
    actual_code=0
  else
    actual_code=$?
  fi
  case "$actual_code" in
    0) actual="pass" ;;
    2) actual="blocked" ;;
    *) actual="fail" ;;
  esac

  if [[ "$actual_code" == "$expected_code" ]]; then
    printf 'PASS  %-58s expected %-7s got %s (exit %s)\n' "$label" "$expected" "$actual" "$actual_code"
  else
    printf 'FAIL  %-58s expected %-7s got %s (exit %s)\n' "$label" "$expected" "$actual" "$actual_code"
    sed -n '1,6p' "$log" | sed 's/^/        /'
    PROBLEMS=$((PROBLEMS + 1))
  fi
}

step() { printf '\n==> %s\n' "$1"; }

# --- build fixtures for the artifact gate -----------------------------------
step "building a demo-mode artifact"
VITE_DATA_MODE=demo \
VITE_SUPABASE_URL="http://127.0.0.1:54521" \
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_negative_control_loopback_key" \
  npm run build >"$LOG_DIR/build-demo.log" 2>&1 || {
  echo "FAIL: could not build the demo artifact."
  tail -20 "$LOG_DIR/build-demo.log"
  exit 1
}

step "1-2. artifact gate"
run_case pass "demo artifact, no deploy context" \
  env -u VERCEL_ENV -u NETLIFY_CONTEXT -u CONTEXT \
  node scripts/ci/verify-build.mjs
run_case fail "demo artifact in a production deploy context" \
  env VERCEL_ENV=production \
  node scripts/ci/verify-build.mjs

step "building a Supabase-mode artifact for the loopback stack"
LOOPBACK_URL="http://127.0.0.1:54521"
LOOPBACK_KEY="sb_publishable_negative_control_loopback_key"
STITCHFLOW_LOCAL_SUPABASE_BUILD=1 \
VITE_DATA_MODE=supabase \
VITE_SUPABASE_URL="$LOOPBACK_URL" \
VITE_SUPABASE_PUBLISHABLE_KEY="$LOOPBACK_KEY" \
  npm run build >"$LOG_DIR/build-local.log" 2>&1 || {
  echo "FAIL: could not build the Supabase-mode artifact."
  tail -20 "$LOG_DIR/build-local.log"
  exit 1
}

run_case pass "Supabase artifact, loopback + explicit local flag" \
  env -u VERCEL_ENV \
  VITE_DATA_MODE=supabase \
  VITE_SUPABASE_URL="$LOOPBACK_URL" \
  VITE_SUPABASE_PUBLISHABLE_KEY="$LOOPBACK_KEY" \
  STITCHFLOW_LOCAL_SUPABASE_BUILD=1 \
  node scripts/ci/verify-build.mjs
run_case fail "local flag used with a hosted project URL" \
  env -u VERCEL_ENV \
  VITE_DATA_MODE=supabase \
  VITE_SUPABASE_URL="https://example-project.supabase.co" \
  VITE_SUPABASE_PUBLISHABLE_KEY="$LOOPBACK_KEY" \
  STITCHFLOW_LOCAL_SUPABASE_BUILD=1 \
  node scripts/ci/verify-build.mjs
run_case fail "local loopback artifact promoted to production" \
  env VERCEL_ENV=production \
  VITE_DATA_MODE=supabase \
  VITE_SUPABASE_URL="$LOOPBACK_URL" \
  VITE_SUPABASE_PUBLISHABLE_KEY="$LOOPBACK_KEY" \
  STITCHFLOW_LOCAL_SUPABASE_BUILD=1 \
  node scripts/ci/verify-build.mjs
run_case fail "loopback artifact without the explicit opt-in flag" \
  env -u VERCEL_ENV \
  VITE_DATA_MODE=supabase \
  VITE_SUPABASE_URL="$LOOPBACK_URL" \
  VITE_SUPABASE_PUBLISHABLE_KEY="$LOOPBACK_KEY" \
  node scripts/ci/verify-build.mjs

# --- 4. a credential with a public prefix must never reach an artifact ------
# Vite inlines VITE_* into the browser bundle. The build must refuse before an
# artifact exists, and the artifact gate must refuse independently.
step "4. published-secret guard"
run_case fail "build with VITE_SUPABASE_PASSWORD set" \
  env VITE_DATA_MODE=demo \
  VITE_SUPABASE_URL="$LOOPBACK_URL" \
  VITE_SUPABASE_PUBLISHABLE_KEY="$LOOPBACK_KEY" \
  VITE_SUPABASE_PASSWORD=not-a-real-credential \
  npm run build
if ! grep -Fq 'VITE_SUPABASE_PASSWORD' "$LOG_DIR/case-$CASES.log"; then
  echo "FAIL: the build refused for a reason other than the published-secret guard."
  sed -n '1,12p' "$LOG_DIR/case-$CASES.log"
  PROBLEMS=$((PROBLEMS + 1))
fi
run_case fail "artifact gate with VITE_SUPABASE_PASSWORD set" \
  env VITE_SUPABASE_PASSWORD=not-a-real-credential \
  node scripts/ci/verify-build.mjs

# --- 3. the protected flow must fail against demo ---------------------------
step "3. protected browser flow against a demo-mode artifact"
VITE_DATA_MODE=demo \
VITE_SUPABASE_URL="$LOOPBACK_URL" \
VITE_SUPABASE_PUBLISHABLE_KEY="$LOOPBACK_KEY" \
  npm run build >"$LOG_DIR/build-demo-2.log" 2>&1 || {
  echo "FAIL: could not rebuild the demo artifact."
  exit 1
}

# Synthetic values on purpose: the point is that a demo build cannot satisfy a
# Supabase-mode role journey. No real credential is used or needed.
run_case fail "full E2E suite against a demo-mode build" \
  env -u CI \
  STITCHFLOW_E2E_OWNER_EMAIL=demo-negative-control@example.invalid \
  STITCHFLOW_E2E_OWNER_PASSWORD=not-a-real-credential \
  STITCHFLOW_E2E_PREVIEW_PORT=4191 \
  npx playwright test --workers=1 --reporter=line --timeout=5000

if ! grep -Fq 'Atelier sign in' "$LOG_DIR/case-$CASES.log"; then
  echo "FAIL: the demo browser control did not fail at the missing sign-in control."
  sed -n '1,12p' "$LOG_DIR/case-$CASES.log"
  exit 1
fi
echo "Observed browser failure (expected, exit 1):"
sed -n '1,18p' "$LOG_DIR/case-$CASES.log"

# --- 5. a missing precondition is exit 2, never a gate rejection ------------
# The hosted rehearsal must not report "FAIL" when it never reached the data.
# A host that cannot resolve is a deterministic, credential-free precondition.
step "5. hosted-rehearsal probe classification"
run_case blocked "probe: unresolvable source host" \
  env SOURCE_DB_URL="postgresql://probe:probe@nonexistent.invalid:5432/postgres" \
  node scripts/ops/source-db.mjs probe
if ! grep -Fq 'BLOCKED: the hosted source is not reachable for the rehearsal' "$LOG_DIR/case-$CASES.log"; then
  echo "FAIL: the probe exited 2 but did not print the precondition classification."
  sed -n '1,8p' "$LOG_DIR/case-$CASES.log"
  PROBLEMS=$((PROBLEMS + 1))
fi

# --- 6. reject prose passed as credential-setup arguments -------------------
step "6. credential setup rejects trailing arguments"
run_case blocked "hidden credential prompt with trailing prose" \
  env STITCHFLOW_OPS_ENV="$LOG_DIR/should-not-be-written" \
  bash scripts/ops/set-source-db.sh "— paste at the hidden prompt"
if ! grep -Fq 'this command takes no arguments' "$LOG_DIR/case-$CASES.log" ||
   [[ -e "$LOG_DIR/should-not-be-written" ]]; then
  echo "FAIL: malformed invocation did not stop before the hidden prompt and file write."
  sed -n '1,8p' "$LOG_DIR/case-$CASES.log"
  PROBLEMS=$((PROBLEMS + 1))
fi

# --- 7. the Node.js contract must reject drift, not just print it -----------
# The three declarations drifted before (20 in `.nvmrc`, 26.x on Vercel, 22.22.1
# in the proven artifact). Fixtures keep this credential-free and independent of
# the real tracked values.
step "7. Node.js version contract"
NODE_FIXTURES="$LOG_DIR/node-contract"
mkdir -p "$NODE_FIXTURES"
printf '22\n' >"$NODE_FIXTURES/agree.nvmrc"
printf '{"engines":{"node":"22.x"}}\n' >"$NODE_FIXTURES/agree.package.json"
printf '20\n' >"$NODE_FIXTURES/drift.nvmrc"
printf '{"engines":{"node":"22.x"}}\n' >"$NODE_FIXTURES/drift.package.json"
printf '{"name":"no-engines"}\n' >"$NODE_FIXTURES/no-engines.package.json"

run_case pass "node contract: matching declarations" \
  node scripts/ci/check-node-version.mjs \
  "$NODE_FIXTURES/agree.nvmrc" "$NODE_FIXTURES/agree.package.json"
run_case fail "node contract: .nvmrc and engines disagree" \
  node scripts/ci/check-node-version.mjs \
  "$NODE_FIXTURES/drift.nvmrc" "$NODE_FIXTURES/drift.package.json"
if ! grep -Fq 'declared versions disagree' "$LOG_DIR/case-$CASES.log"; then
  echo "FAIL: the node guard refused for a reason other than declaration drift."
  sed -n '1,8p' "$LOG_DIR/case-$CASES.log"
  PROBLEMS=$((PROBLEMS + 1))
fi
run_case fail "node contract: missing engines.node" \
  node scripts/ci/check-node-version.mjs \
  "$NODE_FIXTURES/agree.nvmrc" "$NODE_FIXTURES/no-engines.package.json"

printf '\n'
if [[ "$PROBLEMS" -gt 0 ]]; then
  printf 'FAIL: %d of %d negative control(s) did not behave as required.\n' "$PROBLEMS" "$CASES"
  exit 1
fi

printf 'PASS: all %d negative controls fired as required.\n' "$CASES"
printf 'NOTE: dist/ now holds a demo artifact. Run `npm run build` before deploying;\n'
printf '      the production gate rejects a demo artifact regardless.\n'
