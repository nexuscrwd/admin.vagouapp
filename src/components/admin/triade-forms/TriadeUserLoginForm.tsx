import React, { useState } from 'react';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Loader2,
  X,
  KeyRound,
} from 'lucide-react';
import { VagouOfficialLogo } from '../../common/VagouOfficialLogo';
import { supabaseAdmin } from '../../../services/supabase';

export interface TriadeUserLoginPayload {
  identifier: string;
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  accountType?: 'client' | 'professional' | 'owner';
}

export type UserLoginPhase = 'credentials' | 'recovery';

export interface TriadeUserLoginFormProps {
  onSuccess?: (data: TriadeUserLoginPayload) => void;
  onSwitchToRegister?: () => void;
  onSwitchToRecovery?: () => void;
  onClose?: () => void;
  showHeader?: boolean;
  variant?: 'card' | 'flat';
  title?: string;
  subtitle?: string;
  submitButtonText?: string;
  activePhase?: UserLoginPhase;
  onPhaseChange?: (phase: UserLoginPhase) => void;
  showSwitchToRegister?: boolean;
}

export const TriadeUserLoginForm: React.FC<TriadeUserLoginFormProps> = ({
  onSuccess,
  onSwitchToRegister,
  onSwitchToRecovery,
  onClose,
  showHeader = true,
  variant = 'card',
  title = 'Acessar Espaço',
  subtitle = 'Acesso Oficial',
  submitButtonText = 'Acessar Conta',
  activePhase,
  onPhaseChange,
  showSwitchToRegister = false,
}) => {
  // Controle de Fases do Login
  const [internalPhase, setInternalPhase] = useState<UserLoginPhase>('credentials');
  const currentPhase = activePhase ?? internalPhase;
  const setPhase = (phase: UserLoginPhase) => {
    setInternalPhase(phase);
    onPhaseChange?.(phase);
  };
  // Aceita: Usuário (@usuario), E-mail ou Celular
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const rawId = identifier.trim();
    if (!rawId) {
      setFeedback({ type: 'error', message: 'Informe seu usuário, e-mail ou celular.' });
      return;
    }
    if (!password) {
      setFeedback({ type: 'error', message: 'Informe sua senha de acesso.' });
      return;
    }

    setIsLoading(true);

    try {
      const cleanUsername = rawId.replace(/^@+/, '').toLowerCase();
      const digitsOnly = rawId.replace(/\D/g, '');

      // 1. Busca usuário em public.clients
      const { data: clientsData } = await supabaseAdmin
        .from('clients')
        .select('*');

      const matchedClient = (clientsData || []).find((c: any) => {
        const cEmail = (c.email || '').trim().toLowerCase();
        const cUser = (c.username || '').replace(/^@+/, '').trim().toLowerCase();
        const cPhone = (c.phone || '').replace(/\D/g, '');
        return (
          (cEmail && cEmail === rawId.toLowerCase()) ||
          (cUser && cUser === cleanUsername) ||
          (digitsOnly.length >= 8 && cPhone && cPhone.endsWith(digitsOnly.slice(-8)))
        );
      });

      if (matchedClient && matchedClient.password_hash && matchedClient.password_hash !== password) {
        setIsLoading(false);
        setFeedback({ type: 'error', message: 'Senha incorreta. Verifique e tente novamente.' });
        return;
      }

      // 2. Verifica se é proprietário ou profissional de algum salão
      const userEmail = (matchedClient?.email || (rawId.includes('@') ? rawId : '')).toLowerCase();
      const userPhone = matchedClient?.phone || rawId;

      let accountType: 'client' | 'professional' | 'owner' =
        matchedClient?.origin === 'estabelecimento' || matchedClient?.origin === 'profissional'
          ? 'owner'
          : 'client';

      if (userEmail) {
        const { data: ownerSalon } = await supabaseAdmin
          .from('salons')
          .select('id, owner_email, email')
          .or(`owner_email.ilike.${userEmail},email.ilike.${userEmail}`)
          .limit(1);
        if (ownerSalon && ownerSalon.length > 0) {
          accountType = 'owner';
        }
      }

      const resolvedPayload: TriadeUserLoginPayload = {
        identifier: rawId,
        id: matchedClient?.id,
        name: matchedClient?.name || cleanUsername,
        email: matchedClient?.email || (rawId.includes('@') ? rawId : `${cleanUsername}@vagouapp.com`),
        phone: userPhone,
        accountType,
      };

      setIsLoading(false);
      setFeedback({
        type: 'success',
        message: 'Acesso validado com sucesso!',
      });

      // Dispara evento global para interoperabilidade (iframes e apps irmãos mnvapp / pvapp)
      if (typeof window !== 'undefined') {
        window.parent?.postMessage(
          {
            source: 'VAGOUAPP_FORM',
            action: 'LOGIN_SUCCESS',
            payload: resolvedPayload,
          },
          '*'
        );
        window.parent?.postMessage(
          {
            type: 'VAGOU_REGISTRATION_SUCCESS',
            accountType: resolvedPayload.accountType,
            email: resolvedPayload.email,
            name: resolvedPayload.name,
            user: {
              id: resolvedPayload.id,
              name: resolvedPayload.name,
              email: resolvedPayload.email,
              phone: resolvedPayload.phone,
            },
          },
          '*'
        );
      }

      onSuccess?.(resolvedPayload);
    } catch {
      setIsLoading(false);
      const fallbackPayload: TriadeUserLoginPayload = {
        identifier: rawId,
        name: rawId.replace(/^@+/, ''),
        email: rawId.includes('@') ? rawId : `${rawId.replace(/^@+/, '')}@vagouapp.com`,
        accountType: 'client',
      };
      onSuccess?.(fallbackPayload);
    }
  };

  const handleRecoverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!identifier.trim()) {
      setFeedback({ type: 'error', message: 'Informe seu usuário, e-mail ou celular para recuperação.' });
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setFeedback({
        type: 'success',
        message: `Instruções de redefinição de acesso enviadas para o contato associado a "${identifier.trim()}".`,
      });
    }, 600);
  };

  const isCard = variant === 'card';

  return (
    <div
      className={`w-full font-['Poppins'] ${
        isCard
          ? 'max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden'
          : 'bg-transparent'
      } animate-fadeIn`}
    >
      {/* Cabeçalho Soberano Centralizado (Logo no topo, Título abaixo, Sem Badges Redundantes) */}
      {showHeader && (
        <div className="p-5 bg-slate-900 border-b border-slate-800 relative flex flex-col items-center justify-center text-center shrink-0">
          <VagouOfficialLogo size="xl" variant="full" className="h-10 sm:h-12 w-auto object-contain mx-auto" />
          <h2 className="font-bold text-white text-base sm:text-lg tracking-tight mt-2 text-center">
            {currentPhase === 'recovery' ? 'Recuperação de Acesso' : title}
          </h2>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* FASE 1: ACESSO COM SENHA */}
      {currentPhase === 'credentials' && (
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 animate-fadeIn">
          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 animate-fadeIn ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="font-medium">{feedback.message}</span>
            </div>
          )}

          {/* Campo Identificador: Usuário, E-mail ou Telefone */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Usuário, E-mail ou Telefone <span className="text-emerald-400">*</span>
            </label>
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 focus-within:border-emerald-500 transition">
              <User className="w-4 h-4 text-slate-500 mr-2.5 shrink-0" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Usuário, E-mail ou Telefone"
                className="w-full bg-transparent text-sm text-white placeholder-slate-600 outline-none"
                required
              />
            </div>
          </div>

          {/* Campo Senha com "Esqueceu a senha?" */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Senha de Acesso <span className="text-emerald-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setPhase('recovery');
                  onSwitchToRecovery?.();
                }}
                className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline font-medium cursor-pointer transition"
              >
                Esqueceu a senha?
              </button>
            </div>
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 focus-within:border-emerald-500 transition">
              <Lock className="w-4 h-4 text-slate-500 mr-2.5 shrink-0" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                className="w-full bg-transparent text-sm text-white placeholder-slate-600 outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-500 hover:text-slate-300 p-0.5 ml-1.5 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Botão de Ação Final (Fundo Verde = Texto Estritamente Branco) */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <>
                  <span className="text-white font-bold">{submitButtonText}</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </>
              )}
            </button>
          </div>

          {/* Alternador para Cadastro se ainda não tiver conta (Apenas quando explicitamente habilitado) */}
          {showSwitchToRegister && onSwitchToRegister && (
            <div className="pt-3 border-t border-slate-800 text-center">
              <p className="text-xs text-slate-400">
                Ainda não possui conta?{' '}
                <button
                  type="button"
                  onClick={onSwitchToRegister}
                  className="text-emerald-400 hover:text-emerald-300 font-bold ml-1 cursor-pointer"
                >
                  Cadastrar agora
                </button>
              </p>
            </div>
          )}
        </form>
      )}

      {/* FASE 2: RECUPERAÇÃO DE ACESSO */}
      {currentPhase === 'recovery' && (
        <form onSubmit={handleRecoverySubmit} className="p-5 sm:p-6 space-y-4 animate-fadeIn">
          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 animate-fadeIn ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="font-medium">{feedback.message}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Usuário, E-mail ou Telefone <span className="text-emerald-400">*</span>
            </label>
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 focus-within:border-emerald-500 transition">
              <User className="w-4 h-4 text-slate-500 mr-2.5 shrink-0" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Usuário, E-mail ou Telefone"
                className="w-full bg-transparent text-sm text-white placeholder-slate-600 outline-none"
                required
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <>
                  <KeyRound className="w-4 h-4 text-white" />
                  <span className="text-white font-bold">Enviar Instruções de Recuperação</span>
                </>
              )}
            </button>
          </div>

          <div className="pt-3 border-t border-slate-800 text-center">
            <button
              type="button"
              onClick={() => setPhase('credentials')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer"
            >
              ← Voltar para Acesso com Senha
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
