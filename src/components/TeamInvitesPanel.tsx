import React, { useState } from 'react';
import { Copy, Loader2, Mail, ShieldCheck, Trash2, Users } from 'lucide-react';
import { useStitchFlow } from '../context/StitchFlowContext';

/**
 * Owner-only invitation management.
 *
 * The browser creates the invitation row through RLS, which only permits an
 * active owner of that atelier. The invited email is the redemption key: the
 * database refuses a code redeemed by any other account.
 */
export const TeamInvitesPanel: React.FC = () => {
  const {
    isProductionMode,
    invitations,
    inviteMember,
    revokeInvitation,
    invitationLink,
    refreshInvitations,
    profiles,
    showToast,
  } = useStitchFlow();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'employee' | 'client'>('employee');
  const [sendEmail, setSendEmail] = useState(true);
  const [busy, setBusy] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await inviteMember({ email: trimmed, role, sendEmail });
      setEmail('');
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : 'Unable to create the invitation.');
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async (code: string) => {
    const link = invitationLink(code);
    try {
      await navigator.clipboard.writeText(link);
      showToast('Invitation link copied.');
    } catch {
      showToast(`Share this link manually: ${link}`);
    }
  };

  const onRevoke = async (id: string) => {
    setRevoking(id);
    try {
      await revokeInvitation(id);
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : 'Unable to revoke the invitation.');
    } finally {
      setRevoking(null);
    }
  };

  if (!isProductionMode) {
    return (
      <div className="bg-white dark:bg-[#1C1917] p-6 rounded-3xl border border-[#E5DACB] dark:border-[#332C27] text-sm text-[#6A5D52] dark:text-[#B8ABA0]">
        Invitations are available only against a live atelier. Demo mode has no real identity to bind an invitation to.
      </div>
    );
  }

  const pending = invitations.filter(invitation => !invitation.accepted_at);
  const accepted = invitations.filter(invitation => invitation.accepted_at);
  const staff = profiles.filter(profile => profile.role === 'owner' || profile.role === 'employee');

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-xl font-bold text-[#161311] dark:text-[#F5EFE6]">Team &amp; Invitations</h3>
        <p className="text-xs text-[#6A5D52] dark:text-[#B8ABA0]">
          Invite an artisan or a patron by email. The invitation is bound to that address and expires after 14 days.
        </p>
      </div>

      <form onSubmit={onSubmit} className="bg-white dark:bg-[#1C1917] p-5 rounded-3xl border border-[#E5DACB] dark:border-[#332C27] shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#6A5D52] dark:text-[#B8ABA0] md:col-span-2">
            Email
            <input
              value={email}
              onChange={event => setEmail(event.target.value)}
              type="email"
              required
              placeholder="artisan@example.com"
              className="mt-1 w-full rounded-xl border border-[#C8B69F] dark:border-[#4A4039] dark:bg-[#24201D] px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#6A5D52] dark:text-[#B8ABA0]">
            Role
            <select
              value={role}
              onChange={event => setRole(event.target.value as 'employee' | 'client')}
              className="mt-1 w-full rounded-xl border border-[#C8B69F] dark:border-[#4A4039] dark:bg-[#24201D] px-3 py-2 text-sm"
            >
              <option value="employee">Artisan (employee)</option>
              <option value="client">Patron (client)</option>
            </select>
          </label>
        </div>

        <label className="flex items-center gap-2 text-xs text-[#6A5D52] dark:text-[#B8ABA0]">
          <input type="checkbox" checked={sendEmail} onChange={event => setSendEmail(event.target.checked)} />
          Also email a sign-in link (recommended)
        </label>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={busy || !email.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#161311] dark:bg-[#D4A347] text-[#FAF6F0] dark:text-[#161311] text-xs font-semibold disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Create invitation
          </button>
          <button
            type="button"
            onClick={() => void refreshInvitations()}
            className="px-3 py-2 rounded-xl border border-[#C8B69F] dark:border-[#4A4039] text-xs font-semibold text-[#6A5D52] dark:text-[#B8ABA0]"
          >
            Refresh
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#1C1917] p-5 rounded-3xl border border-[#E5DACB] dark:border-[#332C27] shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#D4A347]" />
            <h4 className="text-sm font-bold text-[#161311] dark:text-[#F5EFE6]">Pending invitations ({pending.length})</h4>
          </div>
          {pending.length === 0 ? (
            <p className="text-xs text-[#6A5D52] dark:text-[#B8ABA0]">No pending invitations.</p>
          ) : (
            <ul className="space-y-2">
              {pending.map(invitation => (
                <li key={invitation.id} className="rounded-2xl border border-[#E5DACB] dark:border-[#332C27] p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#161311] dark:text-[#F5EFE6] truncate">{invitation.email}</p>
                      <p className="text-[11px] text-[#6A5D52] dark:text-[#B8ABA0]">
                        {invitation.role} · expires {new Date(invitation.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => void copyLink(invitation.invitation_code)}
                        title="Copy invitation link"
                        className="p-1.5 rounded-lg border border-[#E5DACB] dark:border-[#332C27] text-[#6A5D52] dark:text-[#B8ABA0]"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => void onRevoke(invitation.id)}
                        disabled={revoking === invitation.id}
                        title="Revoke invitation"
                        className="p-1.5 rounded-lg border border-red-200 text-red-600 disabled:opacity-50"
                      >
                        {revoking === invitation.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <code className="block text-[10px] break-all text-[#8C6D2D] dark:text-[#D4A347]">{invitation.invitation_code}</code>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white dark:bg-[#1C1917] p-5 rounded-3xl border border-[#E5DACB] dark:border-[#332C27] shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#D4A347]" />
            <h4 className="text-sm font-bold text-[#161311] dark:text-[#F5EFE6]">Atelier team ({staff.length})</h4>
          </div>
          <ul className="space-y-2">
            {staff.map(profile => (
              <li key={profile.id} className="flex items-center justify-between gap-2 rounded-2xl border border-[#E5DACB] dark:border-[#332C27] p-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#161311] dark:text-[#F5EFE6] truncate">{profile.full_name}</p>
                  <p className="text-[11px] text-[#6A5D52] dark:text-[#B8ABA0]">{profile.role} · {profile.email}</p>
                </div>
                <ShieldCheck className="w-4 h-4 text-[#D4A347] shrink-0" />
              </li>
            ))}
          </ul>

          {accepted.length > 0 && (
            <div className="pt-2 border-t border-[#F3ECE1] dark:border-[#332C27] space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6A5D52] dark:text-[#B8ABA0]">Recently accepted</p>
              {accepted.slice(0, 5).map(invitation => (
                <p key={invitation.id} className="text-[11px] text-[#6A5D52] dark:text-[#B8ABA0]">
                  {invitation.email} · {invitation.role}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
