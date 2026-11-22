import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import {
  fetchAdminSalons,
  updateAdminSalon,
  createAdminSalon,
  deleteAdminSalon,
  bulkUpdateSalons,
  fetchAdminDashboardMetrics,
  getStoredAdmin,
  refreshStoredAdmin,
  logoutAdmin,
  checkAdminBootstrapStatus,
} from '../../services/supabaseApi';
import { subscribeAdminRealtimeHub } from '../../services/realtimeHub';
import { registerAdminWebPush, unregisterAdminWebPush } from '../../services/webPushClient';
import {
  AdminSalonItem,
  AdminDashboardMetrics,
  AdminScreenId,
  SystemAdminUser,
  AdminAuthTab,
} from '../../types/admin';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { AdminHomeScreen } from './AdminHomeScreen';
import { AdminSalonsList } from './AdminSalonsList';
import { AdminEditSalonModal } from './AdminEditSalonModal';
import { TriadeEstablishmentModal } from './triade-forms/TriadeEstablishmentModal';
import { AdminAppointmentsMonitor } from './AdminAppointmentsMonitor';
import { AdminUsersManager } from './AdminUsersManager';
import { AdminSettingsPanel } from './AdminSettingsPanel';
import { AdminPreferencesPanel } from './AdminPreferencesPanel';
import { AdminAuthModal } from './AdminAuthModal';
import { AdminCreateAdminModal } from './AdminCreateAdminModal';
import { AdminPortalManager } from './AdminPortalManager';
import { AdminCategoryModal } from './AdminCategoryModal';

interface AdminMasterAppProps {
  onOpenGateway?: () => void;
}

