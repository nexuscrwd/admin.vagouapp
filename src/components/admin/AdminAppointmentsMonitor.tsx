import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarCheck,
  Zap,
  Clock,
  CheckCircle2,
  AlertCircle,
  Filter,
  Search,
  Building2,
  User,
  Users,
  DollarSign,
  Download,
  Share2,
  FileSpreadsheet,
  Receipt,
  Check,
  TrendingUp,
  Percent,
  Calendar,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  Phone,
  Sparkles,
  MapPin,
  Tag,
  XCircle,
  Ban,
} from 'lucide-react';
import { AdminAppointmentItem, SalonMonthlyInvoice, AdminSalonItem } from '../../types/admin';
import { fetchAdminAppointments, fetchAdminSalons } from '../../services/supabaseApi';

export const AdminAppointmentsMonitor: React.FC = () => {
  const [appointments, setAppointments] = useState<AdminAppointmentItem[]>([]);
  const [salons, setSalons] = useState<AdminSalonItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Navegação Mestre-Detalhe
  const [selectedSalonId, setSelectedSalonId] = useState<string | null>(null);

  // Filtros Globais
  const [selectedCompetence, setSelectedCompetence] = useState<string>('2026-09');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'radar' | 'standard'>('all');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [apts, slns] = await Promise.all([
          fetchAdminAppointments(),
          fetchAdminSalons(),
        ]);
        setAppointments(apts);
        setSalons(slns);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Formatação BRL
  const formatBRL = (val: number) => {
    return `R$ ${val.toFixed(2).replace('.', ',')}`;
  };

  // 1. Resumo Consolidado de cada Salão na Competência Selecionada
  const salonsWithMetrics = useMemo(() => {
    return salons.map((salon) => {
      // Agendamentos deste salão
      const salonAppointments = appointments.filter((apt) => {
        const matchesSalon = apt.salon_id === salon.id || apt.salon_slug === salon.slug;
        const matchesMonth = apt.appointment_date.startsWith(selectedCompetence);
        return matchesSalon && matchesMonth;
      });

      const billable = salonAppointments.filter(
        (a) => a.status === 'concluido' || a.status === 'confirmado'
      );
      const cancelled = salonAppointments.filter(
        (a) => a.status === 'cancelado' || a.status === 'no_show'
      );
      const grossRevenue = billable.reduce((acc, curr) => acc + curr.price, 0);

      const feePerBooking = salon.fee_per_booking ?? 2.5;
      const isSubscription = salon.billing_plan === 'subscription';
      const monthlyFee = salon.monthly_subscription_fee ?? 89.9;

      const totalInvoice = isSubscription ? monthlyFee : billable.length * feePerBooking;

      return {
        salon,
        appointmentsCount: salonAppointments.length,
        billableCount: billable.length,
        cancelledCount: cancelled.length,
        grossRevenue,
        totalInvoice,
        feePerBooking,
        isSubscription,
        appointments: salonAppointments,
      };
    });
  }, [salons, appointments, selectedCompetence]);

  // Totais Agregados Globais da Competência
  const globalMonthlyTotals = useMemo(() => {
    const totalAppointments = salonsWithMetrics.reduce((acc, s) => acc + s.appointmentsCount, 0);
    const totalBillable = salonsWithMetrics.reduce((acc, s) => acc + s.billableCount, 0);
    const totalCancelled = salonsWithMetrics.reduce((acc, s) => acc + s.cancelledCount, 0);
    const totalGrossRevenue = salonsWithMetrics.reduce((acc, s) => acc + s.grossRevenue, 0);
    const totalVagouInvoice = salonsWithMetrics.reduce((acc, s) => acc + s.totalInvoice, 0);

    return {
      totalAppointments,
      totalBillable,
      totalCancelled,
      totalGrossRevenue,
      totalVagouInvoice,
    };
  }, [salonsWithMetrics]);

  // Filtro de Busca na lista de salões (Nível 1)
  const filteredSalonsList = useMemo(() => {
    if (!search.trim()) return salonsWithMetrics;
    const q = search.toLowerCase();
    return salonsWithMetrics.filter(
      (item) =>
        item.salon.trade_name.toLowerCase().includes(q) ||
        item.salon.slug.toLowerCase().includes(q) ||
        (item.salon.city && item.salon.city.toLowerCase().includes(q))
    );
  }, [salonsWithMetrics, search]);

  // Salão Atualmente Selecionado (Nível 2)
  const activeSalonData = useMemo(() => {
    if (!selectedSalonId) return null;
    return salonsWithMetrics.find((item) => item.salon.id === selectedSalonId) || null;
  }, [salonsWithMetrics, selectedSalonId]);

  // Agendamentos Filtrados dentro da Seção Exclusiva do Salão
  const filteredActiveSalonAppointments = useMemo(() => {
    if (!activeSalonData) return [];
    return activeSalonData.appointments.filter((apt) => {
      if (filterType === 'radar' && !apt.is_radar_offer) return false;
      if (filterType === 'standard' && apt.is_radar_offer) return false;
      if (statusFilter !== 'all' && apt.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          apt.client_name.toLowerCase().includes(q) ||
          (apt.beneficiary_name && apt.beneficiary_name.toLowerCase().includes(q)) ||
          apt.protocol.toLowerCase().includes(q) ||
          apt.service_title.toLowerCase().includes(q) ||
          (apt.professional_name && apt.professional_name.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [activeSalonData, filterType, statusFilter, search]);

  // Exportar Extrato CSV
  const handleExportCSV = (salonData?: typeof activeSalonData) => {
    const items = salonData ? salonData.appointments : appointments;
    const headers = [
      'Protocolo',
      'Salão',
      'Cliente Titular',
      'Atendido (Family/Próprio)',
      'Telefone',
      'Serviço',
      'Profissional',
      'Data',
      'Horário',
      'Valor Serviço',
      'Taxa Vagou',
      'Origem',
      'Status',
    ];

    const rows = items.map((a) => [
      `"${a.protocol}"`,
      `"${a.salon_name}"`,
      `"${a.client_name}"`,
      `"${a.beneficiary_name || a.client_name}"`,
      `"${a.client_phone}"`,
      `"${a.service_title}"`,
      `"${a.professional_name || 'Profissional'}"`,
      `"${a.appointment_date}"`,
      `"${a.time_slot}"`,
      `"${a.price.toFixed(2)}"`,
      `"${(a.status === 'concluido' || a.status === 'confirmado' ? a.fee_charged : 0).toFixed(2)}"`,
      `"${a.is_radar_offer ? 'Radar Relâmpago' : 'Agenda Direta'}"`,
      `"${a.status}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `extrato_agendamentos_${selectedCompetence}_${salonData ? salonData.salon.slug : 'geral'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Enviar Fatura WhatsApp
  const handleSendWhatsApp = (item: NonNullable<typeof activeSalonData>) => {
    const cleanPhone = (item.salon.phone_whatsapp || '').replace(/\D/g, '');
    const monthName = selectedCompetence === '2026-09' ? 'Setembro/2026' : selectedCompetence;

    const message = ` Olá *${item.salon.trade_name}*!%0A%0ASegue o fechamento de repasse e agendamentos do *VagouApp* ref. ao mês de *${monthName}*:%0A%0A Total de Agendamentos: *${item.appointmentsCount}*%0A Agendamentos Concluídos: *${item.billableCount}*%0A Agendamentos Cancelados/Isentos: *${item.cancelledCount}*%0A Volume Transacionado no Salão: *${formatBRL(item.grossRevenue)}*%0A Modalidade Comercial: *${item.isSubscription ? 'Assinatura Fixa' : `Taxa por Agendamento (${formatBRL(item.feePerBooking)})`}*%0A%0A *VALOR TOTAL DA FATURA: ${formatBRL(item.totalInvoice)}*%0A Chave PIX: ${item.salon.pix_key || 'financeiro@vagouapp.com'}%0A Data de Vencimento: Dia ${item.salon.billing_due_day || 10} do mês%0A%0AEstamos à disposição para qualquer dúvida!`;

    const url = cleanPhone
      ? `https://wa.me/55${cleanPhone}?text=${message}`
      : `https://wa.me/?text=${message}`;

    window.open(url, '_blank');
  };

  const getStatusBadge = (status: AdminAppointmentItem['status']) => {
    switch (status) {
      case 'confirmado':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'em_atendimento':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'concluido':
        return 'bg-emerald-600 text-white font-bold border-emerald-500';
      case 'cancelado':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'no_show':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner Informativo & Seletor de Competência */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-xs">
            <CalendarCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              Monitor de Agendamentos & Faturamento por Estabelecimento
            </h2>
            <p className="text-xs text-slate-400">
              Controle global de horários, faturamento por prestador e histórico exclusivo de cada salão.
            </p>
          </div>
        </div>

        {/* Competência Selector */}
        <div className="flex items-center gap-2 bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 shrink-0 self-start md:self-auto shadow-xs">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-slate-400 font-medium">Mês:</span>
          <select
            value={selectedCompetence}
            onChange={(e) => setSelectedCompetence(e.target.value)}
            className="bg-transparent text-xs font-bold text-emerald-400 outline-none cursor-pointer"
          >
            <option value="2026-09" className="bg-slate-900 text-white">Setembro / 2026</option>
            <option value="2026-08" className="bg-slate-900 text-white">Agosto / 2026</option>
            <option value="2026-07" className="bg-slate-900 text-white">Julho / 2026</option>
          </select>
        </div>
      </div>

      {/* ======================================================== */}
      {/* NÍVEL 1: LISTAGEM DE ESTABELECIMENTOS                    */}
      {/* ======================================================== */}
      {!selectedSalonId && (
        <div className="space-y-4 animate-fadeIn">
          {/* Cards de Resumo Geral da Competência (Incluindo Cancelados) */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Total Agendamentos */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 block uppercase">
                  Total Agendamentos
                </span>
                <span className="text-lg sm:text-xl font-bold text-white mt-1 block">
                  {globalMonthlyTotals.totalAppointments}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">No mês atual</span>
              </div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <CalendarCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              </div>
            </div>

            {/* Atendimentos Concluídos */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 block uppercase">
                  Concluídos (Válidos)
                </span>
                <span className="text-lg sm:text-xl font-bold text-emerald-400 mt-1 block">
                  {globalMonthlyTotals.totalBillable}
                </span>
                <span className="text-[10px] text-emerald-400/80 font-medium">Faturáveis</span>
              </div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
              </div>
            </div>

            {/* Agendamentos Cancelados (Card solicitado) */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-rose-500/30 flex items-center justify-between bg-rose-950/10">
              <div>
                <span className="text-[10px] sm:text-[11px] font-bold text-rose-300 block uppercase">
                  Cancelados / No-Show
                </span>
                <span className="text-lg sm:text-xl font-extrabold text-rose-400 mt-1 block">
                  {globalMonthlyTotals.totalCancelled}
                </span>
                <span className="text-[10px] text-rose-300/80 font-medium">100% Isentos de Taxa</span>
              </div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400" />
              </div>
            </div>

            {/* Total Fatura VagouApp */}
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] sm:text-[11px] font-bold text-emerald-300 block uppercase">
                  Faturamento Vagou
                </span>
                <span className="text-lg sm:text-xl font-extrabold text-white mt-1 block">
                  {formatBRL(globalMonthlyTotals.totalVagouInvoice)}
                </span>
                <span className="text-[10px] text-emerald-300 font-medium">A faturar no fechamento</span>
              </div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
            </div>
          </div>

          {/* Barra de Busca & Ações de Estabelecimentos */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Buscar estabelecimento por nome, subdomínio ou cidade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-xs text-white placeholder-slate-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2">
              <span className="text-xs text-slate-400">
                {filteredSalonsList.length} salões listados
              </span>
              <button
                onClick={() => handleExportCSV()}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer border border-slate-700 text-xs font-semibold flex items-center gap-1.5"
                title="Exportar Todos os Agendamentos em CSV"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Exportar CSV</span>
              </button>
            </div>
          </div>

          {/* Grid / Lista de Estabelecimentos (Ajustado para Responsividade Superior) */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {filteredSalonsList.map((item) => (
              <div
                key={item.salon.id}
                onClick={() => {
                  setSelectedSalonId(item.salon.id);
                  setSearch('');
                  setStatusFilter('all');
                  setFilterType('all');
                }}
                className="group p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/60 transition cursor-pointer flex flex-col justify-between space-y-3.5 hover:shadow-lg hover:shadow-emerald-950/20"
              >
                {/* Header do Card */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 group-hover:border-emerald-500/40 flex items-center justify-center font-bold text-white text-sm shrink-0 transition">
                      {item.salon.trade_name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-white text-sm tracking-tight truncate group-hover:text-emerald-400 transition">
                        {item.salon.trade_name}
                      </h3>
                      <span className="text-[11px] text-slate-400 font-mono block truncate">
                        {item.salon.slug}.vagouapp.com
                      </span>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 whitespace-nowrap">
                    {item.isSubscription ? 'Assinatura' : 'Pay-per-Booking'}
                  </span>
                </div>

                {/* Métricas do Estabelecimento na Competência: 4 colunas responsivas incluindo CANCELADOS */}
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2 bg-slate-950/70 p-2 sm:p-2.5 rounded-xl border border-slate-800/80 text-center">
                  <div>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 block uppercase font-medium truncate">
                      Agendados
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-white mt-0.5 block">
                      {item.appointmentsCount}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 block uppercase font-medium truncate">
                      Concluídos
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-emerald-400 mt-0.5 block">
                      {item.billableCount}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] sm:text-[10px] text-rose-300 block uppercase font-medium truncate">
                      Cancelados
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-rose-400 mt-0.5 block">
                      {item.cancelledCount}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 block uppercase font-medium truncate">
                      Fatura
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold text-white mt-0.5 block truncate">
                      {formatBRL(item.totalInvoice)}
                    </span>
                  </div>
                </div>

                {/* Rodapé do Card com CTA */}
                <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-800/60">
                  <span className="text-[11px] text-slate-400 truncate">
                    Volume: <strong className="text-slate-200">{formatBRL(item.grossRevenue)}</strong>
                  </span>

                  <div className="flex items-center gap-1 text-emerald-400 font-bold group-hover:translate-x-1 transition shrink-0">
                    <span>Ver Histórico</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* NÍVEL 2: SEÇÃO EXCLUSIVA DO ESTABELECIMENTO SELECIONADO  */}
      {/* ======================================================== */}
      {selectedSalonId && activeSalonData && (
        <div className="space-y-4 animate-fadeIn">
          {/* Barra de Voltar & Identidade do Salão */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <button
                onClick={() => {
                  setSelectedSalonId(null);
                  setSearch('');
                  setStatusFilter('all');
                  setFilterType('all');
                }}
                className="flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition cursor-pointer self-start"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-400" />
                <span>Voltar para Todos os Estabelecimentos</span>
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleExportCSV(activeSalonData)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 border border-slate-700"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Exportar CSV do Salão</span>
                </button>

                <button
                  onClick={() => handleSendWhatsApp(activeSalonData)}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-white" />
                  <span>Enviar Fatura (WhatsApp)</span>
                </button>
              </div>
            </div>

            {/* Dados Principais do Salão */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg shrink-0 border border-emerald-500/30">
                  {activeSalonData.salon.trade_name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-white tracking-tight truncate">
                    {activeSalonData.salon.trade_name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-0.5">
                    <span className="font-mono text-emerald-400 font-medium">
                      {activeSalonData.salon.slug}.vagouapp.com
                    </span>
                    <span>•</span>
                    <span>WhatsApp: {activeSalonData.salon.phone_whatsapp || 'Não informado'}</span>
                    <span>•</span>
                    <span>Vencimento: Dia {activeSalonData.salon.billing_due_day || 10}</span>
                  </div>
                </div>
              </div>

              {/* Tag Modelo Comercial */}
              <div className="flex items-center gap-2 self-start lg:self-auto bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs shrink-0">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-400">Acordo Comercial:</span>
                <span className="font-bold text-white">
                  {activeSalonData.isSubscription
                    ? `Assinatura Fixa (${formatBRL(activeSalonData.salon.monthly_subscription_fee || 89.9)}/mês)`
                    : `Por Agendamento (${formatBRL(activeSalonData.feePerBooking)}/cada)`}
                </span>
              </div>
            </div>

            {/* Mini Dashboard de Métricas Deste Salão (5 cards responsivos incluindo CANCELADOS) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Total Agendados</span>
                <span className="text-lg font-bold text-white mt-0.5 block">{activeSalonData.appointmentsCount}</span>
                <span className="text-[10px] text-slate-400">Fluxo global do salão</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Concluídos (Válidos)</span>
                <span className="text-lg font-bold text-emerald-400 mt-0.5 block">{activeSalonData.billableCount}</span>
                <span className="text-[10px] text-emerald-500/80">Atendidos com sucesso</span>
              </div>

              {/* Card Cancelados do Salão */}
              <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30">
                <span className="text-[10px] font-bold text-rose-300 block uppercase">Cancelados / Isentos</span>
                <span className="text-lg font-extrabold text-rose-400 mt-0.5 block">{activeSalonData.cancelledCount}</span>
                <span className="text-[10px] text-rose-300/80">Zero taxa cobrada</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Volume do Salão</span>
                <span className="text-lg font-bold text-white mt-0.5 block">{formatBRL(activeSalonData.grossRevenue)}</span>
                <span className="text-[10px] text-slate-400">Recebido dos clientes</span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold text-emerald-300 block uppercase">Fatura Vagou</span>
                <span className="text-lg font-extrabold text-white mt-0.5 block">{formatBRL(activeSalonData.totalInvoice)}</span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {activeSalonData.isSubscription ? 'Mensalidade' : `${activeSalonData.billableCount} x ${formatBRL(activeSalonData.feePerBooking)}`}
                </span>
              </div>
            </div>
          </div>

          {/* Filtros da Tabela Exclusiva */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Buscar cliente titular, atendido, serviço, profissional ou protocolo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-xs text-white placeholder-slate-500 outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Status Select */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-emerald-500"
              >
                <option value="all">Todos os Status</option>
                <option value="concluido">Concluído</option>
                <option value="confirmado">Confirmado</option>
                <option value="em_atendimento">Em Atendimento</option>
                <option value="cancelado">Cancelado</option>
              </select>

              {/* Origem */}
              <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                    filterType === 'all' ? 'bg-emerald-500 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tudo
                </button>
                <button
                  onClick={() => setFilterType('radar')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                    filterType === 'radar' ? 'bg-emerald-500 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Zap className="w-3 h-3 text-amber-300" />
                  <span>Radar</span>
                </button>
                <button
                  onClick={() => setFilterType('standard')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                    filterType === 'standard' ? 'bg-emerald-500 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Agenda
                </button>
              </div>
            </div>
          </div>

          {/* Tabela do Histórico Completo de Agendamentos do Salão */}
          <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 select-none">
                  <tr>
                    <th className="py-3 px-3.5 font-semibold">Protocolo</th>
                    <th className="py-3 px-3 font-semibold">Cliente Titular & Atendido</th>
                    <th className="py-3 px-3 font-semibold">Serviço & Especialista</th>
                    <th className="py-3 px-3 font-semibold">Data / Horário</th>
                    <th className="py-3 px-3 font-semibold">Valor Serviço</th>
                    <th className="py-3 px-3 font-semibold">Taxa Vagou</th>
                    <th className="py-3 px-4 font-semibold text-right">Origem & Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredActiveSalonAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                        Nenhum agendamento encontrado para este estabelecimento neste período.
                      </td>
                    </tr>
                  ) : (
                    filteredActiveSalonAppointments.map((apt) => (
                      <tr key={apt.id} className="hover:bg-slate-800/40 transition">
                        {/* Protocolo */}
                        <td className="py-3 px-3.5">
                          <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-[11px]">
                            {apt.protocol}
                          </span>
                        </td>

                        {/* Titular e Atendido (Family Support) */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="font-medium text-slate-200 block truncate max-w-[150px]">{apt.client_name}</span>
                          </div>
                          {apt.beneficiary_name && apt.beneficiary_name !== apt.client_name ? (
                            <span className="text-[10px] text-amber-300 font-medium bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 inline-block mt-0.5">
                              Para: {apt.beneficiary_name}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono">{apt.client_phone}</span>
                          )}
                        </td>

                        {/* Serviço e Especialista */}
                        <td className="py-3 px-3">
                          <span className="text-slate-200 font-medium block truncate max-w-[190px]">{apt.service_title}</span>
                          <span className="text-[10px] text-emerald-400 block font-medium">
                            {apt.professional_name || 'Profissional'}
                          </span>
                        </td>

                        {/* Horário */}
                        <td className="py-3 px-3">
                          <span className="text-slate-200 font-mono text-[11px] font-semibold block">{apt.time_slot}</span>
                          <span className="text-[10px] text-slate-400 font-mono block">{apt.appointment_date}</span>
                        </td>

                        {/* Valor */}
                        <td className="py-3 px-3">
                          <span className="font-mono font-bold text-white text-xs">
                            {formatBRL(apt.price)}
                          </span>
                        </td>

                        {/* Taxa Vagou */}
                        <td className="py-3 px-3">
                          <span className="font-mono font-bold text-emerald-400 text-xs bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            {apt.status === 'cancelado' ? 'Isento' : formatBRL(apt.fee_charged)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {apt.is_radar_offer && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                <Zap className="w-2.5 h-2.5" />
                                Radar
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${getStatusBadge(apt.status)}`}>
                              {apt.status.replace('_', ' ')}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
