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
}

export const TriadeAdminLoginForm: React.FC<TriadeAdminLoginFormProps> = ({
  onSuccess,
  onSwitchToRecovery,
  onSwitchToRegister,
  onClose,
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

  return (
    <div className="w-full max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn font-['Poppins']">
      {/* Top Banner com Logo Oficial do VagouApp e apenas "Login" */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 p-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <VagouOfficialLogo size="lg" />
          <div className="min-w-0">
            <h2 className="font-bold text-white text-base tracking-tight font-['Poppins']">
              VagouApp
            </h2>
            <span className="text-xs font-semibold text-emerald-400">
              Login
            </span>
          </div>
        </div>

        {/* Botão Fechar Oficial da Tríade */}
        <button
          type="button"
          onClick={() => {
            if (onClose) {
              onClose();
            } else if (typeof window !== 'undefined') {
              window.parent?.postMessage({ source: 'VAGOUAPP_FORM', action: 'CLOSE' }, '*');
              if (window.history.length > 1) {
                window.history.back();
              } else {
                window.location.href = '/';
              }
            }
          }}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0"
          aria-label="Fechar formulário"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>
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
              placeholder="@usuario, e-mail ou celular"
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

        {/* Link para Cadastrar Novo Administrador */}
        {onSwitchToRegister && (
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer transition hover:underline"
            >
              Cadastrar novo administrador
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
