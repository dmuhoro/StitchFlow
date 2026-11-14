#!/usr/bin/env node
/**
 * Assert the production bundle does not contain dev-only or placeholder artifacts.
 *
 * Always checked:
 *   - dist/index.html exists and references a hashed asset
 *   - no literal /src/assets/ path (Vite must rewrite imports)
 *   - no placeholder Supabase host or key
 *   - no service-role key marker
 *   - at least one bundled image asset is emitted
 *
 * When the build ran with VITE_DATA_MODE=supabase, or when Netlify reports a
 * production deploy context:
 *   - the Supabase client is present (the bundle is not demo-only)
 *   - the runtime guards that refuse demo sign-in and demo reset are present
 *   - no demo identity, PIN, credential card, slug, or lookbook copy is present
 *
 * When the deploy context is production (Netlify sets CONTEXT=production,
 * Vercel sets VERCEL_ENV=production):
 *   - VITE_DATA_MODE must be supabase; a demo-mode production deploy FAILS
 *   - VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be configured, non-placeholder values
 *
 * This runs as `postbuild`, so the deploy boundary itself fails closed. It is
 * not enough for CI to run a separate assertion that a misconfigured deploy can
 * skip.
 *
 * Independently of the deploy context, every emitted artifact is also:
 *   - name-checked for a credential-shaped published variable, and
 *   - scanned for a live `sbp_` key, a database URI with an embedded password,
 *     and a `service_role` JWT (the payload is base64url, so a plain text search
 *     is not enough).
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectForbiddenViteNames, findEnvFiles } from './env-guard.mjs';
import { scanPaths } from './secret-scan.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DIST = join(ROOT, 'dist');
const failures = [];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function fail(message) {
  failures.push(message);
}

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('FAIL: dist/index.html does not exist. Run `npm run build` first.');
  process.exit(1);
}

const files = walk(DIST);
const textExtensions = new Set(['.html', '.js', '.css', '.json', '.svg']);
const textFiles = files.filter((file) => textExtensions.has(extname(file)));
const corpus = textFiles.map((file) => readFileSync(file, 'utf8')).join('\n');

const indexHtml = readFileSync(join(DIST, 'index.html'), 'utf8');
if (!/<script[^>]+src="[^"]*\/assets\/[^"]+\.js"/.test(indexHtml)) {
  fail('index.html does not reference a hashed JavaScript asset.');
}

if (corpus.includes('/src/assets/')) {
  fail('bundle contains a literal /src/assets/ path; an image import was not rewritten.');
}

if (corpus.includes('https://your-project-ref.supabase.co')) {
  fail('bundle contains the placeholder Supabase host "your-project-ref".');
}

if (corpus.includes('sb_publishable_your_key_here')) {
  fail('bundle contains the placeholder Supabase key.');
}

if (/service_role/i.test(corpus)) {
  fail('bundle contains a service_role marker. A service-role key must never reach the browser.');
}

// --- published secrets: name guard ------------------------------------------
// Vite inlines every `VITE_*` value into the browser bundle, so a credential
// with that prefix is a credential that ships. Both Vite configs refuse this at
// config time, but a gate that lives in one config can be bypassed by a second
// config, so the deploy gate re-checks the invariant independently. Name-based
// on purpose: refusing to publish a secret must never require reading it.
const envFiles = findEnvFiles(ROOT);
const forbiddenNames = collectForbiddenViteNames({ rootDir: ROOT });
if (forbiddenNames.length > 0) {
  fail(
    `${forbiddenNames.length} credential-shaped public variable name(s) are present in the ` +
      `process environment or one of ${envFiles.length} .env file(s): ${forbiddenNames.join(', ')}. ` +
      'A VITE_ value is inlined into the browser bundle; rename it without the public prefix ' +
      'and keep the value server-side.'
  );
}

// --- published secrets: artifact scan (client AND server) -------------------
// The name guard cannot see a credential pasted straight into source, and a
// service_role JWT is base64url, so a plain text search misses it. Scan the
// emitted artifacts themselves. Server roots are listed even when absent so the
// same gate keeps working after a serverless function directory is added.
const SERVER_ARTIFACT_ROOTS = [
  join(ROOT, 'api'),
  join(ROOT, 'netlify/functions'),
  join(ROOT, '.vercel/output/functions'),
  join(ROOT, 'server.js'),
];
const scanRoots = [DIST, ...SERVER_ARTIFACT_ROOTS.filter((candidate) => existsSync(candidate))];
const { findings, scanned: scannedArtifacts } = scanPaths(scanRoots);
for (const finding of findings) {
  fail(
    `${finding.pattern} at ${relative(ROOT, finding.file)}:${finding.line}. ` +
      'A live credential must never be emitted into a deployable artifact.'
  );
}

const imageAssets = files.filter((file) => /\/assets\/.*\.(jpe?g|png|webp|avif|gif)$/i.test(file));
if (imageAssets.length === 0) {
  fail('no bundled image assets were emitted under dist/assets.');
}

const mode = process.env.VITE_DATA_MODE;
const productionContext = [
  process.env.CONTEXT,
  process.env.NETLIFY_CONTEXT,
  process.env.VERCEL_ENV,
  process.env.STITCHFLOW_DEPLOY_CONTEXT,
].some((value) => value === 'production');
const enforceProductionArtifact = mode === 'supabase' || productionContext;

// The hermetic browser suite builds the real Supabase-mode bundle against a
// disposable loopback stack. It must still be scanned for demo artifacts, but it
// cannot carry a hosted project ref. This exception is narrow on purpose:
//   - it is opt-in and named,
//   - it is ignored during a production deploy context,
//   - it only accepts a loopback URL.
// Anything else fails, so it cannot be used to relax a production build.
const localSupabaseBuild =
  !productionContext && process.env.STITCHFLOW_LOCAL_SUPABASE_BUILD === '1';

if (localSupabaseBuild) {
  const url = process.env.VITE_SUPABASE_URL ?? '';
  if (!/^http:\/\/(127\.0\.0\.1|localhost):\d{2,5}\/?$/.test(url)) {
    fail(
      `STITCHFLOW_LOCAL_SUPABASE_BUILD=1 requires a loopback VITE_SUPABASE_URL, got "${url || '(unset)'}". ` +
        'This flag must never be used for a hosted build.'
    );
  }
}

const enforceHostedProjectRefs = enforceProductionArtifact && !localSupabaseBuild;

if (productionContext) {
  if (mode !== 'supabase') {
    fail(
      `production deploy built with VITE_DATA_MODE=${mode ?? '(unset)'}; it must be "supabase". ` +
        'A demo-mode production bundle contains demo identities and the demo PIN.'
    );
  }
  const url = process.env.VITE_SUPABASE_URL ?? '';
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url) || /your-project|example|localhost|127\.0\.0\.1/i.test(url)) {
    fail('production deploy needs a configured VITE_SUPABASE_URL (https://<ref>.supabase.co), not a placeholder.');
  }
  if (!key || key.length < 20 || /your_key_here|local_verification_only|placeholder|example/i.test(key)) {
    fail('production deploy needs a configured VITE_SUPABASE_PUBLISHABLE_KEY, not a placeholder.');
  }
}

if (enforceProductionArtifact) {
  if (!/GoTrueClient|createClient/.test(corpus)) {
    fail('production build does not include the Supabase client.');
  }

  // Compare the project refs actually embedded in the bundle with the ref the
  // build was supposed to use. Without this, a stale `.env.local` or a reused
  // `dist/` can ship a bundle pointed at a different backend while every other
  // assertion still passes.
  const artifactRefs = [...new Set(
    [...corpus.matchAll(/https:\/\/([a-z0-9-]+)\.supabase\.co/g)].map((match) => match[1])
  )];
  const configuredRef = /^https:\/\/([a-z0-9-]+)\.supabase\.co\/?$/.exec(
    process.env.VITE_SUPABASE_URL ?? ''
  )?.[1];

  let linkedRef = null;
  try {
    linkedRef = readFileSync(join(ROOT, 'supabase/.temp/project-ref'), 'utf8').trim() || null;
  } catch {
    linkedRef = null;
  }

  if (enforceHostedProjectRefs) {
    if (artifactRefs.length === 0) {
      fail('production build does not embed a Supabase project URL.');
    }
    if (artifactRefs.length > 1) {
      fail(`production build embeds multiple Supabase project refs: ${artifactRefs.join(', ')}.`);
    }
    if (artifactRefs.includes('vpathqzkaqdtbykumxeo')) {
      fail('production build still targets the retired Supabase project.');
    }
    if (configuredRef && !artifactRefs.includes(configuredRef)) {
      fail(
        `production build embeds Supabase project(s) ${artifactRefs.join(', ')} but ` +
          `VITE_SUPABASE_URL names ${configuredRef}; rebuild with the deployed environment.`
      );
    }
    if (linkedRef && !artifactRefs.includes(linkedRef)) {
      fail(
        `production build does not embed the linked project ref ${linkedRef}; ` +
          `it embeds ${artifactRefs.join(', ') || '(none)'}.`
      );
    }
  }

  if (!corpus.includes('Demo role sign-in is disabled in production')) {
    fail('production build is missing the runtime guard that refuses demo role sign-in.');
  }
  if (!corpus.includes('Reset is a demo-only action')) {
    fail('production build is missing the runtime guard that refuses demo-only reset.');
  }
  for (const forbidden of [
    'Demo PIN: 1234',
    'Authorized Credential Cards',
    'Wanjiku Kamau',
    'stitchflow-nairobi',
    'asooke-lagos',
    'Demo role gate',
    'StitchFlow Atelier Nairobi',
    'Aso-Oke Heritage House Lagos',
    'Kenyan Coastal Kikoy & East African Heritage',
    'PILOT-A-001',
    'PILOT-A-002',
    'PILOT-B-001',
    'PILOT-EMP-A-9F3K',
  ]) {
    if (corpus.includes(forbidden)) fail(`production build still contains demo-only artifact: ${forbidden}`);
  }
}

if (failures.length > 0) {
  console.error(`FAIL: ${failures.length} build artifact assertion(s) failed.`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  `PASS: ${files.length} build files, ${imageAssets.length} hashed image assets, ` +
    `${scannedArtifacts} artifact file(s) secret-scanned across ${scanRoots.length} root(s), ` +
    `${envFiles.length} .env file(s) name-checked, no dev-only or placeholder artifacts.`
);
