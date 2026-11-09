#!/usr/bin/env node
/**
 * Run read-only pg_dump or row-count verification against SOURCE_DB_URL.
 * Connection values travel to Docker through the process environment, not argv.
 */
import { spawnSync } from 'node:child_process';

const TABLES = [
  'ateliers',
  'members',
  'lookbook_items',
  'orders',
  'order_financials',
  'order_progress_notes',
  'measurements',
  'appointments',
  'feedback',
  'audit_log',
  'invitations',
  'booking_resources',
  'resource_availability_rules',
  'blackout_dates',
  'bookings',
  'idempotency_keys',
];

const operation = process.argv[2];
if (!['dump', 'counts'].includes(operation)) {
  console.error('usage: source-db.mjs <dump|counts>');
  process.exit(2);
}

let connection;
try {
  const parsed = new URL(process.env.SOURCE_DB_URL ?? '');
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) throw new Error();
  connection = {
    PGHOST: parsed.hostname,
    PGPORT: parsed.port || '5432',
    PGUSER: decodeURIComponent(parsed.username),
    PGPASSWORD: decodeURIComponent(parsed.password),
    PGDATABASE: decodeURIComponent(parsed.pathname.replace(/^\/+/, '')),
    PGSSLMODE: parsed.searchParams.get('sslmode') ?? 'prefer',
  };
} catch {
  console.error('ERROR: SOURCE_DB_URL must be a PostgreSQL connection URL.');
  process.exit(2);
}

if (
  !connection.PGHOST ||
  !connection.PGUSER ||
  !connection.PGPASSWORD ||
  !connection.PGDATABASE ||
  !['disable', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full'].includes(connection.PGSSLMODE)
) {
  console.error('ERROR: SOURCE_DB_URL is missing a required PostgreSQL connection field.');
  process.exit(2);
}

const args = [
  'run',
  '--rm',
  ...Object.keys(connection).flatMap((key) => ['-e', key]),
  'postgres:16',
];

if (operation === 'dump') {
  args.push('pg_dump', '--no-owner');
} else {
  const query = TABLES.map(
    (table) => `SELECT '${table}' || '|' || count(*)::text FROM public."${table}"`,
  ).join(' UNION ALL ');
  args.push(
    'psql',
    '-X',
    '-A',
    '-t',
    '-q',
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    query,
  );
}

const result = spawnSync('docker', args, {
  env: { ...process.env, ...connection },
  encoding: 'utf8',
  stdio: operation === 'dump' ? 'inherit' : ['ignore', 'pipe', 'inherit'],
});

if (result.error || result.status !== 0) {
  console.error(`ERROR: source database ${operation} failed.`);
  process.exit(result.status ?? 1);
}
if (operation === 'counts') process.stdout.write(result.stdout);
