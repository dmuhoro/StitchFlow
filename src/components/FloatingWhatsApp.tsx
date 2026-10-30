/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MessageCircle, X, Send, Sparkles, Clock, MapPin } from 'lucide-react';

interface FloatingWhatsAppProps {
  phoneNumber?: string;
  atelierName?: string;
}

export const FloatingWhatsApp: React.FC<FloatingWhatsAppProps> = ({
  phoneNumber = '+254712345678',
  atelierName = 'StitchFlow Pan-African Atelier'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customMsg, setCustomMsg] = useState('');

  const quickPrompts = [
    'I want to commission a 3-Piece Grand Royal Agbada set.',
    'I need a bespoke Ruracio traditional wedding bridal ensemble.',
    'I would like to order a tailored Senator Kaftan suit.',
    'Can I bring authentic Vlisco Hollandais / Aso-Oke fabric for fitting?'
  ];

  const handleSend = (text: string) => {
    const encoded = encodeURIComponent(text);
    const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanNumber}?text=${encoded}`, '_blank');
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Expanded Quick Chat Card */}
      {isOpen && (
        <div className="mb-3 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-[#E5DACB] overflow-hidden transition-all animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="bg-[#161311] text-[#FAF6F0] p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center text-white font-bold">
                  <MessageCircle className="w-6 h-6 fill-current" />
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full ring-2 ring-[#161311]" />
              </div>
              <div>
                <h4 className="font-display font-bold text-base leading-tight text-[#FAF6F0]">
                  {atelierName}
                </h4>
                <div className="flex items-center gap-2 text-[11px] text-[#D4A347]">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Master Tailors Online
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[#98897C] hover:text-white p-1 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-3 bg-[#FAF6F0]">
            <div className="bg-white p-3 rounded-2xl border border-[#E5DACB] text-xs text-[#1A1715] space-y-1">
              <p className="font-semibold text-[#8C6D2D] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Karibu / Welcome to our African Atelier
              </p>
              <p className="text-[#6A5D52] leading-relaxed">
                Connect directly with Master Agbada Architect Amani Mutiso or Bridal Artisan Zari Odhiambo on WhatsApp for measurements, traditional wedding coordination, and rush ceremonial commissions.
              </p>
            </div>

            {/* Quick Prompt Buttons */}
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase font-bold tracking-wider text-[#98897C]">
                Ceremonial Inquiry Prompts:
              </p>
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  className="w-full text-left text-xs bg-white hover:bg-[#F3ECE1] text-[#1A1715] p-2.5 rounded-xl border border-[#E5DACB] transition-colors flex items-center justify-between group"
                >
                  <span className="line-clamp-1">{prompt}</span>
                  <Send className="w-3 h-3 text-[#D4A347] group-hover:translate-x-0.5 transition-transform" />
                </button>
              ))}
            </div>

            {/* Custom input */}
            <div className="pt-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Inquire about custom African tailoring..."
                  value={customMsg}
                  onChange={(e) => setCustomMsg(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customMsg.trim()) {
                      handleSend(customMsg);
                    }
                  }}
                  className="flex-1 text-xs px-3 py-2 bg-white border border-[#C8B69F] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#D4A347]"
                />
                <button
                  onClick={() => customMsg.trim() && handleSend(customMsg)}
                  className="px-3.5 py-2 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-xl flex items-center justify-center transition-colors shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="text-[10px] text-center text-[#98897C] flex items-center justify-center gap-1">
              <MapPin className="w-3 h-3" /> Kilimani Atelier Salon, Nairobi, Kenya
            </div>
          </div>
        </div>
      )}

      {/* Floating Pill Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-4 py-3 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 group focus:outline-none focus:ring-4 focus:ring-green-400/40"
        aria-label="Chat on WhatsApp with StitchFlow African Atelier"
      >
        <MessageCircle className="w-5 h-5 fill-current" />
        <span className="text-xs font-bold tracking-wide uppercase">
          WhatsApp Atelier
        </span>
      </button>
    </div>
  );
};
