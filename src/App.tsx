/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { StitchFlowProvider, useStitchFlow } from './context/StitchFlowContext';
import { Navbar } from './components/Navbar';
import { PublicPortfolio } from './components/PublicPortfolio';
import { OwnerDashboard } from './components/OwnerDashboard';
import { TailorDashboard } from './components/TailorDashboard';
import { ClientPortal } from './components/ClientPortal';
import { OrderTrackerModal } from './components/OrderTrackerModal';
import { BookingModal } from './components/BookingModal';
import { FloatingWhatsApp } from './components/FloatingWhatsApp';
import { Scissors, ShieldCheck } from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentRole, setCurrentRole, toastMessage } = useStitchFlow();

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF6F0] dark:bg-[#12100E] text-[#1A1715] dark:text-[#F5EFE6] transition-colors">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 max-w-md bg-[#161311] dark:bg-[#24201D] text-[#FAF6F0] px-4 py-3 rounded-2xl shadow-2xl border border-[#D4A347]/40 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="w-2 h-2 rounded-full bg-[#D4A347] animate-ping" />
          <p className="text-xs font-medium leading-snug">{toastMessage}</p>
        </div>
      )}

      {/* Primary Navigation */}
      <Navbar />

      {/* Main Role-Based Content Area */}
      <main className="flex-1">
        {currentRole === 'visitor' && <PublicPortfolio />}
        {currentRole === 'owner' && <OwnerDashboard />}
        {currentRole === 'employee' && <TailorDashboard />}
        {currentRole === 'client' && <ClientPortal />}
      </main>

      {/* Interactive Global Modals */}
      <OrderTrackerModal />
      <BookingModal />

      {/* Floating WhatsApp Action Anchor */}
      <FloatingWhatsApp />

      {/* Atelier Footer */}
      <footer className="bg-[#161311] dark:bg-[#0D0B0A] text-[#FAF6F0] border-t border-[#2C241E] mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#D4A347] flex items-center justify-center text-[#161311]">
                  <Scissors className="w-4 h-4 -rotate-45" />
                </div>
                <span className="font-display text-xl font-bold tracking-wider uppercase text-white">
                  StitchFlow
                </span>
              </div>
              <p className="text-xs text-[#98897C] leading-relaxed">
                The all-in-one vertical SaaS platform engineered for Pan-African bespoke fashion houses, Grand Agbada master cutters, and Kitenge bridal ateliers across Nairobi, Lagos, and Accra.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#D4A347] mb-3">
                Atelier Portals
              </h4>
              <ul className="space-y-2 text-xs text-[#C8B69F]">
                <li>
                  <button onClick={() => setCurrentRole('visitor')} className="hover:text-white transition-colors">
                    African Lookbook & Booking
                  </button>
                </li>
                <li>
                  <button onClick={() => setCurrentRole('owner')} className="hover:text-white transition-colors">
                    Atelier Director Suite (Owner)
                  </button>
                </li>
                <li>
                  <button onClick={() => setCurrentRole('employee')} className="hover:text-white transition-colors">
                    Master Artisan Workbench (Tailor)
                  </button>
                </li>
                <li>
                  <button onClick={() => setCurrentRole('client')} className="hover:text-white transition-colors">
                    VIP Patron Private Portal
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#D4A347] mb-3">
                Atelier Location
              </h4>
              <p className="text-xs text-[#C8B69F] leading-relaxed">
                Acacia Heights, Suite 402<br />
                Kilimani, Nairobi, Kenya<br />
                WhatsApp: +254 712 345 678<br />
                Direct fittings by appointment.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#D4A347] mb-3">
                Security & Appearance
              </h4>
              <p className="text-xs text-[#98897C] leading-relaxed">
                Protected by strict Role-Based Access Control (RBAC). Featuring System, Warm Linen Light, and Ebony Obsidian Dark appearances.
              </p>
            </div>

          </div>

          <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-[#98897C] gap-4">
            <p>© {new Date().getFullYear()} StitchFlow Atelier. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-[#D4A347]">
                <ShieldCheck className="w-3.5 h-3.5" /> WCAG 2.1 AA Compliant
              </span>
              <span>•</span>
              <span>Role-Based Access Control</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <StitchFlowProvider>
      <AppContent />
    </StitchFlowProvider>
  );
}
