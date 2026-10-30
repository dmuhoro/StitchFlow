import React from 'react';

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('[StitchFlow] Unhandled application error', error);
  }

  private recover = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen bg-[#FAF6F0] px-6 py-16 text-[#1A1715] dark:bg-[#12100E] dark:text-[#F5EFE6]">
        <div className="mx-auto max-w-xl rounded-3xl border border-[#D4A347]/30 bg-white p-8 shadow-2xl dark:bg-[#1C1917]">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#8C6D2D]">StitchFlow atelier</p>
          <h1 className="font-display text-4xl font-semibold">The workspace needs a refresh.</h1>
          <p className="mt-4 text-sm leading-6 text-[#6F6258] dark:text-[#C8B69F]">
            The demo encountered an unexpected error. Refresh to recover the workspace. If the issue repeats, reset the demo data from Atelier Settings and report the browser and action that triggered it.
          </p>
          <button
            type="button"
            onClick={this.recover}
            className="mt-8 rounded-xl bg-[#D4A347] px-5 py-3 text-sm font-bold text-[#161311] transition hover:bg-[#E5B55E]"
          >
            Refresh workspace
          </button>
        </div>
      </main>
    );
  }
}
