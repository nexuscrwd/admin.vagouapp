import React from 'react';
import {
  Menu,
  Search,
  RefreshCw,
  User,
  LogOut,
  UserPlus,
  Sun,
  Moon,
} from 'lucide-react';
import { AdminScreenId, SystemAdminUser, AdminAuthTab } from '../../types/admin';
import { UserAvatar } from '../common/UserAvatar';
import { useTheme } from '../../context/ThemeContext';

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
  const { isDark, toggleTheme } = useTheme();

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
      case 'forms':
        return 'Central de Formulários da Tríade';
      case 'settings':
        return 'Configurações do Sistema & DNS';
      default:
        return 'Painel de Controle';
    }
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 lg:px-6 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-xs dark:shadow-none transition-colors">
      {/* Left: Mobile trigger & Breadcrumbs */}
      <div className="flex items-center gap-3">
        {onOpenMobileSidebar && (
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <span>Admin Master</span>
            <span>/</span>
            <span className="text-emerald-600 dark:text-emerald-400 capitalize">{currentScreen}</span>
          </div>
          <h1 className="text-sm lg:text-base font-bold text-slate-900 dark:text-white tracking-tight">
            {getScreenTitle(currentScreen)}
          </h1>
        </div>
      </div>

      {/* Center/Right: Search bar, Theme toggle & Quick actions */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        <div className="hidden sm:flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 w-44 lg:w-64 focus-within:border-emerald-500 transition shadow-xs dark:shadow-none">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 mr-2 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Pesquisar salão, slug, responsável..."
            className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
          />
        </div>

        {/* Theme Switcher Button */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Alternar para Tema Claro' : 'Alternar para Tema Escuro'}
          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 text-amber-500 dark:text-amber-400 transition-all duration-150 cursor-pointer shadow-xs dark:shadow-none active:scale-95"
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>

        {/* Refresh Supabase Data */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Recarregar dados do banco de dados"
          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all duration-150 cursor-pointer disabled:opacity-50 shadow-xs dark:shadow-none active:scale-95"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
        </button>

        {/* Admin Auth Area */}
        {adminUser ? (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <button
              onClick={() => onOpenAuthModal && onOpenAuthModal('login')}
              className="flex items-center gap-2 hover:opacity-90 transition cursor-pointer text-left"
              title="Gerenciar Sessão de Administrador"
            >
              <UserAvatar
                name={adminUser.full_name}
                photoUrl={adminUser.avatar_url}
                size="sm"
              />
              <div className="hidden xl:block">
                <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight truncate max-w-[120px]">
                  {adminUser.full_name.split(' ')[0]}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-mono">@{adminUser.username}</span>
              </div>
            </button>

            {onLogout && (
              <button
                onClick={onLogout}
                title="Encerrar Sessão"
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 dark:bg-slate-800/80 dark:hover:bg-rose-950/40 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700/60 hover:border-rose-200 dark:hover:border-rose-900/60 transition-all duration-150 cursor-pointer ml-1 active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-800">
            <button
              onClick={() => onOpenAuthModal && onOpenAuthModal('login')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 border border-slate-200 dark:border-slate-700/80 shadow-xs dark:shadow-none"
            >
              <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Acessar</span>
            </button>

            <button
              onClick={() => onOpenAuthModal && onOpenAuthModal('register')}
              className="px-2.5 py-1.5 rounded-lg bg-[#20C933] hover:bg-[#1bb32d] text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
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
