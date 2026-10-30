/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Crown, 
  DollarSign, 
  ShoppingBag, 
  Users, 
  Clock, 
  Scissors, 
  Plus, 
  CheckCircle2, 
  ChevronRight, 
  Calendar, 
  Sparkles, 
  MessageSquare, 
  ArrowUpRight,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { useStitchFlow } from '../context/StitchFlowContext';
import { Order, ProductionStatus } from '../types';
import { AccessGate } from './AccessGate';

export const OwnerDashboard: React.FC = () => {
  const { 
    hasPermission,
    orders, 
    updateOrderStatus, 
    addOrder, 
    profiles, 
    appointments, 
    updateAppointmentStatus, 
    measurements, 
    feedbacks, 
    updateFeedbackStatus,
    lookbook,
    addLookbookItem,
    formatCurrency,
    currentUser
  } = useStitchFlow();

  const [activeTab, setActiveTab] = useState<'production' | 'appointments' | 'clients' | 'lookbook' | 'feedback'>('production');
  const [newOrderModalOpen, setNewOrderModalOpen] = useState(false);
  const [newLookbookModalOpen, setNewLookbookModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | ProductionStatus>('all');
  
  // New Order Form state
  const [clientId, setClientId] = useState('usr_client_01');
  const [tailorId, setTailorId] = useState('usr_tailor_01');
  const [garmentType, setGarmentType] = useState('3-Piece Grand Royal Agbada Set');
  const [description, setDescription] = useState('');
  const [fabricDetails, setFabricDetails] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [depositAmount, setDepositAmount] = useState(45000);
  const [balanceDue, setBalanceDue] = useState(35000);
  const [photoUrl, setPhotoUrl] = useState('https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&auto=format&fit=crop&q=80');

  // New Lookbook Form state
  const [lbTitle, setLbTitle] = useState('');
  const [lbCategory, setLbCategory] = useState<'Grand Agbada & Boubou' | 'Senator Suits & Kaftans' | 'Ceremonial & Bridal' | 'Modern Kitenge & Wax' | 'Heritage Tunics & Kanzu'>('Grand Agbada & Boubou');
  const [lbDesc, setLbDesc] = useState('');
  const [lbFabric, setLbFabric] = useState('');
  const [lbOrigin, setLbOrigin] = useState('Yoruba Royal Heritage');
  const [lbPriceRange, setLbPriceRange] = useState('70,000 - 95,000 KES');
  const [lbDays, setLbDays] = useState(14);
  const [lbImage, setLbImage] = useState('https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&auto=format&fit=crop&q=80');

  const totalRevenue = orders.reduce((sum, o) => sum + o.deposit_amount + (o.status === 'ready' ? o.balance_due : 0), 0);
  const pendingBalance = orders.reduce((sum, o) => sum + (o.status !== 'ready' ? o.balance_due : 0), 0);
  const activeOrdersCount = orders.filter(o => o.status !== 'ready').length;
  const readyOrdersCount = orders.filter(o => o.status === 'ready').length;

  const tailors = profiles.filter(p => p.role === 'employee');
  const clients = profiles.filter(p => p.role === 'client');

  const tailorWorkload = tailors.map(t => {
    const assigned = orders.filter(o => o.assigned_tailor_id === t.id && o.status !== 'ready');
    return {
      ...t,
      activeCount: assigned.length,
      orders: assigned
    };
  });

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const client = profiles.find(p => p.id === clientId);
    const tailor = profiles.find(p => p.id === tailorId);

    addOrder({
      client_id: clientId,
      client_name: client?.full_name || 'Client',
      client_phone: client?.phone || '+254 700 000 000',
      assigned_tailor_id: tailorId,
      assigned_tailor_name: tailor?.full_name || 'Artisan',
      garment_type: garmentType,
      description: description || `Bespoke African ${garmentType} commissioned.`,
      fabric_details: fabricDetails || 'Original Guinea Brocade with metallic embroidery.',
      estimated_delivery: estimatedDelivery,
      deposit_amount: Number(depositAmount),
      balance_due: Number(balanceDue),
      photo_url: photoUrl,
      status: 'cutting'
    });

    setNewOrderModalOpen(false);
    setDescription('');
    setFabricDetails('');
  };

  const handleCreateLookbook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lbTitle) return;

    addLookbookItem({
      title: lbTitle,
      category: lbCategory,
      description: lbDesc,
      fabric: lbFabric,
      price_range: lbPriceRange,
      cultural_origin: lbOrigin,
      turnaround_days: Number(lbDays),
      image_url: lbImage,
      tags: ['African Couture', lbCategory.split(' ')[0], 'Bespoke', 'Traditional'],
      is_featured: true
    });

    setNewLookbookModalOpen(false);
    setLbTitle('');
    setLbDesc('');
  };

  const stages: ProductionStatus[] = ['cutting', 'stitching', 'fitting', 'ready'];

  // ACCESS GATE CHECK: Must be an owner (Director) to view this portal!
  if (!hasPermission('owner')) {
    return (
      <AccessGate 
        requiredRole="owner"
        portalName="Atelier Director Executive Suite"
        portalDescription="Restricted to Creative Director Wanjiku Kamau. Grants access to confidential financial revenue balances, master tailor bench workloads, and atelier operations."
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* 1. Atelier Executive Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#E5DACB] dark:border-[#332C27]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-[#161311] dark:bg-[#24201D] text-[#D4A347] border border-[#D4A347]/30">
              <Crown className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-[#8C6D2D] dark:text-[#D4A347]">
              Atelier Director & Founder Suite
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 font-bold">
              Authenticated: {currentUser?.full_name}
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#161311] dark:text-[#F5EFE6] mt-1">
            Executive Production & Financial Suite
          </h1>
          <p className="text-xs text-[#6A5D52] dark:text-[#B8ABA0] mt-0.5">
            Real-time cashflow metrics, tailor bench workload distribution, and ceremony commissions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setNewOrderModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#161311] dark:bg-[#D4A347] hover:bg-[#2C241E] text-[#FAF6F0] dark:text-[#161311] rounded-2xl text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 text-[#D4A347] dark:text-[#161311]" />
            <span>New Cultural Commission</span>
          </button>
        </div>
      </div>

      {/* 2. Executive KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#1C1917] p-5 rounded-3xl border border-[#E5DACB] dark:border-[#332C27] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#6A5D52] dark:text-[#B8ABA0]">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Realized Revenue</span>
            <DollarSign className="w-4 h-4 text-[#D4A347]" />
          </div>
          <div className="font-mono text-xl sm:text-2xl font-bold text-[#161311] dark:text-[#F5EFE6] mt-2">
            {formatCurrency(totalRevenue)}
          </div>
          <div className="text-[11px] text-green-700 dark:text-green-400 font-medium flex items-center gap-1 mt-1">
            <ArrowUpRight className="w-3 h-3" /> +22.4% vs last wedding season
          </div>
        </div>

        <div className="bg-white dark:bg-[#1C1917] p-5 rounded-3xl border border-[#E5DACB] dark:border-[#332C27] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#6A5D52] dark:text-[#B8ABA0]">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Pending Balances</span>
            <Clock className="w-4 h-4 text-[#98897C]" />
          </div>
          <div className="font-mono text-xl sm:text-2xl font-bold text-[#161311] dark:text-[#F5EFE6] mt-2">
            {formatCurrency(pendingBalance)}
          </div>
          <div className="text-[11px] text-[#6A5D52] dark:text-[#8A7D73] mt-1">
            Receivable upon final ceremonial handover
          </div>
        </div>

        <div className="bg-white dark:bg-[#1C1917] p-5 rounded-3xl border border-[#E5DACB] dark:border-[#332C27] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#6A5D52] dark:text-[#B8ABA0]">
            <span className="font-semibold uppercase tracking-wider text-[10px]">In Workshop</span>
            <Scissors className="w-4 h-4 text-[#D4A347]" />
          </div>
          <div className="font-mono text-xl sm:text-2xl font-bold text-[#161311] dark:text-[#F5EFE6] mt-2">
            {activeOrdersCount} Bespoke Pieces
          </div>
          <div className="text-[11px] text-[#8C6D2D] dark:text-[#D4A347] font-medium mt-1">
            {readyOrdersCount} Ready for ceremonial pickup
          </div>
        </div>

        <div className="bg-white dark:bg-[#1C1917] p-5 rounded-3xl border border-[#E5DACB] dark:border-[#332C27] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#6A5D52] dark:text-[#B8ABA0]">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Fitting Requests</span>
            <Calendar className="w-4 h-4 text-[#D4A347]" />
          </div>
          <div className="font-mono text-xl sm:text-2xl font-bold text-[#161311] dark:text-[#F5EFE6] mt-2">
            {appointments.filter(a => a.status === 'pending').length} Pending Review
          </div>
          <div className="text-[11px] text-[#6A5D52] dark:text-[#8A7D73] mt-1">
            {appointments.length} total scheduled
          </div>
        </div>
      </div>

      {/* 3. Artisan Bench Allocation */}
      <div className="bg-white dark:bg-[#1C1917] p-6 rounded-3xl border border-[#E5DACB] dark:border-[#332C27] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#D4A347]" />
            <h3 className="font-bold text-sm text-[#161311] dark:text-[#F5EFE6]">
              Workshop Cutting Tables & Master Artisan Capacity
            </h3>
          </div>
          <span className="text-xs text-[#6A5D52] dark:text-[#B8ABA0]">
            {tailors.length} Master African Artisans Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {tailorWorkload.map(t => {
            const capacityPercent = Math.min(100, Math.round((t.activeCount / 4) * 100));
            return (
              <div key={t.id} className="p-4 rounded-2xl bg-[#FAF6F0] dark:bg-[#24201D] border border-[#E5DACB] dark:border-[#332C27]">
                <div className="flex items-center gap-3">
                  <img
                    src={t.avatar_url}
                    alt={t.full_name}
                    className="w-10 h-10 rounded-full object-cover border border-[#E5DACB]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs text-[#161311] dark:text-[#F5EFE6] truncate">
                      {t.full_name}
                    </div>
                    <div className="text-[11px] text-[#8C6D2D] dark:text-[#D4A347] truncate">
                      {t.specialty}
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex justify-between text-[11px] text-[#6A5D52] dark:text-[#B8ABA0] mb-1">
                    <span>Active bench load ({t.activeCount} orders):</span>
                    <span className="font-bold text-[#161311] dark:text-[#F5EFE6]">{capacityPercent}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#E5DACB] dark:bg-[#332C27] rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        capacityPercent > 80 ? 'bg-[#C25E34]' : 'bg-[#161311] dark:bg-[#D4A347]'
                      }`}
                      style={{ width: `${capacityPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Tab Navigation Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E5DACB] dark:border-[#332C27] pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('production')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'production' 
              ? 'bg-[#161311] dark:bg-[#D4A347] text-[#FAF6F0] dark:text-[#161311]' 
              : 'text-[#6A5D52] dark:text-[#B8ABA0] hover:bg-[#F3ECE1] dark:hover:bg-[#24201D]'
          }`}
        >
          <Scissors className="w-4 h-4 text-[#D4A347] dark:text-[#161311]" />
          <span>Production Pipeline ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('appointments')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'appointments' 
              ? 'bg-[#161311] dark:bg-[#D4A347] text-[#FAF6F0] dark:text-[#161311]' 
              : 'text-[#6A5D52] dark:text-[#B8ABA0] hover:bg-[#F3ECE1] dark:hover:bg-[#24201D]'
          }`}
        >
          <Calendar className="w-4 h-4 text-[#D4A347] dark:text-[#161311]" />
          <span>Fitting Queue ({appointments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('clients')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'clients' 
              ? 'bg-[#161311] dark:bg-[#D4A347] text-[#FAF6F0] dark:text-[#161311]' 
              : 'text-[#6A5D52] dark:text-[#B8ABA0] hover:bg-[#F3ECE1] dark:hover:bg-[#24201D]'
          }`}
        >
          <Users className="w-4 h-4 text-[#D4A347] dark:text-[#161311]" />
          <span>VIP Patrons ({clients.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('lookbook')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'lookbook' 
              ? 'bg-[#161311] dark:bg-[#D4A347] text-[#FAF6F0] dark:text-[#161311]' 
              : 'text-[#6A5D52] dark:text-[#B8ABA0] hover:bg-[#F3ECE1] dark:hover:bg-[#24201D]'
          }`}
        >
          <Sparkles className="w-4 h-4 text-[#D4A347] dark:text-[#161311]" />
          <span>Lookbook CMS ({lookbook.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('feedback')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'feedback' 
              ? 'bg-[#161311] dark:bg-[#D4A347] text-[#FAF6F0] dark:text-[#161311]' 
              : 'text-[#6A5D52] dark:text-[#B8ABA0] hover:bg-[#F3ECE1] dark:hover:bg-[#24201D]'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-[#D4A347] dark:text-[#161311]" />
          <span>Ceremonial Feedback ({feedbacks.length})</span>
        </button>
      </div>

      {/* 5. TAB CONTENT */}
      {activeTab === 'production' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-display text-xl font-bold text-[#161311] dark:text-[#F5EFE6]">
              Pan-African Atelier Production Pipeline
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#6A5D52] dark:text-[#B8ABA0]">Filter:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-xs bg-white dark:bg-[#24201D] border border-[#C8B69F] dark:border-[#4A4039] rounded-xl px-3 py-1.5 focus:outline-none"
              >
                <option value="all">All Phases</option>
                <option value="cutting">1. Pattern & Wax Alignment</option>
                <option value="stitching">2. Artisan Seam & Chain-Stitch</option>
                <option value="fitting">3. Ceremonial Basted Fitting</option>
                <option value="ready">4. Hand-Pressed & Ready</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stages.map((stageKey) => {
              const columnOrders = orders.filter(o => 
                o.status === stageKey && (statusFilter === 'all' || statusFilter === stageKey)
              );

              const stageTitles = {
                cutting: '1. Pattern & Wax Match ✂️',
                stitching: '2. Seam & Chain-Stitch 🪡',
                fitting: '3. Ceremonial Fitting 📏',
                ready: '4. Ready for Handover ✨'
              };

              return (
                <div key={stageKey} className="bg-[#F3ECE1] dark:bg-[#24201D] rounded-3xl p-4 border border-[#E5DACB] dark:border-[#332C27] flex flex-col min-h-[480px]">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E5DACB] dark:border-[#332C27]">
                    <div className="font-bold text-xs text-[#161311] dark:text-[#F5EFE6]">
                      {stageTitles[stageKey]}
                    </div>
                    <span className="w-5 h-5 rounded-full bg-white dark:bg-[#1C1917] text-[#161311] dark:text-[#F5EFE6] text-[10px] font-bold flex items-center justify-center border border-[#C8B69F] dark:border-[#4A4039]">
                      {columnOrders.length}
                    </span>
                  </div>

                  <div className="space-y-3 flex-1 overflow-y-auto">
                    {columnOrders.length === 0 ? (
                      <div className="text-center py-12 text-[11px] text-[#98897C]">
                        No garments in this phase
                      </div>
                    ) : (
                      columnOrders.map((ord) => (
                        <div
                          key={ord.id}
                          className="bg-white dark:bg-[#1C1917] p-4 rounded-2xl border border-[#E5DACB] dark:border-[#332C27] shadow-sm hover:shadow-md transition-all space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#161311] text-[#FAF6F0] dark:bg-[#FAF6F0] dark:text-[#161311]">
                              {ord.id}
                            </span>
                            <span className="text-[10px] text-[#8C6D2D] dark:text-[#D4A347] font-bold truncate">
                              Target: {ord.estimated_delivery}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <img
                              src={ord.photo_url}
                              alt={ord.garment_type}
                              className="w-12 h-12 rounded-xl object-cover border border-[#E5DACB] dark:border-[#332C27]"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-xs text-[#161311] dark:text-[#F5EFE6] truncate">
                                {ord.garment_type}
                              </h4>
                              <p className="text-[11px] text-[#6A5D52] dark:text-[#B8ABA0] truncate">
                                Patron: {ord.client_name}
                              </p>
                              <p className="text-[10px] text-[#98897C] truncate">
                                Artisan: {ord.assigned_tailor_name}
                              </p>
                            </div>
                          </div>

                          <p className="text-[11px] text-[#6A5D52] dark:text-[#B8ABA0] line-clamp-2 bg-[#FAF6F0] dark:bg-[#24201D] p-2.5 rounded-xl border border-[#E5DACB] dark:border-[#332C27]">
                            {ord.description}
                          </p>

                          <div className="flex items-center justify-between text-[11px] pt-1">
                            <span className="text-[#98897C]">Balance:</span>
                            <span className="font-mono font-bold text-[#161311] dark:text-[#F5EFE6]">
                              {formatCurrency(ord.balance_due)}
                            </span>
                          </div>

                          <div className="pt-2 border-t border-[#F3ECE1] dark:border-[#332C27] flex items-center justify-between gap-2">
                            <div className="text-[10px] text-[#98897C]">Stage:</div>
                            <div className="flex gap-1">
                              {stageKey !== 'cutting' && (
                                <button
                                  onClick={() => {
                                    const prev = stages[stages.indexOf(stageKey) - 1];
                                    updateOrderStatus(ord.id, prev);
                                  }}
                                  className="px-2 py-1 bg-[#F3ECE1] dark:bg-[#24201D] hover:bg-[#E5DACB] rounded text-[10px] font-semibold"
                                  title="Previous Stage"
                                >
                                  ←
                                </button>
                              )}
                              {stageKey !== 'ready' && (
                                <button
                                  onClick={() => {
                                    const next = stages[stages.indexOf(stageKey) + 1];
                                    updateOrderStatus(ord.id, next);
                                  }}
                                  className="px-2.5 py-1 bg-[#161311] dark:bg-[#D4A347] hover:bg-[#2C241E] text-white dark:text-[#161311] rounded text-[10px] font-bold flex items-center gap-1"
                                >
                                  <span>Next</span>
                                  <ChevronRight className="w-3 h-3 text-[#D4A347] dark:text-[#161311]" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB B: APPOINTMENTS */}
      {activeTab === 'appointments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-bold text-[#161311] dark:text-[#F5EFE6]">
              Ceremonial Fitting & Consultation Queue
            </h3>
            <span className="text-xs text-[#6A5D52] dark:text-[#B8ABA0]">
              Double-booking protection active
            </span>
          </div>

          <div className="bg-white dark:bg-[#1C1917] rounded-3xl border border-[#E5DACB] dark:border-[#332C27] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F3ECE1] dark:bg-[#24201D] text-[#6A5D52] dark:text-[#B8ABA0] uppercase tracking-wider text-[10px] border-b border-[#E5DACB] dark:border-[#332C27]">
                  <tr>
                    <th className="px-4 py-3">Patron</th>
                    <th className="px-4 py-3">Occasion & Service</th>
                    <th className="px-4 py-3">Fitting Slot</th>
                    <th className="px-4 py-3">Assigned Artisan</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5DACB] dark:divide-[#332C27]">
                  {appointments.map((apt) => (
                    <tr key={apt.id} className="hover:bg-[#FAF6F0] dark:hover:bg-[#24201D]">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-[#161311] dark:text-[#F5EFE6]">{apt.client_name}</div>
                        <div className="text-[11px] text-[#6A5D52] dark:text-[#B8ABA0]">{apt.client_phone}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-[#8C6D2D] dark:text-[#D4A347]">
                          {apt.cultural_occasion || 'Ceremony'}
                        </div>
                        <span className="text-[11px] text-[#6A5D52] dark:text-[#B8ABA0] capitalize">
                          {apt.service_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[11px] font-semibold text-[#161311] dark:text-[#F5EFE6]">
                        {apt.slot_datetime.replace('T', ' ')}
                      </td>
                      <td className="px-4 py-3.5 text-[#6A5D52] dark:text-[#B8ABA0]">
                        {profiles.find(p => p.id === apt.assigned_tailor_id)?.full_name || 'Unassigned'}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          apt.status === 'confirmed' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' 
                            : apt.status === 'pending'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                          {apt.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-1.5">
                        {apt.status === 'pending' && (
                          <button
                            onClick={() => updateAppointmentStatus(apt.id, 'confirmed')}
                            className="px-2.5 py-1 bg-[#161311] dark:bg-[#D4A347] text-[#FAF6F0] dark:text-[#161311] rounded-lg text-[11px] font-semibold"
                          >
                            Confirm Fitting
                          </button>
                        )}
                        <button
                          onClick={() => updateAppointmentStatus(apt.id, 'completed')}
                          className="px-2.5 py-1 bg-white dark:bg-[#24201D] border border-[#C8B69F] dark:border-[#4A4039] rounded-lg text-[11px] font-medium"
                        >
                          Mark Done
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB C: CLIENTS */}
      {activeTab === 'clients' && (
        <div className="space-y-4">
          <h3 className="font-display text-xl font-bold text-[#161311] dark:text-[#F5EFE6]">
            VIP Patron Directory & African Measurement Cards
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {clients.map((cli) => {
              const meas = measurements.find(m => m.client_id === cli.id);

              return (
                <div key={cli.id} className="bg-white dark:bg-[#1C1917] p-5 rounded-3xl border border-[#E5DACB] dark:border-[#332C27] shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={cli.avatar_url}
                      alt={cli.full_name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-[#D4A347]/50"
                    />
                    <div>
                      <h4 className="font-bold text-sm text-[#161311] dark:text-[#F5EFE6]">{cli.full_name}</h4>
                      <div className="text-xs text-[#6A5D52] dark:text-[#B8ABA0]">{cli.phone}</div>
                      <div className="text-[11px] text-[#98897C]">{cli.title}</div>
                    </div>
                  </div>

                  {meas && (
                    <div className="bg-[#FAF6F0] dark:bg-[#24201D] p-3 rounded-2xl border border-[#E5DACB] dark:border-[#332C27] space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#8C6D2D] dark:text-[#D4A347]">Measurement Card</span>
                        <span className="font-mono text-[10px] text-[#98897C]">Unit: {meas.unit}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white dark:bg-[#1C1917] p-1 rounded-xl border border-[#E5DACB] dark:border-[#332C27]">
                          <div className="text-[9px] text-[#98897C]">Chest</div>
                          <div className="font-mono font-bold text-xs text-[#161311] dark:text-[#F5EFE6]">{meas.chest}</div>
                        </div>
                        <div className="bg-white dark:bg-[#1C1917] p-1 rounded-xl border border-[#E5DACB] dark:border-[#332C27]">
                          <div className="text-[9px] text-[#98897C]">Length</div>
                          <div className="font-mono font-bold text-xs text-[#161311] dark:text-[#F5EFE6]">{meas.length}</div>
                        </div>
                        <div className="bg-white dark:bg-[#1C1917] p-1 rounded-xl border border-[#E5DACB] dark:border-[#332C27]">
                          <div className="text-[9px] text-[#98897C]">Wingspan</div>
                          <div className="font-mono font-bold text-xs text-[#161311] dark:text-[#F5EFE6]">{meas.agbada_wingspan || '—'}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB D: LOOKBOOK */}
      {activeTab === 'lookbook' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl font-bold text-[#161311] dark:text-[#F5EFE6]">
                African Lookbook CMS
              </h3>
              <p className="text-xs text-[#6A5D52] dark:text-[#B8ABA0]">
                Publish new Agbadas, Senator suits, and Kitenge designs to your public showcase.
              </p>
            </div>
            <button
              onClick={() => setNewLookbookModalOpen(true)}
              className="px-3.5 py-2 bg-[#161311] dark:bg-[#D4A347] text-[#FAF6F0] dark:text-[#161311] rounded-xl text-xs font-semibold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-[#D4A347] dark:text-[#161311]" />
              <span>Add African Design</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {lookbook.map(item => (
              <div key={item.id} className="bg-white dark:bg-[#1C1917] rounded-3xl border border-[#E5DACB] dark:border-[#332C27] overflow-hidden flex flex-col justify-between">
                <div className="aspect-[4/3] bg-gray-100 dark:bg-gray-800 overflow-hidden relative">
                  <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                  <span className="absolute top-2 left-2 text-[10px] font-bold px-2.5 py-1 rounded-full bg-black/75 text-white">
                    {item.category}
                  </span>
                </div>
                <div className="p-4 space-y-2">
                  <h4 className="font-display text-lg font-bold text-[#161311] dark:text-[#F5EFE6]">{item.title}</h4>
                  <p className="text-xs text-[#8C6D2D] dark:text-[#D4A347] font-bold">{item.cultural_origin}</p>
                  <p className="text-xs text-[#6A5D52] dark:text-[#B8ABA0] line-clamp-2">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB E: FEEDBACK */}
      {activeTab === 'feedback' && (
        <div className="space-y-4">
          <h3 className="font-display text-xl font-bold text-[#161311] dark:text-[#F5EFE6]">
            Ceremonial Feedback & Fit Reviews
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {feedbacks.map(fb => (
              <div key={fb.id} className="bg-white dark:bg-[#1C1917] p-5 rounded-3xl border border-[#E5DACB] dark:border-[#332C27] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#161311] dark:text-[#F5EFE6]">{fb.client_name}</span>
                    <span className="text-xs text-[#98897C]">Order #{fb.order_id}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    fb.resolution_status === 'resolved' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' 
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                  }`}>
                    {fb.resolution_status}
                  </span>
                </div>

                <p className="text-xs text-[#1A1715] dark:text-[#F5EFE6] italic bg-[#FAF6F0] dark:bg-[#24201D] p-3 rounded-2xl border border-[#E5DACB] dark:border-[#332C27]">
                  "{fb.comments}"
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE ORDER MODAL */}
      {newOrderModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#1C1917] rounded-3xl shadow-2xl border border-[#E5DACB] dark:border-[#332C27] overflow-hidden text-[#1A1715] dark:text-[#F5EFE6]">
            <div className="bg-[#161311] dark:bg-[#0D0B0A] text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-display text-xl font-bold">Log New African Commission</h3>
              <button onClick={() => setNewOrderModalOpen(false)} className="text-[#98897C] hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-[#6A5D52] dark:text-[#B8ABA0]">Select Patron</label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-[#24201D] border border-[#C8B69F] dark:border-[#4A4039] rounded-xl"
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.full_name} ({c.phone})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-[#6A5D52] dark:text-[#B8ABA0]">Assign Master Artisan</label>
                <select
                  value={tailorId}
                  onChange={(e) => setTailorId(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-[#24201D] border border-[#C8B69F] dark:border-[#4A4039] rounded-xl"
                >
                  {tailors.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name} — {t.title}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-[#6A5D52] dark:text-[#B8ABA0]">African Garment Type</label>
                  <input
                    type="text"
                    value={garmentType}
                    onChange={(e) => setGarmentType(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-[#24201D] border border-[#C8B69F] dark:border-[#4A4039] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-[#6A5D52] dark:text-[#B8ABA0]">Ceremony Date</label>
                  <input
                    type="date"
                    value={estimatedDelivery}
                    onChange={(e) => setEstimatedDelivery(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-[#24201D] border border-[#C8B69F] dark:border-[#4A4039] rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-[#6A5D52] dark:text-[#B8ABA0]">Textile Sourcing</label>
                <input
                  type="text"
                  value={fabricDetails}
                  onChange={(e) => setFabricDetails(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-[#24201D] border border-[#C8B69F] dark:border-[#4A4039] rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-[#6A5D52] dark:text-[#B8ABA0]">Deposit (KES)</label>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                    className="w-full p-2 bg-white dark:bg-[#24201D] border border-[#C8B69F] dark:border-[#4A4039] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-[#6A5D52] dark:text-[#B8ABA0]">Balance Due (KES)</label>
                  <input
                    type="number"
                    value={balanceDue}
                    onChange={(e) => setBalanceDue(Number(e.target.value))}
                    className="w-full p-2 bg-white dark:bg-[#24201D] border border-[#C8B69F] dark:border-[#4A4039] rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNewOrderModalOpen(false)}
                  className="px-4 py-2 border border-[#C8B69F] dark:border-[#4A4039] rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#161311] dark:bg-[#D4A347] text-white dark:text-[#161311] rounded-xl font-bold"
                >
                  Create Commission
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
