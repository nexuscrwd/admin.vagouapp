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
  Code,
  Copy,
  Check,
  X,
  Share2,
} from 'lucide-react';

// Os 4 Formulários Canônicos Principais da Tríade
import { TriadeMnvClientLoginForm } from './triade-forms/TriadeMnvClientLoginForm';
import { TriadeMnvClientRegisterForm } from './triade-forms/TriadeMnvClientRegisterForm';
import { TriadeEstablishmentMasterForm } from './triade-forms/TriadeEstablishmentMasterForm';
import { TriadeAdminLoginForm } from './triade-forms/TriadeAdminLoginForm';
import { TriadeAdminRecoveryForm } from './triade-forms/TriadeAdminRecoveryForm';
import { TriadeAdminAuthForm } from './triade-forms/TriadeAdminAuthForm';

export type MainTabType = 'mnvapp_forms' | 'cadastro_estabelecimento' | 'adminvapp_form';
export type MnvUserFlow = 'acesso' | 'cadastro' | 'ambos';
export type AdminFlow = 'login' | 'recovery' | 'ambos';

export interface AdminTriadeFormsCatalogProps {
  onBack?: () => void;
}

export const AdminTriadeFormsCatalog: React.FC<AdminTriadeFormsCatalogProps> = ({ onBack }) => {
  // Aba Principal Selecionada
  const [activeMainTab, setActiveMainTab] = useState<MainTabType>('mnvapp_forms');

  // Sub-fluxo da Aba Forms mnvapp: Acesso do usuário vs Cadastro de usuário vs Lado a Lado
  const [mnvUserFlow, setMnvUserFlow] = useState<MnvUserFlow>('acesso');

  // Sub-fluxo da Aba Adminvapp: Login vs Recuperação de Acesso vs Lado a Lado
  const [adminFlow, setAdminFlow] = useState<AdminFlow>('login');

  // Modal / Drawer de Embed Universal
  const [embedModalForm, setEmbedModalForm] = useState<string | null>(null);
  const [hasCopiedEmbed, setHasCopiedEmbed] = useState(false);

  // Amostras de Salões para testar a Maquiagem de Identidade do Salão
  const sampleSalons = [
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
      {/* Barra Superior do Hub */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl transition cursor-pointer active:scale-95 shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#20C933]" />
              <span>Voltar</span>
            </button>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Hub de Formulários da Tríade
              </h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Single Source of Truth
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Formulários oficiais e canônicos da Tríade. Edite aqui e replique instantaneamente em todos os sites via rota Embed.
            </p>
          </div>
        </div>

        {/* Botão de Integração Universal Embed */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEmbedModalForm(activeMainTab === 'mnvapp_forms' ? (mnvUserFlow === 'cadastro' ? 'mnv_cadastro' : 'mnv_login') : activeMainTab === 'cadastro_estabelecimento' ? 'estabelecimento' : 'admin')}
            className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
          >
            <Code className="w-4 h-4 text-[#20C933]" />
            <span>Gerar Embed Universal (&lt;iframe&gt;)</span>
          </button>
        </div>
      </div>

      {/* Alerta de Feedback de Ação */}
      {actionFeedback && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-fadeIn font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🧭 SELETOR DE ABAS PRINCIPAIS (CONFORME SOLICITADO PELO USUÁRIO) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* ABA 1: FORMS MNVAPP */}
        <button
          type="button"
          onClick={() => setActiveMainTab('mnvapp_forms')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-start gap-3 ${
            activeMainTab === 'mnvapp_forms'
              ? 'bg-[#20C933] border-emerald-500 text-white shadow-lg shadow-emerald-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              activeMainTab === 'mnvapp_forms'
                ? 'bg-white/20 text-white'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}
          >
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="font-bold text-sm tracking-tight truncate">
                Aba Forms Mnvapp
              </span>
              <span
                className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                  activeMainTab === 'mnvapp_forms'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-emerald-400'
                }`}
              >
                App Salão
              </span>
            </div>
            <p
              className={`text-[11px] leading-snug line-clamp-2 ${
                activeMainTab === 'mnvapp_forms' ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Acesso do usuário cliente & Cadastro para novos clientes agendarem.
            </p>
          </div>
        </button>

        {/* ABA 2: CADASTRO DE ESTABELECIMENTO */}
        <button
          type="button"
          onClick={() => setActiveMainTab('cadastro_estabelecimento')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-start gap-3 ${
            activeMainTab === 'cadastro_estabelecimento'
              ? 'bg-[#20C933] border-emerald-500 text-white shadow-lg shadow-emerald-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              activeMainTab === 'cadastro_estabelecimento'
                ? 'bg-white/20 text-white'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}
          >
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="font-bold text-sm tracking-tight truncate">
                Cadastro de Estabelecimento
              </span>
              <span
                className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                  activeMainTab === 'cadastro_estabelecimento'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-emerald-400'
                }`}
              >
                Novos Salões
              </span>
            </div>
            <p
              className={`text-[11px] leading-snug line-clamp-2 ${
                activeMainTab === 'cadastro_estabelecimento' ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Onboarding completo para novos estabelecimentos no mnvapp (3 Níveis).
            </p>
          </div>
        </button>

        {/* ABA 3: ADMINVAPP */}
        <button
          type="button"
          onClick={() => setActiveMainTab('adminvapp_form')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-start gap-3 ${
            activeMainTab === 'adminvapp_form'
              ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              activeMainTab === 'adminvapp_form'
                ? 'bg-white/20 text-white'
                : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
            }`}
          >
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="font-bold text-sm tracking-tight truncate">
                Aba Form Adminvapp
              </span>
              <span
                className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                  activeMainTab === 'adminvapp_form'
                    ? 'bg-white/20 text-white'
                    : 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                }`}
              >
                admin.vapp.com
              </span>
            </div>
            <p
              className={`text-[11px] leading-snug line-clamp-2 ${
                activeMainTab === 'adminvapp_form' ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Form de acesso soberano disponível somente através do domínio admin.
            </p>
          </div>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 📌 CONTEÚDO DA ABA 1: FORMS MNVAPP */}
      {/* ========================================================================= */}
      {activeMainTab === 'mnvapp_forms' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Sub-barra Contextual com as 2 frentes solicitadas */}
          <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-500 dark:text-emerald-400">Mnvapp</span>
                <span className="text-slate-400">/</span>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Formulários do Usuário Cliente no App do Salão
                </h2>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Gerencie tanto o login do cliente comum do ecossistema quanto o cadastro rápido de novos clientes ao agendar.
              </p>
            </div>

            {/* Alternador de Sub-fluxo: Acesso vs Cadastro vs Ambos Lado a Lado */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 self-start md:self-auto">
              <button
                type="button"
                onClick={() => setMnvUserFlow('acesso')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  mnvUserFlow === 'acesso'
                    ? 'bg-[#20C933] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>1. Acesso do Usuário</span>
              </button>

              <button
                type="button"
                onClick={() => setMnvUserFlow('cadastro')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  mnvUserFlow === 'cadastro'
                    ? 'bg-[#20C933] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>2. Cadastro de Usuário</span>
              </button>

              <button
                type="button"
                onClick={() => setMnvUserFlow('ambos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  mnvUserFlow === 'ambos'
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
              mnvUserFlow === 'ambos' ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1 max-w-lg mx-auto'
            }`}
          >
            {/* SUB-ITEM 1: ACESSO DO USUÁRIO CLIENTE */}
            {(mnvUserFlow === 'acesso' || mnvUserFlow === 'ambos') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="text-xs font-bold text-emerald-400">
                      Acesso do Usuário
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEmbedModalForm('mnv_login')}
                    className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Code className="w-3 h-3" />
                    <span>Embed</span>
                  </button>
                </div>

                <TriadeMnvClientLoginForm
                  onSuccess={(data) =>
                    handleTriggerFeedback(`Login do cliente validado no ecossistema: ${data.identifier}`)
                  }
                  onSwitchToRegister={() => setMnvUserFlow('cadastro')}
                />
              </div>
            )}

            {/* SUB-ITEM 2: CADASTRO DE NOVO USUÁRIO AO AGENDAR (DO ECOSSISTEMA MAQUIADO COM IDENTIDADE DO SALÃO) */}
            {(mnvUserFlow === 'cadastro' || mnvUserFlow === 'ambos') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="text-xs font-bold text-emerald-400">
                      Cadastro de Usuário (App do Salão)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEmbedModalForm('mnv_cadastro')}
                    className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Code className="w-3 h-3" />
                    <span>Embed</span>
                  </button>
                </div>

                {/* Seletor Rápido de Salão para testar o White-label Maquiado */}
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[11px] font-bold text-slate-300">
                      Simular Salão Parceiro:
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {sampleSalons.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedPreviewSalon(s)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition cursor-pointer ${
                          selectedPreviewSalon.id === s.id
                            ? 'bg-[#20C933] text-white shadow-xs'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                        }`}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>

                <TriadeMnvClientRegisterForm
                  salonId={selectedPreviewSalon.id}
                  salonName={selectedPreviewSalon.name}
                  salonAccentColor={selectedPreviewSalon.accentColor}
                  onSuccess={(data) =>
                    handleTriggerFeedback(
                      `Cliente "${data.fullName}" (${data.username}) cadastrado via ${data.salonName}! CEP: ${data.address.cep} (${data.address.city}/${data.address.state}).`
                    )
                  }
                  onSwitchToLogin={() => setMnvUserFlow('acesso')}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📌 CONTEÚDO DA ABA 2: CADASTRO DE ESTABELECIMENTO */}
      {/* ========================================================================= */}
      {activeMainTab === 'cadastro_estabelecimento' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Header Contextual */}
          <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-500 dark:text-emerald-400">Estabelecimentos</span>
                <span className="text-slate-400">/</span>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Cadastro de Estabelecimento
                </h2>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Ficha cadastral oficial sincronizada com o banco Supabase.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                type="button"
                onClick={() => setEmbedModalForm('estabelecimento')}
                className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Code className="w-3.5 h-3.5 text-emerald-400" />
                <span>Embed Estabelecimento</span>
              </button>
            </div>
          </div>

          {/* Card Principal: Formulário Master Completo de Estabelecimento */}
          <div className="py-2">
            <TriadeEstablishmentMasterForm
              onSuccess={(data) =>
                handleTriggerFeedback(
                  `Estabelecimento "${data.tradeName}" (CNPJ: ${data.documentNumber}) cadastrado com sucesso! Proprietário: ${data.ownerName}.`
                )
              }
            />
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
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-500 dark:text-emerald-400">Adminvapp</span>
                <span className="text-slate-400">/</span>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Acesso Corporativo Adminvapp
                </h2>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Formulários oficiais de Login e Recuperação de Acesso exclusivos para administradores.
              </p>
            </div>

            {/* Alternador de Sub-fluxo: Login vs Recuperação de Acesso vs Lado a Lado */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 self-start md:self-auto">
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
              adminFlow === 'ambos' ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1 max-w-md mx-auto'
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
