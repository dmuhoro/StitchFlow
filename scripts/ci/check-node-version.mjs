#!/usr/bin/env node
/**
 * Node.js version contract.
 *
 * The runtime was declared and applied in three different places, and they
 * drifted: `.nvmrc` said 20, the Vercel project ran 26.x, and the only
 * deployment that is actually proven was built with 22.22.1. A build that runs
 * on an unproven runtime is not evidence.
 *
 * This guard proves the two declarations that live in the repository agree:
 *   `.nvmrc`               — what CI and developers install
 *   `package.json#engines` — what npm advertises to consumers of the tree
 *
 * It cannot read the Vercel project setting from the repository. That value is
 * recorded in `docs/runbooks/deployment.md` and must be kept equal by hand.
 *
 * A shell that runs a different major is reported. With `NODE_CONTRACT_STRICT=1`
 * it is a failure, so CI proves it installed the declared version instead of
 * merely assuming it.
 *
 * Exit codes: 0 declarations agree; 1 they disagree, a file cannot be read, or
 * (strict mode only) the running major differs from the declared major.
 *
 * Usage:
 *   node scripts/ci/check-node-version.mjs [nvmrcPath] [packageJsonPath]
 */
import { readFileSync } from 'node:fs';

const [, , nvmrcArg, packageArg] = process.argv;
const nvmrcPath = nvmrcArg ?? '.nvmrc';
const packagePath = packageArg ?? 'package.json';
const strict = process.env.NODE_CONTRACT_STRICT === '1';

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

// "22", "v22", "22.22.1", "^22.14.0", ">=22 <23" -> "22"
function majorOf(value) {
  const match = String(value).trim().replace(/^[v^~>=<\s]*/, '').match(/^(\d+)/);
  return match ? match[1] : null;
}

let nvmrcRaw;
let packageRaw;
try {
  nvmrcRaw = readFileSync(nvmrcPath, 'utf8');
} catch {
  fail(`cannot read ${nvmrcPath}`);
}
try {
  packageRaw = readFileSync(packagePath, 'utf8');
} catch {
  fail(`cannot read ${packagePath}`);
}

let manifest;
try {
  manifest = JSON.parse(packageRaw);
} catch {
  fail(`${packagePath} is not valid JSON`);
}

const declaredByNvmrc = majorOf(nvmrcRaw);
if (!declaredByNvmrc) fail(`${nvmrcPath} does not declare a Node.js major version`);

const engines = manifest.engines?.node;
if (!engines) fail(`${packagePath} has no engines.node declaration`);

const declaredByEngines = majorOf(engines);
if (!declaredByEngines) fail(`engines.node "${engines}" does not declare a Node.js major version`);

const runningMajor = process.versions.node.split('.')[0];

console.log(
  `Node.js contract: ${nvmrcPath}=${nvmrcRaw.trim()} engines.node=${engines} ` +
    `(declared major ${declaredByNvmrc}); running ${process.version}`,
);

if (declaredByNvmrc !== declaredByEngines) {
  fail(
    `declared versions disagree: ${nvmrcPath} wants major ${declaredByNvmrc}, ` +
      `engines.node wants major ${declaredByEngines}`,
  );
}

if (runningMajor !== declaredByNvmrc) {
  const message =
    `this shell runs Node.js ${runningMajor}, but the declared major is ${declaredByNvmrc}`;
  if (strict) fail(`${message}; install the declared version before building`);
  console.warn(`NOTE: ${message}. Builds are only proven on the declared version.`);
}

console.log('PASS: the tracked Node.js declarations agree.');
