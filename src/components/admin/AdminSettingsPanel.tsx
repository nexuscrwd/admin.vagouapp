import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserPlus,
  RefreshCw,
  Mail,
  Phone,
  Shield,
  CheckCircle2,
  XCircle,
  Pencil,
  FileText,
  ArrowRight,
  Sparkles,
  QrCode,
  Eye,
  Save,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import { fetchSystemAdmins, toggleAdminStatus } from '../../services/supabaseApi';
import { SystemAdminUser } from '../../types/admin';
import { AdminCreateAdminModal } from './AdminCreateAdminModal';
import { AdminEditAdminModal } from './AdminEditAdminModal';
import { UserAvatar } from '../common/UserAvatar';
import {
  SalonWelcomeModal,
  SalonWelcomeTemplateConfig,
  DEFAULT_WELCOME_MODAL_CONFIG,
  getWelcomeModalConfig,
  saveWelcomeModalConfig,
} from './SalonWelcomeModal';

export interface AdminSettingsPanelProps {
  onNavigateToForms?: () => void;
}

export const AdminSettingsPanel: React.FC<AdminSettingsPanelProps> = ({ onNavigateToForms }) => {
  // System Admins Management
  const [admins, setAdmins] = useState<SystemAdminUser[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);
  const [isCreateAdminModalOpen, setIsCreateAdminModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<SystemAdminUser | null>(null);
  const [isEditAdminModalOpen, setIsEditAdminModalOpen] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Studio & Preview do Modal de Boas-Vindas (SalonWelcomeModal)
  const [isWelcomePreviewOpen, setIsWelcomePreviewOpen] = useState(false);
  const [isWelcomeEditorExpanded, setIsWelcomeEditorExpanded] = useState(true);
  const [welcomeConfig, setWelcomeConfig] = useState<SalonWelcomeTemplateConfig>(() =>
    getWelcomeModalConfig()
  );
  const [previewSalonName, setPreviewSalonName] = useState('Fabio Foos');
  const [previewSalonSlug, setPreviewSalonSlug] = useState('fabiofoos');
  const [previewSlogan, setPreviewSlogan] = useState('Excelência em estética e bem-estar');
  const [welcomeSavedFeedback, setWelcomeSavedFeedback] = useState<string | null>(null);

  const handleSaveWelcomeConfig = () => {
    saveWelcomeModalConfig(welcomeConfig);
    setWelcomeSavedFeedback('Configurações do Modal de Boas-Vindas salvas e aplicadas em todo o sistema!');
    setTimeout(() => setWelcomeSavedFeedback(null), 3500);
  };

  const handleResetWelcomeConfig = () => {
    setWelcomeConfig(DEFAULT_WELCOME_MODAL_CONFIG);
    saveWelcomeModalConfig(DEFAULT_WELCOME_MODAL_CONFIG);
    setWelcomeSavedFeedback('Modal de Boas-Vindas restaurado para o padrão original!');
    setTimeout(() => setWelcomeSavedFeedback(null), 3500);
  };

  const loadAdmins = async () => {
    setIsLoadingAdmins(true);
    try {
      const list = await fetchSystemAdmins();
      setAdmins(list);
    } catch {
    } finally {
      setIsLoadingAdmins(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleToggleStatus = async (admin: SystemAdminUser) => {
    const nextStatus = !admin.is_active;
    const res = await toggleAdminStatus(admin.id, nextStatus);
    if (res.success) {
      setAdmins((prev) =>
        prev.map((a) => (a.id === admin.id ? { ...a, is_active: nextStatus } : a))
      );
      setActionFeedback(`Status do administrador ${admin.username.replace(/^@+/, '')} atualizado!`);
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  const handleOpenEditModal = (admin: SystemAdminUser) => {
    setEditingAdmin(admin);
    setIsEditAdminModalOpen(true);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR');
    } catch {
      return '—';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 🎉 SEÇÃO 1: ESTÚDIO & CONFIGURAÇÃO DO MODAL DE BOAS-VINDAS (KIT DE LANÇAMENTO + QR CODE) */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 shadow-xs dark:shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#20C933] text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Modal de Boas-Vindas & Kit de Lançamento (Link + QR Code)
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                  Etapa 6 • Pós-Cadastro
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Visualize e edite o modal exibido ao proprietário após concluir a criação do estabelecimento.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsWelcomeEditorExpanded((prev) => !prev)}
              className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-500" />
              <span>{isWelcomeEditorExpanded ? 'Ocultar Editor' : 'Editar Textos'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsWelcomePreviewOpen(true)}
              className="py-2 px-4 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95 whitespace-nowrap"
            >
              <Eye className="w-4 h-4 text-white" />
              <span className="text-white">Abrir Modal de Boas-Vindas</span>
            </button>
          </div>
        </div>

        {welcomeSavedFeedback && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{welcomeSavedFeedback}</span>
          </div>
        )}

        {isWelcomeEditorExpanded && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-1">
            {/* Coluna Esquerda: Editor dos Textos e Botões do Modal */}
            <div className="lg:col-span-7 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Nome de Teste (Simulação)
                  </label>
                  <input
                    type="text"
                    value={previewSalonName}
                    onChange={(e) => setPreviewSalonName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 text-white text-xs border border-slate-800 focus:border-emerald-500 outline-none"
                    placeholder="Ex: Fabio Foos"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Subdomínio / Slug de Teste
                  </label>
                  <input
                    type="text"
                    value={previewSalonSlug}
                    onChange={(e) =>
                      setPreviewSalonSlug(
                        e.target.value
                          .toLowerCase()
                          .normalize('NFD')
                          .replace(/[\u0300-\u036f]/g, '')
                          .replace(/[^a-z0-9]/g, '')
                      )
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs border border-slate-800 focus:border-emerald-500 outline-none"
                    placeholder="Ex: fabiofoos"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Título Principal (use {'{nome}'})
                  </label>
                  <input
                    type="text"
                    value={welcomeConfig.titleTemplate}
                    onChange={(e) =>
                      setWelcomeConfig((prev) => ({ ...prev, titleTemplate: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 text-white text-xs border border-slate-800 focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Subtítulo de Parabenização
                  </label>
                  <input
                    type="text"
                    value={welcomeConfig.subtitleText}
                    onChange={(e) =>
                      setWelcomeConfig((prev) => ({ ...prev, subtitleText: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 text-white text-xs border border-slate-800 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Título da Seção de Boas-Vindas
                </label>
                <input
                  type="text"
                  value={welcomeConfig.sectionTitle}
                  onChange={(e) =>
                    setWelcomeConfig((prev) => ({ ...prev, sectionTitle: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 text-white text-xs border border-slate-800 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Mensagem de Boas-Vindas ao Parceiro
                </label>
                <textarea
                  rows={2}
                  value={welcomeConfig.welcomeMessage}
                  onChange={(e) =>
                    setWelcomeConfig((prev) => ({ ...prev, welcomeMessage: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 text-white text-xs border border-slate-800 focus:border-emerald-500 outline-none resize-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Aviso de Orientação Inicial (Serviços, Equipe e Horários)
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={welcomeConfig.showInstructionNote}
                      onChange={(e) =>
                        setWelcomeConfig((prev) => ({
                          ...prev,
                          showInstructionNote: e.target.checked,
                        }))
                      }
                      className="accent-[#20C933]"
                    />
                    <span>Exibir aviso</span>
                  </label>
                </div>
                <textarea
                  rows={2}
                  value={welcomeConfig.instructionNote}
                  onChange={(e) =>
                    setWelcomeConfig((prev) => ({ ...prev, instructionNote: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 text-white text-xs border border-slate-800 focus:border-emerald-500 outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Botão Esquerdo (Abrir / Baixar App)
                  </label>
                  <input
                    type="text"
                    value={welcomeConfig.openPartnerAppLabel}
                    onChange={(e) =>
                      setWelcomeConfig((prev) => ({
                        ...prev,
                        openPartnerAppLabel: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 text-white text-xs border border-slate-800 focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Botão Direito (Concluir e Começar)
                  </label>
                  <input
                    type="text"
                    value={welcomeConfig.finishButtonLabel}
                    onChange={(e) =>
                      setWelcomeConfig((prev) => ({
                        ...prev,
                        finishButtonLabel: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 text-white text-xs border border-slate-800 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleResetWelcomeConfig}
                  className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  <span>Restaurar Padrão</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveWelcomeConfig}
                  className="py-2.5 px-5 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95 whitespace-nowrap"
                >
                  <Save className="w-4 h-4 text-white" />
                  <span className="text-white">Salvar Alterações do Modal</span>
                </button>
              </div>
            </div>

            {/* Coluna Direita: Mini Preview Ao Vivo */}
            <div className="lg:col-span-5 bg-slate-950 rounded-2xl p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#20C933] text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-base font-black text-white">
                    {welcomeConfig.titleTemplate.replace(/\{nome\}/gi, previewSalonName || 'Meu Espaço')}
                  </h4>
                  <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                    {welcomeConfig.subtitleText}
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs border-t border-slate-800/80 pt-3">
                <p className="font-bold text-white">{welcomeConfig.sectionTitle}</p>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {welcomeConfig.welcomeMessage}
                </p>
                {welcomeConfig.showInstructionNote && (
                  <p className="text-amber-300 text-[11px] leading-snug">
                    • {welcomeConfig.instructionNote}
                  </p>
                )}

                <div className="pt-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                    {welcomeConfig.linkLabel}
                  </span>
                  <div className="bg-slate-900 px-3 py-2 rounded-xl font-mono text-xs text-white font-bold truncate">
                    https://{previewSalonSlug || 'meu-espaco'}.vagouapp.com
                  </div>
                </div>

                {welcomeConfig.showQrSection && (
                  <div className="flex items-center gap-3 pt-2">
                    <div className="bg-white p-2 rounded-xl shrink-0">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
                          `https://${previewSalonSlug || 'meu-espaco'}.vagouapp.com`
                        )}&format=png&margin=6`}
                        alt="Preview QR"
                        className="w-16 h-16 object-contain"
                      />
                    </div>
                    <div className="text-left space-y-1">
                      <div className="text-xs font-bold text-white flex items-center gap-1">
                        <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{welcomeConfig.qrTitle}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        {welcomeConfig.qrDescription}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsWelcomePreviewOpen(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20 whitespace-nowrap"
              >
                <Eye className="w-4 h-4 text-white" />
                <span className="text-white">Testar Modal Interativo em Tela Cheia</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 🔐 SEÇÃO 2: GESTÃO DE ADMINISTRADORES SOBERANOS */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs dark:shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-500/30">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Administradores Corporativos do Sistema
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                  {admins.length} {admins.length === 1 ? 'administrador' : 'administradores'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Acesso restrito: Novos administradores só podem ser cadastrados por um gestor autenticado.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadAdmins}
              disabled={isLoadingAdmins}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer border border-slate-200 dark:border-slate-700 shadow-xs dark:shadow-none"
              title="Recarregar Lista"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isLoadingAdmins ? 'animate-spin text-emerald-600 dark:text-emerald-400' : ''
                }`}
              />
            </button>

            <button
              onClick={() => setIsCreateAdminModalOpen(true)}
              className="py-2 px-3.5 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95"
            >
              <UserPlus className="w-4 h-4 text-white" />
              <span>Cadastrar Novo Administrador</span>
            </button>
          </div>
        </div>

        {actionFeedback && (
          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-400 font-medium animate-fadeIn">
            ✓ {actionFeedback}
          </div>
        )}

        {/* Tabela de Administradores */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Administrador</th>
                <th className="py-3 px-4">Contato</th>
                <th className="py-3 px-4">Nível de Acesso</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {admins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    Nenhum administrador listado no momento.
                  </td>
                </tr>
              ) : (
                admins.map((admin) => (
                  <tr
                    key={admin.id}
                    className="hover:bg-slate-50/90 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar fullName={admin.full_name} photoUrl={admin.avatar_url} size="sm" />
                        <div>
                          <strong className="text-slate-900 dark:text-white block font-medium">
                            {admin.full_name}
                          </strong>
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                            {admin.username.replace(/^@+/, '')}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="space-y-0.5 text-[11px]">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <Mail className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                          <span>{admin.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                          <Phone className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                          <span>{admin.phone_whatsapp}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20">
                        <Shield className="w-3 h-3" />
                        {admin.role === 'superadmin'
                          ? 'Super Administrador'
                          : admin.role === 'moderator'
                          ? 'Moderador'
                          : 'Suporte'}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      {admin.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
                          <XCircle className="w-3 h-3" />
                          Inativo
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                      {formatDate(admin.created_at)}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(admin)}
                          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] transition flex items-center gap-1 cursor-pointer border border-slate-200 dark:border-slate-700"
                          title="Editar Administrador"
                        >
                          <Pencil className="w-3 h-3 text-emerald-500" />
                          <span>Editar</span>
                        </button>

                        <button
                          onClick={() => handleToggleStatus(admin)}
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all duration-150 cursor-pointer border ${
                            admin.is_active
                              ? 'bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-300 border-slate-200 dark:border-slate-700/80 hover:border-rose-200 dark:hover:border-rose-900/60 shadow-xs dark:shadow-none'
                              : 'bg-[#20C933] hover:bg-[#1bb32d] text-white border-transparent shadow-xs active:scale-95'
                          }`}
                        >
                          {admin.is_active ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 📋 SEÇÃO 3: CENTRAL DE FORMULÁRIOS DA TRÍADE */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs dark:shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-200 dark:border-teal-500/30">
              <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Central de Formulários da Tríade (Canvas Lado a Lado)
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-500/20">
                  Pipeline Tríade
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Visualize, teste e refatore todos os formulários reais de <code>adm</code>, <code>mnvapp</code> e <code>pvapp</code> dispostos lado a lado.
              </p>
            </div>
          </div>

          {onNavigateToForms && (
            <button
              onClick={onNavigateToForms}
              className="px-3.5 py-1.5 rounded-lg bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95 shrink-0"
            >
              <span>Acessar Formulários</span>
              <ArrowRight className="w-3.5 h-3.5 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Modal Dedicado para Cadastrar Novo Administrador */}
      <AdminCreateAdminModal
        isOpen={isCreateAdminModalOpen}
        onClose={() => setIsCreateAdminModalOpen(false)}
        onSuccess={(newAdmin) => {
          setAdmins((prev) => [newAdmin, ...prev]);
          setActionFeedback(`Novo administrador ${newAdmin.username.replace(/^@+/, '')} cadastrado com sucesso!`);
          setTimeout(() => setActionFeedback(null), 3500);
        }}
      />

      {/* Modal Dedicado para Editar Administrador Existente */}
      <AdminEditAdminModal
        isOpen={isEditAdminModalOpen}
        admin={editingAdmin}
        onClose={() => {
          setIsEditAdminModalOpen(false);
          setEditingAdmin(null);
        }}
        onSuccess={(updatedAdmin) => {
          setAdmins((prev) =>
            prev.map((a) => (a.id === updatedAdmin.id ? updatedAdmin : a))
          );
          setActionFeedback(`Dados do administrador ${updatedAdmin.username.replace(/^@+/, '')} atualizados com sucesso!`);
          setTimeout(() => setActionFeedback(null), 3500);
        }}
      />

      {/* Modal Interativo de Boas-Vindas & Kit de Lançamento */}
      <SalonWelcomeModal
        isOpen={isWelcomePreviewOpen}
        onClose={() => setIsWelcomePreviewOpen(false)}
        customConfig={welcomeConfig}
        data={{
          tradeName: previewSalonName || 'Fabio Foos',
          slug: previewSalonSlug || 'fabio-foos',
          slogan: previewSlogan,
          primaryColor: '#20C933',
        }}
      />
    </div>
  );
};
