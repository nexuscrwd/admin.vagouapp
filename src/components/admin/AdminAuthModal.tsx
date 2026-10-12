import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import {
  AdminAuthTab,
  AdminRecoveryType,
  SystemAdminUser,
} from '../../types/admin';
import {
  loginAdmin,
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
  const [activeTab, setActiveTab] = useState<AdminAuthTab>(initialTab === 'recovery' ? 'recovery' : 'login');
  const [recoveryType, setRecoveryType] = useState<AdminRecoveryType>('password');

  // Form States - Login
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Form States - Recuperação e Redefinição de Senha
  const [recoveryQuery, setRecoveryQuery] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Status & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab === 'recovery' ? 'recovery' : 'login');
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const safeClose = () => {
    if (typeof onClose === 'function') {
      onClose();
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
      const res = await loginAdmin(loginIdentifier.trim(), loginPassword);
      if (res.success && res.admin) {
        setSuccessMessage('Acesso master autorizado com sucesso!');
        setTimeout(() => {
          onSuccess(res.admin!);
          safeClose();
        }, 500);
      } else {
        setErrorMessage(res.error || 'Credenciais inválidas. Verifique os dados informados.');
      }
    } catch {
      setErrorMessage('Erro de conexão ao autenticar.');
    } finally {
      setIsLoading(false);
    }
  };

  // SUBMIT: RECUPERAÇÃO / REDEFINIÇÃO DE SENHA
  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    if (!recoveryQuery.trim()) {
      setErrorMessage(
        recoveryType === 'access_data'
          ? 'Informe seu E-mail ou Cel./WhatsApp cadastrado.'
          : 'Informe seu Nome de usuário (@) ou E-mail corporativo.'
      );
      return;
    }

    if (recoveryType === 'password') {
      if (!newPassword || newPassword.length < 6) {
        setErrorMessage('A nova senha deve ter no mínimo 6 caracteres.');
        return;
      }
      if (newPassword !== newPasswordConfirm) {
        setErrorMessage('A confirmação de senha não confere com a nova senha digitada.');
        return;
      }
    }

    setIsLoading(true);
    try {
      const res = await recoverAdminAccess(
        recoveryType,
        recoveryQuery.trim(),
        recoveryType === 'password' ? newPassword : undefined
      );

      if (res.success) {
        setSuccessMessage(res.message || 'Solicitação processada com sucesso!');
        if (recoveryType === 'password') {
          // Preenche o campo de login com o identificador usado e volta para a tela de login
          setLoginIdentifier(res.admin_username || recoveryQuery.trim());
          setLoginPassword(newPassword);
          setTimeout(() => {
            setActiveTab('login');
            setNewPassword('');
            setNewPasswordConfirm('');
          }, 1800);
        }
      } else {
        setErrorMessage(res.error || 'Não foi possível localizar o cadastro de administrador.');
      }
    } catch {
      setErrorMessage('Erro ao processar solicitação de recuperação.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto ${
        isGate ? 'bg-slate-950' : 'bg-slate-950/80 backdrop-blur-xs animate-fadeIn'
      }`}
    >
      <div
        className={`relative w-full max-w-[400px] ${
          isGate
            ? 'bg-transparent border-0 p-0 shadow-none'
            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl'
        } overflow-hidden my-auto transition-colors`}
      >
        {/* Top Header */}
        <div
          className={`p-4 ${
            isGate
              ? 'bg-transparent border-0 pb-2'
              : 'border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80'
          } flex items-center justify-between gap-3`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                {activeTab === 'recovery'
                  ? 'Recuperação de Acesso Master'
                  : 'Painel Corporativo Soberano'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {activeTab === 'recovery'
                  ? 'Redefinição direta de credenciais'
                  : isGate
                  ? 'Autenticação Exclusiva de Administradores'
                  : 'Gestão Restrita da Plataforma'}
              </p>
            </div>
          </div>

          {!isGate && typeof onClose === 'function' && (
            <button
              type="button"
              onClick={safeClose}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition cursor-pointer"
              title="Fechar"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
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
          <form
            onSubmit={handleLoginSubmit}
            className={`${isGate ? 'p-2 sm:p-3' : 'p-4 sm:p-6'} space-y-4 bg-transparent`}
          >
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Usuário Corporativo ou E-mail
              </label>
              <div className="flex items-center bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 shadow-xs dark:shadow-none transition">
                <User className="w-4 h-4 text-slate-400 dark:text-slate-500 mr-2.5 shrink-0" />
                <input
                  type="text"
                  placeholder="Ex: Anderson@ ou nexuscrwd@gmail.com"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Senha de Acesso
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('recovery');
                    setRecoveryType('password');
                    clearFeedback();
                  }}
                  className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
                >
                  Esqueceu a senha?
                </button>
              </div>
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
                  <span>Acessar Painel Master</span>
                )}
              </button>
            </div>

            {/* Aviso de Governança Estrita: Sem formulário público de auto-cadastro */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 text-center">
                <div className="flex items-center justify-center gap-1.5 text-slate-600 dark:text-slate-300 text-xs font-semibold mb-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  <span>Acesso Restrito & Auditado</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Novos usuários administradores só podem ser cadastrados por um administrador autenticado logado no sistema.
                </p>
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: RECUPERAÇÃO / REDEFINIÇÃO DE SENHA */}
        {activeTab === 'recovery' && (
          <form
            onSubmit={handleRecoverySubmit}
            className={`${isGate ? 'p-2 sm:p-3' : 'p-4 sm:p-6'} space-y-4 bg-transparent`}
          >
            {/* Seletor: Redefinir Senha vs Consultar Usuário */}
            <div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                Qual operação deseja realizar?
              </span>
              <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryType('password');
                    clearFeedback();
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    recoveryType === 'password'
                      ? 'bg-[#20C933] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Redefinir Senha</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRecoveryType('access_data');
                    clearFeedback();
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    recoveryType === 'access_data'
                      ? 'bg-[#20C933] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Consultar Usuário</span>
                </button>
              </div>
            </div>

            {/* Identificador */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {recoveryType === 'access_data'
                  ? 'E-mail corporativo ou Cel./WhatsApp cadastrado'
                  : 'Nome de usuário (@) ou E-mail corporativo'}
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
                      ? 'nexuscrwd@gmail.com ou (11) 91353-1030'
                      : 'Anderson@ ou nexuscrwd@gmail.com'
                  }
                  value={recoveryQuery}
                  onChange={(e) => setRecoveryQuery(e.target.value)}
                  className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none"
                  required
                />
              </div>
            </div>

            {/* Campos de Nova Senha quando na aba de redefinição de senha */}
            {recoveryType === 'password' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Nova Senha de Acesso (Mínimo 6 dígitos)
                  </label>
                  <div className="flex items-center bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 shadow-xs dark:shadow-none transition">
                    <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 mr-2.5 shrink-0" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-0.5 ml-1.5 cursor-pointer"
                      title={showNewPassword ? 'Ocultar' : 'Visualizar'}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Confirmar Nova Senha
                  </label>
                  <div className="flex items-center bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 shadow-xs dark:shadow-none transition">
                    <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 mr-2.5 shrink-0" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={newPasswordConfirm}
                      onChange={(e) => setNewPasswordConfirm(e.target.value)}
                      className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none"
                      required
                    />
                  </div>
                </div>
              </>
            )}

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
                    {recoveryType === 'password'
                      ? 'Redefinir Senha e Salvar'
                      : 'Localizar Meu Cadastro'}
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
                <span>Voltar para tela de Login</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
