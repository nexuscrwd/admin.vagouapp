import React, { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  ExternalLink,
  Copy,
  Check,
  Play,
  Layers,
  Building2,
  User,
  Shield,
  Database,
  Code2,
  Sparkles,
  Info,
  X,
  Filter,
  CheckCircle2,
  Calendar,
  Zap,
  Lock,
  PlusCircle,
  Eye,
  ArrowLeft,
} from 'lucide-react';
import { UnifiedRegistrationForm } from '../public/UnifiedRegistrationForm';
import { AdminCreateAdminModal } from './AdminCreateAdminModal';
import { AdminCategoryModal } from './AdminCategoryModal';
import { AdminCreateSalonModal } from './AdminCreateSalonModal';
import { AdminAuthModal } from './AdminAuthModal';
import { SystemAdminUser } from '../../types/admin';

export type TriadeAppTarget = 'all' | 'admvapp' | 'mnvapp' | 'pvapp';

export interface TriadeFormDefinition {
  id: string;
  app: 'admvapp' | 'mnvapp' | 'pvapp';
  appName: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  flowType: 'Modal Nativo' | 'Iframe Embed' | 'Rota Direta' | 'Fluxo em Etapas';
  tables: string[];
  urlPath: string;
  sampleParams: string;
  supportedParams: { param: string; desc: string }[];
  canSimulateInPanel: boolean;
  simulationType?: 'unified_form' | 'admin_create_admin' | 'admin_category' | 'admin_create_salon' | 'admin_auth';
  defaultSimulationParams?: {
    mode?: 'cadastro' | 'login';
    type?: 'client' | 'professional';
    slug?: string;
    embed?: boolean;
  };
}

