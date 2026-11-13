import { describe, expect, it } from 'vitest';
import { errorRecoveryCopy } from './error-recovery';

describe('error recovery copy', () => {
  it('never offers a destructive reset in a production workspace', () => {
    const copy = errorRecoveryCopy(true);
    expect(copy.resetLabel).toBeNull();
  });

  it('never calls a production workspace a demo', () => {
    const copy = errorRecoveryCopy(true);
    const visible = `${copy.title} ${copy.body} ${copy.primaryLabel}`.toLowerCase();
    expect(visible).not.toContain('demo');
  });

  it('tells a production user how to get help when a refresh does not fix it', () => {
    expect(errorRecoveryCopy(true).body.toLowerCase()).toContain('contact');
  });

  it('keeps the demo reset available in demo mode', () => {
    const copy = errorRecoveryCopy(false);
    expect(copy.resetLabel).not.toBeNull();
    expect(`${copy.title} ${copy.body} ${copy.resetLabel}`.toLowerCase()).toContain('demo');
  });

  it('always offers a non-destructive refresh', () => {
    for (const isProduction of [true, false]) {
      expect(errorRecoveryCopy(isProduction).primaryLabel.length).toBeGreaterThan(0);
    }
  });
});
