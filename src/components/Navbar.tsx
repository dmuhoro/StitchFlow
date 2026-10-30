/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Scissors, 
  Search, 
  Calendar, 
  Menu, 
  X, 
  RotateCcw,
  Sparkles,
  User,
  Crown,
  GitCommit
} from 'lucide-react';
import { useStitchFlow } from '../context/StitchFlowContext';
import { UserRole } from '../types';
import { DeliverablesManagerModal } from './DeliverablesManagerModal';

export const Navbar: React.FC = () => {
  const { 
    currentRole, 
    setCurrentRole, 
    currency, 
    setCurrency, 
    setTrackingModalOpen,
    setBookingModalOpen,
    resetToDefaults
  } = useStitchFlow();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [deliverablesModalOpen, setDeliverablesModalOpen] = useState(false);

  const roles: { id: UserRole; label: string; icon: React.ReactNode; badge: string }[] = [
    { id: 'visitor', label: 'African Lookbook & Booking', icon: <Sparkles className="w-3.5 h-3.5" />, badge: 'Public' },
    { id: 'owner', label: 'Atelier Director Suite', icon: <Crown className="w-3.5 h-3.5" />, badge: 'Director' },
    { id: 'employee', label: 'Master Artisan Bench', icon: <Scissors className="w-3.5 h-3.5" />, badge: 'Artisans' },
    { id: 'client', label: 'VIP Patron Portal', icon: <User className="w-3.5 h-3.5" />, badge: 'Patron' }
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#FAF6F0]/90 backdrop-blur-md border-b border-[#E5DACB] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            
            {/* Brand Logo & Pan-African Atelier Identity */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setCurrentRole('visitor')}
                className="flex items-center gap-2.5 text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-[#161311] flex items-center justify-center text-[#D4A347] shadow-sm transition-transform group-hover:scale-105 border border-[#D4A347]/30">
                  <Scissors className="w-5 h-5 -rotate-45" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-display text-xl sm:text-2xl font-bold tracking-wider text-[#161311] uppercase">
                      StitchFlow
                    </span>
                    <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-[#D4A347]/20 text-[#8C6D2D] border border-[#D4A347]/40">
                      African Couture
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6A5D52] font-medium hidden sm:block">
                    Grand Agbada, Senator Sets & Cultural Atelier SaaS
                  </p>
                </div>
              </button>
            </div>

            {/* Desktop Role Switcher Bar */}
            <div className="hidden lg:flex items-center bg-[#F3ECE1] p-1 rounded-full border border-[#E5DACB]">
              {roles.map((r) => {
                const isActive = currentRole === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setCurrentRole(r.id)}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                      isActive 
                        ? 'bg-[#161311] text-[#FAF6F0] shadow-sm font-semibold' 
                        : 'text-[#6A5D52] hover:text-[#161311] hover:bg-[#EAE0D2]'
                    }`}
                  >
                    <span className={isActive ? 'text-[#D4A347]' : 'text-inherit'}>
                      {r.icon}
                    </span>
                    <span>{r.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Actions & Utilities */}
            <div className="hidden sm:flex items-center gap-2.5">
              
              {/* Deliverables Commit Manager Button */}
              <button
                onClick={() => setDeliverablesModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-[#D4A347]/50 bg-[#FAF6F0] text-[#161311] hover:bg-[#D4A347]/10 transition-colors shadow-sm"
                title="Review and commit deliverables individually"
              >
                <GitCommit className="w-3.5 h-3.5 text-[#D4A347]" />
                <span>Deliverables (17)</span>
              </button>

              {/* Currency toggle */}
              <div className="flex items-center bg-[#F3ECE1] rounded-lg p-0.5 border border-[#E5DACB] text-xs font-semibold">
                <button
                  onClick={() => setCurrency('KES')}
                  className={`px-2 py-1 rounded transition-colors ${
                    currency === 'KES' ? 'bg-[#161311] text-[#FAF6F0]' : 'text-[#6A5D52] hover:text-[#161311]'
                  }`}
                  title="Kenyan Shilling"
                >
                  KES
                </button>
                <button
                  onClick={() => setCurrency('USD')}
                  className={`px-2 py-1 rounded transition-colors ${
                    currency === 'USD' ? 'bg-[#161311] text-[#FAF6F0]' : 'text-[#6A5D52] hover:text-[#161311]'
                  }`}
                  title="US Dollar"
                >
                  USD
                </button>
              </div>

              {/* Quick Track Order Button */}
              <button
                onClick={() => setTrackingModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-[#E5DACB] bg-white text-[#161311] hover:border-[#161311] transition-colors"
              >
                <Search className="w-3.5 h-3.5 text-[#D4A347]" />
                <span>Track Garment</span>
              </button>

              {/* Book Cultural Appointment */}
              <button
                onClick={() => setBookingModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#161311] text-[#FAF6F0] hover:bg-[#2C241E] transition-all shadow-sm"
              >
                <Calendar className="w-3.5 h-3.5 text-[#D4A347]" />
                <span>Book Fitting</span>
              </button>

              {/* Reset Data Pill */}
              <button
                onClick={resetToDefaults}
                className="p-2 text-[#98897C] hover:text-[#161311] hover:bg-[#F3ECE1] rounded-lg transition-colors"
                title="Reset showcase data to initial African couture state"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Mobile hamburger */}
            <div className="flex sm:hidden items-center gap-2">
              <button
                onClick={() => setDeliverablesModalOpen(true)}
                className="p-2 text-[#161311] bg-white border border-[#E5DACB] rounded-lg"
                title="Deliverables"
              >
                <GitCommit className="w-4 h-4 text-[#D4A347]" />
              </button>
              <button
                onClick={() => setTrackingModalOpen(true)}
                className="p-2 text-[#161311] bg-white border border-[#E5DACB] rounded-lg"
                title="Track Order"
              >
                <Search className="w-4 h-4 text-[#D4A347]" />
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-[#161311] bg-[#F3ECE1] rounded-lg"
                aria-label="Open menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#FAF6F0] border-b border-[#E5DACB] px-4 pt-3 pb-6 space-y-4">
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#98897C] px-2 mb-2">
                Select Atelier View
              </p>
              <div className="grid grid-cols-2 gap-2">
                {roles.map(r => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setCurrentRole(r.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium text-left border ${
                      currentRole === r.id 
                        ? 'bg-[#161311] text-white border-[#161311]' 
                        : 'bg-white text-[#161311] border-[#E5DACB]'
                    }`}
                  >
                    <span className={currentRole === r.id ? 'text-[#D4A347]' : 'text-[#6A5D52]'}>
                      {r.icon}
                    </span>
                    <div className="truncate">
                      <div className="font-semibold">{r.label}</div>
                      <div className="text-[10px] opacity-75">{r.badge}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#E5DACB]">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#6A5D52]">Currency:</span>
                <div className="flex rounded border border-[#E5DACB] overflow-hidden">
                  <button 
                    onClick={() => setCurrency('KES')}
                    className={`px-2 py-1 text-xs font-semibold ${currency === 'KES' ? 'bg-[#161311] text-white' : 'bg-white'}`}
                  >
                    KES
                  </button>
                  <button 
                    onClick={() => setCurrency('USD')}
                    className={`px-2 py-1 text-xs font-semibold ${currency === 'USD' ? 'bg-[#161311] text-white' : 'bg-white'}`}
                  >
                    USD
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  setBookingModalOpen(true);
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#161311] text-white"
              >
                <Calendar className="w-3.5 h-3.5 text-[#D4A347]" />
                <span>Book Fitting</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Deliverables Manager Modal */}
      <DeliverablesManagerModal
        isOpen={deliverablesModalOpen}
        onClose={() => setDeliverablesModalOpen(false)}
      />
    </>
  );
};
