import React from 'react';
import {
  Building2,
  CalendarCheck,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ArrowUpRight,
} from 'lucide-react';
import { AdminDashboardMetrics } from '../../types/admin';

interface AdminKpiCardsProps {
  metrics: AdminDashboardMetrics;
  onFilterStatus?: (status: any) => void;
  onNavigateScreen?: (screen: any) => void;
}

export const AdminKpiCards: React.FC<AdminKpiCardsProps> = ({ metrics, onFilterStatus, onNavigateScreen }) => {
  const cards = [
    {
      id: 'total',
      title: 'Total de Salões',
      value: metrics.totalSalons,
      subtext: '+16.2% este mês',
      trend: 'positive',
      icon: Building2,
      iconBg: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
      actionStatus: 'all',
      targetScreen: 'salons',
    },
    {
      id: 'today_appts',
      title: 'Agendamentos Hoje',
      value: metrics.todayAppointments,
      subtext: '+8.4% vs ontem',
      trend: 'positive',
      icon: CalendarCheck,
      iconBg: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
      actionStatus: null,
      targetScreen: 'appointments',
    },
    {
      id: 'active',
      title: 'Salões Ativos',
      value: metrics.activeSalons,
      subtext: 'Operando normalmente',
      trend: 'neutral',
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
      actionStatus: 'active',
      targetScreen: 'salons',
    },
    {
      id: 'pending',
      title: 'Aguardando Moderação',
      value: metrics.pendingSalons + metrics.incompleteSalons,
      subtext: `${metrics.pendingSalons} pendentes • ${metrics.incompleteSalons} incompletos`,
      trend: metrics.pendingSalons > 0 ? 'warning' : 'neutral',
      icon: AlertTriangle,
      iconBg: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
      actionStatus: 'pending',
      targetScreen: 'salons',
    },
    {
      id: 'radar',
      title: 'Vagas no Radar Agora',
      value: metrics.activeFlashOffers,
      subtext: 'Ofertas com desconto ativas',
      trend: 'positive',
      icon: Zap,
      iconBg: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
      actionStatus: null,
      targetScreen: 'appointments',
    },
  ];

  const handleClick = (card: typeof cards[0]) => {
    if (card.targetScreen && onNavigateScreen) {
      onNavigateScreen(card.targetScreen);
    }
    if (card.actionStatus && onFilterStatus) {
      onFilterStatus(card.actionStatus);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            onClick={() => handleClick(card)}
            className="group relative p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md dark:hover:shadow-xl dark:hover:shadow-black/40 hover:-translate-y-0.5 transition-all duration-200 ease-out cursor-pointer active:scale-[0.99] select-none"
          >
            {/* Top border accent highlight on hover */}
            <div className="absolute top-0 left-3 right-3 h-[2px] bg-transparent group-hover:bg-emerald-500/40 rounded-full transition-colors duration-200" />

            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-tight group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                {card.title}
              </span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-transform duration-200 group-hover:scale-110 ${card.iconBg}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {card.value}
              </span>

              {card.trend === 'positive' && (
                <div className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20">
                  <ArrowUpRight className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>{card.subtext.split(' ')[0]}</span>
                </div>
              )}
            </div>

            <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 truncate group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
              {card.subtext}
            </div>
          </div>
        );
      })}
    </div>
  );
};
