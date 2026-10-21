import React, { useState } from 'react';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Ban,
  Scissors,
  Building2,
  Users,
  Calendar,
  Star,
  ExternalLink,
  Edit,
  Save,
  X,
} from 'lucide-react';
import {
  SystemAdminUser,
  UserClientItem,
  UserFamilyDependent,
  UserSalonAccessItem,
  UserProfessionalItem,
} from '../../types/admin';
import { UserAvatar } from '../common/UserAvatar';

export type UnifiedUserDetailType =
  | { kind: 'client'; data: UserClientItem }
  | { kind: 'professional'; data: UserProfessionalItem }
  | { kind: 'salon_user'; data: UserSalonAccessItem }
  | { kind: 'admin'; data: SystemAdminUser };

interface AdminUserDetailViewProps {
  user: UnifiedUserDetailType;
  onBack: () => void;
  onToggleStatus: (kind: string, id: string, nextStatus: boolean) => void;
  onUnlinkDependent?: (dep: UserFamilyDependent) => Promise<void>;
  onUnlinkProfessional?: (prof: UserProfessionalItem) => Promise<void>;
  onPromoteAdmin?: (admin: SystemAdminUser, newRole: SystemAdminUser['role']) => Promise<void>;
}

export const AdminUserDetailView: React.FC<AdminUserDetailViewProps> = ({
  user,
  onBack,
  onToggleStatus,
  onUnlinkDependent,
  onUnlinkProfessional,
  onPromoteAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'relations'>('profile');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [adminRole, setAdminRole] = useState<SystemAdminUser['role']>(
    user.kind === 'admin' ? user.data.role : 'support'
  );

  const getBasicInfo = () => {
    switch (user.kind) {
      case 'client': {
        const c = user.data;
        return {
          id: c.id,
          name: c.full_name,
          subTitle: `CPF: ${c.cpf || 'Não informado'} • Cadastro: ${new Date(c.created_at).toLocaleDateString('pt-BR')}`,
          email: c.email,
          phone: c.phone,
          avatarUrl: c.avatar_url,
          isActive: c.is_active,
          roleLabel: 'Cliente Titular',
          roleBadge: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30',
          kindLabel: 'Cliente do Portal',
        };
      }
      case 'professional': {
        const p = user.data;
        return {
          id: p.id,
          name: p.full_name,
          subTitle: p.nickname ? `"${p.nickname}" • Prestador Parceiro` : 'Prestador Parceiro da Rede',
          email: p.email || 'Não informado',
          phone: p.phone_whatsapp,
          avatarUrl: p.avatar_url,
          isActive: p.status === 'active',
          roleLabel: p.contract_type === 'partner_mei' ? 'MEI Parceiro' : 'CLT Profissional',
          roleBadge: 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',
          kindLabel: 'Profissional da Rede',
        };
      }
      case 'salon_user': {
        const su = user.data;
        return {
          id: su.id,
          name: su.full_name,
          subTitle: `${su.salon_name} • ${su.salon_slug}.vagouapp.com`,
          email: su.email,
          phone: su.phone_whatsapp,
          avatarUrl: su.avatar_url,
          isActive: su.is_active,
          roleLabel: su.role === 'owner' ? 'Proprietário (Dono)' : su.role === 'manager' ? 'Gerente Geral' : 'Recepção',
          roleBadge: 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30',
          kindLabel: 'Gestão de Salão',
        };
      }
      case 'admin': {
        const a = user.data;
        return {
          id: a.id,
          name: a.full_name,
          subTitle: `${a.username.replace(/^@+/, '')} • Governança Tríade`,
          email: a.email,
          phone: a.phone_whatsapp,
          avatarUrl: a.avatar_url,
          isActive: a.is_active,
          roleLabel: a.role === 'superadmin' ? 'Superadmin Master' : a.role === 'moderator' ? 'Moderador' : 'Suporte',
          roleBadge: 'bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/30',
          kindLabel: 'Administrador do Portal',
        };
      }
    }
  };

  const info = getBasicInfo();

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Top Bar com Botão Voltar & Ações Soberanas */}
      <div className="p-3 sm:p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <button
          onClick={onBack}
          className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar para Lista de Usuários</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Badge de Status Ativo/Inativo */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
              info.isActive
                ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                : 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                info.isActive ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-rose-500 dark:bg-rose-400'
              }`}
            />
            {info.isActive ? 'Conta Ativa' : 'Conta Suspensa'}
          </span>

          {/* Botão de Toggle de Status */}
          <button
            onClick={() => onToggleStatus(user.kind, info.id, !info.isActive)}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1.5 border shadow-xs ${
              info.isActive
                ? 'bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
                : 'bg-[#20C933] hover:bg-[#1bb32d] text-white border-transparent'
            }`}
          >
            {info.isActive ? (
              <>
                <Ban className="w-3.5 h-3.5" />
                <span>Suspender Conta</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                <span className="text-white">Reativar Conta</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Header Profile Banner (Layout Plano & Sem Box Dentro de Box) */}
      <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="relative">
            <UserAvatar name={info.name} photoUrl={info.avatarUrl} size="xl" />
            <div
              className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${
                info.isActive ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                {info.name}
              </h1>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${info.roleBadge}`}>
                {info.roleLabel}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                {info.kindLabel}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{info.subTitle}</p>
          </div>
        </div>

        {/* Métricas Rápidas do Usuário */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {user.kind === 'client' && (
            <>
              <div className="text-center px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] font-mono">Agendamentos</span>
                <strong className="text-slate-900 dark:text-white text-sm font-bold">
                  {user.data.total_appointments}
                </strong>
              </div>
              <div className="text-center px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] font-mono">Dependentes</span>
                <strong className="text-slate-900 dark:text-white text-sm font-bold">
                  {user.data.dependents.length}
                </strong>
              </div>
            </>
          )}

          {user.kind === 'professional' && (
            <>
              <div className="text-center px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] font-mono">Avaliação</span>
                <strong className="text-emerald-600 dark:text-emerald-400 text-sm font-bold flex items-center justify-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {(user.data.rating ?? 5.0).toFixed(1)}
                </strong>
              </div>
              <div className="text-center px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] font-mono">Atendimentos</span>
                <strong className="text-slate-900 dark:text-white text-sm font-bold">
                  {user.data.total_services_done ?? 0}
                </strong>
              </div>
            </>
          )}

          {user.kind === 'salon_user' && (
            <div className="text-center px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px] font-mono">Subdomínio</span>
              <strong className="text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold">
                {user.data.salon_slug}
              </strong>
            </div>
          )}

          {user.kind === 'admin' && (
            <div className="text-center px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px] font-mono">Acesso</span>
              <strong className="text-purple-600 dark:text-purple-400 text-xs font-bold uppercase">
                {user.data.role}
              </strong>
            </div>
          )}
        </div>
      </div>

      {/* Navegação por Abas Internas */}
      <div className="p-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-1 shadow-xs">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'profile'
              ? 'bg-[#20C933] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Cadastro & Contatos</span>
        </button>

        <button
          onClick={() => setActiveTab('relations')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'relations'
              ? 'bg-[#20C933] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {user.kind === 'client' ? (
            <Users className="w-3.5 h-3.5" />
          ) : user.kind === 'professional' ? (
            <Scissors className="w-3.5 h-3.5" />
          ) : user.kind === 'salon_user' ? (
            <Building2 className="w-3.5 h-3.5" />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5" />
          )}
          <span>
            {user.kind === 'client'
              ? 'Conta Família & Dependentes'
              : user.kind === 'professional'
              ? 'Salão & Especialidades'
              : user.kind === 'salon_user'
              ? 'Estabelecimento & Permissões'
              : 'Níveis de Permissão'}
          </span>
        </button>
      </div>

      {/* Conteúdo da Aba 1: Perfil & Contatos */}
      {activeTab === 'profile' && (
        <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Dados Oficiais de Cadastro & Comunicação</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-slate-400 text-[11px] block">Nome Completo</span>
              <span className="font-bold text-slate-900 dark:text-white text-sm block">{info.name}</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-slate-400 text-[11px] block flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>E-mail</span>
              </span>
              <span className="font-mono text-slate-800 dark:text-slate-200 block truncate">{info.email}</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-slate-400 text-[11px] block flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>WhatsApp / Telefone</span>
              </span>
              <div className="flex items-center justify-between">
                <span className="font-mono text-slate-900 dark:text-white font-bold">{info.phone}</span>
                {info.phone && (
                  <a
                    href={`https://wa.me/55${info.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>Conversar</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {user.kind === 'client' && (
              <>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[11px] block">CPF do Titular</span>
                  <span className="font-mono text-slate-900 dark:text-white font-bold">{user.data.cpf || 'Não informado'}</span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[11px] block">Autenticação Inicial</span>
                  <span className="capitalize font-semibold text-slate-800 dark:text-slate-200">{user.data.auth_provider}</span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[11px] block">Último Agendamento</span>
                  <span className="text-slate-800 dark:text-slate-200 font-mono">
                    {user.data.last_appointment_at
                      ? new Date(user.data.last_appointment_at).toLocaleDateString('pt-BR')
                      : 'Sem registro recente'}
                  </span>
                </div>
              </>
            )}

            {user.kind === 'professional' && (
              <>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[11px] block">Apelido Profissional</span>
                  <span className="text-slate-900 dark:text-white font-bold">{user.data.nickname || 'Não possui'}</span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[11px] block">Regime de Contrato</span>
                  <span className="text-slate-900 dark:text-white font-bold">
                    {user.data.contract_type === 'partner_mei' ? 'MEI Parceiro' : 'CLT'}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[11px] block">Comissão Padrão</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono text-sm">
                    {user.data.commission_percent}%
                  </span>
                </div>
              </>
            )}

            {user.kind === 'salon_user' && (
              <>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[11px] block">Cargo no Salão</span>
                  <span className="text-slate-900 dark:text-white font-bold uppercase">{user.data.role}</span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[11px] block">Salão Vinculado</span>
                  <span className="text-slate-900 dark:text-white font-bold truncate block">{user.data.salon_name}</span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[11px] block">Gestão Financeira</span>
                  <span className={`font-bold ${user.data.can_manage_financial ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                    {user.data.can_manage_financial ? 'Autorizada' : 'Restrita'}
                  </span>
                </div>
              </>
            )}

            {user.kind === 'admin' && (
              <>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[11px] block">Nome de Usuário</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                    {user.data.username.replace(/^@+/, '')}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[11px] block">Último Login</span>
                  <span className="text-slate-800 dark:text-slate-200 font-mono">
                    {user.data.last_login_at
                      ? new Date(user.data.last_login_at).toLocaleString('pt-BR')
                      : 'Não registrado'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Conteúdo da Aba 2: Vínculos & Relações */}
      {activeTab === 'relations' && (
        <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
          {user.kind === 'client' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Conta Família • Dependentes ({user.data.dependents.length})</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Histórico permanente preservado conforme Lei da Tríade.
                  </p>
                </div>
              </div>

              {user.data.dependents.length === 0 ? (
                <div className="p-6 text-center text-slate-400 italic text-xs rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
                  Nenhum dependente cadastrado por este cliente titular.
                </div>
              ) : (
                <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[540px]">
                      <thead className="bg-slate-100 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800 select-none">
                        <tr>
                          <th className="py-2.5 px-3 font-semibold">Nome do Dependente</th>
                          <th className="py-2.5 px-3 font-semibold">Grau de Parentesco</th>
                          <th className="py-2.5 px-3 font-semibold">Observações</th>
                          <th className="py-2.5 px-3 font-semibold">Status do Vínculo</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                        {user.data.dependents.map((dep) => (
                          <tr
                            key={dep.id}
                            className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                              dep.is_unlinked ? 'opacity-70 bg-slate-50/40 dark:bg-slate-950/40' : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                              {dep.full_name}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-slate-700 dark:text-slate-300 font-medium">
                                {dep.relationship === 'son'
                                  ? 'Filho(a)'
                                  : dep.relationship === 'daughter'
                                  ? 'Filha'
                                  : dep.relationship === 'spouse'
                                  ? 'Cônjuge'
                                  : dep.relationship === 'parent'
                                  ? 'Pai/Mãe'
                                  : dep.relationship === 'other'
                                  ? 'Outro'
                                  : 'Dependente'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                              {dep.notes || '—'}
                            </td>
                            <td className="py-2.5 px-3">
                              {dep.is_unlinked ? (
                                <span className="text-[10px] font-bold text-rose-500 font-mono">
                                  Desvinculado
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                  Vinculado Ativo
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {!dep.is_unlinked && onUnlinkDependent && (
                                <button
                                  onClick={() => onUnlinkDependent(dep)}
                                  className="px-2.5 py-1 rounded bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 text-[10px] font-bold cursor-pointer"
                                >
                                  Desvincular
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {user.kind === 'professional' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-xs text-slate-400 block font-mono">Estabelecimento Ativo</span>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <strong className="text-slate-900 dark:text-white text-sm font-bold">
                      {user.data.current_salon_name || 'Profissional Avulso / Sem Salão Fixo'}
                    </strong>
                  </div>
                </div>

                {user.data.current_salon_id && onUnlinkProfessional && (
                  <button
                    onClick={() => onUnlinkProfessional(user.data)}
                    className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 text-xs font-bold cursor-pointer shrink-0"
                  >
                    Dispensar do Salão
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Especialidades Cadastradas
                </span>
                <div className="flex flex-wrap gap-2">
                  {user.data.specialties.map((s, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium border border-slate-200 dark:border-slate-700"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {user.kind === 'salon_user' && (
            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">Vínculo com Estabelecimento</span>
                  <strong className="text-slate-900 dark:text-white font-bold text-sm block">
                    {user.data.salon_name}
                  </strong>
                  <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 block mt-0.5">
                    {user.data.salon_slug}.vagouapp.com
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                  Credencial Vinculada
                </span>
              </div>
            </div>
          )}

          {user.kind === 'admin' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Alteração Granular de Papel Administrativo
              </h4>
              <div className="flex items-center gap-3">
                <select
                  value={adminRole}
                  onChange={(e) => {
                    const nextRole = e.target.value as any;
                    setAdminRole(nextRole);
                    if (onPromoteAdmin) onPromoteAdmin(user.data, nextRole);
                  }}
                  className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white rounded-lg px-3 py-2 outline-none cursor-pointer"
                >
                  <option value="superadmin">Superadmin Master (Acesso total)</option>
                  <option value="moderator">Moderador (Aprovação e Moderação)</option>
                  <option value="support">Suporte Operacional</option>
                </select>
                <span className="text-xs text-slate-500">Alteração com efeito imediato na Tríade.</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