export const AdminMasterApp: React.FC<AdminMasterAppProps> = ({ onOpenGateway }) => {
  const [currentScreen, setCurrentScreen] = useState<AdminScreenId>(() => {
    if (typeof window !== 'undefined') {
      const screenParam = new URLSearchParams(window.location.search).get('screen') as AdminScreenId | null;
      const valid: AdminScreenId[] = ['dashboard', 'users', 'salons', 'portal', 'appointments', 'settings', 'preferences', 'forms'];
      if (screenParam && valid.includes(screenParam)) return screenParam;
    }
    return 'dashboard';
  });
  const [salons, setSalons] = useState<AdminSalonItem[]>([]);
  const [metrics, setMetrics] = useState<AdminDashboardMetrics>({
    totalSalons: 0,
    activeSalons: 0,
    pendingSalons: 0,
    incompleteSalons: 0,
    suspendedSalons: 0,
    todayAppointments: 0,
    activeFlashOffers: 0,
    growthPercent: 18.5,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const [adminUser, setAdminUser] = useState<SystemAdminUser | null>(() => getStoredAdmin());
  const [needsBootstrap, setNeedsBootstrap] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalInitialTab, setAuthModalInitialTab] = useState<AdminAuthTab>('login');
  const [isCreateAdminModalOpen, setIsCreateAdminModalOpen] = useState(false);

  const [selectedSalonToEdit, setSelectedSalonToEdit] = useState<AdminSalonItem | null>(null);
  const [selectedSalonForDetail, setSelectedSalonForDetail] = useState<AdminSalonItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const handleOpenSalonDetail = (salon: AdminSalonItem) => {
    setSelectedSalonForDetail(salon);
    setCurrentScreen('salons');
  };

  const loadData = async () => {
    setIsRefreshing(true);
    setRefreshNonce((prev) => prev + 1);
    try {
      const [fetchedSalons, fetchedMetrics, freshAdmin] = await Promise.all([
        fetchAdminSalons(),
        fetchAdminDashboardMetrics(),
        refreshStoredAdmin(),
      ]);
      setSalons(fetchedSalons);
      setMetrics(fetchedMetrics);
      if (freshAdmin) {
        setAdminUser(freshAdmin);
      }
    } catch (err) {
      console.warn('[Admin Master] Erro ao carregar dados:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {

    const checkActiveSession = async () => {
      try {
        const bootstrapStatus = await checkAdminBootstrapStatus();
        if (bootstrapStatus.needsBootstrap) {
          setNeedsBootstrap(true);
          setAdminUser(null);
          return;
        }
        setNeedsBootstrap(false);

        const stored = getStoredAdmin();
        if (stored && stored.id) {
          setAdminUser(stored);
          loadData();
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            registerAdminWebPush(stored.role || 'super_admin', stored.id).catch(() => {});
          }
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setAdminUser(null);
          return;
        }

        const { data: sysAdmin, error: sysAdminErr } = await supabase
          .from('system_admins')
          .select('id, user_id, full_name, username, email, phone_whatsapp, role, is_active, avatar_url')
          .eq('user_id', session.user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (sysAdminErr || !sysAdmin) {
          await supabase.auth.signOut();
          setAdminUser(null);
          return;
        }

        const verifiedAdmin: SystemAdminUser = {
          id: sysAdmin.id,
          full_name: sysAdmin.full_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Administrador Master',
          username: sysAdmin.username || session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'admin',
          email: sysAdmin.email || session.user.email || '',
          phone_whatsapp: sysAdmin.phone_whatsapp || session.user.user_metadata?.phone || '',
          role: sysAdmin.role || 'super_admin',
          is_active: sysAdmin.is_active !== false,
          avatar_url: sysAdmin.avatar_url || session.user.user_metadata?.avatar_url || '',
        };
        setAdminUser(verifiedAdmin);
        loadData();
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          registerAdminWebPush(verifiedAdmin.role || 'super_admin', verifiedAdmin.id).catch(() => {});
        }
      } catch {
        const fallbackStored = getStoredAdmin();
        setAdminUser(fallbackStored || null);
      }
    };

    checkActiveSession();

    const handleResumeSync = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      loadData();
    };

    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CLICKED') {
        const url = String(event.data?.data?.url || '');
        if (url.includes('screen=users')) setCurrentScreen('users');
        else if (url.includes('screen=salons')) setCurrentScreen('salons');
        else if (url.includes('screen=appointments')) setCurrentScreen('appointments');
        loadData();
      }
    };

    document.addEventListener('visibilitychange', handleResumeSync);
    window.addEventListener('focus', handleResumeSync);
    window.addEventListener('online', handleResumeSync);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }

    const unsubscribeHub = subscribeAdminRealtimeHub({
      onSalonsChange: () => {
        fetchAdminSalons().then(setSalons).catch(() => {});
        fetchAdminDashboardMetrics().then(setMetrics).catch(() => {});
      },
      onAppointmentsChange: () => {
        fetchAdminDashboardMetrics().then(setMetrics).catch(() => {});
        setRefreshNonce((prev) => prev + 1);
      },
      onAdminChange: () => {
        refreshStoredAdmin().then((fresh) => {
          if (fresh) setAdminUser(fresh);
        }).catch(() => {});
      },
      onUsersChange: () => {
        setRefreshNonce((prev) => prev + 1);
      },
    });

    return () => {
      document.removeEventListener('visibilitychange', handleResumeSync);
      window.removeEventListener('focus', handleResumeSync);
      window.removeEventListener('online', handleResumeSync);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
      unsubscribeHub();
    };
  }, []);

  const handleEditSalon = (salon: AdminSalonItem) => {
    setSelectedSalonToEdit(salon);
    setIsEditModalOpen(true);
  };

  const handleSaveSalonUpdates = async (salonId: string, updates: Partial<AdminSalonItem>): Promise<boolean> => {
    const res = await updateAdminSalon(salonId, updates);
    if (res.success) {
      setSalons((prev) => prev.map((s) => (s.id === salonId ? { ...s, ...updates } : s)));
      setSelectedSalonForDetail((prev) => (prev && prev.id === salonId ? { ...prev, ...updates } : prev));
      fetchAdminDashboardMetrics().then(setMetrics);
      return true;
    }
    return false;
  };

  const handleCreateSalon = async (payload: Partial<AdminSalonItem>) => {
    const res = await createAdminSalon(payload);
    if (res.success && res.salon) {
      setSalons((prev) => [res.salon!, ...prev]);
      fetchAdminDashboardMetrics().then(setMetrics);
      return { success: true, salon: res.salon };
    }
    return { success: false, error: res.error || 'Erro ao cadastrar estabelecimento.' };
  };

  const handleUpdateStatus = async (salonId: string, status: AdminSalonItem['status']) => {
    const isVerified = status === 'active';
    await handleSaveSalonUpdates(salonId, { status, is_verified: isVerified });
  };

  const handleUpdateVerified = async (salonId: string, isVerified: boolean) => {
    await handleSaveSalonUpdates(salonId, { is_verified: isVerified });
  };

  const handleBulkUpdateStatus = async (ids: string[], status: AdminSalonItem['status']) => {
    const res = await bulkUpdateSalons(ids, 'update_status', status);
    if (res.success) {
      setSalons((prev) =>
        prev.map((s) => (ids.includes(s.id) ? { ...s, status, is_verified: status === 'active' } : s))
      );
      fetchAdminDashboardMetrics().then(setMetrics);
    }
  };

  const handleDeleteSalon = async (salonId: string) => {
    const res = await deleteAdminSalon(salonId);
    if (res.success) {
      setSalons((prev) => prev.filter((s) => s.id !== salonId));
      fetchAdminDashboardMetrics().then(setMetrics);
    }
  };

  const handleBulkDeleteSalons = async (ids: string[]) => {
    const res = await bulkUpdateSalons(ids, 'delete');
    if (res.success) {
      setSalons((prev) => prev.filter((s) => !ids.includes(s.id)));
      fetchAdminDashboardMetrics().then(setMetrics);
    }
  };

  const handleOpenAuthModal = (tab: AdminAuthTab = 'login') => {
    setAuthModalInitialTab(tab);
    setIsAuthModalOpen(true);
  };

  const handleLogout = async () => {
    await unregisterAdminWebPush();
    await logoutAdmin();
    setAdminUser(null);
  };

  const pendingCount = metrics.pendingSalons + metrics.incompleteSalons;

  if (!adminUser) {
    return (
      <div
        className="admvapp-shell flex h-screen w-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans overflow-hidden items-center justify-center transition-colors"
        style={{ backgroundColor: 'var(--admin-app-bg)' }}
      >
        <AdminAuthModal
          isOpen={true}
          isGate={true}
          needsBootstrap={needsBootstrap}
          initialTab={authModalInitialTab}
          onSuccess={(admin) => {
            setNeedsBootstrap(false);
            setAdminUser(admin);
            loadData();
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="admvapp-shell flex h-screen w-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans overflow-hidden transition-colors"
      style={{ backgroundColor: 'var(--admin-app-bg)' }}
    >

      <div className="shrink-0 h-full">
        <AdminSidebar
          currentScreen={currentScreen}
          onSelectScreen={setCurrentScreen}
          pendingCount={pendingCount}
          adminUser={adminUser}
          onOpenAuthModal={handleOpenAuthModal}
        />
      </div>

      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-slate-100/70 dark:bg-slate-950 transition-colors">

        <AdminHeader
          currentScreen={currentScreen}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onRefresh={loadData}
          isRefreshing={isRefreshing}
          adminUser={adminUser}
          onOpenAuthModal={handleOpenAuthModal}
          onLogout={handleLogout}
          onNavigateScreen={setCurrentScreen}
          onOpenGateway={onOpenGateway}
        />

        <main className="admvapp-main flex-1 flex flex-col min-h-0 overflow-hidden p-0 m-0 bg-slate-100/70 dark:bg-slate-950 transition-colors">

          {currentScreen === 'dashboard' && (
            <div className="flex-1 overflow-y-auto p-0 m-0 min-h-0 custom-scrollbar">
              <div className="p-4 lg:p-6 space-y-6">
                <AdminHomeScreen
                  metrics={metrics}
                  salons={salons}
                  onNavigateScreen={setCurrentScreen}
                  onOpenCreateSalon={() => setIsCreateModalOpen(true)}
                  onOpenCreateAdmin={() => setIsCreateAdminModalOpen(true)}
                  onOpenSalonDetail={handleOpenSalonDetail}
                />
              </div>
            </div>
          )}

          {currentScreen === 'portal' && (
            <AdminPortalManager
              salons={salons}
              onOpenNewSalon={() => setIsCreateModalOpen(true)}
              onEditSalon={handleEditSalon}
              onSelectSalonDetail={handleOpenSalonDetail}
              onUpdateStatus={handleUpdateStatus}
              onUpdateVerified={handleUpdateVerified}
              onDeleteSalon={handleDeleteSalon}
              onOpenCategoryModal={() => setIsCategoryModalOpen(true)}
            />
          )}

          {currentScreen === 'salons' && (
            <AdminSalonsList
              salons={salons}
              onEditSalon={handleEditSalon}
              onUpdateStatus={handleUpdateStatus}
              onBulkUpdateStatus={handleBulkUpdateStatus}
              onDeleteSalon={handleDeleteSalon}
              onBulkDeleteSalons={handleBulkDeleteSalons}
              onOpenNewSalon={() => setIsCreateModalOpen(true)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedSalonDetail={selectedSalonForDetail}
              onSelectSalonDetail={setSelectedSalonForDetail}
            />
          )}

          {currentScreen === 'users' && (
            <AdminUsersManager
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              refreshSignal={refreshNonce}
            />
          )}

          {currentScreen === 'appointments' && (
            <AdminAppointmentsMonitor refreshSignal={refreshNonce} />
          )}

          {currentScreen === 'settings' && (
            <AdminSettingsPanel
              onNavigateToPreferences={() => setCurrentScreen('preferences')}
            />
          )}

          {(currentScreen === 'preferences' || currentScreen === 'forms') && (
            <AdminPreferencesPanel />
          )}
        </main>
      </div>

      <AdminAuthModal
        isOpen={isAuthModalOpen}
        initialTab={authModalInitialTab}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(admin) => setAdminUser(admin)}
      />

      <AdminCreateAdminModal
        isOpen={isCreateAdminModalOpen}
        onClose={() => setIsCreateAdminModalOpen(false)}
        onSuccess={() => {}}
      />

      <AdminEditSalonModal
        isOpen={isEditModalOpen}
        salon={selectedSalonToEdit}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveSalonUpdates}
      />

      <TriadeEstablishmentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateSalon}
        onViewDetails={handleOpenSalonDetail}
        onSuccess={() => loadData()}
      />

      {isCategoryModalOpen && (
        <AdminCategoryModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
        />
      )}
    </div>
  );
};
