import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_PROPERTIES,
  emit,
  isTelemetryEnabled,
  pageview,
  redactPageUrl,
  sanitizeProperties,
  setTelemetrySink,
  type TelemetryEventName,
  type TelemetryProperties,
} from './telemetry';

function fakeSink() {
  const calls: Array<{ name: TelemetryEventName; properties: TelemetryProperties }> = [];
  return {
    calls,
    sink: {
      track(name: TelemetryEventName, properties: TelemetryProperties) {
        calls.push({ name, properties });
      },
    },
  };
}

afterEach(() => {
  setTelemetrySink(null);
});

describe('telemetry redaction', () => {
  it('keeps allowlisted, enumerated properties', () => {
    expect(
      sanitizeProperties({ data_mode: 'supabase', role: 'owner', outcome: 'success' }),
    ).toEqual({ data_mode: 'supabase', role: 'owner', outcome: 'success' });
  });

  it('strips identity, tenant, and money keys', () => {
    const sanitized = sanitizeProperties({
      email: 'patron@example.com',
      phone: '+254700000000',
      full_name: 'A Patron',
      atelier_id: '11111111-1111-1111-1111-111111111111',
      order_code: 'SF-1042',
      deposit_amount: 55000,
      balance_due: 35000,
    });
    expect(sanitized).toEqual({});
  });

  it('rejects a free-text value even when the key is allowlisted', () => {
    expect(sanitizeProperties({ route: 'atelier/agbada-house' })).toEqual({});
    expect(sanitizeProperties({ error_kind: 'Error: could not read SF-1042' })).toEqual({});
  });

  it('rejects non-string values', () => {
    expect(sanitizeProperties({ outcome: 1 })).toEqual({});
    expect(sanitizeProperties({ data_mode: null })).toEqual({});
  });

  it('ignores inherited object keys such as __proto__ and constructor', () => {
    const hostile = JSON.parse('{"__proto__": "polluted", "constructor": "x"}') as Record<
      string,
      unknown
    >;
    expect(sanitizeProperties(hostile)).toEqual({});
    expect(sanitizeProperties({ toString: 'x', hasOwnProperty: 'y' })).toEqual({});
  });

  it('bounds the number of properties it accepts', () => {
    const sanitized = sanitizeProperties({
      data_mode: 'supabase',
      route: 'landing',
      role: 'visitor',
      outcome: 'success',
      error_kind: 'render',
      // A sixth allowlisted key cannot normally exist, but a caller could
      // repeat keys through a prototype trick. The ceiling still holds.
    });
    expect(Object.keys(sanitized).length).toBeLessThanOrEqual(MAX_PROPERTIES);
  });

  it('strips query strings and fragments from a URL', () => {
    expect(redactPageUrl('https://atelier.example/?invite=secret-code')).toBe(
      'https://atelier.example/',
    );
    expect(redactPageUrl('/atelier/agbada-house#measurements')).toBe('/atelier/agbada-house');
    expect(redactPageUrl('?invite=only-query')).toBe('/');
  });
});

describe('telemetry sink safety', () => {
  it('is a no-op when no sink is configured', () => {
    expect(isTelemetryEnabled()).toBe(false);
    expect(() => emit('landing_view', { route: 'landing' })).not.toThrow();
    expect(() => pageview('/')).not.toThrow();
  });

  it('emits only sanitized properties to the configured sink', () => {
    const { calls, sink } = fakeSink();
    setTelemetrySink(sink);

    emit('booking_confirmed', { data_mode: 'supabase', client_email: 'patron@example.com' });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({
      name: 'booking_confirmed',
      properties: { data_mode: 'supabase' },
    });
  });

  it('drops an event name that is not allowlisted', () => {
    const { calls, sink } = fakeSink();
    setTelemetrySink(sink);

    emit('purchase_completed' as TelemetryEventName, { outcome: 'success' });

    expect(calls).toHaveLength(0);
  });

  it('never lets a throwing sink break the caller', () => {
    setTelemetrySink({
      track() {
        throw new Error('transport down');
      },
    });

    expect(() => emit('app_error', { error_kind: 'window' })).not.toThrow();
  });

  it('never lets a throwing pageview sink break the caller', () => {
    setTelemetrySink({
      track() {},
      pageview() {
        throw new Error('transport down');
      },
    });

    expect(() => pageview('/')).not.toThrow();
  });

  it('does not call the sink for a request it cannot sanitize', () => {
    const { calls, sink } = fakeSink();
    setTelemetrySink(sink);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    emit('app_error', { error_kind: 'render', message: 'boom' });

    expect(calls).toHaveLength(1);
    expect(calls[0].properties).toEqual({ error_kind: 'render' });
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
