import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  Save,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Phone,
  Mail,
  FileText,
  MapPin,
  Palette,
  Image as ImageIcon,
  Loader2,
  Receipt,
  Users,
  Clock,
  Plus,
  Trash2,
  UserCheck,
  ShieldAlert,
  Briefcase,
  Store,
  Calendar,
  Check,
  Crown,
  User,
  Sparkles,
} from 'lucide-react';
import { AdminSalonItem, DayOperatingHour } from '../../types/admin';

interface AdminEditSalonModalProps {
  isOpen: boolean;
  salon: AdminSalonItem | null;
  onClose: () => void;
  onSave: (salonId: string, updates: Partial<AdminSalonItem>) => Promise<boolean>;
}

export interface SalonTeamMember {
  id: string;
  fullName: string;
  email: string;
  phoneWhatsapp: string;
  role: 'owner' | 'manager' | 'collaborator' | 'reception' | 'sporadic' | 'other';
  specialty?: string;
  isActive: boolean;
}

const DEFAULT_OPERATING_HOURS: DayOperatingHour[] = [
  { day: 'monday', label: 'Segunda-feira', isOpen: true, openTime: '08:00', closeTime: '19:00', hasBreak: true, breakStart: '12:00', breakEnd: '13:00' },
  { day: 'tuesday', label: 'Terça-feira', isOpen: true, openTime: '08:00', closeTime: '19:00', hasBreak: true, breakStart: '12:00', breakEnd: '13:00' },
  { day: 'wednesday', label: 'Quarta-feira', isOpen: true, openTime: '08:00', closeTime: '19:00', hasBreak: true, breakStart: '12:00', breakEnd: '13:00' },
  { day: 'thursday', label: 'Quinta-feira', isOpen: true, openTime: '08:00', closeTime: '19:00', hasBreak: true, breakStart: '12:00', breakEnd: '13:00' },
  { day: 'friday', label: 'Sexta-feira', isOpen: true, openTime: '08:00', closeTime: '19:00', hasBreak: true, breakStart: '12:00', breakEnd: '13:00' },
  { day: 'saturday', label: 'Sábado', isOpen: true, openTime: '08:00', closeTime: '18:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' },
  { day: 'sunday', label: 'Domingo', isOpen: false, openTime: '09:00', closeTime: '14:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' },
];

