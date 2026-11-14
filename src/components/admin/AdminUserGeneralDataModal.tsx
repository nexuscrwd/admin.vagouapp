import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  User,
  UserCheck,
  FileText,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Layers,
  Shield,
  Mail,
  MapPin,
  Home,
  Building,
  Users,
  Calendar,
  CheckCircle2,
  Ban,
  Trash2,
  Save,
  Search,
  Camera,
  Upload,
  RefreshCw,
  KeyRound,
  HelpCircle,
  RotateCcw,
  Clock,
} from 'lucide-react';
import { UnifiedUserRow } from './AdminUsersManager';
import { GoogleAddressPinPicker } from './GoogleAddressPinPicker';
import { UserAvatar } from '../common/UserAvatar';
import { resetUserSecurityAdmin } from '../../services/supabaseApi';
import { formatCreatedAtParts } from '../../utils/dateTimeFormat';

export interface AdminUserGeneralDataModalProps {
  user: UnifiedUserRow;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedUser: UnifiedUserRow) => Promise<void> | void;
  onToggleStatus: (kind: string, id: string, nextStatus: boolean) => Promise<void> | void;
  onDelete: (kind: string, id: string) => Promise<void> | void;
  onSecurityReset?: () => void;
}

export const AdminUserGeneralDataModal: React.FC<AdminUserGeneralDataModalProps> = ({
  user,
  isOpen,
  onClose,
  onSave,
  onToggleStatus,
  onDelete,
  onSecurityReset,
}) => {
  // Form state
  const [name, setName] = useState(user.name || '');
  const [username, setUsername] = useState((user.username || '').replace(/^@+/, ''));
  const [cpf, setCpf] = useState(user.cpf || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [phoneSecondary, setPhoneSecondary] = useState(user.phoneSecondary || '');
  const [email, setEmail] = useState(user.email || '');
  const [password, setPassword] = useState(user.password || '');
  const [showPassword, setShowPassword] = useState(false);

  const [kind, setKind] = useState<'client' | 'professional' | 'salon_user' | 'admin' | 'dependent'>(user.kind);
  const [accessLevel, setAccessLevel] = useState(user.accessLevel || 'Cliente Titular');

  const [address, setAddress] = useState(user.address || '');
  const [streetNumber, setStreetNumber] = useState(user.streetNumber || '');
  const [complement, setComplement] = useState(user.complement || '');
  const [neighborhood, setNeighborhood] = useState(user.neighborhood || '');
  const [city, setCity] = useState(user.city || 'São Paulo');
  const [stateUf, setStateUf] = useState(user.state || 'SP');
  const [cep, setCep] = useState(user.cep || '');
  const [latitude, setLatitude] = useState<number | null>(user.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(user.longitude ?? null);

  const [dependentsCount, setDependentsCount] = useState<number>(user.dependentsCount || 0);
  const [appointmentsCount, setAppointmentsCount] = useState<number>(user.appointmentsCount || 0);
  const [isActive, setIsActive] = useState<boolean>(user.isActive);

  const [hasSecurityQuestion, setHasSecurityQuestion] = useState<boolean>(Boolean(user.hasSecurityQuestion));
  const [securityCodes, setSecurityCodes] = useState<string[]>(user.securityQuestionsConfigured || []);
  const [supportNewPassword, setSupportNewPassword] = useState('');
  const [isResettingSecurity, setIsResettingSecurity] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Avatar state & upload
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Manipulador de upload de avatar (Câmera ou Galeria do Usuário)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFeedbackMsg({ text: 'Selecione uma imagem válida (PNG, JPG, WebP).', type: 'error' });
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      setFeedbackMsg({ text: 'A imagem deve ter no máximo 12 MB.', type: 'error' });
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        if (!base64) {
          setIsUploadingAvatar(false);
          return;
        }

        const img = new window.Image();
        img.onload = async () => {
          const maxDim = 1000;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.88);

            try {
              const res = await fetch('/api/admin/upload-avatar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  imageBase64: optimizedBase64,
                  prefix: `usr-${user.originalId}`,
                  userId: user.originalId,
                  kind,
                }),
              });
              const json = await res.json();
              if (res.ok && json.success && json.url) {
                setAvatarUrl(json.url);
                setFeedbackMsg({ text: 'Foto enviada e salva no Supabase Storage com sucesso!', type: 'success' });
                setTimeout(() => setFeedbackMsg(null), 3500);
              } else {
                setAvatarUrl(optimizedBase64);
                setFeedbackMsg({ text: 'Foto anexada com sucesso.', type: 'success' });
                setTimeout(() => setFeedbackMsg(null), 3000);
              }
            } catch {
              setAvatarUrl(optimizedBase64);
              setFeedbackMsg({ text: 'Foto carregada localmente.', type: 'success' });
              setTimeout(() => setFeedbackMsg(null), 3000);
            }
          }
          setIsUploadingAvatar(false);
        };
        img.src = base64;
      };
      reader.readAsDataURL(file);
    } catch {
      setIsUploadingAvatar(false);
      setFeedbackMsg({ text: 'Falha ao processar arquivo.', type: 'error' });
    }
  };

  // Trava a rolagem da página quando o modal estiver aberto
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Sincroniza estado com o usuário selecionado
  useEffect(() => {
    setName(user.name || '');
    setUsername((user.username || '').replace(/^@+/, ''));
    setCpf(user.cpf || '');
    setPhone(user.phone === '—' ? '' : user.phone || '');
    setPhoneSecondary(user.phoneSecondary === '—' ? '' : user.phoneSecondary || '');
    setEmail(user.email === '—' ? '' : user.email || '');
    setPassword(user.password || '');
    setKind(user.kind);
    setAccessLevel(user.accessLevel || getDefaultAccessLevel(user.kind));
    setAddress(user.address || '');
    setStreetNumber(user.streetNumber || '');
    setComplement(user.complement || '');
    setNeighborhood(user.neighborhood || '');
    setCity(user.city || 'São Paulo');
    setStateUf(user.state || 'SP');
    setCep(user.cep || '');
    setLatitude(user.latitude ?? null);
    setLongitude(user.longitude ?? null);
    setDependentsCount(Number(user.dependentsCount) || 0);
    setAppointmentsCount(Number(user.appointmentsCount) || 0);
    setIsActive(user.isActive);
    setAvatarUrl(user.avatarUrl || '');
    setHasSecurityQuestion(Boolean(user.hasSecurityQuestion));
    setSecurityCodes(user.securityQuestionsConfigured || []);
    setSupportNewPassword('');
    setConfirmingDelete(false);
    setFeedbackMsg(null);
  }, [user]);

  function getDefaultAccessLevel(
    targetKind: 'client' | 'professional' | 'salon_user' | 'admin' | 'dependent'
  ): string {
    switch (targetKind) {
      case 'client':
        return 'Cliente Titular';
      case 'dependent':
        return 'Dependente Familiar';
      case 'professional':
        return 'MEI Parceiro';
      case 'salon_user':
        return 'Proprietário (Dono)';
      case 'admin':
        return 'Superadmin Master';
    }
  }

  // Ao alterar o Tipo, atualiza as opções coerentes de Nível de Acesso
  const handleKindChange = (
    newKind: 'client' | 'professional' | 'salon_user' | 'admin' | 'dependent'
  ) => {
    setKind(newKind);
    setAccessLevel(getDefaultAccessLevel(newKind));
  };

  // Consulta e auto-completar de CEP via ViaCEP
  const handleLookupCep = async () => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      setFeedbackMsg({ text: 'Digite um CEP válido com 8 dígitos.', type: 'error' });
      setTimeout(() => setFeedbackMsg(null), 3000);
      return;
    }

    setIsSearchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        if (data.logradouro) setAddress(data.logradouro);
        if (data.bairro) setNeighborhood(data.bairro);
        if (data.localidade) setCity(data.localidade);
        if (data.uf) setStateUf(data.uf);
        setFeedbackMsg({ text: 'Endereço localizado via CEP com sucesso.', type: 'success' });
        setTimeout(() => setFeedbackMsg(null), 3000);
      } else {
        setFeedbackMsg({ text: 'CEP não encontrado na base dos Correios.', type: 'error' });
        setTimeout(() => setFeedbackMsg(null), 3000);
      }
    } catch {
      setFeedbackMsg({ text: 'Erro ao consultar serviço de CEP.', type: 'error' });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } finally {
      setIsSearchingCep(false);
    }
  };

  // Salvar formulário
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFeedbackMsg({ text: 'O nome completo é obrigatório.', type: 'error' });
      return;
    }

    setIsSaving(true);
    try {
      const roleLabel =
        kind === 'client'
          ? 'Cliente'
          : kind === 'dependent'
          ? 'Dependente'
          : kind === 'professional'
          ? 'Profissional'
          : kind === 'salon_user'
          ? 'Gestor / Salão'
          : 'Administrador';

      const roleBadgeClass =
        kind === 'client'
          ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 font-bold'
          : kind === 'dependent'
          ? 'bg-teal-50 dark:bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-500/30 font-bold'
          : kind === 'professional'
          ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30 font-bold'
          : kind === 'salon_user'
          ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30 font-bold'
          : 'bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/30 font-bold';

      const cleanUser = username.trim().replace(/^@+/, '');
      const finalUsername = cleanUser || name.toLowerCase().replace(/\s+/g, '');

      const updatedRow: UnifiedUserRow = {
        ...user,
        name: name.trim(),
        username: finalUsername,
        cpf: cpf.trim(),
        phone: phone.trim() || '—',
        phoneSecondary: phoneSecondary.trim() || phone.trim() || '—',
        email: email.trim() || '—',
        password,
        kind,
        roleLabel,
        roleBadgeClass,
        accessLevel,
        address: address.trim(),
        streetNumber: streetNumber.trim(),
        complement: complement.trim(),
        neighborhood: neighborhood.trim(),
        city: city.trim(),
        state: stateUf.trim(),
        cep: cep.trim(),
        latitude,
        longitude,
        dependentsCount: Number(dependentsCount) || 0,
        appointmentsCount: Number(appointmentsCount) || 0,
        isActive,
        statusLabel: isActive ? 'Ativo' : 'Inativo',
        avatarUrl: avatarUrl.trim() || undefined,
      };

      await onSave(updatedRow);
      setFeedbackMsg({ text: 'Dados atualizados com sucesso!', type: 'success' });
      setTimeout(() => {
        onClose();
      }, 700);
    } catch {
      setFeedbackMsg({ text: 'Falha ao salvar dados.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // Alternar status
  const handleToggleCurrentStatus = async () => {
    const next = !isActive;
    setIsActive(next);
    await onToggleStatus(kind, user.originalId, next);
    setFeedbackMsg({
      text: `Status alterado para ${next ? 'Ativo' : 'Inativo'}.`,
      type: 'success',
    });
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  // Excluir usuário (confirmação em 2 toques sem window.confirm)
  const handleDeleteUser = async () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      setTimeout(() => setConfirmingDelete(false), 4000);
      return;
    }

    try {
      await onDelete(kind, user.originalId);
      onClose();
    } catch {
      setFeedbackMsg({ text: 'Erro ao excluir usuário.', type: 'error' });
    }
  };

  // Reset administrativo de Pergunta Secreta (user_security_answers + clients)
  const handleResetSecurityQuestion = async () => {
    setIsResettingSecurity(true);
    try {
      const res = await resetUserSecurityAdmin(kind, user.originalId, {
        resetSecurityQuestion: true,
      });
      if (res.success) {
        setHasSecurityQuestion(false);
        setSecurityCodes([]);
        setFeedbackMsg({
          text: res.message || 'Pergunta secreta limpa. O usuário poderá cadastrar nova pergunta no próximo acesso.',
          type: 'success',
        });
        onSecurityReset?.();
      } else {
        setFeedbackMsg({ text: res.error || 'Falha ao resetar pergunta secreta.', type: 'error' });
      }
    } catch {
      setFeedbackMsg({ text: 'Erro de conexão ao resetar pergunta secreta.', type: 'error' });
    } finally {
      setIsResettingSecurity(false);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  // Reset administrativo direto de Senha
  const handleSupportPasswordReset = async () => {
    const cleanPass = supportNewPassword.trim();
    if (cleanPass.length < 4) {
      setFeedbackMsg({ text: 'Informe uma nova senha com pelo menos 4 caracteres.', type: 'error' });
      setTimeout(() => setFeedbackMsg(null), 3000);
      return;
    }
    setIsResettingSecurity(true);
    try {
      const res = await resetUserSecurityAdmin(kind, user.originalId, {
        newPassword: cleanPass,
      });
      if (res.success) {
        setPassword(cleanPass);
        setSupportNewPassword('');
        setFeedbackMsg({
          text: res.message || 'Nova senha gravada no Auth e tabela relacional com sucesso.',
          type: 'success',
        });
        onSecurityReset?.();
      } else {
        setFeedbackMsg({ text: res.error || 'Falha ao redefinir senha.', type: 'error' });
      }
    } catch {
      setFeedbackMsg({ text: 'Erro de conexão ao redefinir senha.', type: 'error' });
    } finally {
      setIsResettingSecurity(false);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  const formatQuestionCodeLabel = (code: string): string => {
    if (code === 'first_pet') return '1º Pet';
    if (code === 'city_at_10') return 'Cidade aos 10 anos';
    if (code === 'childhood_friend') return 'Amigo de Infância';
    return code;
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-hidden"
      onClick={onClose}
    >
      {/* 
        Container do Modal:
        - Altura estrita: h-[90vh] max-h-[90vh]
        - Flexbox com isolamento completo de rolagem
        - A rolagem NÃO passa por trás dos botões do rodapé
      */}
      <div
        className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scaleIn text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* CABEÇALHO DO MODAL (ESTÁTICO NO TOPO) */}
        <div className="shrink-0 p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/90 select-none">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative group shrink-0">
              <UserAvatar photoUrl={avatarUrl || user.avatarUrl} name={name || user.name} size="md" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-[#20C933] text-white shadow hover:bg-[#1bb32d] transition cursor-pointer"
                title="Alterar foto de perfil"
              >
                {isUploadingAvatar ? (
                  <RefreshCw className="w-2.5 h-2.5 animate-spin text-white" />
                ) : (
                  <Camera className="w-2.5 h-2.5 text-white" />
                )}
              </button>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight truncate">
                  Dados Gerais do Usuário
                </h2>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase shrink-0 ${user.roleBadgeClass}`}>
                  {user.roleLabel}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                ID: {user.originalId} • {username || user.name}
              </p>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono truncate flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3 shrink-0" />
                <span>
                  Criado em: {formatCreatedAtParts(user.createdAt).valid ? formatCreatedAtParts(user.createdAt).fullLabel : '—'} • {user.originLabel}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* FEEDBACK BANNER (CASO EXISTA) */}
        {feedbackMsg && (
          <div
            className={`px-4 py-2 text-xs font-semibold flex items-center gap-2 shrink-0 ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-b border-emerald-200 dark:border-emerald-500/30'
                : 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border-b border-rose-200 dark:border-rose-500/30'
            }`}
          >
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Ban className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* FORMULÁRIO PRINCIPAL */}
        <form onSubmit={handleSave} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* CORPO ROLANTE */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4 text-xs bg-white dark:bg-slate-900">
            {/* SEÇÃO 1: Identificação & Autenticação */}
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Identificação & Acesso</span>
              </h3>

              {/* Card de Foto do Usuário / Avatar */}
              <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 mb-3">
                <div className="relative group shrink-0">
                  <UserAvatar photoUrl={avatarUrl} name={name} size="xl" />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="absolute -bottom-1 -right-1 p-1 rounded-lg bg-[#20C933] text-white shadow-md hover:bg-[#1bb32d] transition cursor-pointer"
                    title="Carregar foto ou tirar da câmera"
                  >
                    {isUploadingAvatar ? (
                      <RefreshCw className="w-3 h-3 animate-spin text-white" />
                    ) : (
                      <Camera className="w-3 h-3 text-white" />
                    )}
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                      Foto de Perfil (Avatar)
                    </span>
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setAvatarUrl('')}
                        className="text-[10px] text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 font-semibold flex items-center gap-1 cursor-pointer transition"
                        title="Remover foto e restaurar ícone canônico"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remover</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {avatarUrl ? 'Foto real salva no Supabase Storage.' : 'Sem foto real. Renderizando ícone User canônico.'}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Upload className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span>{isUploadingAvatar ? 'Enviando...' : 'Carregar Foto'}</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                {/* 1. Nome Completo */}
                <div className="sm:col-span-7">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nome Completo <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 focus-within:border-emerald-500 transition">
                    <User className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nome e Sobrenome"
                      className="bg-transparent text-xs text-slate-900 dark:text-white outline-none w-full"
                    />
                  </div>
                </div>

                {/* 2. Nome de Usuário */}
                <div className="sm:col-span-5">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Usuário
                  </label>
                  <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 focus-within:border-emerald-500 transition">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
                    <input
                      type="text"
                      value={username.replace(/^@+/, '')}
                      onChange={(e) => setUsername(e.target.value.replace(/^@+/, ''))}
                      placeholder="usuario.login"
                      className="bg-transparent text-xs text-slate-900 dark:text-white outline-none w-full font-mono"
                    />
                  </div>
                </div>

                {/* 3. CPF Pessoal (Opcional - Obrigatório apenas após integração com Gateway de Pagamento) */}
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    CPF Pessoal <span className="text-slate-400 font-normal text-[10px]">(Opcional)</span>
                  </label>
                  <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 focus-within:border-emerald-500 transition">
                    <FileText className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
                    <input
                      type="text"
                      value={cpf}
                      onChange={(e) => {
                        const d = e.target.value.replace(/\D/g, '').slice(0, 11);
                        const fmt = d
                          .replace(/(\d{3})(\d)/, '$1.$2')
                          .replace(/(\d{3})(\d)/, '$1.$2')
                          .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                        setCpf(fmt);
                      }}
                      maxLength={14}
                      placeholder="000.000.000-00"
                      className="bg-transparent text-xs text-slate-900 dark:text-white outline-none w-full font-mono"
                    />
                  </div>
                </div>

                {/* 4. WhatsApp (Principal) */}
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    WhatsApp <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 focus-within:border-emerald-500 transition">
                    <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mr-1.5 shrink-0" />
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="bg-transparent text-xs text-slate-900 dark:text-white outline-none w-full font-mono"
                    />
                  </div>
                </div>

                {/* 5. WhatsApp (Secundário) */}
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    WhatsApp 2
                  </label>
                  <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 focus-within:border-emerald-500 transition">
                    <Phone className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
                    <input
                      type="text"
                      value={phoneSecondary}
                      onChange={(e) => setPhoneSecondary(e.target.value)}
                      placeholder="(11) 98888-8888"
                      className="bg-transparent text-xs text-slate-900 dark:text-white outline-none w-full font-mono"
                    />
                  </div>
                </div>

                {/* 6. E-mail */}
                <div className="sm:col-span-7">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    E-mail <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 focus-within:border-emerald-500 transition">
                    <Mail className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="usuario@email.com"
                      className="bg-transparent text-xs text-slate-900 dark:text-white outline-none w-full"
                    />
                  </div>
                </div>

                {/* 7. Senha */}
                <div className="sm:col-span-5">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Senha de Acesso
                  </label>
                  <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 focus-within:border-emerald-500 transition">
                    <Lock className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Senha"
                      className="bg-transparent text-xs text-slate-900 dark:text-white outline-none w-full font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition ml-1"
                      title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* 8. Tipo (Lista Suspensa Editável) */}
                <div className="sm:col-span-6">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tipo de Conta
                  </label>
                  <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 focus-within:border-emerald-500 transition">
                    <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mr-1.5 shrink-0" />
                    <select
                      value={kind}
                      onChange={(e) =>
                        handleKindChange(
                          e.target.value as 'client' | 'professional' | 'salon_user' | 'admin' | 'dependent'
                        )
                      }
                      className="bg-transparent text-xs font-semibold text-slate-900 dark:text-white outline-none w-full cursor-pointer"
                    >
                      <option value="client" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                        Cliente do Portal
                      </option>
                      <option value="dependent" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                        Dependente Familiar
                      </option>
                      <option value="professional" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                        Profissional da Rede
                      </option>
                      <option value="salon_user" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                        Gestor / Salão (Parceiro)
                      </option>
                      <option value="admin" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                        Administrador Master
                      </option>
                    </select>
                  </div>
                </div>

                {/* 9. Nível de Acesso */}
                <div className="sm:col-span-6">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nível de Acesso
                  </label>
                  <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 focus-within:border-emerald-500 transition">
                    <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mr-1.5 shrink-0" />
                    <select
                      value={accessLevel}
                      onChange={(e) => setAccessLevel(e.target.value)}
                      className="bg-transparent text-xs font-semibold text-slate-900 dark:text-white outline-none w-full cursor-pointer"
                    >
                      {(kind === 'client' || kind === 'dependent') && (
                        <>
                          <option value="Cliente Titular" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                            Cliente Titular
                          </option>
                          <option value="Dependente Familiar" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                            Dependente Familiar
                          </option>
                          <option value="Cliente VIP" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                            Cliente VIP
                          </option>
                        </>
                      )}
                      {kind === 'professional' && (
                        <>
                          <option value="MEI Parceiro" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                            MEI Parceiro
                          </option>
                          <option value="CLT Profissional" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                            CLT Profissional
                          </option>
                          <option value="Prestador Autônomo" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                            Prestador Autônomo
                          </option>
                        </>
                      )}
                      {kind === 'salon_user' && (
                        <>
                          <option value="Proprietário (Dono)" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                            Proprietário (Dono)
                          </option>
                          <option value="Gerente Geral" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                            Gerente Geral
                          </option>
                          <option value="Recepção & Atendimento" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                            Recepção & Atendimento
                          </option>
                        </>
                      )}
                      {kind === 'admin' && (
                        <>
                          <option value="Superadmin Master" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                            Superadmin Master
                          </option>
                          <option value="Moderador" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                            Moderador
                          </option>
                          <option value="Suporte Técnico" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                            Suporte Técnico
                          </option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: Endereço & Localização */}
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Endereço & Localização</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                {/* CEP com Busca Automática ViaCEP */}
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    CEP
                  </label>
                  <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 focus-within:border-emerald-500 transition">
                    <input
                      type="text"
                      value={cep}
                      onChange={(e) => setCep(e.target.value)}
                      placeholder="00000-000"
                      className="bg-transparent text-xs text-slate-900 dark:text-white outline-none w-full font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleLookupCep}
                      disabled={isSearchingCep}
                      className="px-2 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-emerald-500 hover:text-white text-slate-700 dark:text-slate-300 rounded text-[10px] font-bold transition cursor-pointer shrink-0"
                      title="Buscar CEP"
                    >
                      {isSearchingCep ? '...' : <Search className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {/* Endereço / Logradouro */}
                <div className="sm:col-span-6">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Logradouro (Rua / Av.)
                  </label>
                  <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 focus-within:border-emerald-500 transition">
                    <Home className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Ex: Rua das Flores"
                      className="bg-transparent text-xs text-slate-900 dark:text-white outline-none w-full"
                    />
                  </div>
                </div>

                {/* Número */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nº
                  </label>
                  <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 focus-within:border-emerald-500 transition">
                    <input
                      type="text"
                      value={streetNumber}
                      onChange={(e) => setStreetNumber(e.target.value)}
                      placeholder="123"
                      className="bg-transparent text-xs text-slate-900 dark:text-white outline-none w-full font-mono text-center"
                    />
                  </div>
                </div>

                {/* Complemento */}
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Complemento
                  </label>
                  <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 focus-within:border-emerald-500 transition">
                    <Building className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
                    <input
                      type="text"
                      value={complement}
                      onChange={(e) => setComplement(e.target.value)}
                      placeholder="Apto, Sala"
                      className="bg-transparent text-xs text-slate-900 dark:text-white outline-none w-full"
                    />
                  </div>
                </div>

                {/* Bairro */}
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bairro
                  </label>
                  <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 focus-within:border-emerald-500 transition">
                    <input
                      type="text"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      placeholder="Bairro"
                      className="bg-transparent text-xs text-slate-900 dark:text-white outline-none w-full"
                    />
                  </div>
                </div>

                {/* Cidade */}
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cidade
                  </label>
                  <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 focus-within:border-emerald-500 transition">
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="São Paulo"
                      className="bg-transparent text-xs text-slate-900 dark:text-white outline-none w-full"
                    />
                  </div>
                </div>

                {/* UF */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    UF
                  </label>
                  <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 focus-within:border-emerald-500 transition">
                    <input
                      type="text"
                      maxLength={2}
                      value={stateUf}
                      onChange={(e) => setStateUf(e.target.value.toUpperCase())}
                      placeholder="SP"
                      className="bg-transparent text-xs text-slate-900 dark:text-white outline-none w-full font-mono uppercase text-center font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Geocodificação Automática + Pino Ajustável Google Maps (Propaga por CPF) */}
              <div className="mt-3">
                <GoogleAddressPinPicker
                  cep={cep}
                  address={address}
                  streetNumber={streetNumber}
                  neighborhood={neighborhood}
                  city={city}
                  state={stateUf}
                  latitude={latitude}
                  longitude={longitude}
                  onCoordinatesChange={({ latitude: lat, longitude: lng }) => {
                    setLatitude(lat);
                    setLongitude(lng);
                  }}
                  label="Geolocalização Exata (Sincroniza por CPF nas Tabelas Vinculadas)"
                  compact
                />
              </div>
            </div>

            {/* SEÇÃO 3: Dependentes, Agendamentos & Status Atual */}
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Atividade & Status</span>
              </h3>

              <div className="grid grid-cols-3 gap-2.5">
                {/* Dependentes */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">
                      Dependentes
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={dependentsCount}
                      onChange={(e) => setDependentsCount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="bg-transparent text-sm font-bold text-slate-900 dark:text-white outline-none w-12 font-mono"
                    />
                  </div>
                  <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                </div>

                {/* Agendamentos */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">
                      Agendamentos
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={appointmentsCount}
                      onChange={(e) => setAppointmentsCount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="bg-transparent text-sm font-bold text-slate-900 dark:text-white outline-none w-12 font-mono"
                    />
                  </div>
                  <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                </div>

                {/* Status */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-1">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">
                      Status
                    </span>
                    <span
                      className={`text-[10px] font-bold ${
                        isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleCurrentStatus}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer border ${
                      isActive
                        ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30 hover:bg-rose-100'
                        : 'bg-[#20C933] hover:bg-[#1bb32d] text-white border-transparent'
                    }`}
                  >
                    {isActive ? 'Pausar' : 'Ativar'}
                  </button>
                </div>
              </div>

              <div className="mt-2.5 py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-950 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Registro de Criação:</span>
                </span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {formatCreatedAtParts(user.createdAt).valid
                    ? `${formatCreatedAtParts(user.createdAt).fullLabel} (${user.originLabel})`
                    : '—'}
                </span>
              </div>
            </div>

            {/* SEÇÃO 4: Segurança & Recuperação (SQL v5.0 — Perguntas Secretas & Suporte) */}
            {kind !== 'dependent' && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Segurança & Recuperação (Suporte Admin)</span>
                </h3>

                <div className="space-y-2.5">
                  {/* Status e Reset de Pergunta Secreta */}
                  <div className="flex flex-wrap items-center justify-between gap-2 py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-950">
                    <div className="flex items-center gap-2 min-w-0">
                      <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                            Pergunta Secreta
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              hasSecurityQuestion
                                ? 'bg-[#10B981] text-white'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {hasSecurityQuestion ? 'Configurada' : 'Não configurada'}
                          </span>
                        </div>
                        {securityCodes.length > 0 && (
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            Ativas: {securityCodes.map(formatQuestionCodeLabel).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isResettingSecurity}
                      onClick={handleResetSecurityQuestion}
                      className="px-2.5 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 text-[10px] font-bold transition cursor-pointer flex items-center gap-1 shrink-0 disabled:opacity-50"
                      title="Limpar respostas secretas para o usuário cadastrar novamente"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Resetar Pergunta</span>
                    </button>
                  </div>

                  {/* Redefinição Imediata de Senha */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 focus-within:border-emerald-500 transition">
                      <Lock className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
                      <input
                        type="text"
                        value={supportNewPassword}
                        onChange={(e) => setSupportNewPassword(e.target.value)}
                        placeholder="Nova senha temporária p/ suporte"
                        className="bg-transparent text-xs text-slate-900 dark:text-white outline-none w-full font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={isResettingSecurity || !supportNewPassword.trim()}
                      onClick={handleSupportPasswordReset}
                      className="px-3 py-1.5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-[11px] font-bold transition cursor-pointer flex items-center gap-1 shrink-0 disabled:opacity-40 whitespace-nowrap"
                    >
                      <KeyRound className="w-3 h-3 text-white" />
                      <span className="text-white">Redefinir Senha</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RODAPÉ FIXO DE AÇÃO */}
          <div className="shrink-0 sticky bottom-0 z-20 p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 select-none">
            <button
              type="button"
              onClick={handleDeleteUser}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border active:scale-95 ${
                confirmingDelete
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-600 dark:hover:bg-rose-600 text-rose-600 dark:text-rose-400 hover:text-white dark:hover:text-white border-rose-200 dark:border-rose-500/30'
              }`}
            >
              <Trash2 className={`w-3.5 h-3.5 ${confirmingDelete ? 'text-white' : ''}`} />
              <span>{confirmingDelete ? 'Confirmar Exclusão' : 'Excluir'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-1.5 rounded-lg bg-[#20C933] hover:bg-[#1bb32d] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5 text-white" />
                <span className="text-white">{isSaving ? 'Salvando...' : 'Salvar'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
