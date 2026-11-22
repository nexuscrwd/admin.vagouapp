import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Users,
  LayoutGrid,
  List,
  Plus,
  Download,
  CheckSquare,
  Square,
  Filter,
  Tag,
  CheckCircle2,
  X,
  RefreshCw,
  ShieldCheck,
  KeyRound,
  Edit,
  Trash2,
  Phone,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import {
  SystemAdminUser,
  UserClientItem,
  UserFamilyDependent,
  UserSalonAccessItem,
  UserProfessionalItem,
} from '../../types/admin';
import { supabase } from '../../services/supabase';
import {
  fetchSystemAdmins,
  updateAdminRole,
  fetchAdminClients,
  unlinkClientDependent,
  fetchAdminSalonUsers,
  fetchAdminProfessionals,
  unlinkProfessionalFromSalon,
  updateUnifiedUserData,
  deleteUnifiedUserData,
  batchDeleteUnifiedUsers,
  toggleUnifiedUserStatus,
} from '../../services/supabaseApi';
import { AdminCreateAdminModal } from './AdminCreateAdminModal';
import { UserAvatar } from '../common/UserAvatar';
import { TriadeUserRegisterForm } from './triade-forms/TriadeUserRegisterForm';
import { AdminUserDetailView, UnifiedUserDetailType } from './AdminUserDetailView';
import { AdminUserGeneralDataModal } from './AdminUserGeneralDataModal';
import { formatCreatedAtParts, resolveRecordOriginInfo } from '../../utils/dateTimeFormat';

type UserCategoryFilter = 'all' | 'admins' | 'clients' | 'dependents' | 'professionals' | 'salon_users';
type UserStatusFilter = 'all' | 'active' | 'inactive';

export interface UnifiedUserRow {
  id: string;
  originalId: string;
  kind: 'client' | 'professional' | 'salon_user' | 'admin' | 'dependent';
  name: string;
  username: string;
  cpf?: string;
  phone: string;
  phoneSecondary: string;
  email: string;
  password?: string;
  roleLabel: string;
  roleBadgeClass: string;
  accessLevel: string;
  address?: string;
  streetNumber?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
  latitude?: number | null;
  longitude?: number | null;
  dependentsCount: number;
  appointmentsCount: number;
  relationInfo: string;
  isActive: boolean;
  statusLabel: string;
  avatarUrl?: string;
  hasSecurityQuestion?: boolean;
  securityQuestionsConfigured?: string[];
  securityQuestionCode?: string | null;
  createdAt: string;
  originLabel: string;
  originBadgeClass: string;
  rawData: UnifiedUserDetailType;
}

interface AdminUsersManagerProps {
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}