export const TRIADE_FORMS_CATALOG: TriadeFormDefinition[] = [
  // ================= ADMVAPP =================
  {
    id: 'adm-auth-modal',
    app: 'admvapp',
    appName: 'Admin Master (admvapp)',
    title: 'Autenticação Master & Recuperação',
    shortDescription: 'Login soberano de administradores da plataforma e recuperação de acesso corporativo.',
    fullDescription: 'Valida credenciais na tabela system_admins via endpoint /api/admin/auth/login. Suporta login com username (@), e-mail corporativo ou telefone.',
    flowType: 'Modal Nativo',
    tables: ['system_admins'],
    urlPath: '/api/admin/auth/login',
    sampleParams: '',
    supportedParams: [
      { param: 'identifier', desc: 'Username (ex: Anderson@), e-mail corporativo ou telefone' },
      { param: 'password', desc: 'Senha criptografada ou chave mestra Admin@2026!' },
    ],
    canSimulateInPanel: true,
    simulationType: 'admin_auth',
  },
  {
    id: 'adm-create-admin-modal',
    app: 'admvapp',
    appName: 'Admin Master (admvapp)',
    title: 'Cadastro de Novo Administrador Master',
    shortDescription: 'Criação de novos gestores corporativos com cargo superadmin ou admin.',
    fullDescription: 'Formulário restrito disponível no menu Configurações para concessão de credenciais a novos diretores ou engenheiros de dados.',
    flowType: 'Modal Nativo',
    tables: ['system_admins'],
    urlPath: '/api/admin/system-admins',
    sampleParams: '',
    supportedParams: [
      { param: 'role', desc: 'superadmin | admin | auditor' },
      { param: 'username', desc: 'Identificador único do administrador' },
    ],
    canSimulateInPanel: true,
    simulationType: 'admin_create_admin',
  },
  {
    id: 'adm-create-salon-modal',
    app: 'admvapp',
    appName: 'Admin Master (admvapp)',
    title: 'Onboarding Soberano de Estabelecimento',
    shortDescription: 'Fluxo em 2 etapas: checagem/criação do usuário proprietário e dados do estabelecimento.',
    fullDescription: 'Garante a lei da Tríade: 1 Usuário = 1 Estabelecimento. Pesquisa usuários sem salão vinculado ou abre o formulário de cadastro de novo cliente/proprietário antes de registrar o salão.',
    flowType: 'Fluxo em Etapas',
    tables: ['salons', 'profiles', 'professionals', 'clients'],
    urlPath: '/admin/salons/new',
    sampleParams: '',
    supportedParams: [
      { param: 'owner_id', desc: 'UUID do proprietário verificado no banco' },
      { param: 'slug', desc: 'Subdomínio único para *.vagouapp.com' },
    ],
    canSimulateInPanel: true,
    simulationType: 'admin_create_salon',
  },
  {
    id: 'adm-category-modal',
    app: 'admvapp',
    appName: 'Admin Master (admvapp)',
    title: 'Gestão de Categorias Comerciais',
    shortDescription: 'Criação e padronização de categorias com geração de slug automático.',
    fullDescription: 'Alimenta a tabela de categorias e permite segmentar salões no radar (Barbearia, Salão Feminino, Esmalteria, Spa, Estética).',
    flowType: 'Modal Nativo',
    tables: ['categories', 'salons'],
    urlPath: '/admin/categories',
    sampleParams: '',
    supportedParams: [
      { param: 'name', desc: 'Nome comercial da categoria' },
      { param: 'slug', desc: 'Slug URL-friendly gerado em tempo real' },
    ],
    canSimulateInPanel: true,
    simulationType: 'admin_category',
  },
  {
    id: 'adm-edit-salon-modal',
    app: 'admvapp',
    appName: 'Admin Master (admvapp)',
    title: 'Edição Master de Estabelecimento',
    shortDescription: 'Ajuste cadastral soberano de CNPJ/CPF, razão social, slug, categoria e equipe.',
    fullDescription: 'Formulário completo de auditoria para o Admin Master retificar dados fiscais e cadastrais de qualquer estabelecimento do ecossistema.',
    flowType: 'Modal Nativo',
    tables: ['salons', 'professionals', 'business_hours'],
    urlPath: '/admin/salons/edit',
    sampleParams: '',
    supportedParams: [
      { param: 'id', desc: 'UUID do estabelecimento a ser editado' },
    ],
    canSimulateInPanel: false,
  },

  // ================= MNVAPP =================
  {
    id: 'mnv-salon-onboarding',
    app: 'mnvapp',
    appName: 'App do Salão (mnvapp)',
    title: 'Onboarding de Estabelecimento Parceiro',
    shortDescription: 'Cadastro de novos salões parceiros querendo abrir conta no ecossistema Vagou.',
    fullDescription: 'Utiliza o formulário unificado com type=professional. Cria o perfil do responsável, cadastra o salão com subdomínio próprio e vincula o proprietário na equipe.',
    flowType: 'Iframe Embed',
    tables: ['salons', 'profiles', 'professionals'],
    urlPath: 'https://adm.vagouapp.com/cadastro',
    sampleParams: '?embed=true&type=professional',
    supportedParams: [
      { param: 'type', desc: 'professional (trava as abas no modo salão)' },
      { param: 'embed', desc: 'true (aplica fundo transparente e remove margens)' },
    ],
    canSimulateInPanel: true,
    simulationType: 'unified_form',
    defaultSimulationParams: {
      mode: 'cadastro',
      type: 'professional',
      embed: true,
    },
  },
  {
    id: 'mnv-login-salon',
    app: 'mnvapp',
    appName: 'App do Salão (mnvapp)',
    title: 'Acesso do Parceiro / Equipe',
    shortDescription: 'Entrada de donos e profissionais na gestão da agenda e financeiro.',
    fullDescription: 'Valida o profissional contra o salão logado e abre as permissões correspondentes no mnvapp.',
    flowType: 'Iframe Embed',
    tables: ['professionals', 'salons', 'profiles'],
    urlPath: 'https://adm.vagouapp.com/cadastro',
    sampleParams: '?embed=true&mode=login&slug=beto-studio',
    supportedParams: [
      { param: 'mode', desc: 'login (abre direto na aba de acesso)' },
      { param: 'slug', desc: 'Subdomínio do salão para validação de vínculo' },
      { param: 'embed', desc: 'true (ativa escuta do postMessage VAGOU_CLOSE_MODAL)' },
    ],
    canSimulateInPanel: true,
    simulationType: 'unified_form',
    defaultSimulationParams: {
      mode: 'login',
      type: 'professional',
      slug: 'beto-studio',
      embed: true,
    },
  },
  {
    id: 'mnv-team-member',
    app: 'mnvapp',
    appName: 'App do Salão (mnvapp)',
    title: 'Cadastro de Profissional da Equipe',
    shortDescription: 'Inclusão de barbeiros, manicures e cabeleireiros na equipe do salão.',
    fullDescription: 'Define nome, telefone, comissão percentual, especialidades e grade de atendimento individual do colaborador.',
    flowType: 'Modal Nativo',
    tables: ['professionals', 'salons'],
    urlPath: 'https://seunegocio.vagouapp.com/equipe/novo',
    sampleParams: '',
    supportedParams: [
      { param: 'salon_id', desc: 'UUID do salão proprietário' },
      { param: 'role', desc: 'Cargo do profissional na casa' },
    ],
    canSimulateInPanel: false,
  },
  {
    id: 'mnv-service-offer',
    app: 'mnvapp',
    appName: 'App do Salão (mnvapp)',
    title: 'Cadastro de Serviços & Preços',
    shortDescription: 'Tabela de serviços oferecidos pelo salão com tempo de execução e valor.',
    fullDescription: 'Alimenta o catálogo da vitrine e define duração para o motor de horários disponíveis na agenda diária.',
    flowType: 'Modal Nativo',
    tables: ['service_offers', 'salons'],
    urlPath: 'https://seunegocio.vagouapp.com/servicos/novo',
    sampleParams: '',
    supportedParams: [
      { param: 'price', desc: 'Preço em centavos ou formato decimal BRL' },
      { param: 'duration_minutes', desc: 'Duração em minutos (ex: 30, 45, 60)' },
    ],
    canSimulateInPanel: false,
  },
  {
    id: 'mnv-manual-appointment',
    app: 'mnvapp',
    appName: 'App do Salão (mnvapp)',
    title: 'Lançamento de Agendamento Manual (Balcão)',
    shortDescription: 'Encaixe de cliente presencial ou recebido via WhatsApp na grade diária.',
    fullDescription: 'Permite selecionar profissional, cliente cadastrado ou nome avulso, serviço e horário para bloqueio instantâneo da vaga.',
    flowType: 'Modal Nativo',
    tables: ['appointments', 'clients', 'service_offers'],
    urlPath: 'https://seunegocio.vagouapp.com/agenda/novo',
    sampleParams: '',
    supportedParams: [
      { param: 'date', desc: 'Data do agendamento (AAAA-MM-DD)' },
      { param: 'slot_time', desc: 'Horário de início (HH:mm)' },
    ],
    canSimulateInPanel: false,
  },
  {
    id: 'mnv-radar-flash-slot',
    app: 'mnvapp',
    appName: 'App do Salão (mnvapp)',
    title: 'Disparo de Vaga Relâmpago (Radar)',
    shortDescription: 'Criação de vaga imediata com desconto promocional e contagem regressiva.',
    fullDescription: 'Publica vaga com urgency_level alto no feed do marketplace com expiração configurável (15 a 90 minutos) para preencher horários ociosos.',
    flowType: 'Modal Nativo',
    tables: ['appointments', 'service_offers', 'radar_slots'],
    urlPath: 'https://seunegocio.vagouapp.com/radar/publicar',
    sampleParams: '',
    supportedParams: [
      { param: 'discount_percentage', desc: 'Percentual de desconto relâmpago' },
      { param: 'expires_in_minutes', desc: 'Tempo de expiração da vaga' },
    ],
    canSimulateInPanel: false,
  },
  {
    id: 'mnv-business-hours',
    app: 'mnvapp',
    appName: 'App do Salão (mnvapp)',
    title: 'Grade de Horários & Exceções',
    shortDescription: 'Configuração da grade semanal de funcionamento e intervalos.',
    fullDescription: 'Alimenta o campo business_hours na tabela salons para cálculo automático dos horários livres na vitrine de agendamento.',
    flowType: 'Modal Nativo',
    tables: ['salons'],
    urlPath: 'https://seunegocio.vagouapp.com/horarios',
    sampleParams: '',
    supportedParams: [
      { param: 'weekdays', desc: 'Matriz JSON de abertura, almoço e fechamento' },
    ],
    canSimulateInPanel: false,
  },

  // ================= PVAPP =================
  {
    id: 'pv-client-salon-embed',
    app: 'pvapp',
    appName: 'Portal / Vitrine (pvapp)',
    title: 'Cadastro de Cliente no Salão (Embed Blindado)',
    shortDescription: 'Cadastro de cliente ao agendar na vitrine do salão com abas de tipo ocultadas.',
    fullDescription: 'O formulário trava em type=client, oculta "Sou Profissional", colhe os dados pessoais (Nome, WhatsApp, E-mail) e fecha o modal via postMessage ao concluir.',
    flowType: 'Iframe Embed',
    tables: ['clients', 'profiles', 'dependents'],
    urlPath: 'https://adm.vagouapp.com/cadastro',
    sampleParams: '?embed=true&type=client&slug=beto-studio',
    supportedParams: [
      { param: 'type', desc: 'client (oculta abas e trava como cliente)' },
      { param: 'slug', desc: 'Identificador do salão para vínculo imediato' },
      { param: 'embed', desc: 'true (estilização transparente para modal do salão)' },
    ],
    canSimulateInPanel: true,
    simulationType: 'unified_form',
    defaultSimulationParams: {
      mode: 'cadastro',
      type: 'client',
      slug: 'beto-studio',
      embed: true,
    },
  },
  {
    id: 'pv-client-login-embed',
    app: 'pvapp',
    appName: 'Portal / Vitrine (pvapp)',
    title: 'Login de Cliente na Vitrine do Salão',
    shortDescription: 'Acesso rápido para cliente que já possui conta confirmar seu agendamento.',
    fullDescription: 'Abre no modo de login, valida o cliente no Supabase e emite mensagem de sucesso ao salão pai.',
    flowType: 'Iframe Embed',
    tables: ['profiles', 'clients'],
    urlPath: 'https://adm.vagouapp.com/cadastro',
    sampleParams: '?embed=true&mode=login&type=client&slug=beto-studio',
    supportedParams: [
      { param: 'mode', desc: 'login' },
      { param: 'type', desc: 'client' },
      { param: 'slug', desc: 'Subdomínio do salão' },
    ],
    canSimulateInPanel: true,
    simulationType: 'unified_form',
    defaultSimulationParams: {
      mode: 'login',
      type: 'client',
      slug: 'beto-studio',
      embed: true,
    },
  },
  {
    id: 'pv-client-full-portal',
    app: 'pvapp',
    appName: 'Portal / Vitrine (pvapp)',
    title: 'Cadastro Geral do Cidadão (Marketplace)',
    shortDescription: 'Cadastro completo em 3 passos no marketplace portal.vagouapp.com.',
    fullDescription: 'Etapa 1: Pessoa Física ➔ Etapa 2: Endereço Residencial (ViaCEP) ➔ Etapa 3: Dependentes (filhos, cônjuges para agendamentos familiares).',
    flowType: 'Rota Direta',
    tables: ['clients', 'profiles', 'dependents'],
    urlPath: 'https://adm.vagouapp.com/cadastro',
    sampleParams: '?mode=cadastro',
    supportedParams: [
      { param: 'mode', desc: 'cadastro' },
    ],
    canSimulateInPanel: true,
    simulationType: 'unified_form',
    defaultSimulationParams: {
      mode: 'cadastro',
      type: 'client',
      embed: false,
    },
  },
  {
    id: 'pv-appointment-confirmation',
    app: 'pvapp',
    appName: 'Portal / Vitrine (pvapp)',
    title: 'Confirmação de Agendamento na Vitrine',
    shortDescription: 'Etapa final do cliente escolhendo profissional, data, horário e dependente.',
    fullDescription: 'Salva o agendamento com status confirmed, dispara cálculo de comissão e notifica a agenda do salão.',
    flowType: 'Modal Nativo',
    tables: ['appointments', 'clients', 'service_offers', 'professionals'],
    urlPath: 'https://beto-studio.vagouapp.com/agendar',
    sampleParams: '',
    supportedParams: [
      { param: 'service_id', desc: 'UUID do serviço selecionado' },
      { param: 'professional_id', desc: 'UUID do profissional escolhido' },
      { param: 'slot_time', desc: 'Data e horário em ISO 8601' },
    ],
    canSimulateInPanel: false,
  },
  {
    id: 'pv-service-review',
    app: 'pvapp',
    appName: 'Portal / Vitrine (pvapp)',
    title: 'Avaliação Pós-Atendimento (Reviews)',
    shortDescription: 'Formulário de nota (1 a 5 estrelas) e comentário pós-serviço.',
    fullDescription: 'Permite ao cliente avaliar o serviço recebido, alimentando a média de estrelas e reputação do salão.',
    flowType: 'Modal Nativo',
    tables: ['reviews', 'appointments', 'salons'],
    urlPath: 'https://portal.vagouapp.com/avaliar',
    sampleParams: '',
    supportedParams: [
      { param: 'appointment_id', desc: 'UUID do agendamento concluído' },
      { param: 'rating', desc: 'Nota de 1 a 5' },
    ],
    canSimulateInPanel: false,
  },
];

