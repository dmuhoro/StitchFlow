/**
 * Copy and available actions for the crash screen.
 *
 * The screen must not claim a demo affordance in a production workspace: the
 * "reset" action clears local storage, which in Supabase mode also drops the
 * authenticated session and signs a real patron out. This helper is pure so the
 * rule can be unit-tested without a DOM.
 */

export interface ErrorRecoveryCopy {
  title: string;
  body: string;
  primaryLabel: string;
  /** Offered only when clearing storage cannot destroy a real session. */
  resetLabel: string | null;
}

export function errorRecoveryCopy(isProduction: boolean): ErrorRecoveryCopy {
  if (isProduction) {
    return {
      title: 'The workspace needs a refresh.',
      body:
        'The workspace encountered an unexpected error. Refresh to recover it. If the problem ' +
        'continues, contact your atelier owner — your sign-in is kept and you will not be ' +
        'signed out by a refresh.',
      primaryLabel: 'Refresh workspace',
      resetLabel: null,
    };
  }

  return {
    title: 'The workspace needs a refresh.',
    body:
      'The demo encountered an unexpected error. Refresh to recover the workspace or reset ' +
      'demo data to clear any corrupted local storage entries.',
    primaryLabel: 'Refresh workspace',
    resetLabel: 'Reset Demo Data & Recover',
  };
}
