#!/usr/bin/env node
/**
 * Refuse a credential-shaped variable NAME that would be published to browsers.
 *
 * Vite inlines every `VITE_` value into the client bundle, and other bundlers do
 * the same for `NEXT_PUBLIC_` and `REACT_APP_`. A database password named
 * `VITE_SUPABASE_PASSWORD` is therefore not a private setting with an unlucky
 * prefix: it ships to every visitor the moment any code reads it.
 *
 * The check is deliberately **name-based**. Proving that a secret is about to be
 * published must never require reading the secret, so this module never parses a
 * value — only variable names.
 *
 * One implementation, three boundaries:
 *   1. `vite.pilot.config.ts` (the supported build) at config time.
 *   2. `vite.config.ts` (the legacy root config) at config time.
 *   3. `scripts/ci/verify-build.mjs` at the deploy boundary, so a second build
 *      config cannot bypass a guard that only lives in the first one.
 *
 * CLI: `node scripts/ci/env-guard.mjs` prints offending names only and exits 1.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Any variable with one of these prefixes is inlined into a browser bundle. */
export const PUBLIC_NAME_PREFIX = /^(VITE_|NEXT_PUBLIC_|REACT_APP_)/;

/**
 * A name that describes a credential, matched after the public prefix is
 * stripped. The set is the union of both configs this guard replaces: a name
 * that either guard would have refused must still be refused here.
 */
export const SECRET_NAME_TOKENS =
  /(PASSWORD|PASSPHRASE|SECRET|SERVICE_ROLE|SERVICE_KEY|PRIVATE_KEY|ACCESS_KEY|CREDENTIAL|TOKEN|DATABASE_URL|DATABASE|POSTGRES|_DB_URL)/i;

/** True when `name` would be inlined into a browser bundle and looks like a secret. */
export function isPublishedSecretName(name) {
  if (typeof name !== 'string' || !PUBLIC_NAME_PREFIX.test(name)) return false;
  return SECRET_NAME_TOKENS.test(name.replace(PUBLIC_NAME_PREFIX, ''));
}

/**
 * Kept as an alias because the earlier controls import it. Covers every public
 * prefix, not only `VITE_`.
 */
export const isForbiddenViteName = isPublishedSecretName;

/** Return the sorted, de-duplicated offending names in `names`. */
export function findForbiddenViteNames(names) {
  return [...new Set(names.filter(isPublishedSecretName))].sort();
}

const ENV_ASSIGNMENT = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/;

/** Read only the variable NAMES declared by an env file. Values are never parsed. */
export function readEnvFileNames(file) {
  const names = [];
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(ENV_ASSIGNMENT);
    if (match) names.push(match[1]);
  }
  return names;
}

/** Every `.env*` file in `rootDir`, excluding directories that can hold a copy. */
export function findEnvFiles(rootDir) {
  return readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.startsWith('.env'))
    .map((entry) => join(rootDir, entry.name));
}

/**
 * Collect offending names from the process environment and every `.env*` file.
 *
 * Every file is read regardless of the active mode on purpose: a `.env.production`
 * is a likelier carrier than `.env.local`, and refusing a name that the current
 * mode would not have loaded is fail-closed, not a false positive.
 *
 * `env` is injectable so a control can prove the guard without mutating
 * `process.env`, and `rootDir` can point at a fixture directory.
 */
export function collectForbiddenViteNames({ rootDir, env = process.env } = {}) {
  const names = [...Object.keys(env)];
  for (const file of findEnvFiles(rootDir)) {
    names.push(...readEnvFileNames(file));
  }
  return findForbiddenViteNames(names);
}

/**
 * Throw when a credential-shaped published name is present. Never prints a value,
 * only the offending names — so a failure log cannot leak what it refused.
 */
export function assertNoPublishedSecrets({
  rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..'),
  env,
} = {}) {
  const forbidden = collectForbiddenViteNames({ rootDir, env });
  if (forbidden.length > 0) {
    throw new Error(
      [
        'Refusing to build: these variables look like credentials but carry a public prefix,',
        'so the bundler would inline them into the browser bundle:',
        ...forbidden.map((name) => `  - ${name}`),
        '',
        'Move the value to ~/.config/stitchflow/ops.env (mode 600) and delete it from every',
        '.env* file. Browser configuration may hold a publishable key, never a password,',
        'token, service-role key, or database URL.',
        'See docs/runbooks/agent-operating-guide.md.',
      ].join('\n'),
    );
  }
}

/** Alias for callers that phrase the refusal as "forbidden names". */
export const assertNoForbiddenViteNames = assertNoPublishedSecrets;

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const envFiles = findEnvFiles(rootDir);
  const forbidden = collectForbiddenViteNames({ rootDir });
  if (forbidden.length > 0) {
    console.error(
      `FAIL: ${forbidden.length} credential-shaped public variable name(s) would be published:`,
    );
    for (const name of forbidden) console.error(`  - ${name}`);
    console.error(
      'A VITE_/NEXT_PUBLIC_/REACT_APP_ value is inlined into the browser bundle. Rename the ' +
        'variable without the public prefix and keep the value server-side.',
    );
    process.exit(1);
  }
  console.log(
    `PASS: no credential-shaped public variable names in the process environment or ${envFiles.length} .env file(s).`,
  );
}
