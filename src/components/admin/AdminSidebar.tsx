import React, { useState } from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  CalendarCheck,
  Settings,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { AdminScreenId, SystemAdminUser, AdminAuthTab } from '../../types/admin';

interface AdminSidebarProps {
  currentScreen: AdminScreenId;
  onSelectScreen: (screen: AdminScreenId) => void;
  onCloseMobile?: () => void;
  pendingCount?: number;
  adminUser?: SystemAdminUser | null;
  onOpenAuthModal?: (tab?: AdminAuthTab) => void;
}

const SIDEBAR_COLLAPSED_KEY = 'vagou_admin_sidebar_collapsed';

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentScreen,
  onSelectScreen,
  onCloseMobile,
  pendingCount = 0,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

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
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'salons', label: 'Estabelecimentos', icon: Building2 },
    { id: 'users', label: 'Usuários', icon: Users },
    { id: 'appointments', label: 'Agendamentos', icon: CalendarCheck },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <aside
      className={`bg-slate-900 border-r border-slate-800 flex flex-col justify-between h-full select-none shrink-0 z-30 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-20' : 'w-[190px]'
      }`}
    >
      {/* Top Brand & Nav */}
      <div className={`p-3.5 space-y-5 ${isCollapsed ? 'px-2.5' : 'p-4'}`}>
        {/* Brand Header */}
        <div
          className={`flex items-center ${
            isCollapsed ? 'flex-col gap-3 justify-center' : 'justify-between'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              onClick={toggleCollapsed}
              className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-950/40 shrink-0 cursor-pointer hover:scale-105 transition active:scale-95"
              title={isCollapsed ? 'Expandir barra lateral' : 'Recolher para ícones'}
            >
              <span className="text-white font-black text-xl tracking-tighter">V</span>
            </div>

            {!isCollapsed && (
              <div className="min-w-0 animate-fadeIn">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm tracking-tight text-white font-['Poppins'] truncate">
                    VagouApp
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block font-medium truncate">
                  Painel de Admin
                </span>
              </div>
            )}
          </div>

          {/* Toggle Button (Desktop & Mobile) */}
          <div className="flex items-center gap-1">
            <button
              onClick={toggleCollapsed}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title={isCollapsed ? 'Expandir barra lateral' : 'Recolher para ícones'}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-emerald-400" />
              ) : (
                <PanelLeftClose className="w-4 h-4 text-slate-400 hover:text-white" />
              )}
            </button>

            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
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
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 block mb-2 animate-fadeIn">
              Gestão Soberana
            </span>
          )}

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectScreen(item.id);
                  onCloseMobile?.();
                }}
                title={item.label}
                className={`w-full flex items-center rounded-xl text-xs font-medium transition cursor-pointer relative group ${
                  isCollapsed ? 'justify-center p-3' : 'justify-between px-3 py-2.5'
                } ${
                  isActive
                    ? 'bg-emerald-500 text-white font-bold shadow-md shadow-emerald-950/50'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`font-bold transition shrink-0 ${
                      isCollapsed
                        ? 'absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-slate-900'
                        : `text-[10px] px-1.5 py-0.2 rounded-full ${
                            isActive
                              ? 'bg-white text-emerald-800'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`
                    }`}
                  >
                    {!isCollapsed && item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};
