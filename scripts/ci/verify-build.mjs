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
 * When the build ran with VITE_DATA_MODE=supabase:
 *   - the Supabase client is present (the bundle is not demo-only)
 *   - the demo-access marker is absent
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

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

if (corpus.includes('your-project-ref')) {
  fail('bundle contains the placeholder Supabase host "your-project-ref".');
}

if (corpus.includes('sb_publishable_your_key_here')) {
  fail('bundle contains the placeholder Supabase key.');
}

if (/service_role/i.test(corpus)) {
  fail('bundle contains a service_role marker. A service-role key must never reach the browser.');
}

const imageAssets = files.filter((file) => /\/assets\/.*\.(jpe?g|png|webp|avif|gif)$/i.test(file));
if (imageAssets.length === 0) {
  fail('no bundled image assets were emitted under dist/assets.');
}

const mode = process.env.VITE_DATA_MODE;
if (mode === 'supabase') {
  if (!/GoTrueClient|createClient/.test(corpus)) {
    fail('VITE_DATA_MODE=supabase build does not include the Supabase client.');
  }
  if (corpus.includes('DEMO_ACCESS_MARKER')) {
    fail('production build still contains the demo access marker.');
  }
}

if (failures.length > 0) {
  console.error(`FAIL: ${failures.length} build artifact assertion(s) failed.`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  `PASS: ${files.length} build files, ${imageAssets.length} hashed image assets, no dev-only or placeholder artifacts.`
);
