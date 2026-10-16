import React from 'react';
import {
  Users,
  Building2,
  Globe,
  CalendarCheck,
  Settings,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { AdminScreenId, AdminDashboardMetrics, AdminSalonItem } from '../../types/admin';
import { VagouOfficialLogo } from '../common/VagouOfficialLogo';

interface AdminHomeScreenProps {
  metrics: AdminDashboardMetrics;
  salons: AdminSalonItem[];
  onNavigateScreen: (screen: AdminScreenId) => void;
  onOpenCreateSalon: () => void;
  onOpenCreateAdmin: () => void;
  onOpenSalonDetail: (salon: AdminSalonItem) => void;
}

export const AdminHomeScreen: React.FC<AdminHomeScreenProps> = ({
  metrics,
  salons,
  onNavigateScreen,
  onOpenCreateSalon,
  onOpenCreateAdmin,
  onOpenSalonDetail,
}) => {
  const pendingCount = metrics.pendingSalons + metrics.incompleteSalons;
  const recentSalons = salons.slice(0, 4);

  const navSections = [
    {
      id: 'salons' as AdminScreenId,
      title: 'Gestão de Estabelecimentos',
      description: 'Aprovação de cadastros, moderação, selos de verificado e edição de salões.',
      icon: Building2,
      badge: salons.length,
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      accentColor: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
      borderColor: 'hover:border-emerald-500/40',
      buttonBg: 'bg-[#20C933] hover:bg-[#1bb32d] text-white',
      buttonText: 'Acessar Estabelecimentos',
      quickAction: {
        label: 'Aprovar / Moderar',
        count: pendingCount,
        highlight: pendingCount > 0,
      },
    },
    {
      id: 'users' as AdminScreenId,
      title: 'Gestão de Usuários',
      description: 'Controle de perfis, administradores, clientes e profissionais do ecossistema.',
      icon: Users,
      badge: 'CRUD Master',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      accentColor: 'from-blue-500/20 via-blue-500/5 to-transparent',
      borderColor: 'hover:border-blue-500/40',
      buttonBg: 'bg-blue-600 hover:bg-blue-500 text-white',
      buttonText: 'Gerenciar Usuários',
      quickAction: {
        label: 'Adicionar Admin',
        onClick: onOpenCreateAdmin,
      },
    },
    {
      id: 'portal' as AdminScreenId,
      title: 'Portal VAPP',
      description: 'Gestão das vitrines públicas, slugs, subdomínios e categorias do aplicativo.',
      icon: Globe,
      badge: 'Wildcard DNS',
      badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      accentColor: 'from-indigo-500/20 via-indigo-500/5 to-transparent',
      borderColor: 'hover:border-indigo-500/40',
      buttonBg: 'bg-indigo-600 hover:bg-indigo-500 text-white',
      buttonText: 'Acessar Portal VAPP',
    },
    {
      id: 'appointments' as AdminScreenId,
      title: 'Monitor de Agendamentos',
      description: 'Acompanhamento em tempo real de agendamentos, vagas relâmpago e ofertas do Radar.',
      icon: CalendarCheck,
      badge: `${metrics.todayAppointments} Hoje`,
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      accentColor: 'from-amber-500/20 via-amber-500/5 to-transparent',
      borderColor: 'hover:border-amber-500/40',
      buttonBg: 'bg-amber-600 hover:bg-amber-500 text-white',
      buttonText: 'Ver Agendamentos',
    },
    {
      id: 'settings' as AdminScreenId,
      title: 'Configurações & Governança',
      description: 'Sincronização da Tríade, comunicados técnicos, logs de auditoria e infraestrutura.',
      icon: Settings,
      badge: 'Cluster Supabase',
      badgeColor: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
      accentColor: 'from-slate-500/20 via-slate-500/5 to-transparent',
      borderColor: 'hover:border-slate-500/40',
      buttonBg: 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700',
      buttonText: 'Configurações do Sistema',
    },
    {
      id: 'forms' as AdminScreenId,
      title: 'Central de Formulários da Tríade',
      description: 'Modelos de onboarding, termos de uso, formulários de adesão e cadastros unificados.',
      icon: FileText,
      badge: 'Tríade v2.2.0',
      badgeColor: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
      accentColor: 'from-teal-500/20 via-teal-500/5 to-transparent',
      borderColor: 'hover:border-teal-500/40',
      buttonBg: 'bg-teal-600 hover:bg-teal-500 text-white',
      buttonText: 'Abrir Formulários',
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 🏛️ Banner de Boas-Vindas Executivo com Logotipo Oficial */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <VagouOfficialLogo size="xl" className="shadow-lg shadow-emerald-500/20" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight font-['Poppins']">
                Painel Corporativo Soberano
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#20C933] text-white">
                VagouApp
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Governança em tempo real dos ecossistemas <span className="text-emerald-400 font-mono">portal.vagouapp.com</span> e <span className="text-emerald-400 font-mono">seunegocio.vagouapp.com</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={onOpenCreateSalon}
            className="px-3.5 py-2 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
          >
            <span>+ Novo Estabelecimento</span>
          </button>
        </div>
      </div>

      {/* Grid Principal com Todas as Seções do Sistema em Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {navSections.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.id}
                role="button"
                tabIndex={0}
                onClick={() => onNavigateScreen(section.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onNavigateScreen(section.id);
                  }
                }}
                className={`group relative p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/90 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer overflow-hidden ${section.borderColor}`}
              >
                {/* Efeito sutil de brilho/gradiente na borda superior */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 pointer-events-none bg-gradient-to-r ${section.accentColor} opacity-50 group-hover:opacity-100 transition-opacity`}
                />

                <div className="space-y-4">
                  {/* Topo do Card: Ícone e Badge */}
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                      <Icon className="w-5 h-5 text-emerald-500 group-hover:text-emerald-400" />
                    </div>

                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full border font-mono ${section.badgeColor}`}
                    >
                      {section.badge}
                    </span>
                  </div>

                  {/* Informações */}
                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">
                      {section.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {section.description}
                    </p>
                  </div>
                </div>

                {/* Rodapé do Card com Ação */}
                <div className="pt-5 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-emerald-400 transition-colors flex items-center gap-1">
                    <span>Acessar módulo</span>
                    <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                  </span>

                  {section.quickAction && section.quickAction.count !== undefined && section.quickAction.count > 0 && (
                    <span className="text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full animate-pulse">
                      {section.quickAction.count} pendentes
                    </span>
                  )}

                  {section.quickAction && section.quickAction.onClick && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        section.quickAction?.onClick?.();
                      }}
                      className="text-[11px] font-bold bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded-lg transition cursor-pointer"
                    >
                      {section.quickAction.label}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
    </div>
  );
};
