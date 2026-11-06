import React, { useState } from 'react';
import { useStitchFlow } from '../context/StitchFlowContext';
import { Loader2, Mail, KeyRound } from 'lucide-react';

/**
 * Invitation redemption.
 *
 * An invitation is bound to the invited email, so the visitor must authenticate
 * as that email before the database will accept the code. The magic link
 * redirects back here with the same `?invite=` code, and the session is
 * restored by supabase-js before this screen renders the redeem step.
 */
const AcceptInvitationScreen: React.FC<{ code: string }> = ({ code }) => {
  const { acceptInvitation, currentUser, sendMagicLink, signInWithPassword } = useStitchFlow();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await acceptInvitation(code);
      window.history.replaceState({}, '', window.location.pathname);
      setDone(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to redeem invitation.');
    } finally {
      setBusy(false);
    }
  };

  const onSendLink = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await sendMagicLink(email, `/?invite=${encodeURIComponent(code)}`);
      setLinkSent(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to send the sign-in link.');
    } finally {
      setBusy(false);
    }
  };

  const onPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signInWithPassword(email, password);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF6F0] dark:bg-[#12100E] p-6">
        <div className="w-full max-w-md bg-white dark:bg-[#1D1A18] rounded-3xl shadow-2xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#D4A347] flex items-center justify-center text-[#161311] mx-auto">
            <Mail className="w-6 h-6" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Invitation accepted</h1>
          <p className="text-sm text-[#7B6F62] dark:text-[#A89B8C]">You are now a member of your atelier. Loading your workspace…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF6F0] dark:bg-[#12100E] p-6">
      <div className="w-full max-w-md bg-white dark:bg-[#1D1A18] rounded-3xl shadow-2xl p-8 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-[#D4A347] flex items-center justify-center text-[#161311]">
            <Mail className="w-5 h-5" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Accept Invitation</h1>
        </div>
        <p className="text-sm text-[#7B6F62] dark:text-[#A89B8C]">
          {currentUser
            ? 'Redeem your role and join this atelier.'
            : 'Sign in with the email address that received this invitation, then redeem it.'}
        </p>

        <label className="block text-xs font-semibold uppercase tracking-wider text-[#7B6F62]">
          Invitation Code
          <input value={code} readOnly className="mt-1 w-full rounded-xl border border-[#D9CFC2] px-3 py-2 text-sm bg-[#F5EFE6]" />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {currentUser ? (
          <form onSubmit={onSubmit} className="space-y-3">
            <p className="text-xs text-[#7B6F62] dark:text-[#A89B8C]">
              Signed in as <strong>{currentUser.email}</strong>.
            </p>
            <button type="submit" disabled={busy} className="w-full rounded-2xl bg-[#D4A347] text-[#161311] font-semibold py-2.5 disabled:opacity-60 flex items-center justify-center gap-2">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              Redeem invitation
            </button>
          </form>
        ) : linkSent ? (
          <div className="rounded-2xl border border-[#D4A347]/40 bg-[#D4A347]/10 p-4 text-sm text-[#6A5D52] dark:text-[#B8ABA0]">
            Sign-in link sent to <strong>{email}</strong>. Open it on this device to finish joining the atelier.
          </div>
        ) : (
          <>
            <form onSubmit={usePassword ? onPassword : onSendLink} className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#7B6F62]">
                Email
                <input
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  type="email"
                  required
                  className="mt-1 w-full rounded-xl border border-[#D9CFC2] px-3 py-2 text-sm"
                />
              </label>

              {usePassword && (
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#7B6F62]">
                  Password
                  <input
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    type="password"
                    required
                    className="mt-1 w-full rounded-xl border border-[#D9CFC2] px-3 py-2 text-sm"
                  />
                </label>
              )}

              <button type="submit" disabled={busy} className="w-full rounded-2xl bg-[#D4A347] text-[#161311] font-semibold py-2.5 disabled:opacity-60 flex items-center justify-center gap-2">
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {usePassword ? 'Sign in and continue' : 'Email me a sign-in link'}
              </button>
            </form>

            <button
              onClick={() => setUsePassword(previous => !previous)}
              className="text-xs text-[#7B6F62] dark:text-[#A89B8C] flex items-center gap-1"
            >
              <KeyRound className="w-3.5 h-3.5" />
              {usePassword ? 'Use a magic link instead' : 'I have a password'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AcceptInvitationScreen;
