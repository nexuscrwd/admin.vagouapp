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
  Code,
  KeyRound,
  UserPlus,
  Sparkles,
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
  // Compatibilidade legada
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
  activeFormsTab = 'estabelecimento_cadastro',
  onSelectFormsTab,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState<boolean>(true);
  const [isEstabGroupOpen, setIsEstabGroupOpen] = useState<boolean>(true);
  const [isUserGroupOpen, setIsUserGroupOpen] = useState<boolean>(true);

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
    { id: 'salons', label: 'Estabelecimentos', icon: Building2 },
    { id: 'users', label: 'Usuários', icon: Users },
    { id: 'portal', label: 'Portal VAPP', icon: Globe },
    { id: 'appointments', label: 'Agendamentos', icon: CalendarCheck },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  const isEstabActive =
    currentScreen === 'forms' &&
    (activeFormsTab === 'estabelecimento_login' ||
      activeFormsTab === 'estabelecimento_cadastro' ||
      activeFormsTab === 'welcome_modal' ||
      activeFormsTab === 'estabelecimento');

  const isUserActive =
    currentScreen === 'forms' &&
    (activeFormsTab === 'usuario_login' ||
      activeFormsTab === 'usuario_cadastro' ||
      activeFormsTab === 'usuarios');

  const isEmbedsActive = currentScreen === 'forms' && activeFormsTab === 'embeds';
  const isWelcomeActive = currentScreen === 'forms' && activeFormsTab === 'welcome_modal';

  return (
    <aside
      className={`bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between h-full select-none shrink-0 z-30 transition-all duration-300 ease-in-out shadow-xs dark:shadow-none ${
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
            const isActive = currentScreen === item.id || (isSettingsItem && currentScreen === 'forms');

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
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white'}`} />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>

                  {!isCollapsed && isSettingsItem && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsSettingsMenuOpen((prev) => !prev);
                      }}
                      className="p-0.5 rounded hover:bg-white/20 transition cursor-pointer"
                      title={isSettingsMenuOpen ? 'Recolher subitens de configurações' : 'Expandir subitens de configurações'}
                    >
                      {isSettingsMenuOpen ? (
                        <ChevronDown className="w-3.5 h-3.5 text-white/90" />
                      ) : (
                        <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-white/90' : 'text-slate-400'}`} />
                      )}
                    </div>
                  )}
                </button>

                {/* Árvore Hierárquica de Configurações -> Estabelecimento & Usuário */}
                {isSettingsItem && !isCollapsed && isSettingsMenuOpen && (
                  <div className="pl-2.5 pr-1 py-1 space-y-1.5 animate-fadeIn border-l-2 border-emerald-500/30 ml-3 my-1">
                    {/* GRUPO 1: ESTABELECIMENTO */}
                    <div className="space-y-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsEstabGroupOpen((prev) => !prev);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer text-left ${
                          isEstabActive
                            ? 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30'
                            : 'text-slate-400 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Building2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                          <span className="truncate">Estabelecimento</span>
                        </div>
                        {isEstabGroupOpen ? (
                          <ChevronDown className="w-3 h-3 shrink-0 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-3 h-3 shrink-0 text-slate-400" />
                        )}
                      </button>

                      {isEstabGroupOpen && (
                        <div className="pl-3 space-y-0.5 border-l border-slate-700/60 ml-2.5 pt-0.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectFormsTab?.('estabelecimento_login');
                              onSelectScreen('forms');
                              onCloseMobile?.();
                            }}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] transition cursor-pointer text-left ${
                              currentScreen === 'forms' && activeFormsTab === 'estabelecimento_login'
                                ? 'bg-[#20C933] text-white font-bold shadow-xs'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                            }`}
                          >
                            <KeyRound
                              className={`w-3 h-3 shrink-0 ${
                                currentScreen === 'forms' && activeFormsTab === 'estabelecimento_login'
                                  ? 'text-white'
                                  : 'text-emerald-400'
                              }`}
                            />
                            <span className="truncate">Login Estabelecimento</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectFormsTab?.('estabelecimento_cadastro');
                              onSelectScreen('forms');
                              onCloseMobile?.();
                            }}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] transition cursor-pointer text-left ${
                              currentScreen === 'forms' &&
                              (activeFormsTab === 'estabelecimento_cadastro' || activeFormsTab === 'estabelecimento')
                                ? 'bg-[#20C933] text-white font-bold shadow-xs'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                            }`}
                          >
                            <Building2
                              className={`w-3 h-3 shrink-0 ${
                                currentScreen === 'forms' &&
                                (activeFormsTab === 'estabelecimento_cadastro' || activeFormsTab === 'estabelecimento')
                                  ? 'text-white'
                                  : 'text-emerald-400'
                              }`}
                            />
                            <span className="truncate">Cadastro Estabelecimento</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectFormsTab?.('welcome_modal');
                              onSelectScreen('forms');
                              onCloseMobile?.();
                            }}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] transition cursor-pointer text-left ${
                              isWelcomeActive
                                ? 'bg-[#20C933] text-white font-bold shadow-xs'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                            }`}
                          >
                            <Sparkles
                              className={`w-3 h-3 shrink-0 ${
                                isWelcomeActive ? 'text-white' : 'text-emerald-400'
                              }`}
                            />
                            <span className="truncate">Modal Boas-Vindas</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* GRUPO 2: USUÁRIO */}
                    <div className="space-y-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsUserGroupOpen((prev) => !prev);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer text-left ${
                          isUserActive
                            ? 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30'
                            : 'text-slate-400 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Users className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                          <span className="truncate">Usuário</span>
                        </div>
                        {isUserGroupOpen ? (
                          <ChevronDown className="w-3 h-3 shrink-0 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-3 h-3 shrink-0 text-slate-400" />
                        )}
                      </button>

                      {isUserGroupOpen && (
                        <div className="pl-3 space-y-0.5 border-l border-slate-700/60 ml-2.5 pt-0.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectFormsTab?.('usuario_login');
                              onSelectScreen('forms');
                              onCloseMobile?.();
                            }}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] transition cursor-pointer text-left ${
                              currentScreen === 'forms' && activeFormsTab === 'usuario_login'
                                ? 'bg-[#20C933] text-white font-bold shadow-xs'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                            }`}
                          >
                            <KeyRound
                              className={`w-3 h-3 shrink-0 ${
                                currentScreen === 'forms' && activeFormsTab === 'usuario_login'
                                  ? 'text-white'
                                  : 'text-emerald-400'
                              }`}
                            />
                            <span className="truncate">Login Usuário</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectFormsTab?.('usuario_cadastro');
                              onSelectScreen('forms');
                              onCloseMobile?.();
                            }}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] transition cursor-pointer text-left ${
                              currentScreen === 'forms' &&
                              (activeFormsTab === 'usuario_cadastro' || activeFormsTab === 'usuarios')
                                ? 'bg-[#20C933] text-white font-bold shadow-xs'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                            }`}
                          >
                            <UserPlus
                              className={`w-3 h-3 shrink-0 ${
                                currentScreen === 'forms' &&
                                (activeFormsTab === 'usuario_cadastro' || activeFormsTab === 'usuarios')
                                  ? 'text-white'
                                  : 'text-emerald-400'
                              }`}
                            />
                            <span className="truncate">Cadastro Usuário</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* ITEM 3: EMBEDS & IFRAME */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectFormsTab?.('embeds');
                        onSelectScreen('forms');
                        onCloseMobile?.();
                      }}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer text-left ${
                        isEmbedsActive
                          ? 'bg-[#20C933] text-white shadow-xs'
                          : 'text-slate-400 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <Code className={`w-3.5 h-3.5 shrink-0 ${isEmbedsActive ? 'text-white' : 'text-emerald-400'}`} />
                      <span className="truncate">Embeds & iFrame</span>
                    </button>

                    {/* ITEM 4: MODAL DE BOAS-VINDAS (ACESSO DIRETO) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectFormsTab?.('welcome_modal');
                        onSelectScreen('forms');
                        onCloseMobile?.();
                      }}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer text-left ${
                        isWelcomeActive
                          ? 'bg-[#20C933] text-white shadow-xs'
                          : 'text-slate-400 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <Sparkles className={`w-3.5 h-3.5 shrink-0 ${isWelcomeActive ? 'text-white' : 'text-emerald-400'}`} />
                      <span className="truncate">Modal Boas-Vindas</span>
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
