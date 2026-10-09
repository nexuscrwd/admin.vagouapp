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
  ExternalLink,
  Copy,
  Sparkles,
  Share2,
} from 'lucide-react';
import { AdminSalonItem } from '../../types/admin';
import {
  fetchAdminClients,
  fetchAdminSalonUsers,
  fetchAdminProfessionals,
} from '../../services/supabaseApi';
import { UserAvatar } from '../common/UserAvatar';
import { SalonLogo } from '../common/SalonLogo';
import { UnifiedRegistrationForm } from '../public/UnifiedRegistrationForm';
import {
  SalonCategory,
  fetchCategories,
  subscribeCategories,
} from '../../services/categoriesService';
import { AdminCategoryModal } from './AdminCategoryModal';

export interface PortalUserOption {
  id: string;
  name: string;
  email: string;
  username?: string;
  phone?: string;
  avatarUrl?: string;
  roleType: string;
  hasSalon?: boolean;
}

interface AdminCreateSalonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (salon: Partial<AdminSalonItem>) => Promise<any>;
  onViewDetails?: (salon: AdminSalonItem) => void;
}

export const AdminCreateSalonModal: React.FC<AdminCreateSalonModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  onViewDetails,
}) => {
  // Passos do Fluxo
  const [step, setStep] = useState<'user_check' | 'user_search' | 'salon_details' | 'success_links'>('user_check');
  const [hasUserChoice, setHasUserChoice] = useState<boolean | null>(null);

  // Estabelecimento Criado com Sucesso (para exibição do modal de links oficiais)
  const [createdSalonData, setCreatedSalonData] = useState<{
    salon: AdminSalonItem;
    ownerName: string;
    ownerPhone: string;
    ownerEmail: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState<'public' | 'owner' | null>(null);

  // Lista de Usuários do Portal
  const [portalUsers, setPortalUsers] = useState<PortalUserOption[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedOwner, setSelectedOwner] = useState<PortalUserOption | null>(null);

  // Categorias Dinâmicas
  const [categories, setCategories] = useState<SalonCategory[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  useEffect(() => {
    fetchCategories().then(setCategories);
    const unsubscribe = subscribeCategories(setCategories);
    return () => unsubscribe();
  }, []);

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

  // Usuários elegíveis: Apenas usuários cadastrados que NÃO possuem salão vinculado em seu login
  const eligibleUsers = useMemo(() => {
    return portalUsers.filter((u) => {
      if (typeof u.hasSalon === 'boolean') {
        return !u.hasSalon;
      }
      return u.roleType !== 'Gestor / Parceiro' && u.roleType !== 'Gestor / Salão';
    });
  }, [portalUsers]);

  // Usuários filtrados em tempo real pela busca inteligente
  const filteredUsers = useMemo(() => {
    const rawQuery = userSearchQuery.trim();
    if (!rawQuery) {
      return eligibleUsers;
    }
    const q = normalizeText(rawQuery);

    return eligibleUsers.filter((u) => {
      const matchName = normalizeText(u.name).includes(q);
      const matchEmail = normalizeText(u.email).includes(q);
      const matchUsername = normalizeText(u.username).includes(q);
      const matchPhone = u.phone ? normalizeText(u.phone).includes(q) : false;

      return matchName || matchEmail || matchUsername || matchPhone;
    });
  }, [eligibleUsers, userSearchQuery]);

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
        const createdObj: AdminSalonItem = (res && res.salon) ? res.salon : ({
          id: `salon-${cleanSlug}`,
          trade_name: formData.trade_name || 'Novo Salão',
          legal_name: formData.legal_name || selectedOwner.name,
          slug: cleanSlug,
          category: (formData.category as any) || 'salao',
          status: 'active',
          is_verified: true,
          phone_whatsapp: formData.phone_whatsapp || selectedOwner.phone || '',
          email: formData.email || selectedOwner.email || '',
          ...formData,
        } as AdminSalonItem);

        setCreatedSalonData({
          salon: createdObj,
          ownerName: selectedOwner.name,
          ownerPhone: selectedOwner.phone || formData.phone_whatsapp || '',
          ownerEmail: selectedOwner.email || formData.email || '',
        });
        setStep('success_links');
      } else {
        setStatusMessage({ type: 'error', text: errorMessage });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Erro inesperado na criação do salão.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const publicAppUrl = createdSalonData ? `https://${createdSalonData.salon.slug}.vagouapp.com` : '';
  const ownerAppUrl = createdSalonData ? `https://seunegocio.vagouapp.com/?slug=${createdSalonData.salon.slug}` : '';

  const getOwnerWhatsAppShareUrl = () => {
    if (!createdSalonData) return '';
    const rawPhone = createdSalonData.ownerPhone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.length > 0 ? (cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`) : '';
    
    const message = `Olá, *${createdSalonData.ownerName}*! Seu estabelecimento *${createdSalonData.salon.trade_name}* foi ativado com sucesso no ecossistema VagouApp! 🚀\n\n` +
      `📱 *Link do App para seus Clientes agendarem:*\n${publicAppUrl}\n\n` +
      `⚙️ *Link de Gestão da sua Agenda e Negócio:*\n${ownerAppUrl}\n\n` +
      `Seja bem-vindo ao VagouApp!`;

    if (phoneWithCountry) {
      return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`;
    }
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  };

  const getPublicWhatsAppShareUrl = () => {
    if (!createdSalonData) return '';
    const message = `Olá! Conheça o aplicativo oficial do *${createdSalonData.salon.trade_name}* no VagouApp! Agende seu horário e confira vagas relâmpago online:\n\n${publicAppUrl}`;
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  };

  const handleCopyLink = async (text: string, type: 'public' | 'owner') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(type);
      setTimeout(() => setCopiedLink(null), 2500);
    } catch (e) {
      console.warn('Erro ao copiar link:', e);
    }
  };

  const handleFinalClose = () => {
    setStep('user_check');
    setSelectedOwner(null);
    setCreatedSalonData(null);
    setCopiedLink(null);
    setStatusMessage(null);
    setFormData({
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
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div
        className={`w-full ${
          step === 'user_check'
            ? 'max-w-md'
            : step === 'user_search'
            ? 'max-w-lg'
            : step === 'success_links'
            ? 'max-w-xl'
            : 'max-w-2xl'
        } bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden transition-all duration-200`}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/90">
          <div className="flex items-center gap-3">
            {step === 'user_search' ? (
              <button
                type="button"
                onClick={() => setStep('user_check')}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
                title="Voltar para pergunta inicial"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : step === 'success_links' ? (
              <div className="w-10 h-10 rounded-xl bg-[#20C933]/15 text-[#20C933] border border-[#20C933]/30 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-[#20C933]" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-emerald-400" />
              </div>
            )}
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                {step === 'user_check'
                  ? 'Novo Estabelecimento'
                  : step === 'user_search'
                  ? 'Selecionar Proprietário'
                  : step === 'success_links'
                  ? 'Estabelecimento Ativado com Sucesso!'
                  : 'Dados do Negócio'}
                {step === 'user_search' && (
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    {filteredUsers.length} disponíveis
                  </span>
                )}
                {step === 'salon_details' && (
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Etapa 2/2
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                {step === 'user_check'
                  ? 'Verificação de usuário proprietário'
                  : step === 'user_search'
                  ? 'Apenas usuários cadastrados sem salão vinculado'
                  : step === 'success_links'
                  ? 'Links oficiais gerados para o público e para a gestão do dono'
                  : `Vinculado ao proprietário ${selectedOwner?.name || ''}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleFinalClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Fechar"
            aria-label="Fechar"
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
          {/* ETAPA 1A: DECISÃO INICIAL (POSSUI USUÁRIO SIM OU NÃO)     */}
          {/* ======================================================== */}
          {step === 'user_check' && (
            <div className="space-y-4 py-2 animate-fadeIn">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-1">
                  <UserCheck className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  O estabelecimento a ser criado já possui usuário cadastrado?
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                  Todo estabelecimento precisa estar vinculado a um usuário proprietário responsável no ecossistema.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setHasUserChoice(true);
                    setStep('user_search');
                  }}
                  className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/30 hover:bg-emerald-900/40 text-left transition cursor-pointer flex flex-col justify-between group active:scale-98 shadow-sm"
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-sm font-bold text-emerald-400 group-hover:text-emerald-300">SIM</span>
                    <Check className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-[11px] text-slate-300 leading-snug">
                    Selecionar usuário já cadastrado
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setHasUserChoice(false);
                    setIsUserRegistrationOpen(true);
                  }}
                  className="p-4 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-left transition cursor-pointer flex flex-col justify-between group active:scale-98 shadow-sm"
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-sm font-bold text-slate-200 group-hover:text-white">NÃO</span>
                    <UserPlus className="w-4 h-4 text-slate-400 group-hover:text-white" />
                  </div>
                  <span className="text-[11px] text-slate-400 group-hover:text-slate-300 leading-snug">
                    Cadastrar novo usuário agora
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ETAPA 1B: MODAL PEQUENO COM FILTRO INTELIGENTE DE USUÁRIOS*/}
          {/* ======================================================== */}
          {step === 'user_search' && (
            <div className="space-y-3.5 animate-fadeIn">
              {/* Input de Busca Inteligente */}
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    autoFocus
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Buscar por nome, e-mail ou username (ex: José, Maria)..."
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl pl-9 pr-9 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none shadow-inner"
                  />
                  <Search className="w-4 h-4 text-emerald-400 absolute left-3 top-3 pointer-events-none" />
                  {userSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setUserSearchQuery('')}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span>Exibindo apenas usuários sem salão no login</span>
                  <button
                    type="button"
                    onClick={loadPortalUsers}
                    disabled={isLoadingUsers}
                    className="text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                    <span>Atualizar lista</span>
                  </button>
                </div>
              </div>

              {/* Lista Inteligente de Usuários Elegíveis */}
              <div className="border border-slate-800 rounded-xl bg-slate-950 max-h-64 overflow-y-auto divide-y divide-slate-800/60 shadow-inner">
                {isLoadingUsers ? (
                  <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                    <span>Buscando usuários cadastrados sem salão...</span>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 space-y-3">
                    <UserCheck className="w-7 h-7 text-slate-600 mx-auto opacity-60" />
                    <div>
                      <p className="font-semibold text-slate-300">
                        {userSearchQuery
                          ? `Nenhum usuário sem salão encontrado para "${userSearchQuery}".`
                          : 'Nenhum usuário elegível disponível sem salão no momento.'}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Cadastre um novo usuário agora para vinculá-lo como proprietário.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsUserRegistrationOpen(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition cursor-pointer shadow-md inline-flex items-center gap-1.5"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-white" />
                      <span>Cadastrar Novo Usuário</span>
                    </button>
                  </div>
                ) : (
                  filteredUsers.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => {
                        handleSelectOwner(u);
                        setStep('salon_details');
                      }}
                      className="p-3 hover:bg-slate-900 transition cursor-pointer flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar avatarUrl={u.avatarUrl} name={u.name} size="sm" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition truncate">
                              {u.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">@{u.username}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 truncate">
                            <span className="truncate">{u.email || 'Sem e-mail'}</span>
                            {u.phone && (
                              <>
                                <span>·</span>
                                <span className="shrink-0">{u.phone}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 font-medium">
                          Sem Salão
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition" />
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsUserRegistrationOpen(true)}
                  className="text-xs text-emerald-400 hover:underline font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Cadastrar Novo Usuário</span>
                </button>
              </div>
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
                        placeholder="nomedosalao"
                        value={formData.slug || ''}
                        onChange={(e) => handleSlugChange(e.target.value)}
                        className="w-full bg-transparent text-xs text-emerald-400 font-mono font-medium outline-none lowercase"
                      />
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">.vagouapp.com</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-300">Categoria Principal</label>
                      <button
                        type="button"
                        onClick={() => setIsCategoryModalOpen(true)}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer font-medium"
                      >
                        + Nova Categoria
                      </button>
                    </div>
                    <select
                      value={formData.category}
                      onChange={(e) => {
                        if (e.target.value === '__new_category__') {
                          setIsCategoryModalOpen(true);
                        } else {
                          setFormData({ ...formData, category: e.target.value as any });
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 h-9 text-xs text-white outline-none"
                    >
                      {categories.map((c) => (
                        <option key={c.id || c.slug} value={c.slug}>
                          {c.name}
                        </option>
                      ))}
                      <option value="__new_category__" className="text-emerald-400 font-bold">
                        + Criar Nova Categoria...
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">CNPJ / CPF</label>
                    <input
                      type="text"
                      placeholder="00.000.000/0001-00"
                      value={formData.document_number || ''}
                      onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 h-9 text-xs text-white placeholder:text-slate-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Contatos Oficiais */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">
                  Contatos e Comunicação
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">WhatsApp Comercial</label>
                    <div className="flex items-center bg-slate-950 border border-slate-800 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 rounded-lg px-2.5 py-2">
                      <Phone className="w-3.5 h-3.5 text-slate-500 mr-2 shrink-0" />
                      <input
                        type="text"
                        placeholder="(11) 98765-4321"
                        value={formData.phone_whatsapp || ''}
                        onChange={(e) => setFormData({ ...formData, phone_whatsapp: e.target.value })}
                        className="w-full bg-transparent text-xs text-white placeholder:text-slate-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">E-mail de Contato</label>
                    <div className="flex items-center bg-slate-950 border border-slate-800 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 rounded-lg px-2.5 py-2">
                      <Mail className="w-3.5 h-3.5 text-slate-500 mr-2 shrink-0" />
                      <input
                        type="email"
                        placeholder="contato@salao.com"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-transparent text-xs text-white placeholder:text-slate-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção 3: Endereço & Localização */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">
                  Localização Geográfica
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Logradouro / Número</label>
                    <div className="flex items-center bg-slate-950 border border-slate-800 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 rounded-lg px-2.5 py-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 mr-2 shrink-0" />
                      <input
                        type="text"
                        placeholder="Rua Augusta, 1500"
                        value={formData.address || ''}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full bg-transparent text-xs text-white placeholder:text-slate-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Bairro</label>
                    <input
                      type="text"
                      placeholder="Consolação"
                      value={formData.neighborhood || ''}
                      onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Cidade</label>
                    <input
                      type="text"
                      placeholder="São Paulo"
                      value={formData.city || ''}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">CEP</label>
                    <input
                      type="text"
                      placeholder="01305-100"
                      value={formData.cep || ''}
                      onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-xs font-semibold text-slate-300 block mb-1">UF (Estado)</label>
                    <input
                      type="text"
                      maxLength={2}
                      value={formData.state || 'SP'}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-xs text-white outline-none uppercase font-mono text-center"
                    />
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* ======================================================== */}
          {/* ETAPA DE SUCESSO: LINKS DIRETOS DO APP DO SALÃO          */}
          {/* ======================================================== */}
          {step === 'success_links' && createdSalonData && (
            <div className="space-y-4 animate-fadeIn py-1">
              {/* Card Resumo do Estabelecimento Ativado */}
              <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 flex items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-3 min-w-0">
                  <SalonLogo
                    logoUrl={createdSalonData.salon.logo_url}
                    name={createdSalonData.salon.trade_name}
                    size="lg"
                    primaryColor={createdSalonData.salon.primary_color}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-white tracking-tight truncate">
                        {createdSalonData.salon.trade_name}
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#20C933] text-white">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                        <span>Ativo & Verificado</span>
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
                      <span>Proprietário: <strong className="text-slate-200">{createdSalonData.ownerName}</strong></span>
                      {createdSalonData.ownerPhone && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-slate-300">{createdSalonData.ownerPhone}</span>
                        </>
                      )}
                      <span>•</span>
                      <span className="font-mono text-emerald-400">{createdSalonData.salon.slug}.vagouapp.com</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 1. LINK DIRETO DO APP DO SALÃO PARA O PÚBLICO (CLIENTES / VITRINE) */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                      <Globe className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <span>App do Salão para o Público (Clientes)</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30 lowercase">
                          vitrine
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Link oficial para agendamento online de horários, catálogo de serviços e radar de vagas.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Input de exibição da URL e ações */}
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <div className="flex-1 min-w-[200px] bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-emerald-400 truncate select-all">
                    {publicAppUrl}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyLink(publicAppUrl, 'public')}
                      className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition flex items-center gap-1.5 cursor-pointer"
                      title="Copiar Link do App Público"
                    >
                      {copiedLink === 'public' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#20C933]" />
                          <span className="text-[#20C933] font-bold">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                    <a
                      href={publicAppUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition flex items-center gap-1.5 cursor-pointer"
                      title="Abrir App do Salão em Nova Aba"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      <span>Abrir</span>
                    </a>
                    <a
                      href={getPublicWhatsAppShareUrl()}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-400 transition flex items-center justify-center cursor-pointer"
                      title="Compartilhar no WhatsApp com Clientes"
                    >
                      <Share2 className="w-4 h-4 text-emerald-400" />
                    </a>
                  </div>
                </div>
              </div>

              {/* 2. LINK DIRETO DO APP DO SALÃO PARA O DONO (PAINEL DO PARCEIRO) */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#20C933]/15 text-[#20C933] border border-[#20C933]/30 flex items-center justify-center shrink-0">
                      <UserCheck className="w-4 h-4 text-[#20C933]" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <span>App do Salão para o Dono (Gestão & Agenda)</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30 lowercase">
                          meu negócio
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Acesso exclusivo para <strong>{createdSalonData.ownerName}</strong> gerenciar a agenda diária, equipe e relatórios.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Input de exibição da URL e ações */}
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <div className="flex-1 min-w-[200px] bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 truncate select-all">
                    {ownerAppUrl}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyLink(ownerAppUrl, 'owner')}
                      className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition flex items-center gap-1.5 cursor-pointer"
                      title="Copiar Link de Gestão do Dono"
                    >
                      {copiedLink === 'owner' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#20C933]" />
                          <span className="text-[#20C933] font-bold">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                    <a
                      href={ownerAppUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition flex items-center gap-1.5 cursor-pointer"
                      title="Abrir Painel do Dono em Nova Aba"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      <span>Acessar</span>
                    </a>
                  </div>
                </div>

                {/* BOTÃO DE DESTAQUE: ENVIAR ACESSO DIRETO PARA O WHATSAPP DO DONO */}
                <div className="pt-1">
                  <a
                    href={getOwnerWhatsAppShareUrl()}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-98"
                  >
                    <Phone className="w-4 h-4 text-white" />
                    <span>Enviar Acesso Direto para o WhatsApp do Dono ({createdSalonData.ownerPhone || 'WhatsApp'})</span>
                  </a>
                </div>
              </div>

              {/* Informação Técnica de Wildcard DNS & Supabase */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Wildcard DNS ativo para <code className="text-slate-200 font-mono">*.vagouapp.com</code>. O salão já está operacional na rede.</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between gap-3 sticky bottom-0 z-10">
          {step === 'user_check' ? (
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 transition cursor-pointer"
            >
              Cancelar
            </button>
          ) : step === 'user_search' ? (
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => setStep('user_check')}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar</span>
              </button>
              <button
                type="button"
                onClick={() => setIsUserRegistrationOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5 text-white" />
                <span>Novo Usuário</span>
              </button>
            </div>
          ) : step === 'success_links' ? (
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={handleFinalClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 transition cursor-pointer"
              >
                Concluir e Fechar
              </button>

              {onViewDetails && createdSalonData && (
                <button
                  type="button"
                  onClick={() => {
                    const sal = createdSalonData.salon;
                    handleFinalClose();
                    onViewDetails(sal);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-xs font-bold text-white transition flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95"
                >
                  <Building2 className="w-4 h-4 text-white" />
                  <span>Ver Página do Estabelecimento</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => setStep('user_search')}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar</span>
              </button>

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
            </div>
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
      {/* Modal Dedicado para Criação de Novas Categorias */}
      <AdminCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onCategoryCreated={(newCat) => {
          setFormData((prev) => ({ ...prev, category: newCat.slug as any }));
        }}
      />
    </div>
  );
};
