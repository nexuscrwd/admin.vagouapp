import React, { useState, useMemo } from 'react';
import {
  Search,
  LayoutGrid,
  List,
  Edit,
  ExternalLink,
  CheckCircle2,
  Ban,
  Plus,
  Download,
  CheckSquare,
  Square,
  Building2,
  Trash2,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { AdminSalonItem, SalonFilterStatus, SalonSegmentFilter } from '../../types/admin';
import { AdminModerationPanel } from './AdminModerationPanel';
import { SalonLogo } from '../common/SalonLogo';
import { UnifiedRegistrationForm } from '../public/UnifiedRegistrationForm';

interface AdminSalonsListProps {
  salons: AdminSalonItem[];
  onEditSalon: (salon: AdminSalonItem) => void;
  onUpdateStatus: (salonId: string, status: AdminSalonItem['status']) => void;
  onBulkUpdateStatus?: (ids: string[], status: AdminSalonItem['status']) => void;
  onDeleteSalon?: (salonId: string) => Promise<void>;
  onBulkDeleteSalons?: (ids: string[]) => Promise<void>;
  onOpenNewSalon?: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}

export const AdminSalonsList: React.FC<AdminSalonsListProps> = ({
  salons,
  onEditSalon,
  onUpdateStatus,
  onBulkUpdateStatus,
  onDeleteSalon,
  onBulkDeleteSalons,
  onOpenNewSalon,
  searchQuery = '',
  onSearchChange,
}) => {
  const [activeSection, setActiveSection] = useState<'all_salons' | 'moderation'>('all_salons');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SalonFilterStatus>('all');
  const [segmentFilter, setSegmentFilter] = useState<SalonSegmentFilter>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Modal de Exclusão & Cadastro de Profissional
  const [salonToDelete, setSalonToDelete] = useState<AdminSalonItem | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProfessionalRegistrationOpen, setIsProfessionalRegistrationOpen] = useState(false);

  const activeSearch = searchQuery || localSearch;

  const filteredSalons = useMemo(() => {
    return salons.filter((salon) => {
      // Search
      if (activeSearch.trim()) {
        const query = activeSearch.toLowerCase();
        const matchName = salon.trade_name?.toLowerCase().includes(query);
        const matchLegal = salon.legal_name?.toLowerCase().includes(query);
        const matchSlug = salon.slug?.toLowerCase().includes(query);
        const matchCity = salon.city?.toLowerCase().includes(query);
        const matchPhone = salon.phone_whatsapp?.includes(query);
        if (!matchName && !matchLegal && !matchSlug && !matchCity && !matchPhone) {
          return false;
        }
      }

      // Status
      if (statusFilter !== 'all') {
        if (salon.status !== statusFilter) return false;
      }

      // Segment
      if (segmentFilter !== 'all') {
        if (salon.category !== segmentFilter) return false;
      }

      return true;
    });
  }, [salons, activeSearch, statusFilter, segmentFilter]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredSalons.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredSalons.map((s) => s.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Nome Fantasia',
      'Razão Social',
      'Subdomínio',
      'Categoria',
      'Status',
      'Verificado',
      'WhatsApp',
      'E-mail',
      'Cidade',
      'Estado',
    ];

    const rows = filteredSalons.map((s) => [
      s.id,
      `"${s.trade_name}"`,
      `"${s.legal_name || ''}"`,
      `"${s.slug}.vagouapp.com"`,
      `"${s.category}"`,
      `"${s.status}"`,
      s.is_verified ? 'SIM' : 'NAO',
      `"${s.phone_whatsapp || ''}"`,
      `"${s.email || ''}"`,
      `"${s.city || ''}"`,
      `"${s.state || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `estabelecimentos_vagouapp_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkApprove = () => {
    if (onBulkUpdateStatus && selectedIds.length > 0) {
      onBulkUpdateStatus(selectedIds, 'active');
      setSelectedIds([]);
    }
  };

  const handleBulkSuspend = () => {
    if (onBulkUpdateStatus && selectedIds.length > 0) {
      onBulkUpdateStatus(selectedIds, 'suspended');
      setSelectedIds([]);
    }
  };

  const handleConfirmSingleDelete = async () => {
    if (!salonToDelete || !onDeleteSalon) return;
    setIsDeleting(true);
    try {
      await onDeleteSalon(salonToDelete.id);
      setSelectedIds((prev) => prev.filter((id) => id !== salonToDelete.id));
      setSalonToDelete(null);
    } catch {
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (!onBulkDeleteSalons || selectedIds.length === 0) return;
    setIsDeleting(true);
    try {
      await onBulkDeleteSalons(selectedIds);
      setSelectedIds([]);
      setIsBulkDeleting(false);
    } catch {
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: AdminSalonItem['status']) => {
    switch (status) {
      case 'active':
        return {
          label: 'Ativo',
          className: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 font-bold',
          dot: 'bg-emerald-500 dark:bg-emerald-400',
        };
      case 'pending':
        return {
          label: 'Pendente',
          className: 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30 font-bold',
          dot: 'bg-amber-500 dark:bg-amber-400',
        };
      case 'incomplete':
        return {
          label: 'Incompleto',
          className: 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30 font-bold',
          dot: 'bg-blue-500 dark:bg-blue-400',
        };
      case 'suspended':
        return {
          label: 'Suspenso',
          className: 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30 font-bold',
          dot: 'bg-rose-500 dark:bg-rose-400',
        };
      default:
        return {
          label: 'Ativo',
          className: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 font-bold',
          dot: 'bg-emerald-500 dark:bg-emerald-400',
        };
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'barbearia':
        return 'Barbearia';
      case 'salao':
        return 'Salão de Beleza';
      case 'estetica':
        return 'Estética & Spa';
      default:
        return 'Geral';
    }
  };

  const pendingCount = salons.filter((s) => s.status === 'pending').length;

  return (
    <div className="space-y-4">
      {/* Top Section Switcher: Catálogo Geral vs Moderação */}
      <div className="p-3 sm:p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs dark:shadow-none">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Gestão de Estabelecimentos</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Catálogo soberano e esteira de moderação e auditoria de parceiros.</p>
          </div>
        </div>

        <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setActiveSection('all_salons')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeSection === 'all_salons'
                ? 'bg-[#20C933] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Todos os Salões ({salons.length})</span>
          </button>

          <button
            onClick={() => setActiveSection('moderation')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeSection === 'moderation'
                ? 'bg-[#20C933] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            <span>Moderação</span>
            {pendingCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/40 font-bold">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* RENDER MODERATION SUBSECTION */}
      {activeSection === 'moderation' ? (
        <AdminModerationPanel
          salons={salons}
          onEditSalon={onEditSalon}
          onUpdateStatus={onUpdateStatus}
        />
      ) : (
        <>
          {/* Control Bar: Filters, Search & View Mode Switcher */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs dark:shadow-none">
            {/* Search & Status Filters */}
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
              <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 w-full sm:w-64 focus-within:border-emerald-500 transition shadow-xs dark:shadow-none">
                <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Buscar estabelecimento..."
                  value={activeSearch}
                  onChange={(e) => {
                    if (onSearchChange) onSearchChange(e.target.value);
                    else setLocalSearch(e.target.value);
                  }}
                  className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
                />
              </div>

              {/* Status Tabs */}
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto max-w-full">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'active', label: 'Ativos' },
                  { id: 'pending', label: 'Pendentes' },
                  { id: 'incomplete', label: 'Incompletos' },
                  { id: 'suspended', label: 'Suspensos' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id as any)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer whitespace-nowrap ${
                      statusFilter === tab.id
                        ? 'bg-[#20C933] text-white font-bold shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Right Side: Export, New Salon, View Switcher */}
            <div className="flex items-center justify-between md:justify-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200 dark:border-slate-800">
              <button
                onClick={handleExportCSV}
                title="Exportar dados filtrados para arquivo CSV"
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700 shadow-xs dark:shadow-none"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">Exportar CSV</span>
              </button>

              <button
                onClick={onOpenNewSalon || (() => setIsProfessionalRegistrationOpen(true))}
                className="px-3 py-1.5 rounded-lg bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95"
                title="Cadastrar novo estabelecimento e vincular proprietário no ecossistema"
              >
                <Plus className="w-3.5 h-3.5 text-white" />
                <span>Cadastrar Estabelecimento</span>
              </button>

              <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setViewMode('table')}
                  title="Visualização em Tabela"
                  className={`p-1.5 rounded-md transition cursor-pointer ${
                    viewMode === 'table' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  title="Visualização em Cartões"
                  className={`p-1.5 rounded-md transition cursor-pointer ${
                    viewMode === 'cards' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Bulk Actions Banner when items are selected */}
          {selectedIds.length > 0 && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/90 border border-emerald-300 dark:border-emerald-500/50 flex flex-wrap items-center justify-between gap-2.5 animate-fadeIn shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {selectedIds.length} {selectedIds.length === 1 ? 'estabelecimento selecionado' : 'estabelecimentos selecionados'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleBulkApprove}
                  className="px-3 py-1 rounded-lg bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs transition cursor-pointer shadow-xs active:scale-95"
                >
                  Aprovar Todos
                </button>

                <button
                  onClick={handleBulkSuspend}
                  className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/80 text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 font-semibold text-xs transition cursor-pointer border border-amber-200 dark:border-amber-900/50"
                >
                  Suspender
                </button>

                <button
                  onClick={() => setIsBulkDeleting(true)}
                  className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer shadow-xs flex items-center gap-1 active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5 text-white" />
                  <span>Excluir Selecionados</span>
                </button>

                <button
                  onClick={() => setSelectedIds([])}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-2 py-1"
                >
                  Desmarcar
                </button>
              </div>
            </div>
          )}

          {/* VIEW 1: DATA TABLE */}
          {viewMode === 'table' && (
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs dark:shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800 select-none">
                    <tr>
                      <th className="py-3 px-3 w-8">
                        <button
                          onClick={toggleSelectAll}
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                          title="Selecionar todos"
                        >
                          {selectedIds.length === filteredSalons.length && filteredSalons.length > 0 ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                      <th className="py-3 px-3 font-semibold">Salão / Marca</th>
                      <th className="py-3 px-3 font-semibold">Subdomínio</th>
                      <th className="py-3 px-3 font-semibold">Categoria</th>
                      <th className="py-3 px-3 font-semibold">Localização</th>
                      <th className="py-3 px-3 font-semibold">Contato</th>
                      <th className="py-3 px-3 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                    {filteredSalons.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-500 dark:text-slate-400 text-xs">
                          Nenhum estabelecimento encontrado com os filtros aplicados.
                        </td>
                      </tr>
                    ) : (
                      filteredSalons.map((salon) => {
                        const statusBadge = getStatusBadge(salon.status);
                        const isSelected = selectedIds.includes(salon.id);
                        return (
                          <tr
                            key={salon.id}
                            className={`transition group ${
                              isSelected ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {/* Checkbox */}
                            <td className="py-3 px-3">
                              <button
                                onClick={() => toggleSelectOne(salon.id)}
                                className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>
                            </td>

                            {/* Name & Logo */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-3">
                                <SalonLogo
                                  logoUrl={salon.logo_url}
                                  name={salon.trade_name}
                                  size="md"
                                  primaryColor={salon.primary_color}
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-900 dark:text-white block truncate">{salon.trade_name}</span>
                                    {salon.is_verified && (
                                      <span title="Verificado Oficial">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                                    {salon.legal_name || 'Sem razão social'}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Subdomain */}
                            <td className="py-3 px-3">
                              <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20 font-medium">
                                {salon.slug}.vagouapp.com
                              </span>
                            </td>

                            {/* Category */}
                            <td className="py-3 px-3">
                              <span className="text-slate-700 dark:text-slate-300 font-medium">{getCategoryLabel(salon.category)}</span>
                            </td>

                            {/* Location */}
                            <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                              <span className="block truncate max-w-[130px] font-medium">{salon.neighborhood || salon.city}</span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{salon.state || 'SP'}</span>
                            </td>

                            {/* Contact */}
                            <td className="py-3 px-3">
                              <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 block">{salon.phone_whatsapp || '—'}</span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate max-w-[120px]">{salon.email || ''}</span>
                            </td>

                            {/* Status Badge */}
                            <td className="py-3 px-3">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge.className}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                                {statusBadge.label}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {salon.status === 'pending' && (
                                  <button
                                    onClick={() => onUpdateStatus(salon.id, 'active')}
                                    className="px-2 py-1 rounded bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-[10px] transition cursor-pointer shadow-xs active:scale-95"
                                    title="Aprovar Cadastro"
                                  >
                                    Aprovar
                                  </button>
                                )}

                                {salon.status === 'active' && (
                                  <button
                                    onClick={() => onUpdateStatus(salon.id, 'suspended')}
                                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer border border-slate-200 dark:border-slate-700/60 shadow-xs dark:shadow-none"
                                    title="Suspender Salão"
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                <button
                                  onClick={() => onEditSalon(salon)}
                                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer border border-slate-200 dark:border-slate-700/60 shadow-xs dark:shadow-none"
                                  title="Editar Informações Críticas"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => setSalonToDelete(salon)}
                                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/80 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer border border-slate-200 dark:border-slate-700/60 shadow-xs dark:shadow-none"
                                  title="Excluir Estabelecimento"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>

                                <a
                                  href={`https://${salon.slug}.vagouapp.com`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer border border-slate-200 dark:border-slate-700/60 shadow-xs dark:shadow-none"
                                  title="Abrir Subdomínio Oficial"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 2: CARDS GRID */}
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredSalons.map((salon) => {
                const statusBadge = getStatusBadge(salon.status);
                return (
                  <div
                    key={salon.id}
                    className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col justify-between shadow-xs dark:shadow-none group w-full"
                    style={{ width: '50%', maxWidth: '100%' }}
                  >
                    <div style={{ width: '50%', maxWidth: '100%' }}>
                      {/* Top card header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="relative">
                          <SalonLogo
                            logoUrl={salon.logo_url}
                            name={salon.trade_name}
                            size="xl"
                            primaryColor={salon.primary_color}
                          />
                          {salon.is_verified && (
                            <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 rounded-full p-0.5 shadow-xs">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge.className}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                            {statusBadge.label}
                          </span>

                          <button
                            onClick={() => onEditSalon(salon)}
                            className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                            title="Editar"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Salon Title & Category */}
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white tracking-tight line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                        {salon.trade_name}
                      </h3>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                        {getCategoryLabel(salon.category)} • {salon.city || 'São Paulo'}
                      </span>

                      {/* Subdomain pill */}
                      <div className="mt-2.5">
                        <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20 block truncate">
                          {salon.slug}.vagouapp.com
                        </span>
                      </div>

                      {/* Details summary */}
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <div className="flex items-center justify-between">
                          <span>WhatsApp:</span>
                          <span className="font-mono text-slate-800 dark:text-slate-300 font-medium">{salon.phone_whatsapp || '—'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Profissionais:</span>
                          <span className="text-slate-800 dark:text-slate-300 font-semibold">{salon.professionals_count || 1} membros</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Quick Action */}
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                      <button
                        onClick={() => onEditSalon(salon)}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 shadow-xs dark:shadow-none"
                      >
                        <Edit className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>Editar Dados</span>
                      </button>

                      <button
                        onClick={() => setSalonToDelete(salon)}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/80 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer border border-slate-200 dark:border-slate-700 shadow-xs dark:shadow-none"
                        title="Excluir Estabelecimento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* MODAL: Confirmação de Exclusão Individual */}
          {salonToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
              <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
                <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">Excluir Estabelecimento?</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Esta ação é irreversível no Supabase.</p>
                  </div>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  Você está prestes a remover o salão <strong className="text-slate-900 dark:text-white">{salonToDelete.trade_name}</strong> (`{salonToDelete.slug}.vagouapp.com`) do banco de dados.
                </p>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSalonToDelete(null)}
                    disabled={isDeleting}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition cursor-pointer border border-slate-200 dark:border-slate-700 shadow-xs dark:shadow-none"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSingleDelete}
                    disabled={isDeleting}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-rose-950/20 disabled:opacity-50 active:scale-95"
                  >
                    {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODAL: Confirmação de Exclusão em Massa */}
          {isBulkDeleting && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
              <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
                <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">Excluir {selectedIds.length} Estabelecimentos?</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Ação em massa irreversível no banco.</p>
                  </div>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  Serão removidos permanentemente <strong className="text-slate-900 dark:text-white">{selectedIds.length}</strong> salões selecionados e todos os seus registros vinculados.
                </p>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsBulkDeleting(false)}
                    disabled={isDeleting}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition cursor-pointer border border-slate-200 dark:border-slate-700 shadow-xs dark:shadow-none"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmBulkDelete}
                    disabled={isDeleting}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-rose-950/20 disabled:opacity-50 active:scale-95"
                  >
                    {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão em Massa'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Dedicado Desvinculado para Cadastro de Profissional / Estabelecimento */}
          {isProfessionalRegistrationOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn overflow-y-auto">
              <div className="w-full max-w-xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto">
                <UnifiedRegistrationForm
                  initialType="professional"
                  hideTypeSelector={true}
                  onClose={() => setIsProfessionalRegistrationOpen(false)}
                  onSuccess={() => {
                    setIsProfessionalRegistrationOpen(false);
                    window.location.reload();
                  }}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
