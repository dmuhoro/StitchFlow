import React, { useState } from 'react';
import { useStitchFlow } from '../context/StitchFlowContext';
import { Loader2, Scissors, KeyRound, MapPin, AlertTriangle } from 'lucide-react';

/**
 * Production front door.
 *
 * An atelier is never guessed on the client. A visitor reaches a real atelier
 * through `/atelier/<slug>`; anything else resolves to this landing page or an
 * explicit not-found state. There is no demo-tenant fallback.
 */
const AtelierLanding: React.FC = () => {
  const {
    atelierNotFound,
    publicAtelierLoading,
    setAuthModalOpen,
    setAuthTargetRole,
    showToast,
  } = useStitchFlow();
  const [code, setCode] = useState('');

  const redeemCode = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    window.location.assign(`/?invite=${encodeURIComponent(trimmed)}`);
  };

  if (publicAtelierLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF6F0] dark:bg-[#12100E] p-6">
        <div className="flex items-center gap-3 text-sm text-[#6A5D52] dark:text-[#B8ABA0]">
          <Loader2 className="w-5 h-5 animate-spin text-[#D4A347]" />
          Resolving atelier…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF6F0] dark:bg-[#12100E] p-6">
      <div className="w-full max-w-lg bg-white dark:bg-[#1D1A18] rounded-3xl shadow-2xl p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#D4A347] flex items-center justify-center text-[#161311]">
            {atelierNotFound ? <AlertTriangle className="w-5 h-5" /> : <Scissors className="w-5 h-5 -rotate-45" />}
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">
              {atelierNotFound ? 'Atelier not found' : 'StitchFlow Atelier'}
            </h1>
            <p className="text-xs text-[#7B6F62] dark:text-[#A89B8C]">
              {atelierNotFound
                ? 'That atelier link does not point to a published atelier.'
                : 'Bespoke Pan-African tailoring & ceremonial regalia'}
            </p>
          </div>
        </div>

        {atelierNotFound ? (
          <p className="text-sm text-[#6A5D52] dark:text-[#B8ABA0]">
            Check the address, or ask the atelier owner for their current link and invitation.
            An unknown address never falls back to another atelier.
          </p>
        ) : (
          <p className="text-sm text-[#6A5D52] dark:text-[#B8ABA0]">
            Each atelier has its own address, for example <code className="text-xs">/atelier/your-studio</code>.
            Sign in to open your workspace, or redeem an invitation below.
          </p>
        )}

        <form onSubmit={redeemCode} className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#7B6F62]">
            Have an invitation code?
            <div className="mt-1 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#D4A347]" />
              <input
                value={code}
                onChange={event => setCode(event.target.value)}
                placeholder="Paste your invitation code"
                className="flex-1 rounded-xl border border-[#D9CFC2] px-3 py-2 text-sm"
              />
            </div>
          </label>
          <button
            type="submit"
            disabled={!code.trim()}
            className="w-full rounded-2xl bg-[#161311] dark:bg-[#D4A347] text-[#FAF6F0] dark:text-[#161311] font-semibold py-2.5 disabled:opacity-50"
          >
            Redeem invitation
          </button>
        </form>

        <div className="flex items-center gap-2 text-xs text-[#7B6F62] dark:text-[#A89B8C]">
          <MapPin className="w-3.5 h-3.5" />
          <span>Own an atelier? Sign in and create it in one step.</span>
        </div>

        <button
          onClick={() => {
            setAuthTargetRole(null);
            setAuthModalOpen(true);
            showToast('Sign in to open your atelier workspace.');
          }}
          className="w-full rounded-2xl border border-[#D4A347] text-[#8C6D2D] dark:text-[#D4A347] font-semibold py-2.5 hover:bg-[#D4A347]/10"
        >
          Atelier sign in
        </button>
      </div>
    </div>
  );
};

export default AtelierLanding;
