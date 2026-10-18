import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  Mail,
  Phone,
  Shield,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  ArrowRight,
  ArrowLeft,
  X,
} from 'lucide-react';
import { SystemAdminUser } from '../../../types/admin';
import { registerAdmin } from '../../../services/supabaseApi';
import { VagouOfficialLogo } from '../../common/VagouOfficialLogo';

export interface TriadeAdminRegisterFormProps {
  onSuccess?: (newAdmin: SystemAdminUser) => void;
  onSwitchToLogin?: () => void;
  onClose?: () => void;
}

export const TriadeAdminRegisterForm: React.FC<TriadeAdminRegisterFormProps> = ({
  onSuccess,
  onSwitchToLogin,
  onClose,
}) => {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [emailConfirm, setEmailConfirm] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'superadmin' | 'moderator' | 'support'>('superadmin');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Formatação de Máscara de Telefone ((11) 99999-9999)
  const formatPhone = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    if (raw.length <= 2) return raw;
    if (raw.length <= 7) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
  };

  // Validações em Tempo Real
  const cleanUsername = username.replace(/^@+/, '');
  const hasUppercase = /[A-Z]/.test(cleanUsername);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(cleanUsername);
  const isUsernameValid = cleanUsername.length >= 3 && hasUppercase && hasSpecialChar;
  const isEmailMatching =
    email.trim().length > 0 &&
    emailConfirm.trim().length > 0 &&
    email.trim().toLowerCase() === emailConfirm.trim().toLowerCase();
  const isPasswordMatching =
    password.length >= 6 && passwordConfirm.length >= 6 && password === passwordConfirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Informe o Nome completo do administrador.');
      return;
    }

    if (!isUsernameValid) {
      setErrorMessage(
        'O Nome de usuário deve ter ao menos 3 caracteres, contendo 1 letra maiúscula e 1 caractere especial.'
      );
      return;
    }

    if (!email.trim() || !emailConfirm.trim()) {
      setErrorMessage('Preencha o E-mail e a Confirmação de e-mail.');
      return;
    }

    if (!isEmailMatching) {
      setErrorMessage('Os e-mails informados não conferem.');
      return;
    }

    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      setErrorMessage('Informe um número de Cel./WhatsApp válido com DDD.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (!isPasswordMatching) {
      setErrorMessage('A confirmação de senha não confere com a senha digitada.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await registerAdmin({
        full_name: fullName.trim(),
        username: cleanUsername,
        email: email.trim().toLowerCase(),
        email_confirmation: emailConfirm.trim().toLowerCase(),
        phone_whatsapp: phone.trim(),
        password: password,
      });

      if (res.success && res.admin) {
        setSuccessMessage(`Administrador @${res.admin.username} cadastrado com sucesso!`);
        onSuccess?.(res.admin);
      } else {
        setErrorMessage(res.error || 'Erro ao cadastrar administrador.');
      }
    } catch {
      setErrorMessage('Erro inesperado na comunicação com o banco.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn font-['Poppins']">
      {/* Top Banner com Logo Oficial do VagouApp e Título Centralizados */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 p-5 relative flex flex-col items-center justify-center text-center">
        <VagouOfficialLogo size="xl" variant="full" className="h-10 sm:h-12 w-auto max-w-[220px] object-contain mx-auto" />
        <h2 className="font-bold text-white text-base sm:text-lg tracking-tight mt-2 text-center">
          Cadastrar Novo Administrador
        </h2>

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
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0"
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

      {/* Formulário de Cadastro */}
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* Nome Completo */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-emerald-400" />
            <span>Nome completo *</span>
          </label>
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition">
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="ex: Carlos Eduardo Silva"
              required
              className="w-full bg-transparent text-sm text-white placeholder-slate-600 outline-none"
            />
          </div>
        </div>

        {/* Nome de Usuário */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Nome de usuário *</span>
            </label>
            <span className="text-[10px] text-slate-500">(1 Maiúscula + 1 Caractere Especial)</span>
          </div>
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/^@+/, ''))}
              placeholder="ex: Anderson@, jOse#, pauLa**"
              required
              className="w-full bg-transparent text-sm text-white placeholder-slate-600 outline-none"
            />
            {cleanUsername && isUsernameValid && (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-1.5" />
            )}
          </div>

          {/* Badges de Validação */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition ${
                hasUppercase
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              • Letra Maiúscula (A-Z)
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition ${
                hasSpecialChar
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              • Caractere Especial (@, #, $, !)
            </span>
          </div>
        </div>

        {/* Grid: E-mail e Confirmação de E-mail */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-emerald-400" />
              <span>E-mail institucional *</span>
            </label>
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@vagouapp.com"
                required
                className="w-full bg-transparent text-sm text-white placeholder-slate-600 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-emerald-400" />
              <span>Confirmação de e-mail *</span>
            </label>
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition">
              <input
                type="email"
                value={emailConfirm}
                onChange={(e) => setEmailConfirm(e.target.value)}
                placeholder="admin@vagouapp.com"
                required
                className="w-full bg-transparent text-sm text-white placeholder-slate-600 outline-none"
              />
              {emailConfirm && isEmailMatching && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-1.5" />
              )}
            </div>
          </div>
        </div>

        {/* Grid: Celular/WhatsApp e Nível de Acesso */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cel./whats *</span>
            </label>
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition">
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="(11) 99999-9999"
                required
                className="w-full bg-transparent text-sm text-white placeholder-slate-600 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Nível de Acesso *</span>
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition cursor-pointer"
            >
              <option value="superadmin">Super Administrador (Soberano)</option>
              <option value="moderator">Moderador de Salões</option>
              <option value="support">Suporte Corporativo</option>
            </select>
          </div>
        </div>

        {/* Grid: Senha e Confirmação de Senha */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Senha *</span>
            </label>
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                className="w-full bg-transparent text-sm text-white placeholder-slate-600 outline-none"
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

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Confirmação de Senha *</span>
            </label>
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition">
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="Repita a senha"
                required
                className="w-full bg-transparent text-sm text-white placeholder-slate-600 outline-none"
              />
              {passwordConfirm && isPasswordMatching && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-1.5" />
              )}
            </div>
          </div>
        </div>

        {/* Botão de Concluir Cadastro (Fundo Verde = Texto/Ícone Branco Obrigatório) */}
        <button
          type="submit"
          disabled={isLoading || !isUsernameValid || !isEmailMatching}
          className="w-full py-3 px-4 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95"
        >
          {isLoading ? (
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <UserPlus className="w-4 h-4 text-white" />
              <span className="text-white">Concluir Cadastro</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </>
          )}
        </button>

        {/* Link para Voltar ao Login */}
        {onSwitchToLogin && (
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Já possui acesso? Fazer Login</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