export interface AdminTriadeFormsCatalogProps {
  onBack?: () => void;
}

export const AdminTriadeFormsCatalog: React.FC<AdminTriadeFormsCatalogProps> = ({ onBack }) => {
  const [selectedApp, setSelectedApp] = useState<TriadeAppTarget>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Estados de Simulação / Sandbox
  const [activeSimulationForm, setActiveSimulationForm] = useState<TriadeFormDefinition | null>(null);
  const [simSlug, setSimSlug] = useState('beto-studio');
  const [simType, setSimType] = useState<'client' | 'professional'>('client');
  const [simMode, setSimMode] = useState<'cadastro' | 'login'>('cadastro');
  const [simEmbed, setSimEmbed] = useState(true);

  // Modais Nativos para Teste
  const [isCreateAdminOpen, setIsCreateAdminOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isCreateSalonOpen, setIsCreateSalonOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Filtragem dos Formulários
  const filteredForms = useMemo(() => {
    return TRIADE_FORMS_CATALOG.filter((f) => {
      const matchApp = selectedApp === 'all' || f.app === selectedApp;
      const query = searchQuery.trim().toLowerCase();
      const matchSearch =
        !query ||
        f.title.toLowerCase().includes(query) ||
        f.shortDescription.toLowerCase().includes(query) ||
        f.appName.toLowerCase().includes(query) ||
        f.tables.some((t) => t.toLowerCase().includes(query)) ||
        f.urlPath.toLowerCase().includes(query);
      return matchApp && matchSearch;
    });
  }, [selectedApp, searchQuery]);

  // Contadores
  const counts = useMemo(() => {
    return {
      all: TRIADE_FORMS_CATALOG.length,
      admvapp: TRIADE_FORMS_CATALOG.filter((f) => f.app === 'admvapp').length,
      mnvapp: TRIADE_FORMS_CATALOG.filter((f) => f.app === 'mnvapp').length,
      pvapp: TRIADE_FORMS_CATALOG.filter((f) => f.app === 'pvapp').length,
    };
  }, []);

  const handleCopyLink = (form: TriadeFormDefinition) => {
    let url = form.urlPath;
    if (form.sampleParams) {
      url += form.sampleParams;
    }
    navigator.clipboard.writeText(url);
    setCopiedId(form.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyEmbedSnippet = (form: TriadeFormDefinition) => {
    const snippet = `<iframe
  src="${form.urlPath}${form.sampleParams || '?embed=true'}"
  className="w-full h-[650px] border-0 rounded-2xl bg-transparent"
  allow="clipboard-write"
/>`;
    navigator.clipboard.writeText(snippet);
    setCopiedId(`${form.id}-snippet`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStartSimulation = (form: TriadeFormDefinition) => {
    if (form.simulationType === 'admin_auth') {
      setIsAuthModalOpen(true);
      return;
    }
    if (form.simulationType === 'admin_create_admin') {
      setIsCreateAdminOpen(true);
      return;
    }
    if (form.simulationType === 'admin_category') {
      setIsCategoryModalOpen(true);
      return;
    }
    if (form.simulationType === 'admin_create_salon') {
      setIsCreateSalonOpen(true);
      return;
    }
    if (form.simulationType === 'unified_form') {
      if (form.defaultSimulationParams) {
        setSimMode(form.defaultSimulationParams.mode || 'cadastro');
        setSimType(form.defaultSimulationParams.type || 'client');
        setSimSlug(form.defaultSimulationParams.slug || 'beto-studio');
        setSimEmbed(form.defaultSimulationParams.embed ?? true);
      }
      setActiveSimulationForm(form);
    }
  };

  return (
    <div className="space-y-6">
      {onBack && (
        <div className="flex items-center justify-between pb-1">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3.5 py-2 rounded-xl transition cursor-pointer active:scale-95 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-[#20C933]" />
            <span>Voltar para Configurações</span>
          </button>
        </div>
      )}

      {/* BANNER PRINCIPAL: Central de Formulários da Tríade */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#20C933]/15 text-[#20C933] border border-[#20C933]/30 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-950/30">
              <FileText className="w-6 h-6 text-[#20C933]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Central de Formulários da Tríade
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#20C933] text-white">
                  {counts.all} Formulários Mapeados
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Mapeamento soberano, parâmetros, tabelas Supabase e simulador em tempo real para os 3 apps da Tríade.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => {
                setActiveSimulationForm(TRIADE_FORMS_CATALOG.find((f) => f.id === 'pv-client-salon-embed') || null);
              }}
              className="px-3.5 py-2 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-950/20 active:scale-95"
            >
              <Play className="w-3.5 h-3.5 text-white fill-white" />
              <span>Simular Cadastro do Salão</span>
            </button>
          </div>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="pt-2 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-t border-slate-800/80">
          {/* Tabs por Aplicativo */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0 overflow-x-auto">
            <button
              onClick={() => setSelectedApp('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                selectedApp === 'all'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Todos ({counts.all})</span>
            </button>

            <button
              onClick={() => setSelectedApp('admvapp')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                selectedApp === 'admvapp'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>admvapp ({counts.admvapp})</span>
            </button>

            <button
              onClick={() => setSelectedApp('mnvapp')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                selectedApp === 'mnvapp'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>mnvapp ({counts.mnvapp})</span>
            </button>

            <button
              onClick={() => setSelectedApp('pvapp')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                selectedApp === 'pvapp'
                  ? 'bg-[#20C933] text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>pvapp ({counts.pvapp})</span>
            </button>
          </div>

          {/* Campo de Busca Rápida */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por nome, tabela Supabase ou parâmetro..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition"
            />
          </div>
        </div>
      </div>

      {/* GRADE DE FORMULÁRIOS MAPEADOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredForms.map((form) => {
          const isCopied = copiedId === form.id;
          const isSnippetCopied = copiedId === `${form.id}-snippet`;

          return (
            <div
              key={form.id}
              className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-4 shadow-sm relative group"
            >
              <div className="space-y-3">
                {/* Header do Card */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      form.app === 'admvapp'
                        ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-700/50'
                        : form.app === 'mnvapp'
                        ? 'bg-sky-950/80 text-sky-300 border border-sky-700/50'
                        : 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50'
                    }`}
                  >
                    {form.appName}
                  </span>

                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                    {form.flowType}
                  </span>
                </div>

                {/* Título & Descrição */}
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition tracking-tight">
                    {form.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {form.shortDescription}
                  </p>
                </div>

                {/* Tabelas Afetadas no Supabase */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                    <Database className="w-3 h-3 text-emerald-400" />
                    <span>Tabelas Supabase:</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {form.tables.map((tbl) => (
                      <span
                        key={tbl}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800"
                      >
                        {tbl}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Rota ou Parâmetros */}
                {form.sampleParams && (
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] font-mono text-emerald-400 truncate">
                    {form.sampleParams}
                  </div>
                )}
              </div>

              {/* Botões de Ação no Rodapé */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleCopyLink(form)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                    title={isCopied ? 'URL Copiada!' : 'Copiar URL completa'}
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  {form.sampleParams && (
                    <button
                      onClick={() => handleCopyEmbedSnippet(form)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                      title={isSnippetCopied ? 'Iframe Copiado!' : 'Copiar Código Iframe Embed'}
                    >
                      {isSnippetCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Code2 className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                {form.canSimulateInPanel ? (
                  <button
                    onClick={() => handleStartSimulation(form)}
                    className="px-3 py-1.5 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-sm active:scale-95"
                  >
                    <Play className="w-3 h-3 text-white fill-white" />
                    <span>Testar Agora</span>
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-500 italic">Disponível no app pai</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* GUIA DA LEI DA TRÍADE & EVENTOS POSTMESSAGE */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-bold text-white tracking-tight">
            Protocolo de Integração por Embed (mnvapp ⇄ admvapp ⇄ pvapp)
          </h3>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Para garantir que o cliente ou parceiro nunca saia da página de origem, os formulários do Admin Master rodam dentro de um <code>&lt;iframe&gt;</code> transparente. Ao concluir o envio com sucesso ou ao tocar no botão "X" de fechar, o formulário dispara o evento padronizado:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <span className="font-bold text-emerald-400 font-mono text-[11px]">1. Fechamento do Modal</span>
            <p className="text-slate-400 text-[11px]">
              O iframe emite <code>window.parent.postMessage({'{'} type: &apos;VAGOU_CLOSE_MODAL&apos; {'}'}, &apos;*&apos;)</code>. O app pai deve fechar o modal imediatamente.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <span className="font-bold text-sky-400 font-mono text-[11px]">2. Identidade Única do Usuário</span>
            <p className="text-slate-400 text-[11px]">
              O parâmetro <code>type=client&amp;slug=beto-studio</code> trava o cadastro no salão e oculta as abas de seleção, garantindo que o cliente não veja a opção &quot;Sou Profissional&quot;.
            </p>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL SIMULADOR / SANDBOX INTERATIVO                    */}
      {/* ======================================================== */}
      {activeSimulationForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl relative my-auto max-h-[94vh] flex flex-col overflow-hidden">
            {/* Header do Simulador */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#20C933]/15 text-[#20C933] border border-[#20C933]/30 flex items-center justify-center shrink-0">
                  <Play className="w-4 h-4 text-[#20C933] fill-[#20C933]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                    Simulador: {activeSimulationForm.title}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Ambiente sandbox isolado para teste dos formulários da Tríade.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveSimulationForm(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Fechar"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Controles de Parâmetros Rápidos do Simulador */}
            <div className="p-3 bg-slate-900/40 border-b border-slate-800 flex flex-wrap items-center gap-3 text-xs shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-semibold text-[11px]">Tipo:</span>
                <select
                  value={simType}
                  onChange={(e) => setSimType(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-white text-xs outline-none"
                >
                  <option value="client">Cliente (client)</option>
                  <option value="professional">Profissional (professional)</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-semibold text-[11px]">Salão (Slug):</span>
                <input
                  type="text"
                  value={simSlug}
                  onChange={(e) => setSimSlug(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-white text-xs outline-none w-28 font-mono"
                  placeholder="beto-studio"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={simEmbed}
                    onChange={(e) => setSimEmbed(e.target.checked)}
                    className="accent-emerald-500 rounded"
                  />
                  <span>Modo Embed (Transparente)</span>
                </label>
              </div>
            </div>

            {/* Visualizador do Formulário */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-4">
              <UnifiedRegistrationForm
                initialType={simType}
                hideTypeSelector={true}
                onClose={() => setActiveSimulationForm(null)}
                onSuccess={() => {
                  alert('✅ Formulário enviado com sucesso no teste da sandbox!');
                  setActiveSimulationForm(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAIS NATIVOS DISPARADOS PELO CATÁLOGO */}
      {isCreateAdminOpen && (
        <AdminCreateAdminModal
          isOpen={isCreateAdminOpen}
          onClose={() => setIsCreateAdminOpen(false)}
          onSuccess={() => {
            setIsCreateAdminOpen(false);
          }}
        />
      )}

      {isCategoryModalOpen && (
        <AdminCategoryModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
        />
      )}

      {isCreateSalonOpen && (
        <AdminCreateSalonModal
          isOpen={isCreateSalonOpen}
          onClose={() => setIsCreateSalonOpen(false)}
          onSuccess={() => {
            setIsCreateSalonOpen(false);
          }}
        />
      )}

      {isAuthModalOpen && (
        <AdminAuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={() => {
            setIsAuthModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
