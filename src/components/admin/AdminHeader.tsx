import React from 'react';
import {
  Menu,
  Search,
  RefreshCw,
  User,
  LogOut,
  UserPlus,
} from 'lucide-react';
import { AdminScreenId, SystemAdminUser, AdminAuthTab } from '../../types/admin';
import { UserAvatar } from '../common/UserAvatar';

interface AdminHeaderProps {
  currentScreen: AdminScreenId;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenMobileSidebar?: () => void;
  adminUser?: SystemAdminUser | null;
  onOpenAuthModal?: (tab?: AdminAuthTab) => void;
  onLogout?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  currentScreen,
  searchQuery,
  onSearchChange,
  onRefresh,
  isRefreshing,
  onOpenMobileSidebar,
  adminUser,
  onOpenAuthModal,
  onLogout,
}) => {
  const getScreenTitle = (screen: AdminScreenId) => {
    switch (screen) {
      case 'dashboard':
        return 'Visão Geral do Ecossistema';
      case 'salons':
        return 'Gestão de Estabelecimentos';
      case 'users':
        return 'Gestão Centralizada de Usuários';
      case 'moderation':
        return 'Moderação & Auditoria Cadastral';
      case 'appointments':
        return 'Agendamentos & Faturamento';
      case 'triade':
        return 'Governança da Tríade & 7º Mandamento';
      case 'settings':
        return 'Configurações do Sistema & DNS';
      default:
        return 'Painel de Controle';
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'AD';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div className="hidden sm:flex items-center bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 w-48 lg:w-72 focus-within:border-emerald-500 transition">
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

        {/* Admin Auth Area */}
        {adminUser ? (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <button
              onClick={() => onOpenAuthModal && onOpenAuthModal('login')}
              className="flex items-center gap-2 hover:opacity-90 transition cursor-pointer text-left"
              title="Gerenciar Sessão de Administrador"
            >
              <UserAvatar
                name={adminUser.full_name}
                size="sm"
              />
              <div className="hidden xl:block">
                <span className="text-xs font-bold text-white block leading-tight truncate max-w-[120px]">
                  {adminUser.full_name.split(' ')[0]}
                </span>
                <span className="text-[10px] text-emerald-400 block font-mono">@{adminUser.username}</span>
              </div>
            </button>

            {onLogout && (
              <button
                onClick={onLogout}
                title="Encerrar Sessão"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 transition cursor-pointer border border-slate-700/60 ml-1"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
            <button
              onClick={() => onOpenAuthModal && onOpenAuthModal('login')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 border border-slate-700/80"
            >
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>Acessar</span>
            </button>

            <button
              onClick={() => onOpenAuthModal && onOpenAuthModal('register')}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5 text-white" />
              <span className="hidden sm:inline">Cadastrar</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
