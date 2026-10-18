import React, { useState } from 'react';
import {
  Building2,
  Users,
  ShieldCheck,
  KeyRound,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Lock,
  Layers,
  Sparkles,
  Columns,
  RotateCcw,
  Globe,
  Briefcase,
  ChevronRight,
  ShieldAlert,
  CalendarCheck,
  UserPlus,
  UserCheck,
  Code,
  Copy,
  Check,
  X,
  Share2,
  MapPin,
  User,
  Smartphone,
  Search,
} from 'lucide-react';

// Os 4 Formulários Canônicos Principais da Tríade
import { TriadeMnvClientLoginForm } from './triade-forms/TriadeMnvClientLoginForm';
import { TriadeMnvClientRegisterForm } from './triade-forms/TriadeMnvClientRegisterForm';
import { TriadeEstablishmentMasterForm } from './triade-forms/TriadeEstablishmentMasterForm';
import { TriadeAdminLoginForm } from './triade-forms/TriadeAdminLoginForm';
import { TriadeAdminRecoveryForm } from './triade-forms/TriadeAdminRecoveryForm';
import { TriadeAdminRegisterForm } from './triade-forms/TriadeAdminRegisterForm';
import { TriadeAdminAuthForm } from './triade-forms/TriadeAdminAuthForm';
import { TriadeUserRegisterForm, UserRegisterPhase } from './triade-forms/TriadeUserRegisterForm';
import { TriadeUserLoginForm, UserLoginPhase } from './triade-forms/TriadeUserLoginForm';

export type MainTabType =
  | 'estabelecimento'
  | 'usuarios'
  | 'embeds';
export type UserFlow = 'login' | 'cadastro' | 'ambos';
export type MnvUserFlow = 'acesso' | 'cadastro' | 'ambos';
export type AdminFlow = 'login' | 'recovery' | 'cadastro' | 'ambos';
export type EstabFlow = 'user_check' | 'user_login' | 'user_register' | 'establishment_details' | 'ambos';

export interface AdminTriadeFormsCatalogProps {
  onBack?: () => void;
  activeTab?: MainTabType;
  onTabChange?: (tab: MainTabType) => void;
}

