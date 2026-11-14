#!/usr/bin/env node
/**
 * Detect a live secret inside a built artifact.
 *
 * `docs/security.md` promises that no service-role key, database password, or
 * Supabase secret key reaches a deployable artifact. This scanner enforces that
 * promise against the artifact itself, not against the source that produced it.
 *
 * Three shapes are detected:
 *   1. `sbp_…` — a Supabase secret key.
 *   2. `postgres(ql)://user:password@host` — a database URI with an embedded
 *      password. Placeholder shapes (`<password>`, `${PASSWORD}`, `***`, …) are
 *      ignored so an instructional string does not fail a real build.
 *   3. A JWT whose decoded payload carries `role: "service_role"`. This cannot
 *      be caught by a plain-text search because the payload is base64url.
 *
 * A finding reports the pattern id and the file:line only. The matched value is
 * never printed, so a scanner run cannot itself leak the secret it found.
 *
 * CLI: `node scripts/ci/secret-scan.mjs [path …]` (default: `dist`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEXT_EXTENSIONS = new Set([
  '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.html', '.htm', '.css',
  '.json', '.map', '.svg', '.txt', '.yml', '.yaml', '.xml', '.webmanifest',
]);

const SUPABASE_SECRET_KEY = /\bsbp_[A-Za-z0-9]{20,}\b/;
const DATABASE_URI = /postgres(?:ql)?:\/\/[^\s"'`<>]+:[^\s"'`<>@]+@/g;
const JWT = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}\b/g;

/**
 * Placeholder passwords that legitimately appear in instructional text.
 * Kept narrow on purpose: a bare `password` is NOT treated as a placeholder,
 * because an artifact has no reason to contain any database URI at all.
 */
const PLACEHOLDER_PASSWORD =
  /^(<[^>]*>|\$\{[^}]*\}|\*+|[xX]{4,}|changeme|your[-_]?password|USER|PASSWORD|DB_PASSWORD)$/;

function looksLikePlaceholder(uri) {
  const match = uri.match(/^postgres(?:ql)?:\/\/([^:]+):([^@]*)@/);
  if (!match) return true;
  return PLACEHOLDER_PASSWORD.test(match[2]);
}

/** Decode a base64url JWT payload without verifying it. Returns null on garbage. */
function decodeJwtPayload(token) {
  const payload = token.split('.')[1];
  if (!payload) return null;
  const normalised = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalised + '='.repeat((4 - (normalised.length % 4)) % 4);
  try {
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

function isServiceRoleJwt(token) {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload !== 'object') return false;
  return payload.role === 'service_role';
}

/**
 * Scan one text blob. Returns findings of the form `{ pattern, line }`.
 * Line is 1-based; the matched text is intentionally not returned.
 */
export function scanText(text) {
  const findings = [];
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    if (SUPABASE_SECRET_KEY.test(line)) {
      findings.push({ pattern: 'supabase-secret-key', line: lineNumber });
    }

    for (const match of line.matchAll(DATABASE_URI)) {
      if (!looksLikePlaceholder(match[0])) {
        findings.push({ pattern: 'database-uri-with-password', line: lineNumber });
      }
    }

    for (const match of line.matchAll(JWT)) {
      if (isServiceRoleJwt(match[0])) {
        findings.push({ pattern: 'service_role-jwt', line: lineNumber });
      }
    }
  });

  return findings;
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (TEXT_EXTENSIONS.has(extname(entry.name))) out.push(full);
  }
  return out;
}

/** Scan files and directories. Returns `{ findings, scanned }`. */
export function scanPaths(paths) {
  const findings = [];
  let scanned = 0;

  for (const target of paths) {
    let files;
    try {
      files = statSync(target).isDirectory() ? walk(target) : [target];
    } catch {
      continue;
    }
    for (const file of files) {
      if (!TEXT_EXTENSIONS.has(extname(file))) continue;
      scanned += 1;
      for (const finding of scanText(readFileSync(file, 'utf8'))) {
        findings.push({ ...finding, file });
      }
    }
  }

  return { findings, scanned };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const args = process.argv.slice(2);
  const targets = (args.length > 0 ? args : [join(rootDir, 'dist')]).map((p) => resolve(p));
  const { findings, scanned } = scanPaths(targets);

  if (findings.length > 0) {
    console.error(`FAIL: ${findings.length} secret-shaped value(s) inside ${scanned} artifact file(s).`);
    for (const finding of findings) {
      console.error(`  - ${finding.pattern} at ${relative(process.cwd(), finding.file)}:${finding.line}`);
    }
    process.exit(1);
  }

  console.log(`PASS: no secret-shaped values in ${scanned} artifact file(s).`);
}
