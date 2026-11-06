import React, { useState } from 'react';
import { useStitchFlow } from '../context/StitchFlowContext';
import { Loader2, Scissors, KeyRound } from 'lucide-react';

const CreateAtelierScreen: React.FC = () => {
  const { completeOnboarding, showToast } = useStitchFlow();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [tagline, setTagline] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await completeOnboarding({ name, slug: slug.toLowerCase().trim(), tagline, whatsappNumber: whatsapp });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create atelier.');
      showToast('Atelier creation failed.');
    } finally {
      setBusy(false);
    }
  };

  const redeemInvite = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = inviteCode.trim();
    if (!trimmed) return;
    window.location.assign(`/?invite=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF6F0] dark:bg-[#12100E] p-6">
      <div className="w-full max-w-md space-y-4">
        <form onSubmit={onSubmit} className="bg-white dark:bg-[#1D1A18] rounded-3xl shadow-2xl p-8 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-[#D4A347] flex items-center justify-center text-[#161311]">
              <Scissors className="w-5 h-5 -rotate-45" />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Create Your Atelier</h1>
          </div>
          <p className="text-sm text-[#7B6F62] dark:text-[#A89B8C]">
            As the founding owner, complete the essentials. This cannot be reversed without leaving an audit trail.
          </p>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#7B6F62]">
            Atelier Name
            <input value={name} onChange={e => setName(e.target.value)} required className="mt-1 w-full rounded-xl border border-[#D9CFC2] px-3 py-2 text-sm" />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#7B6F62]">
            URL Slug (lowercase, URL-safe)
            <input value={slug} onChange={e => setSlug(e.target.value)} required pattern="[a-z0-9-]+" className="mt-1 w-full rounded-xl border border-[#D9CFC2] px-3 py-2 text-sm" />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#7B6F62]">
            Tagline
            <input value={tagline} onChange={e => setTagline(e.target.value)} className="mt-1 w-full rounded-xl border border-[#D9CFC2] px-3 py-2 text-sm" />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#7B6F62]">
            WhatsApp Number
            <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="mt-1 w-full rounded-xl border border-[#D9CFC2] px-3 py-2 text-sm" />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={busy} className="w-full rounded-2xl bg-[#D4A347] text-[#161311] font-semibold py-2.5 disabled:opacity-60 flex items-center justify-center gap-2">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Atelier
          </button>
        </form>

        <form onSubmit={redeemInvite} className="bg-white dark:bg-[#1D1A18] rounded-3xl shadow-xl p-6 space-y-3">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#D4A347]" />
            <h2 className="text-sm font-bold">Joining an existing atelier?</h2>
          </div>
          <p className="text-xs text-[#7B6F62] dark:text-[#A89B8C]">
            Enter the invitation code from your email instead of creating a new atelier.
          </p>
          <div className="flex gap-2">
            <input
              value={inviteCode}
              onChange={event => setInviteCode(event.target.value)}
              placeholder="Invitation code"
              className="flex-1 rounded-xl border border-[#D9CFC2] px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={!inviteCode.trim()}
              className="rounded-xl bg-[#161311] dark:bg-[#D4A347] text-[#FAF6F0] dark:text-[#161311] px-4 text-xs font-semibold disabled:opacity-50"
            >
              Redeem
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAtelierScreen;
