/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  KeyRound, 
  Crown, 
  Scissors, 
  User, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { useStitchFlow } from '../context/StitchFlowContext';
import { Profile, UserRole } from '../types';

export const AuthModal: React.FC = () => {
  const { 
    authModalOpen, 
    setAuthModalOpen, 
    authTargetRole, 
    profiles,
    loginAsUser,
    showToast,
    isProductionMode,
    signInWithPassword,
    sendMagicLink,
    authLoading,
    authError
  } = useStitchFlow();

  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [pinCode, setPinCode] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!authModalOpen) return null;

  const getTargetRoleTitle = (role: UserRole | null) => {
    switch (role) {
      case 'owner': return 'Atelier Director Suite (Owner)';
      case 'employee': return 'Master Artisan Workshop Bench';
      case 'client': return 'VIP Patron Private Portal';
      default: return 'Atelier Access';
    }
  };

  const getTargetRoleDescription = (role: UserRole | null) => {
    switch (role) {
      case 'owner': return 'Requires Creative Director credentials to access cashflow metrics, profit margins, and production administration.';
      case 'employee': return 'Requires registered African artisan authorization to access daily workbench tasks, chalking queues, and Agbada cards.';
      case 'client': return 'Requires verified patron credentials to inspect private anatomical measurements, ceremony milestones, and referral earnings.';
      default: return 'Please authenticate with authorized credentials to access this portal.';
    }
  };

  // Filter profiles eligible for this target role
  const eligibleProfiles = profiles.filter(p => {
    if (!authTargetRole || authTargetRole === 'visitor') return true;
    if (authTargetRole === 'owner') return p.role === 'owner';
    if (authTargetRole === 'employee') return p.role === 'employee' || p.role === 'owner';
    if (authTargetRole === 'client') return p.role === 'client' || p.role === 'owner';
    return false;
  });

  const handleSelectProfile = (profile: Profile) => {
    loginAsUser(profile);
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (pinCode.trim() === '1234' || pinCode.trim().length >= 4) {
      const match = profiles.find(p => p.id === selectedProfileId) || eligibleProfiles[0];
      if (match) {
        loginAsUser(match);
      }
    } else {
      setErrorMsg('Invalid Keycard PIN. Enter standard demo PIN (1234) or select a credential card below.');
    }
  };

  const handleProductionSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await signInWithPassword(email, password);
      setAuthModalOpen(false);
      showToast('Signed in securely. Atelier access is now server-authorized.');
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Unable to sign in. Check your credentials.');
    }
  };

  const handleMagicLink = async () => {
    setErrorMsg('');
    try {
      await sendMagicLink(email);
      showToast('Magic link sent. Check your email to continue into the atelier.');
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Unable to send a magic link.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-xl bg-white dark:bg-[#1C1917] rounded-3xl shadow-2xl border border-[#E5DACB] dark:border-[#332C27] overflow-hidden text-[#1A1715] dark:text-[#F5EFE6] transition-colors">
        
        {/* Header */}
        <div className="bg-[#161311] dark:bg-[#0D0B0A] text-[#FAF6F0] px-6 py-5 flex items-center justify-between border-b border-[#2C241E]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D4A347] flex items-center justify-center text-[#161311] shadow-sm">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#D4A347]/20 text-[#D4A347]">
                  Role-Based Security Gate
                </span>
              </div>
              <h3 className="font-display text-xl sm:text-2xl font-bold tracking-wide text-white mt-0.5">
                {getTargetRoleTitle(authTargetRole)}
              </h3>
            </div>
          </div>
          <button
            onClick={() => setAuthModalOpen(false)}
            className="text-[#98897C] hover:text-white p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gate Body */}
        <div className="p-6 space-y-6">
          <div className="bg-[#FAF6F0] dark:bg-[#24201D] p-4 rounded-2xl border border-[#E5DACB] dark:border-[#332C27] flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-[#C25E34] shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-[#161311] dark:text-[#F5EFE6]">
                Portal Boundary Protection Active:
              </span>
              <p className="text-[#6A5D52] dark:text-[#B8ABA0] mt-0.5 leading-relaxed">
                {getTargetRoleDescription(authTargetRole)}
              </p>
            </div>
          </div>

          {isProductionMode ? (
            <form onSubmit={handleProductionSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="stitchflow-email" className="text-xs font-bold uppercase tracking-wider text-[#6A5D52] dark:text-[#B8ABA0]">Atelier email</label>
                <input id="stitchflow-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="director@youratelier.com" className="w-full p-3 bg-white dark:bg-[#24201D] border border-[#C8B69F] dark:border-[#4A4039] rounded-xl text-sm focus:ring-1 focus:ring-[#D4A347]" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="stitchflow-password" className="text-xs font-bold uppercase tracking-wider text-[#6A5D52] dark:text-[#B8ABA0]">Password</label>
                <input id="stitchflow-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your secure password" className="w-full p-3 bg-white dark:bg-[#24201D] border border-[#C8B69F] dark:border-[#4A4039] rounded-xl text-sm focus:ring-1 focus:ring-[#D4A347]" />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button type="submit" disabled={authLoading} className="flex-1 px-5 py-3 bg-[#161311] dark:bg-[#D4A347] text-white dark:text-[#161311] rounded-xl text-xs font-bold disabled:opacity-50">{authLoading ? 'Authenticating…' : 'Sign in securely'}</button>
                <button type="button" onClick={handleMagicLink} disabled={authLoading || !email.trim()} className="flex-1 px-5 py-3 border border-[#C8B69F] dark:border-[#4A4039] rounded-xl text-xs font-bold disabled:opacity-50">Email me a magic link</button>
              </div>
              <p className="text-[11px] text-[#6A5D52] dark:text-[#B8ABA0]">Production mode validates identity through Supabase Auth. Your role and atelier access come from the server-side members record.</p>
              {(errorMsg || authError) && <p className="text-xs text-red-600 font-semibold">{errorMsg || authError}</p>}
            </form>
          ) : (
          <>
          {/* Quick Credential Cards for Demonstration */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#6A5D52] dark:text-[#B8ABA0]">
              Authorized Credential Cards (1-Click Sign-In):
            </h4>

            <div className="space-y-2.5">
              {eligibleProfiles.map(p => {
                const roleBadge = p.role === 'owner' 
                  ? { label: 'Director', color: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200' }
                  : p.role === 'employee'
                    ? { label: 'Master Artisan', color: 'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-900/40 dark:text-indigo-200' }
                    : { label: 'VIP Patron', color: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200' };

                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectProfile(p)}
                    className="w-full p-3.5 rounded-2xl border border-[#E5DACB] dark:border-[#332C27] bg-white dark:bg-[#24201D] hover:border-[#D4A347] dark:hover:border-[#D4A347] transition-all flex items-center justify-between group shadow-sm text-left"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={p.avatar_url}
                        alt={p.full_name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-[#D4A347]/40"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#161311] dark:text-[#F5EFE6] group-hover:text-[#D4A347] transition-colors">
                            {p.full_name}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleBadge.color}`}>
                            {roleBadge.label}
                          </span>
                        </div>
                        <p className="text-xs text-[#6A5D52] dark:text-[#B8ABA0]">
                          {p.title || p.specialty}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-semibold text-[#8C6D2D] dark:text-[#D4A347]">
                      <span className="hidden sm:inline">Authenticate</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fallback PIN / Passkey option */}
          <div className="pt-2 border-t border-[#F3ECE1] dark:border-[#332C27]">
            <form onSubmit={handlePinSubmit} className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#6A5D52] dark:text-[#B8ABA0]">
                  Or Enter Atelier Passkey / PIN:
                </span>
                <span className="font-mono text-[10px] text-[#98897C]">Demo PIN: 1234</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="Enter 4-digit security PIN..."
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  className="flex-1 p-2.5 bg-white dark:bg-[#24201D] border border-[#C8B69F] dark:border-[#4A4039] rounded-xl text-xs focus:ring-1 focus:ring-[#D4A347]"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#161311] dark:bg-[#D4A347] text-white dark:text-[#161311] rounded-xl text-xs font-bold hover:bg-[#2C241E] transition-all"
                >
                  Verify
                </button>
              </div>

              {errorMsg && (
                <p className="text-xs text-red-600 font-semibold">{errorMsg}</p>
              )}
            </form>
          </div>

          </>
          )}

        </div>

      </div>
    </div>
  );
};
