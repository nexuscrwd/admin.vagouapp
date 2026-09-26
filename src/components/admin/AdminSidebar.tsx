import React from 'react';
import {
  LayoutDashboard,
  Building2,
  CalendarCheck,
  ShieldAlert,
  Settings,
  Store,
  ExternalLink,
  ShieldCheck,
  Radio,
  X,
  Layers,
  Sparkles,
  KeyRound,
} from 'lucide-react';
import { AdminScreenId } from '../../types/admin';

interface AdminSidebarProps {
  currentScreen: AdminScreenId;
  onSelectScreen: (screen: AdminScreenId) => void;
  onCloseMobile?: () => void;
  pendingCount?: number;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentScreen,
  onSelectScreen,
  onCloseMobile,
  pendingCount = 0,
}) => {
  const menuItems: {
    id: AdminScreenId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'salons', label: 'Estabelecimentos', icon: Building2 },
    { id: 'moderation', label: 'Moderação de Salões', icon: ShieldAlert, badge: pendingCount > 0 ? pendingCount : undefined },
    { id: 'appointments', label: 'Monitor de Agendamentos', icon: CalendarCheck },
    { id: 'triade', label: 'Governança da Tríade', icon: Layers },
    { id: 'settings', label: 'Configurações & DNS', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between h-full select-none shrink-0 z-30">
      {/* Top Brand & Nav */}
      <div className="p-4 space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-950/40">
              <span className="text-white font-black text-xl tracking-tighter">V</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-white font-['Poppins']">VagouApp</span>
                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500 text-white shadow-xs">
                  Master
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block font-medium">Painel de Admin</span>
            </div>
          </div>

          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 block mb-2">
            Gestão Soberana
          </span>
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
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500 text-white font-bold shadow-md shadow-emerald-950/50'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? 'bg-white text-emerald-800'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Tríade Ecosystem Links & Service Role Pill */}
      <div className="p-4 border-t border-slate-800/80 space-y-3">
        {/* Service Role Status Pill */}
        <div className="p-2.5 rounded-lg bg-slate-950 border border-emerald-500/30 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-200 font-medium">Service Role</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
            Ativo
          </span>
        </div>

        {/* Tríade Ecosystem External Links */}
        <div className="space-y-1">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 px-1 block">
            Ecossistema Tríade
          </span>

          <a
            href="https://portal.vagouapp.com"
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>pvapp (Consumidor)</span>
            </div>
            <ExternalLink className="w-3 h-3 text-slate-500" />
          </a>

          <a
            href="https://seunegocio.vagouapp.com"
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>mnvapp (Parceiro)</span>
            </div>
            <ExternalLink className="w-3 h-3 text-slate-500" />
          </a>
        </div>

        {/* Admin Profile */}
        <div className="pt-2 border-t border-slate-800 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold text-white block truncate">Super Administrador</span>
            <span className="text-[10px] text-slate-400 font-mono block truncate">adm.vagouapp.com</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
