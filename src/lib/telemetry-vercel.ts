import { inject, track } from '@vercel/analytics';
import {
  redactPageUrl,
  setTelemetrySink,
  type TelemetryEventName,
  type TelemetryProperties,
} from './telemetry';

/**
 * Vercel Web Analytics adapter.
 *
 * `inject()` adds the insights script and starts page-view tracking. Page views
 * are available on Hobby; custom events need Pro or Enterprise, so `track()`
 * calls are accepted here and dropped by the provider on a lower plan. That is
 * a plan limit, not a bug in this adapter — the docs say so explicitly.
 *
 * `beforeSend` is defence in depth: the core module already refuses anything
 * that is not enumerated, and this hook strips query strings and fragments from
 * page-view URLs so an invite code or search term cannot be sent.
 */
export function installVercelTelemetry(): void {
  try {
    inject({
      mode: 'production',
      debug: false,
      beforeSend: (event) => {
        if (event.type === 'pageview') {
          return { ...event, url: redactPageUrl(event.url) };
        }
        return event;
      },
    });
  } catch {
    // A blocked or failed script must not stop the app from rendering.
  }

  setTelemetrySink({
    track(name: TelemetryEventName, properties: TelemetryProperties) {
      track(name, properties as Record<string, string>);
    },
  });
}
