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
  onSwitchToRegister,
  onClose,
  variant = 'card',
}) => {
  // Identificador aceita: Usuário (@fulano, fulano@, fulano#), E-mail ou Celular
  const [identifier, setIdentifier] = useState('Anderson@');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);

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
      className={`w-full max-w-md mx-auto ${
        isCard
          ? 'bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden'
          : 'bg-transparent border-0 shadow-none'
      } animate-fadeIn font-['Poppins'] relative`}
    >
      {/* Top Banner com Logo Oficial do VagouApp e Título Centralizados */}
      <div
        className={`${
          isCard
            ? 'bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800'
            : 'bg-transparent border-b border-white/10'
        } p-5 relative flex flex-col items-center justify-center text-center`}
      >
        <VagouOfficialLogo size="xl" variant="full" className="h-10 sm:h-12 w-auto max-w-[220px] object-contain mx-auto" />
        <h2 className="font-bold text-white text-base sm:text-lg tracking-tight mt-2 text-center">
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
            className="absolute top-3.5 right-3.5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0"
            aria-label="Fechar formulário"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Alertas */}
      {errorMessage && (
        <div className="m-4 mb-0 p-3 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2.5 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMessage}</div>
        </div>
      )}

      {successMessage && (
        <div className="m-4 mb-0 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-start gap-2.5 animate-fadeIn font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{successMessage}</div>
        </div>
      )}

      {/* Formulário de Login */}
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* Campo Usuário (aceita Usuário @, E-mail ou Celular) */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Usuário
          </label>
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition">
            <User className="w-4 h-4 text-slate-500 mr-2.5 shrink-0" />
            <input
              type="text"
              placeholder="Usuário, E-mail ou Telefone"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full bg-transparent text-sm text-white placeholder-slate-600 outline-none"
              required
            />
          </div>
        </div>

        {/* Campo Senha com "Esqueceu a senha?" ao pé do input */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Senha
          </label>
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition">
            <Lock className="w-4 h-4 text-slate-500 mr-2.5 shrink-0" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

          {/* "Esqueceu a senha?" AO PÉ DO INPUT SENHA */}
          {onSwitchToRecovery && (
            <div className="flex justify-end pt-1.5">
              <button
                type="button"
                onClick={onSwitchToRecovery}
                className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline font-medium cursor-pointer transition"
              >
                Esqueceu a senha?
              </button>
            </div>
          )}
        </div>

        {/* Botão de Entrar (Fundo Verde = Texto/Ícone Branco Obrigatório) */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
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
      </form>
    </div>
  );
};
