import React, { useState, useEffect } from 'react';
import {
  fetchAdminSalons,
  updateAdminSalon,
  createAdminSalon,
  bulkUpdateSalons,
  fetchAdminDashboardMetrics,
} from '../../services/supabaseApi';
import { AdminSalonItem, AdminDashboardMetrics, AdminScreenId } from '../../types/admin';
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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Modals
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
      setSalons((prev) =>
        prev.map((s) => (s.id === salonId ? { ...s, ...updates } : s))
      );
      fetchAdminDashboardMetrics().then(setMetrics);
      return true;
    }
    return false;
  };

  const handleCreateSalon = async (salonData: Partial<AdminSalonItem>) => {
    const res = await createAdminSalon(salonData);
    if (res.success && res.salon) {
      setSalons((prev) => [res.salon!, ...prev]);
      fetchAdminDashboardMetrics().then(setMetrics);
      return true;
    }
    return false;
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

  const pendingCount = metrics.pendingSalons + metrics.incompleteSalons;

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* 1. Permanent Fixed Sidebar */}
      <div className="shrink-0 h-full">
        <AdminSidebar
          currentScreen={currentScreen}
          onSelectScreen={setCurrentScreen}
          pendingCount={pendingCount}
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
        />

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6 space-y-6">
          {/* SCREEN: DASHBOARD */}
          {currentScreen === 'dashboard' && (
            <div className="space-y-6">
              {/* KPIs */}
              <AdminKpiCards
                metrics={metrics}
                onFilterStatus={() => {
                  setCurrentScreen('salons');
                }}
              />

              {/* Salons Overview with Quick Action to Full List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm lg:text-base font-bold text-white tracking-tight">
                      Estabelecimentos Cadastrados
                    </h2>
                    <p className="text-xs text-slate-400">
                      Gestão completa dos salões, barbearias e studios sincronizados no Supabase com Service Role.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-950/40"
                    >
                      <Plus className="w-3.5 h-3.5 text-white" />
                      <span>Novo Salão</span>
                    </button>

                    <button
                      onClick={() => setCurrentScreen('salons')}
                      className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer ml-2"
                    >
                      <span>Ver todos</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
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

          {/* SCREEN: SALONS (Full Management Table & Grid) */}
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
