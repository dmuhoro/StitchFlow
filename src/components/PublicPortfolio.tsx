/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Sparkles, 
  Calendar, 
  Search, 
  Clock, 
  Scissors, 
  MessageCircle, 
  Instagram, 
  ExternalLink, 
  Check, 
  Star, 
  ArrowRight,
  ShieldCheck,
  Compass,
  Heart,
  Share2,
  X,
  Layers,
  MapPin
} from 'lucide-react';
import { useStitchFlow } from '../context/StitchFlowContext';
import { LookbookItem } from '../types';

export const PublicPortfolio: React.FC = () => {
  const { 
    lookbook, 
    feedbacks, 
    setBookingModalOpen, 
    setSelectedLookbookForBooking,
    setTrackingModalOpen,
    setSelectedTrackOrderId
  } = useStitchFlow();

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeModalLook, setActiveModalLook] = useState<LookbookItem | null>(null);
  const [trackInput, setTrackInput] = useState('');

  const categories = [
    'All',
    'Grand Agbada & Boubou',
    'Senator Suits & Kaftans',
    'Ceremonial & Bridal',
    'Modern Kitenge & Wax',
    'Heritage Tunics & Kanzu'
  ];

  const filteredItems = selectedCategory === 'All' 
    ? lookbook 
    : lookbook.filter(item => item.category === selectedCategory);

  const handleBookLook = (item: LookbookItem) => {
    setSelectedLookbookForBooking(item);
    setBookingModalOpen(true);
    setActiveModalLook(null);
  };

  const handleInquireWhatsApp = (item: LookbookItem) => {
    const text = `Hello StitchFlow African Atelier, I would like to commission "${item.title}" (${item.category}). Origin: ${item.cultural_origin}. Fabric: ${item.fabric}. Could we discuss measurements and ceremonial fitting?`;
    window.open(`https://wa.me/254712345678?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleQuickTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackInput.trim()) {
      setSelectedTrackOrderId(trackInput.trim().toUpperCase());
      setTrackingModalOpen(true);
    }
  };

  return (
    <div className="space-y-16 pb-20">
      
      {/* 1. LUXURY PAN-AFRICAN HERO BANNER */}
      <section className="relative overflow-hidden bg-[#161311] text-[#FAF6F0] pt-12 pb-20 lg:pt-20 lg:pb-28">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#D4A347_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: African Editorial Headline */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FAF6F0]/10 border border-[#FAF6F0]/20 text-[#D4A347] text-xs font-semibold uppercase tracking-widest">
                <Scissors className="w-3.5 h-3.5 -rotate-45" />
                <span>Pan-African Haute Couture • Nairobi Atelier</span>
              </div>

              <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08] text-[#FAF6F0]">
                African elegance, <br />
                <span className="italic font-normal text-[#D4A347]">ceremonially tailored</span> <br />
                to your anatomy.
              </h1>

              <p className="text-[#C8B69F] text-sm sm:text-base max-w-xl font-light leading-relaxed">
                From 3-Piece Grand Royal Agbadas and tailored Senator Kaftans to hand-beaded Kenyan Ruracio Kitenge bridal gowns. Explore the lookbook, request a fitting, and follow the seeded showcase from cutting to ceremonial handover.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() => setBookingModalOpen(true)}
                  className="px-6 py-3.5 bg-[#D4A347] hover:bg-[#BF8E36] text-[#161311] rounded-2xl text-xs sm:text-sm font-bold tracking-wide uppercase transition-all shadow-lg hover:shadow-[#D4A347]/20 flex items-center gap-2 group"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Book Ceremonial Fitting</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={() => {
                    const el = document.getElementById('digital-lookbook');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-5 py-3.5 bg-white/10 hover:bg-white/15 text-white border border-white/20 rounded-2xl text-xs sm:text-sm font-medium transition-all"
                >
                  Explore Lookbook
                </button>
              </div>

              {/* Fast Track Input Strip */}
              <div className="pt-4">
                <form onSubmit={handleQuickTrack} className="bg-white/5 border border-white/10 backdrop-blur-md p-2 rounded-2xl flex items-center gap-2 max-w-md">
                  <Search className="w-4 h-4 text-[#D4A347] ml-2 shrink-0" />
                  <input
                    type="text"
                    value={trackInput}
                    onChange={(e) => setTrackInput(e.target.value)}
                    placeholder="Have an Order? Enter ORD-892..."
                    className="w-full bg-transparent text-xs text-white placeholder-white/50 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#FAF6F0] text-[#161311] rounded-xl text-xs font-bold hover:bg-[#E5DACB] transition-colors whitespace-nowrap"
                  >
                    Track Garment
                  </button>
                </form>
              </div>

              {/* Cultural Trust Stats */}
              <div className="grid grid-cols-3 gap-6 pt-6 border-t border-white/10 text-xs">
                <div>
                  <div className="font-display text-2xl font-bold text-[#D4A347]">520+</div>
                  <div className="text-[#98897C] text-[11px]">Bespoke Agbadas & Gowns</div>
                </div>
                <div>
                  <div className="font-display text-2xl font-bold text-[#D4A347]">100%</div>
                  <div className="text-[#98897C] text-[11px]">Authentic African Textiles</div>
                </div>
                <div>
                  <div className="font-display text-2xl font-bold text-[#D4A347]">4.95 / 5</div>
                  <div className="text-[#98897C] text-[11px]">Ceremonial Review Score</div>
                </div>
              </div>

            </div>

            {/* Right Column: Featured Agbada Visual */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md">
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-[#D4A347]/40 aspect-[4/5] bg-[#24201D]">
                  <img
                    src="/src/assets/images/agbada_aso_oke_1793438762681.jpg"
                    alt="Royal Grand Agbada handcrafted at StitchFlow"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-6 left-6 right-6">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#D4A347] px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-[#D4A347]/30">
                      Yoruba & Nigerian Aso-Oke
                    </span>
                    <h3 className="font-display text-xl font-bold text-white mt-2">
                      The Sovereign Grand Royal Agbada
                    </h3>
                    <p className="text-xs text-[#E5DACB] mt-0.5">
                      Hand-cut by Master Agbada Architect Amani Mutiso • Handwoven Alaari Aso-Oke
                    </p>
                  </div>
                </div>

                {/* Floating cultural badge */}
                <div className="absolute -bottom-6 -left-6 bg-white text-[#161311] p-3.5 rounded-2xl shadow-xl border border-[#E5DACB] flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#D4A347]/20 flex items-center justify-center text-[#8C6D2D]">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">Wax Print Grain Guarantee</div>
                    <div className="text-[11px] text-[#6A5D52]">Symmetric Seam Alignment</div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. DIGITAL LOOKBOOK SHOWCASE */}
      <section id="digital-lookbook" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 pb-6 border-b border-[#E5DACB] dark:border-[#332C27]">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#8C6D2D] dark:text-[#D4A347] uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#D4A347]" />
              <span>Pan-African Couture Archives & Heritage Attires</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#161311] dark:text-[#F5EFE6]">
              Bespoke Cultural Lookbook
            </h2>
            <p className="text-xs sm:text-sm text-[#6A5D52] dark:text-[#B8ABA0] max-w-2xl leading-relaxed">
              Authentic silhouettes tailored from Nigerian Aso-Oke, Ghanaian Bonwire Kente, Vlisco Hollandais Wax, Swahili Coastal Silks, and Kenyan Kikoy plus the attiersfor the major tribes of Kenya. Inquire directly or schedule your studio fitting.
            </p>
          </div>

          {/* Category Filter Pills (Responsive wrapping / horizontal scroll on mobile) */}
          <div className="flex flex-wrap gap-1.5 bg-[#F3ECE1] dark:bg-[#1C1917] p-1.5 rounded-2xl border border-[#E5DACB] dark:border-[#332C27] shrink-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  selectedCategory === cat 
                    ? 'bg-[#161311] dark:bg-[#D4A347] text-[#FAF6F0] dark:text-[#161311] shadow-sm font-bold' 
                    : 'text-[#6A5D52] dark:text-[#B8ABA0] hover:text-[#161311] dark:hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Lookbook Responsive Grid (320px: 1 col, 768px: 2 cols, 1280px: 3 cols, 1536px: 4 cols) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
          {filteredItems.map((item) => (
            <div 
              key={item.id}
              className="group bg-white dark:bg-[#1C1917] rounded-3xl overflow-hidden border border-[#E5DACB] dark:border-[#332C27] hover:border-[#D4A347] dark:hover:border-[#D4A347] shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
            >
              {/* Image Container with Zoom & Badge Overlays */}
              <div className="relative aspect-[3/4] overflow-hidden bg-[#24201D]">
                <img
                  src={item.image_url}
                  alt={item.title}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                
                {/* Category & Masterpiece Pills */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#161311]/85 backdrop-blur-md text-[#FAF6F0] border border-white/10">
                    {item.category}
                  </span>
                  {item.is_featured && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#D4A347] text-[#161311] shadow-sm">
                      Masterpiece
                    </span>
                  )}
                </div>

                {/* Cultural Origin Bottom Ribbon */}
                <div className="absolute bottom-3 left-3 right-3 text-[10px] font-semibold px-2.5 py-1.5 rounded-xl bg-white/95 dark:bg-[#161311]/90 backdrop-blur-md text-[#161311] dark:text-[#F5EFE6] flex items-center justify-between shadow-sm border border-black/5 dark:border-white/10">
                  <span className="font-bold text-[#8C6D2D] dark:text-[#D4A347] truncate pr-2">
                    {item.cultural_origin}
                  </span>
                  <span className="flex items-center gap-1 text-[#6A5D52] dark:text-[#B8ABA0] shrink-0 font-mono">
                    <Clock className="w-3 h-3 text-[#D4A347]" /> {item.turnaround_days}d
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-[#161311] dark:text-[#F5EFE6] group-hover:text-[#8C6D2D] dark:group-hover:text-[#D4A347] transition-colors line-clamp-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#6A5D52] dark:text-[#B8ABA0] mt-1.5 leading-relaxed line-clamp-2">
                    {item.description}
                  </p>

                  <div className="mt-3 pt-3 border-t border-[#F3ECE1] dark:border-[#2C241E] text-xs">
                    <span className="text-[#98897C] text-[11px] block">Textile Origin:</span>
                    <p className="font-semibold text-[#161311] dark:text-[#FAF6F0] text-[11px] truncate">
                      {item.fabric}
                    </p>
                  </div>

                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {item.tags.slice(0, 3).map(t => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-[#FAF6F0] dark:bg-[#24201D] border border-[#E5DACB] dark:border-[#332C27] text-[#6A5D52] dark:text-[#B8ABA0]">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Actions (Responsive buttons for 320px+) */}
                <div className="pt-4 mt-4 border-t border-[#E5DACB] dark:border-[#332C27] flex items-center gap-1.5">
                  <button
                    onClick={() => handleInquireWhatsApp(item)}
                    className="flex-1 py-2 px-2.5 rounded-xl text-[11px] font-bold bg-[#25D366] hover:bg-[#20ba59] text-white flex items-center justify-center gap-1 transition-colors shadow-sm whitespace-nowrap"
                    title="Inquire directly on WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    onClick={() => handleBookLook(item)}
                    className="flex-1 py-2 px-2.5 rounded-xl text-[11px] font-bold bg-[#161311] dark:bg-[#D4A347] hover:bg-[#2C241E] dark:hover:bg-[#bf8e36] text-white dark:text-[#161311] flex items-center justify-center gap-1 transition-colors whitespace-nowrap"
                    title="Schedule bespoke fitting"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Fitting</span>
                  </button>

                  <button
                    onClick={() => setActiveModalLook(item)}
                    className="p-2 border border-[#C8B69F] dark:border-[#443831] rounded-xl text-[#6A5D52] dark:text-[#B8ABA0] hover:text-[#161311] dark:hover:text-white hover:bg-[#F3ECE1] dark:hover:bg-[#24201D] transition-colors shrink-0"
                    title="View details & cultural lineage"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. LOOKBOOK DETAIL QUICK MODAL */}
      {activeModalLook && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl bg-white dark:bg-[#1C1917] rounded-3xl shadow-2xl border border-[#E5DACB] dark:border-[#332C27] overflow-hidden text-[#1A1715] dark:text-[#F5EFE6]">
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="relative aspect-[3/4] bg-black">
                <img
                  src={activeModalLook.image_url}
                  alt={activeModalLook.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#FAF6F0] dark:bg-[#24201D] text-[#8C6D2D] dark:text-[#D4A347] border border-[#E5DACB] dark:border-[#332C27]">
                      {activeModalLook.category}
                    </span>
                    <button
                      onClick={() => setActiveModalLook(null)}
                      className="text-[#98897C] hover:text-[#161311] dark:hover:text-white p-1 rounded-full"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <h3 className="font-display text-2xl font-bold text-[#161311] dark:text-[#F5EFE6] mt-2">
                    {activeModalLook.title}
                  </h3>
                  <p className="text-xs text-[#6A5D52] dark:text-[#B8ABA0] mt-2 leading-relaxed">
                    {activeModalLook.description}
                  </p>

                  <div className="mt-4 space-y-2 bg-[#FAF6F0] dark:bg-[#24201D] p-3.5 rounded-2xl border border-[#E5DACB] dark:border-[#332C27] text-xs">
                    <div>
                      <span className="text-[#98897C] text-[11px]">Cultural Lineage:</span>
                      <p className="font-semibold text-[#8C6D2D] dark:text-[#D4A347]">{activeModalLook.cultural_origin}</p>
                    </div>
                    <div>
                      <span className="text-[#98897C] text-[11px]">Textile Sourcing:</span>
                      <p className="font-semibold text-[#161311] dark:text-[#F5EFE6]">{activeModalLook.fabric}</p>
                    </div>
                    <div>
                      <span className="text-[#98897C] text-[11px]">Bespoke Commission Range:</span>
                      <p className="font-semibold text-[#161311] dark:text-[#F5EFE6] font-mono">{activeModalLook.price_range}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 space-y-2">
                  <button
                    onClick={() => handleBookLook(activeModalLook)}
                    className="w-full py-3 bg-[#161311] dark:bg-[#D4A347] hover:bg-[#2C241E] dark:hover:bg-[#bf8e36] text-white dark:text-[#161311] rounded-xl text-xs font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Commission this African Silhouette</span>
                  </button>
                  <button
                    onClick={() => handleInquireWhatsApp(activeModalLook)}
                    className="w-full py-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Chat on WhatsApp with Master Tailor</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. THE AFRICAN BESPOKE JOURNEY */}
      <section className="bg-[#F3ECE1] dark:bg-[#12100E] py-16 border-y border-[#E5DACB] dark:border-[#332C27] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8C6D2D] dark:text-[#D4A347]">
              Authentic African Sartorial Craft
            </span>
            <h2 className="font-display text-3xl font-bold text-[#161311] dark:text-[#F5EFE6] mt-1">
              How Your Cultural Garment is Crafted
            </h2>
            <p className="text-xs sm:text-sm text-[#6A5D52] dark:text-[#B8ABA0] mt-2">
              Every Agbada, Senator suit, and Kitenge bridal ensemble is created with deep reverence for African textiles and ceremonial perfection.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-[#1C1917] p-6 rounded-3xl border border-[#E5DACB] dark:border-[#332C27] shadow-sm">
              <div className="w-10 h-10 rounded-2xl bg-[#FEF3C7] dark:bg-[#FEF3C7]/20 text-[#92400E] dark:text-[#FBBF24] flex items-center justify-center font-bold text-sm mb-4">
                01
              </div>
              <h3 className="font-bold text-sm text-[#161311] dark:text-[#F5EFE6]">1. African Measurement & Wingspan</h3>
              <p className="text-xs text-[#6A5D52] dark:text-[#B8ABA0] mt-1.5 leading-relaxed">
                We capture your full Agbada wingspan, Sokoto taper, collar circumference, and drape allowances on our digital cards.
              </p>
            </div>

            <div className="bg-white dark:bg-[#1C1917] p-6 rounded-3xl border border-[#E5DACB] dark:border-[#332C27] shadow-sm">
              <div className="w-10 h-10 rounded-2xl bg-[#E0E7FF] dark:bg-[#E0E7FF]/20 text-[#3730A3] dark:text-[#A5B4FC] flex items-center justify-center font-bold text-sm mb-4">
                02
              </div>
              <h3 className="font-bold text-sm text-[#161311] dark:text-[#F5EFE6]">2. Wax Print Grain Alignment</h3>
              <p className="text-xs text-[#6A5D52] dark:text-[#B8ABA0] mt-1.5 leading-relaxed">
                Kitenge patterns, Kente strips, or Guinea Brocades are aligned symmetrically across center chest seams and lapels.
              </p>
            </div>

            <div className="bg-white dark:bg-[#1C1917] p-6 rounded-3xl border border-[#E5DACB] dark:border-[#332C27] shadow-sm">
              <div className="w-10 h-10 rounded-2xl bg-[#EDE9FE] dark:bg-[#EDE9FE]/20 text-[#5B21B6] dark:text-[#C4B5FD] flex items-center justify-center font-bold text-sm mb-4">
                03
              </div>
              <h3 className="font-bold text-sm text-[#161311] dark:text-[#F5EFE6]">3. Hand Embroidery & Chain-Stitch</h3>
              <p className="text-xs text-[#6A5D52] dark:text-[#B8ABA0] mt-1.5 leading-relaxed">
                Intricate Hausa/Yoruba chest filigree, Maasai beadwork borders, or Lamu plackets are hand-applied on the workbench.
              </p>
            </div>

            <div className="bg-white dark:bg-[#1C1917] p-6 rounded-3xl border border-[#E5DACB] dark:border-[#332C27] shadow-sm">
              <div className="w-10 h-10 rounded-2xl bg-[#D1FAE5] dark:bg-[#D1FAE5]/20 text-[#065F46] dark:text-[#6EE7B7] flex items-center justify-center font-bold text-sm mb-4">
                04
              </div>
              <h3 className="font-bold text-sm text-[#161311] dark:text-[#F5EFE6]">4. Final Fitting with Fila & Gele</h3>
              <p className="text-xs text-[#6A5D52] dark:text-[#B8ABA0] mt-1.5 leading-relaxed">
                Client tries on the finished garment with matching hand-sewn Fila cap or Gele headwrap prior to the cultural celebration.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CEREMONIAL TESTIMONIALS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#8C6D2D] dark:text-[#D4A347]">
              Patron Praise
            </span>
            <h2 className="font-display text-3xl font-bold text-[#161311] dark:text-[#F5EFE6] mt-1">
              Reviews from Cultural Celebrations
            </h2>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#6A5D52] dark:text-[#B8ABA0]">
            <div className="flex text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-current" />
              ))}
            </div>
            <span className="font-bold text-[#161311] dark:text-[#F5EFE6]">4.95 Average</span>
            <span>(from verified ceremonies)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {feedbacks.map((fb) => (
            <div key={fb.id} className="bg-white dark:bg-[#1C1917] p-6 rounded-3xl border border-[#E5DACB] dark:border-[#332C27] shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex text-amber-500">
                  {[...Array(fb.rating)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  Fit: {fb.fit_rating}
                </span>
              </div>
              <p className="text-xs text-[#1A1715] dark:text-[#FAF6F0] italic leading-relaxed">
                "{fb.comments}"
              </p>
              <div className="pt-2 border-t border-[#F3ECE1] dark:border-[#2C241E] flex items-center justify-between text-xs">
                <span className="font-bold text-[#161311] dark:text-[#F5EFE6]">{fb.client_name}</span>
                <span className="text-[11px] text-[#98897C] font-mono">{fb.created_at}</span>
              </div>
            </div>
          ))}

          <div className="bg-white dark:bg-[#1C1917] p-6 rounded-3xl border border-[#E5DACB] dark:border-[#332C27] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-current" />
                ))}
              </div>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                Fit: Perfect
              </span>
            </div>
            <p className="text-xs text-[#1A1715] dark:text-[#FAF6F0] italic leading-relaxed">
              "For our traditional Ruracio dowry ceremony, Zari crafted a Kitenge peplum gown that honored both our Kikuyu and Luo heritage. The cowrie beadwork was regal and the matching Gele was perfectly contoured."
            </p>
            <div className="pt-2 border-t border-[#F3ECE1] dark:border-[#2C241E] flex items-center justify-between text-xs">
              <span className="font-bold text-[#161311] dark:text-[#F5EFE6]">Nyambura Mwangi</span>
              <span className="text-[11px] text-[#98897C] font-mono">2026-10-29</span>
            </div>
          </div>
        </div>
      </section>

      {/* 6. SOCIAL & ATELIER COMMUNITY */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#161311] text-[#FAF6F0] rounded-3xl p-8 sm:p-12 overflow-hidden relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-7 space-y-4">
              <span className="text-xs font-bold uppercase tracking-widest text-[#D4A347]">
                Connect with the Atelier
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-white">
                Follow our cutting tables, chain-stitch machines, and ceremonial fittings
              </h2>
              <p className="text-xs sm:text-sm text-[#C8B69F] leading-relaxed max-w-lg">
                Watch Master Agbada Architect Amani and Senior Tailor Kofi chalk patterns, steam lapels, and hand-embroider beadwork daily on social channels.
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-semibold flex items-center gap-2 text-white transition-all"
                >
                  <Instagram className="w-4 h-4 text-[#D4A347]" />
                  <span>@stitchflow_couture</span>
                </a>

                <a
                  href="https://wa.me/254712345678"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  <span>WhatsApp Atelier: +254 712 345 678</span>
                </a>
              </div>
            </div>

            <div className="lg:col-span-5 bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md space-y-4">
              <h3 className="font-display text-lg font-bold text-[#D4A347]">
                Nairobi Atelier Salon & Fitting Rooms
              </h3>
              <div className="text-xs text-[#C8B69F] space-y-2">
                <p><strong>Studio:</strong> Suite 402, Acacia Heights, Kilimani, Nairobi, Kenya</p>
                <p><strong>Fittings:</strong> Tuesday – Saturday, 9:30 AM – 6:30 PM (By Appointment)</p>
                <p><strong>Private Ceremonial Calls:</strong> VIP home & traditional wedding fitting calls available across Nairobi, Mombasa, and regional capitals.</p>
              </div>
              <button
                onClick={() => setBookingModalOpen(true)}
                className="w-full py-2.5 bg-[#D4A347] hover:bg-[#BF8E36] text-[#161311] rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
              >
                Schedule Private Fitting
              </button>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
};
