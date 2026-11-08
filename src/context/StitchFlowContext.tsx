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
  AtelierSettings,
  AtelierTenant
} from '../types';
import { 
  INITIAL_PROFILES, 
  INITIAL_ORDERS, 
  INITIAL_MEASUREMENTS, 
  INITIAL_APPOINTMENTS, 
  INITIAL_FEEDBACK, 
  INITIAL_LOOKBOOK 
} from '@/data/initialData';
import { PREDEFINED_TENANTS } from '@/data/demoTenants';
import { dataMode, supabase } from '../lib/supabase';
import {
  getAtelier,
  getAtelierBySlug,
  getCurrentMember,
  listAtelierMembers,
  loadAtelierSnapshot,
  loadPublicAtelierSnapshot,
  createAtelierForCurrentUser,
  createInvitation as createInvitationRepository,
  listInvitations as listInvitationsRepository,
  revokeInvitation as revokeInvitationRepository,
  acceptInvitation as acceptInvitationRepository,
  persistAppointment,
  persistAppointmentStatus,
  persistAtelierSettings,
  persistFeedback,
  persistFeedbackStatus,
  persistLookbookItem,
  persistMeasurement,
  persistOrder,
  persistOrderStatus,
  persistTailorAssignment,
  AtelierMember,
  Invitation,
} from '../lib/atelier-repository';

interface StitchFlowContextType {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  
  // Multi-Tenancy Architecture
  tenants: AtelierTenant[];
  currentAtelier: AtelierTenant;
  switchAtelier: (tenantId: string) => void;
  isSupabaseMode: boolean;

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
  signInWithPassword: (email: string, password: string) => Promise<void>;
  sendMagicLink: (email: string, redirectTo?: string) => Promise<void>;
  logout: () => void;
  isProductionMode: boolean;
  authLoading: boolean;
  authError: string | null;
  needsOnboarding: boolean;
  atelierNotFound: boolean;
  publicAtelierLoading: boolean;
  completeOnboarding: (input: { name: string; slug: string; tagline?: string; whatsappNumber?: string }) => Promise<void>;
  acceptInvitation: (code: string) => Promise<{ success: boolean; atelier_id?: string; role?: string; error?: string }>;
  invitations: Invitation[];
  refreshInvitations: () => Promise<void>;
  refreshAtelier: () => Promise<void>;
  inviteMember: (input: { email: string; role: 'employee' | 'client'; sendEmail: boolean }) => Promise<Invitation>;
  revokeInvitation: (id: string) => Promise<void>;
  invitationLink: (code: string) => string;
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
  currency: 'KES' | 'NGN' | 'USD';
  setCurrency: (c: 'KES' | 'NGN' | 'USD') => void;
  formatCurrency: (amount: number, currency?: 'KES' | 'NGN' | 'USD') => string;
  
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

/**
 * Production never inherits a demo tenant. The real atelier is resolved from
 * the URL slug for anonymous visitors, or from the authenticated member row.
 */
const EMPTY_ATELIER: AtelierTenant = {
  id: '',
  name: 'StitchFlow Atelier',
  slug: '',
  tagline: 'Bespoke Pan-African tailoring & ceremonial regalia',
  city: '',
  country: '',
  currency: 'KES',
  phone: '',
  whatsapp: '',
  default_unit: 'in',
};

const readAtelierSlugFromPath = (): string | null => {
  const match = window.location.pathname.match(/^\/atelier\/([a-z0-9-]+)\/?$/i);
  return match ? match[1].toLowerCase() : null;
};

export const StitchFlowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Multi-Tenancy Architecture
  const [tenants] = useState<AtelierTenant[]>(dataMode === 'supabase' ? [] : PREDEFINED_TENANTS);
  const [currentAtelier, setCurrentAtelier] = useState<AtelierTenant>(() => {
    if (dataMode === 'supabase') return EMPTY_ATELIER;
    const saved = localStorage.getItem('stitchflow_active_tenant');
    if (saved) {
      const match = PREDEFINED_TENANTS.find(t => t.id === saved);
      if (match) return match;
    }
    return PREDEFINED_TENANTS[0];
  });
  const [atelierNotFound, setAtelierNotFound] = useState(false);
  const [publicAtelierLoading, setPublicAtelierLoading] = useState(
    dataMode === 'supabase' && Boolean(readAtelierSlugFromPath())
  );

