#!/usr/bin/env node
/**
 * Negative controls for the publication guards.
 *
 * A gate that has never been observed rejecting something is decoration. Each
 * control below feeds a guard the exact failure it exists to catch and asserts
 * that it fires; a control that cannot fail proves nothing.
 *
 * Covered:
 *   1. A credential-shaped VITE_ name in the process environment is refused.
 *   2. The same name declared in an `.env*` file is refused (file path, not just
 *      process env — a `.env.production` is the likelier carrier).
 *   3. Legitimate public names pass, and so does a credential name that does not
 *      carry the public prefix (it is not inlined, so it is not a defect).
 *   4. A `sbp_` secret key inside an artifact is detected.
 *   5. A database URI with an embedded password is detected; placeholder shapes
 *      in instructional text are not (a false positive here would block a legit
 *      build and train people to bypass the gate).
 *   6. A JWT whose payload says `service_role` is detected even though the text
 *      is base64url; an `anon` JWT is not flagged.
 *   7. End to end: `verify-build` really exits non-zero with a planted secret in
 *      `dist/`, and exits zero once the fixture is removed.
 *   8. End to end: `verify-build` really exits non-zero when a credential-shaped
 *      VITE_ name is present in the build environment.
 *
 * No fixture value is ever printed, and every fixture is fabricated here (built
 * at run time from parts) so this file contains no token-shaped literal that a
 * repository scanner would flag.
 *
 * CLI: `npm run verify:secret-guard`
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectForbiddenViteNames, findForbiddenViteNames } from './env-guard.mjs';
import { scanText } from './secret-scan.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DIST = join(ROOT, 'dist');
const VERIFY_BUILD = join(ROOT, 'scripts/ci/verify-build.mjs');

// A developer shell can export the hosted configuration, which changes what
// "the genuine artifact passes" means and makes a control non-deterministic. The
// bash suite strips the same variables; do it here too. Every control that needs
// one of them sets it explicitly.
for (const name of [
  'VITE_DATA_MODE',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'VITE_SUPABASE_PASSWORD',
  'VITE_POSTGRESQL_URL',
  'VITE_SUPABASE_PERSONAL_ACCESS_TOKEN',
  'CONTEXT',
  'NETLIFY_CONTEXT',
  'VERCEL_ENV',
  'STITCHFLOW_DEPLOY_CONTEXT',
  'STITCHFLOW_LOCAL_SUPABASE_BUILD',
]) {
  delete process.env[name];
}

const results = [];
let problems = 0;

function control(name, run) {
  try {
    run();
    results.push(`PASS  ${name}`);
  } catch (error) {
    problems += 1;
    results.push(`FAIL  ${name}\n        ${error.message}`);
  }
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

/** Assert that `names` (a list) contains exactly `expected`. */
function expectNames(names, expected, label) {
  const actual = [...names].sort().join(', ');
  const want = [...expected].sort().join(', ');
  expect(actual === want, `${label}: expected [${want || 'none'}], got [${actual || 'none'}]`);
}

// ---------------------------------------------------------------------------
// Fixtures. Every one is fabricated at run time from parts so this file holds
// no token-shaped literal, and none of them can authenticate anywhere.
// ---------------------------------------------------------------------------
const FAKE_SBP_TOKEN = 'sbp_' + 'x'.repeat(40);
const fakeJwt = (payload) =>
  [
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify(payload)).toString('base64url'),
    's'.repeat(32),
  ].join('.');
const FAKE_SERVICE_ROLE_JWT = fakeJwt({ role: 'service_role', ref: 'negative-control' });
const FAKE_ANON_JWT = fakeJwt({ role: 'anon', ref: 'negative-control' });
const FAKE_DB_URI =
  'postgresql://' + 'probe' + ':' + 'notAReal' + 'Credential' + '@127.0.0.1:5432/probe';

const tmpRoot = mkdtempSync(join(tmpdir(), 'stitchflow-secret-guard-'));

