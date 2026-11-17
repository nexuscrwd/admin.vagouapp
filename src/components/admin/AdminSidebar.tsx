import React, { useState } from 'react';
import {
  Home,
  Globe,
  Building2,
  Users,
  CalendarCheck,
  Settings,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronRight,
  Palette,
} from 'lucide-react';
import { AdminScreenId, SystemAdminUser, AdminAuthTab } from '../../types/admin';
import { VagouOfficialLogo } from '../common/VagouOfficialLogo';

export type FormsSubTabId =
  | 'estabelecimento_login'
  | 'estabelecimento_cadastro'
  | 'welcome_modal'
  | 'usuario_login'
  | 'usuario_cadastro'
  | 'embeds'
  | 'estabelecimento'
  | 'usuarios';

interface AdminSidebarProps {
  currentScreen: AdminScreenId;
  onSelectScreen: (screen: AdminScreenId) => void;
  onCloseMobile?: () => void;
  pendingCount?: number;
  adminUser?: SystemAdminUser | null;
  onOpenAuthModal?: (tab?: AdminAuthTab) => void;
  activeFormsTab?: FormsSubTabId;
  onSelectFormsTab?: (tab: FormsSubTabId) => void;
}

const SIDEBAR_COLLAPSED_KEY = 'vagou_admin_sidebar_collapsed';

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentScreen,
  onSelectScreen,
  onCloseMobile,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState<boolean>(true);

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {}
      return next;
    });
  };

  const menuItems: {
    id: AdminScreenId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'dashboard', label: 'Início', icon: Home },
    { id: 'users', label: 'Usuários', icon: Users },
    { id: 'salons', label: 'Estabelecimentos', icon: Building2 },
    { id: 'portal', label: 'Portal VAPP', icon: Globe },
    { id: 'appointments', label: 'Agendamentos', icon: CalendarCheck },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  const isPreferencesActive = currentScreen === 'preferences';

  return (
    <aside
      className={`admvapp-sidebar bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between h-full select-none shrink-0 z-30 transition-all duration-300 ease-in-out shadow-xs dark:shadow-none ${
        isCollapsed ? 'w-20' : 'w-[215px]'
      }`}
    >
      {/* Top Brand & Nav */}
      <div className={`p-3.5 space-y-4 ${isCollapsed ? 'px-2.5' : 'p-3.5'}`}>
        {/* Brand Header */}
        <div
          className={`flex items-center ${
            isCollapsed ? 'flex-col gap-3 justify-center' : 'justify-between'
          }`}
        >
          <div className="flex items-center min-w-0">
            <VagouOfficialLogo
              size={isCollapsed ? 'md' : 'xl'}
              variant={isCollapsed ? 'icon' : 'full'}
              className={isCollapsed ? '' : 'h-10 sm:h-11 w-auto max-w-[190px] object-contain'}
              onClick={toggleCollapsed}
              title={isCollapsed ? 'Expandir barra lateral' : 'Recolher para ícones'}
            />
          </div>

          {/* Toggle Button (Desktop & Mobile) */}
          <div className="flex items-center gap-1">
            <button
              onClick={toggleCollapsed}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title={isCollapsed ? 'Expandir barra lateral' : 'Recolher para ícones'}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-emerald-500" />
              ) : (
                <PanelLeftClose className="w-4 h-4 text-slate-400 hover:text-slate-700 dark:hover:text-white" />
              )}
            </button>

            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Fechar Menu"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1 overflow-y-auto max-h-[calc(100vh-90px)] custom-scrollbar pr-1">
          {!isCollapsed && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 block mb-2 animate-fadeIn">
              Gestão Soberana
            </span>
          )}

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isSettingsItem = item.id === 'settings';
            const isActive =
              currentScreen === item.id ||
              (isSettingsItem && currentScreen === 'preferences');

            return (
              <div key={item.id} className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    if (isSettingsItem && !isCollapsed) {
                      setIsSettingsMenuOpen((prev) => !prev);
                      onSelectScreen('settings');
                    } else {
                      onSelectScreen(item.id);
                    }
                    onCloseMobile?.();
                  }}
                  title={item.label}
                  className={`w-full flex items-center rounded-xl text-xs font-medium transition cursor-pointer relative group ${
                    isCollapsed ? 'justify-center p-3' : 'justify-between px-3 py-2.5'
                  } ${
                    isActive
                      ? 'bg-[#20C933] text-white font-bold shadow-md shadow-emerald-500/20'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive
                          ? 'text-white'
                          : 'text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>

                  {!isCollapsed && isSettingsItem && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsSettingsMenuOpen((prev) => !prev);
                      }}
                      className="p-0.5 rounded hover:bg-white/20 transition cursor-pointer"
                      title={
                        isSettingsMenuOpen
                          ? 'Recolher subitens de configurações'
                          : 'Expandir subitens de configurações'
                      }
                    >
                      {isSettingsMenuOpen ? (
                        <ChevronDown className="w-3.5 h-3.5 text-white/90" />
                      ) : (
                        <ChevronRight
                          className={`w-3.5 h-3.5 ${isActive ? 'text-white/90' : 'text-slate-400'}`}
                        />
                      )}
                    </div>
                  )}
                </button>

                {/* Subitem Limpo de Configurações -> Preferências */}
                {isSettingsItem && !isCollapsed && isSettingsMenuOpen && (
                  <div className="pl-2.5 pr-1 py-1 space-y-1 animate-fadeIn border-l-2 border-emerald-500/30 ml-3 my-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectScreen('preferences');
                        onCloseMobile?.();
                      }}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer text-left ${
                        isPreferencesActive
                          ? 'bg-[#20C933] text-white shadow-xs'
                          : 'text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <Palette
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isPreferencesActive ? 'text-white' : 'text-emerald-400'
                        }`}
                      />
                      <span className="truncate">Preferências</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};
