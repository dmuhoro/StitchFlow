/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { clearStitchFlowStorage, readStorage, readStorageString, writeStorage } from '../lib/storage';
import { 
  UserRole, 
  ThemeMode,
  ProductionStatus, 
  Order, 
  Profile, 
  Measurement, 
  Appointment, 
  Feedback, 
  LookbookItem,
  AppointmentStatus,
  AtelierSettings
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
  
  // Theme & Appearance
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDarkMode: boolean;

  // Settings
  settings: AtelierSettings;
  updateSettings: (newSettings: Partial<AtelierSettings>) => void;
  settingsModalOpen: boolean;
  setSettingsModalOpen: (open: boolean) => void;

  // Authentication & Access Control
  currentUser: Profile | null;
  loginAsUser: (profile: Profile) => void;
  logout: () => void;
  hasPermission: (requiredRole: UserRole) => boolean;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  authTargetRole: UserRole | null;
  setAuthTargetRole: (role: UserRole | null) => void;

  // Active user selections
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

  // Actions
  updateOrderStatus: (orderId: string, newStatus: ProductionStatus, note?: string) => void;
  addOrder: (order: Partial<Order>) => Order;
  assignTailorToOrder: (orderId: string, tailorId: string) => void;
  updateMeasurement: (measurement: Measurement) => void;
  getMeasurementForClient: (clientId: string) => Measurement | undefined;
  bookAppointment: (apt: Omit<Appointment, 'id' | 'status'>) => Appointment;
  updateAppointmentStatus: (id: string, status: AppointmentStatus) => void;
  submitFeedback: (feedback: Omit<Feedback, 'id' | 'created_at' | 'resolution_status'>) => void;
  updateFeedbackStatus: (id: string, status: 'open' | 'addressed' | 'resolved') => void;
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
  THEME: 'stitchflow_theme',
  SETTINGS: 'stitchflow_settings',
  CURRENT_USER: 'stitchflow_current_user',
  ORDERS: 'stitchflow_orders',
  PROFILES: 'stitchflow_profiles',
  MEASUREMENTS: 'stitchflow_measurements',
  APPOINTMENTS: 'stitchflow_appointments',
  FEEDBACK: 'stitchflow_feedback',
  LOOKBOOK: 'stitchflow_lookbook',
  ACTIVE_TAILOR: 'stitchflow_tailor',
  ACTIVE_CLIENT: 'stitchflow_client'
};

const DEFAULT_SETTINGS: AtelierSettings = {
  atelier_name: 'StitchFlow Pan-African Atelier',
  studio_tagline: 'High-craft bespoke tailoring & African ceremonial regalia',
  whatsapp_number: '+254 712 345 678',
  currency: 'KES',
  default_unit: 'in',
  theme_mode: 'system',
  notifications_enabled: true,
  auto_backup: true
};