try {
  // --- 1. process environment ------------------------------------------------
  control('credential-shaped VITE_ name in the process environment is refused', () => {
    const names = collectForbiddenViteNames({
      rootDir: tmpRoot,
      env: { VITE_DATA_MODE: 'supabase', VITE_SUPABASE_PASSWORD: 'x', PATH: '/usr/bin' },
    });
    expectNames(names, ['VITE_SUPABASE_PASSWORD'], 'env names');
  });

  control('each forbidden token is recognised in a VITE_ name', () => {
    const cases = [
      'VITE_SUPABASE_SECRET',
      'VITE_API_TOKEN',
      'VITE_API_PASSWORD',
      'VITE_SERVICE_ROLE_KEY',
      'VITE_DATABASE_URL',
      'VITE_FOO_DB_URL',
      'VITE_SSH_PRIVATE_KEY',
      'VITE_GITHUB_ACCESS_KEY',
    ];
    const names = findForbiddenViteNames(cases);
    expectNames(names, cases, 'token coverage');
  });

  // --- 3. no false positives -------------------------------------------------
  control('legitimate public names pass, and non-VITE_ credential names pass', () => {
    const names = collectForbiddenViteNames({
      rootDir: tmpRoot,
      env: {
        VITE_DATA_MODE: 'supabase',
        VITE_SUPABASE_URL: 'https://example.invalid',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_negative_control',
        SUPABASE_SERVICE_ROLE_KEY: 'server-side only',
        DATABASE_URL: 'server-side only',
        PATH: '/usr/bin',
      },
    });
    expectNames(names, [], 'allowed names');
  });

  // --- 2. env files ----------------------------------------------------------
  control('credential-shaped VITE_ name declared in an .env file is refused', () => {
    const dir = mkdtempSync(join(tmpRoot, 'env-'));
    writeFileSync(
      join(dir, '.env.production'),
      '# comment\nVITE_DATA_MODE=supabase\nexport VITE_SUPABASE_SERVICE_KEY=not-a-real-value\n'
    );
    expectNames(
      collectForbiddenViteNames({ rootDir: dir, env: {} }),
      ['VITE_SUPABASE_SERVICE_KEY'],
      '.env file names'
    );
  });

  control('.env file with only legitimate names passes', () => {
    const dir = mkdtempSync(join(tmpRoot, 'env-ok-'));
    writeFileSync(
      join(dir, '.env.test'),
      'VITE_DATA_MODE=supabase\nVITE_SUPABASE_URL=http://127.0.0.1:54321\n' +
        'VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_negative_control\n'
    );
    expectNames(collectForbiddenViteNames({ rootDir: dir, env: {} }), [], '.env allowed names');
  });

  // --- 4. sbp_ secret key ----------------------------------------------------
  control('sbp_ secret key inside an artifact is detected', () => {
    const findings = scanText(`const k = "${FAKE_SBP_TOKEN}";`);
    expect(findings.length === 1, `expected 1 finding, got ${findings.length}`);
    expect(findings[0].pattern === 'supabase-secret-key', `wrong pattern: ${findings[0].pattern}`);
    expect(findings[0].line === 1, `wrong line: ${findings[0].line}`);
  });

  control('a publishable key is not mistaken for an sbp_ secret key', () => {
    const findings = scanText('const k = "sb_publishable_negative_control";');
    expect(findings.length === 0, `expected 0 findings, got ${findings.length}`);
  });

  // --- 5. database URI ------------------------------------------------------
  control('database URI with an embedded password is detected', () => {
    const findings = scanText(`const url = "${FAKE_DB_URI}";`);
    expect(
      findings.some((f) => f.pattern === 'database-uri-with-password'),
      'database URI was not detected'
    );
  });

  control('placeholder database URIs are not flagged', () => {
    const text = [
      'postgresql://postgres:changeme@127.0.0.1:5432/postgres',
      'postgresql://USER:PASSWORD@HOST:5432/DATABASE',
      'postgresql://probe:***@example.invalid:5432/probe',
      'postgresql://probe:${DB_PASSWORD}@example.invalid:5432/probe',
    ].join('\n');
    const findings = scanText(text);
    expect(findings.length === 0, `expected 0 findings, got ${findings.length}`);
  });

  // --- 6. service_role JWT --------------------------------------------------
  control('JWT with role service_role is detected', () => {
    const findings = scanText(`Authorization: Bearer ${FAKE_SERVICE_ROLE_JWT}`);
    expect(
      findings.some((f) => f.pattern === 'service_role-jwt'),
      'service_role JWT was not detected'
    );
  });

  control('JWT with role anon is not flagged', () => {
    const findings = scanText(`Authorization: Bearer ${FAKE_ANON_JWT}`);
    expect(findings.length === 0, `expected 0 findings, got ${findings.length}`);
  });

  control('malformed JWT-shaped text does not crash the scanner', () => {
    const findings = scanText('eyJhbGciOiJIUzI1NiJ9.not-base64-not-json.zzzz');
    expect(findings.length === 0, `expected 0 findings, got ${findings.length}`);
  });

  // --- 7 and 8. end to end through the real deploy gate ---------------------
  const verifyBuild = (env) =>
    spawnSync(process.execPath, [VERIFY_BUILD], {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, ...env },
    });

  control('verify-build refuses an artifact that contains a planted secret key', () => {
    expect(
      existsSync(join(DIST, 'index.html')),
      'dist/index.html is missing; run `npm run build` before the controls'
    );
    const fixture = join(DIST, '__negative-control.js');
    writeFileSync(fixture, `export const planted = "${FAKE_SBP_TOKEN}";\n`);
    try {
      const run = verifyBuild({});
      expect(run.status !== 0, `verify-build exited 0 with a planted secret in ${relative(ROOT, fixture)}`);
      const output = `${run.stdout}${run.stderr}`;
      expect(
        output.includes('supabase-secret-key'),
        'verify-build failed but did not name the supabase-secret-key pattern'
      );
      expect(
        output.includes(relative(ROOT, fixture)),
        `verify-build did not name ${relative(ROOT, fixture)} in its failure`
      );
    } finally {
      rmSync(fixture, { force: true });
    }
  });

  control('verify-build passes again once the fixture is removed', () => {
    const run = verifyBuild({});
    expect(run.status === 0, `verify-build exited ${run.status} on the genuine artifact`);
  });

  control('verify-build refuses a credential-shaped VITE_ name in the build environment', () => {
    const run = verifyBuild({ VITE_SUPABASE_PASSWORD: 'not-a-real-value' });
    expect(run.status !== 0, 'verify-build exited 0 with a credential-shaped VITE_ name set');
    const output = `${run.stdout}${run.stderr}`;
    expect(
      output.includes('VITE_SUPABASE_PASSWORD'),
      'verify-build failed but did not name the offending variable'
    );
  });
} finally {
  rmSync(tmpRoot, { recursive: true, force: true });
}

for (const line of results) console.log(line);

const passed = results.length - problems;
if (problems > 0) {
  console.error(`\nFAIL: ${problems} of ${results.length} negative control(s) did not fire.`);
  process.exit(1);
}

console.log(`\nPASS: ${passed}/${results.length} negative controls fired as expected.`);
