/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  User, 
  ShoppingBag, 
  Scissors, 
  Clock, 
  CheckCircle2, 
  Star, 
  Share2, 
  Copy, 
  Check, 
  MessageCircle, 
  Ruler, 
  Sparkles, 
  Calendar, 
  Gift,
  Layers
} from 'lucide-react';
import { useStitchFlow } from '../context/StitchFlowContext';
import { ProductionStatus } from '../types';
import { AccessGate } from './AccessGate';

export const ClientPortal: React.FC = () => {
  const { 
    hasPermission,
    activeClientId, 
    setActiveClientId, 
    profiles, 
    orders, 
    measurements, 
    feedbacks, 
    submitFeedback, 
    formatCurrency,
    showToast,
    currentUser
  } = useStitchFlow();

  const [feedbackRating, setFeedbackRating] = useState(5);
  const [fitRating, setFitRating] = useState<'tight' | 'perfect' | 'loose'>('perfect');
  const [feedbackComment, setFeedbackComment] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedOrderForFeedback, setSelectedOrderForFeedback] = useState<string>('ORD-892');

  // ACCESS GATE CHECK: Must be a client (patron) or director
  if (!hasPermission('client')) {
    return (
      <AccessGate 
        requiredRole="client"
        portalName="VIP Patron Private Portal"
        portalDescription="A presentation-oriented patron view for seeded demo profiles, including anatomical measurement cards, garment milestones, feedback, and referral messaging."
      />
    );
  }

  const clients = profiles.filter(p => p.role === 'client');
  const currentClient = profiles.find(p => p.id === activeClientId) || clients[0];

  const clientOrders = orders.filter(o => o.client_id === activeClientId);
  const clientMeasurement = measurements.find(m => m.client_id === activeClientId);

  const referralCode = `AFRICA-${currentClient.full_name.split(' ')[0].toUpperCase()}-20`;
  const referralLink = `https://stitchflow.atelier/vip?ref=${referralCode}`;

  const stages: { key: ProductionStatus; label: string; icon: React.ReactNode; desc: string }[] = [
    { key: 'cutting', label: '1. Pattern & Wax Match', icon: <Scissors className="w-4 h-4" />, desc: 'Symmetric grain cut & pattern chalking' },
    { key: 'stitching', label: '2. Seam & Chain-Stitch', icon: <Layers className="w-4 h-4" />, desc: 'Artisan assembly & chest filigree' },
    { key: 'fitting', label: '3. Ceremonial Fitting', icon: <Clock className="w-4 h-4" />, desc: 'Basted try-on with Fila/Gele coordinate' },
    { key: 'ready', label: '4. Ready for Celebration', icon: <Sparkles className="w-4 h-4" />, desc: 'Hand-pressed, cedar scented & bagged' }
  ];

  const getStageIndex = (status: ProductionStatus) => {
    const map = { cutting: 0, stitching: 1, fitting: 2, ready: 3 };
    return map[status] ?? 0;
  };

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    showToast('Referral link copied! Share with family and friends.');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleShareReferralWhatsApp = () => {
    const text = `Greetings! I get my bespoke African attire and ceremonial Agbadas handcrafted at StitchFlow Atelier in Nairobi. Use my exclusive VIP code "${referralCode}" for KES 3,000 off your first bespoke fitting: ${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackComment.trim()) return;

    submitFeedback({
      order_id: selectedOrderForFeedback,
      client_id: currentClient.id,
      client_name: currentClient.full_name,
      rating: feedbackRating,
      fit_rating: fitRating,
      comments: feedbackComment.trim()
    });

    setFeedbackComment('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* 1. Client Profile Header */}
      <div className="bg-[#161311] dark:bg-[#0D0B0A] text-[#FAF6F0] p-6 rounded-3xl shadow-md border border-[#D4A347]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={currentClient.avatar_url}
            alt={currentClient.full_name}
            className="w-14 h-14 rounded-full object-cover border-2 border-[#D4A347]"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-widest text-[#D4A347]">
                VIP Bespoke Patron
              </span>
              <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-white">
                {clientOrders.length} Commissions
              </span>
            </div>
            <h1 className="font-display text-2xl font-bold text-white">
              {currentClient.full_name}
            </h1>
            <p className="text-xs text-[#C8B69F]">
              {currentClient.phone} • {currentClient.specialty}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-2xl border border-white/10">
          <span className="text-xs text-[#C8B69F] pl-2 hidden sm:inline">Active Patron:</span>
          {clients.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveClientId(c.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeClientId === c.id 
                  ? 'bg-[#D4A347] text-[#161311] font-bold shadow-sm' 
                  : 'text-white hover:bg-white/10'
              }`}
            >
              {c.full_name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Active African Commissions & Stepper */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#161311] dark:text-[#F5EFE6]">
              My Active African Commissions
            </h2>
            <p className="text-xs text-[#6A5D52] dark:text-[#B8ABA0]">
              Demo production milestones from our Nairobi cutting-table showcase.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-[#8C6D2D] dark:text-[#D4A347]">
            {clientOrders.filter(o => o.status !== 'ready').length} In Workshop
          </span>
        </div>

        {clientOrders.length === 0 ? (
          <div className="bg-white dark:bg-[#1C1917] rounded-3xl p-12 text-center border border-[#E5DACB] dark:border-[#332C27] space-y-3">
            <ShoppingBag className="w-8 h-8 text-[#D4A347] mx-auto opacity-70" />
            <p className="text-sm text-[#6A5D52] dark:text-[#B8ABA0]">No active commissions found for this account.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {clientOrders.map(order => {
              const currentIdx = getStageIndex(order.status);

              return (
                <div 
                  key={order.id}
                  className="bg-white dark:bg-[#1C1917] rounded-3xl border border-[#E5DACB] dark:border-[#332C27] shadow-sm overflow-hidden p-6 space-y-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F3ECE1] dark:border-[#332C27]">
                    <div className="flex items-center gap-4">
                      <img
                        src={order.photo_url}
                        alt={order.garment_type}
                        className="w-16 h-16 rounded-2xl object-cover border border-[#E5DACB] dark:border-[#332C27] shadow-sm"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#161311] text-[#FAF6F0] dark:bg-[#FAF6F0] dark:text-[#161311]">
                            {order.id}
                          </span>
                          <span className="text-xs font-bold text-[#8C6D2D] dark:text-[#D4A347]">
                            {order.garment_type}
                          </span>
                        </div>
                        <h3 className="font-display text-lg font-bold text-[#161311] dark:text-[#F5EFE6] mt-1">
                          {order.description}
                        </h3>
                        <p className="text-xs text-[#6A5D52] dark:text-[#B8ABA0] mt-0.5">
                          Assigned Master Artisan: <strong>{order.assigned_tailor_name}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <div className="text-[10px] uppercase font-bold text-[#98897C]">Ceremonial Handover</div>
                      <div className="font-mono font-bold text-sm text-[#161311] dark:text-[#F5EFE6] flex items-center sm:justify-end gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#D4A347]" />
                        {order.estimated_delivery}
                      </div>
                      <div className="text-xs text-[#6A5D52] dark:text-[#B8ABA0] mt-1">
                        Balance Due: <strong className="text-[#161311] dark:text-[#F5EFE6]">{formatCurrency(order.balance_due)}</strong>
                      </div>
                    </div>
                  </div>

                  {/* VISUAL STEPPER */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#6A5D52] dark:text-[#B8ABA0] mb-3">
                      Ceremonial Production Stepper
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      {stages.map((st, idx) => {
                        const isDone = idx < currentIdx;
                        const isCurrent = idx === currentIdx;

                        return (
                          <div 
                            key={st.key}
                            className={`p-3.5 rounded-2xl border transition-all ${
                              isCurrent 
                                ? 'border-[#D4A347] bg-[#FAF6F0] dark:bg-[#24201D] ring-1 ring-[#D4A347]' 
                                : isDone 
                                  ? 'border-[#D1FAE5] bg-[#ECFDF5] dark:bg-emerald-950/30 dark:border-emerald-900' 
                                  : 'border-[#E5DACB] dark:border-[#332C27] bg-white dark:bg-[#1C1917] opacity-60'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className={`p-1.5 rounded-lg text-xs ${
                                isCurrent 
                                  ? 'bg-[#D4A347] text-[#161311]' 
                                  : isDone 
                                    ? 'bg-[#065F46] text-white' 
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                              }`}>
                                {st.icon}
                              </span>
                              {isDone ? (
                                <CheckCircle2 className="w-4 h-4 text-[#065F46] dark:text-emerald-400" />
                              ) : isCurrent ? (
                                <span className="text-[10px] font-bold text-[#8C6D2D] dark:text-[#D4A347] animate-pulse">
                                  In Progress
                                </span>
                              ) : (
                                <span className="text-[10px] text-gray-400">Upcoming</span>
                              )}
                            </div>
                            <div className="font-bold text-xs text-[#161311] dark:text-[#F5EFE6]">
                              {st.label}
                            </div>
                            <div className="text-[11px] text-[#6A5D52] dark:text-[#B8ABA0] mt-0.5">
                              {st.desc}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#F3ECE1] dark:border-[#332C27]">
                    <div className="text-xs text-[#6A5D52] dark:text-[#B8ABA0]">
                      Textile: <span className="font-semibold text-[#161311] dark:text-[#F5EFE6]">{order.fabric_details}</span>
                    </div>

                    <a
                      href={`https://wa.me/254712345678?text=${encodeURIComponent(`Hello StitchFlow African Atelier, I am checking in regarding order ${order.id} with ${order.assigned_tailor_name}.`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#25D366] text-white hover:bg-[#20ba59] transition-colors shadow-sm"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Message Atelier on WhatsApp</span>
                    </a>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. DIGITAL AFRICAN MEASUREMENT CARD */}
      {clientMeasurement && (
        <div className="bg-white dark:bg-[#1C1917] p-6 rounded-3xl border border-[#E5DACB] dark:border-[#332C27] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ruler className="w-5 h-5 text-[#D4A347]" />
              <h3 className="font-display text-xl font-bold text-[#161311] dark:text-[#F5EFE6]">
                My Saved African Measurement Profile
              </h3>
            </div>
            <span className="text-xs font-mono text-[#98897C]">
              Last verified: {clientMeasurement.updated_at}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center">
            {[
              { label: 'Chest / Buba', val: clientMeasurement.chest },
              { label: 'Waist', val: clientMeasurement.waist },
              { label: 'Hips', val: clientMeasurement.hips },
              { label: 'Robe Length', val: clientMeasurement.length },
              { label: 'Sleeve', val: clientMeasurement.sleeve },
              { label: 'Wingspan', val: clientMeasurement.agbada_wingspan || '—' },
              { label: 'Sokoto Inseam', val: clientMeasurement.inseam },
              { label: 'Fila Cap Head', val: clientMeasurement.fila_cap_head || '—' }
            ].map(m => (
              <div key={m.label} className="bg-[#FAF6F0] dark:bg-[#24201D] p-3 rounded-2xl border border-[#E5DACB] dark:border-[#332C27]">
                <div className="text-[10px] uppercase font-bold text-[#98897C]">{m.label}</div>
                <div className="font-mono text-base font-bold text-[#161311] dark:text-[#F5EFE6] mt-1">
                  {m.val} <span className="text-[10px] font-normal text-[#98897C]">{clientMeasurement.unit}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-[#FAF6F0] dark:bg-[#24201D] p-3.5 rounded-2xl border border-[#E5DACB] dark:border-[#332C27] text-xs space-y-1">
            <span className="font-bold text-[#8C6D2D] dark:text-[#D4A347]">Artisan Drape & Posture Notes:</span>
            <p className="text-[#6A5D52] dark:text-[#B8ABA0] italic">
              "{clientMeasurement.posture_notes}"
            </p>
          </div>
        </div>
      )}

      {/* 4. POST-DELIVERY CEREMONIAL FEEDBACK */}
      <div className="bg-white dark:bg-[#1C1917] p-6 rounded-3xl border border-[#E5DACB] dark:border-[#332C27] shadow-sm space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-current" />
            <h3 className="font-display text-xl font-bold text-[#161311] dark:text-[#F5EFE6]">
              Ceremonial Review & Fitting Feedback
            </h3>
          </div>
          <p className="text-xs text-[#6A5D52] dark:text-[#B8ABA0] mt-0.5">
            Your review helps Director Wanjiku and our master cutters calibrate seam allowances and beadwork.
          </p>
        </div>

        <form onSubmit={handleSubmitReview} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1 text-[#6A5D52] dark:text-[#B8ABA0]">Select Garment</label>
              <select
                value={selectedOrderForFeedback}
                onChange={(e) => setSelectedOrderForFeedback(e.target.value)}
                className="w-full p-2.5 bg-white dark:bg-[#24201D] border border-[#C8B69F] dark:border-[#4A4039] rounded-xl"
              >
                {clientOrders.map(o => (
                  <option key={o.id} value={o.id}>{o.id} — {o.garment_type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-[#6A5D52] dark:text-[#B8ABA0]">Overall Atelier Experience (1-5 Stars)</label>
              <div className="flex items-center gap-2 pt-1 text-amber-500">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFeedbackRating(star)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star className={`w-5 h-5 ${star <= feedbackRating ? 'fill-current' : 'text-gray-300 dark:text-gray-700'}`} />
                  </button>
                ))}
                <span className="font-bold text-sm text-[#161311] dark:text-[#F5EFE6] ml-2">
                  {feedbackRating} / 5
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1 text-[#6A5D52] dark:text-[#B8ABA0]">How is the Garment Fit?</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'tight', label: 'Slightly Snug (Need ease)' },
                { key: 'perfect', label: 'Regal Bespoke Fit ✨' },
                { key: 'loose', label: 'Slightly Loose (Need cinch)' },
              ].map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setFitRating(opt.key as any)}
                  className={`p-2.5 rounded-xl border font-semibold text-center transition-all ${
                    fitRating === opt.key 
                      ? 'border-[#D4A347] bg-[#FAF6F0] dark:bg-[#24201D] text-[#161311] dark:text-[#F5EFE6]' 
                      : 'border-[#E5DACB] dark:border-[#332C27] text-[#6A5D52] dark:text-[#B8ABA0]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1 text-[#6A5D52] dark:text-[#B8ABA0]">Your Review & Testimonial</label>
            <textarea
              required
              rows={2}
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              placeholder="e.g. The Agbada wingspan was regal and majestic at our family coronation gala! Hand-stitching was flawless."
              className="w-full p-2.5 bg-white dark:bg-[#24201D] border border-[#C8B69F] dark:border-[#4A4039] rounded-xl focus:ring-1 focus:ring-[#D4A347]"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#161311] dark:bg-[#D4A347] hover:bg-[#2C241E] text-white dark:text-[#161311] rounded-xl font-bold transition-all shadow-sm"
            >
              Submit Feedback to Atelier
            </button>
          </div>
        </form>
      </div>

      {/* 5. CULTURAL REFERRAL ENGINE */}
      <div className="bg-[#FAF6F0] dark:bg-[#24201D] rounded-3xl p-6 sm:p-8 border border-[#E5DACB] dark:border-[#332C27] space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#D4A347] text-[#161311] flex items-center justify-center shadow-sm">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display text-2xl font-bold text-[#161311] dark:text-[#F5EFE6]">
                Invite Friends & Family to the Atelier
              </h3>
              <p className="text-xs text-[#6A5D52] dark:text-[#B8ABA0]">
                Gift your circle <strong>KES 3,000 off</strong> their bespoke commission, and receive <strong>15% credit</strong> towards your next ceremonial attire.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1C1917] p-3 rounded-2xl border border-[#E5DACB] dark:border-[#332C27] text-right">
            <div className="text-[10px] uppercase font-bold text-[#98897C]">Ceremonial Credit</div>
            <div className="font-mono text-lg font-bold text-[#8C6D2D] dark:text-[#D4A347]">KES 6,000</div>
            <div className="text-[10px] text-green-700 dark:text-green-400 font-semibold">2 family commissions</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <div className="flex-1 flex items-center bg-white dark:bg-[#1C1917] border border-[#C8B69F] dark:border-[#4A4039] rounded-2xl px-3 py-2 text-xs font-mono text-[#161311] dark:text-[#F5EFE6]">
            <span className="truncate flex-1">{referralLink}</span>
            <button
              onClick={handleCopyReferral}
              className="ml-2 px-3 py-1.5 bg-[#161311] dark:bg-[#D4A347] text-[#FAF6F0] dark:text-[#161311] rounded-xl text-xs font-sans font-semibold flex items-center gap-1 hover:bg-[#2C241E]"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <button
            onClick={handleShareReferralWhatsApp}
            className="px-5 py-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <MessageCircle className="w-4 h-4 fill-current" />
            <span>Share via WhatsApp</span>
          </button>
        </div>
      </div>

    </div>
  );
};
