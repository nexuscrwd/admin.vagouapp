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
} from 'lucide-react';
import { fetchSystemAdmins, toggleAdminStatus } from '../../services/supabaseApi';
import { SystemAdminUser } from '../../types/admin';
import { AdminCreateAdminModal } from './AdminCreateAdminModal';
import { AdminEditAdminModal } from './AdminEditAdminModal';
import { UserAvatar } from '../common/UserAvatar';

export interface AdminSettingsPanelProps {
  onNavigateToForms?: () => void;
}

export const AdminSettingsPanel: React.FC<AdminSettingsPanelProps> = () => {
  // System Admins Management
  const [admins, setAdmins] = useState<SystemAdminUser[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);
  const [isCreateAdminModalOpen, setIsCreateAdminModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<SystemAdminUser | null>(null);
  const [isEditAdminModalOpen, setIsEditAdminModalOpen] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

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
      {/* 🔐 SEÇÃO: GESTÃO DE ADMINISTRADORES SOBERANOS */}
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
    </div>
  );
};
