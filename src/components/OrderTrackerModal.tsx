/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  Search, 
  CheckCircle2, 
  Clock, 
  Scissors, 
  Layers, 
  Sparkles, 
  MessageCircle, 
  User,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { useStitchFlow } from '../context/StitchFlowContext';
import { Order, ProductionStatus } from '../types';

export const OrderTrackerModal: React.FC = () => {
  const { 
    trackingModalOpen, 
    setTrackingModalOpen, 
    orders, 
    formatCurrency,
    selectedTrackOrderId,
    setSelectedTrackOrderId
  } = useStitchFlow();

  const [query, setQuery] = useState(selectedTrackOrderId || '');
  const [searchedOrder, setSearchedOrder] = useState<Order | null>(() => {
    if (selectedTrackOrderId) {
      return orders.find(o => o.id === selectedTrackOrderId) || null;
    }
    return null;
  });
  const [errorMsg, setErrorMsg] = useState('');

  if (!trackingModalOpen) return null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const q = query.trim().toUpperCase();
    if (!q) return;

    const found = orders.find(o => 
      o.id.toUpperCase() === q || 
      o.client_phone.includes(q) ||
      o.client_name.toLowerCase().includes(query.toLowerCase())
    );

    if (found) {
      setSearchedOrder(found);
      setSelectedTrackOrderId(found.id);
    } else {
      setSearchedOrder(null);
      setErrorMsg(`No active garment found for "${query}". Try sample African order IDs: ORD-892, ORD-893, or ORD-894.`);
    }
  };

  const stages: { key: ProductionStatus; label: string; icon: React.ReactNode; desc: string }[] = [
    { key: 'cutting', label: '1. Pattern & Wax Match', icon: <Scissors className="w-4 h-4" />, desc: 'Symmetric grain cut & pattern chalking' },
    { key: 'stitching', label: '2. Seam & Chain-Stitch', icon: <Layers className="w-4 h-4" />, desc: 'Artisan assembly & chest filigree' },
    { key: 'fitting', label: '3. Ceremonial Fitting', icon: <Clock className="w-4 h-4" />, desc: 'Basted try-on with Fila/Gele coordinate' },
    { key: 'ready', label: '4. Ready for Handover', icon: <Sparkles className="w-4 h-4" />, desc: 'Hand-pressed, cedar scented & bagged' }
  ];

  const getStageIndex = (status: ProductionStatus) => {
    const map = { cutting: 0, stitching: 1, fitting: 2, ready: 3 };
    return map[status] ?? 0;
  };

  const handleClose = () => {
    setTrackingModalOpen(false);
    setSelectedTrackOrderId(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#E5DACB] overflow-hidden text-[#1A1715]">
        
        {/* Header */}
        <div className="bg-[#161311] text-[#FAF6F0] px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#D4A347]/20 text-[#D4A347] flex items-center justify-center">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display text-xl sm:text-2xl font-bold tracking-wide">
                Live African Garment Tracker
              </h3>
              <p className="text-xs text-[#98897C]">
                Real-time bespoke production milestones from the cutting table to your ceremony.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-[#98897C] hover:text-white p-1.5 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search input bar */}
        <div className="p-6 bg-[#FAF6F0] border-b border-[#E5DACB]">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#98897C] absolute left-3 top-3" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter Order ID (e.g. ORD-892, ORD-893) or Phone..."
                className="w-full text-xs sm:text-sm pl-9 pr-3 py-2.5 bg-white border border-[#C8B69F] rounded-2xl focus:outline-none focus:ring-1 focus:ring-[#D4A347]"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#161311] text-[#FAF6F0] hover:bg-[#2C241E] rounded-2xl text-xs font-semibold transition-all shadow-sm"
            >
              Track Order
            </button>
          </form>

          <div className="flex items-center gap-2 mt-2.5 text-xs text-[#6A5D52]">
            <span className="text-[11px] font-semibold text-[#98897C]">Try Demo IDs:</span>
            {['ORD-892', 'ORD-893', 'ORD-894', 'ORD-891'].map(id => (
              <button
                key={id}
                onClick={() => {
                  setQuery(id);
                  const o = orders.find(item => item.id === id);
                  if (o) setSearchedOrder(o);
                }}
                className="px-2 py-0.5 rounded-lg bg-white border border-[#E5DACB] text-[11px] font-mono hover:border-[#161311] text-[#161311]"
              >
                {id}
              </button>
            ))}
          </div>

          {errorMsg && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Order Details Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {searchedOrder ? (
            <div className="space-y-6">
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#F3ECE1] border border-[#E5DACB]">
                <div className="flex items-center gap-4">
                  <img
                    src={searchedOrder.photo_url}
                    alt={searchedOrder.garment_type}
                    className="w-16 h-16 rounded-xl object-cover border border-[#C8B69F] shadow-sm"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#161311] text-[#FAF6F0]">
                        {searchedOrder.id}
                      </span>
                      <span className="text-xs font-bold text-[#8C6D2D]">
                        {searchedOrder.garment_type}
                      </span>
                    </div>
                    <h4 className="font-display text-lg font-bold text-[#161311] mt-1">
                      {searchedOrder.description}
                    </h4>
                    <p className="text-xs text-[#6A5D52] flex items-center gap-2 mt-0.5">
                      <User className="w-3.5 h-3.5" /> Patron: {searchedOrder.client_name}
                      <span className="text-[#98897C]">•</span>
                      <Scissors className="w-3.5 h-3.5" /> Artisan: {searchedOrder.assigned_tailor_name}
                    </p>
                  </div>
                </div>

                <div className="text-right sm:border-l sm:border-[#C8B69F] sm:pl-4">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#98897C]">
                    Ceremony Handover
                  </span>
                  <div className="font-mono font-bold text-sm text-[#161311] flex items-center gap-1 justify-end">
                    <Calendar className="w-3.5 h-3.5 text-[#D4A347]" />
                    {searchedOrder.estimated_delivery}
                  </div>
                  <div className="text-[11px] text-[#6A5D52] mt-0.5">
                    Balance: <span className="font-semibold">{formatCurrency(searchedOrder.balance_due)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-[#6A5D52] mb-3">
                  Production Phase Milestones
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  {stages.map((st, idx) => {
                    const currentIndex = getStageIndex(searchedOrder.status);
                    const isCompleted = idx < currentIndex;
                    const isCurrent = idx === currentIndex;

                    return (
                      <div
                        key={st.key}
                        className={`p-3 rounded-2xl border transition-all ${
                          isCurrent 
                            ? 'border-[#D4A347] bg-[#FAF6F0] ring-1 ring-[#D4A347]' 
                            : isCompleted 
                              ? 'border-[#D1FAE5] bg-[#ECFDF5]' 
                              : 'border-[#E5DACB] bg-white opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`p-1.5 rounded-lg text-xs ${
                            isCurrent 
                              ? 'bg-[#D4A347] text-[#161311]' 
                              : isCompleted 
                                ? 'bg-[#065F46] text-white' 
                                : 'bg-gray-100 text-gray-500'
                          }`}>
                            {st.icon}
                          </span>
                          {isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-[#065F46]" />
                          ) : isCurrent ? (
                            <span className="text-[10px] font-bold text-[#8C6D2D] animate-pulse">
                              Active
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400">Upcoming</span>
                          )}
                        </div>
                        <div className="font-bold text-xs text-[#161311]">
                          {st.label}
                        </div>
                        <div className="text-[11px] text-[#6A5D52] mt-1 leading-snug">
                          {st.desc}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-[#6A5D52] mb-2">
                  Artisan Bench Notes & Timestamps
                </h5>
                <div className="space-y-2 border-l-2 border-[#E5DACB] ml-2 pl-4">
                  {searchedOrder.progress_notes.map((note, nIdx) => (
                    <div key={nIdx} className="relative text-xs">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#D4A347] ring-4 ring-white" />
                      <div className="flex items-center gap-2">
                        <span className="font-bold uppercase tracking-wider text-[10px] text-[#8C6D2D]">
                          [{note.stage}]
                        </span>
                        <span className="text-[11px] text-[#98897C] font-mono">
                          {note.timestamp}
                        </span>
                        <span className="text-[11px] text-[#6A5D52]">• {note.author}</span>
                      </div>
                      <p className="text-[#161311] mt-0.5 leading-relaxed bg-[#FAF6F0] p-2.5 rounded-xl border border-[#E5DACB]">
                        {note.note}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <a
                  href={`https://wa.me/254712345678?text=${encodeURIComponent(`Hello StitchFlow African Atelier, inquiring about my order ${searchedOrder.id} (${searchedOrder.garment_type}).`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-2xl text-xs font-bold transition-all shadow-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Message Atelier about this Order</span>
                </a>
              </div>

            </div>
          ) : (
            <div className="text-center py-12 text-[#98897C] space-y-2">
              <Scissors className="w-8 h-8 mx-auto text-[#D4A347] opacity-75" />
              <p className="text-xs">
                Enter an Order ID above to see real-time cutting, chain-stitching, and fitting progress.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
