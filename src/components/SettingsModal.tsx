/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  Settings, 
  Sun, 
  Moon, 
  Laptop, 
  DollarSign, 
  Ruler, 
  Bell, 
  Phone, 
  ShieldCheck, 
  Save, 
  Sparkles 
} from 'lucide-react';
import { useStitchFlow } from '../context/StitchFlowContext';
import { ThemeMode } from '../types';

export const SettingsModal: React.FC = () => {
  const { 
    settingsModalOpen, 
    setSettingsModalOpen, 
    settings, 
    updateSettings, 
    themeMode, 
    setThemeMode 
  } = useStitchFlow();

  const [atelierName, setAtelierName] = useState(settings.atelier_name);
  const [tagline, setTagline] = useState(settings.studio_tagline);
  const [phone, setPhone] = useState(settings.whatsapp_number);
  const [currency, setCurrency] = useState(settings.currency);
  const [unit, setUnit] = useState(settings.default_unit);
  const [notifications, setNotifications] = useState(settings.notifications_enabled);

  if (!settingsModalOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      atelier_name: atelierName,
      studio_tagline: tagline,
      whatsapp_number: phone,
      currency,
      default_unit: unit,
      notifications_enabled: notifications
    });
    setSettingsModalOpen(false);
  };

  const appearanceOptions: { mode: ThemeMode; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      mode: 'system',
      label: 'System Adaptive',
      icon: <Laptop className="w-4 h-4" />,
      desc: 'Matches your OS appearance preferences automatically'
    },
    {
      mode: 'light',
      label: 'Warm Linen Light',
      icon: <Sun className="w-4 h-4" />,
      desc: 'Savannah gold and unbleached cotton daylight tones'
    },
    {
      mode: 'dark',
      label: 'Ebony Obsidian Dark',
      icon: <Moon className="w-4 h-4" />,
      desc: 'Carved African ebony and nocturnal gold filigree'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-xl bg-white dark:bg-[#1C1917] rounded-3xl shadow-2xl border border-[#E5DACB] dark:border-[#332C27] overflow-hidden text-[#1A1715] dark:text-[#F5EFE6] transition-colors">
        
        {/* Header */}
        <div className="bg-[#161311] dark:bg-[#0D0B0A] text-[#FAF6F0] px-6 py-5 flex items-center justify-between border-b border-[#2C241E]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D4A347] flex items-center justify-center text-[#161311] shadow-sm">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-xl sm:text-2xl font-bold tracking-wide text-white">
                Atelier Settings & Appearance
              </h3>
              <p className="text-xs text-[#98897C] mt-0.5">
                Configure theme modes, African currency conventions, and studio profile.
              </p>
            </div>
          </div>
          <button
            onClick={() => setSettingsModalOpen(false)}
            className="text-[#98897C] hover:text-white p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Body */}
        <form onSubmit={handleSave} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* 1. APPEARANCE & THEME - PRD Focus */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D4A347]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#6A5D52] dark:text-[#B8ABA0]">
                Visual Theme & Appearance
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {appearanceOptions.map(opt => {
                const isSelected = themeMode === opt.mode;
                return (
                  <button
                    key={opt.mode}
                    type="button"
                    onClick={() => setThemeMode(opt.mode)}
                    className={`text-left p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                      isSelected 
                        ? 'border-[#D4A347] bg-[#FAF6F0] dark:bg-[#24201D] ring-2 ring-[#D4A347]' 
                        : 'border-[#E5DACB] dark:border-[#332C27] bg-white dark:bg-[#1C1917] hover:border-[#C8B69F]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`p-2 rounded-xl ${
                        isSelected 
                          ? 'bg-[#D4A347] text-[#161311]' 
                          : 'bg-[#F3ECE1] dark:bg-[#24201D] text-[#6A5D52] dark:text-[#B8ABA0]'
                      }`}>
                        {opt.icon}
                      </span>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-[#D4A347] animate-pulse" />
                      )}
                    </div>
                    <div className="mt-3">
                      <div className="font-bold text-xs text-[#161311] dark:text-[#F5EFE6]">
                        {opt.label}
                      </div>
                      <div className="text-[10px] text-[#6A5D52] dark:text-[#8A7D73] mt-0.5 leading-snug">
                        {opt.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. CURRENCY & MEASUREMENT UNITS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#F3ECE1] dark:border-[#332C27]">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#6A5D52] dark:text-[#B8ABA0]">
                Currency Display
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCurrency('KES')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    currency === 'KES' 
                      ? 'bg-[#161311] dark:bg-[#D4A347] text-white dark:text-[#161311] border-[#161311]' 
                      : 'bg-white dark:bg-[#24201D] border-[#E5DACB] dark:border-[#332C27]'
                  }`}
                >
                  KES (Shillings)
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency('USD')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    currency === 'USD' 
                      ? 'bg-[#161311] dark:bg-[#D4A347] text-white dark:text-[#161311] border-[#161311]' 
                      : 'bg-white dark:bg-[#24201D] border-[#E5DACB] dark:border-[#332C27]'
                  }`}
                >
                  USD ($)
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#6A5D52] dark:text-[#B8ABA0]">
                Default Measurement Unit
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setUnit('in')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    unit === 'in' 
                      ? 'bg-[#161311] dark:bg-[#D4A347] text-white dark:text-[#161311] border-[#161311]' 
                      : 'bg-white dark:bg-[#24201D] border-[#E5DACB] dark:border-[#332C27]'
                  }`}
                >
                  Inches (in)
                </button>
                <button
                  type="button"
                  onClick={() => setUnit('cm')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    unit === 'cm' 
                      ? 'bg-[#161311] dark:bg-[#D4A347] text-white dark:text-[#161311] border-[#161311]' 
                      : 'bg-white dark:bg-[#24201D] border-[#E5DACB] dark:border-[#332C27]'
                  }`}
                >
                  Centimeters (cm)
                </button>
              </div>
            </div>
          </div>

          {/* 3. STUDIO BRANDING */}
          <div className="space-y-3 pt-2 border-t border-[#F3ECE1] dark:border-[#332C27]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#6A5D52] dark:text-[#B8ABA0]">
              Studio Information & Official Channel
            </h4>

            <div>
              <label className="block text-xs font-semibold mb-1 text-[#6A5D52] dark:text-[#B8ABA0]">
                Atelier Brand Name
              </label>
              <input
                type="text"
                value={atelierName}
                onChange={(e) => setAtelierName(e.target.value)}
                className="w-full p-2.5 bg-white dark:bg-[#24201D] border border-[#C8B69F] dark:border-[#4A4039] rounded-xl text-xs focus:ring-1 focus:ring-[#D4A347]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-[#6A5D52] dark:text-[#B8ABA0]">
                Tagline / Cultural Motto
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full p-2.5 bg-white dark:bg-[#24201D] border border-[#C8B69F] dark:border-[#4A4039] rounded-xl text-xs focus:ring-1 focus:ring-[#D4A347]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-[#6A5D52] dark:text-[#B8ABA0]">
                Official Atelier WhatsApp Hotline
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#98897C] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#24201D] border border-[#C8B69F] dark:border-[#4A4039] rounded-xl text-xs focus:ring-1 focus:ring-[#D4A347]"
                />
              </div>
            </div>
          </div>

          {/* 4. NOTIFICATION TOGGLE */}
          <div className="flex items-center justify-between pt-2 border-t border-[#F3ECE1] dark:border-[#332C27]">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#D4A347]" />
              <div>
                <span className="text-xs font-bold text-[#161311] dark:text-[#F5EFE6]">
                  Production Stage Toast Alerts
                </span>
                <p className="text-[11px] text-[#6A5D52] dark:text-[#8A7D73]">
                  Receive popups when garments advance along cutting benches
                </p>
              </div>
            </div>

            <input
              type="checkbox"
              checked={notifications}
              onChange={(e) => setNotifications(e.target.checked)}
              className="w-4 h-4 rounded text-[#D4A347] focus:ring-[#D4A347]"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-[#E5DACB] dark:border-[#332C27] flex items-center justify-between">
            <span className="text-[11px] text-[#6A5D52] dark:text-[#8A7D73] flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#D4A347]" /> Preferences persist locally
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSettingsModalOpen(false)}
                className="px-4 py-2 border border-[#C8B69F] dark:border-[#4A4039] rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#161311] dark:bg-[#D4A347] text-white dark:text-[#161311] rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Preferences</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
