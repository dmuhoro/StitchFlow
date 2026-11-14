#!/usr/bin/env node
/**
 * Run read-only pg_dump, row-count verification, or a reachability probe
 * against SOURCE_DB_URL. Connection values travel to Docker through the process
 * environment, not argv.
 *
 * `probe` exists because pg_dump runs inside the postgres:16 container, so
 * reachability and the credential must be proven from inside that container.
 * A source that cannot be reached is a missing precondition (exit 2), never
 * evidence that the restore gate rejected the data.
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
if (!['dump', 'counts', 'probe'].includes(operation)) {
  console.error('usage: source-db.mjs <dump|counts|probe>');
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
    // Bound the connect phase so an unreachable host fails with a classifiable
    // timeout instead of hanging on the OS default for minutes.
    PGCONNECT_TIMEOUT: '15',
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

// Never echo userinfo from a connection string, even if a tool happens to
// include one in its error output.
function redact(text) {
  return text.replace(/\/\/[^@/\s]+@/g, '//***@');
}

/**
 * Classify a failed probe so the operator gets the actual remedy instead of a
 * generic "connection failed". Every branch exits 2: the rehearsal could not
 * begin, which is a different fact from "the restore gate rejected the data".
 */
function reportProbeFailure(output, error) {
  const text = redact(`${output}\n${error?.message ?? ''}`);
  const detail =
    text
      .split('\n')
      .map((line) => line.trim())
      .find((line) =>
        /failed|error|not found|unreachable|timed out|refused|authentication|does not exist/i.test(line),
      ) ?? 'no diagnostic output from psql';

  const cases = [
    {
      test: /Network is unreachable|No route to host|Address family not supported/i,
      reason: 'the rehearsal container has no network route to the source host.',
      remedy: [
        "Supabase's direct host (db.<ref>.supabase.co) resolves to IPv6 only. Use the Session pooler",
        'instead (port 5432, user postgres.<ref>):',
        '  postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require',
        'Copy it from Supabase -> Project Settings -> Database -> Connection string -> Session pooler,',
        'then run: npm run ops:set-source-db',
      ],
    },
    {
      test: /password authentication failed|authentication failed|Tenant or user not found|no pg_hba\.conf entry|role ".*" does not exist|invalid password/i,
      reason: 'the server rejected the credential.',
      remedy: [
        'If the password was reset, re-enter the current URI with: npm run ops:set-source-db',
        'For the session pooler the user is postgres.<ref> (not plain postgres) on port 5432 (not 6543).',
        'Do not paste the URI into a chat, a log, or a commit.',
      ],
    },
    {
      test: /could not translate host name|Name or service not known|nodename nor servname|Temporary failure in name resolution/i,
      reason: 'the source host name did not resolve from the rehearsal container.',
      remedy: ['Check the host in SOURCE_DB_URL; the pooler host is aws-0-<region>.pooler.supabase.com.'],
    },
    {
      test: /timeout expired|Connection timed out|Operation timed out/i,
      reason: 'the connection to the source timed out.',
      remedy: ['A firewall, VPN, or egress rule is blocking the route. Try the Session pooler URI.'],
    },
    {
      test: /SSL error|server does not support SSL|certificate/i,
      reason: 'TLS negotiation with the source failed.',
      remedy: ['Append ?sslmode=require to the connection URI, then run: npm run ops:set-source-db'],
    },
  ];

  const match = cases.find((entry) => entry.test.test(text));
  console.error('BLOCKED: the hosted source is not reachable for the rehearsal (precondition, not a gate result).');
  console.error(`  reason: ${match ? match.reason : 'psql could not connect to the source.'}`);
  console.error(`  detail: ${detail}`);
  for (const line of match ? match.remedy : ['Re-run with the same URI to capture the full psql error.']) {
    console.error(`  ${line}`);
  }
  return 2;
}

const args = [
  'run',
  '--rm',
  ...Object.keys(connection).flatMap((key) => ['-e', key]),
  'postgres:16',
];

if (operation === 'dump') {
  args.push('pg_dump', '--no-owner');
} else if (operation === 'probe') {
  // The dump runs inside this container, so reachability must be proven from
  // inside it. `select 1` also proves the credential, which pg_isready cannot.
  args.push('psql', '-X', '-A', '-t', '-q', '-c', 'select 1');
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
  // The dump streams straight through; the probe must capture stderr so a
  // failure can be classified instead of printed as an opaque docker error.
  stdio:
    operation === 'dump'
      ? 'inherit'
      : ['ignore', 'pipe', operation === 'probe' ? 'pipe' : 'inherit'],
});

if (result.error || result.status !== 0) {
  if (operation === 'probe') {
    process.exit(reportProbeFailure(`${result.stdout ?? ''}\n${result.stderr ?? ''}`, result.error));
  }
  console.error(`ERROR: source database ${operation} failed.`);
  process.exit(result.status ?? 1);
}
if (operation === 'counts') process.stdout.write(result.stdout);
if (operation === 'probe') {
  console.log('source reachable from the rehearsal container and the credential was accepted (select 1).');
}
