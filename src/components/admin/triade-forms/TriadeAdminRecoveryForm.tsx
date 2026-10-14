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
} from 'lucide-react';
import { recoverAdminAccess } from '../../../services/supabaseApi';

export interface TriadeAdminRecoveryFormProps {
  onSuccess?: (info: any) => void;
  onSwitchToLogin?: () => void;
}

export const TriadeAdminRecoveryForm: React.FC<TriadeAdminRecoveryFormProps> = ({
  onSuccess,
  onSwitchToLogin,
}) => {
  // Input único: "Usuário" (aceita @usuario, fulano@, e-mail ou celular)
  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estado de envio com sucesso (código no celular e link no e-mail)
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

  return (
    <div className="w-full max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn font-['Poppins']">
      {/* Top Banner com Logo Oficial do VagouApp e "Recuperar Acesso" */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 p-5">
        <div className="flex items-center gap-3">
          {/* Logo Oficial VagouApp (Fundo Verde + V Branco) */}
          <div className="w-10 h-10 rounded-xl bg-[#20C933] flex items-center justify-center text-white font-black text-xl shadow-lg shadow-emerald-500/20 shrink-0">
            <span className="text-white font-black text-xl tracking-tighter">V</span>
          </div>
          <div>
            <h2 className="font-bold text-white text-base tracking-tight font-['Poppins']">
              VagouApp
            </h2>
            <span className="text-xs font-semibold text-emerald-400">
              Recuperar Acesso
            </span>
          </div>
        </div>
      </div>

      {/* Alerta de Erro */}
      {errorMessage && (
        <div className="m-4 mb-0 p-3 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2.5 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMessage}</div>
        </div>
      )}

      {/* TELA DE SUCESSO APÓS SUBMISSÃO */}
      {sentSuccess ? (
        <div className="p-5 space-y-4 animate-fadeIn">
          <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white">Instruções Enviadas</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Enviamos um <strong>código de verificação no celular</strong> e um <strong>link de redefinição de senha no e-mail</strong> cadastrado para o usuário{' '}
              <span className="font-mono text-emerald-400 font-bold">{sentSuccess.identifier}</span>.
            </p>
          </div>

          <div className="space-y-2 text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 text-slate-300">
              <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Código via WhatsApp / SMS</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Link seguro via e-mail corporativo</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleResend}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reenviar</span>
            </button>

            {onSwitchToLogin && (
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <span>Fazer Login</span>
                <ArrowRight className="w-3.5 h-3.5 text-white" />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* FORMULÁRIO DE RECUPERAÇÃO (APENAS INPUT "USUÁRIO", SEM NOVAS SENHAS) */
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
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

          {/* Botão de Envio (Fundo Verde = Texto/Ícone Branco Obrigatório) */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
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

          {/* Voltar para o Login */}
          {onSwitchToLogin && (
            <div className="pt-2 text-center">
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
