/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  UserRole, 
  ProductionStatus, 
  Order, 
  Profile, 
  Measurement, 
  Appointment, 
  Feedback, 
  LookbookItem,
  AppointmentStatus 
} from '../types';
import { 
  INITIAL_PROFILES, 
  INITIAL_ORDERS, 
  INITIAL_MEASUREMENTS, 
  INITIAL_APPOINTMENTS, 
  INITIAL_FEEDBACK, 
  INITIAL_LOOKBOOK 
} from '../data/initialData';

interface StitchFlowContextType {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  activeTailorId: string;
  setActiveTailorId: (id: string) => void;
  activeClientId: string;
  setActiveClientId: (id: string) => void;
  currency: 'KES' | 'USD';
  setCurrency: (c: 'KES' | 'USD') => void;
  formatCurrency: (kesAmount: number) => string;
  
  // Data entities
  profiles: Profile[];
  orders: Order[];
  measurements: Measurement[];
  appointments: Appointment[];
  feedbacks: Feedback[];
  lookbook: LookbookItem[];

  // Order actions
  updateOrderStatus: (orderId: string, newStatus: ProductionStatus, note?: string) => void;
  addOrder: (order: Partial<Order>) => Order;
  assignTailorToOrder: (orderId: string, tailorId: string) => void;

  // Measurement actions
  updateMeasurement: (measurement: Measurement) => void;
  getMeasurementForClient: (clientId: string) => Measurement | undefined;

  // Appointment actions
  bookAppointment: (apt: Omit<Appointment, 'id' | 'status'>) => Appointment;
  updateAppointmentStatus: (id: string, status: AppointmentStatus) => void;

  // Feedback actions
  submitFeedback: (feedback: Omit<Feedback, 'id' | 'created_at' | 'resolution_status'>) => void;
  updateFeedbackStatus: (id: string, status: 'open' | 'addressed' | 'resolved') => void;

  // Lookbook actions
  addLookbookItem: (item: Omit<LookbookItem, 'id'>) => void;

  // UI state
  toastMessage: string | null;
  showToast: (msg: string) => void;
  trackingModalOpen: boolean;
  setTrackingModalOpen: (open: boolean) => void;
  selectedTrackOrderId: string | null;
  setSelectedTrackOrderId: (id: string | null) => void;
  bookingModalOpen: boolean;
  setBookingModalOpen: (open: boolean) => void;
  selectedLookbookForBooking: LookbookItem | null;
  setSelectedLookbookForBooking: (item: LookbookItem | null) => void;
  
  // Reset demo
  resetToDefaults: () => void;
}

const StitchFlowContext = createContext<StitchFlowContextType | undefined>(undefined);

const STORAGE_KEYS = {
  ROLE: 'stitchflow_role',
  ORDERS: 'stitchflow_orders',
  PROFILES: 'stitchflow_profiles',
  MEASUREMENTS: 'stitchflow_measurements',
  APPOINTMENTS: 'stitchflow_appointments',
  FEEDBACK: 'stitchflow_feedback',
  LOOKBOOK: 'stitchflow_lookbook',
  CURRENCY: 'stitchflow_currency',
  ACTIVE_TAILOR: 'stitchflow_tailor',
  ACTIVE_CLIENT: 'stitchflow_client'
};

