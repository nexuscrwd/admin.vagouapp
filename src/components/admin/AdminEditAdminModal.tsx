import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ShieldCheck,
  User,
  Mail,
  Phone,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Shield,
  Save,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { SystemAdminUser } from '../../types/admin';
import { updateAdminUser } from '../../services/supabaseApi';

interface AdminEditAdminModalProps {
  isOpen: boolean;
  admin: SystemAdminUser | null;
  onClose: () => void;
  onSuccess: (updatedAdmin: SystemAdminUser) => void;
}

export const AdminEditAdminModal: React.FC<AdminEditAdminModalProps> = ({
  isOpen,
  admin,
  onClose,
  onSuccess,
}) => {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'superadmin' | 'moderator' | 'support'>('superadmin');
  const [isActive, setIsActive] = useState(true);

  // Campos de Senha para CRUD de Senhas (Visível por padrão para o Superadmin)
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (admin) {
      setFullName(admin.full_name || '');
      // Se o username no banco vier com @ no início, remove para exibição/edição limpa
      const cleanUser = (admin.username || '').replace(/^@+/, '');
      setUsername(cleanUser);
      setEmail(admin.email || '');
      setPhone(admin.phone_whatsapp || '');
      setRole(admin.role || 'superadmin');
      setIsActive(admin.is_active ?? true);
      const currentPass = admin.password || 'Admin@2026!';
      setNewPassword(currentPass);
      setConfirmPassword(currentPass);
      setShowPassword(true);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [admin]);

  if (!isOpen || !admin) return null;

  // Phone mask
  const formatPhone = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    if (raw.length <= 2) return raw;
    if (raw.length <= 7) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
  };

  // Sanitização e Validação do Nome de Usuário
  const cleanUsername = username.replace(/^@+/, '');
  const hasUppercase = /[A-Z]/.test(cleanUsername);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(cleanUsername);
  const isUsernameValid = cleanUsername.length >= 3 && hasUppercase && hasSpecialChar;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Informe o Nome completo do administrador.');
      return;
    }

    if (!isUsernameValid) {
      setErrorMessage(
        'O Nome de usuário deve ter ao menos 3 caracteres, com ao menos UMA letra maiúscula e UM caractere especial (Ex: Anderson@, jOse#, pauLa**).'
      );
      return;
    }

    if (!email.trim()) {
      setErrorMessage('Informe o E-mail.');
      return;
    }

    // Se informou nova senha, valida
    if (newPassword || confirmPassword) {
      if (newPassword.length < 6) {
        setErrorMessage('A nova senha deve conter no mínimo 6 caracteres.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage('A confirmação da nova senha não confere.');
        return;
      }
    }

    setIsLoading(true);

    const payload: Partial<SystemAdminUser> & { password?: string } = {
      full_name: fullName.trim(),
      username: cleanUsername,
      email: email.trim().toLowerCase(),
      phone_whatsapp: phone.trim(),
      role,
      is_active: isActive,
    };

    if (newPassword) {
      payload.password = newPassword;
    }

    try {
      const res = await updateAdminUser(admin.id, payload);
      if (res.success) {
        const updatedObj: SystemAdminUser = res.admin || {
          ...admin,
          full_name: payload.full_name!,
          username: payload.username!,
          email: payload.email!,
          phone_whatsapp: payload.phone_whatsapp!,
          role: payload.role!,
          is_active: payload.is_active!,
          password: newPassword || admin.password,
        };
        setSuccessMessage('Dados e senha do administrador salvos com sucesso no Supabase!');
        setTimeout(() => {
          onSuccess(updatedObj);
          onClose();
        }, 1200);
      } else {
        setErrorMessage(res.error || 'Erro ao atualizar dados do administrador no Supabase.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro inesperado ao salvar alterações no Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col h-auto max-h-[88vh] my-auto transition-all">
        {/* Modal Header */}
        <div className="shrink-0 flex items-center justify-between p-3.5 px-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Editar Administrador
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                ID: {admin.id.slice(0, 8)}... • {admin.username.replace(/^@+/, '')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs min-h-0">
            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 flex items-start gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 flex items-center gap-2 animate-fadeIn font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Nome Completo & Nome de Usuário */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-7 space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Nome Completo *</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Carlos Eduardo Silva"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="sm:col-span-5 space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Usuário *</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/^@+/, ''))}
                  placeholder="Anderson@"
                  required
                  className={`w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border text-slate-900 dark:text-white font-mono focus:outline-none transition ${
                    cleanUsername
                      ? isUsernameValid
                        ? 'border-emerald-500 focus:border-emerald-500'
                        : 'border-amber-500 focus:border-amber-500'
                      : 'border-slate-200 dark:border-slate-800 focus:border-emerald-500'
                  }`}
                />
              </div>
            </div>

            {/* Validação visual do Username */}
            <div className="flex flex-wrap items-center gap-1.5 -mt-1">
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition ${
                  hasUppercase
                    ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}
              >
                • 1 Maiúscula (A-Z)
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition ${
                  hasSpecialChar
                    ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}
              >
                • 1 Caractere Especial (@, #, $, !)
              </span>
            </div>

            {/* E-mail e Telefone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>E-mail Corporativo *</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ex: admin@vagouapp.com"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>WhatsApp *</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="(11) 98765-4321"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Nível de Acesso & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-purple-500" />
                  <span>Nível de Acesso</span>
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="superadmin">Super Administrador (Acesso Total)</option>
                  <option value="moderator">Moderador (Aprovação de Salões)</option>
                  <option value="support">Suporte (Atendimento)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Status da Conta</span>
                </label>
                <select
                  value={isActive ? 'true' : 'false'}
                  onChange={(e) => setIsActive(e.target.value === 'true')}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="true">Ativo (Acesso Liberado)</option>
                  <option value="false">Inativo (Bloqueado)</option>
                </select>
              </div>
            </div>

            {/* 🔐 SEÇÃO DE SENHA DO ADMINISTRADOR */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="font-bold text-slate-900 dark:text-white text-xs">
                    Senha do Administrador
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <span>Senha Cadastrada (Texto Legível) *</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setConfirmPassword(e.target.value);
                      }}
                      placeholder="Mínimo 6 caracteres"
                      required
                      className="w-full pl-3 pr-9 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                      title={showPassword ? 'Ocultar Senha' : 'Exibir Senha Em Texto Legível'}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <span>Confirmar Senha *</span>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    required
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Fixed Modal Footer */}
          <div className="shrink-0 p-4 px-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !isUsernameValid}
              className="px-5 py-2 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold transition flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-white" />
              <span>{isLoading ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
