import React, { useState } from 'react';
import {
  Home,
  Globe,
  Building2,
  Users,
  CalendarCheck,
  FileText,
  Settings,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronRight,
  Code,
  ShieldCheck,
} from 'lucide-react';
import { AdminScreenId, SystemAdminUser, AdminAuthTab } from '../../types/admin';
import { VagouOfficialLogo } from '../common/VagouOfficialLogo';

export type FormsSubTabId = 'cadastro_estabelecimento' | 'mnvapp_forms' | 'adminvapp_form' | 'embeds';

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
  activeFormsTab = 'cadastro_estabelecimento',
  onSelectFormsTab,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [isFormsMenuOpen, setIsFormsMenuOpen] = useState<boolean>(true);

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {}
      return next;
    });
  };

  const formsSubMenuItems: {
    id: FormsSubTabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'cadastro_estabelecimento', label: 'Estabelecimento', icon: Building2 },
    { id: 'mnvapp_forms', label: 'Forms Mnvapp', icon: Users },
    { id: 'adminvapp_form', label: 'Forms Admin', icon: ShieldCheck },
    { id: 'embeds', label: 'Embeds & iFrame', icon: Code },
  ];

  const menuItems: {
    id: AdminScreenId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'dashboard', label: 'Início', icon: Home },
    { id: 'salons', label: 'Estabelecimentos', icon: Building2 },
    { id: 'users', label: 'Usuários', icon: Users },
    { id: 'portal', label: 'Portal VAPP', icon: Globe },
    { id: 'appointments', label: 'Agendamentos', icon: CalendarCheck },
    { id: 'forms', label: 'Formulários', icon: FileText },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <aside
      className={`bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between h-full select-none shrink-0 z-30 transition-all duration-300 ease-in-out shadow-xs dark:shadow-none ${
        isCollapsed ? 'w-20' : 'w-[205px]'
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
          <div className="flex items-center gap-2.5 min-w-0">
            <VagouOfficialLogo
              size="md"
              onClick={toggleCollapsed}
              title={isCollapsed ? 'Expandir barra lateral' : 'Recolher para ícones'}
            />

            {!isCollapsed && (
              <div className="min-w-0 animate-fadeIn">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white font-['Poppins'] truncate">
                    VagouApp
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium truncate">
                  Painel de Admin
                </span>
              </div>
            )}
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
        <nav className="space-y-1">
          {!isCollapsed && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 block mb-2 animate-fadeIn">
              Gestão Soberana
            </span>
          )}

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentScreen === item.id;
            const isFormsItem = item.id === 'forms';

            return (
              <div key={item.id} className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    if (isFormsItem && !isCollapsed) {
                      if (currentScreen === 'forms') {
                        setIsFormsMenuOpen((prev) => !prev);
                      } else {
                        setIsFormsMenuOpen(true);
                        onSelectScreen('forms');
                      }
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
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white'}`} />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>

                  {!isCollapsed && isFormsItem && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsFormsMenuOpen((prev) => !prev);
                        if (currentScreen !== 'forms') {
                          onSelectScreen('forms');
                        }
                      }}
                      className="p-0.5 rounded hover:bg-white/20 transition cursor-pointer"
                      title={isFormsMenuOpen ? 'Recolher submenu' : 'Expandir submenu'}
                    >
                      {isFormsMenuOpen ? (
                        <ChevronDown className="w-3.5 h-3.5 text-white/90" />
                      ) : (
                        <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-white/90' : 'text-slate-400'}`} />
                      )}
                    </div>
                  )}
                </button>

                {/* Submenu de Formulários (Destumultuado & Organizado) */}
                {isFormsItem && !isCollapsed && isFormsMenuOpen && (
                  <div className="pl-4 pr-1 py-1 space-y-0.5 animate-fadeIn border-l-2 border-emerald-500/30 ml-4 my-1">
                    {formsSubMenuItems.map((sub) => {
                      const isSubActive = currentScreen === 'forms' && activeFormsTab === sub.id;
                      const SubIcon = sub.icon;

                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectFormsTab?.(sub.id);
                            onSelectScreen('forms');
                            onCloseMobile?.();
                          }}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] transition cursor-pointer text-left ${
                            isSubActive
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30 shadow-xs'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <SubIcon className={`w-3.5 h-3.5 shrink-0 ${isSubActive ? 'text-emerald-500' : 'text-slate-400'}`} />
                          <span className="truncate">{sub.label}</span>
                        </button>
                      );
                    })}
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
