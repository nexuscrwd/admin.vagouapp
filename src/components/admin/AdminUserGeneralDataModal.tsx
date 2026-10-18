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
  Navigation,
  Globe,
  Users,
  Calendar,
  CheckCircle2,
  Ban,
  Trash2,
  Save,
  Search,
} from 'lucide-react';
import { UnifiedUserRow } from './AdminUsersManager';

export interface AdminUserGeneralDataModalProps {
  user: UnifiedUserRow;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedUser: UnifiedUserRow) => Promise<void> | void;
  onToggleStatus: (kind: string, id: string, nextStatus: boolean) => Promise<void> | void;
  onDelete: (kind: string, id: string) => Promise<void> | void;
}

export const AdminUserGeneralDataModal: React.FC<AdminUserGeneralDataModalProps> = ({
  user,
  isOpen,
  onClose,
  onSave,
  onToggleStatus,
  onDelete,
}) => {
  // Form state
  const [name, setName] = useState(user.name || '');
  const [username, setUsername] = useState((user.username || '').replace(/^@+/, ''));
  const [cpf, setCpf] = useState(user.cpf || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [phoneSecondary, setPhoneSecondary] = useState(user.phoneSecondary || '');
  const [email, setEmail] = useState(user.email || '');
  const [password, setPassword] = useState(user.password || 'Vagou@2026!');
  const [showPassword, setShowPassword] = useState(false);

  const [kind, setKind] = useState<'client' | 'professional' | 'salon_user' | 'admin'>(user.kind);
  const [accessLevel, setAccessLevel] = useState(user.accessLevel || 'Cliente Titular');

  const [address, setAddress] = useState(user.address || '');
  const [streetNumber, setStreetNumber] = useState(user.streetNumber || '');
  const [complement, setComplement] = useState(user.complement || '');
  const [neighborhood, setNeighborhood] = useState(user.neighborhood || '');
  const [city, setCity] = useState(user.city || 'São Paulo');
  const [stateUf, setStateUf] = useState(user.state || 'SP');
  const [cep, setCep] = useState(user.cep || '');

  const [dependentsCount, setDependentsCount] = useState<number>(user.dependentsCount || 0);
  const [appointmentsCount, setAppointmentsCount] = useState<number>(user.appointmentsCount || 0);
  const [isActive, setIsActive] = useState<boolean>(user.isActive);

  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

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
    setPassword(user.password || 'Vagou@2026!');
    setKind(user.kind);
    setAccessLevel(user.accessLevel || getDefaultAccessLevel(user.kind));
    setAddress(user.address || '');
    setStreetNumber(user.streetNumber || '');
    setComplement(user.complement || '');
    setNeighborhood(user.neighborhood || '');
    setCity(user.city || 'São Paulo');
    setStateUf(user.state || 'SP');
    setCep(user.cep || '');
    setDependentsCount(Number(user.dependentsCount) || 0);
    setAppointmentsCount(Number(user.appointmentsCount) || 0);
    setIsActive(user.isActive);
    setFeedbackMsg(null);
  }, [user]);

  function getDefaultAccessLevel(targetKind: 'client' | 'professional' | 'salon_user' | 'admin'): string {
    switch (targetKind) {
      case 'client':
        return 'Cliente Titular';
      case 'professional':
        return 'MEI Parceiro';
      case 'salon_user':
        return 'Proprietário (Dono)';
      case 'admin':
        return 'Superadmin Master';
    }
  }

  // Ao alterar o Tipo, atualiza as opções coerentes de Nível de Acesso
  const handleKindChange = (newKind: 'client' | 'professional' | 'salon_user' | 'admin') => {
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
          : kind === 'professional'
          ? 'Profissional'
          : kind === 'salon_user'
          ? 'Gestor / Salão'
          : 'Administrador';

      const roleBadgeClass =
        kind === 'client'
          ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 font-bold'
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
        dependentsCount: Number(dependentsCount) || 0,
        appointmentsCount: Number(appointmentsCount) || 0,
        isActive,
        statusLabel: isActive ? 'Ativo' : 'Inativo',
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

  // Excluir usuário
  const handleDeleteUser = async () => {
    if (
      !confirm(
        `Tem certeza que deseja excluir o usuário "${name}" (${username})?\n\nEsta ação excluirá o registro no sistema e desativará os acessos correspondentes.`
      )
    ) {
      return;
    }

    try {
      await onDelete(kind, user.originalId);
      onClose();
    } catch {
      setFeedbackMsg({ text: 'Erro ao excluir usuário.', type: 'error' });
    }
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
        className="w-full max-w-4xl h-[90vh] max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scaleIn text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* CABEÇALHO DO MODAL (ESTÁTICO NO TOPO) */}
        <div className="shrink-0 p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/90 select-none">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
                  Dados Gerais do Usuário
                </h2>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase shrink-0 ${user.roleBadgeClass}`}>
                  {user.roleLabel}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                ID: {user.originalId} • {username || user.name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FEEDBACK BANNER (CASO EXISTA) */}
        {feedbackMsg && (
          <div
            className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 shrink-0 ${
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

        {/* 
          FORMULÁRIO PRINCIPAL:
          - flex-1 min-h-0 flex flex-col: Garante que o corpo rolante seja 100% contido
          - A área de rolagem termina rigorosamente ANTES do rodapé
        */}
        <form onSubmit={handleSave} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* CORPO ROLANTE (ISOLADO — ROLAGEM LIMITADA AO INTERIOR DESTE ELEMENTO) */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-6 text-xs bg-white dark:bg-slate-900">
            {/* SEÇÃO 1: Identificação & Autenticação */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Identificação & Acesso</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {/* 1. Nome Completo */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nome Completo <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 focus-within:border-emerald-500 transition">
                    <User className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
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
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nome de Usuário
                  </label>
                  <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 focus-within:border-emerald-500 transition">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                    <input
                      type="text"
                      value={username.replace(/^@+/, '')}
                      onChange={(e) => setUsername(e.target.value.replace(/^@+/, ''))}
                      placeholder="usuario.login"
                      className="bg-transparent text-xs text-slate-900 dark:text-white outline-none w-full font-mono"
                    />
                  </div>
                </div>

                {/* 3. CPF (Opcional) */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    CPF <span className="text-slate-400 font-normal">(Opcional)</span>
                  </label>
                  <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 focus-within:border-emerald-500 transition">
                    <FileText className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                    <input
                      type="text"
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      className="bg-transparent text-xs text-slate-900 dark:text-white outline-none w-full font-mono"
                    />
                  </div>
                </div>

                {/* 4. WhatsApp (Principal) */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    WhatsApp (Principal) <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 focus-within:border-emerald-500 transition">
                    <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mr-2 shrink-0" />
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

                {/* 5. Senha */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Senha de Acesso
                  </label>
                  <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 focus-within:border-emerald-500 transition">
                    <Lock className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Senha do usuário"
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

                {/* 6. Tipo (Lista Suspensa Editável) */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tipo de Conta <span className="text-emerald-600 dark:text-emerald-400 font-bold">(Editável)</span>
                  </label>
                  <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 focus-within:border-emerald-500 transition">
                    <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mr-2 shrink-0" />
                    <select
                      value={kind}
                      onChange={(e) =>
                        handleKindChange(
                          e.target.value as 'client' | 'professional' | 'salon_user' | 'admin'
                        )
                      }
                      className="bg-transparent text-xs font-semibold text-slate-900 dark:text-white outline-none w-full cursor-pointer"
                    >
                      <option value="client" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                        Cliente do Portal
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

                {/* 7. Nível de Acesso (Lista Suspensa Editável Conforme o Tipo) */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nível de Acesso <span className="text-emerald-600 dark:text-emerald-400 font-bold">(Editável)</span>
                  </label>
                  <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 focus-within:border-emerald-500 transition">
                    <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mr-2 shrink-0" />
                    <select
                      value={accessLevel}
                      onChange={(e) => setAccessLevel(e.target.value)}
                      className="bg-transparent text-xs font-semibold text-slate-900 dark:text-white outline-none w-full cursor-pointer"
                    >
                      {kind === 'client' && (
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

                {/* 8. WhatsApp (Secundário) */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    WhatsApp (Secundário)
                  </label>
                  <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 focus-within:border-emerald-500 transition">
                    <Phone className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                    <input
                      type="text"
                      value={phoneSecondary}
                      onChange={(e) => setPhoneSecondary(e.target.value)}
                      placeholder="(11) 98888-8888"
                      className="bg-transparent text-xs text-slate-900 dark:text-white outline-none w-full font-mono"
                    />
                  </div>
                </div>

                {/* 9. E-mail */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    E-mail <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 focus-within:border-emerald-500 transition">
                    <Mail className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
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
              </div>
            </div>

            {/* SEÇÃO 2: Endereço & Localização */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Endereço & Localização</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* CEP com Busca Automática ViaCEP */}
                <div className="lg:col-span-1">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    CEP
                  </label>
                  <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 focus-within:border-emerald-500 transition">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
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
                      title="Buscar CEP na base dos Correios"
                    >
                      {isSearchingCep ? '...' : <Search className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {/* Endereço / Logradouro */}
                <div className="lg:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Endereço (Rua / Av.)
                  </label>
                  <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 focus-within:border-emerald-500 transition">
                    <Home className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Ex: Rua das Flores"
                      className="bg-transparent text-xs text-slate-900 dark:text-white outline-none w-full"
                    />
                  </div>
                </div>

                {/* Número Residencial */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Número Residencial
                  </label>
                  <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 focus-within:border-emerald-500 transition">
                    <Building className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                    <input
                      type="text"
                      value={streetNumber}
                      onChange={(e) => setStreetNumber(e.target.value)}
                      placeholder="123"
                      className="bg-transparent text-xs text-slate-900 dark:text-white outline-none w-full font-mono"
                    />
                  </div>
                </div>

                {/* Complemento */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Complemento
                  </label>
                  <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 focus-within:border-emerald-500 transition">
                    <Building className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                    <input
                      type="text"
                      value={complement}
                      onChange={(e) => setComplement(e.target.value)}
                      placeholder="Apto, Bloco, Casa"
                      className="bg-transparent text-xs text-slate-900 dark:text-white outline-none w-full"
                    />
                  </div>
                </div>

                {/* Bairro */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bairro
                  </label>
                  <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 focus-within:border-emerald-500 transition">
                    <Navigation className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
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
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cidade
                  </label>
                  <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 focus-within:border-emerald-500 transition">
                    <Globe className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
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
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    UF (Estado)
                  </label>
                  <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 focus-within:border-emerald-500 transition">
                    <Globe className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                    <input
                      type="text"
                      maxLength={2}
                      value={stateUf}
                      onChange={(e) => setStateUf(e.target.value.toUpperCase())}
                      placeholder="SP"
                      className="bg-transparent text-xs text-slate-900 dark:text-white outline-none w-full font-mono uppercase"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SEÇÃO 3: Dependentes, Agendamentos & Status Atual */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Atividade & Status Operacional</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* Dependentes */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      Depend. (Número de Dependentes)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={dependentsCount}
                      onChange={(e) => setDependentsCount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="bg-transparent text-base font-bold text-slate-900 dark:text-white outline-none w-20 font-mono"
                    />
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>

                {/* Agendamentos */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      Agend. (Número de Agendamentos)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={appointmentsCount}
                      onChange={(e) => setAppointmentsCount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="bg-transparent text-base font-bold text-slate-900 dark:text-white outline-none w-20 font-mono"
                    />
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>

                {/* Status */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      Status da Conta
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        isActive
                          ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                          : 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isActive ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-rose-500 dark:bg-rose-400'
                        }`}
                      />
                      {isActive ? 'Ativo' : 'Inativo / Suspenso'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleCurrentStatus}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border shadow-xs ${
                      isActive
                        ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30 hover:bg-rose-100'
                        : 'bg-[#20C933] hover:bg-[#1bb32d] text-white border-transparent'
                    }`}
                  >
                    {isActive ? 'Desativar' : 'Reativar'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 
            RODAPÉ FIXO DE AÇÃO (100% ISOLADO DA ROLAGEM):
            - Elemento irmão do corpo rolante (shrink-0)
            - border-t, bg-slate-50 dark:bg-slate-950
            - A barra de rolagem termina rigorosamente ACIMA deste container
            - Os botões nunca têm scroll passando por trás deles
          */}
          <div className="shrink-0 p-4 sm:p-5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 select-none">
            {/* Ação 1: Excluir */}
            <button
              type="button"
              onClick={handleDeleteUser}
              className="px-3.5 py-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-600 dark:hover:bg-rose-600 text-rose-600 dark:text-rose-400 hover:text-white dark:hover:text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-rose-200 dark:border-rose-500/30 shadow-xs active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir Usuário</span>
            </button>

            {/* Ação 2 & 3: Cancelar e Salvar */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-lg bg-[#20C933] hover:bg-[#1bb32d] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5 text-white" />
                <span className="text-white">{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