export const AdminUsersManager: React.FC<AdminUsersManagerProps> = ({
  searchQuery = '',
}) => {

  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const [categoryFilter, setCategoryFilter] = useState<UserCategoryFilter>('all');
  const [statusFilter, setStatusFilter] = useState<UserStatusFilter>('all');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [admins, setAdmins] = useState<SystemAdminUser[]>([]);
  const [clients, setClients] = useState<UserClientItem[]>([]);
  const [salonUsers, setSalonUsers] = useState<UserSalonAccessItem[]>([]);
  const [professionals, setProfessionals] = useState<UserProfessionalItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const [isGeneralModalOpen, setIsGeneralModalOpen] = useState(false);
  const [selectedUserForModal, setSelectedUserForModal] = useState<UnifiedUserRow | null>(null);

  const [selectedUserDetail, setSelectedUserDetail] = useState<UnifiedUserDetailType | null>(null);

  const [isCreateAdminModalOpen, setIsCreateAdminModalOpen] = useState(false);
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);

  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [userPendingDelete, setUserPendingDelete] = useState<{ kind: string; id: string; name: string } | null>(null);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [admList, cliList, slnUsrList, profList] = await Promise.all([
        fetchSystemAdmins().catch(() => []),
        fetchAdminClients().catch(() => []),
        fetchAdminSalonUsers().catch(() => []),
        fetchAdminProfessionals().catch(() => []),
      ]);
      setAdmins(Array.isArray(admList) ? admList : []);
      setClients(Array.isArray(cliList) ? cliList : []);
      setSalonUsers(Array.isArray(slnUsrList) ? slnUsrList : []);
      setProfessionals(Array.isArray(profList) ? profList : []);
    } catch (err) {
      console.warn('Erro ao carregar usuários:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleLoadAll = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadAll();
      }, 700);
    };

    const channel = supabase
      .channel('admvapp-users-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, scheduleLoadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dependents' }, scheduleLoadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'professionals' }, scheduleLoadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'salon_users' }, scheduleLoadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_admins' }, scheduleLoadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_security_answers' }, scheduleLoadAll)
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, []);

  const triggerFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const handleOpenGeneralModal = (userRow: UnifiedUserRow) => {
    setSelectedUserForModal(userRow);
    setIsGeneralModalOpen(true);
  };

  const handleSaveGeneralModal = async (updatedUser: UnifiedUserRow) => {
    const sourceKind = selectedUserForModal?.kind || updatedUser.kind;
    const res = await updateUnifiedUserData(updatedUser.kind, updatedUser.originalId, {
      sourceKind,
      targetKind: updatedUser.kind,
      name: updatedUser.name,
      username: updatedUser.username,
      email: updatedUser.email,
      phone: updatedUser.phone,
      phoneSecondary: updatedUser.phoneSecondary,
      cpf: updatedUser.cpf,
      password: updatedUser.password,
      accessLevel: updatedUser.accessLevel,
      address: updatedUser.address,
      streetNumber: updatedUser.streetNumber,
      complement: updatedUser.complement,
      neighborhood: updatedUser.neighborhood,
      city: updatedUser.city,
      state: updatedUser.state,
      cep: updatedUser.cep,
      latitude: updatedUser.latitude,
      longitude: updatedUser.longitude,
      isActive: updatedUser.isActive,
      avatarUrl: updatedUser.avatarUrl,
    });

    if (!res.success) {
      throw new Error(res.error || 'Não foi possível gravar as alterações no banco de dados.');
    }

    if (sourceKind !== updatedUser.kind || res.migrated) {
      await loadAll();
      triggerFeedback(
        `Usuário "${updatedUser.name}" promovido/migrado para ${updatedUser.roleLabel} (${updatedUser.accessLevel}) com sucesso!`
      );
      return;
    }

    if (updatedUser.kind === 'client') {
      setClients((prev) =>
        prev.map((c) =>
          c.id === updatedUser.originalId
            ? {
                ...c,
                full_name: updatedUser.name,
                username: updatedUser.username,
                email: updatedUser.email,
                phone: updatedUser.phone,
                phone_secondary: updatedUser.phoneSecondary,
                cpf: updatedUser.cpf,
                password: updatedUser.password,
                access_level: updatedUser.accessLevel,
                address: updatedUser.address,
                street_number: updatedUser.streetNumber,
                complement: updatedUser.complement,
                neighborhood: updatedUser.neighborhood,
                city: updatedUser.city,
                state: updatedUser.state,
                cep: updatedUser.cep,
                is_active: updatedUser.isActive,
                avatar_url: updatedUser.avatarUrl || c.avatar_url,
              }
            : c
        )
      );
    } else if (updatedUser.kind === 'professional') {
      setProfessionals((prev) =>
        prev.map((p) =>
          p.id === updatedUser.originalId
            ? {
                ...p,
                full_name: updatedUser.name,
                username: updatedUser.username,
                email: updatedUser.email,
                phone_whatsapp: updatedUser.phone,
                phone_secondary: updatedUser.phoneSecondary,
                cpf: updatedUser.cpf,
                password: updatedUser.password,
                access_level: updatedUser.accessLevel,
                address: updatedUser.address,
                street_number: updatedUser.streetNumber,
                complement: updatedUser.complement,
                neighborhood: updatedUser.neighborhood,
                city: updatedUser.city,
                state: updatedUser.state,
                cep: updatedUser.cep,
                status: updatedUser.isActive ? 'active' : 'suspended',
                avatar_url: updatedUser.avatarUrl || p.avatar_url,
              }
            : p
        )
      );
    } else if (updatedUser.kind === 'salon_user') {
      setSalonUsers((prev) =>
        prev.map((su) =>
          su.id === updatedUser.originalId
            ? {
                ...su,
                full_name: updatedUser.name,
                username: updatedUser.username,
                email: updatedUser.email,
                phone_whatsapp: updatedUser.phone,
                phone_secondary: updatedUser.phoneSecondary,
                cpf: updatedUser.cpf,
                password: updatedUser.password,
                access_level: updatedUser.accessLevel,
                address: updatedUser.address,
                street_number: updatedUser.streetNumber,
                complement: updatedUser.complement,
                neighborhood: updatedUser.neighborhood,
                city: updatedUser.city,
                state: updatedUser.state,
                cep: updatedUser.cep,
                is_active: updatedUser.isActive,
                avatar_url: updatedUser.avatarUrl || su.avatar_url,
              }
            : su
        )
      );
    } else if (updatedUser.kind === 'admin') {
      const resolvedAdminRole: SystemAdminUser['role'] = String(updatedUser.accessLevel || '')
        .toLowerCase()
        .includes('moderador')
        ? 'moderator'
        : String(updatedUser.accessLevel || '')
            .toLowerCase()
            .includes('suporte')
        ? 'support'
        : 'superadmin';
      setAdmins((prev) =>
        prev.map((a) =>
          a.id === updatedUser.originalId
            ? {
                ...a,
                full_name: updatedUser.name,
                username: updatedUser.username,
                email: updatedUser.email,
                phone_whatsapp: updatedUser.phone,
                phone_secondary: updatedUser.phoneSecondary,
                cpf: updatedUser.cpf,
                password: updatedUser.password,
                role: resolvedAdminRole,
                access_level: updatedUser.accessLevel,
                address: updatedUser.address,
                street_number: updatedUser.streetNumber,
                complement: updatedUser.complement,
                neighborhood: updatedUser.neighborhood,
                city: updatedUser.city,
                state: updatedUser.state,
                cep: updatedUser.cep,
                is_active: updatedUser.isActive,
                avatar_url: updatedUser.avatarUrl || a.avatar_url,
              }
            : a
        )
      );
    }

    triggerFeedback(`Dados de "${updatedUser.name}" atualizados com sucesso.`);
  };

  const executeDeleteUser = async (kind: string, id: string, userName?: string) => {

    if (kind === 'client') {
      setClients((prev) => prev.filter((c) => c.id !== id));
    } else if (kind === 'dependent') {
      setClients((prev) =>
        prev.map((c) => ({
          ...c,
          dependents: (c.dependents || []).filter((d) => d.id !== id),
          dependents_count: Math.max(0, (c.dependents_count || 1) - 1),
        }))
      );
    } else if (kind === 'professional') {
      setProfessionals((prev) => prev.filter((p) => p.id !== id));
    } else if (kind === 'salon_user') {
      setSalonUsers((prev) => prev.filter((su) => su.id !== id));
    } else if (kind === 'admin') {
      setAdmins((prev) => prev.filter((a) => a.id !== id));
    }

    if (isGeneralModalOpen) {
      setIsGeneralModalOpen(false);
      setSelectedUserForModal(null);
    }
    setUserPendingDelete(null);

    triggerFeedback(`Usuário "${userName || id}" excluído com sucesso.`);

    try {
      const res = await deleteUnifiedUserData(kind as any, id);
      if (!res.success && res.error) {
        console.warn('[handleDeleteUser] Aviso do backend:', res.error);
      }
    } catch (err) {
      console.warn('[handleDeleteUser] Erro ao persistir exclusão:', err);
    }
  };

  const handleDeleteUser = async (kind: string, id: string, userName?: string, skipConfirm = false) => {
    if (skipConfirm) {
      await executeDeleteUser(kind, id, userName);
      return;
    }
    setUserPendingDelete({ kind, id, name: userName || id });
  };

  const handleToggleGenericStatus = async (kind: string, id: string, nextStatus: boolean) => {
    await toggleUnifiedUserStatus(kind as any, id, nextStatus);

    if (kind === 'admin') {
      setAdmins((prev) =>
        prev.map((a) => (a.id === id ? { ...a, is_active: nextStatus } : a))
      );
      triggerFeedback(`Status do administrador atualizado para ${nextStatus ? 'Ativo' : 'Suspenso'}.`);
    } else if (kind === 'client') {
      setClients((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_active: nextStatus } : c))
      );
      triggerFeedback(`Status do cliente atualizado para ${nextStatus ? 'Ativo' : 'Suspenso'}.`);
    } else if (kind === 'salon_user') {
      setSalonUsers((prev) =>
        prev.map((su) => (su.id === id ? { ...su, is_active: nextStatus } : su))
      );
      triggerFeedback(`Status do gestor de salão atualizado para ${nextStatus ? 'Ativo' : 'Suspenso'}.`);
    } else if (kind === 'professional') {
      setProfessionals((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: nextStatus ? 'active' : 'suspended' } : p))
      );
      triggerFeedback(`Status do profissional atualizado para ${nextStatus ? 'Ativo' : 'Suspenso'}.`);
    }

    if (selectedUserForModal && selectedUserForModal.originalId === id) {
      setSelectedUserForModal((prev) =>
        prev ? { ...prev, isActive: nextStatus, statusLabel: nextStatus ? 'Ativo' : 'Inativo' } : null
      );
    }
  };

  const handleUnlinkDependent = async (dep: UserFamilyDependent) => {
    const res = await unlinkClientDependent(dep.id);
    if (res.success) {
      setClients((prev) =>
        prev.map((c) => ({
          ...c,
          dependents: (c.dependents || []).map((d) => (d.id === dep.id ? { ...d, is_unlinked: true } : d)),
        }))
      );
      triggerFeedback(`Dependente "${dep.full_name}" desvinculado.`);
    }
  };

  const handleUnlinkProfessional = async (prof: UserProfessionalItem) => {
    if (!prof.current_salon_id) return;
    const res = await unlinkProfessionalFromSalon(prof.id, prof.current_salon_id);
    if (res.success) {
      setProfessionals((prev) =>
        prev.map((p) =>
          p.id === prof.id
            ? { ...p, current_salon_id: null, current_salon_name: undefined }
            : p
        )
      );
      triggerFeedback(`Profissional "${prof.full_name}" desvinculado.`);
    }
  };

  const handlePromoteAdmin = async (admin: SystemAdminUser, newRole: SystemAdminUser['role']) => {
    const res = await updateAdminRole(admin.id, newRole);
    if (res.success) {
      setAdmins((prev) =>
        prev.map((a) => (a.id === admin.id ? { ...a, role: newRole } : a))
      );
      triggerFeedback(`Privilégios de ${(admin.username || 'admin').replace(/^@+/, '')} alterados para ${newRole}.`);
    }
  };

  const allUnifiedUsers = useMemo<UnifiedUserRow[]>(() => {
    const list: UnifiedUserRow[] = [];
    const byEmail = new Map<string, UnifiedUserRow>();
    const byUsername = new Map<string, UnifiedUserRow>();
    const byCpf = new Map<string, UnifiedUserRow>();

    const normEmail = (val?: string) => {
      const clean = (val || '').trim().toLowerCase();
      return clean && clean !== '—' ? clean : '';
    };
    const normUser = (val?: string) => {
      const clean = (val || '').trim().replace(/^@+/, '').toLowerCase();
      return clean && clean !== '—' ? clean : '';
    };
    const normCpf = (val?: string) => {
      const digits = (val || '').replace(/\D/g, '');
      return digits.length === 11 && !/^(\d)\1{10}$/.test(digits) ? digits : '';
    };

    const registerOrMergeCanonicalUser = (candidate: UnifiedUserRow) => {
      const em = normEmail(candidate.email);
      const us = normUser(candidate.username);
      const cp = normCpf(candidate.cpf);

      const existing =
        (em ? byEmail.get(em) : undefined) ||
        (us ? byUsername.get(us) : undefined) ||
        (cp ? byCpf.get(cp) : undefined);

      if (existing) {
        existing.appointmentsCount = Math.max(existing.appointmentsCount, candidate.appointmentsCount);
        existing.dependentsCount = Math.max(existing.dependentsCount, candidate.dependentsCount);
        if (!normCpf(existing.cpf) && cp) {
          existing.cpf = candidate.cpf;
        }
        if ((!existing.phone || existing.phone === '—') && candidate.phone && candidate.phone !== '—') {
          existing.phone = candidate.phone;
        }
        if (!existing.avatarUrl && candidate.avatarUrl) {
          existing.avatarUrl = candidate.avatarUrl;
        }
        if (!existing.password && candidate.password) {
          existing.password = candidate.password;
        }
        if (candidate.hasSecurityQuestion) {
          existing.hasSecurityQuestion = true;
          existing.securityQuestionsConfigured = candidate.securityQuestionsConfigured;
          existing.securityQuestionCode = candidate.securityQuestionCode;
        }
        if (em && !byEmail.has(em)) byEmail.set(em, existing);
        if (us && !byUsername.has(us)) byUsername.set(us, existing);
        if (cp && !byCpf.has(cp)) byCpf.set(cp, existing);
        return;
      }

      list.push(candidate);
      if (em) byEmail.set(em, candidate);
      if (us) byUsername.set(us, candidate);
      if (cp) byCpf.set(cp, candidate);
    };

    (admins || []).forEach((a) => {
      const fullName = a.full_name || (a as any).name || 'Administrador Master';
      const cleanEmail = a.email || '';
      let usr = (a.username || '').replace(/^@+/, '');
      if (!usr) {
        usr = cleanEmail ? cleanEmail.split('@')[0] : fullName.toLowerCase().replace(/\s+/g, '');
      }
      const admOrigin = resolveRecordOriginInfo(a.created_via || 'admvapp', a.created_at);
      const resolvedAdminAccessLevel =
        typeof a.access_level === 'string' && a.access_level.trim() && isNaN(Number(a.access_level))
          ? a.access_level
          : Number(a.access_level) >= 100 || a.role === 'superadmin'
          ? 'Superadmin Master'
          : Number(a.access_level) >= 70 || a.role === 'moderator'
          ? 'Moderador'
          : 'Suporte Técnico';
      registerOrMergeCanonicalUser({
        id: `adm-${a.id}`,
        originalId: a.id,
        kind: 'admin',
        name: fullName,
        username: usr,
        cpf: a.cpf || '',
        phone: a.phone_whatsapp || (a as any).phone || '—',
        phoneSecondary: a.phone_secondary || a.phone_whatsapp || (a as any).phone || '—',
        email: cleanEmail || '—',
        password: a.password || (a as any).password_hash || '',
        roleLabel: 'Administrador',
        roleBadgeClass: 'text-purple-700 dark:text-purple-400 font-bold',
        accessLevel: resolvedAdminAccessLevel,
        address: a.address || '',
        streetNumber: a.street_number || '',
        complement: a.complement || '',
        neighborhood: a.neighborhood || '',
        city: a.city || 'São Paulo',
        state: a.state || 'SP',
        cep: a.cep || '',
        latitude: (a as any).latitude ?? null,
        longitude: (a as any).longitude ?? null,
        dependentsCount: Number(a.dependents_count) || 0,
        appointmentsCount: Number(a.total_appointments) || 0,
        relationInfo: 'Governança Master',
        isActive: a.is_active !== false,
        statusLabel: a.is_active !== false ? 'Ativo' : 'Inativo',
        avatarUrl: a.avatar_url,
        createdAt: a.created_at || '',
        originLabel: admOrigin.label,
        originBadgeClass: admOrigin.badgeClass,
        rawData: { kind: 'admin', data: a },
      });
    });

    (salonUsers || []).forEach((su) => {
      const fullName = su.full_name || (su as any).name || 'Gestor de Salão';
      const cleanEmail = su.email || '';
      let usr = (su.username || '').replace(/^@+/, '');
      if (!usr) {
        usr = cleanEmail ? cleanEmail.split('@')[0] : fullName.toLowerCase().replace(/\s+/g, '');
      }
      const salonSlug = su.salon_slug || (su as any).salons?.slug || 'parceiro';
      const suOrigin = resolveRecordOriginInfo(su.created_via || 'mnvapp', su.created_at);
      registerOrMergeCanonicalUser({
        id: `sln-${su.id}`,
        originalId: su.id,
        kind: 'salon_user',
        name: fullName,
        username: usr,
        cpf: su.cpf || '',
        phone: su.phone_whatsapp || (su as any).phone || '—',
        phoneSecondary: su.phone_secondary || su.phone_whatsapp || (su as any).phone || '—',
        email: cleanEmail || '—',
        password: su.password || (su as any).password_hash || '',
        roleLabel: 'Proprietário',
        roleBadgeClass: 'text-amber-700 dark:text-amber-400 font-bold',
        accessLevel: String(su.access_level || (su.role === 'owner' ? 'Proprietário (Dono)' : su.role === 'manager' ? 'Gerente Geral' : 'Recepção & Atendimento')),
        address: su.address || '',
        streetNumber: su.street_number || '',
        complement: su.complement || '',
        neighborhood: su.neighborhood || '',
        city: su.city || 'São Paulo',
        state: su.state || 'SP',
        cep: su.cep || '',
        latitude: (su as any).latitude ?? null,
        longitude: (su as any).longitude ?? null,
        dependentsCount: Number(su.dependents_count) || 0,
        appointmentsCount: Number(su.total_appointments) || 0,
        relationInfo: `${salonSlug}.vagouapp.com`,
        isActive: su.is_active !== false,
        statusLabel: su.is_active !== false ? 'Ativo' : 'Inativo',
        avatarUrl: su.avatar_url,
        createdAt: su.created_at || '',
        originLabel: suOrigin.label,
        originBadgeClass: suOrigin.badgeClass,
        rawData: { kind: 'salon_user', data: su },
      });
    });

    (professionals || []).forEach((p) => {
      const fullName = p.full_name || (p as any).name || 'Profissional';
      const cleanEmail = p.email || '';
      const nick = p.nickname || '';
      let usr = (p.username || '').replace(/^@+/, '');
      if (!usr) {
        usr = nick ? nick.toLowerCase().replace(/\s+/g, '') : (cleanEmail ? cleanEmail.split('@')[0] : fullName.toLowerCase().replace(/\s+/g, ''));
      }
      const salonName = p.current_salon_name || (p as any).salons?.trade_name || 'Sem Salão Ativo';
      const isAct = p.status === 'active' || (p as any).is_active === true;
      const profOrigin = resolveRecordOriginInfo(p.created_via || (p.current_salon_id ? 'mnvapp' : undefined), p.created_at);
      registerOrMergeCanonicalUser({
        id: `prof-${p.id}`,
        originalId: p.id,
        kind: 'professional',
        name: fullName,
        username: usr,
        cpf: p.cpf || p.document_number || '',
        phone: p.phone_whatsapp || (p as any).phone || '—',
        phoneSecondary: p.phone_secondary || p.phone_whatsapp || (p as any).phone || '—',
        email: cleanEmail || '—',
        password: p.password || (p as any).password_hash || '',
        roleLabel: 'Profissional',
        roleBadgeClass: 'text-blue-700 dark:text-blue-400 font-bold',
        accessLevel: String(p.access_level || (p.contract_type === 'partner_mei' ? 'MEI Parceiro' : 'CLT Profissional')),
        address: p.address || '',
        streetNumber: p.street_number || '',
        complement: p.complement || '',
        neighborhood: p.neighborhood || '',
        city: p.city || 'São Paulo',
        state: p.state || 'SP',
        cep: p.cep || '',
        latitude: (p as any).latitude ?? null,
        longitude: (p as any).longitude ?? null,
        dependentsCount: Number(p.dependents_count) || 0,
        appointmentsCount: Number(p.total_appointments || p.total_services_done) || 0,
        relationInfo: salonName,
        isActive: isAct,
        statusLabel: isAct ? 'Ativo' : 'Suspenso',
        avatarUrl: p.avatar_url,
        createdAt: p.created_at || '',
        originLabel: profOrigin.label,
        originBadgeClass: profOrigin.badgeClass,
        rawData: { kind: 'professional', data: p },
      });
    });

    (clients || []).forEach((c) => {
      const depCount = Array.isArray(c.dependents) ? c.dependents.length : (Number(c.dependents_count) || 0);
      const fullName = c.full_name || (c as any).name || 'Cliente';
      const cleanEmail = c.email || '';
      let usr = (c.username || '').replace(/^@+/, '');
      if (!usr) {
        usr = cleanEmail ? cleanEmail.split('@')[0] : fullName.toLowerCase().replace(/\s+/g, '');
      }
      const configuredCodes = Array.isArray(c.security_questions_configured)
        ? c.security_questions_configured
        : c.security_question_code
        ? [c.security_question_code]
        : [];
      const hasSecQuestion = Boolean(c.has_security_question || c.security_question_code || configuredCodes.length > 0);
      const clientOrigin = resolveRecordOriginInfo(c.created_via || c.origin_type, c.created_at);

      registerOrMergeCanonicalUser({
        id: `cli-${c.id}`,
        originalId: c.id,
        kind: 'client',
        name: fullName,
        username: usr,
        cpf: c.cpf || '',
        phone: c.phone || '—',
        phoneSecondary: c.phone_secondary || c.phone || '—',
        email: cleanEmail || '—',
        password: c.password || (c as any).password_hash || '',
        roleLabel: 'Cliente',
        roleBadgeClass: 'text-emerald-700 dark:text-emerald-400 font-bold',
        accessLevel: String(c.access_level || 'Cliente Titular'),
        address: c.address || '',
        streetNumber: c.street_number || '',
        complement: c.complement || '',
        neighborhood: c.neighborhood || '',
        city: c.city || 'São Paulo',
        state: c.state || 'SP',
        cep: c.cep || '',
        latitude: (c as any).latitude ?? null,
        longitude: (c as any).longitude ?? null,
        dependentsCount: depCount,
        appointmentsCount: Number(c.total_appointments) || 0,
        relationInfo: depCount > 0 ? `${depCount} dependentes` : `${Number(c.total_appointments) || 0} agendamentos`,
        isActive: c.is_active !== undefined ? !!c.is_active : true,
        statusLabel: c.is_active !== false ? 'Ativo' : 'Inativo',
        avatarUrl: c.avatar_url,
        hasSecurityQuestion: hasSecQuestion,
        securityQuestionsConfigured: configuredCodes,
        securityQuestionCode: c.security_question_code || null,
        createdAt: c.created_at || '',
        originLabel: clientOrigin.label,
        originBadgeClass: clientOrigin.badgeClass,
        rawData: { kind: 'client', data: c },
      });

      const deps = Array.isArray(c.dependents) ? c.dependents : [];
      deps.forEach((d: any) => {
        const relLabel = d.relationship === 'son' ? 'Filho(a)' : d.relationship === 'spouse' ? 'Cônjuge' : d.relationship === 'parent' ? 'Pai/Mãe' : 'Dependente';
        const dName = d.full_name || d.name || 'Dependente';
        const isAct = !d.is_unlinked;
        const depCreatedAt = d.created_at || c.created_at || '';
        const depOrigin = resolveRecordOriginInfo(d.created_via || c.created_via || c.origin_type, depCreatedAt);
        list.push({
          id: `dep-${d.id}`,
          originalId: d.id,
          kind: 'dependent',
          name: dName,
          username: relLabel,
          cpf: d.cpf || '',
          phone: c.phone || '—',
          phoneSecondary: '',
          email: c.email || '—',
          password: '—',
          roleLabel: 'Dependente',
          roleBadgeClass: 'text-teal-700 dark:text-teal-400 font-bold',
          accessLevel: `Conta Família (${fullName})`,
          address: c.address || '',
          streetNumber: c.street_number || '',
          complement: c.complement || '',
          neighborhood: c.neighborhood || '',
          city: c.city || 'São Paulo',
          state: c.state || 'SP',
          cep: c.cep || '',
          latitude: (c as any).latitude ?? null,
          longitude: (c as any).longitude ?? null,
          dependentsCount: 0,
          appointmentsCount: 0,
          relationInfo: `Titular: ${fullName}`,
          isActive: isAct,
          statusLabel: isAct ? 'Ativo' : 'Desvinculado',
          avatarUrl: undefined,
          createdAt: depCreatedAt,
          originLabel: depOrigin.label,
          originBadgeClass: depOrigin.badgeClass,
          rawData: { kind: 'client', data: c } as any,
        });
      });
    });

    return list.sort((a, b) => {
      const ta = formatCreatedAtParts(a.createdAt).timestampMs;
      const tb = formatCreatedAtParts(b.createdAt).timestampMs;
      return tb - ta;
    });
  }, [clients, professionals, salonUsers, admins]);

  const isOwnerUser = (u: UnifiedUserRow) =>
    u.kind === 'salon_user' || String(u.accessLevel || '').toLowerCase().includes('proprietário');

  const adminsCount = useMemo(() => allUnifiedUsers.filter((u) => u.kind === 'admin').length, [allUnifiedUsers]);
  const clientsCount = useMemo(() => allUnifiedUsers.filter((u) => u.kind === 'client').length, [allUnifiedUsers]);
  const dependentsCount = useMemo(() => allUnifiedUsers.filter((u) => u.kind === 'dependent').length, [allUnifiedUsers]);
  const professionalsCount = useMemo(() => allUnifiedUsers.filter((u) => u.kind === 'professional').length, [allUnifiedUsers]);
  const salonUsersCount = useMemo(() => allUnifiedUsers.filter(isOwnerUser).length, [allUnifiedUsers]);

  const activeUsersCount = useMemo(() => allUnifiedUsers.filter((u) => u.isActive).length, [allUnifiedUsers]);
  const inactiveUsersCount = useMemo(() => allUnifiedUsers.filter((u) => !u.isActive).length, [allUnifiedUsers]);

  const activeSearch = searchQuery.trim().toLowerCase();

  const filteredUsers = useMemo(() => {
    return allUnifiedUsers.filter((u) => {

      if (categoryFilter !== 'all') {
        if (categoryFilter === 'admins' && u.kind !== 'admin') return false;
        if (categoryFilter === 'clients' && u.kind !== 'client') return false;
        if (categoryFilter === 'dependents' && u.kind !== 'dependent') return false;
        if (categoryFilter === 'professionals' && u.kind !== 'professional') return false;
        if (categoryFilter === 'salon_users' && !isOwnerUser(u)) return false;
      }

      if (statusFilter !== 'all') {
        if (statusFilter === 'active' && !u.isActive) return false;
        if (statusFilter === 'inactive' && u.isActive) return false;
      }

      if (activeSearch) {
        const matchName = String(u.name || '').toLowerCase().includes(activeSearch);
        const matchUser = String(u.username || '').toLowerCase().includes(activeSearch);
        const matchEmail = String(u.email || '').toLowerCase().includes(activeSearch);
        const matchPhone = String(u.phone || '').includes(activeSearch);
        const matchSecPhone = String(u.phoneSecondary || '').includes(activeSearch);
        const matchRole = String(u.accessLevel || '').toLowerCase().includes(activeSearch);
        const matchKind = String(u.roleLabel || '').toLowerCase().includes(activeSearch);
        if (!matchName && !matchUser && !matchEmail && !matchPhone && !matchSecPhone && !matchRole && !matchKind) {
          return false;
        }
      }

      return true;
    });
  }, [allUnifiedUsers, categoryFilter, statusFilter, activeSearch]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredUsers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredUsers.map((u) => u.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkActivate = () => {
    selectedIds.forEach((id) => {
      const item = allUnifiedUsers.find((u) => u.id === id);
      if (item) {
        handleToggleGenericStatus(item.kind, item.originalId, true);
      }
    });
    setSelectedIds([]);
    triggerFeedback(`${selectedIds.length} contas foram ativadas.`);
  };

  const handleBulkSuspend = () => {
    selectedIds.forEach((id) => {
      const item = allUnifiedUsers.find((u) => u.id === id);
      if (item) {
        handleToggleGenericStatus(item.kind, item.originalId, false);
      }
    });
    setSelectedIds([]);
    triggerFeedback(`${selectedIds.length} contas foram suspensas.`);
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleting(true);

    try {
      const itemsToDelete = allUnifiedUsers
        .filter((u) => selectedIds.includes(u.id))
        .map((u) => ({ kind: u.kind, id: u.originalId }));

      await batchDeleteUnifiedUsers(itemsToDelete);

      const deletedIdsSet = new Set(itemsToDelete.map((it) => it.id));
      setClients((prev) => prev.filter((c) => !deletedIdsSet.has(c.id)));
      setProfessionals((prev) => prev.filter((p) => !deletedIdsSet.has(p.id)));
      setSalonUsers((prev) => prev.filter((su) => !deletedIdsSet.has(su.id)));
      setAdmins((prev) => prev.filter((a) => !deletedIdsSet.has(a.id)));

      const totalRemoved = itemsToDelete.length;
      setSelectedIds([]);
      setIsBulkDeleteModalOpen(false);
      triggerFeedback(
        `${totalRemoved} ${totalRemoved === 1 ? 'usuário excluído' : 'usuários excluídos'} com sucesso.`
      );
    } catch (err) {
      console.error('Erro na exclusão em massa:', err);
      triggerFeedback('Erro ao processar exclusão em massa.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Nome',
      'Nome Usuário',
      'WhatsApp',
      'Tipo',
      'E-mail',
      'Dependentes',
      'Agendamentos',
      'Criado em',
      'Origem',
      'Status',
    ];
    const rows = filteredUsers.map((u) => {
      const createdParts = formatCreatedAtParts(u.createdAt);
      return [
        `"${u.originalId}"`,
        `"${u.name}"`,
        `"${u.username}"`,
        `"${u.phone}"`,
        `"${u.roleLabel}"`,
        `"${u.email}"`,
        `"${u.dependentsCount}"`,
        `"${u.appointmentsCount}"`,
        `"${createdParts.csvLabel}"`,
        `"${u.originLabel}"`,
        `"${u.statusLabel}"`,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `usuarios-vagouapp-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return {
        label: 'Ativo',
        className: 'text-emerald-700 dark:text-emerald-400 font-bold',
        dot: 'bg-emerald-500 dark:bg-emerald-400',
      };
    }
    return {
      label: 'Inativo',
      className: 'text-rose-700 dark:text-rose-400 font-bold',
      dot: 'bg-rose-500 dark:bg-rose-400',
    };
  };

  if (selectedUserDetail) {
    return (
      <AdminUserDetailView
        user={selectedUserDetail}
        onBack={() => setSelectedUserDetail(null)}
        onToggleStatus={(kind, id, nextStatus) => handleToggleGenericStatus(kind, id, nextStatus)}
        onUnlinkDependent={handleUnlinkDependent}
        onUnlinkProfessional={handleUnlinkProfessional}
        onPromoteAdmin={handlePromoteAdmin}
      />
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">

      <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 lg:px-6 py-2.5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 z-10 transition-colors shadow-2xs dark:shadow-none">

        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 mr-1">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight whitespace-nowrap">
              Usuários
            </h2>
          </div>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block mx-0.5" />

          <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 focus-within:border-emerald-500 transition shadow-xs dark:shadow-none">
            <Tag className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mr-1.5 shrink-0" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as UserCategoryFilter)}
              className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer pr-1"
              title="Filtrar por Categoria"
            >
              <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                Todas as contas ({allUnifiedUsers.length})
              </option>
              <option value="admins" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                Admin Sistema ({adminsCount})
              </option>
              <option value="clients" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                Clientes ({clientsCount})
              </option>
              <option value="dependents" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                Dependentes ({dependentsCount})
              </option>
              <option value="professionals" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                Profissionais ({professionalsCount})
              </option>
              <option value="salon_users" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                Proprietários ({salonUsersCount})
              </option>
            </select>
          </div>

          <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 focus-within:border-emerald-500 transition shadow-xs dark:shadow-none">
            <Filter className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mr-1.5 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as UserStatusFilter)}
              className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer pr-1"
              title="Filtrar por Status"
            >
              <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                Status
              </option>
              <option value="active" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                Ativos ({activeUsersCount})
              </option>
              <option value="inactive" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                Inativos ({inactiveUsersCount})
              </option>
            </select>
          </div>

        </div>

        <div className="flex items-center justify-between lg:justify-end gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200 dark:border-slate-800">
          <button
            onClick={loadAll}
            disabled={isLoading}
            title="Recarregar usuários"
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer border border-slate-200 dark:border-slate-700 shadow-xs dark:shadow-none"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600 dark:text-emerald-400' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            title="Exportar para CSV"
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700 shadow-xs dark:shadow-none"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>

          <button
            onClick={() => setIsCreateAdminModalOpen(true)}
            title="Criar novo administrador do portal"
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700 shadow-xs dark:shadow-none"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>+ Admin</span>
          </button>

          <button
            onClick={() => setIsRegistrationModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95"
            title="Cadastrar novo usuário no ecossistema Vagou"
          >
            <Plus className="w-3.5 h-3.5 text-white" />
            <span>Cadastrar</span>
          </button>

          <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setViewMode('table')}
              title="Visualização em Tabela"
              className={`p-1.5 rounded-md transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              title="Visualização em Cartões"
              className={`p-1.5 rounded-md transition cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 p-0 m-0 overflow-hidden">

        {actionFeedback && (
          <div className="shrink-0 p-3 bg-emerald-50 dark:bg-emerald-500/10 border-b border-emerald-200 dark:border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-400 font-semibold animate-fadeIn flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{actionFeedback}</span>
          </div>
        )}

        {selectedIds.length > 0 && (
          <div className="shrink-0 p-3 bg-emerald-50 dark:bg-emerald-950/90 border-b border-emerald-300 dark:border-emerald-500/50 flex flex-wrap items-center justify-between gap-2.5 animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {selectedIds.length} {selectedIds.length === 1 ? 'usuário selecionado' : 'usuários selecionados'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkActivate}
                className="px-3 py-1 rounded-lg bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs transition cursor-pointer shadow-xs active:scale-95"
              >
                Ativar Todos
              </button>

              <button
                onClick={handleBulkSuspend}
                className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/80 text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 font-semibold text-xs transition cursor-pointer border border-amber-200 dark:border-amber-900/50"
              >
                Suspender Todos
              </button>

              <button
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
                title="Excluir permanentemente todos os usuários selecionados"
              >
                <Trash2 className="w-3.5 h-3.5 text-white" />
                <span>Excluir Selecionados</span>
              </button>

              <button
                onClick={() => setSelectedIds([])}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-2 py-1 transition cursor-pointer"
                title="Desmarcar todos os usuários"
              >
                Desmarcar
              </button>
            </div>
          </div>
        )}

        {viewMode === 'table' && (
          <div className="flex-1 overflow-auto min-h-0 custom-scrollbar w-full bg-white dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-800/80">
            <table className="w-full text-left text-xs min-w-[780px] border-separate border-spacing-0">
              <thead className="sticky top-0 z-20">
                <tr>
                  <th className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-900 py-2.5 px-3 w-10 text-center border-b border-r border-slate-200/90 dark:border-slate-800/90 backdrop-blur-xs select-none">
                    <button
                      onClick={toggleSelectAll}
                      className="cursor-pointer text-slate-400 hover:text-emerald-500 transition flex items-center justify-center mx-auto"
                      title="Selecionar todos os usuários listados"
                    >
                      {selectedIds.length > 0 && selectedIds.length === filteredUsers.length ? (
                        <CheckSquare className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-900 py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-r border-slate-200/90 dark:border-slate-800/90 backdrop-blur-xs whitespace-nowrap">Nome</th>
                  <th className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-900 py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-r border-slate-200/90 dark:border-slate-800/90 backdrop-blur-xs whitespace-nowrap">Nome Usuário</th>
                  <th className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-900 py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-r border-slate-200/90 dark:border-slate-800/90 backdrop-blur-xs whitespace-nowrap">WhatsApp</th>
                  <th className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-900 py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-r border-slate-200/90 dark:border-slate-800/90 backdrop-blur-xs whitespace-nowrap">Tipo</th>
                  <th className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-900 py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-r border-slate-200/90 dark:border-slate-800/90 backdrop-blur-xs whitespace-nowrap">E-mail</th>
                  <th className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-900 py-2.5 px-3 font-semibold text-center text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-r border-slate-200/90 dark:border-slate-800/90 backdrop-blur-xs whitespace-nowrap">Depend.</th>
                  <th className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-900 py-2.5 px-3 font-semibold text-center text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-r border-slate-200/90 dark:border-slate-800/90 backdrop-blur-xs whitespace-nowrap">Agend.</th>
                  <th className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-900 py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-r border-slate-200/90 dark:border-slate-800/90 backdrop-blur-xs whitespace-nowrap">Criado em</th>
                  <th className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-900 py-2.5 px-3 font-semibold text-center text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200/90 dark:border-slate-800/90 backdrop-blur-xs whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500 dark:text-slate-400 border-b border-slate-200/70 dark:border-slate-800/75">
                      Nenhum usuário encontrado com os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelected = selectedIds.includes(user.id);
                    const statusBadge = getStatusBadge(user.isActive);
                    const createdParts = formatCreatedAtParts(user.createdAt);

                    return (
                      <tr
                        key={user.id}
                        onClick={() => handleOpenGeneralModal(user)}
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                            : 'bg-white dark:bg-slate-950 even:bg-slate-50/45 dark:even:bg-slate-900/45 hover:bg-emerald-50/35 dark:hover:bg-emerald-500/10'
                        }`}
                        title="Clique na linha para abrir os Dados Gerais do usuário"
                      >

                        <td
                          className="py-2.5 px-3 text-center border-b border-r border-slate-200/70 dark:border-slate-800/75"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectOne(user.id);
                          }}
                        >
                          <button className="cursor-pointer text-slate-400 hover:text-emerald-500 transition flex items-center justify-center mx-auto">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        <td className="py-2.5 px-3 border-b border-r border-slate-200/70 dark:border-slate-800/75">
                          <div className="flex items-center gap-2.5">
                            <UserAvatar name={user.name} photoUrl={user.avatarUrl} size="sm" />
                            <div className="min-w-0">
                              <strong className="text-slate-900 dark:text-white block font-medium truncate max-w-[170px]">
                                {user.name}
                              </strong>
                              {user.cpf && (
                                <span className="text-[10px] text-slate-400 font-mono block">
                                  CPF: {user.cpf}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 border-b border-r border-slate-200/70 dark:border-slate-800/75">
                          <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 truncate block max-w-[140px]">
                            {user.username}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 border-b border-r border-slate-200/70 dark:border-slate-800/75">
                          <div className="flex items-center gap-1.5 font-mono text-slate-800 dark:text-slate-200">
                            <Phone className="w-3 h-3 text-emerald-500 shrink-0" />
                            <span className="truncate max-w-[130px]">{user.phone}</span>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 border-b border-r border-slate-200/70 dark:border-slate-800/75">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center text-[11px] font-bold whitespace-nowrap ${user.roleBadgeClass}`}>
                              {user.roleLabel}
                            </span>
                            {user.kind === 'client' && (
                              <span
                                title={
                                  user.hasSecurityQuestion
                                    ? 'Pergunta secreta configurada'
                                    : 'Pergunta secreta não configurada'
                                }
                                className={`inline-flex items-center gap-1 text-[10px] font-semibold whitespace-nowrap ${
                                  user.hasSecurityQuestion
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-slate-400 dark:text-slate-500'
                                }`}
                              >
                                <KeyRound className={`w-3 h-3 ${user.hasSecurityQuestion ? 'text-emerald-500' : 'text-slate-400'}`} />
                                <span>{user.hasSecurityQuestion ? 'Seg. OK' : 'S/ Seg.'}</span>
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-2.5 px-3 border-b border-r border-slate-200/70 dark:border-slate-800/75">
                          <span className="text-slate-700 dark:text-slate-300 font-mono text-[11px] block truncate max-w-[160px]">
                            {user.email}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-center border-b border-r border-slate-200/70 dark:border-slate-800/75">
                          <span
                            className={`inline-block text-[11px] font-bold font-mono ${
                              user.dependentsCount > 0
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-slate-400 dark:text-slate-500'
                            }`}
                          >
                            {user.dependentsCount}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-center border-b border-r border-slate-200/70 dark:border-slate-800/75">
                          <span
                            className={`inline-block text-[11px] font-bold font-mono ${
                              user.appointmentsCount > 0
                                ? 'text-blue-700 dark:text-blue-400'
                                : 'text-slate-400 dark:text-slate-500'
                            }`}
                          >
                            {user.appointmentsCount}
                          </span>
                        </td>

                        <td
                          className="py-2.5 px-3 whitespace-nowrap border-b border-r border-slate-200/70 dark:border-slate-800/75"
                          title={`Criado em: ${createdParts.fullLabel} • Origem: ${user.originLabel}`}
                        >
                          {createdParts.valid ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                                <span>{createdParts.dateShort}</span>
                                <Clock className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span className="text-emerald-700 dark:text-emerald-400">{createdParts.timeShort}</span>
                              </div>
                              <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400 block">
                                {user.originLabel}
                              </span>
                            </div>
                          ) : (
                            <span className="font-mono text-[11px] text-slate-400">—</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-center border-b border-slate-200/70 dark:border-slate-800/75">
                          <span
                            className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${statusBadge.className}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                            {statusBadge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

      {viewMode === 'cards' && (
        <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar p-4 lg:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredUsers.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500 dark:text-slate-400 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              Nenhum usuário encontrado com os filtros aplicados.
            </div>
          ) : (
            filteredUsers.map((user) => {
              const isSelected = selectedIds.includes(user.id);
              const statusBadge = getStatusBadge(user.isActive);
              const createdParts = formatCreatedAtParts(user.createdAt);

              return (
                <div
                  key={user.id}
                  onClick={() => handleOpenGeneralModal(user)}
                  className={`p-4 rounded-xl bg-white dark:bg-slate-900 border transition flex flex-col justify-between shadow-xs dark:shadow-none group w-full cursor-pointer ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 dark:hover:border-emerald-500/50'
                  }`}
                  title={`Clique para abrir os dados gerais de ${user.name}`}
                >
                  <div>

                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectOne(user.id);
                          }}
                          className="cursor-pointer text-slate-400 hover:text-emerald-500 transition shrink-0"
                          title={isSelected ? 'Desmarcar' : 'Selecionar'}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                        <div className="relative">
                          <UserAvatar name={user.name} photoUrl={user.avatarUrl} size="lg" />
                          <div
                            className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                              user.isActive ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge.className}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                          {statusBadge.label}
                        </span>

                        <button
                          onClick={() => handleOpenGeneralModal(user)}
                          className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                          title="Editar Dados Gerais"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 dark:text-white tracking-tight line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                      {user.name}
                    </h3>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block font-mono font-semibold">
                      {user.username}
                    </span>

                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded border inline-block ${user.roleBadgeClass}`}>
                        {user.roleLabel}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium">
                        {user.accessLevel}
                      </span>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <div className="flex items-center justify-between">
                        <span>WhatsApp:</span>
                        <span className="font-mono text-slate-800 dark:text-slate-300 font-medium truncate max-w-[140px]">
                          {user.phone}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Dependentes:</span>
                        <span className="font-mono text-slate-800 dark:text-slate-300 font-bold">
                          {user.dependentsCount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Agendamentos:</span>
                        <span className="font-mono text-slate-800 dark:text-slate-300 font-bold">
                          {user.appointmentsCount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between" title={`${createdParts.fullLabel} • ${user.originLabel}`}>
                        <span>Criado em:</span>
                        <span className="font-mono text-slate-800 dark:text-slate-300 font-semibold">
                          {createdParts.compactLabel}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleOpenGeneralModal(user)}
                      className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit className="w-3 h-3" />
                      <span>Editar</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          handleToggleGenericStatus(user.kind, user.originalId, !user.isActive)
                        }
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer border ${
                          user.isActive
                            ? 'bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'
                            : 'bg-[#20C933] hover:bg-[#1bb32d] text-white border-transparent'
                        }`}
                      >
                        {user.isActive ? 'Desativar' : 'Reativar'}
                      </button>

                      <button
                        onClick={() => handleDeleteUser(user.kind, user.originalId, user.name)}
                        className="p-1 rounded text-rose-500 hover:text-rose-700 dark:hover:text-rose-300 transition cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          </div>
        </div>
      )}

      {isGeneralModalOpen && selectedUserForModal && (
        <AdminUserGeneralDataModal
          user={selectedUserForModal}
          isOpen={isGeneralModalOpen}
          onClose={() => {
            setIsGeneralModalOpen(false);
            setSelectedUserForModal(null);
          }}
          onSave={handleSaveGeneralModal}
          onToggleStatus={(kind, id, nextStatus) => handleToggleGenericStatus(kind, id, nextStatus)}
          onDelete={(kind, id) => handleDeleteUser(kind, id, selectedUserForModal.name, true)}
          onSecurityReset={() => {
            loadAll();
            triggerFeedback('Segurança da conta redefinida no Supabase com sucesso.');
          }}
        />
      )}

      {userPendingDelete &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 space-y-3 animate-scaleUp">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                    Excluir "{userPendingDelete.name}"?
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Remove o registro e os acessos vinculados.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setUserPendingDelete(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() =>
                    executeDeleteUser(userPendingDelete.kind, userPendingDelete.id, userPendingDelete.name)
                  }
                  className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5 text-white" />
                  <span>Excluir</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      <AdminCreateAdminModal
        isOpen={isCreateAdminModalOpen}
        onClose={() => setIsCreateAdminModalOpen(false)}
        onSuccess={(newAdmin) => {
          setAdmins((prev) => [newAdmin, ...prev]);
          triggerFeedback(`Novo administrador ${newAdmin.username.replace(/^@+/, '')} cadastrado com sucesso!`);
        }}
      />

      {isRegistrationModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
            <div className="w-full max-w-md relative my-auto max-h-[92vh] overflow-y-auto">
              <TriadeUserRegisterForm
                origin="admin"
                variant="card"
                onClose={() => setIsRegistrationModalOpen(false)}
                onSuccess={() => {
                  setIsRegistrationModalOpen(false);
                  loadAll();
                  triggerFeedback('Novo usuário cadastrado com sucesso!');
                }}
              />
            </div>
          </div>,
          document.body
        )}

      {isBulkDeleteModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-5 space-y-3.5 animate-scaleUp">
              <div className="flex items-start justify-between gap-3 text-rose-600 dark:text-rose-400">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                      Excluir {selectedIds.length} {selectedIds.length === 1 ? 'Usuário Selecionado' : 'Usuários Selecionados'}?
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Ação em massa irreversível no banco de dados.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteModalOpen(false)}
                  disabled={isBulkDeleting}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
                  title="Fechar"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  Os seguintes <strong className="text-slate-900 dark:text-white">{selectedIds.length}</strong> usuários e todos os seus registros serão removidos permanentemente:
                </p>

                <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  {allUnifiedUsers
                    .filter((u) => selectedIds.includes(u.id))
                    .map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <UserAvatar name={u.name} photoUrl={u.avatarUrl} size="sm" />
                          <div className="min-w-0">
                            <span className="font-medium text-slate-900 dark:text-white block truncate max-w-[200px]">
                              {u.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              {u.username}
                            </span>
                          </div>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold shrink-0 ${u.roleBadgeClass}`}>
                          {u.roleLabel}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteModalOpen(false)}
                  disabled={isBulkDeleting}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition cursor-pointer border border-slate-200 dark:border-slate-700 shadow-xs dark:shadow-none"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBulkDelete}
                  disabled={isBulkDeleting}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-rose-950/20 disabled:opacity-50 active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5 text-white" />
                  <span>{isBulkDeleting ? 'Excluindo...' : 'Confirmar Exclusão em Massa'}</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
};
