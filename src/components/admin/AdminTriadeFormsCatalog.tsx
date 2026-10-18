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
} from 'lucide-react';

import { TriadeMnvClientLoginForm } from './triade-forms/TriadeMnvClientLoginForm';
import { TriadeEstablishmentMasterForm, EstabMasterPhase } from './triade-forms/TriadeEstablishmentMasterForm';
import { TriadeUserRegisterForm, UserRegisterPhase } from './triade-forms/TriadeUserRegisterForm';
import { TriadeUserLoginForm, UserLoginPhase } from './triade-forms/TriadeUserLoginForm';
import { FormsSubTabId } from './AdminSidebar';

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

  // Fases de cada Formulário Exclusivo
  const [estabLoginPhase, setEstabLoginPhase] = useState<UserLoginPhase>('credentials');
  const [estabMasterPhase, setEstabMasterPhase] = useState<EstabMasterStep>('user_check');
  const [userLoginPhase, setUserLoginPhase] = useState<UserLoginPhase>('credentials');
  const [userRegisterPhase, setUserRegisterPhase] = useState<UserRegisterPhase>('identification');

  // Modal de Embed Universal
  const [embedModalForm, setEmbedModalForm] = useState<string | null>(null);
  const [hasCopiedEmbed, setHasCopiedEmbed] = useState(false);

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
        <div className="space-y-4 animate-fadeIn">
          {/* Barra Superior Unificada: Fases do Login + Botão Embed */}
          <div className="p-2 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
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

          <div className="max-w-md mx-auto w-full py-1">
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
        <div className="space-y-4 animate-fadeIn">
          {/* Barra Superior Unificada: Fases do Cadastro de Estabelecimento + Botão Embed */}
          <div className="p-2 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col xl:flex-row xl:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
              {[
                { id: 'user_check', num: '1', label: 'Identificação (Sim/Não)', icon: UserCheck },
                { id: 'commercial', num: '2', label: 'Comercial & Fiscal', icon: Building2 },
                { id: 'address', num: '3', label: 'Endereço (ViaCEP)', icon: MapPin },
                { id: 'visual', num: '4', label: 'Id. Visual & Branding', icon: Palette },
                { id: 'review', num: '5', label: 'Ficha Completa (Revisar)', icon: FileText },
                { id: 'welcome', num: '6', label: 'Boas-Vindas & QR Code', icon: Sparkles },
              ].map((step) => {
                const isActive = estabMasterPhase === step.id;
                const IconComponent = step.icon;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setEstabMasterPhase(step.id as EstabMasterStep)}
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
              onClick={() => setEmbedModalForm('estabelecimento')}
              className="py-1.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-auto"
            >
              <Code className="w-3.5 h-3.5 text-emerald-400" />
              <span>Gerar Embed (&lt;iframe&gt;)</span>
            </button>
          </div>

          <div className="py-1">
            <TriadeEstablishmentMasterForm
              forcedStep={estabMasterPhase}
              onStepChange={setEstabMasterPhase}
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
        <div className="space-y-4 animate-fadeIn">
          {/* Barra Superior Unificada: Fases do Login de Usuário + Botão Embed */}
          <div className="p-2 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
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

          <div className="max-w-md mx-auto w-full py-1">
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
        <div className="space-y-4 animate-fadeIn">
          {/* Barra Superior Unificada: 6 Fases + Ficha Completa + Botão Embed */}
          <div className="p-2 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col xl:flex-row xl:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
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

          <div className="max-w-xl mx-auto w-full py-1">
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
