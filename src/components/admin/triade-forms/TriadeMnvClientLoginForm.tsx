import React, { useState } from 'react';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  X,
} from 'lucide-react';
import { VagouOfficialLogo } from '../../common/VagouOfficialLogo';

export interface TriadeMnvClientLoginFormProps {
  salonName?: string;
  onSuccess?: (data: { identifier: string }) => void;
  onSwitchToRegister?: () => void;
  onSwitchToRecovery?: () => void;
  onClose?: () => void;
}

export const TriadeMnvClientLoginForm: React.FC<TriadeMnvClientLoginFormProps> = ({
  salonName = 'VagouApp',
  onSuccess,
  onSwitchToRegister,
  onSwitchToRecovery,
  onClose,
}) => {
  // Aceita: Usuário (@fulano, fulano@, fulano#), E-mail ou Celular
  const [identifier, setIdentifier] = useState('(11) 98888-7777');
  const [password, setPassword] = useState('cliente123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!identifier.trim() || !password) {
      setFeedback({ type: 'error', message: 'Preencha seu usuário/celular/e-mail e sua senha.' });
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setFeedback({
        type: 'success',
        message: 'Acesso validado no ecossistema! Redirecionando para seus agendamentos...',
      });
      onSuccess?.({ identifier });
    }, 600);
  };

  const isVagouApp = salonName === 'VagouApp' || !salonName;

  return (
    <div className="w-full max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn font-['Poppins']">
      {/* Top Banner White-label do Salão ou VagouApp */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 p-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <VagouOfficialLogo size="lg" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="font-extrabold text-white text-base tracking-tight truncate max-w-[200px]">
                {isVagouApp ? 'VagouApp' : salonName}
              </h2>
              {isVagouApp && (
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded shrink-0">
                  Oficial
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 truncate">
              {isVagouApp ? 'Ecossistema Oficial · Acesse sua conta' : 'Acesse sua conta'}
            </p>
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

      {/* Formulário de Acesso do Cliente */}
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
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

        {/* Campo Usuário, E-mail ou Celular */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Usuário, E-mail ou Celular
          </label>
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition">
            <User className="w-4 h-4 text-slate-500 mr-2.5 shrink-0" />
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="@usuario, seu@email.com ou (11) 99999-9999"
              className="w-full bg-transparent text-sm text-white placeholder-slate-600 outline-none"
              required
            />
          </div>
        </div>

        {/* Campo Senha com "Esqueceu a senha?" AO PÉ DO INPUT */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Senha
          </label>
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition">
            <Lock className="w-4 h-4 text-slate-500 mr-2.5 shrink-0" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
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
          <div className="flex justify-end pt-1.5">
            <button
              type="button"
              onClick={() => {
                if (onSwitchToRecovery) {
                  onSwitchToRecovery();
                } else {
                  setFeedback({
                    type: 'success',
                    message: 'Enviamos um código de verificação para o seu celular/e-mail cadastrado.',
                  });
                }
              }}
              className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline font-medium cursor-pointer transition"
            >
              Esqueceu a senha?
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
        >
          {isLoading ? (
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span className="text-white">Entrar no App do Salão</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </>
          )}
        </button>

        {/* Rodapé: Link para quem ainda não tem cadastro */}
        <div className="pt-4 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-400">
            Primeira vez por aqui?{' '}
            <button
              type="button"
              onClick={() => onSwitchToRegister?.()}
              className="text-emerald-400 hover:text-emerald-300 font-bold ml-1 cursor-pointer"
            >
              Criar conta em 1 minuto
            </button>
          </p>
        </div>
      </form>
    </div>
  );
};
