#!/usr/bin/env node
/**
 * Assert the production artifacts do not contain dev-only or placeholder content.
 * Scans the client bundle AND the server bundle (SSR output).
 *
 * Always checked: hashed client JS and an image asset are emitted, no literal
 * /src/assets/ path, no placeholder Supabase host/key, no service_role marker,
 * no bolt.new placeholder share image, server bundle exists.
 *
 * When built with VITE_DATA_MODE=supabase: the Supabase client and the runtime
 * guards are present, and no demo-only identity or credential string exists in
 * ANY scanned artifact.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CLIENT = join(ROOT, 'dist', 'client');
const SERVER = join(ROOT, 'dist', 'server');
const failures = [];
const fail = (message) => failures.push(message);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

if (!existsSync(CLIENT)) {
  console.error('FAIL: dist/client does not exist. Run `npm run build` first.');
  process.exit(1);
}
if (!existsSync(SERVER)) fail('dist/server does not exist; the SSR server bundle was not built.');

const scanDirs = [CLIENT, SERVER, join(ROOT, '.netlify', 'v1', 'functions')].filter(existsSync);
console.log(`Scanning: ${scanDirs.map((d) => d.replace(ROOT + '/', '')).join(', ')}`);

const files = scanDirs.flatMap((dir) => walk(dir));
const clientFiles = walk(CLIENT);
const textExtensions = new Set(['.html', '.js', '.mjs', '.cjs', '.css', '.json', '.svg']);
const corpus = files
  .filter((file) => textExtensions.has(extname(file)))
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n');

if (!clientFiles.some((file) => /\/assets\/[^/]+\.js$/.test(file))) {
  fail('no hashed JavaScript asset was emitted under dist/client/assets.');
}
if (corpus.includes('/src/assets/')) fail('artifacts contain a literal /src/assets/ path; an image import was not rewritten.');
if (corpus.includes('https://your-project-ref.supabase.co')) fail('artifacts contain the placeholder Supabase host "your-project-ref".');
if (corpus.includes('sb_publishable_your_key_here')) fail('artifacts contain the placeholder Supabase key.');
if (/service_role/i.test(corpus)) fail('artifacts contain a service_role marker. A service-role key must never reach a client or server bundle.');
if (corpus.includes('bolt.new/static/og_default')) fail('artifacts contain the bolt.new placeholder share image.');

const imageAssets = clientFiles.filter((file) => /\/assets\/.*\.(jpe?g|png|webp|avif|gif)$/i.test(file));
if (imageAssets.length === 0) fail('no bundled image assets were emitted under dist/client/assets.');

if (process.env.VITE_DATA_MODE === 'supabase') {
  if (!/GoTrueClient|createClient/.test(corpus)) fail('VITE_DATA_MODE=supabase build does not include the Supabase client.');
  if (!corpus.includes('Demo role sign-in is disabled in production')) fail('production build is missing the guard that refuses demo role sign-in.');
  if (!corpus.includes('Reset is a demo-only action')) fail('production build is missing the guard that refuses demo-only reset.');
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
  ]) {
    if (corpus.includes(forbidden)) fail(`production artifacts still contain demo-only content: ${forbidden}`);
  }
}

if (failures.length > 0) {
  console.error(`FAIL: ${failures.length} artifact assertion(s) failed.`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`PASS: ${files.length} artifact files scanned, ${imageAssets.length} hashed image assets, no dev-only or placeholder content.`);