export const AdminEditSalonModal: React.FC<AdminEditSalonModalProps> = ({
  isOpen,
  salon,
  onClose,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'business' | 'team' | 'hours'>('business');
  const [formData, setFormData] = useState<Partial<AdminSalonItem>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Operating hours state
  const [operatingHours, setOperatingHours] = useState<DayOperatingHour[]>(DEFAULT_OPERATING_HOURS);

  // Team state
  const [teamMembers, setTeamMembers] = useState<SalonTeamMember[]>([
    {
      id: 'tm-1',
      fullName: 'Anderson Silva',
      email: 'anderson@vagouapp.com',
      phoneWhatsapp: '(11) 99999-8888',
      role: 'owner',
      specialty: 'Master Barber & Proprietário',
      isActive: true,
    },
    {
      id: 'tm-2',
      fullName: 'Carlos Eduardo',
      email: 'carlos@vagouapp.com',
      phoneWhatsapp: '(11) 98888-7777',
      role: 'collaborator',
      specialty: 'Corte Degradê & Barba',
      isActive: true,
    },
  ]);

  // Form para adicionar novo membro na equipe
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<SalonTeamMember['role']>('collaborator');
  const [newMemberSpecialty, setNewMemberSpecialty] = useState('');
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    setLogoError(false);
  }, [formData.logo_url, salon?.id]);

  useEffect(() => {
    if (salon) {
      setFormData({
        trade_name: salon.trade_name || '',
        legal_name: salon.legal_name || '',
        slug: salon.slug || '',
        category: salon.category || 'salao',
        status: salon.status || 'active',
        is_verified: salon.is_verified ?? true,
        phone_whatsapp: salon.phone_whatsapp || '',
        phone_landline: salon.phone_landline || '',
        email: salon.email || '',
        document_number: salon.document_number || '',
        address: salon.address || '',
        neighborhood: salon.neighborhood || '',
        city: salon.city || '',
        state: salon.state || 'SP',
        cep: salon.cep || '',
        logo_url: salon.logo_url || '',
        primary_color: salon.primary_color || '#10B981',
        billing_plan: salon.billing_plan || 'per_booking',
        fee_per_booking: salon.fee_per_booking ?? 2.5,
        monthly_subscription_fee: salon.monthly_subscription_fee ?? 89.9,
        billing_due_day: salon.billing_due_day ?? 10,
        pix_key: salon.pix_key || '',
      });

      if (salon.operating_hours && salon.operating_hours.length > 0) {
        setOperatingHours(salon.operating_hours);
      } else {
        setOperatingHours(DEFAULT_OPERATING_HOURS);
      }

      setStatusMessage(null);
      setActiveTab('business');
    }
  }, [salon, isOpen]);

  if (!isOpen || !salon) return null;

  const handleToggleDayOpen = (index: number) => {
    const updated = [...operatingHours];
    updated[index].isOpen = !updated[index].isOpen;
    setOperatingHours(updated);
  };

  const handleTimeChange = (index: number, field: keyof DayOperatingHour, value: any) => {
    const updated = [...operatingHours];
    (updated[index] as any)[field] = value;
    setOperatingHours(updated);
  };

  const handleApplyCommercialHoursBatch = () => {
    const updated = operatingHours.map((h) => {
      if (h.day === 'sunday') return h;
      if (h.day === 'saturday') return { ...h, isOpen: true, openTime: '08:00', closeTime: '18:00' };
      return { ...h, isOpen: true, openTime: '08:00', closeTime: '19:00', hasBreak: true, breakStart: '12:00', breakEnd: '13:00' };
    });
    setOperatingHours(updated);
  };

  const handleAddTeamMember = () => {
    if (!newMemberName.trim()) return;
    const newMember: SalonTeamMember = {
      id: `tm-${Date.now()}`,
      fullName: newMemberName.trim(),
      email: newMemberEmail.trim().toLowerCase(),
      phoneWhatsapp: newMemberPhone.trim(),
      role: newMemberRole,
      specialty: newMemberSpecialty.trim(),
      isActive: true,
    };
    setTeamMembers([...teamMembers, newMember]);
    setNewMemberName('');
    setNewMemberEmail('');
    setNewMemberPhone('');
    setNewMemberSpecialty('');
    setShowAddMember(false);
  };

  const handleRemoveTeamMember = (id: string) => {
    setTeamMembers(teamMembers.filter((m) => m.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const updates = {
        ...formData,
        operating_hours: operatingHours,
      };

      const success = await onSave(salon.id, updates);
      if (success) {
        setStatusMessage({ type: 'success', text: 'Estabelecimento atualizado no Supabase com sucesso!' });
        setTimeout(() => {
          onClose();
        }, 900);
      } else {
        setStatusMessage({ type: 'error', text: 'Não foi possível salvar as alterações no banco.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Erro inesperado na sincronização com o banco.' });
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleBadge = (role: SalonTeamMember['role']) => {
    switch (role) {
      case 'owner':
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1"><Crown className="w-3 h-3" /> Proprietário</span>;
      case 'manager':
        return <span className="bg-purple-500/10 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1"><Briefcase className="w-3 h-3" /> Gerente</span>;
      case 'collaborator':
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1"><UserCheck className="w-3 h-3" /> Colaborador</span>;
      case 'reception':
        return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1"><Phone className="w-3 h-3" /> Recepção</span>;
      case 'sporadic':
        return <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1"><Clock className="w-3 h-3" /> Esporádico</span>;
      default:
        return <span className="bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">Outros</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden transition-colors">
        
        {/* HEADER MODAL COM RETÂNGULO DE LOGOTIPO PROVISÓRIO */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/90">
          <div className="flex items-center gap-4">
            {/* RETÂNGULO DA LOGO (SUBSTITUI AVATAR CIRCULAR) */}
            <div className="w-24 h-14 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col items-center justify-center shrink-0 shadow-md relative group">
              {formData.logo_url && !logoError ? (
                <img
                  src={formData.logo_url}
                  alt={formData.trade_name}
                  className="w-full h-full object-contain p-1"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-500 gap-0.5">
                  <Store className="w-5 h-5 text-emerald-400/90" />
                  <span className="text-[9px] font-bold tracking-widest text-slate-400 uppercase font-mono">
                    LOGO
                  </span>
                </div>
              )}
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>{formData.trade_name || 'Editar Estabelecimento'}</span>
                <span className="text-[10px] font-mono font-normal text-slate-500 dark:text-slate-400">ID: {salon.id.slice(0, 8)}</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gestão centralizada do estabelecimento, equipe e grade de atendimento.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NAVEGAÇÃO DE ABAS INTERNAS */}
        <div className="flex items-center gap-1 p-2 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setActiveTab('business')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'business'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Dados do Negócio</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('team')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'team'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Equipe & Cargos</span>
            <span className="ml-1 px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded-full text-[10px]">
              {teamMembers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hours')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'hours'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Dias & Horários</span>
          </button>
        </div>

        {/* CONTEÚDO DAS ABAS */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-white dark:bg-slate-900">
          {statusMessage && (
            <div
              className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* ABA 1: DADOS DO NEGÓCIO */}
          {activeTab === 'business' && (
            <div className="space-y-5 animate-fadeIn">
              {/* Section 1: Identidade Básica */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  Identidade do Negócio
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Nome Fantasia *</label>
                    <input
                      type="text"
                      required
                      value={formData.trade_name || ''}
                      onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none shadow-xs dark:shadow-none transition"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Razão Social / Titular</label>
                    <input
                      type="text"
                      value={formData.legal_name || ''}
                      onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none shadow-xs dark:shadow-none transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Subdomínio (Slug) *</label>
                    <div className="flex items-center bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 rounded-lg px-2.5 py-1.5 shadow-xs dark:shadow-none transition">
                      <Globe className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 mr-1.5 shrink-0" />
                      <input
                        type="text"
                        required
                        value={formData.slug || ''}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                        className="w-full bg-transparent text-xs text-slate-900 dark:text-white outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Categoria / Segmento</label>
                    <select
                      value={formData.category || 'salao'}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none shadow-xs dark:shadow-none transition"
                    >
                      <option value="barbearia">Barbearia</option>
                      <option value="salao">Salão de Beleza</option>
                      <option value="estetica">Estética & Spa</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Status Cadastral</label>
                    <select
                      value={formData.status || 'active'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none shadow-xs dark:shadow-none transition font-semibold"
                    >
                      <option value="active">Ativo (Aprovado)</option>
                      <option value="pending">Pendente (Moderação)</option>
                      <option value="incomplete">Incompleto</option>
                      <option value="suspended">Suspenso</option>
                    </select>
                  </div>
                </div>

                {/* Selo Verificado */}
                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.is_verified)}
                      onChange={(e) => setFormData({ ...formData, is_verified: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-500 focus:ring-0 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 accent-emerald-500 cursor-pointer"
                    />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                      Conceder Selo Oficial de Verificado (Exibido no perfil e nos cards do feed)
                    </span>
                  </label>
                </div>
              </div>

              {/* Section 2: Contato Comercial */}
              <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  Contato Comercial & Documentação
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">WhatsApp Comercial</label>
                    <div className="flex items-center bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 rounded-lg px-2.5 py-1.5 shadow-xs dark:shadow-none transition">
                      <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 mr-1.5 shrink-0" />
                      <input
                        type="text"
                        value={formData.phone_whatsapp || ''}
                        onChange={(e) => setFormData({ ...formData, phone_whatsapp: e.target.value })}
                        className="w-full bg-transparent text-xs text-slate-900 dark:text-white outline-none font-mono"
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">E-mail do Salão</label>
                    <div className="flex items-center bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 rounded-lg px-2.5 py-1.5 shadow-xs dark:shadow-none transition">
                      <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 mr-1.5 shrink-0" />
                      <input
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-transparent text-xs text-slate-900 dark:text-white outline-none"
                        placeholder="contato@salao.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">CPF ou CNPJ</label>
                    <div className="flex items-center bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 rounded-lg px-2.5 py-1.5 shadow-xs dark:shadow-none transition">
                      <FileText className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 mr-1.5 shrink-0" />
                      <input
                        type="text"
                        value={formData.document_number || ''}
                        onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                        className="w-full bg-transparent text-xs text-slate-900 dark:text-white outline-none font-mono"
                        placeholder="00.000.000/0001-00"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Endereço do Salão */}
              <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  Endereço Comercial do Salão (Usado pelo Radar do Portal)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Logradouro & Número</label>
                    <input
                      type="text"
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                      placeholder="Av. Paulista, 1578"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Bairro</label>
                    <input
                      type="text"
                      value={formData.neighborhood || ''}
                      onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                      placeholder="Bela Vista"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Cidade</label>
                    <input
                      type="text"
                      value={formData.city || ''}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">UF</label>
                    <input
                      type="text"
                      maxLength={2}
                      value={formData.state || 'SP'}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none uppercase font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">CEP</label>
                    <input
                      type="text"
                      value={formData.cep || ''}
                      onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none font-mono"
                      placeholder="01310-200"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Branding (Logo) */}
              <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5" />
                  Logotipo & Branding da Empresa
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">URL do Logotipo</label>
                    <div className="flex items-center bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 rounded-lg px-2.5 py-1.5 shadow-xs dark:shadow-none transition">
                      <ImageIcon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 mr-1.5 shrink-0" />
                      <input
                        type="url"
                        value={formData.logo_url || ''}
                        onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                        className="w-full bg-transparent text-xs text-slate-900 dark:text-white outline-none"
                        placeholder="https://exemplo.com/logo.png"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Cor Primária (HEX)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.primary_color || '#10B981'}
                        onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                        className="w-8 h-8 rounded border border-slate-300 dark:border-slate-700 bg-transparent cursor-pointer shrink-0"
                      />
                      <input
                        type="text"
                        value={formData.primary_color || '#10B981'}
                        onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: EQUIPE & PROFISSIONAIS POR CARGO */}
          {activeTab === 'team' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-500" />
                    <span>Membros da Equipe Organizados por Cargo</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Proprietários, gerentes, colaboradores e esporádicos do estabelecimento.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddMember(!showAddMember)}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Membro</span>
                </button>
              </div>

              {/* Sub-formulario de Adicionar Profissional */}
              {showAddMember && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 animate-fadeIn">
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">Cadastrar Novo Membro da Equipe</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Nome Completo *"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-500"
                    />
                    <input
                      type="email"
                      placeholder="E-mail Pessoal *"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="tel"
                      placeholder="WhatsApp *"
                      value={newMemberPhone}
                      onChange={(e) => setNewMemberPhone(e.target.value)}
                      className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-500"
                    />

                    <select
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value as any)}
                      className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg py-2 px-2 text-xs text-slate-900 dark:text-white"
                    >
                      <option value="owner">Proprietário / Titular</option>
                      <option value="manager">Gerente / Gestor</option>
                      <option value="collaborator">Colaborador / Profissional</option>
                      <option value="reception">Recepção / Atendimento</option>
                      <option value="sporadic">Esporádico / Parceiro</option>
                      <option value="other">Outros</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Especialidade (Ex: Cabelo/Barba)"
                      value={newMemberSpecialty}
                      onChange={(e) => setNewMemberSpecialty(e.target.value)}
                      className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddMember(false)}
                      className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleAddTeamMember}
                      className="px-3.5 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold"
                    >
                      Vincular à Equipe
                    </button>
                  </div>
                </div>
              )}

              {/* Lista de Membros da Equipe por Cargo */}
              <div className="space-y-3">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold text-xs shrink-0">
                        {member.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{member.fullName}</span>
                          {getRoleBadge(member.role)}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {member.email} • {member.phoneWhatsapp} {member.specialty ? `• ${member.specialty}` : ''}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveTeamMember(member.id)}
                      className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Desvincular da equipe"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABA 3: DIAS & HORÁRIOS DE ATENDIMENTO (GRADE FLEXÍVEL) */}
          {activeTab === 'hours' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-500" />
                    <span>Grade Semanal de Funcionamento do Estabelecimento</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Defina horários de abertura, fechamento e almoço para cada dia da semana.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleApplyCommercialHoursBatch}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Horário Comercial Padrão</span>
                </button>
              </div>

              {/* Tabela Interativa dos Dias da Semana */}
              <div className="space-y-2.5">
                {operatingHours.map((item, idx) => (
                  <div
                    key={item.day}
                    className={`p-3 rounded-xl border transition-all ${
                      item.isOpen
                        ? 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                        : 'bg-slate-100/50 dark:bg-slate-950/40 border-slate-200/60 dark:border-slate-900 opacity-60'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Dia & Switch */}
                      <div className="flex items-center gap-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.isOpen}
                            onChange={() => handleToggleDayOpen(idx)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-300 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>

                        <span className={`text-xs font-bold ${item.isOpen ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500 line-through'}`}>
                          {item.label}
                        </span>
                      </div>

                      {/* Configuração de Horários se Aberto */}
                      {item.isOpen ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-2 py-1">
                            <span className="text-[10px] text-slate-400">Abre:</span>
                            <input
                              type="time"
                              value={item.openTime}
                              onChange={(e) => handleTimeChange(idx, 'openTime', e.target.value)}
                              className="bg-transparent text-xs text-slate-900 dark:text-white font-mono outline-none"
                            />
                          </div>

                          <span className="text-xs text-slate-400">até</span>

                          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-2 py-1">
                            <span className="text-[10px] text-slate-400">Fecha:</span>
                            <input
                              type="time"
                              value={item.closeTime}
                              onChange={(e) => handleTimeChange(idx, 'closeTime', e.target.value)}
                              className="bg-transparent text-xs text-slate-900 dark:text-white font-mono outline-none"
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-rose-500/80 italic">Fechado</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>

        {/* FOOTER ACTIONS */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-end gap-3 sticky bottom-0 z-10">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg bg-[#20C933] hover:bg-[#1bb32d] disabled:opacity-50 text-xs font-bold text-white transition flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            ) : (
              <Save className="w-4 h-4 text-white" />
            )}
            <span>Salvar no Supabase</span>
          </button>
        </div>
      </div>
    </div>
  );
};
