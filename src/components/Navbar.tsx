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
  GitCommit,
  Sun,
  Moon,
  Laptop,
  Settings,
  Lock,
  KeyRound,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { useStitchFlow } from '../context/StitchFlowContext';
import { UserRole } from '../types';
import { DeliverablesManagerModal } from './DeliverablesManagerModal';
import { SettingsModal } from './SettingsModal';
import { AuthModal } from './AuthModal';

export const Navbar: React.FC = () => {
  const { 
    currentRole, 
    setCurrentRole, 
    themeMode, 
    setThemeMode,
    currency, 
    setCurrency, 
    setTrackingModalOpen,
    setBookingModalOpen,
    resetToDefaults,
    currentUser,
    logout,
    hasPermission,
    setSettingsModalOpen,
    setAuthModalOpen,
    setAuthTargetRole
  } = useStitchFlow();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [deliverablesModalOpen, setDeliverablesModalOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const roles: { id: UserRole; label: string; icon: React.ReactNode; badge: string; isProtected: boolean }[] = [
    { id: 'visitor', label: 'African Lookbook & Booking', icon: <Sparkles className="w-3.5 h-3.5" />, badge: 'Public', isProtected: false },
    { id: 'owner', label: 'Atelier Director Suite', icon: <Crown className="w-3.5 h-3.5" />, badge: 'Director', isProtected: true },
    { id: 'employee', label: 'Master Artisan Bench', icon: <Scissors className="w-3.5 h-3.5" />, badge: 'Artisans', isProtected: true },
    { id: 'client', label: 'VIP Patron Portal', icon: <User className="w-3.5 h-3.5" />, badge: 'Patron', isProtected: true }
  ];

  const handleRoleClick = (role: UserRole) => {
    setCurrentRole(role);
    setMobileMenuOpen(false);
  };

  const cycleTheme = () => {
    if (themeMode === 'system') setThemeMode('light');
    else if (themeMode === 'light') setThemeMode('dark');
    else setThemeMode('system');
  };

  const getThemeIcon = () => {
    if (themeMode === 'system') return <Laptop className="w-3.5 h-3.5 text-[#D4A347]" />;
    if (themeMode === 'light') return <Sun className="w-3.5 h-3.5 text-amber-500" />;
    return <Moon className="w-3.5 h-3.5 text-[#D4A347]" />;
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#FAF6F0]/90 dark:bg-[#12100E]/90 backdrop-blur-md border-b border-[#E5DACB] dark:border-[#332C27] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            
            {/* Brand Logo & Pan-African Atelier Identity */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => handleRoleClick('visitor')}
                className="flex items-center gap-2.5 text-left group"
              >
                <div className="w-10 h-10 rounded-2xl bg-[#161311] dark:bg-[#24201D] flex items-center justify-center text-[#D4A347] shadow-sm transition-transform group-hover:scale-105 border border-[#D4A347]/30">
                  <Scissors className="w-5 h-5 -rotate-45" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-display text-xl sm:text-2xl font-bold tracking-wider text-[#161311] dark:text-[#F5EFE6] uppercase">
                      StitchFlow
                    </span>
                    <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-[#D4A347]/20 text-[#8C6D2D] dark:text-[#D4A347] border border-[#D4A347]/40">
                      African Couture
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6A5D52] dark:text-[#B8ABA0] font-medium hidden sm:block">
                    Agbada, Senator & Cultural Atelier SaaS
                  </p>
                </div>
              </button>
            </div>

            {/* Desktop Role Switcher Bar with Access Indicators */}
            <div className="hidden xl:flex items-center bg-[#F3ECE1] dark:bg-[#1C1917] p-1 rounded-full border border-[#E5DACB] dark:border-[#332C27]">
              {roles.map((r) => {
                const isActive = currentRole === r.id;
                const isPermitted = hasPermission(r.id);

                return (
                  <button
                    key={r.id}
                    onClick={() => handleRoleClick(r.id)}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                      isActive 
                        ? 'bg-[#161311] dark:bg-[#D4A347] text-[#FAF6F0] dark:text-[#161311] shadow-sm font-semibold' 
                        : 'text-[#6A5D52] dark:text-[#B8ABA0] hover:text-[#161311] dark:hover:text-white hover:bg-[#EAE0D2] dark:hover:bg-[#24201D]'
                    }`}
                  >
                    <span className={isActive ? 'text-[#D4A347] dark:text-[#161311]' : 'text-inherit'}>
                      {r.icon}
                    </span>
                    <span>{r.label}</span>
                    {r.isProtected && !isPermitted && (
                      <span title="Authentication required">
                        <Lock className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Actions & Utilities */}
            <div className="hidden sm:flex items-center gap-2">
              
              {/* Theme Switcher Toggle (System / Light / Dark) */}
              <div className="relative">
                <button
                  onClick={cycleTheme}
                  className="flex items-center gap-1.5 p-2 rounded-xl border border-[#E5DACB] dark:border-[#332C27] bg-white dark:bg-[#1C1917] text-xs font-semibold hover:border-[#D4A347] transition-colors"
                  title={`Appearance: ${themeMode.toUpperCase()} (Click to cycle System -> Light -> Dark)`}
                >
                  {getThemeIcon()}
                  <span className="text-[11px] uppercase font-bold text-[#6A5D52] dark:text-[#B8ABA0] hidden md:inline">
                    {themeMode}
                  </span>
                </button>
              </div>

              {/* Atelier Settings Button */}
              <button
                onClick={() => setSettingsModalOpen(true)}
                className="p-2 rounded-xl border border-[#E5DACB] dark:border-[#332C27] bg-white dark:bg-[#1C1917] text-[#6A5D52] dark:text-[#B8ABA0] hover:text-[#161311] dark:hover:text-white hover:border-[#D4A347] transition-colors"
                title="Atelier Settings & Preferences"
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* Deliverables Commit Manager Button */}
              <button
                onClick={() => setDeliverablesModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-[#D4A347]/50 bg-[#FAF6F0] dark:bg-[#24201D] text-[#161311] dark:text-[#F5EFE6] hover:bg-[#D4A347]/10 transition-colors shadow-sm"
                title="Review and commit deliverables individually"
              >
                <GitCommit className="w-3.5 h-3.5 text-[#D4A347]" />
                <span className="hidden lg:inline">Deliverables</span>
                <span>(17)</span>
              </button>

              {/* Authentication Status / Profile Switcher */}
              {currentUser ? (
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-2xl border border-[#E5DACB] dark:border-[#332C27] bg-white dark:bg-[#1C1917] hover:border-[#D4A347] transition-colors"
                  >
                    <img
                      src={currentUser.avatar_url}
                      alt={currentUser.full_name}
                      className="w-6 h-6 rounded-full object-cover border border-[#D4A347]"
                    />
                    <div className="text-left leading-tight hidden md:block">
                      <div className="text-[11px] font-bold text-[#161311] dark:text-[#F5EFE6] truncate max-w-[90px]">
                        {currentUser.full_name.split(' ')[0]}
                      </div>
                      <div className="text-[9px] uppercase font-bold text-[#8C6D2D] dark:text-[#D4A347]">
                        {currentUser.role}
                      </div>
                    </div>
                    <ChevronDown className="w-3 h-3 text-[#98897C]" />
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#1C1917] shadow-2xl border border-[#E5DACB] dark:border-[#332C27] p-2 z-50 text-xs">
                      <div className="px-3 py-2 border-b border-[#F3ECE1] dark:border-[#332C27]">
                        <p className="font-bold text-[#161311] dark:text-[#F5EFE6]">{currentUser.full_name}</p>
                        <p className="text-[11px] text-[#6A5D52] dark:text-[#B8ABA0] capitalize">{currentUser.role} • {currentUser.title}</p>
                      </div>

                      <button
                        onClick={() => {
                          setAuthTargetRole(null);
                          setAuthModalOpen(true);
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-[#FAF6F0] dark:hover:bg-[#24201D] rounded-xl flex items-center gap-2 text-[#161311] dark:text-[#F5EFE6]"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-[#D4A347]" />
                        <span>Switch Authenticated Role</span>
                      </button>

                      <button
                        onClick={() => {
                          logout();
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out of Atelier</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => {
                    setAuthTargetRole(null);
                    setAuthModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#161311] dark:bg-[#D4A347] text-[#FAF6F0] dark:text-[#161311] hover:bg-[#2C241E] transition-all shadow-sm"
                >
                  <KeyRound className="w-3.5 h-3.5 text-[#D4A347] dark:text-[#161311]" />
                  <span>Atelier Sign In</span>
                </button>
              )}

              {/* Reset Data Pill */}
              <button
                onClick={resetToDefaults}
                className="p-2 text-[#98897C] hover:text-[#161311] dark:hover:text-white hover:bg-[#F3ECE1] dark:hover:bg-[#24201D] rounded-xl transition-colors"
                title="Reset showcase data"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Mobile Actions */}
            <div className="flex sm:hidden items-center gap-1.5">
              <button
                onClick={cycleTheme}
                className="p-2 text-[#161311] dark:text-white bg-white dark:bg-[#1C1917] border border-[#E5DACB] dark:border-[#332C27] rounded-xl"
                title="Theme"
              >
                {getThemeIcon()}
              </button>
              <button
                onClick={() => setSettingsModalOpen(true)}
                className="p-2 text-[#161311] dark:text-white bg-white dark:bg-[#1C1917] border border-[#E5DACB] dark:border-[#332C27] rounded-xl"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-[#161311] dark:text-white bg-[#F3ECE1] dark:bg-[#24201D] rounded-xl"
                aria-label="Open menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="xl:hidden bg-[#FAF6F0] dark:bg-[#12100E] border-b border-[#E5DACB] dark:border-[#332C27] px-4 pt-3 pb-6 space-y-4">
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#98897C] px-2 mb-2">
                Atelier Portals (Role Protected)
              </p>
              <div className="grid grid-cols-2 gap-2">
                {roles.map(r => {
                  const isPermitted = hasPermission(r.id);
                  return (
                    <button
                      key={r.id}
                      onClick={() => handleRoleClick(r.id)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl text-xs font-medium text-left border ${
                        currentRole === r.id 
                          ? 'bg-[#161311] dark:bg-[#D4A347] text-white dark:text-[#161311] border-[#161311]' 
                          : 'bg-white dark:bg-[#1C1917] text-[#161311] dark:text-[#F5EFE6] border-[#E5DACB] dark:border-[#332C27]'
                      }`}
                    >
                      <span className={currentRole === r.id ? 'text-[#D4A347] dark:text-[#161311]' : 'text-[#6A5D52]'}>
                        {r.icon}
                      </span>
                      <div className="truncate flex-1">
                        <div className="font-semibold flex items-center justify-between">
                          <span>{r.label.split(' ')[0]}</span>
                          {r.isProtected && !isPermitted && <Lock className="w-2.5 h-2.5 opacity-60" />}
                        </div>
                        <div className="text-[10px] opacity-75">{r.badge}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mobile Auth and Utilities */}
            <div className="pt-2 border-t border-[#E5DACB] dark:border-[#332C27] flex items-center justify-between">
              {currentUser ? (
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <img src={currentUser.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                    <span className="text-xs font-bold text-[#161311] dark:text-[#F5EFE6]">{currentUser.full_name}</span>
                  </div>
                  <button
                    onClick={logout}
                    className="text-xs text-red-600 font-bold px-2 py-1 rounded bg-red-50 dark:bg-red-950/40"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setAuthTargetRole(null);
                    setAuthModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2 bg-[#161311] dark:bg-[#D4A347] text-white dark:text-[#161311] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5 text-[#D4A347] dark:text-[#161311]" />
                  <span>Authenticate Portal Access</span>
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Deliverables Manager Modal */}
      <DeliverablesManagerModal
        isOpen={deliverablesModalOpen}
        onClose={() => setDeliverablesModalOpen(false)}
      />

      {/* Settings Modal */}
      <SettingsModal />

      {/* Auth Modal */}
      <AuthModal />
    </>
  );
};
