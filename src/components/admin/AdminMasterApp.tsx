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
} from '../../services/supabaseApi';
import {
  AdminSalonItem,
  AdminDashboardMetrics,
  AdminScreenId,
  SystemAdminUser,
  AdminAuthTab,
} from '../../types/admin';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { AdminKpiCards } from './AdminKpiCards';
import { AdminSalonsList } from './AdminSalonsList';
import { AdminModerationPanel } from './AdminModerationPanel';
import { AdminEditSalonModal } from './AdminEditSalonModal';
import { AdminCreateSalonModal } from './AdminCreateSalonModal';
import { AdminAppointmentsMonitor } from './AdminAppointmentsMonitor';
import { AdminUsersManager } from './AdminUsersManager';
import { AdminSettingsPanel } from './AdminSettingsPanel';
import { AdminAuthModal } from './AdminAuthModal';
import { AdminCreateAdminModal } from './AdminCreateAdminModal';
import { ArrowRight, Plus, UserPlus } from 'lucide-react';

export const AdminMasterApp: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AdminScreenId>('dashboard');
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

  // Admin User & Auth State
  const [adminUser, setAdminUser] = useState<SystemAdminUser | null>(() => getStoredAdmin());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalInitialTab, setAuthModalInitialTab] = useState<AdminAuthTab>('login');
  const [isCreateAdminModalOpen, setIsCreateAdminModalOpen] = useState(false);

  // Salon Modals
  const [selectedSalonToEdit, setSelectedSalonToEdit] = useState<AdminSalonItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const loadData = async () => {
    setIsRefreshing(true);
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
    loadData();

    // 📡 Sincronização em Tempo Real (Realtime) da Tríade:
    // Qualquer alteração de avatar enviada via celular ou portal atualiza o cabeçalho imediatamente!
    const channel = supabase
      .channel('admin-avatar-live-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'professionals' }, () => {
        refreshStoredAdmin().then((fresh) => {
          if (fresh) setAdminUser(fresh);
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => {
        refreshStoredAdmin().then((fresh) => {
          if (fresh) setAdminUser(fresh);
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_admins' }, () => {
        refreshStoredAdmin().then((fresh) => {
          if (fresh) setAdminUser(fresh);
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleEditSalon = (salon: AdminSalonItem) => {
    setSelectedSalonToEdit(salon);
    setIsEditModalOpen(true);
  };

  const handleSaveSalonUpdates = async (salonId: string, updates: Partial<AdminSalonItem>) => {
    const res = await updateAdminSalon(salonId, updates);
    if (res.success) {
      setSalons((prev) => prev.map((s) => (s.id === salonId ? { ...s, ...updates } : s)));
      fetchAdminDashboardMetrics().then(setMetrics);
    }
  };

  const handleCreateSalon = async (payload: Partial<AdminSalonItem>) => {
    const res = await createAdminSalon(payload);
    if (res.success && res.salon) {
      setSalons((prev) => [res.salon!, ...prev]);
      fetchAdminDashboardMetrics().then(setMetrics);
      return { success: true };
    }
    return { success: false, error: res.error || 'Erro ao cadastrar estabelecimento.' };
  };

  const handleUpdateStatus = async (salonId: string, status: AdminSalonItem['status']) => {
    const isVerified = status === 'active';
    await handleSaveSalonUpdates(salonId, { status, is_verified: isVerified });
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

  const handleLogout = () => {
    logoutAdmin();
    setAdminUser(null);
  };

  const pendingCount = metrics.pendingSalons + metrics.incompleteSalons;

  // 🔒 GATE DE ACESSO MASTER: Se não autenticado, bloqueia o sistema e exige Login/Cadastro
  if (!adminUser) {
    return (
      <div className="flex h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden items-center justify-center">
        <AdminAuthModal
          isOpen={true}
          isGate={true}
          initialTab={authModalInitialTab}
          onSuccess={(admin) => {
            setAdminUser(admin);
            loadData();
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* 1. Permanent Fixed Sidebar */}
      <div className="shrink-0 h-full">
        <AdminSidebar
          currentScreen={currentScreen}
          onSelectScreen={setCurrentScreen}
          pendingCount={pendingCount}
          adminUser={adminUser}
          onOpenAuthModal={handleOpenAuthModal}
        />
      </div>

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-slate-100/70 dark:bg-slate-950 transition-colors">
        {/* Header */}
        <AdminHeader
          currentScreen={currentScreen}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onRefresh={loadData}
          isRefreshing={isRefreshing}
          adminUser={adminUser}
          onOpenAuthModal={handleOpenAuthModal}
          onLogout={handleLogout}
        />

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
          {/* SCREEN: DASHBOARD */}
          {currentScreen === 'dashboard' && (
            <div className="space-y-6">
              <AdminKpiCards metrics={metrics} onNavigateScreen={setCurrentScreen} />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Moderation Fast Action */}
                <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs dark:shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                        Fila Rápida de Moderação
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {metrics.pendingSalons + metrics.incompleteSalons} salões aguardando liberação
                      </p>
                    </div>
                    <button
                      onClick={() => setCurrentScreen('salons')}
                      className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <span>Ver fila completa</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <AdminModerationPanel
                    salons={salons}
                    onEditSalon={handleEditSalon}
                    onUpdateStatus={handleUpdateStatus}
                    limit={3}
                  />
                </div>

                {/* Direct Actions & Quick Links */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 flex flex-col justify-between shadow-xs dark:shadow-md">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Ações Executivas</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Gestão imediata do cluster</p>

                    <div className="mt-4 space-y-2.5">
                      <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="w-full py-2.5 px-3 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95"
                      >
                        <Plus className="w-4 h-4 text-white" />
                        <span>Cadastrar Estabelecimento</span>
                      </button>

                      <button
                        onClick={() => setCurrentScreen('settings')}
                        className="w-full py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer border border-slate-200 dark:border-slate-700/60 shadow-xs dark:shadow-none"
                      >
                        <span>Painel de Configurações & Tríade</span>
                      </button>

                      <button
                        onClick={() => setIsCreateAdminModalOpen(true)}
                        className="w-full py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer border border-slate-200 dark:border-slate-700/60 shadow-xs dark:shadow-none"
                      >
                        <UserPlus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Cadastrar Novo Administrador</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                    <strong className="text-slate-900 dark:text-white block mb-1">Status do Cluster Supabase</strong>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Bypass RLS Soberano • 100% Operacional</span>
                  </div>
                </div>
              </div>

              {/* Salons Table Quick Preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">Todos os Estabelecimentos Cadastrados</h2>
                  <button
                    onClick={() => setCurrentScreen('salons')}
                    className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                  >
                    Gerenciar todos ({salons.length})
                  </button>
                </div>
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
                />
              </div>
            </div>
          )}

          {/* SCREEN: SALONS */}
          {currentScreen === 'salons' && (
            <div className="space-y-4">
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
              />
            </div>
          )}

          {/* SCREEN: USERS CRUD */}
          {currentScreen === 'users' && <AdminUsersManager />}

          {/* SCREEN: APPOINTMENTS */}
          {currentScreen === 'appointments' && <AdminAppointmentsMonitor />}

          {/* SCREEN: SETTINGS (Includes Tríade Governance inside) */}
          {currentScreen === 'settings' && <AdminSettingsPanel />}
        </main>
      </div>

      {/* Admin Auth Modal (Acesso, Recuperar) */}
      <AdminAuthModal
        isOpen={isAuthModalOpen}
        initialTab={authModalInitialTab}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(admin) => setAdminUser(admin)}
      />

      {/* Dedicated Create Admin Modal (Only for Authenticated Admins) */}
      <AdminCreateAdminModal
        isOpen={isCreateAdminModalOpen}
        onClose={() => setIsCreateAdminModalOpen(false)}
        onSuccess={() => {}}
      />

      {/* Edit Salon Modal */}
      <AdminEditSalonModal
        isOpen={isEditModalOpen}
        salon={selectedSalonToEdit}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveSalonUpdates}
      />

      {/* Create Salon Modal */}
      <AdminCreateSalonModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateSalon}
      />
    </div>
  );
};
