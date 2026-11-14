import React from 'react';
import { emit } from '../lib/telemetry';
import { dataMode } from '../lib/supabase';
import { errorRecoveryCopy } from '../lib/error-recovery';

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage?: string;
}

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { hasError: true, errorMessage: error?.message || 'Unexpected application error' };
  }

  componentDidCatch(error: Error) {
    console.error('[StitchFlow] Unhandled application error', error);
    // A fixed enum only: the message and stack stay in the browser.
    emit('app_error', { error_kind: 'render' });
  }

  private recover = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  private resetAndRecover = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    // A production workspace must not be offered the demo reset: clearing
    // local storage there also drops the Supabase session and signs a real
    // patron out. In production the only safe action is a plain refresh.
    const copy = errorRecoveryCopy(dataMode === 'supabase');

    return (
      <main className="min-h-screen bg-[#FAF6F0] px-6 py-16 text-[#1A1715] dark:bg-[#12100E] dark:text-[#F5EFE6] flex items-center justify-center">
        <div className="mx-auto max-w-xl w-full rounded-3xl border border-[#D4A347]/30 bg-white p-8 shadow-2xl dark:bg-[#1C1917]">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#8C6D2D]">StitchFlow atelier</p>
          <h1 className="font-display text-3xl font-semibold">{copy.title}</h1>
          <p className="mt-4 text-sm leading-6 text-[#6F6258] dark:text-[#C8B69F]">{copy.body}</p>
          {this.state.errorMessage && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-700 dark:text-red-300 font-mono break-words">
              {this.state.errorMessage}
            </div>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={this.recover}
              className="rounded-xl bg-[#D4A347] px-5 py-3 text-sm font-bold text-[#161311] transition hover:bg-[#E5B55E]"
            >
              {copy.primaryLabel}
            </button>
            {copy.resetLabel && (
              <button
                type="button"
                onClick={this.resetAndRecover}
                className="rounded-xl bg-[#161311] dark:bg-[#2C241E] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#2C241E] dark:hover:bg-[#3D332B] border border-[#D4A347]/40"
              >
                {copy.resetLabel}
              </button>
            )}
          </div>
        </div>
      </main>
    );
  }
}