export const StitchFlowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme & Appearance State
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    return readStorageString('theme', 'system') as ThemeMode;
  });
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Settings State
  const [settings, setSettings] = useState<AtelierSettings>(() => {
    return readStorage('settings', DEFAULT_SETTINGS);
  });
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // Auth & Roles State
  // Default to a guest visitor initially so security gate is live!
  const [currentUser, setCurrentUser] = useState<Profile | null>(() => {
    return readStorage<Profile | null>('current_user', null);
  });
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTargetRole, setAuthTargetRole] = useState<UserRole | null>(null);

  const [currentRole, setCurrentRoleState] = useState<UserRole>(() => {
    return readStorageString('role', 'visitor') as UserRole;
  });

  const [currency, setCurrencyState] = useState<'KES' | 'USD'>(settings.currency || 'KES');

  const [activeTailorId, setActiveTailorIdState] = useState<string>(() => {
    return readStorageString('tailor', 'usr_tailor_01');
  });

  const [activeClientId, setActiveClientIdState] = useState<string>(() => {
    return readStorageString('client', 'usr_client_01');
  });

  const [profiles] = useState<Profile[]>(() => {
    return readStorage<Profile[]>('profiles', INITIAL_PROFILES);
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    return readStorage<Order[]>('orders', INITIAL_ORDERS);
  });

  const [measurements, setMeasurements] = useState<Measurement[]>(() => {
    return readStorage<Measurement[]>('measurements', INITIAL_MEASUREMENTS);
  });

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    return readStorage<Appointment[]>('appointments', INITIAL_APPOINTMENTS);
  });

  const [feedbacks, setFeedbacks] = useState<Feedback[]>(() => {
    return readStorage<Feedback[]>('feedback', INITIAL_FEEDBACK);
  });

  const [lookbook, setLookbook] = useState<LookbookItem[]>(() => {
    return readStorage<LookbookItem[]>('lookbook', INITIAL_LOOKBOOK);
  });

  // UI states
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [selectedTrackOrderId, setSelectedTrackOrderId] = useState<string | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedLookbookForBooking, setSelectedLookbookForBooking] = useState<LookbookItem | null>(null);

  // Sync theme mode to DOM & local storage
  useEffect(() => {
    writeStorage('theme', themeMode);

    const applyTheme = () => {
      let activeDark = false;
      if (themeMode === 'dark') {
        activeDark = true;
      } else if (themeMode === 'light') {
        activeDark = false;
      } else {
        // System preference
        activeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }

      setIsDarkMode(activeDark);
      if (activeDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    applyTheme();

    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [themeMode]);

  // Sync data to localStorage
  useEffect(() => {
    writeStorage('role', currentRole);
  }, [currentRole]);

  useEffect(() => {
    writeStorage('current_user', currentUser);
  }, [currentUser]);

  useEffect(() => {
    writeStorage('settings', settings);
  }, [settings]);

  useEffect(() => {
    writeStorage('tailor', activeTailorId);
  }, [activeTailorId]);

  useEffect(() => {
    writeStorage('client', activeClientId);
  }, [activeClientId]);

  useEffect(() => {
    writeStorage('orders', orders);
  }, [orders]);

  useEffect(() => {
    writeStorage('measurements', measurements);
  }, [measurements]);

  useEffect(() => {
    writeStorage('appointments', appointments);
  }, [appointments]);

  useEffect(() => {
    writeStorage('feedback', feedbacks);
  }, [feedbacks]);

  useEffect(() => {
    writeStorage('lookbook', lookbook);
  }, [lookbook]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 4000);
  };

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    setSettings(prev => ({ ...prev, theme_mode: mode }));
    const labels = {
      system: 'System Appearance Activated 💻',
      light: 'Warm Linen Light Mode Activated ☀️',
      dark: 'Ebony Obsidian Dark Mode Activated 🌙'
    };
    showToast(labels[mode]);
  };

  const updateSettings = (newSettings: Partial<AtelierSettings>) => {
    setSettings(prev => {
      const merged = { ...prev, ...newSettings };
      if (newSettings.currency) {
        setCurrencyState(newSettings.currency);
      }
      if (newSettings.theme_mode) {
        setThemeModeState(newSettings.theme_mode);
      }
      return merged;
    });
    showToast('Atelier settings updated successfully!');
  };

  // Authentication & Access Control
  const hasPermission = (requiredRole: UserRole): boolean => {
    if (requiredRole === 'visitor') return true;
    if (!currentUser) return false;
    if (currentUser.role === 'owner') return true; // Director has full administrative oversight
    if (requiredRole === 'employee') return currentUser.role === 'employee';
    if (requiredRole === 'client') return currentUser.role === 'client';
    return false;
  };

  const loginAsUser = (profile: Profile) => {
    setCurrentUser(profile);
    if (profile.role === 'owner') {
      setCurrentRoleState('owner');
      showToast(`Welcome Director ${profile.full_name}. Full Atelier Access granted.`);
    } else if (profile.role === 'employee') {
      setActiveTailorIdState(profile.id);
      setCurrentRoleState('employee');
      showToast(`Welcome Artisan ${profile.full_name}. Workshop Bench ready.`);
    } else if (profile.role === 'client') {
      setActiveClientIdState(profile.id);
      setCurrentRoleState('client');
      showToast(`Welcome Patron ${profile.full_name}. Personal Wardrobe unlocked.`);
    }
    setAuthModalOpen(false);
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentRoleState('visitor');
    showToast('Signed out of atelier session. Reverted to Public Lookbook.');
  };

  const setCurrentRole = (role: UserRole) => {
    // Check if user has credentials for this role
    if (role !== 'visitor' && !hasPermission(role)) {
      setAuthTargetRole(role);
      setAuthModalOpen(true);
      showToast(`Access Restricted: Sign in with authorized credentials for ${role.toUpperCase()} portal.`);
      return;
    }
    setCurrentRoleState(role);
  };

  const setCurrency = (c: 'KES' | 'USD') => {
    setCurrencyState(c);
    setSettings(prev => ({ ...prev, currency: c }));
  };

  const setActiveTailorId = (id: string) => {
    setActiveTailorIdState(id);
    const tailor = profiles.find(p => p.id === id);
    if (tailor) {
      showToast(`Active Artisan: ${tailor.full_name}`);
    }
  };

  const setActiveClientId = (id: string) => {
    setActiveClientIdState(id);
    const client = profiles.find(p => p.id === id);
    if (client) {
      showToast(`Active Patron: ${client.full_name}`);
    }
  };

  const formatCurrency = (kesAmount: number): string => {
    if (currency === 'USD') {
      const usdAmount = Math.round(kesAmount / 130);
      return `$${usdAmount.toLocaleString()}`;
    }
    return `${kesAmount.toLocaleString()} KES`;
  };

  const updateOrderStatus = (orderId: string, newStatus: ProductionStatus, note?: string) => {
    const authorName = currentUser?.full_name || (currentRole === 'owner' ? 'Wanjiku Kamau (Director)' : 'Master Artisan');

    setOrders(prev => prev.map(order => {
      if (order.id !== orderId) return order;
      
      const newProgressNote = {
        stage: newStatus,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        note: note || `Phase advanced to ${newStatus.toUpperCase()}`,
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
      description: orderData.description || 'Bespoke custom African attire.',
      garment_type: orderData.garment_type || '3-Piece Grand Royal Agbada Set',
      fabric_details: orderData.fabric_details || 'Selected African Fabric',
      estimated_delivery: orderData.estimated_delivery || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      deposit_amount: orderData.deposit_amount || 40000,
      balance_due: orderData.balance_due || 30000,
      currency: 'KES',
      photo_url: orderData.photo_url || 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&auto=format&fit=crop&q=80',
      progress_notes: [
        {
          stage: 'cutting',
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
          note: 'New African commission drafted on cutting table.',
          author: currentUser?.full_name || 'Wanjiku Kamau'
        }
      ],
      created_at: new Date().toISOString().slice(0, 10)
    };

    setOrders(prev => [newOrder, ...prev]);
    showToast(`Commission #${newId} logged for ${client.full_name}!`);
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
    showToast('African measurement card updated successfully!');
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
    showToast('Ceremonial fitting request booked! Atelier will confirm shortly.');
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
    showToast('Thank you! Your ceremonial review was submitted to Director Wanjiku.');
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
    showToast(`Published "${itemData.title}" to public lookbook!`);
  };

  const resetToDefaults = () => {
    clearStitchFlowStorage();
    setOrders(INITIAL_ORDERS);
    setMeasurements(INITIAL_MEASUREMENTS);
    setAppointments(INITIAL_APPOINTMENTS);
    setFeedbacks(INITIAL_FEEDBACK);
    setLookbook(INITIAL_LOOKBOOK);
    setCurrentUser(null);
    setCurrentRoleState('visitor');
    setThemeModeState('system');
    setCurrencyState('KES');
    setSettings(DEFAULT_SETTINGS);
    showToast('Reset data to initial African couture showcase!');
  };

  return (
    <StitchFlowContext.Provider value={{
      currentRole,
      setCurrentRole,
      themeMode,
      setThemeMode,
      isDarkMode,
      settings,
      updateSettings,
      settingsModalOpen,
      setSettingsModalOpen,
      currentUser,
      loginAsUser,
      logout,
      hasPermission,
      authModalOpen,
      setAuthModalOpen,
      authTargetRole,
      setAuthTargetRole,
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
