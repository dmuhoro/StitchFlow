/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Scissors, 
  Layers, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  Ruler, 
  ChevronRight, 
  FileText, 
  Plus, 
  Send, 
  AlertCircle,
  User,
  Calendar
} from 'lucide-react';
import { useStitchFlow } from '../context/StitchFlowContext';
import { ProductionStatus, Measurement, Order } from '../types';
import { AccessGate } from './AccessGate';

export const TailorDashboard: React.FC = () => {
  const { 
    hasPermission,
    activeTailorId, 
    setActiveTailorId, 
    profiles, 
    orders, 
    updateOrderStatus, 
    measurements, 
    updateMeasurement,
    showToast,
    currentUser
  } = useStitchFlow();

  // ACCESS GATE CHECK: Must be an employee/artisan (or director)
  if (!hasPermission('employee')) {
    return (
      <AccessGate 
        requiredRole="employee"
        portalName="Master Artisan Workshop Bench"
        portalDescription="Restricted to authorized African master tailors (Amani Mutiso, Kofi Mensah, Zari Odhiambo). Displays active cutting tasks, Agbada wingspan measurements, and bench note logs."
      />
    );
  }

  const [selectedOrderForNote, setSelectedOrderForNote] = useState<Order | null>(null);
  const [stageNote, setStageNote] = useState('');
  const [selectedMeasurementClient, setSelectedMeasurementClient] = useState<Measurement | null>(null);
  const [measEditing, setMeasEditing] = useState(false);
  const [editMeasData, setEditMeasData] = useState<Measurement | null>(null);

  const tailors = profiles.filter(p => p.role === 'employee');
  const currentTailor = profiles.find(p => p.id === activeTailorId) || tailors[0];

  const myOrders = orders.filter(o => o.assigned_tailor_id === activeTailorId);

  const stages: { key: ProductionStatus; label: string; icon: React.ReactNode; color: string }[] = [
    { key: 'cutting', label: '1. Pattern & Wax Match', icon: <Scissors className="w-3.5 h-3.5" />, color: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200' },
    { key: 'stitching', label: '2. Seam & Chain-Stitch', icon: <Layers className="w-3.5 h-3.5" />, color: 'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-900/40 dark:text-indigo-200' },
    { key: 'fitting', label: '3. Ceremonial Fitting', icon: <Clock className="w-3.5 h-3.5" />, color: 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-900/40 dark:text-purple-200' },
    { key: 'ready', label: '4. Ready for Handover', icon: <Sparkles className="w-3.5 h-3.5" />, color: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200' }
  ];

  const handleAdvanceStatus = (order: Order) => {
    const sequence: ProductionStatus[] = ['cutting', 'stitching', 'fitting', 'ready'];
    const currentIndex = sequence.indexOf(order.status);
    if (currentIndex < sequence.length - 1) {
      const nextStage = sequence[currentIndex + 1];
      updateOrderStatus(order.id, nextStage, `Garment advanced to ${nextStage.toUpperCase()} by ${currentTailor.full_name}`);
    }
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForNote || !stageNote.trim()) return;

    updateOrderStatus(selectedOrderForNote.id, selectedOrderForNote.status, stageNote.trim());
    setSelectedOrderForNote(null);
    setStageNote('');
  };

  const openMeasurementCard = (clientId: string) => {
    const m = measurements.find(item => item.client_id === clientId);
    if (m) {
      setSelectedMeasurementClient(m);
      setEditMeasData({ ...m });
      setMeasEditing(false);
    } else {
      showToast('No digital measurement profile found for this patron.');
    }
  };

  const handleSaveMeasurement = () => {
    if (editMeasData) {
      updateMeasurement(editMeasData);
      setSelectedMeasurementClient(editMeasData);
      setMeasEditing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Tailor Profile & Persona Bar */}
      <div className="bg-[#161311] dark:bg-[#0D0B0A] text-[#FAF6F0] p-6 rounded-3xl shadow-md border border-[#D4A347]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={currentTailor.avatar_url}
            alt={currentTailor.full_name}
            className="w-14 h-14 rounded-full object-cover border-2 border-[#D4A347]"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-widest text-[#D4A347]">
                Master African Artisan Workbench
              </span>
              <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-white">
                {myOrders.length} Assigned Garments
              </span>
            </div>
            <h1 className="font-display text-2xl font-bold text-white">
              {currentTailor.full_name}
            </h1>
            <p className="text-xs text-[#C8B69F]">
              {currentTailor.title} • {currentTailor.specialty}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-2xl border border-white/10">
          <span className="text-xs text-[#C8B69F] pl-2 hidden sm:inline">Active Artisan:</span>
          {tailors.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTailorId(t.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTailorId === t.id 
                  ? 'bg-[#D4A347] text-[#161311] font-bold shadow-sm' 
                  : 'text-white hover:bg-white/10'
              }`}
            >
              {t.full_name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Quick Mobile Workshop Stat Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stages.map(st => {
          const count = myOrders.filter(o => o.status === st.key).length;
          return (
            <div key={st.key} className="bg-white dark:bg-[#1C1917] p-4 rounded-2xl border border-[#E5DACB] dark:border-[#332C27] flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#98897C]">{st.label.split('.')[1]}</span>
                <div className="font-mono text-xl font-bold text-[#161311] dark:text-[#F5EFE6]">{count}</div>
              </div>
              <div className={`p-2 rounded-xl ${st.color}`}>
                {st.icon}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Daily Task Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-[#161311] dark:text-[#F5EFE6]">
            Artisan Workbench Queue
          </h2>
          <span className="text-xs text-[#6A5D52] dark:text-[#B8ABA0]">
            Tap stage button to advance garment
          </span>
        </div>

        {myOrders.length === 0 ? (
          <div className="bg-white dark:bg-[#1C1917] rounded-3xl p-12 text-center border border-[#E5DACB] dark:border-[#332C27] space-y-3">
            <Scissors className="w-8 h-8 text-[#D4A347] mx-auto opacity-70" />
            <p className="text-sm text-[#6A5D52] dark:text-[#B8ABA0]">No garments currently on your cutting or stitching bench.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {myOrders.map(order => {
              const currentStageIndex = stages.findIndex(s => s.key === order.status);
              const nextStage = currentStageIndex < stages.length - 1 ? stages[currentStageIndex + 1] : null;

              return (
                <div 
                  key={order.id}
                  className="bg-white dark:bg-[#1C1917] rounded-3xl border border-[#E5DACB] dark:border-[#332C27] shadow-sm hover:border-[#C8B69F] transition-all p-5 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F3ECE1] dark:border-[#332C27]">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-[#161311] text-[#FAF6F0] dark:bg-[#FAF6F0] dark:text-[#161311]">
                        {order.id}
                      </span>
                      <div>
                        <h3 className="font-display text-base font-bold text-[#161311] dark:text-[#F5EFE6]">
                          {order.garment_type}
                        </h3>
                        <p className="text-xs text-[#6A5D52] dark:text-[#B8ABA0] flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-[#D4A347]" /> Patron: <strong>{order.client_name}</strong>
                          <span className="text-[#98897C]">•</span>
                          <Calendar className="w-3.5 h-3.5 text-[#98897C]" /> Ceremony Date: {order.estimated_delivery}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#98897C]">
                        Phase:
                      </span>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                        stages.find(s => s.key === order.status)?.color
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    <div className="md:col-span-3 aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                      <img
                        src={order.photo_url}
                        alt={order.garment_type}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="md:col-span-9 space-y-2 text-xs">
                      <div className="bg-[#FAF6F0] dark:bg-[#24201D] p-3 rounded-2xl border border-[#E5DACB] dark:border-[#332C27] space-y-1">
                        <div className="font-semibold text-[#161311] dark:text-[#F5EFE6]">Textile & Cultural Requirements:</div>
                        <p className="text-[#6A5D52] dark:text-[#B8ABA0]">{order.fabric_details}</p>
                        <p className="text-[#161311] dark:text-[#F5EFE6] font-medium pt-1 italic">"{order.description}"</p>
                      </div>

                      {order.progress_notes.length > 0 && (
                        <div className="text-[11px] text-[#6A5D52] dark:text-[#B8ABA0] flex items-start gap-1.5 pt-1">
                          <FileText className="w-3.5 h-3.5 text-[#8C6D2D] dark:text-[#D4A347] shrink-0 mt-0.5" />
                          <span>
                            <strong>Latest Bench Log:</strong> {order.progress_notes[order.progress_notes.length - 1].note} ({order.progress_notes[order.progress_notes.length - 1].timestamp})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#F3ECE1] dark:border-[#332C27] flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openMeasurementCard(order.client_id)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-[#FAF6F0] dark:bg-[#24201D] hover:bg-[#F3ECE1] border border-[#C8B69F] dark:border-[#4A4039] rounded-xl text-xs font-bold text-[#161311] dark:text-[#F5EFE6] transition-colors"
                      >
                        <Ruler className="w-4 h-4 text-[#D4A347]" />
                        <span>Inspect African Measurement Card</span>
                      </button>

                      <button
                        onClick={() => setSelectedOrderForNote(order)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-[#1C1917] hover:bg-gray-50 border border-[#C8B69F] dark:border-[#4A4039] rounded-xl text-xs font-medium text-[#6A5D52] dark:text-[#B8ABA0] transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Bench Note</span>
                      </button>
                    </div>

                    {nextStage ? (
                      <button
                        onClick={() => handleAdvanceStatus(order)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#161311] dark:bg-[#D4A347] hover:bg-[#2C241E] text-[#FAF6F0] dark:text-[#161311] rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
                      >
                        <span>Advance to {nextStage.label.split('.')[1]}</span>
                        <ChevronRight className="w-4 h-4 text-[#D4A347] dark:text-[#161311]" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/40 px-3 py-1.5 rounded-lg border border-green-200 dark:border-green-800">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Ceremonial Garment Ready</span>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. AFRICAN MEASUREMENT CARD MODAL */}
      {selectedMeasurementClient && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-xl bg-white dark:bg-[#1C1917] rounded-3xl shadow-2xl border border-[#E5DACB] dark:border-[#332C27] overflow-hidden text-[#1A1715] dark:text-[#F5EFE6]">
            <div className="bg-[#161311] dark:bg-[#0D0B0A] text-[#FAF6F0] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ruler className="w-5 h-5 text-[#D4A347]" />
                <div>
                  <h3 className="font-display text-lg font-bold">
                    African Measurement Card: {selectedMeasurementClient.client_name}
                  </h3>
                  <p className="text-[11px] text-[#98897C]">
                    Calibrated on {selectedMeasurementClient.updated_at}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMeasurementClient(null)}
                className="text-[#98897C] hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#6A5D52] dark:text-[#B8ABA0] uppercase tracking-wider">
                  Dimensions & Cultural Ease ({selectedMeasurementClient.unit})
                </span>
                <button
                  onClick={() => setMeasEditing(!measEditing)}
                  className="text-xs font-semibold text-[#8C6D2D] dark:text-[#D4A347] hover:underline"
                >
                  {measEditing ? 'Cancel Edit' : 'Edit Numbers'}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {[
                  { key: 'chest', label: 'Chest / Buba' },
                  { key: 'waist', label: 'Waist' },
                  { key: 'hips', label: 'Hips' },
                  { key: 'length', label: 'Robe Length' },
                  { key: 'sleeve', label: 'Sleeve' },
                  { key: 'shoulder', label: 'Shoulder' },
                  { key: 'inseam', label: 'Sokoto Inseam' },
                  { key: 'agbada_wingspan', label: 'Agbada Wingspan' },
                  { key: 'fila_cap_head', label: 'Fila Cap Head' },
                  { key: 'neck', label: 'Embroidered Collar' },
                ].map(({ key, label }) => {
                  const val = editMeasData ? (editMeasData as any)[key] : (selectedMeasurementClient as any)[key];
                  return (
                    <div key={key} className="bg-[#FAF6F0] dark:bg-[#24201D] p-3 rounded-2xl border border-[#E5DACB] dark:border-[#332C27]">
                      <span className="text-[10px] font-bold uppercase text-[#98897C]">{label}</span>
                      {measEditing ? (
                        <input
                          type="number"
                          step="0.5"
                          value={val || 0}
                          onChange={(e) => {
                            if (editMeasData) {
                              setEditMeasData({ ...editMeasData, [key]: parseFloat(e.target.value) || 0 });
                            }
                          }}
                          className="w-full mt-1 p-1 bg-white dark:bg-[#1C1917] border border-[#C8B69F] dark:border-[#4A4039] rounded font-mono font-bold text-sm"
                        />
                      ) : (
                        <div className="font-mono text-base font-bold text-[#161311] dark:text-[#F5EFE6] mt-0.5">
                          {val || '—'} <span className="text-xs font-normal text-[#98897C]">{selectedMeasurementClient.unit}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {measEditing && (
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setMeasEditing(false)}
                    className="px-3 py-1.5 border border-[#C8B69F] dark:border-[#4A4039] rounded-xl text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveMeasurement}
                    className="px-4 py-1.5 bg-[#161311] dark:bg-[#D4A347] text-white dark:text-[#161311] rounded-xl text-xs font-bold"
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. ADD BENCH NOTE MODAL */}
      {selectedOrderForNote && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white dark:bg-[#1C1917] rounded-3xl shadow-2xl border border-[#E5DACB] dark:border-[#332C27] overflow-hidden text-[#1A1715] dark:text-[#F5EFE6]">
            <div className="bg-[#161311] dark:bg-[#0D0B0A] text-[#FAF6F0] px-6 py-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">
                Log Bench Note: {selectedOrderForNote.id}
              </h3>
              <button onClick={() => setSelectedOrderForNote(null)} className="text-[#98897C] hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddNote} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-[#6A5D52] dark:text-[#B8ABA0]">
                  Artisan Progress Log Note:
                </label>
                <textarea
                  required
                  rows={3}
                  value={stageNote}
                  onChange={(e) => setStageNote(e.target.value)}
                  placeholder="e.g. Guinea brocade steamed. Chain-stitch embroidery applied to chest placket."
                  className="w-full p-2.5 bg-white dark:bg-[#24201D] border border-[#C8B69F] dark:border-[#4A4039] rounded-xl focus:ring-1 focus:ring-[#D4A347]"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrderForNote(null)}
                  className="px-4 py-2 border border-[#C8B69F] dark:border-[#4A4039] rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#161311] dark:bg-[#D4A347] text-white dark:text-[#161311] rounded-xl font-bold text-xs flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Save Note</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
