import React, { useState } from 'react';
import { X, Mail, KeyRound } from 'lucide-react';
import { useStitchFlow } from '../context/StitchFlowContext';

export const AuthModal: React.FC = () => {
  const {
    authModalOpen,
    setAuthModalOpen,
    authLoading,
    authError,
    signInWithPassword,
    sendMagicLink,
    showToast,
  } = useStitchFlow();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [magic, setMagic] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!authModalOpen) return null;

  const close = () => setAuthModalOpen(false);

  const handlePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await signInWithPassword(email, password);
      close();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign-in failed.');
    }
  };

  const handleMagic = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await sendMagicLink(email);
      showToast('Magic link sent. Check your email.');
      close();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to send magic link.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl relative">
        <button onClick={close} className="absolute top-4 right-4 text-[#7B6F62]"><X /></button>
        <h2 className="font-display text-xl font-bold mb-1">Atelier Sign In</h2>
        <p className="text-xs text-[#7B6F62] mb-4">Use your Supabase auth credentials.</p>
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        {authError && <p className="text-sm text-red-600 mb-2">{authError}</p>}
        {magic ? (
          <form onSubmit={handleMagic} className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#7B6F62]">
              Email
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" required
                className="mt-1 w-full rounded-xl border border-[#D9CFC2] px-3 py-2 text-sm" />
            </label>
            <button type="submit" disabled={authLoading} className="w-full rounded-2xl bg-[#D4A347] text-[#161311] font-semibold py-2.5 disabled:opacity-60">
              Send Magic Link
            </button>
          </form>
        ) : (
          <form onSubmit={handlePassword} className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#7B6F62]">
              Email
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" required
                className="mt-1 w-full rounded-xl border border-[#D9CFC2] px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#7B6F62]">
              Password
              <div className="mt-1 flex items-center border border-[#D9CFC2] rounded-xl px-3">
                <KeyRound className="w-4 h-4" />
                <input value={password} onChange={e => setPassword(e.target.value)} type="password" required
                  className="w-full px-3 py-2 text-sm border-0 focus:outline-none" />
              </div>
            </label>
            <button type="submit" disabled={authLoading} className="w-full rounded-2xl bg-[#D4A347] text-[#161311] font-semibold py-2.5 disabled:opacity-60">
              Sign In
            </button>
          </form>
        )}
        <button onClick={() => setMagic(prev => !prev)} className="mt-3 text-xs text-[#7B6F62] flex items-center gap-1">
          <Mail className="w-3.5 h-3.5" /> {magic ? 'Use password instead' : 'Use magic link instead'}
        </button>

        <div className="mt-4 pt-4 border-t border-[#E5DACB] space-y-2">
          <button
            type="button"
            onClick={() => setInviteOpen(previous => !previous)}
            className="text-xs font-semibold text-[#8C6D2D] flex items-center gap-1"
          >
            <KeyRound className="w-3.5 h-3.5" /> {inviteOpen ? 'Hide invitation code' : 'I have an invitation code'}
          </button>
          {inviteOpen && (
            <form
              onSubmit={event => {
                event.preventDefault();
                const trimmed = inviteCode.trim();
                if (!trimmed) return;
                window.location.assign(`/?invite=${encodeURIComponent(trimmed)}`);
              }}
              className="flex gap-2"
            >
              <input
                value={inviteCode}
                onChange={event => setInviteCode(event.target.value)}
                placeholder="Invitation code"
                className="flex-1 rounded-xl border border-[#D9CFC2] px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={!inviteCode.trim()}
                className="rounded-xl bg-[#161311] text-[#FAF6F0] px-3 text-xs font-semibold disabled:opacity-50"
              >
                Redeem
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};