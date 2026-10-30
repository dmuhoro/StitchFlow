/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldAlert, Lock, ArrowRight, KeyRound, Sparkles } from 'lucide-react';
import { useStitchFlow } from '../context/StitchFlowContext';
import { UserRole } from '../types';

interface AccessGateProps {
  requiredRole: UserRole;
  portalName: string;
  portalDescription: string;
}

export const AccessGate: React.FC<AccessGateProps> = ({
  requiredRole,
  portalName,
  portalDescription
}) => {
  const { setAuthModalOpen, setAuthTargetRole, setCurrentRole } = useStitchFlow();

  const handleUnlock = () => {
    setAuthTargetRole(requiredRole);
    setAuthModalOpen(true);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="relative mx-auto w-20 h-20 rounded-3xl bg-[#161311] dark:bg-[#24201D] text-[#D4A347] flex items-center justify-center border-2 border-[#D4A347]/40 shadow-2xl">
        <Lock className="w-10 h-10" />
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#C25E34] ring-4 ring-[#FAF6F0] dark:ring-[#12100E]" />
      </div>

      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-widest text-[#8C6D2D] dark:text-[#D4A347]">
          Restricted Portal Boundary
        </span>
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#161311] dark:text-[#F5EFE6]">
          {portalName}
        </h2>
        <p className="text-xs sm:text-sm text-[#6A5D52] dark:text-[#B8ABA0] max-w-md mx-auto leading-relaxed">
          {portalDescription}
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-[#1C1917] border border-[#E5DACB] dark:border-[#332C27] max-w-md mx-auto text-xs text-[#6A5D52] dark:text-[#B8ABA0] space-y-1 shadow-sm">
        <p className="font-semibold text-[#161311] dark:text-[#F5EFE6]">
          🔒 Demo role gate:
        </p>
        <p>
          This prototype separates portal experiences for demonstration. Production confidentiality requires server-side authentication, authorization, and tenant-scoped data controls.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          onClick={handleUnlock}
          className="w-full sm:w-auto px-6 py-3.5 bg-[#161311] dark:bg-[#D4A347] hover:bg-[#2C241E] text-white dark:text-[#161311] rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2"
        >
          <KeyRound className="w-4 h-4 text-[#D4A347] dark:text-[#161311]" />
          <span>Authenticate &amp; Enter Portal</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={() => setCurrentRole('visitor')}
          className="w-full sm:w-auto px-5 py-3.5 bg-white dark:bg-[#1C1917] border border-[#E5DACB] dark:border-[#332C27] text-[#161311] dark:text-[#F5EFE6] rounded-2xl text-xs font-semibold hover:bg-[#F3ECE1] dark:hover:bg-[#24201D] transition-colors"
        >
          Return to Public Lookbook
        </button>
      </div>
    </div>
  );
};
