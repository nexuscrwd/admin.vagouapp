import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Building2,
  Save,
  Globe,
  Phone,
  Mail,
  MapPin,
  Palette,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Search,
  User,
  UserPlus,
  ArrowRight,
  ArrowLeft,
  Check,
  Users,
  ShieldCheck,
  RefreshCw,
  UserCheck,
} from 'lucide-react';
import { AdminSalonItem } from '../../types/admin';
import {
  fetchAdminClients,
  fetchAdminSalonUsers,
  fetchAdminProfessionals,
} from '../../services/supabaseApi';
import { UserAvatar } from '../common/UserAvatar';
import { UnifiedRegistrationForm } from '../public/UnifiedRegistrationForm';

export interface PortalUserOption {
  id: string;
  name: string;
  email: string;
  username?: string;
  phone?: string;
  avatarUrl?: string;
  roleType: string;
}

interface AdminCreateSalonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (salon: Partial<AdminSalonItem>) => Promise<any>;
}

export const AdminCreateSalonModal: React.FC<AdminCreateSalonModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  // Passos do Fluxo
  const [step, setStep] = useState<'user_check' | 'user_search' | 'salon_details'>('user_check');
  const [hasUserChoice, setHasUserChoice] = useState<boolean | null>(null);

  // Lista de Usuários do Portal
  const [portalUsers, setPortalUsers] = useState<PortalUserOption[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedOwner, setSelectedOwner] = useState<PortalUserOption | null>(null);

  // Modal para cadastro direto de novo usuário
  const [isUserRegistrationOpen, setIsUserRegistrationOpen] = useState(false);
  const [isSlugEdited, setIsSlugEdited] = useState(false);

  // Formulário do Salão
  const [formData, setFormData] = useState<Partial<AdminSalonItem>>({
    trade_name: '',
    legal_name: '',
    slug: '',
    category: 'salao',
    status: 'active',
    is_verified: true,
    phone_whatsapp: '',
    email: '',
    document_number: '',
    address: '',
    neighborhood: '',
    city: 'São Paulo',
    state: 'SP',
    cep: '',
    logo_url: '',
    primary_color: '#10B981',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Carrega todos os usuários do portal (clientes, parceiros, profissionais)
  const loadPortalUsers = async () => {
    setIsLoadingUsers(true);
    try {
      // 1. Tenta endpoint soberano centralizado em primeira mão
      const res = await fetch('/api/admin/all-portal-users');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.users) && data.users.length > 0) {
          setPortalUsers(data.users);
          setIsLoadingUsers(false);
          return;
        }
      }

      // 2. Fallback caso offline
      const [cliList, slnList, profList] = await Promise.all([
        fetchAdminClients(),
        fetchAdminSalonUsers(),
        fetchAdminProfessionals(),
      ]);

      const combined: PortalUserOption[] = [];
      const seen = new Set<string>();

      cliList.forEach((c) => {
        const key = c.id || c.email;
        if (key && !seen.has(key)) {
          seen.add(key);
          combined.push({
            id: c.id,
            name: (c as any).name || c.full_name || 'Usuário Sem Nome',
            email: c.email || '',
            username: (c as any).username || (c.email ? c.email.split('@')[0] : 'usuario'),
            phone: c.phone || '',
            avatarUrl: c.avatar_url,
            roleType: 'Cliente',
          });
        }
      });

      slnList.forEach((su) => {
        const key = su.id || su.email;
        if (key && !seen.has(key)) {
          seen.add(key);
          combined.push({
            id: su.id,
            name: (su as any).name || su.full_name || 'Gestor de Salão',
            email: su.email || '',
            username: (su as any).username || (su.email ? su.email.split('@')[0] : 'gestor'),
            phone: su.phone_whatsapp || '',
            avatarUrl: su.avatar_url,
            roleType: 'Gestor / Parceiro',
          });
        }
      });

      profList.forEach((p) => {
        const key = p.id || p.email;
        if (key && !seen.has(key)) {
          seen.add(key);
          combined.push({
            id: p.id,
            name: (p as any).name || p.full_name || 'Profissional',
            email: p.email || '',
            username: (p as any).username || (p.email ? p.email.split('@')[0] : 'profissional'),
            phone: p.phone_whatsapp || '',
            avatarUrl: p.avatar_url,
            roleType: 'Profissional',
          });
        }
      });

      setPortalUsers(combined);
    } catch (err) {
      console.warn('[AdminCreateSalonModal] Erro ao buscar usuários:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPortalUsers();
      setStep('user_check');
      setHasUserChoice(null);
      setSelectedOwner(null);
      setUserSearchQuery('');
      setStatusMessage(null);
      setIsSlugEdited(false);
    }
  }, [isOpen]);

  // Função utilitária para acentuação neutra / case insensitive
  const normalizeText = (str?: string | null) =>
    str
      ? str
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()
      : '';

  // Usuários filtrados em tempo real pela busca (Triagem por J, Jo, Jos, José, etc.)
  const filteredUsers = useMemo(() => {
    const rawQuery = userSearchQuery.trim();
    if (!rawQuery) {
      return []; // Não exibe a lista logo de cara, exige digitação
    }
    const q = normalizeText(rawQuery);

    return portalUsers.filter((u) => {
      const matchName = normalizeText(u.name).includes(q);
      const matchEmail = normalizeText(u.email).includes(q);
      const matchUsername = normalizeText(u.username).includes(q);
      const matchPhone = u.phone ? normalizeText(u.phone).includes(q) : false;

      return matchName || matchEmail || matchUsername || matchPhone;
    });
  }, [portalUsers, userSearchQuery]);

  if (!isOpen) return null;

  const handleNameChange = (name: string) => {
    // Proposta automática de subdomínio:
    // "Zé maria" -> "zemaria"
    // "Espaço Belo" -> "espacobelo"
    // "betão barber" -> "betaobarber"
    const autoSlug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 30);

    setFormData((prev) => ({
      ...prev,
      trade_name: name,
      slug: isSlugEdited ? (prev.slug || '') : autoSlug,
    }));
  };

  const handleSlugChange = (rawSlug: string) => {
    const cleanSlug = rawSlug.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setIsSlugEdited(cleanSlug.length > 0);
    setFormData((prev) => ({
      ...prev,
      slug: cleanSlug,
    }));
  };

  const handleSelectOwner = (user: PortalUserOption) => {
    setSelectedOwner(user);
    setFormData((prev) => ({
      ...prev,
      legal_name: user.name,
      email: user.email || prev.email,
      phone_whatsapp: user.phone || prev.phone_whatsapp,
    }));
  };

  // Callback ao cadastrar novo usuário no modal interno
  const handleUserRegistrationSuccess = async () => {
    setIsUserRegistrationOpen(false);
    setIsLoadingUsers(true);
    try {
      const cliList = await fetchAdminClients();
      if (cliList && cliList.length > 0) {
        const newest = cliList[0];
        const newOwnerOption: PortalUserOption = {
          id: newest.id,
          name: newest.full_name || 'Novo Usuário',
          email: newest.email || '',
          username: (newest as any).username || (newest.email ? newest.email.split('@')[0] : 'usuario'),
          phone: newest.phone || '',
          avatarUrl: newest.avatar_url,
          roleType: 'Cliente (Recém Cadastrado)',
        };
        setSelectedOwner(newOwnerOption);
        setHasUserChoice(true);
        setStep('salon_details');
        setFormData((prev) => ({
          ...prev,
          legal_name: newest.full_name || prev.legal_name,
          email: newest.email || prev.email,
          phone_whatsapp: newest.phone || prev.phone_whatsapp,
        }));
        setStatusMessage({
          type: 'success',
          text: `Usuário "${newest.full_name}" criado com sucesso e selecionado como proprietário!`,
        });
      }
    } catch (e) {
      console.warn('Erro ao atualizar lista de usuários:', e);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSlug = formData.slug?.toLowerCase().trim().replace(/[^a-z0-9-]/g, '') || '';
    const RESERVED_SUBDOMAINS = [
      'adm', 'admin', 'admvapp', 'portal', 'pvapp', 'meunegocio', 'mnvapp',
      'www', 'api', 'suporte', 'ajuda', 'vagou', 'vagouapp', 'localhost',
      'app', 'dashboard', 'status', 'auth', 'login', 'signup', 'checkout', 'pay', 'billing'
    ];

    if (!selectedOwner) {
      setStatusMessage({
        type: 'error',
        text: 'Erro: É obrigatório selecionar ou criar um usuário proprietário para o estabelecimento.',
      });
      setStep('user_check');
      return;
    }

    if (!formData.trade_name?.trim() || !cleanSlug) {
      setStatusMessage({ type: 'error', text: 'Nome Fantasia e Subdomínio são obrigatórios.' });
      return;
    }

    if (RESERVED_SUBDOMAINS.includes(cleanSlug)) {
      setStatusMessage({ type: 'error', text: `O subdomínio "${cleanSlug}" é reservado pelo sistema.` });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const payload: Partial<AdminSalonItem> = {
        ...formData,
        slug: cleanSlug,
        legal_name: formData.legal_name || selectedOwner.name,
        email: formData.email || selectedOwner.email,
        phone_whatsapp: formData.phone_whatsapp || selectedOwner.phone,
      };

      const res = await onCreate(payload);
      const isOk = typeof res === 'boolean' ? res : (res && res.success);
      const errorMessage = typeof res === 'object' && res.error
        ? res.error
        : `O subdomínio "${cleanSlug}" ou dados do negócio já estão em uso por outro estabelecimento. Escolha outro subdomínio.`;

      if (isOk) {
        setStatusMessage({ type: 'success', text: 'Estabelecimento e proprietário vinculados com sucesso no Supabase!' });
        setTimeout(() => {
          onClose();
        }, 900);
      } else {
        setStatusMessage({ type: 'error', text: errorMessage });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Erro inesperado na criação do salão.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden transition-colors">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                Novo Estabelecimento
                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {step === 'salon_details' ? 'Etapa 2/2: Dados do Negócio' : 'Etapa 1/2: Usuário Proprietário'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {step === 'salon_details'
                  ? `Vinculado ao proprietário ${selectedOwner?.name || ''}`
                  : 'Verifique se o negócio a ser criado já possui usuário cadastrado'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Message */}
        {statusMessage && (
          <div className="px-4 pt-4">
            <div
              className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/90 border border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/90 border border-rose-500/40 text-rose-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* ======================================================== */}
          {/* ETAPA 1: VERIFICAÇÃO SE O NEGÓCIO JÁ POSSUI USUÁRIO      */}
          {/* ======================================================== */}
          {(step === 'user_check' || step === 'user_search') && (
            <div className="space-y-5">
              {/* Pergunta mestre */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>O negócio / estabelecimento a ser criado já possui usuário cadastrado?</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setHasUserChoice(true);
                      setStep('user_search');
                    }}
                    className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                      hasUserChoice === true
                        ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-md shadow-emerald-950/30'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold block text-emerald-400">SIM</span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Selecionar o nome do usuário cadastrado na lista
                      </span>
                    </div>
                    {hasUserChoice === true && <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setHasUserChoice(false);
                      setStep('user_check');
                    }}
                    className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                      hasUserChoice === false
                        ? 'bg-amber-950/40 border-amber-500 text-white shadow-md'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold block text-amber-400">NÃO</span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Não possui usuário. Abrir cadastro de usuário primeiro.
                      </span>
                    </div>
                    {hasUserChoice === false && <X className="w-4 h-4 text-amber-400 shrink-0 ml-2" />}
                  </button>
                </div>
              </div>

              {/* SE NÃO POSSUI USUÁRIO: BLOQUEIA AVANÇO E EXIGE CADASTRO PRIMEIRO */}
              {hasUserChoice === false && (
                <div className="bg-amber-950/30 border border-amber-500/30 p-4 rounded-xl space-y-3 animate-fadeIn">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-amber-300">
                        Não é possível criar um estabelecimento sem um usuário proprietário!
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        No ecossistema VagouApp, todo estabelecimento comercial é vinculado a uma pessoa física (usuário). Como o negócio ainda não possui usuário, o cadastro de usuário deve ser realizado agora antes de prosseguir.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsUserRegistrationOpen(true)}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition cursor-pointer flex items-center gap-2 shadow-md"
                    >
                      <UserPlus className="w-4 h-4 text-slate-950" />
                      <span>Cadastrar Novo Usuário Agora</span>
                    </button>
                  </div>
                </div>
              )}

              {/* SE SIM POSSUI USUÁRIO: EXIBE BUSCA DE USUÁRIOS */}
              {(hasUserChoice === true || step === 'user_search') && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Digite e selecione o nome do usuário cadastrado *</span>
                    </label>
                    <button
                      type="button"
                      onClick={loadPortalUsers}
                      disabled={isLoadingUsers}
                      className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                      <span>Atualizar Lista</span>
                    </button>
                  </div>

                  {/* Input de Busca */}
                  <div className="relative">
                    <input
                      type="text"
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      placeholder="Buscar por nome, e-mail ou username (ex: Anderson Pires)..."
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none shadow-inner"
                    />
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                  </div>

                  {/* Card do Usuário Selecionado */}
                  {selectedOwner ? (
                    <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/50 rounded-xl flex items-center justify-between shadow-md animate-fadeIn">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          avatarUrl={selectedOwner.avatarUrl}
                          name={selectedOwner.name}
                          size="md"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{selectedOwner.name}</span>
                            <span className="text-[10px] text-emerald-400 font-mono">@{selectedOwner.username}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>{selectedOwner.email || 'Sem e-mail'}</span>
                            {selectedOwner.phone && (
                              <>
                                <span>·</span>
                                <span>{selectedOwner.phone}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedOwner(null)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition cursor-pointer"
                      >
                        Trocar Usuário
                      </button>
                    </div>
                  ) : (
                    /* Lista de Resultados */
                    <div className="border border-slate-800 rounded-xl bg-slate-950 max-h-56 overflow-y-auto divide-y divide-slate-800/60 shadow-inner">
                      {isLoadingUsers ? (
                        <div className="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                          <span>Carregando usuários do portal...</span>
                        </div>
                      ) : !userSearchQuery.trim() ? (
                        <div className="p-6 text-center text-xs text-slate-400 space-y-1 animate-fadeIn">
                          <Search className="w-5 h-5 text-slate-600 mx-auto mb-1" />
                          <p className="font-semibold text-slate-300">Digite as letras para buscar o usuário</p>
                          <p className="text-[11px] text-slate-500">Ex: digite "J" ou "Jo" para listar "José Roberto"</p>
                        </div>
                      ) : filteredUsers.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400 space-y-2">
                          <p>Nenhum usuário encontrado para "{userSearchQuery}".</p>
                          <button
                            type="button"
                            onClick={() => setIsUserRegistrationOpen(true)}
                            className="text-xs text-emerald-400 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Cadastrar este usuário agora</span>
                          </button>
                        </div>
                      ) : (
                        filteredUsers.map((u) => (
                          <div
                            key={u.id}
                            onClick={() => handleSelectOwner(u)}
                            className="p-3 hover:bg-slate-900 transition cursor-pointer flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-3">
                              <UserAvatar avatarUrl={u.avatarUrl} name={u.name} size="sm" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition">
                                    {u.name}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">@{u.username}</span>
                                </div>
                                <span className="text-[11px] text-slate-500 block">{u.email}</span>
                              </div>
                            </div>

                            <span className="text-[10px] font-medium text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md">
                              {u.roleType}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Botão de Avançar */}
                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setIsUserRegistrationOpen(true)}
                      className="text-xs text-emerald-400 hover:underline font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Cadastrar Novo Usuário</span>
                    </button>

                    <button
                      type="button"
                      disabled={!selectedOwner}
                      onClick={() => setStep('salon_details')}
                      className="px-5 py-2.5 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-white transition flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95"
                    >
                      <span>Avançar para Dados do Negócio</span>
                      <ArrowRight className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* ETAPA 2: DADOS DO ESTABELECIMENTO COMERCIAL               */}
          {/* ======================================================== */}
          {step === 'salon_details' && (
            <form onSubmit={handleSubmit} className="space-y-4 animate-fadeIn bg-transparent">
              {/* Badge do Proprietário Selecionado */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <UserAvatar avatarUrl={selectedOwner?.avatarUrl} name={selectedOwner?.name || ''} size="xs" />
                  <div>
                    <span className="text-slate-400">Proprietário: </span>
                    <strong className="text-white font-bold">{selectedOwner?.name}</strong>
                    <span className="text-slate-400 ml-1">({selectedOwner?.email})</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStep('user_search')}
                  className="text-emerald-400 font-semibold hover:underline cursor-pointer"
                >
                  Alterar
                </button>
              </div>

              {/* Seção 1: Identificação Básica */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">
                  Identificação do Negócio
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Nome Fantasia *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Studio Bela Vista"
                      value={formData.trade_name || ''}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Razão Social / Responsável</label>
                    <input
                      type="text"
                      placeholder="Ex: Bela Vista Estetica Ltda"
                      value={formData.legal_name || ''}
                      onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[1.3fr_1fr_1fr] gap-3 items-end">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Subdomínio (Slug) *
                    </label>
                    <div className="flex items-center bg-slate-950 border border-slate-800 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 rounded-lg px-2.5 h-9">
                      <Globe className="w-3.5 h-3.5 text-slate-500 mr-1.5 shrink-0" />
                      <input
                        type="text"
                        required
                        placeholder="zemaria"
                        value={formData.slug || ''}
                        onChange={(e) => handleSlugChange(e.target.value)}
                        className="w-full bg-transparent text-xs text-white placeholder:text-slate-500 outline-none font-mono min-w-0"
                      />
                      <span className="text-xs text-emerald-400 font-mono font-bold shrink-0 select-none ml-1">
                        .vagouapp.com
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Categoria</label>
                    <select
                      value={formData.category || 'salao'}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                      className="w-full h-9 bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 text-xs text-white outline-none cursor-pointer"
                    >
                      <option value="salao">Salão de Beleza</option>
                      <option value="barbearia">Barbearia</option>
                      <option value="estetica">Estética & Spa</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Status Inicial</label>
                    <select
                      value={formData.status || 'active'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full h-9 bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 text-xs text-white outline-none font-semibold cursor-pointer"
                    >
                      <option value="active">Ativo (Aprovado)</option>
                      <option value="pending">Pendente (Moderação)</option>
                      <option value="incomplete">Incompleto</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Seção 2: Contato & Localização */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">
                  Contato & Localização Comercial
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">WhatsApp Comercial</label>
                    <input
                      type="text"
                      placeholder="(11) 99999-9999"
                      value={formData.phone_whatsapp || ''}
                      onChange={(e) => setFormData({ ...formData, phone_whatsapp: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">E-mail Comercial</label>
                    <input
                      type="email"
                      placeholder="contato@salao.com"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Bairro</label>
                    <input
                      type="text"
                      placeholder="Pinheiros"
                      value={formData.neighborhood || ''}
                      onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Endereço Completo</label>
                    <input
                      type="text"
                      placeholder="Rua Teodoro Sampaio, 1020"
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Cidade / UF</label>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={formData.city || 'São Paulo'}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="col-span-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-xs text-white outline-none"
                      />
                      <input
                        type="text"
                        maxLength={2}
                        value={formData.state || 'SP'}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                        className="bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-xs text-white outline-none uppercase font-mono text-center"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between gap-3 sticky bottom-0 z-10">
          {step === 'salon_details' ? (
            <button
              type="button"
              onClick={() => setStep('user_search')}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 transition cursor-pointer"
            >
              Cancelar
            </button>
          )}

          {step === 'salon_details' && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedOwner}
              className="px-5 py-2.5 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] disabled:opacity-50 text-xs font-bold text-white transition flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Save className="w-4 h-4 text-white" />
              )}
              <span>Cadastrar Estabelecimento</span>
            </button>
          )}
        </div>
      </div>

      {/* Modal Dedicado para Cadastro do Novo Usuário (quando 'NÃO' for escolhido) */}
      {isUserRegistrationOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto">
            <UnifiedRegistrationForm
              initialType="client"
              hideTypeSelector={true}
              onClose={() => setIsUserRegistrationOpen(false)}
              onSuccess={handleUserRegistrationSuccess}
            />
          </div>
        </div>
      )}
    </div>
  );
};
