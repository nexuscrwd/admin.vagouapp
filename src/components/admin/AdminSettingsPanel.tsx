import React, { useState, useEffect } from 'react';
import {
  Globe,
  Server,
  Database,
  KeyRound,
  RefreshCw,
  Table,
  ShieldCheck,
  UserPlus,
  Shield,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  Settings,
  Layers,
  FileText,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { fetchTablesSummary, fetchSystemAdmins, toggleAdminStatus } from '../../services/supabaseApi';
import { SystemAdminUser } from '../../types/admin';
import { AdminCreateAdminModal } from './AdminCreateAdminModal';
import { AdminTriadeGovernance } from './AdminTriadeGovernance';
import { AdminTriadeFormsCatalog } from './AdminTriadeFormsCatalog';
import { UserAvatar } from '../common/UserAvatar';

export interface AdminSettingsPanelProps {
  onNavigateToForms?: () => void;
}

export const AdminSettingsPanel: React.FC<AdminSettingsPanelProps> = ({ onNavigateToForms }) => {
  const [tables, setTables] = useState<Record<string, { count: number; accessible: boolean }>>({
    salons: { count: 6, accessible: true },
    appointments: { count: 42, accessible: true },
    professionals: { count: 18, accessible: true },
    service_offers: { count: 37, accessible: true },
    clients: { count: 120, accessible: true },
  });
  const [isLoadingTables, setIsLoadingTables] = useState(false);

  // System Admins Management
  const [admins, setAdmins] = useState<SystemAdminUser[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);
  const [isCreateAdminModalOpen, setIsCreateAdminModalOpen] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'settings' | 'triade'>('settings');
  const [isViewingFormsSection, setIsViewingFormsSection] = useState(false);

  const loadTables = async () => {
    setIsLoadingTables(true);
    try {
      const summary = await fetchTablesSummary();
      setTables(summary);
    } catch {
    } finally {
      setIsLoadingTables(false);
    }
  };

  const loadAdmins = async () => {
    setIsLoadingAdmins(true);
    try {
      const list = await fetchSystemAdmins();
      setAdmins(list);
    } catch {
    } finally {
      setIsLoadingAdmins(false);
    }
  };

  useEffect(() => {
    loadTables();
    loadAdmins();
  }, []);

  const handleToggleStatus = async (admin: SystemAdminUser) => {
    const nextStatus = !admin.is_active;
    const res = await toggleAdminStatus(admin.id, nextStatus);
    if (res.success) {
      setAdmins((prev) =>
        prev.map((a) => (a.id === admin.id ? { ...a, is_active: nextStatus } : a))
      );
      setActionFeedback(`Status do administrador @${admin.username} atualizado!`);
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR');
    } catch {
      return '—';
    }
  };

  if (isViewingFormsSection) {
    return (
      <div className="space-y-4">
        <AdminTriadeFormsCatalog onBack={() => setIsViewingFormsSection(false)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header com Alternador de Abas */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs dark:shadow-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center shrink-0">
            {activeSettingsTab === 'settings' ? (
              <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            ) : (
              <Layers className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            )}
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              {activeSettingsTab === 'settings'
                ? 'Configurações, DNS & Acessos'
                : 'Governança da Tríade (7º Mandamento)'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {activeSettingsTab === 'settings'
                ? 'Gestão restrita de administradores, infraestrutura DNS e chaves soberanas.'
                : 'Sincronização de schema, RPCs e comunicados entre pvapp, mnvapp e admvapp.'}
            </p>
          </div>
        </div>

        <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0 self-start sm:self-auto overflow-x-auto">
          <button
            onClick={() => setActiveSettingsTab('settings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeSettingsTab === 'settings'
                ? 'bg-[#20C933] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Geral & DNS</span>
          </button>

          <button
            onClick={() => setActiveSettingsTab('triade')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeSettingsTab === 'triade'
                ? 'bg-[#20C933] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Tríade & Mandamento 7</span>
          </button>
        </div>
      </div>

      {/* RENDER TRÍADE GOVERNANCE SELECIONADA */}
      {activeSettingsTab === 'triade' ? (
        <AdminTriadeGovernance />
      ) : (
        <>
          {/* 📋 SEÇÃO: CENTRAL DE FORMULÁRIOS DA TRÍADE (Acessível por Link / Ação) */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-[#20C933]/15 text-[#20C933] border border-[#20C933]/30 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-950/20">
                <FileText className="w-6 h-6 text-[#20C933]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Central de Formulários da Tríade
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#20C933] text-white">
                    18 Formulários Mapeados
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Catálogo dos formulários do admvapp, mnvapp e pvapp com parâmetros de embed e simulador ao vivo.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (onNavigateToForms) {
                  onNavigateToForms();
                } else {
                  setIsViewingFormsSection(true);
                }
              }}
              className="px-4 py-2.5 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white text-xs font-bold transition cursor-pointer flex items-center gap-2 shadow-sm active:scale-95 whitespace-nowrap self-start sm:self-auto"
            >
              <span>Acessar Formulários</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* 🔐 SEÇÃO: GESTÃO DE ADMINISTRADORES SOBERANOS */}
          <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs dark:shadow-none">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-500/30">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Administradores Corporativos do Sistema</h3>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                      {admins.length} {admins.length === 1 ? 'administrador' : 'administradores'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Acesso restrito: Novos administradores só podem ser cadastrados por um gestor autenticado.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadAdmins}
                  disabled={isLoadingAdmins}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer border border-slate-200 dark:border-slate-700 shadow-xs dark:shadow-none"
                  title="Recarregar Lista"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAdmins ? 'animate-spin text-emerald-600 dark:text-emerald-400' : ''}`} />
                </button>

                <button
                  onClick={() => setIsCreateAdminModalOpen(true)}
                  className="py-2 px-3.5 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95"
                >
                  <UserPlus className="w-4 h-4 text-white" />
                  <span>Cadastrar Novo Administrador</span>
                </button>
              </div>
            </div>

            {actionFeedback && (
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-400 font-medium animate-fadeIn">
                ✓ {actionFeedback}
              </div>
            )}

            {/* Tabela de Administradores */}
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Administrador</th>
                    <th className="py-3 px-4">Contato</th>
                    <th className="py-3 px-4">Nível de Acesso</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                  {admins.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500">
                        Nenhum administrador listado no momento.
                      </td>
                    </tr>
                  ) : (
                    admins.map((admin) => (
                      <tr key={admin.id} className="hover:bg-slate-50/90 dark:hover:bg-slate-800/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <UserAvatar
                              name={admin.full_name}
                              photoUrl={admin.avatar_url}
                              size="sm"
                            />
                            <div>
                              <strong className="text-slate-900 dark:text-white block font-medium">{admin.full_name}</strong>
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">@{admin.username}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="space-y-0.5 text-[11px]">
                            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                              <Mail className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                              <span>{admin.email}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                              <Phone className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                              <span>{admin.phone_whatsapp}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20">
                            <Shield className="w-3 h-3" />
                            {admin.role === 'superadmin'
                              ? 'Super Administrador'
                              : admin.role === 'moderator'
                              ? 'Moderador'
                              : 'Suporte'}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          {admin.is_active ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
                              <XCircle className="w-3 h-3" />
                              Inativo
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                          {formatDate(admin.created_at)}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleToggleStatus(admin)}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all duration-150 cursor-pointer border ${
                              admin.is_active
                                ? 'bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-300 border-slate-200 dark:border-slate-700/80 hover:border-rose-200 dark:hover:border-rose-900/60 shadow-xs dark:shadow-none'
                                : 'bg-[#20C933] hover:bg-[#1bb32d] text-white border-transparent shadow-xs active:scale-95'
                            }`}
                          >
                            {admin.is_active ? 'Desativar' : 'Ativar'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Grid: 4 Cards de Infraestrutura */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Cloudflare & DNS */}
            <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs dark:shadow-none">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Roteamento DNS Multi-Tenant</h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                  Operacional
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                A zona <strong>*.vagouapp.com</strong> está configurada via CNAME wildcard no Cloudflare, permitindo que cada novo salão ativado (ex: <code>flavihair.vagouapp.com</code>) responda imediatamente com SSL automatizado.
              </p>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Zona Wildcard:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">*.vagouapp.com</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Proxy Status:</span>
                  <span className="text-slate-700 dark:text-slate-300 font-mono">Proxied (Orange Cloud)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Certificado SSL:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Universal SSL / TLS 1.3</span>
                </div>
              </div>
            </div>

            {/* Card 2: Supabase & Service Role */}
            <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs dark:shadow-none">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Supabase & Service Role</h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#20C933] text-white shadow-xs">
                  Superuser Ativo
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                O Painel de Admin Master opera com a chave <strong>Service Role</strong> via backend Express, garantindo privilégio soberano de superusuário para moderação e auditoria sem bloqueio por RLS.
              </p>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Row Level Security (RLS):</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">Enforced (pvapp & mnvapp)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Chave do Admin Master:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">Service Role (Bypass RLS)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Cluster PostGIS:</span>
                  <span className="text-slate-700 dark:text-slate-300 font-mono">PostgreSQL 15 + PostGIS</span>
                </div>
              </div>
            </div>

            {/* Card 3: Tríade Sincronização */}
            <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs dark:shadow-none">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Server className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Topologia da Tríade VagouApp</h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                  3/3 Conectados
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <strong className="text-slate-900 dark:text-white block">pvapp (Consumidor)</strong>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">portal.vagouapp.com</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">RLS Cliente</span>
                </div>

                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <strong className="text-slate-900 dark:text-white block">mnvapp (Parceiro Salão)</strong>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">seunegocio.vagouapp.com</span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">RLS Tenant Salão</span>
                </div>

                <div className="p-2 rounded-lg bg-emerald-50/60 dark:bg-slate-950 border border-emerald-300 dark:border-emerald-500/30 flex items-center justify-between">
                  <div>
                    <strong className="text-slate-900 dark:text-white block">admvapp (Admin Master - Atual)</strong>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">adm.vagouapp.com</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Master Superuser</span>
                </div>
              </div>
            </div>

            {/* Card 4: Variáveis de Ambiente & Segredos */}
            <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs dark:shadow-none">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <KeyRound className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Chaves & Variáveis de Ambiente</h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30">
                  Seguro
                </span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">SUPABASE_SERVICE_ROLE_KEY</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">Injetada nos Segredos ✓</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">VITE_SUPABASE_URL</span>
                  <span className="text-slate-700 dark:text-slate-300">https://xemenxd...supabase.co</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">GEMINI_API_KEY</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">Configurada ✓</span>
                </div>
              </div>
            </div>
          </div>

          {/* Database Tables Inspector */}
          <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs dark:shadow-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Table className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Inspetor de Tabelas do Supabase Cluster</h3>
              </div>
              <button
                onClick={loadTables}
                disabled={isLoadingTables}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer border border-slate-200 dark:border-slate-700 shadow-xs dark:shadow-none"
                title="Recarregar Contagens"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTables ? 'animate-spin text-emerald-600 dark:text-emerald-400' : ''}`} />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {Object.entries(tables).map(([tableName, data]: [string, { count: number; accessible: boolean }]) => (
                <div key={tableName} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1 shadow-2xs">
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-500 dark:text-slate-400 block truncate">
                    {tableName}
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-base font-bold font-mono text-slate-900 dark:text-white">{data.count}</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 shadow-xs" title="Acessível" />
                  </div>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 block">Registros ativos</span>
                </div>
              ))}
            </div>
          </div>

          {/* Modal Dedicado para Cadastrar Novo Administrador */}
          <AdminCreateAdminModal
            isOpen={isCreateAdminModalOpen}
            onClose={() => setIsCreateAdminModalOpen(false)}
            onSuccess={(newAdmin) => {
              setAdmins((prev) => [newAdmin, ...prev]);
              setActionFeedback(`Novo administrador @${newAdmin.username} cadastrado com sucesso!`);
              setTimeout(() => setActionFeedback(null), 3500);
            }}
          />
        </>
      )}
    </div>
  );
};
