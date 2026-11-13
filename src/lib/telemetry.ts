/**
 * Provider-agnostic telemetry.
 *
 * Two rules govern this module, and both are enforced here rather than left to
 * callers:
 *
 *   1. Nothing that identifies a person, a tenant, or an amount leaves the
 *      browser. Event names are allowlisted and properties are restricted to a
 *      fixed set of enumerated keys and values. Free text is never accepted, so
 *      names, emails, phone numbers, order codes, atelier ids, notes, and money
 *      cannot be attached even by accident.
 *   2. Telemetry must never break the path it observes. The default sink is a
 *      no-op, and every call is wrapped so a throwing sink cannot escape.
 *
 * Capture is plan- and deploy-gated: Vercel Web Analytics page views work on
 * Hobby, while custom events require Pro or Enterprise. When a plan does not
 * accept custom events the request is dropped by the provider, not by this
 * module. See `docs/current-state.md` and `docs/release-readiness.md`.
 */

export type TelemetryEventName =
  | 'landing_view'
  | 'auth_signed_in'
  | 'booking_confirmed'
  | 'app_error';

export type TelemetryProperties = {
  data_mode?: 'demo' | 'supabase';
  route?: 'landing' | 'atelier' | 'workspace' | 'portal';
  role?: 'owner' | 'employee' | 'client' | 'visitor';
  outcome?: 'success';
  error_kind?: 'render' | 'window' | 'promise';
};

export interface TelemetrySink {
  track(name: TelemetryEventName, properties: TelemetryProperties): void;
  pageview?(route: string): void;
}

/** Any key not in this map is discarded, whatever the caller passes. */
const ALLOWED_VALUES: Record<keyof TelemetryProperties, readonly string[]> = {
  data_mode: ['demo', 'supabase'],
  route: ['landing', 'atelier', 'workspace', 'portal'],
  role: ['owner', 'employee', 'client', 'visitor'],
  outcome: ['success'],
  error_kind: ['render', 'window', 'promise'],
};

const ALLOWED_EVENTS: readonly TelemetryEventName[] = [
  'landing_view',
  'auth_signed_in',
  'booking_confirmed',
  'app_error',
];

/** A hard ceiling so a caller bug cannot turn one event into a payload dump. */
export const MAX_PROPERTIES = 5;

let sink: TelemetrySink | null = null;

export function setTelemetrySink(next: TelemetrySink | null): void {
  sink = next;
}

export function isTelemetryEnabled(): boolean {
  return sink !== null;
}

/**
 * Keep only allowlisted keys whose values are one of the enumerated strings.
 * Everything else — objects, numbers, free text, and unknown keys — is dropped.
 */
export function sanitizeProperties(
  input: Record<string, unknown> | undefined,
): TelemetryProperties {
  const safe: TelemetryProperties = {};
  if (!input) return safe;

  let accepted = 0;
  for (const [key, value] of Object.entries(input)) {
    if (accepted >= MAX_PROPERTIES) break;
    // `in` would also match inherited names such as `constructor` or `__proto__`,
    // whose "allowed values" are not a list. Only own keys are legitimate.
    if (!Object.hasOwn(ALLOWED_VALUES, key)) continue;
    if (typeof value !== 'string') continue;
    const allowed = ALLOWED_VALUES[key as keyof TelemetryProperties];
    if (!allowed.includes(value)) continue;
    (safe as Record<string, string>)[key] = value;
    accepted += 1;
  }
  return safe;
}

/**
 * Strip query and fragment before a URL can leave the page. Invite codes travel
 * in `?invite=`, and search terms can carry a name.
 */
export function redactPageUrl(url: string): string {
  const [path] = url.split(/[?#]/, 1);
  return path || '/';
}

export function emit(
  name: TelemetryEventName,
  properties?: Record<string, unknown>,
): void {
  if (!sink) return;
  if (!ALLOWED_EVENTS.includes(name)) return;
  try {
    sink.track(name, sanitizeProperties(properties));
  } catch {
    // Observability must never break the workflow it observes.
  }
}

export function pageview(route: string): void {
  if (!sink?.pageview) return;
  try {
    sink.pageview(redactPageUrl(route));
  } catch {
    // As above.
  }
}
