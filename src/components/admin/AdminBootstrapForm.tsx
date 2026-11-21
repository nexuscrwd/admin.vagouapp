import React, { useState } from 'react';
import {
  ShieldCheck,
  User,
  UserCheck,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { SystemAdminUser } from '../../types/admin';
import { bootstrapInitialSuperAdmin } from '../../services/supabaseApi';
import { VagouOfficialLogo } from '../common/VagouOfficialLogo';
import { useTheme } from '../../context/ThemeContext';

interface AdminBootstrapFormProps {
  onSuccess: (admin: SystemAdminUser) => void;
}

const checkUsernameRules = (val: string) => {
  const clean = val.trim();
  return {
    hasUpper: /[A-Z]/.test(clean),
    hasLower: /[a-z]/.test(clean),
    hasSpecial: /[^A-Za-z0-9\s]/.test(clean),
    minLength: clean.length >= 3,
  };
};

export const AdminBootstrapForm: React.FC<AdminBootstrapFormProps> = ({ onSuccess }) => {
  const { theme } = useTheme();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phoneWhatsapp, setPhoneWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const rules = checkUsernameRules(username);
  const isUsernameValid = rules.hasUpper && rules.hasLower && rules.hasSpecial && rules.minLength;
  const isPasswordValid = password.length >= 8;
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim()) {
      setErrorMsg('Informe o nome completo.');
      return;
    }
    if (!isUsernameValid) {
      setErrorMsg('Usuário exige 1 maiúscula, 1 minúscula e 1 caractere especial.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Informe um e-mail válido.');
      return;
    }
    if (!isPasswordValid) {
      setErrorMsg('A senha deve ter no mínimo 8 caracteres.');
      return;
    }
    if (!passwordsMatch) {
      setErrorMsg('As senhas não conferem.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await bootstrapInitialSuperAdmin({
        full_name: fullName.trim(),
        username: username.trim().replace(/^@+/, ''),
        email: email.trim().toLowerCase(),
        phone_whatsapp: phoneWhatsapp.trim() || undefined,
        password,
      });

      if (!res.success || !res.admin) {
        setErrorMsg(res.error || 'Não foi possível criar o Super Admin inicial.');
        return;
      }

      onSuccess(res.admin);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao inicializar o painel.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[4px] shadow-2xl overflow-hidden">
      <div className="px-6 pt-6 pb-5 border-b border-slate-200 dark:border-slate-800 flex flex-col items-center text-center gap-2.5">
        <VagouOfficialLogo
          theme={theme === 'dark' ? 'dark' : 'light'}
          size="md"
        />
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Bootstrap Super Admin v6.0</span>
        </div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Primeiro Acesso Soberano
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-3.5">
        {errorMsg && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-[4px] bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Nome Completo
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nome do Super Admin"
              required
              className="w-full pl-9 pr-3 py-2.5 text-sm rounded-[4px] bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Usuário
          </label>
          <div className="relative">
            <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ''))}
              placeholder="Ex: Anderson@"
              required
              className="w-full pl-9 pr-3 py-2.5 text-sm rounded-[4px] bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1.5 text-[11px]">
            <span className={`inline-flex items-center gap-1 ${rules.hasUpper ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
              <CheckCircle2 className="w-3 h-3" /> 1 Maiúscula
            </span>
            <span className={`inline-flex items-center gap-1 ${rules.hasLower ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
              <CheckCircle2 className="w-3 h-3" /> 1 Minúscula
            </span>
            <span className={`inline-flex items-center gap-1 ${rules.hasSpecial ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
              <CheckCircle2 className="w-3 h-3" /> 1 Especial
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              E-mail
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@vagouapp.com"
                required
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-[4px] bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              WhatsApp (opcional)
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phoneWhatsapp}
                onChange={(e) => setPhoneWhatsapp(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-[4px] bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Senha (mín. 8)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="w-full pl-9 pr-9 py-2.5 text-sm rounded-[4px] bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                aria-label="Alternar visibilidade da senha"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Confirmar Senha
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-[4px] bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-2 py-2.5 px-4 rounded-[4px] bg-[#20C933] hover:bg-emerald-600 disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Criando Super Admin...</span>
            </>
          ) : (
            <>
              <span>Criar 1º Super Admin</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