export const StitchFlowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRoleState] = useState<UserRole>(() => {
    return (localStorage.getItem(STORAGE_KEYS.ROLE) as UserRole) || 'visitor';
  });

  const [currency, setCurrencyState] = useState<'KES' | 'USD'>(() => {
    return (localStorage.getItem(STORAGE_KEYS.CURRENCY) as 'KES' | 'USD') || 'KES';
  });

  const [activeTailorId, setActiveTailorIdState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_TAILOR) || 'usr_tailor_01';
  });

  const [activeClientId, setActiveClientIdState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_CLIENT) || 'usr_client_01';
  });

  const [profiles] = useState<Profile[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PROFILES);
    return saved ? JSON.parse(saved) : INITIAL_PROFILES;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ORDERS);
    return saved ? JSON.parse(saved) : INITIAL_ORDERS;
  });

  const [measurements, setMeasurements] = useState<Measurement[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MEASUREMENTS);
    return saved ? JSON.parse(saved) : INITIAL_MEASUREMENTS;
  });

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
    return saved ? JSON.parse(saved) : INITIAL_APPOINTMENTS;
  });

  const [feedbacks, setFeedbacks] = useState<Feedback[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FEEDBACK);
    return saved ? JSON.parse(saved) : INITIAL_FEEDBACK;
  });

  const [lookbook, setLookbook] = useState<LookbookItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LOOKBOOK);
    return saved ? JSON.parse(saved) : INITIAL_LOOKBOOK;
  });

  // Modal & Toast states
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [selectedTrackOrderId, setSelectedTrackOrderId] = useState<string | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedLookbookForBooking, setSelectedLookbookForBooking] = useState<LookbookItem | null>(null);

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ROLE, currentRole);
  }, [currentRole]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENCY, currency);
  }, [currency]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_TAILOR, activeTailorId);
  }, [activeTailorId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_CLIENT, activeClientId);
  }, [activeClientId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MEASUREMENTS, JSON.stringify(measurements));
  }, [measurements]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FEEDBACK, JSON.stringify(feedbacks));
  }, [feedbacks]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LOOKBOOK, JSON.stringify(lookbook));
  }, [lookbook]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 4000);
  };

  const setCurrentRole = (role: UserRole) => {
    setCurrentRoleState(role);
    const roleLabels = {
      owner: 'Switched to Atelier Manager View 👑',
      employee: 'Switched to Tailor & Artisan View ✂️',
      client: 'Switched to Client Portal & Order Tracker 👗',
      visitor: 'Switched to Public Portfolio & Booking 🌐'
    };
    showToast(roleLabels[role]);
  };

  const setCurrency = (c: 'KES' | 'USD') => {
    setCurrencyState(c);
  };

  const setActiveTailorId = (id: string) => {
    setActiveTailorIdState(id);
    const tailor = profiles.find(p => p.id === id);
    if (tailor) {
      showToast(`Active Tailor: ${tailor.full_name} (${tailor.title || 'Artisan'})`);
    }
  };

  const setActiveClientId = (id: string) => {
    setActiveClientIdState(id);
    const client = profiles.find(p => p.id === id);
    if (client) {
      showToast(`Viewing as Client: ${client.full_name}`);
    }
  };

  // 1 USD ~ 130 KES
  const formatCurrency = (kesAmount: number): string => {
    if (currency === 'USD') {
      const usdAmount = Math.round(kesAmount / 130);
      return `$${usdAmount.toLocaleString()}`;
    }
    return `${kesAmount.toLocaleString()} KES`;
  };

  const updateOrderStatus = (orderId: string, newStatus: ProductionStatus, note?: string) => {
    const currentTailor = profiles.find(p => p.id === activeTailorId);
    const authorName = currentRole === 'owner' ? 'Wanjiku Kamau (Director)' : currentTailor?.full_name || 'Artisan';

    setOrders(prev => prev.map(order => {
      if (order.id !== orderId) return order;
      
      const newProgressNote = {
        stage: newStatus,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        note: note || `Garment stage advanced to ${newStatus.toUpperCase()}`,
        author: authorName
      };

      return {
        ...order,
        status: newStatus,
        progress_notes: [...order.progress_notes, newProgressNote]
      };
    }));

    showToast(`Order ${orderId} moved to ${newStatus.toUpperCase()}`);
  };

  const addOrder = (orderData: Partial<Order>): Order => {
    const newId = `ORD-${Math.floor(895 + Math.random() * 100)}`;
    const client = profiles.find(p => p.id === orderData.client_id) || profiles.find(p => p.role === 'client')!;
    const tailor = profiles.find(p => p.id === orderData.assigned_tailor_id) || profiles.find(p => p.role === 'employee')!;

    const newOrder: Order = {
      id: newId,
      client_id: client.id,
      client_name: client.full_name,
      client_phone: client.phone,
      assigned_tailor_id: tailor.id,
      assigned_tailor_name: tailor.full_name,
      status: (orderData.status as ProductionStatus) || 'cutting',
      description: orderData.description || 'Bespoke custom garment tailored to client measurements.',
      garment_type: orderData.garment_type || 'Bespoke Tailoring',
      fabric_details: orderData.fabric_details || 'Selected Atelier Fabric',
      estimated_delivery: orderData.estimated_delivery || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      deposit_amount: orderData.deposit_amount || 30000,
      balance_due: orderData.balance_due || 20000,
      currency: 'KES',
      photo_url: orderData.photo_url || 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&auto=format&fit=crop&q=80',
      progress_notes: [
        {
          stage: 'cutting',
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
          note: 'New bespoke order logged and assigned to workstation.',
          author: 'Wanjiku Kamau'
        }
      ],
      created_at: new Date().toISOString().slice(0, 10)
    };

    setOrders(prev => [newOrder, ...prev]);
    showToast(`Order #${newId} created for ${client.full_name}!`);
    return newOrder;
  };

  const assignTailorToOrder = (orderId: string, tailorId: string) => {
    const tailor = profiles.find(p => p.id === tailorId);
    if (!tailor) return;

    setOrders(prev => prev.map(order => {
      if (order.id !== orderId) return order;
      return {
        ...order,
        assigned_tailor_id: tailor.id,
        assigned_tailor_name: tailor.full_name
      };
    }));

    showToast(`Order ${orderId} reassigned to ${tailor.full_name}`);
  };

  const updateMeasurement = (newMeas: Measurement) => {
    setMeasurements(prev => {
      const exists = prev.some(m => m.client_id === newMeas.client_id);
      if (exists) {
        return prev.map(m => m.client_id === newMeas.client_id ? { ...newMeas, updated_at: new Date().toISOString().slice(0, 10) } : m);
      }
      return [...prev, { ...newMeas, updated_at: new Date().toISOString().slice(0, 10) }];
    });
    showToast('Measurement card successfully updated!');
  };

  const getMeasurementForClient = (clientId: string) => {
    return measurements.find(m => m.client_id === clientId);
  };

  const bookAppointment = (aptData: Omit<Appointment, 'id' | 'status'>): Appointment => {
    const newId = `apt_${Date.now()}`;
    const newAppointment: Appointment = {
      ...aptData,
      id: newId,
      status: 'pending'
    };

    setAppointments(prev => [newAppointment, ...prev]);
    showToast('Consultation appointment booked! Atelier team will confirm shortly.');
    return newAppointment;
  };

  const updateAppointmentStatus = (id: string, status: AppointmentStatus) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    showToast(`Appointment status updated to ${status}`);
  };

  const submitFeedback = (fbData: Omit<Feedback, 'id' | 'created_at' | 'resolution_status'>) => {
    const newFeedback: Feedback = {
      ...fbData,
      id: `fbk_${Date.now()}`,
      resolution_status: 'open',
      created_at: new Date().toISOString().slice(0, 10)
    };

    setFeedbacks(prev => [newFeedback, ...prev]);
    showToast('Thank you! Your feedback and fit review was submitted to the atelier team.');
  };

  const updateFeedbackStatus = (id: string, status: 'open' | 'addressed' | 'resolved') => {
    setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, resolution_status: status } : f));
    showToast(`Feedback marked as ${status}`);
  };

  const addLookbookItem = (itemData: Omit<LookbookItem, 'id'>) => {
    const newItem: LookbookItem = {
      ...itemData,
      id: `LKB-${Date.now().toString().slice(-4)}`
    };
    setLookbook(prev => [newItem, ...prev]);
    showToast(`Added "${itemData.title}" to public lookbook!`);
  };

  const resetToDefaults = () => {
    localStorage.clear();
    setOrders(INITIAL_ORDERS);
    setMeasurements(INITIAL_MEASUREMENTS);
    setAppointments(INITIAL_APPOINTMENTS);
    setFeedbacks(INITIAL_FEEDBACK);
    setLookbook(INITIAL_LOOKBOOK);
    setCurrentRoleState('visitor');
    setCurrencyState('KES');
    showToast('Reset data to default luxury atelier showcase!');
  };

  return (
    <StitchFlowContext.Provider value={{
      currentRole,
      setCurrentRole,
      activeTailorId,
      setActiveTailorId,
      activeClientId,
      setActiveClientId,
      currency,
      setCurrency,
      formatCurrency,
      profiles,
      orders,
      measurements,
      appointments,
      feedbacks,
      lookbook,
      updateOrderStatus,
      addOrder,
      assignTailorToOrder,
      updateMeasurement,
      getMeasurementForClient,
      bookAppointment,
      updateAppointmentStatus,
      submitFeedback,
      updateFeedbackStatus,
      addLookbookItem,
      toastMessage,
      showToast,
      trackingModalOpen,
      setTrackingModalOpen,
      selectedTrackOrderId,
      setSelectedTrackOrderId,
      bookingModalOpen,
      setBookingModalOpen,
      selectedLookbookForBooking,
      setSelectedLookbookForBooking,
      resetToDefaults
    }}>
      {children}
    </StitchFlowContext.Provider>
  );
};

export const useStitchFlow = () => {
  const context = useContext(StitchFlowContext);
  if (!context) {
    throw new Error('useStitchFlow must be used within a StitchFlowProvider');
  }
  return context;
};
