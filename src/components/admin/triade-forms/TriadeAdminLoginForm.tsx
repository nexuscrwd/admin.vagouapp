import React, { useState } from 'react';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  X,
} from 'lucide-react';
import { loginAdmin } from '../../../services/supabaseApi';
import { VagouOfficialLogo } from '../../common/VagouOfficialLogo';

export interface TriadeAdminLoginFormProps {
  onSuccess?: (admin: any) => void;
  onSwitchToRecovery?: () => void;
  onSwitchToRegister?: () => void;
  onClose?: () => void;
  variant?: 'card' | 'flat';
}

export const TriadeAdminLoginForm: React.FC<TriadeAdminLoginFormProps> = ({
  onSuccess,
  onSwitchToRecovery,
  onClose,
  variant = 'card',
}) => {
  // Identificador aceita: Usuário (@fulano, fulano@, fulano#), E-mail ou Celular
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Bloqueia o autofill automático do Chrome/Edge ao carregar a página; libera imediatamente ao focar/clicar
  const [inputUnlocked, setInputUnlocked] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const clean = identifier.trim();
    if (!clean || !password) {
      setErrorMessage('Preencha seu Usuário e a Senha.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginAdmin(clean, password);
      if (res.success && res.admin) {
        setSuccessMessage('Acesso autorizado com sucesso!');
        onSuccess?.(res.admin);
      } else {
        setErrorMessage(res.error || 'Credenciais inválidas. Verifique os dados.');
      }
    } catch {
      setErrorMessage('Erro de conexão ao autenticar no Supabase.');
    } finally {
      setIsLoading(false);
    }
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
      {/* Top Banner com Logo Oficial do VagouApp e Título Centralizados */}
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
          Acesso Admin
        </h2>

        {/* Botão Fechar Oficial da Tríade */}
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

      {/* Alertas */}
      {errorMessage && (
        <div className="mx-6 sm:mx-7 mt-5 mb-0 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-200 text-xs flex items-start gap-2.5 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMessage}</div>
        </div>
      )}

      {successMessage && (
        <div className="mx-6 sm:mx-7 mt-5 mb-0 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-200 text-xs flex items-start gap-2.5 animate-fadeIn font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{successMessage}</div>
        </div>
      )}

      {/* Formulário de Login (autoComplete="off" + inputs 100% em branco sem pontos ou senhas salvas) */}
      <form
        onSubmit={handleSubmit}
        autoComplete="off"
        className="w-full px-6 pt-5 pb-6 sm:px-7 sm:pt-6 sm:pb-7 space-y-5"
      >
        {/* Campos isca invisíveis para impedir que o gerenciador de senhas do navegador preencha sozinho */}
        <input type="text" name="prevent_autofill_user" autoComplete="username" className="hidden" tabIndex={-1} />
        <input type="password" name="prevent_autofill_pass" autoComplete="current-password" className="hidden" tabIndex={-1} />

        {/* Campo Usuário (aceita Usuário @, E-mail ou Celular) */}
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
              name="vagou_admin_identifier_field"
              autoComplete="off"
              readOnly={!inputUnlocked}
              onFocus={() => setInputUnlocked(true)}
              placeholder=""
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none"
              required
            />
          </div>
        </div>

        {/* Campo Senha 100% em branco (sem pontinhos no placeholder) */}
        <div>
          <label
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2"
            style={{ color: 'var(--admin-section-text)' }}
          >
            Senha
          </label>
          <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-3 min-h-[46px] focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition">
            <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 mr-3 shrink-0" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="vagou_admin_secret_field"
              autoComplete="new-password"
              readOnly={!inputUnlocked}
              onFocus={() => setInputUnlocked(true)}
              placeholder=""
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 p-1 ml-2 cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* "Esqueceu a senha?" AO PÉ DO INPUT SENHA */}
          {onSwitchToRecovery && (
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onSwitchToRecovery}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 hover:underline font-semibold cursor-pointer transition"
              >
                Esqueceu a senha?
              </button>
            </div>
          )}
        </div>

        {/* Botão de Entrar (Fundo Verde = Texto/Ícone Branco Obrigatório) */}
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
                <span className="text-white">Entrar</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
