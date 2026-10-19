import React, { useState } from 'react';
import {
  Building2,
  Sparkles,
  CalendarCheck2,
  Clock,
  MapPin,
  TrendingUp,
  ShieldCheck,
  Users,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Lock,
  Store,
  HelpCircle,
  Phone,
} from 'lucide-react';
import { TriadeEstablishmentMasterForm } from '../admin/triade-forms/TriadeEstablishmentMasterForm';
import { VagouOfficialLogo } from '../common/VagouOfficialLogo';

export interface VagouGatewayHubProps {
  onOpenAdmin?: () => void;
}

export const VagouGatewayHub: React.FC<VagouGatewayHubProps> = ({ onOpenAdmin }) => {
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 font-['Poppins'] flex flex-col justify-between selection:bg-[#20C933] selection:text-white">
      {/* ========================================================================= */}
      {/* 🧭 BARRA SUPERIOR DO GATEWAY HUB (vagouapp.com) */}
      {/* ========================================================================= */}
      <header className="w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Marca Oficial VagouApp */}
          <div className="flex items-center gap-3">
            <VagouOfficialLogo size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-lg tracking-tight">VagouApp</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
                  Gateway Oficial
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                O ecossistema inteligente de vagas imediatas & gestão
              </p>
            </div>
          </div>

          {/* Links Rápidos de Acesso */}
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="https://seunegocio.vagouapp.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Store className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Já é parceiro?</span>
              <span>Entrar no Salão</span>
            </a>

            {onOpenAdmin && (
              <button
                type="button"
                onClick={onOpenAdmin}
                className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition flex items-center gap-1.5 cursor-pointer"
                title="Acessar Painel de Governança Master"
              >
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden md:inline">Painel Master</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 🚀 CONTEÚDO PRINCIPAL (HERO BILATERAL: CLIENTE vs ESTABELECIMENTO) */}
      {/* ========================================================================= */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-16 flex flex-col justify-center">
        {/* Título Principal & Síntese */}
        <div className="text-center space-y-3 mb-10 sm:mb-14 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Bem-vindo ao VagouApp</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            Para onde você deseja ir hoje?
          </h1>

          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Escolha seu objetivo abaixo para ser direcionado ao ambiente ideal.
          </p>
        </div>

        {/* Os 2 Grandes Cards de Ação */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
          {/* ===================================================================== */}
          {/* CARD 1: CLIENTES & CONSUMIDORES (PORTAL VAGOUAPP) */}
          {/* ===================================================================== */}
          <div className="bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-200 group relative overflow-hidden shadow-2xl">
            <div className="space-y-6">
              {/* Badge & Ícone */}
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10 group-hover:scale-105 transition">
                  <CalendarCheck2 className="w-7 h-7 text-emerald-400" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  Consumidor / Cliente
                </span>
              </div>

              {/* Título & Descrição */}
              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Quero Agendar um Horário
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Encontre salões, barbearias e clínicas de estética perto de você com vagas imediatas ou agende para os próximos dias.
                </p>
              </div>

              {/* Benefícios Rápidos em Ícones */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
                  <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Radar de vagas imediatas para hoje</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Busca inteligente por proximidade no mapa</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Confirmação rápida sem espera em filas</span>
                </div>
              </div>
            </div>

            {/* Botão de Ação */}
            <div className="pt-8">
              <a
                href="https://portal.vagouapp.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-5 rounded-2xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-98"
              >
                <span className="text-white font-bold">Acessar Portal de Vagas</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </a>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* CARD 2: PARCEIROS & ESTABELECIMENTOS (MEU NEGÓCIO VAGOUAPP) */}
          {/* ===================================================================== */}
          <div className="bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-200 group relative overflow-hidden shadow-2xl">
            <div className="space-y-6">
              {/* Badge & Ícone */}
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10 group-hover:scale-105 transition">
                  <Building2 className="w-7 h-7 text-emerald-400" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  Salão / Profissional
                </span>
              </div>

              {/* Título & Descrição */}
              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Cadastrar Meu Estabelecimento
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Preencha horários ociosos da equipe, receba novos clientes pelo Radar e modernize a gestão do seu salão ou estúdio.
                </p>
              </div>

              {/* Benefícios Rápidos em Ícones */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
                  <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Publique vagas ociosas e aumente seu faturamento</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
                  <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Agenda da equipe e catálogo completo de serviços</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Ficha cadastral 100% digital com suporte oficial</span>
                </div>
              </div>
            </div>

            {/* Botão de Ação */}
            <div className="pt-8 space-y-2">
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(true)}
                className="w-full py-3.5 px-5 rounded-2xl bg-white hover:bg-slate-200 text-slate-950 font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98"
              >
                <span>Criar Meu Negócio Grátis</span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </button>

              <div className="text-center">
                <a
                  href="https://seunegocio.vagouapp.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-400 hover:text-emerald-400 transition inline-flex items-center gap-1"
                >
                  <span>Já possui cadastro? Entrar no Meu Negócio</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* 🛡️ RODAPÉ INSTITUCIONAL MÍNIMO */}
      {/* ========================================================================= */}
      <footer className="w-full border-t border-slate-800/80 bg-slate-950 py-6 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>© {new Date().getFullYear()} VagouApp Tecnologia.</span>
            <span className="hidden sm:inline">Todos os direitos reservados.</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="hover:text-slate-300 cursor-pointer">Termos de Uso</span>
            <span>·</span>
            <span className="hover:text-slate-300 cursor-pointer">Privacidade</span>
            <span>·</span>
            <a
              href="https://wa.me/5511999999999"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-emerald-400 transition flex items-center gap-1"
            >
              <Phone className="w-3 h-3" />
              <span>Suporte WhatsApp</span>
            </a>
          </div>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 🏢 MODAL DEDICADO: CADASTRO MASTER DO ESTABELECIMENTO (LAYOUT PLANO) */}
      {/* ========================================================================= */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] overflow-y-auto">
            <TriadeEstablishmentMasterForm
              onSuccess={() => setIsRegisterModalOpen(false)}
              onClose={() => setIsRegisterModalOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
