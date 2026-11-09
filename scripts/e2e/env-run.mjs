#!/usr/bin/env node
/**
 * Load dotenv-style files, then run a command with that environment.
 *
 * Usage:
 *   node scripts/e2e/env-run.mjs .env.test .env.test.local -- npx playwright test
 *
 * Later files win, and a value already present in the real environment always
 * wins over a file. Doing this in Node rather than `source` keeps values with
 * spaces, `&`, or `!` intact and keeps shell history expansion out of the path.
 * Nothing here prints a value.
 */
import { existsSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';

const argv = process.argv.slice(2);
const separator = argv.indexOf('--');

if (separator < 0 || separator === argv.length - 1) {
  console.error('usage: env-run.mjs <env-file>... -- <command> [args...]');
  process.exit(2);
}

const files = argv.slice(0, separator);
const [command, ...commandArgs] = argv.slice(separator + 1);
const fixtureCredentialsJson = process.env.STITCHFLOW_E2E_CREDENTIALS_JSON;
delete process.env.STITCHFLOW_E2E_CREDENTIALS_JSON;

let fixtureCredentials = {};
if (fixtureCredentialsJson) {
  try {
    fixtureCredentials = JSON.parse(fixtureCredentialsJson);
  } catch {
    console.error('env-run: generated local fixture credentials were not valid JSON.');
    process.exit(2);
  }
  const allowedCredentialKeys = new Set([
    'STITCHFLOW_E2E_OWNER_PASSWORD',
    'STITCHFLOW_E2E_EMPLOYEE_PASSWORD',
    'STITCHFLOW_E2E_PATRON_PASSWORD',
    'STITCHFLOW_E2E_PASSWORD',
  ]);
  if (
    !fixtureCredentials ||
    typeof fixtureCredentials !== 'object' ||
    Array.isArray(fixtureCredentials) ||
    Object.entries(fixtureCredentials).some(
      ([key, value]) => !allowedCredentialKeys.has(key) || typeof value !== 'string',
    )
  ) {
    console.error('env-run: generated local fixture credentials had an unexpected shape.');
    process.exit(2);
  }
}

function parseEnv(text) {
  const parsed = {};
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    parsed[match[1]] = value;
  }
  return parsed;
}

const merged = {};
for (const file of files) {
  if (!existsSync(file)) {
    console.error(`env-run: ${file} does not exist.`);
    process.exit(2);
  }
  Object.assign(merged, parseEnv(readFileSync(file, 'utf8')));
}

for (const [key, value] of Object.entries(merged)) {
  if (process.env[key] === undefined) process.env[key] = value;
}
Object.assign(process.env, fixtureCredentials);

// Opt-in guard for the hermetic suite: the merged configuration must point at a
// loopback stack before a single test runs. Catches a stale or hostile ambient
// environment that survived the caller's own scrubbing.
if (process.env.STITCHFLOW_ENV_REQUIRE_LOOPBACK === '1') {
  const url = process.env.VITE_SUPABASE_URL ?? '';
  if (!/^http:\/\/(127\.0\.0\.1|localhost):\d{2,5}\/?$/.test(url)) {
    console.error(
      `env-run: STITCHFLOW_ENV_REQUIRE_LOOPBACK=1 but VITE_SUPABASE_URL is "${url || '(unset)'}". ` +
        'Refusing to run against a non-loopback project.',
    );
    process.exit(2);
  }
}

const child = spawn(command, commandArgs, { stdio: 'inherit', env: process.env });
child.on('error', (error) => {
  console.error(`env-run: failed to start ${command}: ${error.message}`);
  process.exit(127);
});
child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`env-run: ${command} terminated by ${signal}.`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});
