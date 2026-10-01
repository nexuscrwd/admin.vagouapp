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
  KeyRound,
  ArrowRight,
} from 'lucide-react';
import {
  AdminAuthTab,
  AdminRecoveryType,
  SystemAdminUser,
} from '../../types/admin';
import {
  loginAdmin,
  registerAdmin,
  recoverAdminAccess,
} from '../../services/supabaseApi';

interface AdminAuthModalProps {
  isOpen: boolean;
  initialTab?: AdminAuthTab;
  onClose?: () => void;
  onSuccess: (admin: SystemAdminUser) => void;
  isGate?: boolean;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  initialTab = 'login',
  onClose,
  onSuccess,
  isGate = false,
}) => {
  const [activeTab, setActiveTab] = useState<AdminAuthTab>(initialTab);
  const [recoveryType, setRecoveryType] = useState<AdminRecoveryType>('password');

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen, initialTab]);

  // Form States - Login
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Form States - Cadastro
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regEmailConfirm, setRegEmailConfirm] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Form States - Recuperar
  const [recoveryQuery, setRecoveryQuery] = useState('');

  // Status & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Validações de Username em tempo real
  const usernameHasUppercase = /[A-Z]/.test(regUsername);
  const usernameHasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(regUsername);
  const isUsernameValid = regUsername.length >= 4 && usernameHasUppercase && usernameHasSpecial;

  // Validação de E-mail
  const isEmailMatching =
    regEmail.length > 0 &&
    regEmailConfirm.length > 0 &&
    regEmail.trim().toLowerCase() === regEmailConfirm.trim().toLowerCase();

  // Formatador de Celular / WhatsApp
  const handlePhoneChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    if (raw.length <= 2) {
      setRegPhone(raw);
    } else if (raw.length <= 7) {
      setRegPhone(`(${raw.slice(0, 2)}) ${raw.slice(2)}`);
    } else {
      setRegPhone(`(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`);
    }
  };

  const clearFeedback = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // SUBMIT: LOGIN
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    if (!loginIdentifier.trim() || !loginPassword) {
      setErrorMessage('Preencha o Nome de usuário/E-mail e a Senha.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginAdmin(loginIdentifier, loginPassword);
      if (res.success && res.admin) {
        setSuccessMessage('Acesso autorizado com sucesso!');
        setTimeout(() => {
          onSuccess(res.admin!);
          onClose();
        }, 600);
      } else {
        setErrorMessage(res.error || 'Credenciais inválidas. Verifique os dados informados.');
      }
    } catch {
      setErrorMessage('Erro de conexão ao autenticar.');
    } finally {
      setIsLoading(false);
    }
  };

  // SUBMIT: CADASTRO
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    if (!regFullName.trim()) {
      setErrorMessage('Informe o Nome completo.');
      return;
    }

    if (!isUsernameValid) {
      setErrorMessage(
        'O Nome de usuário deve ter ao menos 4 caracteres, contendo ao menos UMA letra maiúscula e UM caractere especial.'
      );
      return;
    }

    if (!regEmail.trim() || !regEmailConfirm.trim()) {
      setErrorMessage('Preencha o E-mail e a Confirmação de e-mail.');
      return;
    }

    if (!isEmailMatching) {
      setErrorMessage('Os e-mails informados não conferem.');
      return;
    }

    if (!regPhone.trim() || regPhone.replace(/\D/g, '').length < 10) {
      setErrorMessage('Informe um número de Cel./WhatsApp válido com DDD.');
      return;
    }

    if (!regPassword || regPassword.length < 6) {
      setErrorMessage('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (regPassword !== regPasswordConfirm) {
      setErrorMessage('A confirmação de senha não confere.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await registerAdmin({
        full_name: regFullName.trim(),
        username: regUsername.trim(),
        email: regEmail.trim(),
        email_confirmation: regEmailConfirm.trim(),
        phone_whatsapp: regPhone.trim(),
        password: regPassword,
      });

      if (res.success && res.admin) {
        setSuccessMessage('Cadastro de administrador concluído com sucesso!');
        setTimeout(() => {
          onSuccess(res.admin!);
          onClose();
        }, 700);
      } else {
        setErrorMessage(res.error || 'Não foi possível concluir o cadastro.');
      }
    } catch {
      setErrorMessage('Erro de conexão ao processar cadastro.');
    } finally {
      setIsLoading(false);
    }
  };

  // SUBMIT: RECUPERAR
  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    if (!recoveryQuery.trim()) {
      setErrorMessage(
        recoveryType === 'access_data'
          ? 'Informe seu E-mail ou Cel./WhatsApp cadastrado.'
          : 'Informe seu Nome de usuário ou E-mail cadastrado.'
      );
      return;
    }

    setIsLoading(true);
    try {
      const res = await recoverAdminAccess(recoveryType, recoveryQuery.trim());
      if (res.success) {
        setSuccessMessage(res.message || 'Instruções enviadas com sucesso!');
      } else {
        setErrorMessage(res.error || 'Não foi possível localizar o cadastro.');
      }
    } catch {
      setErrorMessage('Erro ao solicitar recuperação.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto ${
        isGate ? 'bg-slate-100 dark:bg-slate-950' : 'bg-slate-950/80 backdrop-blur-xs animate-fadeIn'
      }`}
    >
      <div className="relative w-full max-w-[375px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto transition-colors">
        {/* Top Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                Painel de Acesso Corporativo
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isGate
                  ? 'Autenticação Master'
                  : 'Gestão Soberana de Administradores'}
              </p>
            </div>
          </div>

          {!isGate && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition cursor-pointer"
              title="Fechar Modal"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tab Navigation: Apenas uma aba de Acesso */}
        <div className="p-1.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
          {activeTab === 'login' ? (
            <div className="w-full py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 bg-[#20C933] text-white shadow-xs">
              <Lock className="w-3.5 h-3.5 text-white" />
              <span>Acesso</span>
            </div>
          ) : (
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                {activeTab === 'register' ? (
                  <>
                    <User className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Cadastro</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Recuperar Senha</span>
                  </>
                )}
              </span>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  clearFeedback();
                }}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer flex items-center gap-1"
              >
                <ArrowRight className="w-3 h-3 rotate-180" />
                <span>Voltar ao Acesso</span>
              </button>
            </div>
          )}
        </div>

        {/* Feedback Alert */}
        {errorMessage && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-200 text-xs flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {successMessage && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-200 text-xs flex items-start gap-2.5 animate-fadeIn font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{successMessage}</div>
          </div>
        )}

        {/* TAB 1: ACESSO (LOGIN) */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="p-4 sm:p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                E-mail Corporativo (Supabase Auth)
              </label>
              <div className="flex items-center bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 shadow-xs dark:shadow-none transition">
                <User className="w-4 h-4 text-slate-400 dark:text-slate-500 mr-2.5 shrink-0" />
                <input
                  type="email"
                  placeholder="nexuscrwd@gmail.com"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Senha de Acesso
              </label>
              <div className="flex items-center bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 shadow-xs dark:shadow-none transition">
                <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 mr-2.5 shrink-0" />
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-0.5 ml-1.5 cursor-pointer"
                  title={showLoginPassword ? 'Ocultar' : 'Visualizar'}
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Acessar</span>
                )}
              </button>
            </div>

            {/* Links ao pé da aba de acesso */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5 text-center text-xs">
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('recovery');
                    setRecoveryType('password');
                    clearFeedback();
                  }}
                  className="text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition cursor-pointer hover:underline"
                >
                  Esqueceu sua senha? <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Recuperar senha</span>
                </button>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    clearFeedback();
                  }}
                  className="text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition cursor-pointer hover:underline"
                >
                  Ainda não tem acesso? <span className="text-emerald-600 dark:text-emerald-400 font-bold">Cadastre-se</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: CADASTRO */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="p-4 sm:p-6 space-y-3.5 max-h-[75vh] overflow-y-auto">
            {/* Nome Completo */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nome completo <span className="text-emerald-600 dark:text-emerald-400">*</span>
              </label>
              <div className="flex items-center bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 shadow-xs dark:shadow-none transition">
                <User className="w-4 h-4 text-slate-400 dark:text-slate-500 mr-2.5 shrink-0" />
                <input
                  type="text"
                  placeholder="Ex: Carlos Eduardo de Oliveira"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none"
                  required
                />
              </div>
            </div>

            {/* Nome de Usuário com Regra Estrita */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nome de usuário <span className="text-emerald-600 dark:text-emerald-400">*</span>
                </label>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  (1 Maiúscula + 1 Caractere Especial)
                </span>
              </div>
              <div
                className={`flex items-center bg-white dark:bg-slate-950 border rounded-xl px-3.5 py-2 transition shadow-xs dark:shadow-none ${
                  regUsername.length === 0
                    ? 'border-slate-300 dark:border-slate-800 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500'
                    : isUsernameValid
                    ? 'border-emerald-500/80 bg-emerald-50/50 dark:bg-emerald-950/10'
                    : 'border-amber-500/80'
                }`}
              >
                <span className="text-xs text-slate-400 dark:text-slate-500 font-mono mr-1.5 select-none">@</span>
                <input
                  type="text"
                  placeholder="Ex: Carlos@Admin ou Gestor#Master"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value.replace(/\s+/g, ''))}
                  className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none font-mono"
                  required
                />
                {regUsername.length > 0 && (
                  <span className="ml-2 shrink-0">
                    {isUsernameValid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                    )}
                  </span>
                )}
              </div>

              {/* Guia de Validação do Username */}
              <div className="mt-1.5 flex flex-wrap gap-2 text-[10px]">
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${
                    usernameHasUppercase
                      ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span className={`w-1 h-1 rounded-full ${usernameHasUppercase ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-slate-400 dark:bg-slate-500'}`} />
                  Letra Maiúscula (A-Z)
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${
                    usernameHasSpecial
                      ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span className={`w-1 h-1 rounded-full ${usernameHasSpecial ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-slate-400 dark:bg-slate-500'}`} />
                  Caractere Especial (@, #, $, !)
                </span>
              </div>
            </div>

            {/* E-mail e Confirmação */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  E-mail institucional <span className="text-emerald-600 dark:text-emerald-400">*</span>
                </label>
                <div className="flex items-center bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 shadow-xs dark:shadow-none transition">
                  <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 mr-2 shrink-0" />
                  <input
                    type="email"
                    placeholder="admin@vagouapp.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Confirmação de e-mail <span className="text-emerald-600 dark:text-emerald-400">*</span>
                </label>
                <div
                  className={`flex items-center bg-white dark:bg-slate-950 border rounded-xl px-3 py-2 transition shadow-xs dark:shadow-none ${
                    regEmailConfirm.length === 0
                      ? 'border-slate-300 dark:border-slate-800 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500'
                      : isEmailMatching
                      ? 'border-emerald-500/80 bg-emerald-50/50 dark:bg-emerald-950/10'
                      : 'border-rose-500/80'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 mr-2 shrink-0" />
                  <input
                    type="email"
                    placeholder="Repita o e-mail"
                    value={regEmailConfirm}
                    onChange={(e) => setRegEmailConfirm(e.target.value)}
                    className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none"
                    required
                  />
                  {regEmailConfirm.length > 0 && isEmailMatching && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ml-1.5 shrink-0" />
                  )}
                </div>
              </div>
            </div>

            {/* Cel./Whats */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Cel./whats <span className="text-emerald-600 dark:text-emerald-400">*</span>
              </label>
              <div className="flex items-center bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 shadow-xs dark:shadow-none transition">
                <Phone className="w-4 h-4 text-slate-400 dark:text-slate-500 mr-2.5 shrink-0" />
                <input
                  type="text"
                  placeholder="(11) 99999-9999"
                  value={regPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none font-mono"
                  required
                />
              </div>
            </div>

            {/* Senha e Confirmação de Senha */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Senha Master <span className="text-emerald-600 dark:text-emerald-400">*</span>
                </label>
                <div className="flex items-center bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 shadow-xs dark:shadow-none transition">
                  <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 mr-2 shrink-0" />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 dígitos"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-0.5 ml-1 cursor-pointer"
                  >
                    {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Confirmação de Senha <span className="text-emerald-600 dark:text-emerald-400">*</span>
                </label>
                <div className="flex items-center bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 shadow-xs dark:shadow-none transition">
                  <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 mr-2 shrink-0" />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    placeholder="Repita a senha"
                    value={regPasswordConfirm}
                    onChange={(e) => setRegPasswordConfirm(e.target.value)}
                    className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Botão de Conclusão */}
            <div className="pt-2 sticky bottom-0 bg-white dark:bg-slate-900 z-10 space-y-3">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Concluir Cadastro</span>
                  </>
                )}
              </button>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-center text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    clearFeedback();
                  }}
                  className="text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition cursor-pointer hover:underline"
                >
                  Já possui acesso corporativo? <span className="text-emerald-600 dark:text-emerald-400 font-bold">Fazer Login</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 3: RECUPERAR */}
        {activeTab === 'recovery' && (
          <form onSubmit={handleRecoverySubmit} className="p-4 sm:p-6 space-y-4">
            {/* Sub-selector: Dados de acesso vs Senha */}
            <div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                O que você precisa recuperar?
              </span>
              <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryType('access_data');
                    clearFeedback();
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    recoveryType === 'access_data'
                      ? 'bg-[#20C933] text-white font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Dados de acesso</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRecoveryType('password');
                    clearFeedback();
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    recoveryType === 'password'
                      ? 'bg-[#20C933] text-white font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Senha</span>
                </button>
              </div>
            </div>

            {/* Input dinâmico */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {recoveryType === 'access_data'
                  ? 'E-mail cadastrado ou Cel./WhatsApp'
                  : 'Nome de usuário ou E-mail cadastrado'}
              </label>
              <div className="flex items-center bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 shadow-xs dark:shadow-none transition">
                {recoveryType === 'access_data' ? (
                  <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 mr-2.5 shrink-0" />
                ) : (
                  <User className="w-4 h-4 text-slate-400 dark:text-slate-500 mr-2.5 shrink-0" />
                )}
                <input
                  type="text"
                  placeholder={
                    recoveryType === 'access_data'
                      ? 'admin@vagouapp.com ou (11) 99999-9999'
                      : 'AdminMaster@Vagou ou admin@vagouapp.com'
                  }
                  value={recoveryQuery}
                  onChange={(e) => setRecoveryQuery(e.target.value)}
                  className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none"
                  required
                />
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                {recoveryType === 'access_data'
                  ? 'Enviaremos seu nome de usuário e orientações de acesso.'
                  : 'Enviaremos um link de segurança para redefinir sua senha.'}
              </span>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>
                    {recoveryType === 'access_data'
                      ? 'Recuperar Dados de Acesso'
                      : 'Enviar Link de Redefinição'}
                  </span>
                )}
              </button>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  clearFeedback();
                }}
                className="text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold transition cursor-pointer flex items-center gap-1.5"
              >
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                <span>Voltar para tela de Acesso</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
