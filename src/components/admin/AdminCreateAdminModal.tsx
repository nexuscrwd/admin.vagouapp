import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  Shield,
} from 'lucide-react';
import { SystemAdminUser } from '../../types/admin';
import { registerAdmin } from '../../services/supabaseApi';

interface AdminCreateAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newAdmin: SystemAdminUser) => void;
}

export const AdminCreateAdminModal: React.FC<AdminCreateAdminModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
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

  if (!isOpen) return null;

  // Phone mask
  const formatPhone = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    if (raw.length <= 2) return raw;
    if (raw.length <= 7) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
  };

  // Validations
  const hasUppercase = /[A-Z]/.test(username);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(username);
  const isUsernameValid = username.length >= 4 && hasUppercase && hasSpecialChar;
  const isEmailMatching =
    email.trim().length > 0 &&
    emailConfirm.trim().length > 0 &&
    email.trim().toLowerCase() === emailConfirm.trim().toLowerCase();

  const resetForm = () => {
    setFullName('');
    setUsername('');
    setEmail('');
    setEmailConfirm('');
    setPhone('');
    setRole('superadmin');
    setPassword('');
    setPasswordConfirm('');
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Informe o Nome completo do administrador.');
      return;
    }

    if (!isUsernameValid) {
      setErrorMessage(
        'O Nome de usuário deve ter ao menos 4 caracteres, contendo ao menos UMA letra maiúscula e UM caractere especial.'
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

    if (password !== passwordConfirm) {
      setErrorMessage('A confirmação de senha não confere.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await registerAdmin({
        full_name: fullName.trim(),
        username: username.trim(),
        email: email.trim().toLowerCase(),
        email_confirmation: emailConfirm.trim().toLowerCase(),
        phone_whatsapp: phone.trim(),
        password: password,
      });

      if (res.success && res.admin) {
        setSuccessMessage('Novo administrador cadastrado com sucesso!');
        setTimeout(() => {
          onSuccess(res.admin!);
          resetForm();
          onClose();
        }, 1200);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto transition-colors">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <UserPlus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Cadastrar Novo Administrador
                </h2>
                <span className="text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20">
                  Master
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cadastro interno restrito para gestores do ecossistema Vagou
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleRegister} className="p-4 sm:p-6 space-y-4 bg-transparent">
          {/* Feedback Messages */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-700 dark:text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-700 dark:text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Nome Completo */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Nome completo *</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="ex: Carlos Eduardo Silva"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-xs dark:shadow-none transition"
            />
          </div>

          {/* Nome de Usuário */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Nome de usuário *</span>
              </label>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">(1 Maiúscula + 1 Caractere Especial)</span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ex: Carlos@Master ou Gestor#Vagou"
                required
                className={`w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:outline-none focus:ring-1 transition shadow-xs dark:shadow-none ${
                  username
                    ? isUsernameValid
                      ? 'border-emerald-500/70 focus:border-emerald-500 focus:ring-emerald-500'
                      : 'border-amber-500/70 focus:border-amber-500 focus:ring-amber-500'
                    : 'border-slate-300 dark:border-slate-800 focus:border-emerald-500 focus:ring-emerald-500'
                }`}
              />
              {username && isUsernameValid && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* Badges de validação */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition ${
                  hasUppercase
                    ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}
              >
                • Letra Maiúscula (A-Z)
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition ${
                  hasSpecialChar
                    ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}
              >
                • Caractere Especial (@, #, $, !)
              </span>
            </div>
          </div>

          {/* Grid: E-mail e Confirmação */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>E-mail institucional *</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@vagouapp.com"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-xs dark:shadow-none transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Confirmação de e-mail *</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={emailConfirm}
                  onChange={(e) => setEmailConfirm(e.target.value)}
                  placeholder="admin@vagouapp.com"
                  required
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:outline-none focus:ring-1 transition shadow-xs dark:shadow-none ${
                    emailConfirm
                      ? isEmailMatching
                        ? 'border-emerald-500/70 focus:border-emerald-500 focus:ring-emerald-500'
                        : 'border-rose-500/70 focus:border-rose-500 focus:ring-rose-500'
                      : 'border-slate-300 dark:border-slate-800 focus:border-emerald-500 focus:ring-emerald-500'
                  }`}
                />
                {emailConfirm && isEmailMatching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Grid: WhatsApp e Nível de Acesso */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Cel./whats *</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="(11) 99999-9999"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-xs dark:shadow-none transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Nível de Acesso *</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-xs dark:shadow-none transition"
              >
                <option value="superadmin">Super Administrador (Soberano)</option>
                <option value="moderator">Moderador de Salões</option>
                <option value="support">Suporte Corporativo</option>
              </select>
            </div>
          </div>

          {/* Grid: Senha e Confirmação */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Senha Master *</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-xs dark:shadow-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Confirmação de Senha *</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="Repita a senha"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-xs dark:shadow-none transition"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white text-xs font-semibold border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isLoading || !isUsernameValid || !isEmailMatching}
              className="px-5 py-2.5 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95"
            >
              {isLoading ? (
                <span>Gravando no Cluster...</span>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 text-white" />
                  <span>Concluir Cadastro</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
