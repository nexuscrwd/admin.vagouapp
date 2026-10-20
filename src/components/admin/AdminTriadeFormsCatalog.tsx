import React, { useState } from 'react';
import {
  Building2,
  Users,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  ExternalLink,
  Lock,
  Layers,
  RotateCcw,
  UserPlus,
  UserCheck,
  Code,
  Copy,
  Check,
  X,
  MapPin,
  User,
  Smartphone,
  Search,
  Palette,
  FileText,
  Sparkles,
  Eye,
  Save,
  Receipt,
  Wallet,
} from 'lucide-react';

import { TriadeMnvClientLoginForm } from './triade-forms/TriadeMnvClientLoginForm';
import {
  TriadeEstablishmentMasterForm,
  EstabMasterPhase,
  EstabUserAuthSubFlow,
  EstabAddressSubPhase,
} from './triade-forms/TriadeEstablishmentMasterForm';
import { TriadeUserRegisterForm, UserRegisterPhase } from './triade-forms/TriadeUserRegisterForm';
import { TriadeUserLoginForm, UserLoginPhase } from './triade-forms/TriadeUserLoginForm';
import { FormsSubTabId } from './AdminSidebar';
import {
  SalonWelcomeModal,
  SalonWelcomeTemplateConfig,
  DEFAULT_WELCOME_MODAL_CONFIG,
  getWelcomeModalConfig,
  saveWelcomeModalConfig,
} from './SalonWelcomeModal';

export type MainTabType = FormsSubTabId;
export type EstabMasterStep = EstabMasterPhase;

export interface AdminTriadeFormsCatalogProps {
  onBack?: () => void;
  activeTab?: MainTabType;
  onTabChange?: (tab: MainTabType) => void;
}

