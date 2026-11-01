#!/usr/bin/env node
/**
 * Fail on broken relative Markdown links.
 *
 * Scope: every .md file in the repository except generated/vendor trees.
 * Ignored: http(s), mailto, tel, protocol-relative, pure anchors.
 * A link with an anchor or query is checked against its path portion.
 *
 * This is a content-integrity gate, not a claim that documentation is correct.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.venv', 'coverage', '.next', '.output']);
const SKIP_PATHS = new Set(['supabase/.temp']);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    const rel = relative(ROOT, full);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      if ([...SKIP_PATHS].some((p) => rel === p || rel.startsWith(`${p}/`))) continue;
      walk(full, out);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      out.push(full);
    }
  }
  return out;
}

function stripFences(text) {
  const lines = text.split(/\r?\n/);
  let inFence = false;
  let fenceMarker = '';
  return lines
    .map((line) => {
      const match = line.match(/^\s*(```+|~~~+)/);
      if (match) {
        if (!inFence) {
          inFence = true;
          fenceMarker = match[1][0];
        } else if (match[1][0] === fenceMarker) {
          inFence = false;
        }
        return '';
      }
      return inFence ? '' : line;
    })
    .join('\n');
}

const LINK_RE = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const failures = [];
let checked = 0;

for (const file of walk(ROOT)) {
  const text = stripFences(readFileSync(file, 'utf8'));
  let match;
  while ((match = LINK_RE.exec(text)) !== null) {
    let target = match[1].trim();
    if (!target) continue;
    if (/^(https?:|mailto:|tel:|data:|#|\/\/)/i.test(target)) continue;

    target = target.replace(/^<|>$/g, '');
    target = target.split('#')[0].split('?')[0];
    if (!target) continue;

    const base = target.startsWith('/') ? ROOT : dirname(file);
    const resolved = resolve(base, target.replace(/^\//, ''));
    checked += 1;

    if (!existsSync(resolved)) {
      failures.push({
        file: relative(ROOT, file),
        target,
      });
    }
  }
}

if (failures.length > 0) {
  console.error(`FAIL: ${failures.length} broken relative link(s) across ${checked} checked.`);
  for (const failure of failures) {
    console.error(`  ${failure.file} -> ${failure.target}`);
  }
  process.exit(1);
}

console.log(`PASS: ${checked} relative Markdown links resolve across ${walk(ROOT).length} files.`);
