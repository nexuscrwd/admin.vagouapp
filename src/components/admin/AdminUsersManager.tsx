import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  ShieldCheck,
  Building2,
  Scissors,
  Search,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  User,
  UserPlus,
  Info,
} from 'lucide-react';
import {
  UserCategoryTab,
  SystemAdminUser,
  UserClientItem,
  UserFamilyDependent,
  UserSalonAccessItem,
  UserProfessionalItem,
} from '../../types/admin';
import {
  fetchSystemAdmins,
  toggleAdminStatus,
  updateAdminRole,
  fetchAdminClients,
  unlinkClientDependent,
  fetchAdminSalonUsers,
  fetchAdminProfessionals,
  unlinkProfessionalFromSalon,
} from '../../services/supabaseApi';
import { AdminCreateAdminModal } from './AdminCreateAdminModal';
import { UserAvatar } from '../common/UserAvatar';
import { UnifiedRegistrationForm } from '../public/UnifiedRegistrationForm';

export const AdminUsersManager: React.FC = () => {
  // Aba ativa (Padrão: Clientes)
  const [activeTab, setActiveTab] = useState<UserCategoryTab>('clients');

  // Dados
  const [admins, setAdmins] = useState<SystemAdminUser[]>([]);
  const [clients, setClients] = useState<UserClientItem[]>([]);
  const [salonUsers, setSalonUsers] = useState<UserSalonAccessItem[]>([]);
  const [professionals, setProfessionals] = useState<UserProfessionalItem[]>([]);

  // Estados de carregamento e busca
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Modais de Criação / Edição
  const [isCreateAdminModalOpen, setIsCreateAdminModalOpen] = useState(false);
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);

  // Carregar dados
  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [admList, cliList, slnUsrList, profList] = await Promise.all([
        fetchSystemAdmins(),
        fetchAdminClients(),
        fetchAdminSalonUsers(),
        fetchAdminProfessionals(),
      ]);
      setAdmins(admList);
      setClients(cliList);
      setSalonUsers(slnUsrList);
      setProfessionals(profList);
    } catch (err) {
      console.warn('Erro ao carregar usuários:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const triggerFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  // Handlers para Administradores
  const handleToggleAdminStatus = async (admin: SystemAdminUser) => {
    const nextStatus = !admin.is_active;
    const res = await toggleAdminStatus(admin.id, nextStatus);
    if (res.success) {
      setAdmins((prev) =>
        prev.map((a) => (a.id === admin.id ? { ...a, is_active: nextStatus } : a))
      );
      triggerFeedback(`Status do administrador @${admin.username} atualizado para ${nextStatus ? 'Ativo' : 'Inativo'}.`);
    }
  };

  const handlePromoteAdmin = async (admin: SystemAdminUser, newRole: SystemAdminUser['role']) => {
    const res = await updateAdminRole(admin.id, newRole);
    if (res.success) {
      setAdmins((prev) =>
        prev.map((a) => (a.id === admin.id ? { ...a, role: newRole } : a))
      );
      triggerFeedback(`Privilégios de @${admin.username} atualizados para ${newRole === 'superadmin' ? 'Superadmin' : newRole === 'moderator' ? 'Moderador' : 'Suporte'}.`);
    }
  };

  // Handlers para Dependentes / Conta Família
  const handleUnlinkDependent = async (dep: UserFamilyDependent) => {
    if (
      !confirm(
        `Desvincular dependente "${dep.full_name}" do titular?\n\nO registro e histórico de agendamentos no banco continuarão preservados conforme a Lei da Tríade.`
      )
    ) {
      return;
    }

    const res = await unlinkClientDependent(dep.id);
    if (res.success) {
      setClients((prev) =>
        prev.map((c) => ({
          ...c,
          dependents: c.dependents.map((d) => (d.id === dep.id ? { ...d, is_unlinked: true } : d)),
        }))
      );
      triggerFeedback(`Dependente "${dep.full_name}" desvinculado com sucesso. Registro histórico preservado.`);
    }
  };

  // Handlers para Prestadores
  const handleUnlinkProfessional = async (prof: UserProfessionalItem) => {
    if (!prof.current_salon_id) return;
    if (
      !confirm(
        `Desvincular o profissional "${prof.full_name}" do estabelecimento "${prof.current_salon_name}"?\n\nO profissional permanecerá registrado no banco para atuar em outros salões da rede.`
      )
    ) {
      return;
    }

    const res = await unlinkProfessionalFromSalon(prof.id, prof.current_salon_id);
    if (res.success) {
      setProfessionals((prev) =>
        prev.map((p) =>
          p.id === prof.id
            ? { ...p, current_salon_id: undefined, current_salon_name: undefined }
            : p
        )
      );
      triggerFeedback(`Profissional "${prof.full_name}" desvinculado do salão. Registro global ativo.`);
    }
  };

  // Filtros em memória
  const q = search.trim().toLowerCase();

  const filteredAdmins = useMemo(() => {
    if (!q) return admins;
    return admins.filter(
      (a) =>
        (a.full_name?.toLowerCase() || '').includes(q) ||
        (a.username?.toLowerCase() || '').includes(q) ||
        (a.email?.toLowerCase() || '').includes(q)
    );
  }, [admins, q]);

  const filteredClients = useMemo(() => {
    if (!q) return clients;
    return clients.filter(
      (c) =>
        (c.full_name?.toLowerCase() || '').includes(q) ||
        (c.email?.toLowerCase() || '').includes(q) ||
        (c.phone || '').includes(q) ||
        (c.dependents || []).some((d) => (d.full_name?.toLowerCase() || '').includes(q))
    );
  }, [clients, q]);

  const filteredSalonUsers = useMemo(() => {
    if (!q) return salonUsers;
    return salonUsers.filter(
      (su) =>
        (su.full_name?.toLowerCase() || '').includes(q) ||
        (su.email?.toLowerCase() || '').includes(q) ||
        (su.salon_name?.toLowerCase() || '').includes(q) ||
        (su.phone_whatsapp || '').includes(q)
    );
  }, [salonUsers, q]);

  const filteredProfessionals = useMemo(() => {
    if (!q) return professionals;
    return professionals.filter(
      (p) =>
        (p.full_name?.toLowerCase() || '').includes(q) ||
        (p.nickname?.toLowerCase() || '').includes(q) ||
        (p.current_salon_name?.toLowerCase() || '').includes(q) ||
        (p.phone_whatsapp || '').includes(q)
    );
  }, [professionals, q]);

  // Contadores
  const totalDependentsCount = clients.reduce((acc, c) => acc + c.dependents.length, 0);

  return (
    <div className="space-y-4">
      {/* Top Banner de Governança de Usuários */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-xs dark:shadow-none">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Gestão Centralizada de Usuários & Contas
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              CRUD global com controle granular de privilégios e preservação histórica de titulares e colaboradores.
            </p>
          </div>
        </div>

        {/* Botão de Atualizar, Cadastrar Usuário & Adicionar Admin */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={loadAll}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer border border-slate-200 dark:border-slate-700 shadow-xs dark:shadow-none"
            title="Recarregar Dados"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600 dark:text-emerald-400' : ''}`} />
          </button>

          <button
            onClick={() => setIsRegistrationModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer active:scale-95"
            title="Cadastrar novo usuário no ecossistema Vagou"
          >
            <UserPlus className="w-4 h-4 text-white" />
            <span>Cadastrar Usuário</span>
          </button>

          {activeTab === 'admins' && (
            <button
              onClick={() => setIsCreateAdminModalOpen(true)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition flex items-center gap-1.5 border border-slate-700 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Novo Admin</span>
            </button>
          )}
        </div>
      </div>

      {/* Alerta de Feedback de Ações */}
      {actionFeedback && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-400 font-semibold animate-fadeIn flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Caixa de Regra de Negócio: Preservação de Identidade & Unlink */}
      <div className="p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-500/30 flex items-start gap-3 text-xs text-blue-900 dark:text-slate-300 shadow-xs">
        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-blue-950 dark:text-blue-300 block">Regra de Ouro da Tríade: Desvinculação com Preservação Global</strong>
          <span>
            Ao desvincular um dependente de um titular ou dispensar um profissional de um salão, os registros <strong>jamais são deletados fisicamente do banco</strong>. O histórico de atendimentos, faturas e auditoria fiscal permanece 100% íntegro.
          </span>
          <span className="block text-[11px] text-emerald-700 dark:text-emerald-400 font-mono pt-0.5">
            ✓ Sincronização de Sessão Ativa: Dados cadastrais mestres (e-mail, telefone e nome) 100% pareados com o Supabase conforme Comunicado Técnico do mnvapp.
          </span>
        </div>
      </div>

      {/* Navegação por Abas (4 Categorias de Usuários do Sistema) */}
      <div className="p-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-1 shadow-xs dark:shadow-none">
        <button
          onClick={() => {
            setActiveTab('clients');
            setSearch('');
          }}
          className={`flex-1 min-w-[140px] py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'clients'
              ? 'bg-[#20C933] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Clientes & Família ({clients.length} + {totalDependentsCount} dep)</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('professionals');
            setSearch('');
          }}
          className={`flex-1 min-w-[140px] py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'professionals'
              ? 'bg-[#20C933] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Scissors className="w-4 h-4" />
          <span>Profissionais da Rede ({professionals.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('salon_users');
            setSearch('');
          }}
          className={`flex-1 min-w-[140px] py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'salon_users'
              ? 'bg-[#20C933] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Proprietários & Gestores ({salonUsers.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('admins');
            setSearch('');
          }}
          className={`flex-1 min-w-[140px] py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'admins'
              ? 'bg-[#20C933] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Admins do Portal ({admins.length})</span>
        </button>
      </div>

      {/* Barra de Busca Universal */}
      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shadow-xs dark:shadow-none">
        <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 flex-1 max-w-md shadow-xs dark:shadow-none">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 mr-2 shrink-0" />
          <input
            type="text"
            placeholder={
              activeTab === 'admins'
                ? 'Buscar administrador por nome, usuário ou e-mail...'
                : activeTab === 'clients'
                ? 'Buscar cliente titular ou dependente familiar...'
                : activeTab === 'salon_users'
                ? 'Buscar usuário do salão ou nome do estabelecimento...'
                : 'Buscar prestador, especialidade ou salão vinculado...'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
          />
        </div>

        <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline font-mono">
          {activeTab === 'admins' && `${filteredAdmins.length} registros`}
          {activeTab === 'clients' && `${filteredClients.length} titulares`}
          {activeTab === 'salon_users' && `${filteredSalonUsers.length} credenciais`}
          {activeTab === 'professionals' && `${filteredProfessionals.length} profissionais`}
        </span>
      </div>

      {/* ======================================================== */}
      {/* ABA 1: ADMINISTRADORES (PROMOÇÃO A GERENCIADOR / LIMITADO)*/}
      {/* ======================================================== */}
      {activeTab === 'admins' && (
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs dark:shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-100 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800 select-none">
                <tr>
                  <th className="py-3 px-4 font-semibold">Administrador</th>
                  <th className="py-3 px-4 font-semibold">Contato</th>
                  <th className="py-3 px-4 font-semibold">Nível / Privilégios</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Ações & Promoção</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                {filteredAdmins.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 dark:text-slate-400">
                      Nenhum administrador encontrado com o termo pesquisado.
                    </td>
                  </tr>
                ) : (
                  filteredAdmins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50 transition">
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
                        <div className="text-[11px] space-y-0.5">
                          <span className="text-slate-800 dark:text-slate-200 block">{admin.email}</span>
                          <span className="text-slate-500 dark:text-slate-400 font-mono block">{admin.phone_whatsapp}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                            admin.role === 'superadmin'
                              ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30'
                              : admin.role === 'moderator'
                              ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {admin.role === 'superadmin' ? 'Superadmin Master' : admin.role === 'moderator' ? 'Moderador de Salões' : 'Suporte Operacional'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            admin.is_active
                              ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                              : 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${admin.is_active ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-rose-500 dark:bg-rose-400'}`} />
                          {admin.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botão de Toggle Ativo/Inativo */}
                          <button
                            onClick={() => handleToggleAdminStatus(admin)}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition cursor-pointer border ${
                              admin.is_active
                                ? 'bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'
                                : 'bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                            }`}
                          >
                            {admin.is_active ? 'Suspender' : 'Reativar'}
                          </button>

                          {/* Seletor de Papel / Promoção */}
                          <select
                            value={admin.role}
                            onChange={(e) => handlePromoteAdmin(admin, e.target.value as any)}
                            className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[10px] text-slate-800 dark:text-slate-300 rounded px-1.5 py-1 outline-none cursor-pointer"
                          >
                            <option value="superadmin">Superadmin</option>
                            <option value="moderator">Moderador</option>
                            <option value="support">Suporte</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 2: USUÁRIOS CLIENTES (E SEUS DEPENDENTES DA FAMÍLIA) */}
      {/* ======================================================== */}
      {activeTab === 'clients' && (
        <div className="space-y-3">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition shadow-xs dark:shadow-none"
            >
              {/* Header do Titular */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-slate-200 dark:border-slate-800/80">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    photoUrl={client.avatar_url}
                    name={client.full_name}
                    size="lg"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm tracking-tight">{client.full_name}</h3>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 uppercase">
                        Titular
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <span>{client.email}</span>
                      <span>•</span>
                      <span className="font-mono">{client.phone}</span>
                      <span>•</span>
                      <span className="capitalize">Login: {client.auth_provider}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
                  <span className="text-slate-500 dark:text-slate-400">
                    Agendamentos: <strong className="text-slate-900 dark:text-white">{client.total_appointments}</strong>
                  </span>
                  {client.no_show_count > 0 && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                      {client.no_show_count} no-shows
                    </span>
                  )}
                </div>
              </div>

              {/* Lista de Dependentes Vinculados ao Titular */}
              <div className="bg-slate-50 dark:bg-slate-950/70 p-3 rounded-lg border border-slate-200 dark:border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium pb-1 border-b border-slate-200 dark:border-slate-800/50">
                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Dependentes Cadastrados ({client.dependents.length})</span>
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Conta Família</span>
                </div>

                {client.dependents.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-1">Nenhum dependente cadastrado por este titular.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                    {client.dependents.map((dep) => (
                      <div
                        key={dep.id}
                        className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 text-xs transition shadow-2xs ${
                          dep.is_unlinked
                            ? 'bg-slate-100 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-400 opacity-70'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 dark:text-white truncate">{dep.full_name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono">
                              {dep.relationship === 'son' ? 'Filho' : dep.relationship === 'spouse' ? 'Cônjuge' : dep.relationship === 'parent' ? 'Mãe/Pai' : 'Dependente'}
                            </span>
                          </div>
                          {dep.is_unlinked ? (
                            <span className="text-[10px] text-rose-600 dark:text-rose-400 block mt-0.5">
                              Desvinculado pelo titular (Identidade preservada no banco)
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5 truncate">
                              {dep.notes || 'Atendido sob tutela do titular'}
                            </span>
                          )}
                        </div>

                        {/* Botão de Excluir / Desvincular da Titularidade */}
                        {!dep.is_unlinked ? (
                          <button
                            onClick={() => handleUnlinkDependent(dep)}
                            className="px-2 py-1 rounded bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 text-[10px] font-bold transition cursor-pointer shrink-0"
                            title="Desvincular dependente desta conta familiar mantendo registro histórico"
                          >
                            Desvincular
                          </button>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-800 shrink-0">
                            Histórico
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 3: USUÁRIOS DE SALÃO & ACESSOS AUTORIZADOS           */}
      {/* ======================================================== */}
      {activeTab === 'salon_users' && (
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs dark:shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-100 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800 select-none">
                <tr>
                  <th className="py-3 px-4 font-semibold">Usuário Responsável</th>
                  <th className="py-3 px-4 font-semibold">Estabelecimento Vinculado</th>
                  <th className="py-3 px-4 font-semibold">Papel / Autorizações</th>
                  <th className="py-3 px-4 font-semibold">Contato</th>
                  <th className="py-3 px-4 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                {filteredSalonUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 dark:text-slate-400">
                      Nenhum usuário de salão encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredSalonUsers.map((su) => (
                    <tr key={su.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar
                            photoUrl={su.avatar_url}
                            name={su.full_name}
                            size="sm"
                          />
                          <div>
                            <strong className="text-slate-900 dark:text-white block font-medium">{su.full_name}</strong>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{su.email}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="text-slate-800 dark:text-slate-200 font-semibold truncate max-w-[200px]">{su.salon_name}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block">
                          {su.salon_slug}.vagouapp.com
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                            su.role === 'owner'
                              ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
                              : su.role === 'manager'
                              ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {su.role === 'owner' ? 'Proprietário (Dono)' : su.role === 'manager' ? 'Gerente Geral' : 'Recepção / Caixa'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-slate-800 dark:text-slate-300 font-mono text-[11px]">{su.phone_whatsapp}</span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                          Autorizado
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 4: PRESTADORES DE SERVIÇO & PROFISSIONAIS            */}
      {/* ======================================================== */}
      {activeTab === 'professionals' && (
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs dark:shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-100 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800 select-none">
                <tr>
                  <th className="py-3 px-4 font-semibold">Profissional & Especialidades</th>
                  <th className="py-3 px-4 font-semibold">Salão Vinculado</th>
                  <th className="py-3 px-4 font-semibold">Contrato & Comissão</th>
                  <th className="py-3 px-4 font-semibold">Avaliação & Atendimentos</th>
                  <th className="py-3 px-4 font-semibold text-right">Ação / Desvincular</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                {filteredProfessionals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 dark:text-slate-400">
                      Nenhum profissional encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredProfessionals.map((prof) => (
                    <tr key={prof.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar
                            photoUrl={prof.avatar_url}
                            name={prof.full_name}
                            size="sm"
                          />
                          <div>
                            <strong className="text-slate-900 dark:text-white block font-medium">
                              {prof.full_name} {prof.nickname && `(${prof.nickname})`}
                            </strong>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {prof.specialties.map((s, idx) => (
                                <span
                                  key={idx}
                                  className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {prof.current_salon_id ? (
                          <div className="space-y-0.5">
                            <span className="text-emerald-700 dark:text-emerald-400 font-bold block truncate max-w-[180px]">
                              {prof.current_salon_name}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block">Cadeira ativa</span>
                          </div>
                        ) : (
                          <span className="text-amber-700 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-500/20 text-[10px]">
                            Disponível no Ecossistema
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-slate-800 dark:text-slate-200 block font-medium">
                          {prof.contract_type === 'partner_mei' ? 'MEI Parceiro' : 'CLT'}
                        </span>
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-bold block">
                          Comissão: {prof.commission_percent}%
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-slate-900 dark:text-white block font-bold">⭐ {(prof.rating ?? 5.0).toFixed(2)}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                          {prof.total_services_done ?? 0} atendimentos realizados
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        {prof.current_salon_id ? (
                          <button
                            onClick={() => handleUnlinkProfessional(prof)}
                            className="px-2.5 py-1 rounded bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 text-[11px] font-bold transition cursor-pointer"
                            title="Dispensar/desvincular profissional do salão mantendo registro global no Vagou"
                          >
                            Dispensar do Salão
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                            Sem Salão Ativo
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Dedicado para Cadastrar Novo Administrador */}
      <AdminCreateAdminModal
        isOpen={isCreateAdminModalOpen}
        onClose={() => setIsCreateAdminModalOpen(false)}
        onSuccess={(newAdmin) => {
          setAdmins((prev) => [newAdmin, ...prev]);
          triggerFeedback(`Novo administrador @${newAdmin.username} cadastrado com sucesso!`);
        }}
      />

      {/* Modal Dedicado para Cadastro Unificado de Usuários (Cidadão / Profissional) */}
      {isRegistrationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="w-full max-w-xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto">
            <UnifiedRegistrationForm
              initialType="client"
              hideTypeSelector={true}
              onClose={() => setIsRegistrationModalOpen(false)}
              onSuccess={() => {
                setIsRegistrationModalOpen(false);
                loadAll();
                triggerFeedback('Novo usuário cliente cadastrado com sucesso!');
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