export const AdminTriadeFormsCatalog: React.FC<AdminTriadeFormsCatalogProps> = ({
  activeTab,
  onTabChange,
}) => {
  // Aba Selecionada no Menu Lateral (Configurações -> Estabelecimento / Usuário / Embeds)
  const [internalTab, setInternalTab] = useState<MainTabType>('estabelecimento_cadastro');
  const activeMainTab = activeTab || internalTab;
  const setActiveMainTab = (tab: MainTabType) => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  // Fases e Subfases de cada Formulário Exclusivo (Exclusivo Admin Master — Invisível aos Usuários)
  const [estabLoginPhase, setEstabLoginPhase] = useState<UserLoginPhase>('credentials');
  const [estabMasterPhase, setEstabMasterPhase] = useState<EstabMasterStep>('user_check');
  const [estabUserSubFlow, setEstabUserSubFlow] = useState<EstabUserAuthSubFlow>('none');
  const [estabAddressSubPhase, setEstabAddressSubPhase] = useState<EstabAddressSubPhase>('same_address_modal');
  const [userLoginPhase, setUserLoginPhase] = useState<UserLoginPhase>('credentials');
  const [userRegisterPhase, setUserRegisterPhase] = useState<UserRegisterPhase>('identification');

  // Modal de Embed Universal
  const [embedModalForm, setEmbedModalForm] = useState<string | null>(null);
  const [hasCopiedEmbed, setHasCopiedEmbed] = useState(false);

  // Estado do Estúdio do Modal de Boas-Vindas (Configurações -> Modal Boas-Vindas)
  const [welcomeConfig, setWelcomeConfig] = useState<SalonWelcomeTemplateConfig>(() =>
    getWelcomeModalConfig()
  );
  const [previewSalonName, setPreviewSalonName] = useState('Fabio Foos');
  const [previewSalonSlug, setPreviewSalonSlug] = useState('fabio-foos');
  const [isFullscreenWelcomeOpen, setIsFullscreenWelcomeOpen] = useState(false);

  // Feedback de teste / submissão
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const handleTriggerFeedback = (text: string) => {
    setActionFeedback(text);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const handleSaveWelcomeModal = () => {
    saveWelcomeModalConfig(welcomeConfig);
    handleTriggerFeedback('Alterações do Modal de Boas-Vindas salvas e aplicadas em todo o ecossistema!');
  };

  const handleResetWelcomeModal = () => {
    setWelcomeConfig(DEFAULT_WELCOME_MODAL_CONFIG);
    saveWelcomeModalConfig(DEFAULT_WELCOME_MODAL_CONFIG);
    handleTriggerFeedback('Modal de Boas-Vindas restaurado para o padrão original!');
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

  const isEstabCadastro =
    activeMainTab === 'estabelecimento_cadastro' || activeMainTab === 'estabelecimento';
  const isUserCadastro =
    activeMainTab === 'usuario_cadastro' || activeMainTab === 'usuarios';

  return (
    <div className="space-y-4 animate-fadeIn font-['Poppins']">
      {/* Alerta de Feedback de Ação */}
      {actionFeedback && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-fadeIn font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🔑 1. ESTABELECIMENTO -> LOGIN ESTABELECIMENTO                            */}
      {/* ========================================================================= */}
      {activeMainTab === 'estabelecimento_login' && (
        <div className="space-y-0 w-full max-w-none sm:max-w-md mx-auto animate-fadeIn overflow-x-hidden">
          {/* Barra Superior Unificada: Fases do Login + Botão Embed */}
          <div className="w-full p-0 bg-slate-900 border border-slate-800 rounded-t-xl sm:rounded-t-2xl rounded-b-none border-b border-slate-800/80 overflow-x-hidden overflow-y-auto">
            <div className="p-2 sm:p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap w-full overflow-x-hidden">
                {[
                  { id: 'credentials', num: '1', label: 'Acesso com Senha', icon: KeyRound },
                  { id: 'recovery', num: '2', label: 'Recuperação de Acesso', icon: RotateCcw },
                ].map((step) => {
                  const isActive = estabLoginPhase === step.id;
                  const IconComponent = step.icon;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setEstabLoginPhase(step.id as UserLoginPhase)}
                      className={`py-1.5 px-3 rounded-xl text-center transition cursor-pointer flex items-center justify-center gap-1.5 border whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'bg-[#20C933] text-white font-bold border-emerald-400 shadow-sm'
                          : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800 border-slate-800 text-xs'
                      }`}
                    >
                      <IconComponent className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-emerald-400'}`} />
                      <span className="text-xs">
                        {step.num}. {step.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setEmbedModalForm('mnv_login')}
                className="py-1.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-auto"
              >
                <Code className="w-3.5 h-3.5 text-emerald-400" />
                <span>Gerar Embed (&lt;iframe&gt;)</span>
              </button>
            </div>
          </div>

          <div className="w-full p-0 m-0 [&_.triade-form]:rounded-t-none [&_.triade-form]:border-t-0">
            <TriadeMnvClientLoginForm
              salonName="VagouApp"
              activePhase={estabLoginPhase}
              onPhaseChange={setEstabLoginPhase}
              onSuccess={(data) =>
                handleTriggerFeedback(`Login do estabelecimento validado para "${data.identifier}"!`)
              }
              onSwitchToRegister={() => setActiveMainTab('estabelecimento_cadastro')}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🏗️ 2. ESTABELECIMENTO -> CADASTRO ESTABELECIMENTO                        */}
      {/* ========================================================================= */}
      {isEstabCadastro && (
        <div className="space-y-0 w-full max-w-none sm:max-w-xl mx-auto animate-fadeIn overflow-x-hidden">
          {/* Barra Superior Unificada (Exclusivo Admin Master): Abas Principais (Fases) + Subfases de Fases + Botão Embed */}
          <div className="w-full p-0 bg-slate-900 border border-slate-800 rounded-t-xl sm:rounded-t-2xl rounded-b-none border-b border-slate-800/80 overflow-x-hidden overflow-y-auto max-h-[380px]">
            <div className="p-2 sm:p-2.5 space-y-2">
              {/* Linha 1: Abas Principais (Fases Macro) + Botão Embed */}
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap w-full overflow-x-hidden">
                  {[
                    {
                      id: 'user_check',
                      num: '1',
                      label: 'Identificação (Titular + CPF)',
                      icon: UserCheck,
                      isActive: estabMasterPhase === 'user_check',
                      onSelect: () => {
                        setEstabMasterPhase('user_check');
                        setEstabUserSubFlow('none');
                      },
                    },
                    {
                      id: 'establishment_details',
                      num: '2',
                      label: 'Dados do Estabelecimento',
                      icon: Building2,
                      isActive: ['commercial', 'fiscal', 'pix_billing', 'address', 'visual'].includes(
                        estabMasterPhase
                      ),
                      onSelect: () => {
                        if (
                          !['commercial', 'fiscal', 'pix_billing', 'address', 'visual'].includes(
                            estabMasterPhase
                          )
                        ) {
                          setEstabMasterPhase('commercial');
                        }
                      },
                    },
                    {
                      id: 'review',
                      num: '3',
                      label: 'Ficha Completa',
                      icon: FileText,
                      isActive: estabMasterPhase === 'review',
                      onSelect: () => setEstabMasterPhase('review'),
                    },
                    {
                      id: 'welcome',
                      num: '4',
                      label: 'Boas-Vindas & Placa',
                      icon: Sparkles,
                      isActive: estabMasterPhase === 'welcome',
                      onSelect: () => setEstabMasterPhase('welcome'),
                    },
                  ].map((step) => {
                    const IconComponent = step.icon;
                    return (
                      <button
                        key={step.id}
                        type="button"
                        onClick={step.onSelect}
                        className={`py-1.5 px-3 rounded-xl text-center transition cursor-pointer flex items-center justify-center gap-1.5 border whitespace-nowrap shrink-0 ${
                          step.isActive
                            ? 'bg-[#20C933] text-white font-bold border-emerald-400 shadow-sm'
                            : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800 border-slate-800 text-xs'
                        }`}
                      >
                        <IconComponent
                          className={`w-3.5 h-3.5 shrink-0 ${
                            step.isActive ? 'text-white' : 'text-emerald-400'
                          }`}
                        />
                        <span className="text-xs">
                          {step.num}. {step.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setEmbedModalForm('estabelecimento')}
                  className="py-1.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-auto"
                >
                  <Code className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Gerar Embed (&lt;iframe&gt;)</span>
                </button>
              </div>

              {/* Linha 2: Subfases da Fase Selecionada (Movido do interior do form para o topo Admin — Invisível aos usuários) */}
              {estabMasterPhase === 'user_check' && (
                <div className="pt-2 border-t border-slate-800/80 flex items-center gap-1.5 flex-wrap w-full">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-1.5">
                    Subfases (Identificação):
                  </span>
                  {(
                    [
                      { id: 'none', label: '1.1 Pergunta (SIM / NÃO)' },
                      { id: 'login', label: '1.2 SIM (Login Usuário)' },
                      { id: 'register', label: '1.3 NÃO (Cadastro Usuário)' },
                    ] as const
                  ).map((sub) => {
                    const active = estabUserSubFlow === sub.id;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setEstabUserSubFlow(sub.id)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer whitespace-nowrap ${
                          active
                            ? 'bg-[#20C933] text-white shadow-sm'
                            : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {sub.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {['commercial', 'fiscal', 'pix_billing', 'address', 'visual'].includes(
                estabMasterPhase
              ) && (
                <div className="pt-2 border-t border-slate-800/80 flex items-center gap-1.5 flex-wrap w-full">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-1.5">
                    Subfases (Estabelecimento):
                  </span>
                  {(
                    [
                      { id: 'commercial', label: '1. Comercial', icon: Building2 },
                      { id: 'fiscal', label: '2. Fiscal', icon: Receipt },
                      { id: 'pix_billing', label: '3. PIX & QR Code', icon: Wallet },
                      { id: 'address', label: '4. Endereço', icon: MapPin },
                      { id: 'visual', label: '5. Visual', icon: Palette },
                    ] as const
                  ).map((tab) => {
                    const active = estabMasterPhase === tab.id;
                    const SubIcon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setEstabMasterPhase(tab.id)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                          active
                            ? 'bg-[#20C933] text-white shadow-sm'
                            : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        <SubIcon className={`w-3 h-3 shrink-0 ${active ? 'text-white' : 'text-emerald-400'}`} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}

                  {/* Sub-etapas internas da Subfase 4. Endereço */}
                  {estabMasterPhase === 'address' && (
                    <div className="flex items-center gap-1 pl-2 ml-1 border-l border-slate-800 flex-wrap">
                      {(
                        [
                          { id: 'same_address_modal', label: '4.1 Mesmo Endereço?' },
                          { id: 'cep_modal', label: '4.2 Busca CEP' },
                          { id: 'address_form', label: '4.3 Formulário' },
                        ] as const
                      ).map((addrSub) => {
                        const activeAddr = estabAddressSubPhase === addrSub.id;
                        return (
                          <button
                            key={addrSub.id}
                            type="button"
                            onClick={() => setEstabAddressSubPhase(addrSub.id)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition cursor-pointer whitespace-nowrap ${
                              activeAddr
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-slate-950/60 text-slate-500 hover:text-slate-300 border border-slate-800/80'
                            }`}
                          >
                            {addrSub.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="w-full p-0 m-0 [&_.triade-form]:rounded-t-none [&_.triade-form]:border-t-0">
            <TriadeEstablishmentMasterForm
              forcedStep={estabMasterPhase}
              onStepChange={setEstabMasterPhase}
              forcedUserAuthSubFlow={estabUserSubFlow}
              onUserAuthSubFlowChange={setEstabUserSubFlow}
              forcedAddressSubPhase={estabAddressSubPhase}
              onAddressSubPhaseChange={setEstabAddressSubPhase}
              onSuccess={(salonData) =>
                handleTriggerFeedback(
                  `Novo estabelecimento "${salonData.tradeName}" (CNPJ/CPF: ${salonData.documentNumber}) cadastrado com sucesso!`
                )
              }
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🔑 3. USUÁRIO -> LOGIN USUÁRIO                                            */}
      {/* ========================================================================= */}
      {activeMainTab === 'usuario_login' && (
        <div className="space-y-0 w-full max-w-none sm:max-w-md mx-auto animate-fadeIn overflow-x-hidden">
          {/* Barra Superior Unificada: Fases do Login de Usuário + Botão Embed */}
          <div className="w-full p-0 bg-slate-900 border border-slate-800 rounded-t-xl sm:rounded-t-2xl rounded-b-none border-b border-slate-800/80 overflow-x-hidden overflow-y-auto">
            <div className="p-2 sm:p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap w-full overflow-x-hidden">
                {[
                  { id: 'credentials', num: '1', label: 'Acesso com Senha', icon: KeyRound },
                  { id: 'recovery', num: '2', label: 'Recuperação de Acesso', icon: RotateCcw },
                ].map((step) => {
                  const isActive = userLoginPhase === step.id;
                  const IconComponent = step.icon;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setUserLoginPhase(step.id as UserLoginPhase)}
                      className={`py-1.5 px-3 rounded-xl text-center transition cursor-pointer flex items-center justify-center gap-1.5 border whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'bg-[#20C933] text-white font-bold border-emerald-400 shadow-sm'
                          : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800 border-slate-800 text-xs'
                      }`}
                    >
                      <IconComponent className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-emerald-400'}`} />
                      <span className="text-xs">
                        {step.num}. {step.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setEmbedModalForm('usuario_login')}
                className="py-1.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-auto"
              >
                <Code className="w-3.5 h-3.5 text-emerald-400" />
                <span>Gerar Embed (&lt;iframe&gt;)</span>
              </button>
            </div>
          </div>

          <div className="w-full p-0 m-0 [&_.triade-form]:rounded-t-none [&_.triade-form]:border-t-0">
            <TriadeUserLoginForm
              activePhase={userLoginPhase}
              onPhaseChange={setUserLoginPhase}
              onSuccess={(data) =>
                handleTriggerFeedback(
                  `Acesso validado com sucesso para o usuário "${data.identifier}"!`
                )
              }
              onSwitchToRegister={() => setActiveMainTab('usuario_cadastro')}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ➕ 4. USUÁRIO -> CADASTRO USUÁRIO                                         */}
      {/* ========================================================================= */}
      {isUserCadastro && (
        <div className="space-y-0 w-full max-w-none sm:max-w-md mx-auto animate-fadeIn overflow-x-hidden">
          {/* Barra Superior Unificada: 6 Fases + Ficha Completa + Botão Embed */}
          <div className="w-full p-0 bg-slate-900 border border-slate-800 rounded-t-xl sm:rounded-t-2xl rounded-b-none border-b border-slate-800/80 overflow-x-hidden overflow-y-auto max-h-[380px]">
            <div className="p-2 sm:p-2.5 flex flex-col xl:flex-row xl:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap w-full overflow-x-hidden">
                {[
                  { id: 'identification', num: '1', label: 'Identificação', icon: User },
                  { id: 'contacts', num: '2', label: 'Contatos', icon: Smartphone },
                  { id: 'verification', num: '3', label: 'Código SMS/Whats', icon: ShieldCheck },
                  { id: 'password', num: '4', label: 'Criar Senha', icon: Lock },
                  { id: 'cep', num: '5', label: 'CEP', icon: Search },
                  { id: 'address', num: '6', label: 'Endereço', icon: MapPin },
                  { id: 'all', num: '★', label: 'Ficha Completa', icon: Layers },
                ].map((step) => {
                  const isActive = userRegisterPhase === step.id;
                  const IconComponent = step.icon;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setUserRegisterPhase(step.id as UserRegisterPhase)}
                      className={`py-1.5 px-3 rounded-xl text-center transition cursor-pointer flex items-center justify-center gap-1.5 border whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'bg-[#20C933] text-white font-bold border-emerald-400 shadow-sm'
                          : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800 border-slate-800 text-xs'
                      }`}
                    >
                      <IconComponent className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-emerald-400'}`} />
                      <span className="text-xs">
                        {step.num === '★' ? step.label : `${step.num}. ${step.label}`}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setEmbedModalForm('usuario')}
                className="py-1.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 self-start xl:self-auto"
              >
                <Code className="w-3.5 h-3.5 text-emerald-400" />
                <span>Gerar Embed (&lt;iframe&gt;)</span>
              </button>
            </div>
          </div>

          <div className="w-full p-0 m-0 [&_.triade-form]:rounded-t-none [&_.triade-form]:border-t-0">
            <TriadeUserRegisterForm
              activePhase={userRegisterPhase}
              onPhaseChange={setUserRegisterPhase}
              onSuccess={(data) =>
                handleTriggerFeedback(
                  `Usuário "${data.fullName}" (${data.username}) cadastrado com sucesso! E-mail: ${data.email} | Celular: ${data.phone}`
                )
              }
              onSwitchToLogin={() => setActiveMainTab('usuario_login')}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 💻 5. EMBEDS & IFRAMES (CENTRAL DEDICADA SINGLE SOURCE OF TRUTH)          */}
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
              {/* Card 1: Cadastro de Usuário */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <UserPlus className="w-4 h-4 text-emerald-500" />
                      <span>Cadastro Usuário</span>
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
                      handleTriggerFeedback('Código de embed de Cadastro Usuário copiado!');
                    }}
                    className="flex-1 py-2 px-3 rounded-lg bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  >
                    <Copy className="w-3.5 h-3.5 text-white" />
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

              {/* Card 2: Cadastro Estabelecimento */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-emerald-500" />
                      <span>Cadastro Estabelecimento</span>
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
                      handleTriggerFeedback('Código de embed de Cadastro Estabelecimento copiado!');
                    }}
                    className="flex-1 py-2 px-3 rounded-lg bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  >
                    <Copy className="w-3.5 h-3.5 text-white" />
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

              {/* Card 3: Cadastro Cliente Salão */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-emerald-500" />
                      <span>Cadastro no Salão</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">
                      ?form=mnv_cadastro
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Formulário de cliente com vínculo automático ao salão parceiro.
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
                    <Copy className="w-3.5 h-3.5 text-white" />
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

              {/* Card 4: Login Unificado */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-emerald-500" />
                      <span>Login Unificado</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">
                      ?form=mnv_login
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Acesso rápido de usuários e profissionais ao ecossistema.
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
                      handleTriggerFeedback('Código de embed de Login copiado!');
                    }}
                    className="flex-1 py-2 px-3 rounded-lg bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  >
                    <Copy className="w-3.5 h-3.5 text-white" />
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
      {/* 🎉 6. MODAL DE BOAS-VINDAS & KIT DE LANÇAMENTO (EDIÇÃO + PREVIEW REAL)    */}
      {/* ========================================================================= */}
      {activeMainTab === 'welcome_modal' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Cabeçalho da Aba Modal de Boas-Vindas */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#20C933] text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  Modal de Boas-Vindas & Kit de Lançamento (Link + QR Code)
                </h2>
                <p className="text-xs text-slate-400">
                  Visualize o modal real ao lado e edite todos os textos, avisos e botões exibidos após a conclusão do cadastro.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleResetWelcomeModal}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Restaurar Padrão</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFullscreenWelcomeOpen(true)}
                className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Eye className="w-4 h-4 text-emerald-400" />
                <span>Ver em Tela Cheia</span>
              </button>

              <button
                type="button"
                onClick={handleSaveWelcomeModal}
                className="py-2 px-4 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95 whitespace-nowrap"
              >
                <Save className="w-4 h-4 text-white" />
                <span className="text-white">Salvar Alterações</span>
              </button>
            </div>
          </div>

          {/* Grid Lado a Lado: Editor à Esquerda + Modal Real à Direita */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Coluna 1: Painel de Edição do Modal */}
            <div className="xl:col-span-6 p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Editor de Conteúdo & Botões
                </span>
                <span className="text-[11px] text-slate-400">
                  Variável dinâmica: <code className="text-emerald-400">{'{nome}'}</code>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Nome do Salão (Simulação)
                  </label>
                  <input
                    type="text"
                    value={previewSalonName}
                    onChange={(e) => setPreviewSalonName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 text-white text-xs border border-slate-800 focus:border-emerald-500 outline-none"
                    placeholder="Ex: Fabio Foos"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Slug / Subdomínio (Simulação)
                  </label>
                  <input
                    type="text"
                    value={previewSalonSlug}
                    onChange={(e) =>
                      setPreviewSalonSlug(
                        e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                      )
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs border border-slate-800 focus:border-emerald-500 outline-none"
                    placeholder="Ex: fabio-foos"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Título Principal de Sucesso
                </label>
                <input
                  type="text"
                  value={welcomeConfig.titleTemplate}
                  onChange={(e) =>
                    setWelcomeConfig((prev) => ({ ...prev, titleTemplate: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 text-white text-xs border border-slate-800 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Subtítulo (Frase de Destaque)
                </label>
                <input
                  type="text"
                  value={welcomeConfig.subtitleText}
                  onChange={(e) =>
                    setWelcomeConfig((prev) => ({ ...prev, subtitleText: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 text-white text-xs border border-slate-800 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Título da Seção Interna
                </label>
                <input
                  type="text"
                  value={welcomeConfig.sectionTitle}
                  onChange={(e) =>
                    setWelcomeConfig((prev) => ({ ...prev, sectionTitle: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 text-white text-xs border border-slate-800 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Mensagem de Boas-Vindas
                </label>
                <textarea
                  rows={2}
                  value={welcomeConfig.welcomeMessage}
                  onChange={(e) =>
                    setWelcomeConfig((prev) => ({ ...prev, welcomeMessage: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 text-white text-xs border border-slate-800 focus:border-emerald-500 outline-none resize-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Aviso de Orientação (Cadastrar Serviços / Equipe / Horários)
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={welcomeConfig.showInstructionNote}
                      onChange={(e) =>
                        setWelcomeConfig((prev) => ({
                          ...prev,
                          showInstructionNote: e.target.checked,
                        }))
                      }
                      className="accent-[#20C933]"
                    />
                    <span>Exibir</span>
                  </label>
                </div>
                <textarea
                  rows={2}
                  value={welcomeConfig.instructionNote}
                  onChange={(e) =>
                    setWelcomeConfig((prev) => ({ ...prev, instructionNote: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 text-white text-xs border border-slate-800 focus:border-emerald-500 outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Título do Bloco QR Code
                  </label>
                  <input
                    type="text"
                    value={welcomeConfig.qrTitle}
                    onChange={(e) =>
                      setWelcomeConfig((prev) => ({ ...prev, qrTitle: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 text-white text-xs border border-slate-800 focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Texto do Botão Imprimir QR
                  </label>
                  <input
                    type="text"
                    value={welcomeConfig.printButtonLabel}
                    onChange={(e) =>
                      setWelcomeConfig((prev) => ({ ...prev, printButtonLabel: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 text-white text-xs border border-slate-800 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Instrução do QR Code de Balcão
                </label>
                <input
                  type="text"
                  value={welcomeConfig.qrDescription}
                  onChange={(e) =>
                    setWelcomeConfig((prev) => ({ ...prev, qrDescription: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 text-white text-xs border border-slate-800 focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Botão Esquerdo (Abrir / Baixar App)
                  </label>
                  <input
                    type="text"
                    value={welcomeConfig.openPartnerAppLabel}
                    onChange={(e) =>
                      setWelcomeConfig((prev) => ({
                        ...prev,
                        openPartnerAppLabel: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 text-white text-xs border border-slate-800 focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Botão Direito (Concluir e Começar)
                  </label>
                  <input
                    type="text"
                    value={welcomeConfig.finishButtonLabel}
                    onChange={(e) =>
                      setWelcomeConfig((prev) => ({
                        ...prev,
                        finishButtonLabel: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 text-white text-xs border border-slate-800 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveWelcomeModal}
                  className="w-full sm:w-auto py-2.5 px-6 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95 whitespace-nowrap"
                >
                  <Save className="w-4 h-4 text-white" />
                  <span className="text-white">Salvar Alterações no Modal</span>
                </button>
              </div>
            </div>

            {/* Coluna 2: O Modal Real Renderizado ao Vivo na Tela */}
            <div className="xl:col-span-6">
              <SalonWelcomeModal
                isOpen={true}
                inlinePreview={true}
                onClose={() => handleTriggerFeedback('Botão "Concluir e Começar" acionado com sucesso!')}
                customConfig={welcomeConfig}
                data={{
                  tradeName: previewSalonName || 'Fabio Foos',
                  slug: previewSalonSlug || 'fabio-foos',
                  slogan: 'Excelência em estética e bem-estar',
                  primaryColor: '#20C933',
                }}
              />
            </div>
          </div>

          {/* Versão Fullscreen se clicar em "Ver em Tela Cheia" */}
          <SalonWelcomeModal
            isOpen={isFullscreenWelcomeOpen}
            onClose={() => setIsFullscreenWelcomeOpen(false)}
            customConfig={welcomeConfig}
            data={{
              tradeName: previewSalonName || 'Fabio Foos',
              slug: previewSalonSlug || 'fabio-foos',
              slogan: 'Excelência em estética e bem-estar',
              primaryColor: '#20C933',
            }}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🪟 MODAL / DRAWER DE CÓDIGO EMBED UNIVERSAL (SINGLE SOURCE OF TRUTH) */}
      {/* ========================================================================= */}
      {embedModalForm && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-3.5 font-['Poppins']">
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