  const switchAtelier = (tenantId: string) => {
    if (isProductionMode) {
      showToast('Atelier switching is disabled in production. Your tenant comes from your account.');
      return;
    }
    const target = PREDEFINED_TENANTS.find(t => t.id === tenantId);
    if (target) {
      setCurrentAtelier(target);
      localStorage.setItem('stitchflow_active_tenant', target.id);
      showToast(`Switched active atelier to ${target.name} (${target.city})`);
    }
  };

  // Theme & Appearance State
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const saved = readStorageString('theme', 'system');
    const validTheme: ThemeMode = saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
    if (saved !== validTheme) writeStorage('theme', validTheme);
    return validTheme;
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
    return dataMode === 'supabase' ? null : readStorage<Profile | null>('current_user', null);
  });
  const [authLoading, setAuthLoading] = useState(dataMode === 'supabase');
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeAtelierId, setActiveAtelierId] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTargetRole, setAuthTargetRole] = useState<UserRole | null>(null);

  const [currentRole, setCurrentRoleState] = useState<UserRole>(() => {
    if (dataMode === 'supabase') return 'visitor';
    const saved = readStorageString('role', 'visitor');
    const validRole: UserRole = saved === 'owner' || saved === 'employee' || saved === 'client' || saved === 'visitor' ? saved : 'visitor';
    if (saved !== validRole) writeStorage('role', validRole);
    return validRole;
  });

  const [currency, setCurrencyState] = useState<'KES' | 'NGN' | 'USD'>(settings.currency || 'KES');

  const [activeTailorId, setActiveTailorIdState] = useState<string>(() => {
    return readStorageString('tailor', 'usr_tailor_01');
  });

  const [activeClientId, setActiveClientIdState] = useState<string>(() => {
    return readStorageString('client', 'usr_client_01');
  });

  const [profiles, setProfiles] = useState<Profile[]>(() => {
    return dataMode === 'supabase' ? [] : readStorage<Profile[]>('profiles', INITIAL_PROFILES);
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    return dataMode === 'supabase' ? [] : readStorage<Order[]>('orders', INITIAL_ORDERS);
  });

  const [measurements, setMeasurements] = useState<Measurement[]>(() => {
    return dataMode === 'supabase' ? [] : readStorage<Measurement[]>('measurements', INITIAL_MEASUREMENTS);
  });

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    return dataMode === 'supabase' ? [] : readStorage<Appointment[]>('appointments', INITIAL_APPOINTMENTS);
  });

  const [feedbacks, setFeedbacks] = useState<Feedback[]>(() => {
    return dataMode === 'supabase' ? [] : readStorage<Feedback[]>('feedback', INITIAL_FEEDBACK);
  });

  const [lookbook, setLookbook] = useState<LookbookItem[]>(() => {
    if (dataMode === 'supabase') return [];
    const saved = readStorage<LookbookItem[]>('lookbook', INITIAL_LOOKBOOK);
    const matchesCurrentCatalog = saved.length === INITIAL_LOOKBOOK.length && saved.every((item, index) => (
      item.id === INITIAL_LOOKBOOK[index].id &&
      item.title === INITIAL_LOOKBOOK[index].title &&
      item.image_url === INITIAL_LOOKBOOK[index].image_url
    ));
    if (matchesCurrentCatalog) return saved;
    writeStorage('lookbook', INITIAL_LOOKBOOK);
    return INITIAL_LOOKBOOK;
  });

  // UI states
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [selectedTrackOrderId, setSelectedTrackOrderId] = useState<string | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedLookbookForBooking, setSelectedLookbookForBooking] = useState<LookbookItem | null>(null);

  const isProductionMode = dataMode === 'supabase';
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  const memberToProfile = (member: AtelierMember): Profile => ({
    id: member.id,
    role: member.role,
    full_name: member.full_name,
    phone: member.phone || '',
    email: member.email || '',
    avatar_url: member.avatar_url || '',
    title: member.title || undefined,
    specialty: member.specialty || undefined,
  });

  const applyAuthenticatedMember = async () => {
    const member = await getCurrentMember();
    if (!member) {
      setCurrentUser(null);
      setCurrentRoleState('visitor');
      setProfiles([]);
      setInvitations([]);
      setNeedsOnboarding(isProductionMode);
      setPublicAtelierLoading(false);
      return;
    }
    setNeedsOnboarding(false);
    setAtelierNotFound(false);
    setPublicAtelierLoading(false);

    const atelierMembers = await listAtelierMembers(member.atelier_id);
    const mappedProfiles = atelierMembers.map(memberToProfile);
    const profile = memberToProfile(member);
    const snapshot = await loadAtelierSnapshot(member.atelier_id);
    const atelier = await getAtelier(member.atelier_id);
    if (atelier) {
      setCurrentAtelier(prev => ({
        ...prev,
        id: atelier.id,
        name: atelier.name,
        slug: atelier.slug,
        tagline: atelier.tagline ?? prev.tagline,
        currency: atelier.default_currency,
        whatsapp: atelier.whatsapp_number ?? prev.whatsapp,
        default_unit: atelier.default_unit,
      }));
      setSettings(prev => ({
        ...prev,
        atelier_id: atelier.id,
        atelier_name: atelier.name,
        studio_tagline: atelier.tagline ?? prev.studio_tagline,
        whatsapp_number: atelier.whatsapp_number ?? prev.whatsapp_number,
        currency: atelier.default_currency,
        default_unit: atelier.default_unit,
      }));
      setCurrencyState(atelier.default_currency);
    }
    if (member.role === 'owner') {
      const pending = await listInvitationsRepository(member.atelier_id);
      setInvitations(pending);
    } else {
      setInvitations([]);
    }
    setActiveAtelierId(member.atelier_id);
    setProfiles(mappedProfiles);
    setCurrentUser(profile);
    setOrders(snapshot.orders);
    setMeasurements(snapshot.measurements);
    setAppointments(snapshot.appointments);
    setFeedbacks(snapshot.feedbacks);
    setLookbook(snapshot.lookbook);
    setActiveTailorIdState(member.role === 'employee' ? member.id : mappedProfiles.find(p => p.role === 'employee')?.id || '');
    setActiveClientIdState(member.role === 'client' ? member.id : mappedProfiles.find(p => p.role === 'client')?.id || '');
    setCurrentRoleState(member.role);
  };

  const acceptInvitation = async (code: string) => {
    const result = await acceptInvitationRepository(code);
    if (result.error) throw new Error(result.error);
    setNeedsOnboarding(false);
    setAtelierNotFound(false);
    await applyAuthenticatedMember();
    if (result.atelier_id) showToast('Invitation accepted. Welcome to the atelier.');
    return result;
  };

  const invitationLink = (code: string) =>
    new URL(`/?invite=${encodeURIComponent(code)}`, window.location.origin).toString();

  const refreshInvitations = async () => {
    if (!isProductionMode || !activeAtelierId) {
      setInvitations([]);
      return;
    }
    setInvitations(await listInvitationsRepository(activeAtelierId));
  };

  const refreshAtelier = async () => {
    if (!isProductionMode || !currentUser) return;
    await applyAuthenticatedMember();
  };

  const inviteMember = async (input: { email: string; role: 'employee' | 'client'; sendEmail: boolean }) => {
    if (!isProductionMode || !activeAtelierId) {
      throw new Error('Invitations are available only for a live atelier.');
    }
    if (!currentUser || currentUser.role !== 'owner') {
      throw new Error('Only the atelier owner can invite members.');
    }
    const invitation = await createInvitationRepository({
      atelierId: activeAtelierId,
      email: input.email,
      role: input.role,
      invitedBy: currentUser.id,
    });
    setInvitations(prev => [invitation, ...prev]);

    if (input.sendEmail) {
      try {
        await sendMagicLink(invitation.email, invitationLink(invitation.invitation_code));
        showToast(`Invitation emailed to ${invitation.email}.`);
      } catch {
        showToast('Invitation saved, but the email could not be sent. Share the link or code manually.');
      }
    }
    return invitation;
  };

  const revokeInvitation = async (id: string) => {
    await revokeInvitationRepository(id);
    setInvitations(prev => prev.filter(invitation => invitation.id !== id));
    showToast('Invitation revoked.');
  };

  const completeOnboarding = async (input: { name: string; slug: string; tagline?: string; whatsappNumber?: string }) => {
    const atelierId = await createAtelierForCurrentUser(input);
    setNeedsOnboarding(false);
    await applyAuthenticatedMember();
    if (atelierId) {
      showToast('Atelier created. Welcome to StitchFlow.');
    }
  };

  useEffect(() => {
    if (!isProductionMode || !supabase) return;

    const client = supabase;
    let mounted = true;
    const syncSession = async () => {
      setAuthLoading(true);
      setAuthError(null);
      try {
        const { data: { session } } = await client.auth.getSession();
        if (mounted && session) await applyAuthenticatedMember();
      } catch (error) {
        if (mounted) setAuthError(error instanceof Error ? error.message : 'Unable to restore atelier session.');
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };

    void syncSession();
    const { data: { subscription } } = client.auth.onAuthStateChange(() => {
      void syncSession();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [isProductionMode]);

  // Public surface: in production an anonymous visitor must see the real
  // published lookbook for the atelier named in the URL path. There is no
  // demo-tenant fallback: an unknown or missing slug resolves to nothing.
  useEffect(() => {
    if (!isProductionMode || !supabase || currentUser) return;

    let mounted = true;
    const loadPublic = async () => {
      const slug = readAtelierSlugFromPath();
      if (!slug) {
        if (mounted) {
          setAtelierNotFound(false);
          setLookbook([]);
          setPublicAtelierLoading(false);
        }
        return;
      }

      try {
        const atelier = await getAtelierBySlug(slug);
        if (!mounted) return;
        if (!atelier) {
          setAtelierNotFound(true);
          setLookbook([]);
          setPublicAtelierLoading(false);
          return;
        }

        setAtelierNotFound(false);
        setCurrentAtelier(prev => ({
          ...prev,
          id: atelier.id,
          name: atelier.name,
          slug: atelier.slug,
          tagline: atelier.tagline ?? prev.tagline,
          currency: atelier.default_currency,
          whatsapp: atelier.whatsapp_number ?? prev.whatsapp,
          default_unit: atelier.default_unit,
        }));
        setSettings(prev => ({
          ...prev,
          atelier_id: atelier.id,
          atelier_name: atelier.name,
          studio_tagline: atelier.tagline ?? prev.studio_tagline,
          whatsapp_number: atelier.whatsapp_number ?? prev.whatsapp_number,
          currency: atelier.default_currency,
          default_unit: atelier.default_unit,
        }));
        setCurrencyState(atelier.default_currency);

        const snapshot = await loadPublicAtelierSnapshot(atelier.id);
        if (mounted) {
          setLookbook(snapshot.lookbook);
          setPublicAtelierLoading(false);
        }
      } catch (error) {
        if (mounted) {
          setAuthError(error instanceof Error ? error.message : 'Unable to load the public lookbook.');
          setPublicAtelierLoading(false);
        }
      }
    };

    void loadPublic();
    return () => {
      mounted = false;
    };
  }, [isProductionMode, currentUser]);

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
    if (isProductionMode) return;
    writeStorage('role', currentRole);
  }, [currentRole, isProductionMode]);

  useEffect(() => {
    if (isProductionMode) return;
    writeStorage('current_user', currentUser);
  }, [currentUser, isProductionMode]);

  useEffect(() => {
    if (isProductionMode) return;
    writeStorage('settings', settings);
  }, [settings, isProductionMode]);

  useEffect(() => {
    if (isProductionMode) return;
    writeStorage('tailor', activeTailorId);
  }, [activeTailorId, isProductionMode]);

  useEffect(() => {
    if (isProductionMode) return;
    writeStorage('client', activeClientId);
  }, [activeClientId, isProductionMode]);

  useEffect(() => {
    if (isProductionMode) return;
    writeStorage('orders', orders);
  }, [orders, isProductionMode]);

  useEffect(() => {
    if (isProductionMode) return;
    writeStorage('measurements', measurements);
  }, [measurements, isProductionMode]);

  useEffect(() => {
    if (isProductionMode) return;
    writeStorage('appointments', appointments);
  }, [appointments, isProductionMode]);

  useEffect(() => {
    if (isProductionMode) return;
    writeStorage('feedback', feedbacks);
  }, [feedbacks, isProductionMode]);

  useEffect(() => {
    if (isProductionMode) return;
    writeStorage('lookbook', lookbook);
  }, [lookbook, isProductionMode]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 4000);
  };

  /**
   * Run a Supabase write and only report success when the database accepted it.
   * On failure the caller is told, and the authenticated snapshot is reloaded so
   * local state cannot silently diverge from the server.
   */
  const saveOrToast = async (work: Promise<void>, successMessage: string) => {
    try {
      await work;
      showToast(successMessage);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown error';
      showToast(`Unable to save: ${detail}`);
      try {
        await applyAuthenticatedMember();
      } catch {
        // Keep the last known state; the failure is already surfaced.
      }
    }
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
    const merged: AtelierSettings = { ...settings, ...newSettings };
    setSettings(merged);
    if (newSettings.currency) {
      setCurrencyState(newSettings.currency);
    }
    if (newSettings.theme_mode) {
      setThemeModeState(newSettings.theme_mode);
    }

    const touchesAtelier =
      newSettings.atelier_name !== undefined ||
      newSettings.studio_tagline !== undefined ||
      newSettings.whatsapp_number !== undefined ||
      newSettings.currency !== undefined ||
      newSettings.default_unit !== undefined;

    if (isProductionMode && touchesAtelier) {
      if (!activeAtelierId) {
        showToast('No atelier is resolved for this session. Settings were not saved.');
        return;
      }
      void saveOrToast(persistAtelierSettings(activeAtelierId, merged), 'Atelier settings saved to the server.');
    } else if (!isProductionMode) {
      showToast('Atelier settings updated successfully!');
    }
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
    // Fail closed: demo role selection must never authenticate a production
    // build. Production identity comes only from Supabase Auth + members RLS.
    if (isProductionMode) {
      setAuthError('Demo role sign-in is disabled in production. Sign in with your atelier account.');
      showToast('Demo access is disabled in production. Sign in with your atelier account.');
      return;
    }
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

  const signInWithPassword = async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase production mode is not configured.');
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  const sendMagicLink = async (email: string, redirectTo?: string) => {
    if (!supabase) throw new Error('Supabase production mode is not configured.');
    setAuthError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo ?? window.location.origin },
    });
    if (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  const logout = () => {
    if (isProductionMode && supabase) void supabase.auth.signOut();
    setCurrentUser(null);
    setProfiles([]);
    setCurrentRoleState('visitor');
    setInvitations([]);
    setActiveAtelierId(null);
    if (isProductionMode) {
      setCurrentAtelier(EMPTY_ATELIER);
      setNeedsOnboarding(false);
    }
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

  const setCurrency = (c: 'KES' | 'NGN' | 'USD') => {
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

  const formatCurrency = (amount: number, amountCurrency: 'KES' | 'NGN' | 'USD' = currency): string => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: amountCurrency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const updateOrderStatus = (orderId: string, newStatus: ProductionStatus, note?: string) => {
    const authorName = currentUser?.full_name || (currentRole === 'owner' ? 'Atelier Owner' : 'Master Artisan');

    if (isProductionMode && !activeAtelierId) {
      showToast('No atelier is resolved for this session. Order status was not saved.');
      return;
    }

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

    if (isProductionMode) {
      if (activeAtelierId) {
        void saveOrToast(
          persistOrderStatus(activeAtelierId, orderId, newStatus, note, currentUser?.id ?? null),
          `Order ${orderId} moved to ${newStatus.toUpperCase()}`
        );
      }
    } else {
      showToast(`Order ${orderId} moved to ${newStatus.toUpperCase()}`);
    }
  };

  const addOrder = (orderData: Partial<Order>): Order => {
    const newId = `ORD-${Math.floor(895 + Math.random() * 100)}`;
    const client = profiles.find(p => p.id === orderData.client_id) || profiles.find(p => p.role === 'client');
    if (!client) {
      showToast('Invite and confirm a patron before logging a commission.');
      throw new Error('client_required');
    }
    if (isProductionMode && !activeAtelierId) {
      showToast('No atelier is resolved for this session. The commission was not saved.');
      throw new Error('atelier_not_resolved');
    }
    const tailor = profiles.find(p => p.id === orderData.assigned_tailor_id) || profiles.find(p => p.role === 'employee') || null;

    const newOrder: Order = {
      id: newId,
      client_id: client.id,
      client_name: client.full_name,
      client_phone: client.phone,
      assigned_tailor_id: tailor?.id ?? '',
      assigned_tailor_name: tailor?.full_name ?? 'Unassigned',
      status: (orderData.status as ProductionStatus) || 'cutting',
      description: orderData.description || 'Bespoke custom African attire.',
      garment_type: orderData.garment_type || '3-Piece Grand Royal Agbada Set',
      fabric_details: orderData.fabric_details || 'Selected African Fabric',
      estimated_delivery: orderData.estimated_delivery || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      deposit_amount: orderData.deposit_amount || 40000,
      balance_due: orderData.balance_due || 30000,
      currency: orderData.currency ?? currency,
      photo_url: orderData.photo_url || 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&auto=format&fit=crop&q=80',
      progress_notes: [
        {
          stage: 'cutting',
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
          note: 'New African commission drafted on cutting table.',
          author: currentUser?.full_name || 'Atelier Owner'
        }
      ],
      created_at: new Date().toISOString().slice(0, 10)
    };

    setOrders(prev => [newOrder, ...prev]);
    if (isProductionMode && activeAtelierId) {
      void saveOrToast(
        persistOrder(activeAtelierId, newOrder),
        `Commission #${newId} logged for ${client.full_name}!`
      );
    } else {
      showToast(`Commission #${newId} logged for ${client.full_name}!`);
    }
    return newOrder;
  };

  const assignTailorToOrder = (orderId: string, tailorId: string) => {
    const tailor = profiles.find(p => p.id === tailorId);
    if (!tailor) return;

    if (isProductionMode && !activeAtelierId) {
      showToast('No atelier is resolved for this session. Assignment was not saved.');
      return;
    }

    setOrders(prev => prev.map(order => {
      if (order.id !== orderId) return order;
      return {
        ...order,
        assigned_tailor_id: tailor.id,
        assigned_tailor_name: tailor.full_name
      };
    }));

    if (isProductionMode) {
      if (activeAtelierId) {
        void saveOrToast(
          persistTailorAssignment(activeAtelierId, orderId, tailorId),
          `Order ${orderId} reassigned to ${tailor.full_name}`
        );
      }
    } else {
      showToast(`Order ${orderId} reassigned to ${tailor.full_name}`);
    }
  };

  const updateMeasurement = (newMeas: Measurement) => {
    if (isProductionMode && !activeAtelierId) {
      showToast('No atelier is resolved for this session. The measurement was not saved.');
      return;
    }
    setMeasurements(prev => {
      const exists = prev.some(m => m.client_id === newMeas.client_id);
      if (exists) {
        return prev.map(m => m.client_id === newMeas.client_id ? { ...newMeas, updated_at: new Date().toISOString().slice(0, 10) } : m);
      }
      return [...prev, { ...newMeas, updated_at: new Date().toISOString().slice(0, 10) }];
    });
    if (isProductionMode && activeAtelierId) {
      void saveOrToast(
        persistMeasurement(activeAtelierId, newMeas),
        'African measurement card saved to the server.'
      );
    } else {
      showToast('African measurement card updated successfully!');
    }
  };

  const getMeasurementForClient = (clientId: string) => {
    return measurements.find(m => m.client_id === clientId);
  };

  const bookAppointment = (aptData: Omit<Appointment, 'id' | 'status'>): Appointment => {
    if (isProductionMode && !activeAtelierId && !currentAtelier.id) {
      showToast('This atelier is not published yet. Booking is unavailable.');
      throw new Error('atelier_not_resolved');
    }

    const newId = isProductionMode ? crypto.randomUUID() : `apt_${Date.now()}`;
    const newAppointment: Appointment = {
      ...aptData,
      id: newId,
      status: 'pending'
    };

    setAppointments(prev => [newAppointment, ...prev]);
    if (isProductionMode) {
      // Anonymous visitors have no active member, so the public atelier is the
      // target. The RLS policy accepts only a pending request with no account.
      const atelierId = activeAtelierId ?? currentAtelier.id;
      void saveOrToast(
        persistAppointment(atelierId, newAppointment),
        'Ceremonial fitting request sent to the atelier.'
      );
    } else {
      showToast('Ceremonial fitting request booked! Atelier will confirm shortly.');
    }
    return newAppointment;
  };

  const updateAppointmentStatus = (id: string, status: AppointmentStatus) => {
    if (isProductionMode && status === 'confirmed') {
      showToast('Confirm this request through the protected booking workspace so a resource slot is reserved.');
      return;
    }
    if (isProductionMode && !activeAtelierId) {
      showToast('No atelier is resolved for this session. The fitting status was not saved.');
      return;
    }
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    if (isProductionMode && activeAtelierId) {
      void saveOrToast(
        persistAppointmentStatus(activeAtelierId, id, status),
        `Appointment status updated to ${status}`
      );
    } else {
      showToast(`Appointment status updated to ${status}`);
    }
  };

  const submitFeedback = (fbData: Omit<Feedback, 'id' | 'created_at' | 'resolution_status'>) => {
    if (isProductionMode && !activeAtelierId) {
      showToast('No atelier is resolved for this session. Your review was not saved.');
      throw new Error('atelier_not_resolved');
    }
    const newFeedback: Feedback = {
      ...fbData,
      id: `fbk_${Date.now()}`,
      resolution_status: 'open',
      created_at: new Date().toISOString().slice(0, 10)
    };

    setFeedbacks(prev => [newFeedback, ...prev]);
    if (isProductionMode && activeAtelierId) {
      void saveOrToast(
        persistFeedback(activeAtelierId, fbData),
        'Thank you! Your ceremonial review was submitted to the atelier.'
      );
    } else {
      showToast('Thank you! Your ceremonial review was submitted to the atelier director.');
    }
  };

  const updateFeedbackStatus = (id: string, status: 'open' | 'addressed' | 'resolved') => {
    setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, resolution_status: status } : f));
    if (isProductionMode) {
      void saveOrToast(persistFeedbackStatus(id, status), `Feedback marked as ${status}`);
    } else {
      showToast(`Feedback marked as ${status}`);
    }
  };

  const addLookbookItem = (itemData: Omit<LookbookItem, 'id'>) => {
    if (isProductionMode && !activeAtelierId) {
      showToast('No atelier is resolved for this session. The lookbook item was not published.');
      throw new Error('atelier_not_resolved');
    }
    const newItem: LookbookItem = {
      ...itemData,
      id: `LKB-${Date.now().toString().slice(-4)}`
    };
    setLookbook(prev => [newItem, ...prev]);
    if (isProductionMode && activeAtelierId) {
      void saveOrToast(
        persistLookbookItem(activeAtelierId, itemData),
        `Published "${itemData.title}" to the public lookbook.`
      );
    } else {
      showToast(`Published "${itemData.title}" to public lookbook!`);
    }
  };

  const resetToDefaults = () => {
    if (isProductionMode) {
      showToast('Reset is a demo-only action and is disabled against a live atelier.');
      return;
    }
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
      tenants,
      currentAtelier,
      switchAtelier,
      isSupabaseMode: dataMode === 'supabase',
      themeMode,
      setThemeMode,
      isDarkMode,
      settings,
      updateSettings,
      settingsModalOpen,
      setSettingsModalOpen,
      currentUser,
      loginAsUser,
      signInWithPassword,
      sendMagicLink,
      logout,
      isProductionMode,
      authLoading,
      authError,
      needsOnboarding,
      atelierNotFound,
      publicAtelierLoading,
      completeOnboarding,
      acceptInvitation,
      invitations,
      refreshInvitations,
      refreshAtelier,
      inviteMember,
      revokeInvitation,
      invitationLink,
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
