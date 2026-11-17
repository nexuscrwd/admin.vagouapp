import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
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
  FolderPlus,
  Tag,
  Filter,
  X,
  QrCode,
  Clock,
} from 'lucide-react';
import { AdminSalonItem, SalonFilterStatus } from '../../types/admin';
import { formatCreatedAtParts, resolveRecordOriginInfo } from '../../utils/dateTimeFormat';
import { SalonLogo } from '../common/SalonLogo';
import { AdminCategoryModal } from './AdminCategoryModal';
import { AdminSalonDetailView } from './AdminSalonDetailView';
import { SalonWelcomeModal } from './SalonWelcomeModal';
import {
  SalonCategory,
  fetchCategories,
  subscribeCategories,
  getCategoryLabel as getStoredCategoryLabel,
} from '../../services/categoriesService';

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
  selectedSalonDetail?: AdminSalonItem | null;
  onSelectSalonDetail?: (salon: AdminSalonItem | null) => void;
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
  selectedSalonDetail: propSelectedSalonDetail,
  onSelectSalonDetail,
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [statusFilter, setStatusFilter] = useState<SalonFilterStatus>('all');
  const [segmentFilter, setSegmentFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Categorias Dinâmicas & Modal de Gestão
  const [categories, setCategories] = useState<SalonCategory[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  useEffect(() => {
    fetchCategories().then(setCategories);
    const unsubscribe = subscribeCategories(setCategories);
    return () => unsubscribe();
  }, []);

  // Modal de Exclusão e Modal de QR Code & Link
  const [salonToDelete, setSalonToDelete] = useState<AdminSalonItem | null>(null);
  const [salonForQrModal, setSalonForQrModal] = useState<AdminSalonItem | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Detalhes Soberanos do Estabelecimento (Interno + Sincronização com Prop)
  const [internalSelectedSalonDetail, setInternalSelectedSalonDetail] = useState<AdminSalonItem | null>(null);

  useEffect(() => {
    if (propSelectedSalonDetail !== undefined) {
      setInternalSelectedSalonDetail(propSelectedSalonDetail);
    }
  }, [propSelectedSalonDetail]);

  const activeSelectedSalon =
    propSelectedSalonDetail !== undefined ? propSelectedSalonDetail : internalSelectedSalonDetail;

  const handleSelectSalonDetail = (salon: AdminSalonItem | null) => {
    setInternalSelectedSalonDetail(salon);
    onSelectSalonDetail?.(salon);
  };

  const activeSearch = searchQuery || '';

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

      // Segment / Category Filter
      if (segmentFilter !== 'all') {
        const salonCat = (salon.category || '').toLowerCase().trim();
        const filterSlug = segmentFilter.toLowerCase().trim();
        const matchedCategory = categories.find((c) => c.slug.toLowerCase() === filterSlug);
        const filterName = matchedCategory ? matchedCategory.name.toLowerCase().trim() : '';

        const matchesExact = salonCat === filterSlug || (filterName && salonCat === filterName);
        if (!matchesExact) {
          const salonText = `${salon.trade_name} ${salon.legal_name || ''}`.toLowerCase();
          const matchesInference = salonText.includes(filterSlug) || (filterName && salonText.includes(filterName));
          if (!matchesInference) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const ta = formatCreatedAtParts(a.created_at).timestampMs;
      const tb = formatCreatedAtParts(b.created_at).timestampMs;
      return tb - ta;
    });
  }, [salons, activeSearch, statusFilter, segmentFilter, categories]);

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
      'Criado em',
      'Origem',
    ];

    const rows = filteredSalons.map((s) => {
      const createdParts = formatCreatedAtParts(s.created_at);
      const originInfo = resolveRecordOriginInfo(s.created_via, s.created_at);
      return [
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
        `"${createdParts.csvLabel}"`,
        `"${originInfo.label}"`,
      ];
    });

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
    return getStoredCategoryLabel(cat, categories);
  };

  if (activeSelectedSalon) {
    return (
      <AdminSalonDetailView
        salon={activeSelectedSalon}
        onBack={() => handleSelectSalonDetail(null)}
        onEdit={() => onEditSalon(activeSelectedSalon)}
        onUpdateStatus={(id, st) => {
          onUpdateStatus(id, st);
          handleSelectSalonDetail(
            activeSelectedSalon && activeSelectedSalon.id === id
              ? { ...activeSelectedSalon, status: st }
              : activeSelectedSalon
          );
        }}
      />
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      {/* Unified Header & Control Bar — Fixo ao Topo sem espaçamento com cabeçalho superior, separado por linha */}
      <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 lg:px-6 py-2.5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 z-10 transition-colors shadow-2xs dark:shadow-none">
        {/* Left Side: Title & Compact Filters */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 mr-1">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight whitespace-nowrap">Estabelecimentos</h2>
          </div>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block mx-0.5" />

          {/* Filtro de Categoria (Lista suspensa compacta) */}
          <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 focus-within:border-emerald-500 transition shadow-xs dark:shadow-none">
            <Tag className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mr-1.5 shrink-0" />
            <select
              value={segmentFilter}
              onChange={(e) => {
                if (e.target.value === '__new_category__') {
                  setIsCategoryModalOpen(true);
                } else {
                  setSegmentFilter(e.target.value);
                }
              }}
              className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer pr-1"
              title="Filtrar por Categoria"
            >
              <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                Categorias ({salons.length})
              </option>
              {categories.map((c) => {
                const count = salons.filter((s) => {
                  const cat = (s.category || '').toLowerCase();
                  const slug = c.slug.toLowerCase();
                  const name = c.name.toLowerCase();
                  const exact = cat === slug || cat === name;
                  if (exact) return true;
                  const text = `${s.trade_name} ${s.legal_name || ''}`.toLowerCase();
                  return text.includes(slug) || text.includes(name);
                }).length;
                return (
                  <option
                    key={c.id || c.slug}
                    value={c.slug}
                    className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    {c.name} {count > 0 ? `(${count})` : ''}
                  </option>
                );
              })}
              <option value="__new_category__" className="bg-emerald-50 dark:bg-emerald-950 font-bold text-emerald-600 dark:text-emerald-400">
                + Criar Categoria...
              </option>
            </select>
          </div>

          {/* Filtro de Status (Lista suspensa compacta) */}
          <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 focus-within:border-emerald-500 transition shadow-xs dark:shadow-none">
            <Filter className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mr-1.5 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as SalonFilterStatus)}
              className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer pr-1"
              title="Filtrar por Status"
            >
              <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                Status
              </option>
              <option value="active" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                Ativos ({salons.filter((s) => s.status === 'active').length})
              </option>
              <option value="pending" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                Pendentes ({salons.filter((s) => s.status === 'pending').length})
              </option>
              <option value="incomplete" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                Incompletos ({salons.filter((s) => s.status === 'incomplete').length})
              </option>
              <option value="suspended" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                Suspensos ({salons.filter((s) => s.status === 'suspended').length})
              </option>
            </select>
          </div>
        </div>

        {/* Right Side: Export, New Category, New Salon, View Switcher */}
        <div className="flex items-center justify-between lg:justify-end gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200 dark:border-slate-800">
          <button
            onClick={handleExportCSV}
            title="Exportar dados filtrados para arquivo CSV"
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700 shadow-xs dark:shadow-none"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>

          <button
            onClick={() => setIsCategoryModalOpen(true)}
            title="Criar e gerenciar categorias de estabelecimentos"
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700 shadow-xs dark:shadow-none"
          >
            <FolderPlus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>+ Categoria</span>
          </button>

          <button
            onClick={onOpenNewSalon}
            className="px-3 py-1.5 rounded-lg bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95"
            title="Cadastrar novo estabelecimento e vincular proprietário no ecossistema"
          >
            <Plus className="w-3.5 h-3.5 text-white" />
            <span>Cadastrar</span>
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

      {/* Área de Dados — Container Mestre com Zero Espaço */}
      <div className="flex-1 flex flex-col min-h-0 p-0 m-0 overflow-hidden">
        {/* Bulk Actions Banner when items are selected */}
        {selectedIds.length > 0 && (
          <div className="shrink-0 p-3 bg-emerald-50 dark:bg-emerald-950/90 border-b border-emerald-300 dark:border-emerald-500/50 flex flex-wrap items-center justify-between gap-2.5 animate-fadeIn">
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

        {/* VIEW 1: DATA TABLE — Cabeçalho das colunas 100% fixo ao topo (sticky top-0), rolando SOMENTE os dados */}
        {viewMode === 'table' && (
          <div className="flex-1 overflow-auto min-h-0 custom-scrollbar w-full bg-white dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-800/80">
            <table className="w-full text-left text-xs border-separate border-spacing-0">
              <thead className="sticky top-0 z-20">
                <tr>
                  <th className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-900 py-2.5 px-3 w-10 text-center border-b border-r border-slate-200/90 dark:border-slate-800/90 backdrop-blur-xs select-none">
                    <button
                      onClick={toggleSelectAll}
                      className="text-slate-400 hover:text-emerald-500 transition cursor-pointer flex items-center justify-center mx-auto"
                      title="Selecionar todos"
                    >
                      {selectedIds.length === filteredSalons.length && filteredSalons.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-900 py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-r border-slate-200/90 dark:border-slate-800/90 backdrop-blur-xs whitespace-nowrap">
                    Salão / Marca
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-900 py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-r border-slate-200/90 dark:border-slate-800/90 backdrop-blur-xs whitespace-nowrap">
                    Subdomínio
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-900 py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-r border-slate-200/90 dark:border-slate-800/90 backdrop-blur-xs whitespace-nowrap">
                    Categoria
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-900 py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-r border-slate-200/90 dark:border-slate-800/90 backdrop-blur-xs whitespace-nowrap">
                    Localização
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-900 py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-r border-slate-200/90 dark:border-slate-800/90 backdrop-blur-xs whitespace-nowrap">
                    Contato
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-900 py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-r border-slate-200/90 dark:border-slate-800/90 backdrop-blur-xs whitespace-nowrap">
                    Criado em
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-900 py-2.5 px-3 font-semibold text-center text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-r border-slate-200/90 dark:border-slate-800/90 backdrop-blur-xs whitespace-nowrap">
                    Status
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-900 py-2.5 px-4 font-semibold text-right text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200/90 dark:border-slate-800/90 backdrop-blur-xs whitespace-nowrap">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredSalons.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500 dark:text-slate-400 text-xs border-b border-slate-200/70 dark:border-slate-800/75">
                      Nenhum estabelecimento encontrado com os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredSalons.map((salon) => {
                    const statusBadge = getStatusBadge(salon.status);
                    const isSelected = selectedIds.includes(salon.id);
                    const createdParts = formatCreatedAtParts(salon.created_at);
                    const originInfo = resolveRecordOriginInfo(salon.created_via, salon.created_at);
                    return (
                      <tr
                        key={salon.id}
                        onClick={() => handleSelectSalonDetail(salon)}
                        className={`transition-colors group cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                            : 'bg-white dark:bg-slate-950 even:bg-slate-50/45 dark:even:bg-slate-900/45 hover:bg-emerald-50/35 dark:hover:bg-emerald-500/10 text-slate-800 dark:text-slate-200'
                        }`}
                        title={`Clique para abrir a página completa de ${salon.trade_name}`}
                      >
                        {/* Checkbox */}
                        <td
                          className="py-2.5 px-3 text-center border-b border-r border-slate-200/70 dark:border-slate-800/75"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectOne(salon.id);
                          }}
                        >
                          <button className="text-slate-400 hover:text-emerald-500 transition cursor-pointer flex items-center justify-center mx-auto">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        {/* Name & Logo */}
                        <td className="py-2.5 px-3 border-b border-r border-slate-200/70 dark:border-slate-800/75">
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
                        <td className="py-2.5 px-3 border-b border-r border-slate-200/70 dark:border-slate-800/75">
                          <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20 font-medium">
                            {salon.slug}.vagouapp.com
                          </span>
                        </td>

                        {/* Category */}
                        <td className="py-2.5 px-3 border-b border-r border-slate-200/70 dark:border-slate-800/75">
                          <span className="text-slate-700 dark:text-slate-300 font-medium">{getCategoryLabel(salon.category)}</span>
                        </td>

                        {/* Location */}
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 border-b border-r border-slate-200/70 dark:border-slate-800/75">
                          <span className="block truncate max-w-[130px] font-medium">{salon.neighborhood || salon.city}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{salon.state || 'SP'}</span>
                        </td>

                        {/* Contact */}
                        <td className="py-2.5 px-3 border-b border-r border-slate-200/70 dark:border-slate-800/75">
                          <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 block">{salon.phone_whatsapp || '—'}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate max-w-[120px]">{salon.email || ''}</span>
                        </td>

                        {/* Criado em (Data + Hora + Origem) */}
                        <td
                          className="py-2.5 px-3 border-b border-r border-slate-200/70 dark:border-slate-800/75 whitespace-nowrap"
                          title={`Criado em: ${createdParts.fullLabel} • Origem: ${originInfo.label}`}
                        >
                          {createdParts.valid ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                                <span>{createdParts.dateShort}</span>
                                <Clock className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span className="text-emerald-700 dark:text-emerald-400">{createdParts.timeShort}</span>
                              </div>
                              <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400 block">
                                {originInfo.label}
                              </span>
                            </div>
                          ) : (
                            <span className="font-mono text-[11px] text-slate-400">—</span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-2.5 px-3 text-center border-b border-r border-slate-200/70 dark:border-slate-800/75">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge.className}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                            {statusBadge.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-4 text-right border-b border-slate-200/70 dark:border-slate-800/75">
                          <div className="flex items-center justify-end gap-1.5">
                            {salon.status === 'pending' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUpdateStatus(salon.id, 'active');
                                }}
                                className="px-2 py-1 rounded bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-[10px] transition cursor-pointer shadow-xs active:scale-95"
                                title="Aprovar Cadastro"
                              >
                                Aprovar
                              </button>
                            )}

                            {salon.status === 'active' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUpdateStatus(salon.id, 'suspended');
                                }}
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer border border-slate-200 dark:border-slate-700/60 shadow-xs dark:shadow-none"
                                title="Suspender Salão"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditSalon(salon);
                              }}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer border border-slate-200 dark:border-slate-700/60 shadow-xs dark:shadow-none"
                              title="Editar Informações Críticas"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSalonToDelete(salon);
                              }}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/80 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer border border-slate-200 dark:border-slate-700/60 shadow-xs dark:shadow-none"
                              title="Excluir Estabelecimento"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSalonForQrModal(salon);
                              }}
                              className="p-1.5 rounded-lg bg-[#20C933] hover:bg-[#1bb32d] text-white transition cursor-pointer shadow-xs active:scale-95"
                              title="Link do App & QR Code de Balcão"
                            >
                              <QrCode className="w-3.5 h-3.5 text-white" />
                            </button>

                            <a
                              href={`https://${salon.slug}.vagouapp.com`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
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
        )}

          {/* VIEW 2: CARDS GRID */}
          {viewMode === 'cards' && (
            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar p-4 lg:p-6 space-y-4">
              {filteredSalons.length === 0 ? (
                <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-2">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Nenhum estabelecimento encontrado no banco de dados.</p>
                  <p className="text-[11px] text-slate-400">Cadastre um novo salão ou execute os registros iniciais no Supabase.</p>
                </div>
              ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredSalons.map((salon) => {
                const statusBadge = getStatusBadge(salon.status);
                const createdParts = formatCreatedAtParts(salon.created_at);
                const originInfo = resolveRecordOriginInfo(salon.created_via, salon.created_at);
                return (
                  <div
                    key={salon.id}
                    onClick={() => handleSelectSalonDetail(salon)}
                    className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition flex flex-col justify-between shadow-xs dark:shadow-none group w-full cursor-pointer"
                    title={`Clique para abrir a página completa de ${salon.trade_name}`}
                  >
                    <div>
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
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditSalon(salon);
                            }}
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
                        <div className="flex items-center justify-between" title={`${createdParts.fullLabel} • ${originInfo.label}`}>
                          <span>Criado em:</span>
                          <span className="font-mono text-slate-800 dark:text-slate-300 font-semibold">
                            {createdParts.compactLabel}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Quick Action */}
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSalonForQrModal(salon);
                        }}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-[#20C933] hover:bg-[#1bb32d] text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs active:scale-95"
                        title="Link do App & QR Code de Balcão"
                      >
                        <QrCode className="w-3.5 h-3.5 text-white" />
                        <span className="text-white">QR Code & Link</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditSalon(salon);
                        }}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer border border-slate-200 dark:border-slate-700 shadow-xs dark:shadow-none"
                        title="Editar Dados"
                      >
                        <Edit className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSalonToDelete(salon);
                        }}
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
            </div>
          )}

          {/* MODAL: Confirmação de Exclusão Individual */}
          {salonToDelete && createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
              <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4 relative">
                <div className="flex items-start justify-between gap-3 text-rose-600 dark:text-rose-400">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm">Excluir Estabelecimento?</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Esta ação é irreversível no Supabase.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSalonToDelete(null)}
                    disabled={isDeleting}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
                    title="Fechar"
                    aria-label="Fechar"
                  >
                    <X className="w-5 h-5" />
                  </button>
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
            </div>,
            document.body
          )}

          {/* MODAL: Confirmação de Exclusão em Massa */}
          {isBulkDeleting && createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
              <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4 relative">
                <div className="flex items-start justify-between gap-3 text-rose-600 dark:text-rose-400">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm">Excluir {selectedIds.length} Estabelecimentos?</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Ação em massa irreversível no banco.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsBulkDeleting(false)}
                    disabled={isDeleting}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
                    title="Fechar"
                    aria-label="Fechar"
                  >
                    <X className="w-5 h-5" />
                  </button>
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
            </div>,
            document.body
          )}

          {/* Modal de Gestão e Criação de Categorias */}
          <AdminCategoryModal
            isOpen={isCategoryModalOpen}
            onClose={() => setIsCategoryModalOpen(false)}
            salons={salons}
            onCategoryCreated={(newCat) => {
              setSegmentFilter(newCat.slug);
            }}
          />

          {/* Modal de Link do App & QR Code de Balcão */}
          <SalonWelcomeModal
            isOpen={Boolean(salonForQrModal)}
            onClose={() => setSalonForQrModal(null)}
            data={
              salonForQrModal
                ? {
                    tradeName: salonForQrModal.trade_name,
                    slug: salonForQrModal.slug,
                    slogan: salonForQrModal.description,
                    logoUrl: salonForQrModal.logo_url,
                    primaryColor: salonForQrModal.primary_color || '#20C933',
                    ownerName: salonForQrModal.owner_name,
                  }
                : null
            }
          />
      </div>
    </div>
  );
};
