import React from 'react';
import { Menu, Search, RefreshCw, Layers, ShieldCheck } from 'lucide-react';
import { AdminScreenId } from '../../types/admin';

interface AdminHeaderProps {
  currentScreen: AdminScreenId;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenMobileSidebar?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  currentScreen,
  searchQuery,
  onSearchChange,
  onRefresh,
  isRefreshing,
  onOpenMobileSidebar,
}) => {
  const getScreenTitle = (screen: AdminScreenId) => {
    switch (screen) {
      case 'dashboard':
        return 'Visão Geral do Ecossistema';
      case 'salons':
        return 'Gestão de Estabelecimentos';
      case 'moderation':
        return 'Moderação & Auditoria Cadastral';
      case 'appointments':
        return 'Monitor Global de Agendamentos & Radar';
      case 'triade':
        return 'Governança da Tríade & 7º Mandamento';
      case 'settings':
        return 'Configurações de DNS, Cloudflare & RLS';
      default:
        return 'Painel de Controle';
    }
  };

  return (
    <header className="h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 lg:px-6 flex items-center justify-between gap-4 sticky top-0 z-20">
      {/* Left: Mobile trigger (if any) & Breadcrumbs */}
      <div className="flex items-center gap-3">
        {onOpenMobileSidebar && (
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
            <span>Admin Master</span>
            <span>/</span>
            <span className="text-emerald-400 capitalize">{currentScreen}</span>
          </div>
          <h1 className="text-sm lg:text-base font-bold text-white tracking-tight">
            {getScreenTitle(currentScreen)}
          </h1>
        </div>
      </div>

      {/* Center/Right: Search bar & Quick actions */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 w-60 lg:w-80 focus-within:border-emerald-500 transition">
          <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Pesquisar salão, slug, responsável..."
            className="w-full bg-transparent text-xs text-white placeholder-slate-500 outline-none"
          />
        </div>

        {/* Refresh Supabase Data */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Recarregar dados do banco de dados"
          className="p-2 rounded-lg bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
        </button>

        {/* Service Role Pill */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Service Role</span>
        </div>

        {/* Admin Badge */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-xs shadow-md">
            AD
          </div>
          <div className="hidden xl:block text-left">
            <span className="text-xs font-bold text-white block leading-tight">Master Admin</span>
            <span className="text-[10px] text-emerald-400 block font-medium">adm.vagouapp.com</span>
          </div>
        </div>
      </div>
    </header>
  );
};
