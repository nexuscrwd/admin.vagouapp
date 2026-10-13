import React, { useState, useMemo } from 'react';
import {
  Globe,
  Plus,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  Search,
  Filter,
  Edit,
  Trash2,
  Sparkles,
  Link as LinkIcon,
  Copy,
  Check,
  FolderPlus,
  ArrowRight,
  ShieldAlert,
  Users,
  MapPin,
  Phone,
  Eye,
  Ban,
  CheckSquare,
  List,
  LayoutGrid,
} from 'lucide-react';
import { AdminSalonItem, SalonFilterStatus } from '../../types/admin';
import { SalonLogo } from '../common/SalonLogo';

interface AdminPortalManagerProps {
  salons: AdminSalonItem[];
  onOpenNewSalon: () => void;
  onEditSalon: (salon: AdminSalonItem) => void;
  onSelectSalonDetail: (salon: AdminSalonItem) => void;
  onUpdateStatus: (salonId: string, status: AdminSalonItem['status']) => void;
  onUpdateVerified?: (salonId: string, isVerified: boolean) => void;
  onDeleteSalon?: (salonId: string) => Promise<void>;
  onOpenCategoryModal?: () => void;
}

export const AdminPortalManager: React.FC<AdminPortalManagerProps> = ({
  salons,
  onOpenNewSalon,
  onEditSalon,
  onSelectSalonDetail,
  onUpdateStatus,
  onUpdateVerified,
  onDeleteSalon,
  onOpenCategoryModal,
}) => {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'all' | 'onboarding'>('pipeline');
  const [pipelineViewMode, setPipelineViewMode] = useState<'table' | 'cards'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SalonFilterStatus>('all');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Métricas calculadas da esteira de estabelecimentos
  const metrics = useMemo(() => {
    const total = salons.length;
    const active = salons.filter((s) => s.status === 'active').length;
    const pending = salons.filter((s) => s.status === 'pending').length;
    const incomplete = salons.filter((s) => s.status === 'incomplete').length;
    const suspended = salons.filter((s) => s.status === 'suspended').length;
    const verified = salons.filter((s) => s.is_verified).length;

    // Novos estabelecimentos (cadastrados nos últimos 30 dias ou com status pending/incomplete)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recent = salons.filter((s) => {
      if (s.status === 'pending' || s.status === 'incomplete') return true;
      if (!s.created_at) return false;
      return new Date(s.created_at) >= thirtyDaysAgo;
    });

    return {
      total,
      active,
      pending,
      incomplete,
      suspended,
      verified,
      recentCount: recent.length,
      needsAttention: pending + incomplete,
    };
  }, [salons]);

  // Lista de estabelecimentos para a esteira (Novos, Pendentes e Incompletos primeiro)
  const pipelineSalons = useMemo(() => {
    return [...salons].sort((a, b) => {
      // Prioridade 1: Pendentes e incompletos primeiro
      const priorityOrder: Record<string, number> = {
        pending: 3,
        incomplete: 2,
        active: 1,
        suspended: 0,
      };
      const pDiff = (priorityOrder[b.status] || 0) - (priorityOrder[a.status] || 0);
      if (pDiff !== 0) return pDiff;

      // Prioridade 2: Mais recentes primeiro
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });
  }, [salons]);

  // Lista filtrada para a visualização geral
  const filteredSalons = useMemo(() => {
    return salons.filter((salon) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        salon.trade_name?.toLowerCase().includes(q) ||
        salon.legal_name?.toLowerCase().includes(q) ||
        salon.slug?.toLowerCase().includes(q) ||
        salon.city?.toLowerCase().includes(q) ||
        salon.document_number?.includes(q) ||
        salon.category?.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || salon.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [salons, searchQuery, statusFilter]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const getStatusBadge = (status: AdminSalonItem['status']) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            Ativo
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Clock className="w-3 h-3 text-amber-500" />
            Pendente
          </span>
        );
      case 'incomplete':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-500/10 text-orange-500 border border-orange-500/20">
            <AlertCircle className="w-3 h-3 text-orange-500" />
            Incompleto
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <Ban className="w-3 h-3 text-rose-500" />
            Suspenso
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* 1. Header do Portal VAPP com Ações Rápidas de Criação */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
              <Globe className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Portal VAPP • Gestão de Estabelecimentos
                </h1>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-700">
                  portal.vagouapp.com
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Central de criação, esteira de onboarding e governança de salões parceiros no marketplace.
              </p>
            </div>
          </div>

          {/* Botões de Ação do Topo */}
          <div className="flex flex-wrap items-center gap-2.5">
            {onOpenCategoryModal && (
              <button
                type="button"
                onClick={onOpenCategoryModal}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
              >
                <FolderPlus className="w-4 h-4 text-slate-400" />
                <span>Categorias</span>
              </button>
            )}

            <a
              href="https://portal.vagouapp.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>Ver Portal</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>

            {/* BOTÃO MESTRE: CRIAR NOVO ESTABELECIMENTO */}
            <button
              type="button"
              onClick={onOpenNewSalon}
              className="px-4 py-2 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Novo Estabelecimento</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. KPIs da Esteira de Estabelecimentos do Portal */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total no Portal */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-medium">Total de Salões</span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {metrics.total}
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 block">
            {metrics.active} com operação ativa
          </span>
        </div>

        {/* Esteira / Novos */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-medium">Esteira de Novos</span>
            <Sparkles className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {metrics.recentCount}
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 block">
            Onboarding e recentes
          </span>
        </div>

        {/* Pendentes de Aprovação */}
        <div
          onClick={() => {
            setActiveTab('all');
            setStatusFilter('pending');
          }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-xs cursor-pointer hover:border-amber-500/50 transition group"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-medium group-hover:text-amber-500 transition">Aguardando Moderação</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-amber-500">
            {metrics.needsAttention}
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 block">
            {metrics.pending} pendentes • {metrics.incomplete} incompletos
          </span>
        </div>

        {/* Selo Verificado */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-medium">Selo Verificado</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {metrics.verified}
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 block">
            Com selo de confiança oficial
          </span>
        </div>
      </div>

      {/* 3. Abas Principais do Portal VAPP */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('pipeline')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'pipeline'
                ? 'bg-[#20C933] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Esteira de Novos Salões</span>
            {metrics.needsAttention > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === 'pipeline' ? 'bg-white text-emerald-700 font-bold' : 'bg-amber-500 text-white'
                }`}
              >
                {metrics.needsAttention}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'all'
                ? 'bg-[#20C933] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Todos os Estabelecimentos ({metrics.total})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('onboarding')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'onboarding'
                ? 'bg-[#20C933] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Onboarding & Domínios</span>
          </button>
        </div>
      </div>

      {/* ABA 1: ESTEIRA DE NOVOS SALÕES & MODERAÇÃO */}
      {activeTab === 'pipeline' && (
        <div className="space-y-4">
          {/* Barra de Ações & Alternador de Modo de Exibição */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">
              Exibindo estabelecimentos em ordem de prioridade de entrada e moderação ({pipelineSalons.length}).
            </span>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {/* Alternador de Modo: Tabela (padrão) vs Cartões */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPipelineViewMode('table')}
                  title="Visualização em Tabela"
                  className={`p-1.5 rounded-md transition cursor-pointer ${
                    pipelineViewMode === 'table'
                      ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPipelineViewMode('cards')}
                  title="Visualização em Cartões"
                  className={`p-1.5 rounded-md transition cursor-pointer ${
                    pipelineViewMode === 'cards'
                      ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={onOpenNewSalon}
                className="px-3 py-1.5 rounded-lg bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 text-white" />
                <span>Novo Estabelecimento</span>
              </button>
            </div>
          </div>

          {/* VIEW 1: TABELA (Padrão Corporativo Semelhante à Lista Pai da Seção) */}
          {pipelineViewMode === 'table' ? (
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs dark:shadow-none">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[760px]">
                  <thead className="bg-slate-100 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800 select-none">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Salão / Marca</th>
                      <th className="py-3 px-4 font-semibold">Subdomínio</th>
                      <th className="py-3 px-4 font-semibold">Categoria</th>
                      <th className="py-3 px-4 font-semibold">Localização</th>
                      <th className="py-3 px-4 font-semibold">Contato</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                    {pipelineSalons.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500 dark:text-slate-400">
                          Nenhum estabelecimento encontrado na esteira.
                        </td>
                      </tr>
                    ) : (
                      pipelineSalons.map((salon) => {
                        const isPending = salon.status === 'pending' || salon.status === 'incomplete';
                        return (
                          <tr
                            key={salon.id}
                            className={`hover:bg-slate-50/90 dark:hover:bg-slate-800/60 transition-colors ${
                              isPending ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''
                            }`}
                          >
                            {/* Salão / Marca */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <SalonLogo
                                  logoUrl={salon.logo_url}
                                  name={salon.trade_name}
                                  size="sm"
                                  alwaysShow={true}
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-900 dark:text-white truncate">
                                      {salon.trade_name}
                                    </span>
                                    {salon.is_verified && (
                                      <ShieldCheck
                                        className="w-3.5 h-3.5 text-emerald-500 shrink-0"
                                        title="Estabelecimento Verificado"
                                      />
                                    )}
                                  </div>
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                                    {salon.legal_name || salon.document_number || 'Sem razão social'}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Subdomínio */}
                            <td className="py-3 px-4">
                              <a
                                href={`https://${salon.slug}.vagouapp.com`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1"
                              >
                                <span>{salon.slug}</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </td>

                            {/* Categoria */}
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium capitalize">
                                {salon.category || 'Geral'}
                              </span>
                            </td>

                            {/* Localização */}
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                              <span>{salon.city ? `${salon.city}${salon.state ? ` - ${salon.state}` : ''}` : '—'}</span>
                            </td>

                            {/* Contato */}
                            <td className="py-3 px-4">
                              {salon.phone_whatsapp ? (
                                <a
                                  href={`https://wa.me/55${salon.phone_whatsapp.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-mono text-slate-700 dark:text-slate-300 hover:text-emerald-500 flex items-center gap-1 text-[11px]"
                                >
                                  <Phone className="w-3 h-3 text-emerald-500" />
                                  <span>{salon.phone_whatsapp}</span>
                                </a>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-3 px-4">
                              {getStatusBadge(salon.status)}
                            </td>

                            {/* Ações */}
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {salon.status !== 'active' ? (
                                  <button
                                    type="button"
                                    onClick={() => onUpdateStatus(salon.id, 'active')}
                                    className="px-2.5 py-1 rounded-lg bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-[11px] transition cursor-pointer shadow-xs active:scale-95 flex items-center gap-1"
                                    title="Aprovar e Ativar Estabelecimento"
                                  >
                                    <CheckCircle2 className="w-3 h-3 text-white" />
                                    <span>Aprovar</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => onUpdateStatus(salon.id, 'suspended')}
                                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer"
                                    title="Suspender Estabelecimento"
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {onUpdateVerified && (
                                  <button
                                    type="button"
                                    onClick={() => onUpdateVerified(salon.id, !salon.is_verified)}
                                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                                      salon.is_verified
                                        ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-emerald-500'
                                    }`}
                                    title={salon.is_verified ? 'Revogar Selo Verificado' : 'Conceder Selo Verificado'}
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => onEditSalon(salon)}
                                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                                  title="Editar Dados Master"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onSelectSalonDetail(salon)}
                                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                                  title="Abrir Detalhes do Estabelecimento"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
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
          ) : (
            /* VIEW 2: CARTÕES */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {pipelineSalons.map((salon) => {
                const isPending = salon.status === 'pending' || salon.status === 'incomplete';
                return (
                  <div
                    key={salon.id}
                    className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 transition-all hover:shadow-md flex flex-col justify-between ${
                      isPending
                        ? 'border-amber-500/40 bg-amber-500/5'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <SalonLogo
                            logoUrl={salon.logo_url}
                            name={salon.trade_name}
                            size="md"
                            alwaysShow={true}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                {salon.trade_name}
                              </h3>
                              {salon.is_verified && (
                                <ShieldCheck
                                  className="w-4 h-4 text-emerald-500 shrink-0"
                                  title="Estabelecimento Verificado"
                                />
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                              {salon.legal_name || salon.category || 'Estabelecimento'}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0">{getStatusBadge(salon.status)}</div>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 mb-3 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-[11px]">Subdomínio:</span>
                          <a
                            href={`https://${salon.slug}.vagouapp.com`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1"
                          >
                            <span>{salon.slug}.vagouapp.com</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>

                        {salon.city && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">Cidade:</span>
                            <span className="text-slate-700 dark:text-slate-300 font-medium">
                              {salon.city} {salon.state ? `- ${salon.state}` : ''}
                            </span>
                          </div>
                        )}

                        {salon.phone_whatsapp && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">WhatsApp:</span>
                            <a
                              href={`https://wa.me/55${salon.phone_whatsapp.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-700 dark:text-slate-300 hover:text-emerald-500 font-mono"
                            >
                              {salon.phone_whatsapp}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-1.5">
                      {salon.status !== 'active' ? (
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(salon.id, 'active')}
                          className="py-1.5 px-3 rounded-lg bg-[#20C933] hover:bg-[#1bb32d] text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          title="Aprovar e Ativar Estabelecimento"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          <span>Aprovar</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(salon.id, 'suspended')}
                          className="py-1.5 px-2.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-medium transition cursor-pointer"
                          title="Suspender Estabelecimento"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {onUpdateVerified && (
                        <button
                          type="button"
                          onClick={() => onUpdateVerified(salon.id, !salon.is_verified)}
                          className={`py-1.5 px-2.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                            salon.is_verified
                              ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-emerald-500'
                          }`}
                          title={salon.is_verified ? 'Revogar Selo Verificado' : 'Conceder Selo Verificado'}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>{salon.is_verified ? 'Verificado' : 'Verificar'}</span>
                        </button>
                      )}

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onEditSalon(salon)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                          title="Editar Dados Master"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onSelectSalonDetail(salon)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                          title="Abrir Detalhes do Estabelecimento"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ABA 2: TODOS OS ESTABELECIMENTOS DO PORTAL */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          {/* Barra de Busca e Filtros */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 w-full sm:w-80 shadow-xs focus-within:border-emerald-500 transition">
              <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Buscar por nome, slug, cidade..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {(['all', 'active', 'pending', 'incomplete', 'suspended'] as SalonFilterStatus[]).map(
                (st) => {
                  const labels: Record<string, string> = {
                    all: 'Todos',
                    active: 'Ativos',
                    pending: 'Pendentes',
                    incomplete: 'Incompletos',
                    suspended: 'Suspensos',
                  };
                  const isSelected = statusFilter === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                        isSelected
                          ? 'bg-[#20C933] text-white font-bold'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {labels[st]}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Tabela de Estabelecimentos */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 text-slate-500 dark:text-slate-400 font-semibold">
                    <th className="p-3.5 pl-4">Estabelecimento</th>
                    <th className="p-3.5">Subdomínio</th>
                    <th className="p-3.5">Categoria</th>
                    <th className="p-3.5">Localização</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right pr-4">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                  {filteredSalons.map((salon) => (
                    <tr
                      key={salon.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="p-3.5 pl-4">
                        <div className="flex items-center gap-3">
                          <SalonLogo
                            logoUrl={salon.logo_url}
                            name={salon.trade_name}
                            size="sm"
                            alwaysShow={true}
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 dark:text-white">
                                {salon.trade_name}
                              </span>
                              {salon.is_verified && (
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 block">
                              {salon.document_number || 'Sem documento'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <a
                          href={`https://${salon.slug}.vagouapp.com`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-emerald-600 dark:text-emerald-400 font-medium hover:underline flex items-center gap-1"
                        >
                          <span>{salon.slug}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>

                      <td className="p-3.5">
                        <span className="capitalize text-slate-600 dark:text-slate-400">
                          {salon.category || 'Geral'}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span>{salon.city ? `${salon.city}/${salon.state || 'SP'}` : 'Não inf.'}</span>
                      </td>

                      <td className="p-3.5">{getStatusBadge(salon.status)}</td>

                      <td className="p-3.5 text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {salon.status !== 'active' ? (
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(salon.id, 'active')}
                              className="px-2 py-1 rounded bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-[11px] transition cursor-pointer"
                              title="Aprovar e Ativar"
                            >
                              Ativar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(salon.id, 'suspended')}
                              className="p-1 rounded text-slate-400 hover:text-rose-500 transition cursor-pointer"
                              title="Suspender"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onEditSalon(salon)}
                            className="p-1 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                            title="Editar"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onSelectSalonDetail(salon)}
                            className="p-1 rounded text-slate-400 hover:text-emerald-500 transition cursor-pointer"
                            title="Ver Detalhes"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: ONBOARDING & DOMÍNIOS DO PORTAL */}
      {activeTab === 'onboarding' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              Links de Entrada & Onboarding da Tríade
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Compartilhe os links oficiais para cadastro direto de parceiros e clientes. Todo novo salão segue o princípio: <strong>1 Usuário Proprietário = 1 Estabelecimento</strong>.
            </p>

            <div className="space-y-3">
              {/* Link 1: Cadastro de Parceiros / Novo Salão */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Formulário de Cadastro de Parceiro (Novo Salão)
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/10 text-emerald-500 font-bold">
                      mnvapp
                    </span>
                  </div>
                  <code className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate block">
                    https://seunegocio.vagouapp.com/cadastro?type=professional
                  </code>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      'https://seunegocio.vagouapp.com/cadastro?type=professional',
                      'parceiro'
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-emerald-500 flex items-center gap-1.5 shrink-0 transition cursor-pointer"
                >
                  {copiedLink === 'parceiro' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-500 font-bold">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Link</span>
                    </>
                  )}
                </button>
              </div>

              {/* Link 2: Portal do Consumidor */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Portal do Consumidor / Radar de Vagas
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-500/10 text-blue-500 font-bold">
                      pvapp
                    </span>
                  </div>
                  <code className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate block">
                    https://portal.vagouapp.com
                  </code>
                </div>

                <button
                  type="button"
                  onClick={() => copyToClipboard('https://portal.vagouapp.com', 'portal')}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-emerald-500 flex items-center gap-1.5 shrink-0 transition cursor-pointer"
                >
                  {copiedLink === 'portal' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-500 font-bold">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Link</span>
                    </>
                  )}
                </button>
              </div>

              {/* Link 3: Rota Wildcard */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Roteador Wildcard de Subdomínios dos Estabelecimentos
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-purple-500/10 text-purple-500 font-bold">
                      DNS Cloudflare
                    </span>
                  </div>
                  <code className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate block">
                    https://&#123;slug&#125;.vagouapp.com
                  </code>
                </div>

                <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
                  Operacional
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
