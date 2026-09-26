import React, { useState, useEffect } from 'react';
import {
  fetchAdminSalons,
  updateAdminSalon,
  createAdminSalon,
  bulkUpdateSalons,
  fetchAdminDashboardMetrics,
  getStoredAdmin,
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
import { AdminTriadeGovernance } from './AdminTriadeGovernance';
import { AdminAppointmentsMonitor } from './AdminAppointmentsMonitor';
import { AdminSettingsPanel } from './AdminSettingsPanel';
import { AdminAuthModal } from './AdminAuthModal';
import { ArrowRight, Plus } from 'lucide-react';

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

  // Salon Modals
  const [selectedSalonToEdit, setSelectedSalonToEdit] = useState<AdminSalonItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const [fetchedSalons, fetchedMetrics] = await Promise.all([
        fetchAdminSalons(),
        fetchAdminDashboardMetrics(),
      ]);
      setSalons(fetchedSalons);
      setMetrics(fetchedMetrics);
    } catch (err) {
      console.warn('[Admin Master] Erro ao carregar dados:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
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
    }
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

  const handleOpenAuthModal = (tab: AdminAuthTab = 'login') => {
    setAuthModalInitialTab(tab);
    setIsAuthModalOpen(true);
  };

  const handleLogout = () => {
    logoutAdmin();
    setAdminUser(null);
  };

  const pendingCount = metrics.pendingSalons + metrics.incompleteSalons;

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
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-slate-950">
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
                <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-white tracking-tight">
                        Fila Rápida de Moderação
                      </h2>
                      <p className="text-xs text-slate-400">
                        {metrics.pendingSalons + metrics.incompleteSalons} salões aguardando liberação
                      </p>
                    </div>
                    <button
                      onClick={() => setCurrentScreen('moderation')}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 transition cursor-pointer"
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
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 flex flex-col justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-white tracking-tight">Ações Executivas</h2>
                    <p className="text-xs text-slate-400">Gestão imediata do cluster</p>

                    <div className="mt-4 space-y-2.5">
                      <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-950/40"
                      >
                        <Plus className="w-4 h-4 text-white" />
                        <span>Cadastrar Estabelecimento</span>
                      </button>

                      <button
                        onClick={() => setCurrentScreen('triade')}
                        className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer border border-slate-700/60"
                      >
                        <span>Emitir Comunicado Tríade</span>
                      </button>

                      <button
                        onClick={() => handleOpenAuthModal('register')}
                        className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer border border-slate-700/60"
                      >
                        <span>Cadastrar Novo Administrador</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                    <strong className="text-white block mb-1">Status do Cluster Supabase</strong>
                    <span className="text-emerald-400 font-medium">Bypass RLS Soberano • 100% Operacional</span>
                  </div>
                </div>
              </div>

              {/* Salons Table Quick Preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white">Todos os Estabelecimentos Cadastrados</h2>
                  <button
                    onClick={() => setCurrentScreen('salons')}
                    className="text-xs text-emerald-400 font-bold hover:underline cursor-pointer"
                  >
                    Gerenciar todos ({salons.length})
                  </button>
                </div>
                <AdminSalonsList
                  salons={salons}
                  onEditSalon={handleEditSalon}
                  onUpdateStatus={handleUpdateStatus}
                  onBulkUpdateStatus={handleBulkUpdateStatus}
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
                onOpenNewSalon={() => setIsCreateModalOpen(true)}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </div>
          )}

          {/* SCREEN: MODERATION */}
          {currentScreen === 'moderation' && (
            <AdminModerationPanel
              salons={salons}
              onEditSalon={handleEditSalon}
              onUpdateStatus={handleUpdateStatus}
            />
          )}

          {/* SCREEN: APPOINTMENTS & RADAR */}
          {currentScreen === 'appointments' && <AdminAppointmentsMonitor />}

          {/* SCREEN: TRIADE GOVERNANCE & 7TH MANDAMENT */}
          {currentScreen === 'triade' && <AdminTriadeGovernance />}

          {/* SCREEN: SETTINGS & DNS */}
          {currentScreen === 'settings' && <AdminSettingsPanel />}
        </main>
      </div>

      {/* Admin Auth Modal (Cadastro, Acesso, Recuperar) */}
      <AdminAuthModal
        isOpen={isAuthModalOpen}
        initialTab={authModalInitialTab}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(admin) => setAdminUser(admin)}
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
