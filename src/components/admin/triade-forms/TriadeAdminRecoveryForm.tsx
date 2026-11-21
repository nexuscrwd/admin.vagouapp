import React, { useState } from 'react';
import {
  User,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Mail,
  Smartphone,
  RotateCcw,
  X,
} from 'lucide-react';
import { recoverAdminAccess } from '../../../services/supabaseApi';
import { VagouOfficialLogo } from '../../common/VagouOfficialLogo';

interface TriadeAdminRecoveryFormProps {
  onSuccess?: (info: any) => void;
  onSwitchToLogin?: () => void;
  onClose?: () => void;
  variant?: 'card' | 'flat';
}

export const TriadeAdminRecoveryForm: React.FC<TriadeAdminRecoveryFormProps> = ({
  onSuccess,
  onSwitchToLogin,
  onClose,
  variant = 'card',
}) => {

  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [sentSuccess, setSentSuccess] = useState<{
    identifier: string;
    targetEmail?: string;
    targetPhone?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const clean = identifier.trim();
    if (!clean) {
      setErrorMessage('Por favor, informe seu Usuário.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await recoverAdminAccess('access_data', clean);
      if (res.success) {
        setSentSuccess({
          identifier: clean,
          targetEmail: clean.includes('@') ? clean : 'e-mail cadastrado',
          targetPhone: clean.replace(/\D/g, '').length >= 10 ? clean : 'WhatsApp / celular cadastrado',
        });
        onSuccess?.(res);
      } else {
        setErrorMessage(res.error || 'Usuário não localizado no sistema.');
      }
    } catch {
      setErrorMessage('Erro ao processar solicitação de recuperação.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = () => {
    setSentSuccess(null);
  };

  const isCard = variant === 'card';

  return (
    <div
      className={`triade-form-root admvapp-section w-full ${
        isCard
          ? 'max-w-md mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden'
          : 'bg-transparent border-0 shadow-none'
      } animate-fadeIn font-['Poppins'] relative transition-colors`}
      style={
        isCard
          ? {
              backgroundColor: 'var(--admin-section-bg)',
              color: 'var(--admin-section-text)',
            }
          : undefined
      }
    >

      <div
        className={`${
          isCard
            ? 'bg-slate-50/80 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800/80'
            : 'bg-transparent border-b border-slate-200 dark:border-white/10'
        } px-6 pt-6 pb-4 sm:px-7 sm:pt-7 sm:pb-5 relative flex flex-col items-center justify-center text-center transition-colors`}
        style={
          isCard
            ? {
                backgroundColor: 'var(--admin-header-bg)',
                color: 'var(--admin-header-text)',
              }
            : undefined
        }
      >
        <VagouOfficialLogo size="xl" variant="full" className="h-10 sm:h-12 w-auto max-w-[220px] object-contain mx-auto" />
        <h2
          className="font-bold text-slate-900 dark:text-white text-base sm:text-lg tracking-tight mt-2.5 text-center"
          style={{ color: 'var(--admin-header-text)' }}
        >
          Recuperar Acesso
        </h2>

        {onClose && (
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.parent?.postMessage({ source: 'VAGOUAPP_EMBED', event: 'CLOSE' }, '*');
              }
              if (onClose) {
                onClose();
              } else if (typeof window !== 'undefined') {
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  window.location.href = '/';
                }
              }
            }}
            className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition cursor-pointer shrink-0"
            aria-label="Fechar formulário"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="mx-6 sm:mx-7 mt-5 mb-0 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-200 text-xs flex items-start gap-2.5 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMessage}</div>
        </div>
      )}

      {sentSuccess ? (
        <div className="w-full px-6 pt-5 pb-6 sm:px-7 sm:pt-6 sm:pb-7 space-y-4 animate-fadeIn">
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-500/30 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Instruções Enviadas</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Enviamos um <strong>código de verificação no celular</strong> e um <strong>link de redefinição de senha no e-mail</strong> cadastrado para o usuário{' '}
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{sentSuccess.identifier}</span>.
            </p>
          </div>

          <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Código via WhatsApp / SMS</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Mail className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Link seguro via e-mail corporativo</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleResend}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Reenviar</span>
            </button>

            {onSwitchToLogin && (
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="flex-1 py-3 px-4 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <span className="text-white">Fazer Login</span>
                <ArrowRight className="w-3.5 h-3.5 text-white" />
              </button>
            )}
          </div>
        </div>
      ) : (

        <form onSubmit={handleSubmit} autoComplete="off" className="w-full px-6 pt-5 pb-6 sm:px-7 sm:pt-6 sm:pb-7 space-y-5">
          <div>
            <label
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2"
              style={{ color: 'var(--admin-section-text)' }}
            >
              Usuário
            </label>
            <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-3 min-h-[46px] focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition">
              <User className="w-4 h-4 text-slate-400 dark:text-slate-500 mr-3 shrink-0" />
              <input
                type="text"
                autoComplete="off"
                placeholder=""
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none"
                required
              />
            </div>
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-5 min-h-[48px] rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
            >
              {isLoading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span className="text-white">Recuperar Acesso</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </>
              )}
            </button>
          </div>

          {onSwitchToLogin && (
            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar para o Login</span>
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  );
};
