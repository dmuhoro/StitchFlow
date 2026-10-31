import React from 'react';

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

    return (
      <main className="min-h-screen bg-[#FAF6F0] px-6 py-16 text-[#1A1715] dark:bg-[#12100E] dark:text-[#F5EFE6] flex items-center justify-center">
        <div className="mx-auto max-w-xl w-full rounded-3xl border border-[#D4A347]/30 bg-white p-8 shadow-2xl dark:bg-[#1C1917]">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#8C6D2D]">StitchFlow atelier</p>
          <h1 className="font-display text-3xl font-semibold">The workspace needs a refresh.</h1>
          <p className="mt-4 text-sm leading-6 text-[#6F6258] dark:text-[#C8B69F]">
            The demo encountered an unexpected error. Refresh to recover the workspace or reset demo data to clear any corrupted local storage entries.
          </p>
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
              Refresh workspace
            </button>
            <button
              type="button"
              onClick={this.resetAndRecover}
              className="rounded-xl bg-[#161311] dark:bg-[#2C241E] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#2C241E] dark:hover:bg-[#3D332B] border border-[#D4A347]/40"
            >
              Reset Demo Data & Recover
            </button>
          </div>
        </div>
      </main>
    );
  }
}