export const AdminTriadeFormsCatalog: React.FC<AdminTriadeFormsCatalogProps> = ({
  onBack,
  activeTab,
  onTabChange,
}) => {
  // Aba Principal Selecionada com controle externo e interno
  const [internalTab, setInternalTab] = useState<MainTabType>('estabelecimento');
  const activeMainTab = activeTab || internalTab;
  const setActiveMainTab = (tab: MainTabType) => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  // Sub-fluxo da Aba Usuário: Login vs Cadastro
  const [userFlow, setUserFlow] = useState<UserFlow>('cadastro');
  const [registerPhase, setRegisterPhase] = useState<UserRegisterPhase>('all');
  const [loginPhase, setLoginPhase] = useState<UserLoginPhase>('credentials');

  // Sub-fluxo da Aba Forms mnvapp: Acesso do usuário vs Cadastro de usuário vs Lado a Lado
  const [mnvUserFlow, setMnvUserFlow] = useState<MnvUserFlow>('acesso');

  // Sub-fluxo da Aba Cadastro de Estabelecimento: 4 Fases do onboarding + Lado a Lado
  const [estabFlow, setEstabFlow] = useState<EstabFlow>('ambos');

  // Sub-fluxo da Aba Adminvapp: Login vs Recuperação de Acesso vs Lado a Lado
  const [adminFlow, setAdminFlow] = useState<AdminFlow>('login');

  // Modal / Drawer de Embed Universal
  const [embedModalForm, setEmbedModalForm] = useState<string | null>(null);
  const [hasCopiedEmbed, setHasCopiedEmbed] = useState(false);

  // Amostras de Salões para testar a Maquiagem de Identidade do Salão
  const sampleSalons = [
    {
      id: 'sal-vagouapp',
      name: 'VagouApp',
      accentColor: '#20C933',
    },
    {
      id: 'sal-001',
      name: 'Barbearia Rota 99',
      accentColor: '#20C933',
    },
    {
      id: 'sal-002',
      name: 'Studio Bella Donna',
      accentColor: '#10B981',
    },
    {
      id: 'sal-003',
      name: 'Navalha de Ouro Barber',
      accentColor: '#059669',
    },
  ];
  const [selectedPreviewSalon, setSelectedPreviewSalon] = useState(sampleSalons[0]);

  // Feedback de teste / submissão
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const handleTriggerFeedback = (text: string) => {
    setActionFeedback(text);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const currentEmbedCode = embedModalForm
    ? `<iframe\n  src="https://adm.vagouapp.com/embed?form=${embedModalForm}"\n  width="100%"\n  height="650"\n  frameborder="0"\n  allow="clipboard-write"\n></iframe>`
    : '';

  const handleCopyEmbed = () => {
    if (currentEmbedCode) {
      navigator.clipboard.writeText(currentEmbedCode);
      setHasCopiedEmbed(true);
      setTimeout(() => setHasCopiedEmbed(false), 2500);
      handleTriggerFeedback('Código de incorporação <iframe> copiado para a área de transferência!');
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn font-['Poppins']">


      {/* Alerta de Feedback de Ação */}
      {actionFeedback && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-fadeIn font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📌 DOMÍNIO 1: ESTABELECIMENTO (LOGIN DO PARCEIRO & CADASTRO DE NOVO SALÃO) */}
      {/* ========================================================================= */}
      {activeMainTab === 'estabelecimento' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Sub-cabeçalho Plano e Minimalista do Domínio Estabelecimento */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-0.5">
              <button
                type="button"
                onClick={() => setEstabFlow('user_login')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  estabFlow === 'user_login'
                    ? 'bg-[#20C933] text-white shadow-xs'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>1. Login do Estabelecimento (Dono / Profissionais)</span>
              </button>

              <button
                type="button"
                onClick={() => setEstabFlow(estabFlow === 'user_login' ? 'user_check' : estabFlow)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  estabFlow !== 'user_login'
                    ? 'bg-[#20C933] text-white shadow-xs'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>2. Cadastro de Novo Estabelecimento (Master)</span>
              </button>
            </div>

            {/* Ação de Embed */}
            <button
              type="button"
              onClick={() => setEmbedModalForm(estabFlow === 'user_login' ? 'mnv_login' : 'estabelecimento')}
              className="py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-auto"
            >
              <Code className="w-3.5 h-3.5 text-emerald-400" />
              <span>Gerar Embed (&lt;iframe&gt;)</span>
            </button>
          </div>

          {/* Sub-barra de Navegação de Fases do Cadastro (Exibida diretamente abaixo da Aba Principal no Admin-Vapp) */}
          {estabFlow !== 'user_login' && (
            <div className="p-2 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center justify-start sm:justify-center gap-1.5 overflow-x-auto max-w-full animate-fadeIn">
              {[
                { id: 'user_check', num: '1', label: 'Identificação (Sim/Não)', icon: UserCheck },
                { id: 'user_login', num: '2', label: 'Login Proprietário', icon: KeyRound },
                { id: 'user_register', num: '3', label: 'Cadastro Proprietário', icon: UserPlus },
                { id: 'establishment_details', num: '4', label: 'Dados do Salão', icon: Building2 },
              ].map((step) => {
                const isActive = estabFlow === step.id;
                const IconComponent = step.icon;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setEstabFlow(step.id as any)}
                    className={`py-1.5 px-3 rounded-xl text-center transition cursor-pointer flex items-center justify-center gap-1.5 border whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-[#20C933] text-white font-bold border-emerald-400 shadow-sm'
                        : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800 border-slate-800 text-xs'
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                    <span className="text-xs">
                      {step.num}. {step.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Renderização do Form Selecionado */}
          {estabFlow === 'user_login' ? (
            <div className="max-w-md mx-auto w-full py-2">
              <TriadeMnvClientLoginForm
                salonName={selectedPreviewSalon.name}
                onSuccess={(data) =>
                  handleTriggerFeedback(`Login do profissional/dono validado para "${data.identifier}" no salão ${selectedPreviewSalon.name}`)
                }
                onSwitchToRegister={() => setEstabFlow('user_check')}
              />
            </div>
          ) : (
            <div className="py-2">
              <TriadeEstablishmentMasterForm
                forcedStep={estabFlow as any}
                onSuccess={(salonData) =>
                  handleTriggerFeedback(
                    `Novo estabelecimento "${salonData.tradeName}" (CNPJ: ${salonData.documentNumber}) cadastrado com sucesso!`
                  )
                }
              />
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📌 DOMÍNIO 2: USUÁRIOS (LOGIN DO CLIENTE & CADASTRO DO CLIENTE)          */}
      {/* ========================================================================= */}
      {activeMainTab === 'usuarios' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Sub-cabeçalho Plano e Minimalista do Domínio Usuários */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-0.5">
              <button
                type="button"
                onClick={() => setUserFlow('login')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  userFlow === 'login'
                    ? 'bg-[#20C933] text-white shadow-xs'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>1. Login de Usuário</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUserFlow('cadastro');
                  setRegisterPhase('all');
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  userFlow === 'cadastro'
                    ? 'bg-[#20C933] text-white shadow-xs'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>2. Cadastro de Usuário (com Vínculo Automático ao Salão)</span>
              </button>
            </div>

            {/* Ação de Embed */}
            <button
              type="button"
              onClick={() => setEmbedModalForm(userFlow === 'cadastro' ? 'usuario' : 'usuario_login')}
              className="py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-auto"
            >
              <Code className="w-3.5 h-3.5 text-emerald-400" />
              <span>Gerar Embed (&lt;iframe&gt;)</span>
            </button>
          </div>

          {/* Cards Renderizados */}
          <div className="grid grid-cols-1 max-w-xl mx-auto py-2">
            {userFlow === 'login' ? (
              <TriadeUserLoginForm
                activePhase={loginPhase}
                onPhaseChange={setLoginPhase}
                onSuccess={(data) =>
                  handleTriggerFeedback(
                    `Acesso validado com sucesso para o usuário "${data.identifier}"!`
                  )
                }
                onSwitchToRegister={() => {
                  setUserFlow('cadastro');
                  setRegisterPhase('all');
                }}
              />
            ) : (
              <TriadeUserRegisterForm
                activePhase={registerPhase}
                onPhaseChange={setRegisterPhase}
                onSuccess={(data) =>
                  handleTriggerFeedback(
                    `Usuário "${data.fullName}" (${data.username}) cadastrado com sucesso! E-mail: ${data.email} | Celular: ${data.phone}`
                  )
                }
                onSwitchToLogin={() => {
                  setUserFlow('login');
                  setLoginPhase('credentials');
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📌 CONTEÚDO DA ABA 2: ESTABELECIMENTOS */}
      {/* ========================================================================= */}
      {activeMainTab === 'establishment' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Header Contextual com Seletor de Sub-fluxo */}
          <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col xl:flex-row xl:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-500 dark:text-emerald-400">Estabelecimentos</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap self-start xl:self-auto">
              {/* Alternador de Sub-fluxo: Fases 1 a 4 + Lado a Lado */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 flex-wrap">
                <button
                  type="button"
                  onClick={() => setEstabFlow('user_check')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    estabFlow === 'user_check'
                      ? 'bg-[#20C933] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>1. Identificação</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEstabFlow('user_login')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    estabFlow === 'user_login'
                      ? 'bg-[#20C933] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>2. Login</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEstabFlow('user_register')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    estabFlow === 'user_register'
                      ? 'bg-[#20C933] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>3. Cadastro</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEstabFlow('establishment_details')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    estabFlow === 'establishment_details'
                      ? 'bg-[#20C933] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>4. Dados do Salão</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEstabFlow('ambos')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    estabFlow === 'ambos'
                      ? 'bg-[#20C933] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span>Lado a Lado (Todas)</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setEmbedModalForm('estabelecimento')}
                className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Code className="w-3.5 h-3.5 text-emerald-400" />
                <span>Embed</span>
              </button>
            </div>
          </div>

          {/* Renderização das Fases / Grid Lado a Lado */}
          <div
            className={`grid gap-5 items-start ${
              estabFlow === 'ambos'
                ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-4'
                : 'grid-cols-1 max-w-2xl mx-auto'
            } py-2`}
          >
            {/* FASE 1: PERGUNTA SE É USUÁRIO OU NÃO */}
            {(estabFlow === 'user_check' || estabFlow === 'ambos') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="text-xs font-bold text-emerald-400">
                      1. Modal Identificação (Sim/Não)
                    </span>
                  </div>
                </div>

                <TriadeEstablishmentMasterForm
                  forcedStep="user_check"
                  onSuccess={(data) =>
                    handleTriggerFeedback(
                      `Estabelecimento "${data.tradeName}" cadastrado com sucesso!`
                    )
                  }
                />
              </div>
            )}

            {/* FASE 2: LOGIN DO PROPRIETÁRIO (SE SIM) */}
            {(estabFlow === 'user_login' || estabFlow === 'ambos') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="text-xs font-bold text-emerald-400">
                      2. Login do Proprietário (Se SIM)
                    </span>
                  </div>
                </div>

                <TriadeEstablishmentMasterForm
                  forcedStep="user_login"
                  onSuccess={(data) =>
                    handleTriggerFeedback(
                      `Login e estabelecimento "${data.tradeName}" vinculados!`
                    )
                  }
                />
              </div>
            )}

            {/* FASE 3: CADASTRO DO PROPRIETÁRIO (SE NÃO) */}
            {(estabFlow === 'user_register' || estabFlow === 'ambos') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="text-xs font-bold text-emerald-400">
                      3. Cadastro de Proprietário (Se NÃO)
                    </span>
                  </div>
                </div>

                <TriadeEstablishmentMasterForm
                  forcedStep="user_register"
                  onSuccess={(data) =>
                    handleTriggerFeedback(
                      `Proprietário e estabelecimento "${data.tradeName}" criados!`
                    )
                  }
                />
              </div>
            )}

            {/* FASE 4: DADOS DO ESTABELECIMENTO */}
            {(estabFlow === 'establishment_details' || estabFlow === 'ambos') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="text-xs font-bold text-emerald-400">
                      4. Dados do Estabelecimento
                    </span>
                  </div>
                </div>

                <TriadeEstablishmentMasterForm
                  forcedStep="establishment_details"
                  onSuccess={(data) =>
                    handleTriggerFeedback(
                      `Estabelecimento "${data.tradeName}" (CNPJ: ${data.documentNumber}) cadastrado com sucesso! Proprietário: ${data.ownerName}.`
                    )
                  }
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📌 CONTEÚDO DA ABA 3: ADMINVAPP (DOMÍNIO EXCLUSIVO) */}
      {/* ========================================================================= */}
      {activeMainTab === 'adminvapp_form' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Header Contextual com Seletor de Sub-fluxo */}
          <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-500 dark:text-emerald-400">Adminvapp</span>
            </div>

            {/* Alternador de Sub-fluxo: Login vs Recuperação de Acesso vs Cadastrar Administrador vs Lado a Lado */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 self-start md:self-auto flex-wrap">
              <button
                type="button"
                onClick={() => setAdminFlow('login')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  adminFlow === 'login'
                    ? 'bg-[#20C933] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>1. Login</span>
              </button>

              <button
                type="button"
                onClick={() => setAdminFlow('recovery')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  adminFlow === 'recovery'
                    ? 'bg-[#20C933] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>2. Recuperar Acesso</span>
              </button>

              <button
                type="button"
                onClick={() => setAdminFlow('cadastro')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  adminFlow === 'cadastro'
                    ? 'bg-[#20C933] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>3. Cadastrar Administrador</span>
              </button>

              <button
                type="button"
                onClick={() => setAdminFlow('ambos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  adminFlow === 'ambos'
                    ? 'bg-[#20C933] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Lado a Lado</span>
              </button>
            </div>
          </div>

          {/* Cards Renderizados */}
          <div
            className={`grid gap-5 items-start ${
              adminFlow === 'ambos'
                ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'
                : 'grid-cols-1 max-w-lg mx-auto'
            } py-2`}
          >
            {/* SUB-ITEM 1: FORMULÁRIO DE LOGIN */}
            {(adminFlow === 'login' || adminFlow === 'ambos') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="text-xs font-bold text-emerald-400">
                      Login
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEmbedModalForm('admin_login')}
                    className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Code className="w-3 h-3" />
                    <span>Embed</span>
                  </button>
                </div>

                <TriadeAdminLoginForm
                  onSuccess={(admin) =>
                    handleTriggerFeedback(`Acesso autorizado para: @${admin.username || admin.email}`)
                  }
                  onSwitchToRecovery={() => setAdminFlow('recovery')}
                  onSwitchToRegister={() => setAdminFlow('cadastro')}
                />
              </div>
            )}

            {/* SUB-ITEM 2: FORMULÁRIO DE RECUPERAÇÃO DE ACESSO */}
            {(adminFlow === 'recovery' || adminFlow === 'ambos') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="text-xs font-bold text-emerald-400">
                      Recuperação de Acesso
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEmbedModalForm('admin_recovery')}
                    className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Code className="w-3 h-3" />
                    <span>Embed</span>
                  </button>
                </div>

                <TriadeAdminRecoveryForm
                  onSuccess={() =>
                    handleTriggerFeedback('Código no celular e link no e-mail enviados com sucesso!')
                  }
                  onSwitchToLogin={() => setAdminFlow('login')}
                />
              </div>
            )}

            {/* SUB-ITEM 3: FORMULÁRIO DE CADASTRO DE NOVO ADMINISTRADOR */}
            {(adminFlow === 'cadastro' || adminFlow === 'ambos') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="text-xs font-bold text-emerald-400">
                      Cadastrar Administrador
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEmbedModalForm('admin_register')}
                    className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Code className="w-3 h-3" />
                    <span>Embed</span>
                  </button>
                </div>

                <TriadeAdminRegisterForm
                  onSuccess={(newAdmin) =>
                    handleTriggerFeedback(`Novo administrador @${newAdmin.username} cadastrado com sucesso no Supabase!`)
                  }
                  onSwitchToLogin={() => setAdminFlow('login')}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📌 CONTEÚDO DA ABA 4: EMBEDS & IFRAMES (SEÇÃO DEDICADA & DESTUMULTUADA) */}
      {/* ========================================================================= */}
      {activeMainTab === 'embeds' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 dark:text-emerald-400 flex items-center justify-center">
                  <Code className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Central de Códigos Embed & iFrame (Single Source of Truth)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Gere, copie e teste os iframes para carregar os formulários reais no portal consumidor (pvapp) e salão parceiro (mnvapp).
                  </p>
                </div>
              </div>
            </div>

            {/* Grid dos Formulários Principais para Embed com Cópia Direta */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {/* Card 0: Cadastro de Usuário (Novo Soberano) */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <UserPlus className="w-4 h-4 text-emerald-500" />
                      <span>Usuário</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">
                      ?form=usuario
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Formulário canônico de novo usuário do ecossistema VagouApp.
                  </p>
                  <pre className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono overflow-x-auto whitespace-pre">
{`<iframe
  src="https://adm.vagouapp.com/embed?form=usuario"
  width="100%"
  height="720"
  frameborder="0"
></iframe>`}
                  </pre>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`<iframe src="https://adm.vagouapp.com/embed?form=usuario" width="100%" height="720" frameborder="0"></iframe>`);
                      handleTriggerFeedback('Código de embed de Usuário copiado!');
                    }}
                    className="flex-1 py-2 px-3 rounded-lg bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Iframe</span>
                  </button>
                  <a
                    href="/embed?form=usuario"
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                    title="Testar em Nova Aba"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
              {/* Card 1: Estabelecimento */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-emerald-500" />
                      <span>Estabelecimento</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">
                      ?form=estabelecimento
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ficha de credenciamento oficial de novos salões e barbearias.
                  </p>
                  <pre className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono overflow-x-auto whitespace-pre">
{`<iframe
  src="https://adm.vagouapp.com/embed?form=estabelecimento"
  width="100%"
  height="750"
  frameborder="0"
></iframe>`}
                  </pre>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`<iframe src="https://adm.vagouapp.com/embed?form=estabelecimento" width="100%" height="750" frameborder="0"></iframe>`);
                      handleTriggerFeedback('Código de embed de Estabelecimento copiado!');
                    }}
                    className="flex-1 py-2 px-3 rounded-lg bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Iframe</span>
                  </button>
                  <a
                    href="/embed?form=estabelecimento"
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                    title="Testar em Nova Aba"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Card 2: Cadastro Cliente Mnvapp */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-emerald-500" />
                      <span>Cadastro Cliente</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">
                      ?form=mnv_cadastro
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Formulário de novo cliente com suporte a maquiagem visual do salão.
                  </p>
                  <pre className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono overflow-x-auto whitespace-pre">
{`<iframe
  src="https://adm.vagouapp.com/embed?form=mnv_cadastro"
  width="100%"
  height="700"
  frameborder="0"
></iframe>`}
                  </pre>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`<iframe src="https://adm.vagouapp.com/embed?form=mnv_cadastro" width="100%" height="700" frameborder="0"></iframe>`);
                      handleTriggerFeedback('Código de embed de Cadastro Cliente copiado!');
                    }}
                    className="flex-1 py-2 px-3 rounded-lg bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Iframe</span>
                  </button>
                  <a
                    href="/embed?form=mnv_cadastro"
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                    title="Testar em Nova Aba"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Card 3: Login Cliente Mnvapp */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-emerald-500" />
                      <span>Login Cliente</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">
                      ?form=mnv_login
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Acesso rápido de clientes para agendamento no salão parceiro.
                  </p>
                  <pre className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono overflow-x-auto whitespace-pre">
{`<iframe
  src="https://adm.vagouapp.com/embed?form=mnv_login"
  width="100%"
  height="540"
  frameborder="0"
></iframe>`}
                  </pre>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`<iframe src="https://adm.vagouapp.com/embed?form=mnv_login" width="100%" height="540" frameborder="0"></iframe>`);
                      handleTriggerFeedback('Código de embed de Login Cliente copiado!');
                    }}
                    className="flex-1 py-2 px-3 rounded-lg bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Iframe</span>
                  </button>
                  <a
                    href="/embed?form=mnv_login"
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                    title="Testar em Nova Aba"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🪟 MODAL / DRAWER DE CÓDIGO EMBED UNIVERSAL (SINGLE SOURCE OF TRUTH) */}
      {/* ========================================================================= */}
      {embedModalForm && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 font-['Poppins']">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Code className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Código de Incorporação Embed</h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    form: {embedModalForm}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEmbedModalForm(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 leading-relaxed">
              💡 <strong>Single Source of Truth Ativo:</strong> Ao colar este <code>&lt;iframe&gt;</code> no <code>mnvapp</code> ou <code>pvapp</code>, qualquer alteração que você fizer no formulário aqui no Admin atualizará <strong>automaticamente em todos os sites no mesmo segundo</strong>, sem precisar alterar nada neles!
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-300 block">
                Copie e cole na página do mnvapp ou pvapp:
              </span>
              <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-emerald-400 font-mono overflow-x-auto whitespace-pre">
                {currentEmbedCode}
              </pre>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <a
                href={`/embed?form=${embedModalForm}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white underline cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Testar visualização isolada</span>
              </a>

              <button
                type="button"
                onClick={handleCopyEmbed}
                className="py-2.5 px-4 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95"
              >
                {hasCopiedEmbed ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>Copiado com Sucesso!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-white" />
                    <span>Copiar Código Embed</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
