import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Building2,
  Users,
  UserCheck,
  Image as ImageIcon,
  FileText,
  ExternalLink,
  CheckCircle2,
  Ban,
  Edit,
  Phone,
  Mail,
  MapPin,
  Clock,
  Shield,
  CreditCard,
  Copy,
  Check,
  Play,
  Pause,
  Plus,
  Trash2,
  Search,
  Sparkles,
  DollarSign,
  Sun,
  Moon,
  Eye,
  X,
} from 'lucide-react';
import { AdminSalonItem } from '../../types/admin';
import { SalonLogo } from '../common/SalonLogo';
import { UserAvatar } from '../common/UserAvatar';
import { supabase } from '../../services/supabase';
import { UnifiedRegistrationForm } from '../public/UnifiedRegistrationForm';

interface AdminSalonDetailViewProps {
  salon: AdminSalonItem;
  onBack: () => void;
  onEdit: () => void;
  onUpdateStatus: (salonId: string, status: AdminSalonItem['status']) => void;
}

export interface SalonClientRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatar_url?: string;
  total_appointments: number;
  last_appointment_date?: string;
  status: 'active' | 'inactive';
}

export interface SalonProfessionalRecord {
  id: string;
  name: string;
  role: string;
  phone: string;
  avatar_url?: string;
  commission_rate: number;
  is_active: boolean;
  services_count?: number;
}

export interface SalonMediaItem {
  id: string;
  url: string;
  title: string;
  type: 'image' | 'video';
  duration_seconds?: number;
}

export const AdminSalonDetailView: React.FC<AdminSalonDetailViewProps> = ({
  salon,
  onBack,
  onEdit,
  onUpdateStatus,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'clients' | 'team' | 'gallery' | 'forms'>('overview');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Clientes Fixos
  const [clients, setClients] = useState<SalonClientRecord[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [clientSearch, setClientSearch] = useState('');

  // Equipe / Colaboradores
  const [team, setTeam] = useState<SalonProfessionalRecord[]>([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);

  // Galeria de Mídia
  const [mediaList, setMediaList] = useState<SalonMediaItem[]>([
    {
      id: 'm-1',
      url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&auto=format&fit=crop&q=80',
      title: 'Degradê Navalhado & Barboterapia',
      type: 'image',
    },
    {
      id: 'm-2',
      url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80',
      title: 'Corte Clássico & Penteado',
      type: 'image',
    },
    {
      id: 'm-3',
      url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800&auto=format&fit=crop&q=80',
      title: 'Design de Barba Alinhada',
      type: 'image',
    },
    {
      id: 'm-4',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      title: 'Vídeo Radar 5s: Finalização com Pomada',
      type: 'video',
      duration_seconds: 5,
    },
    {
      id: 'm-5',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      title: 'Vídeo Radar 5s: Tour pelo Studio',
      type: 'video',
      duration_seconds: 5,
    },
  ]);
  const [selectedVideo, setSelectedVideo] = useState<SalonMediaItem | null>(null);

  // Sandbox Simulator Modal
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simulatorMode, setSimulatorMode] = useState<'cadastro' | 'login'>('cadastro');

  // Carrega Clientes e Equipe do Supabase
  useEffect(() => {
    async function loadSalonDetails() {
      setIsLoadingClients(true);
      setIsLoadingTeam(true);

      try {
        // 1. Busca Profissionais
        const { data: prosData } = await supabase
          .from('professionals')
          .select('*')
          .eq('salon_id', salon.id);

        if (prosData && prosData.length > 0) {
          setTeam(
            prosData.map((p) => ({
              id: p.id,
              name: p.name || 'Profissional',
              role: p.role || 'Barbeiro / Especialista',
              phone: p.phone_whatsapp || p.phone || '',
              avatar_url: p.avatar_url || '',
              commission_rate: p.commission_rate || 50,
              is_active: p.is_active ?? true,
              services_count: 5,
            }))
          );
        } else {
          // Fallback padrão simulado com base no dono e dados
          setTeam([
            {
              id: salon.owner_id || 'pro-1',
              name: salon.owner_name || salon.legal_name || 'Beto Roberto (Proprietário)',
              role: 'Proprietário & Master Stylist',
              phone: salon.phone_whatsapp || '(11) 98765-4321',
              avatar_url: salon.owner_avatar_url || '',
              commission_rate: 100,
              is_active: true,
              services_count: 8,
            },
            {
              id: 'pro-2',
              name: 'Lucas Ferreira',
              role: 'Barbeiro / Especialista em Degradê',
              phone: '(11) 97654-3210',
              avatar_url: '',
              commission_rate: 60,
              is_active: true,
              services_count: 4,
            },
            {
              id: 'pro-3',
              name: 'Camila Alcantara',
              role: 'Manicure & Designer de Unhas',
              phone: '(11) 98888-2222',
              avatar_url: '',
              commission_rate: 55,
              is_active: true,
              services_count: 6,
            },
          ]);
        }

        // 2. Busca Clientes (via appointments ou clients)
        const { data: apptsData } = await supabase
          .from('appointments')
          .select('client_id, client_name, client_phone, client_email, appointment_date, status')
          .eq('salon_id', salon.id)
          .limit(20);

        if (apptsData && apptsData.length > 0) {
          const clientMap = new Map<string, SalonClientRecord>();
          apptsData.forEach((apt) => {
            const key = apt.client_id || apt.client_email || apt.client_name;
            if (!clientMap.has(key)) {
              clientMap.set(key, {
                id: apt.client_id || `cl-${Math.random()}`,
                name: apt.client_name || 'Cliente Cadastrado',
                phone: apt.client_phone || '(11) 99999-9999',
                email: apt.client_email || '',
                total_appointments: 1,
                last_appointment_date: apt.appointment_date,
                status: 'active',
              });
            } else {
              const existing = clientMap.get(key)!;
              existing.total_appointments += 1;
            }
          });
          setClients(Array.from(clientMap.values()));
        } else {
          // Fallback clientes da casa
          setClients([
            {
              id: 'cl-1',
              name: 'Carlos Eduardo Mendes',
              phone: '(11) 98111-2233',
              email: 'carlos.mendes@gmail.com',
              total_appointments: 14,
              last_appointment_date: '2026-10-02',
              status: 'active',
            },
            {
              id: 'cl-2',
              name: 'Marcelo Pires de Castro',
              phone: '(11) 99222-4455',
              email: 'marcelo.pires@outlook.com',
              total_appointments: 8,
              last_appointment_date: '2026-09-28',
              status: 'active',
            },
            {
              id: 'cl-3',
              name: 'Renata Silva Santos',
              phone: '(11) 97333-6677',
              email: 'renata.silva@uol.com.br',
              total_appointments: 6,
              last_appointment_date: '2026-09-25',
              status: 'active',
            },
            {
              id: 'cl-4',
              name: 'Gabriel Martins',
              phone: '(11) 98444-8899',
              email: 'gabriel.martins@gmail.com',
              total_appointments: 3,
              last_appointment_date: '2026-09-15',
              status: 'active',
            },
          ]);
        }
      } catch (err) {
        console.warn('Erro ao carregar dados do salão:', err);
      } finally {
        setIsLoadingClients(false);
        setIsLoadingTeam(false);
      }
    }

    loadSalonDetails();
  }, [salon.id]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(id);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const clientRegistrationUrl = `https://adm.vagouapp.com/cadastro?embed=true&mode=cadastro&type=client&slug=${salon.slug}`;
  const salonLoginUrl = `https://adm.vagouapp.com/cadastro?embed=true&mode=login&type=client&slug=${salon.slug}`;
  const fullVitrineUrl = `https://${salon.slug}.vagouapp.com`;

  const filteredClients = clients.filter((c) => {
    if (!clientSearch.trim()) return true;
    const q = clientSearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* ======================================================== */}
      {/* 1. CABEÇALHO SOBERANO DO ESTABELECIMENTO                 */}
      {/* ======================================================== */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Lado Esquerdo: Botão Voltar + Logo + Título */}
          <div className="flex items-start sm:items-center gap-3.5">
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer active:scale-95 shrink-0"
              title="Voltar para a Lista de Estabelecimentos"
              aria-label="Voltar para a Lista de Estabelecimentos"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <SalonLogo
                logoUrl={salon.logo_url}
                name={salon.trade_name}
                size="lg"
                primaryColor={salon.primary_color}
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {salon.trade_name}
                  </h1>
                  {salon.is_verified && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Verificado Oficial</span>
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      salon.status === 'active'
                        ? 'bg-[#20C933] text-white'
                        : salon.status === 'pending'
                        ? 'bg-amber-500 text-white'
                        : 'bg-rose-600 text-white'
                    }`}
                  >
                    {salon.status === 'active' ? 'Ativo' : salon.status === 'pending' ? 'Pendente' : 'Suspenso'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {salon.legal_name || 'Razão Social Não Informada'}
                  </span>
                  <span>•</span>
                  <a
                    href={fullVitrineUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <span>{salon.slug}.vagouapp.com</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <span>•</span>
                  <span>{salon.neighborhood || salon.city || 'São Paulo'} - {salon.state || 'SP'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Lado Direito: Ações Rápidas */}
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
            <a
              href={fullVitrineUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Ver Vitrine</span>
            </a>

            <button
              onClick={() => onUpdateStatus(salon.id, salon.status === 'active' ? 'suspended' : 'active')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 ${
                salon.status === 'active'
                  ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                  : 'bg-[#20C933] hover:bg-[#1bb32d] text-white'
              }`}
            >
              {salon.status === 'active' ? (
                <>
                  <Ban className="w-3.5 h-3.5" />
                  <span>Suspender</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  <span>Reativar Salão</span>
                </>
              )}
            </button>

            <button
              onClick={onEdit}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Editar Master</span>
            </button>
          </div>
        </div>

        {/* NAVEGAÇÃO DE ABAS DA SEÇÃO */}
        <div className="flex items-center gap-1 border-t border-slate-200 dark:border-slate-800 pt-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-[#20C933] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Visão Geral & Marca</span>
          </button>

          <button
            onClick={() => setActiveTab('clients')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'clients'
                ? 'bg-[#20C933] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Clientes Fixos ({clients.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('team')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'team'
                ? 'bg-[#20C933] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Equipe & Colaboradores ({team.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('gallery')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'gallery'
                ? 'bg-[#20C933] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Galeria & Serviços ({mediaList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('forms')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'forms'
                ? 'bg-[#20C933] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Formulários Integrados</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. CONTEÚDO DAS ABAS                                     */}
      {/* ======================================================== */}

      {/* ABA 1: VISÃO GERAL & MARCA */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Card: Identidade Visual Completa (Dark / Light / Favicon) */}
          <div className="lg:col-span-1 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Identidade Visual da Marca</h3>
            </div>

            {/* Logotipo Versão Dark */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-slate-200">
                  <Moon className="w-3.5 h-3.5 text-blue-400" />
                  <span>Logotipo Versão Dark</span>
                </span>
                <span className="text-[10px] text-slate-400">Para tema escuro</span>
              </div>
              <div className="h-16 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center p-2">
                {salon.logo_dark_url || salon.logo_url ? (
                  <img
                    src={salon.logo_dark_url || salon.logo_url}
                    alt="Logo Dark"
                    className="max-h-12 max-w-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-slate-500 font-mono">Sem logo dark específico (usando padrão)</span>
                )}
              </div>
            </div>

            {/* Logotipo Versão Light */}
            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>Logotipo Versão Light</span>
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Para tema claro</span>
              </div>
              <div className="h-16 rounded-lg bg-white border border-slate-300 dark:border-slate-800 flex items-center justify-center p-2">
                {salon.logo_light_url || salon.logo_url ? (
                  <img
                    src={salon.logo_light_url || salon.logo_url}
                    alt="Logo Light"
                    className="max-h-12 max-w-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-slate-400 font-mono">Sem logo light específico</span>
                )}
              </div>
            </div>

            {/* Favicon & Cores */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 block">Favicon</span>
                <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 flex items-center justify-center mx-auto overflow-hidden">
                  {salon.favicon_url || salon.logo_url ? (
                    <img src={salon.favicon_url || salon.logo_url} alt="Favicon" className="w-6 h-6 object-contain" />
                  ) : (
                    <span className="text-[10px] font-bold text-emerald-500">V</span>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 block">Cor Primária</span>
                <div className="flex items-center justify-center gap-1.5">
                  <span
                    className="w-5 h-5 rounded-full border border-white/20 shadow-xs"
                    style={{ backgroundColor: salon.primary_color || '#20C933' }}
                  />
                  <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                    {salon.primary_color || '#20C933'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Dados Fiscais, Responsável & Localização */}
          <div className="lg:col-span-2 space-y-5">
            {/* Bloco: Titular / Proprietário Responsável */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Titular / Proprietário Responsável</h3>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20">
                  1 Usuário = 1 Estabelecimento
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    fullName={salon.owner_name || salon.legal_name || 'Beto Roberto'}
                    photoUrl={salon.owner_avatar_url}
                    size="lg"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {salon.owner_name || salon.legal_name || 'Beto Roberto'}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Proprietário Master • Vínculo com tabela profiles/clients
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-1 text-xs">
                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{salon.owner_phone || salon.phone_whatsapp || '(11) 98765-4321'}</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{salon.owner_email || salon.email || `contato@${salon.slug}.com`}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Bloco: Dados Fiscais, Endereço & Operação */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Dados Comerciais & Fiscais</span>
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Documento:</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {salon.document_type || 'CNPJ'}: {salon.document_number || '45.123.890/0001-44'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Chave PIX:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold truncate max-w-[160px]">
                      {salon.pix_key || salon.phone_whatsapp || 'pix@vagouapp.com'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Modelo Operacional:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                      {salon.operating_model || 'Espaço Físico & Delivery'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Plano na Plataforma:</span>
                    <span className="font-bold text-[#20C933] uppercase text-[11px]">
                      {salon.billing_plan || 'Pro / 5% por agendamento'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Endereço & Atendimento</span>
                </h4>
                <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  <p className="font-medium">
                    {salon.address ? `${salon.address}, ${salon.street_number || 'S/N'}` : 'Rua Augusta, 1500'}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    {salon.neighborhood || 'Consolação'} - {salon.city || 'São Paulo'}/{salon.state || 'SP'}
                  </p>
                  <p className="font-mono text-[11px] text-slate-500">
                    CEP: {salon.cep || '01304-001'}
                  </p>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Terça a Sábado das 09:00 às 20:00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: CLIENTES FIXOS DO ESTABELECIMENTO */}
      {activeTab === 'clients' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Base de Clientes Cadastrados do Salão</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Clientes que realizaram agendamentos ou possuem conta vinculada à vitrine deste salão.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Filtrar por nome ou telefone..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Cliente</th>
                  <th className="py-2.5 px-3">WhatsApp</th>
                  <th className="py-2.5 px-3">E-mail</th>
                  <th className="py-2.5 px-3 text-center">Agendamentos</th>
                  <th className="py-2.5 px-3">Último Atendimento</th>
                  <th className="py-2.5 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Nenhum cliente fixo encontrado com o filtro aplicado.
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((cl) => (
                    <tr key={cl.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar fullName={cl.name} photoUrl={cl.avatar_url} size="sm" />
                          <span className="font-bold text-slate-900 dark:text-white">{cl.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">
                        {cl.phone}
                      </td>
                      <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                        {cl.email || '—'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          {cl.total_appointments} agendamentos
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {cl.last_appointment_date || 'Recente'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <a
                          href={`https://wa.me/55${cl.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-1 rounded bg-[#20C933] hover:bg-[#1bb32d] text-white text-[10px] font-bold transition inline-flex items-center gap-1 shadow-xs"
                        >
                          <Phone className="w-3 h-3 text-white" />
                          <span>WhatsApp</span>
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 3: EQUIPE & COLABORADORES */}
      {activeTab === 'team' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Equipe de Profissionais do Salão</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Colaboradores cadastrados na tabela professionals vinculados a este estabelecimento.
              </p>
            </div>

            <button
              onClick={() => alert('Para adicionar profissionais a este salão parceiro, acesse a gestão de equipe ou utilize o formulário de cadastro.')}
              className="px-3 py-1.5 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span>Adicionar Profissional</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {team.map((pro) => (
              <div
                key={pro.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition"
              >
                <div className="flex items-center gap-3">
                  <UserAvatar fullName={pro.name} photoUrl={pro.avatar_url} size="lg" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{pro.name}</h4>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium block">
                      {pro.role}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500 block mt-0.5">
                      {pro.phone || 'Sem telefone'}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Comissão</span>
                  <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                    {pro.commission_rate}%
                  </span>
                  <span className="mt-2 inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    Ativo
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA 4: GALERIA DE SERVIÇOS (FOTOS E VÍDEOS DE 5 SEGUNDOS) */}
      {activeTab === 'gallery' && (
        <div className="space-y-6">
          {/* Seção de Fotos */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Fotos de Serviços & Procedimentos</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Imagens exibidas no catálogo da vitrine e no radar do consumidor.
                </p>
              </div>

              <button
                onClick={() => {
                  const url = prompt('Insira a URL da foto de serviço:');
                  if (url) {
                    setMediaList((prev) => [
                      ...prev,
                      { id: `m-${Date.now()}`, url, title: 'Novo Serviço', type: 'image' },
                    ]);
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Adicionar Foto</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {mediaList
                .filter((m) => m.type === 'image')
                .map((img) => (
                  <div
                    key={img.id}
                    className="group relative rounded-xl overflow-hidden aspect-square border border-slate-200 dark:border-slate-800 bg-slate-950 shadow-xs"
                  >
                    <img
                      src={img.url}
                      alt={img.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition p-2.5 flex flex-col justify-end">
                      <span className="text-[11px] font-bold text-white truncate">{img.title}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Seção de Vídeos Curtos de 5 Segundos (Loops estilo Radar / Stories) */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Play className="w-4 h-4 text-[#20C933] fill-[#20C933]" />
                  <span>Vídeos Relâmpago de 5 Segundos (Radar Stories Nível 3)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Vídeos curtos verticais em loop automático de 5 segundos utilizados para vagas imediatas no radar.
                </p>
              </div>

              <button
                onClick={() => {
                  const url = prompt('Insira a URL do vídeo de 5 segundos (MP4):');
                  if (url) {
                    setMediaList((prev) => [
                      ...prev,
                      { id: `v-${Date.now()}`, url, title: 'Vídeo Radar 5s', type: 'video', duration_seconds: 5 },
                    ]);
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 text-white" />
                <span>+ Adicionar Vídeo 5s</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {mediaList
                .filter((m) => m.type === 'video')
                .map((vid) => (
                  <div
                    key={vid.id}
                    className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 relative overflow-hidden group shadow-md"
                  >
                    <div className="relative aspect-[9/14] rounded-xl overflow-hidden bg-slate-900">
                      <video
                        src={vid.url}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#20C933] text-white flex items-center gap-1 shadow-md">
                        <Play className="w-2.5 h-2.5 fill-white" />
                        <span>5s Loop</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white truncate max-w-[200px]">{vid.title}</span>
                      <button
                        onClick={() => setSelectedVideo(vid)}
                        className="text-emerald-400 hover:text-emerald-300 font-semibold text-[11px] cursor-pointer"
                      >
                        Expandir
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ABA 5: FORMULÁRIOS INTEGRADOS DO SALÃO */}
      {activeTab === 'forms' && (
        <div className="space-y-6">
          {/* Header da Seção */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Formulários Oficiais Integrados • {salon.trade_name}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Visualização real lado a lado dos formulários de Login e Cadastro configurados com o logo e identidade deste estabelecimento.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                slug: @{salon.slug}
              </span>
            </div>
          </div>

          {/* GRADE LADO A LADO (MAX 2 COLUNAS): CADA FORMULÁRIO COMO ELE REALMENTE É */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* ======================================================== */}
            {/* COLUNA 1: FORMULÁRIO DE LOGIN DE ACESSO                  */}
            {/* ======================================================== */}
            <div className="flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden">
              {/* Barra de Título / Identificação do Form 1 */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-sky-500/15 text-sky-500 border border-sky-500/30 flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>Formulário de Login para Acesso</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                        mode=login
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Entrada direta com autenticação no Supabase vinculada a {salon.trade_name}.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(salonLoginUrl, 'url-login')}
                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition hover:border-sky-500 flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Copiar Link de Login"
                >
                  {copiedUrl === 'url-login' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedUrl === 'url-login' ? 'Copiado!' : 'Copiar URL'}</span>
                </button>
              </div>

              {/* Contêiner com o Formulário Real como ele é */}
              <div className="p-4 sm:p-5 bg-slate-950 flex flex-col justify-center min-h-[520px]">
                <div className="w-full max-w-md mx-auto">
                  <UnifiedRegistrationForm
                    initialType="client"
                    initialMode="login"
                    targetSlug={salon.slug}
                    salonInfo={salon}
                    hideTypeSelector={true}
                    showCloseButton={false}
                    onSuccess={() => {
                      alert(`✅ Login validado com sucesso para o estabelecimento ${salon.trade_name}!`);
                    }}
                  />
                </div>
              </div>

              {/* Rodapé com URL do Form de Login */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400 font-mono truncate max-w-[280px]">
                  {salonLoginUrl}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSimulatorMode('login');
                    setIsSimulatorOpen(true);
                  }}
                  className="text-sky-600 dark:text-sky-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Eye className="w-3 h-3" />
                  <span>Expandir em Modal</span>
                </button>
              </div>
            </div>

            {/* ======================================================== */}
            {/* COLUNA 2: FORMULÁRIO DE CADASTRO DE CLIENTE              */}
            {/* ======================================================== */}
            <div className="flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden">
              {/* Barra de Título / Identificação do Form 2 */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>Formulário de Cadastro de Usuário</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        mode=cadastro
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Cadastro em etapas com vínculo imediato à vitrine de {salon.trade_name}.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(clientRegistrationUrl, 'url-client')}
                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition hover:border-emerald-500 flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Copiar Link de Cadastro"
                >
                  {copiedUrl === 'url-client' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUrl === 'url-client' ? 'Copiado!' : 'Copiar URL'}</span>
                </button>
              </div>

              {/* Contêiner com o Formulário Real como ele é */}
              <div className="p-4 sm:p-5 bg-slate-950 flex flex-col justify-center min-h-[520px]">
                <div className="w-full max-w-md mx-auto">
                  <UnifiedRegistrationForm
                    initialType="client"
                    initialMode="cadastro"
                    targetSlug={salon.slug}
                    salonInfo={salon}
                    hideTypeSelector={true}
                    showCloseButton={false}
                    onSuccess={() => {
                      alert(`✅ Cadastro concluído com sucesso para o estabelecimento ${salon.trade_name}!`);
                    }}
                  />
                </div>
              </div>

              {/* Rodapé com URL do Form de Cadastro */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400 font-mono truncate max-w-[280px]">
                  {clientRegistrationUrl}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSimulatorMode('cadastro');
                    setIsSimulatorOpen(true);
                  }}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Eye className="w-3 h-3" />
                  <span>Expandir em Modal</span>
                </button>
              </div>
            </div>
          </div>

          {/* Código Iframe Embed Pronto */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-slate-900 dark:text-emerald-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-500" />
                <span>Snippet HTML Iframe para Embed no App do Salão:</span>
              </span>
              <button
                onClick={() =>
                  handleCopy(
                    `<iframe src="${clientRegistrationUrl}" className="w-full h-[650px] border-0 rounded-2xl bg-transparent" allow="clipboard-write" />`,
                    'snippet'
                  )
                }
                className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center gap-1 cursor-pointer"
              >
                {copiedUrl === 'snippet' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copiar Snippet</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300 overflow-x-auto">
              {`<iframe\n  src="${clientRegistrationUrl}"\n  className="w-full h-[650px] border-0 rounded-2xl bg-transparent"\n  allow="clipboard-write"\n/>`}
            </pre>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. MODAIS: SIMULADOR DE FORMULÁRIO DO SALÃO              */}
      {/* ======================================================== */}
      {isSimulatorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="w-full max-w-xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl relative my-auto max-h-[92vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#20C933]/15 text-[#20C933] border border-[#20C933]/30 flex items-center justify-center shrink-0">
                  <Play className="w-4 h-4 text-[#20C933] fill-[#20C933]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Simulador: {salon.trade_name} ({simulatorMode === 'cadastro' ? 'Cadastro' : 'Login'})
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Slug ativo: <code className="text-emerald-400">{salon.slug}</code> (Abas de tipo travadas)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsSimulatorOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Fechar"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 sm:p-4">
              <UnifiedRegistrationForm
                initialType="client"
                initialMode={simulatorMode}
                targetSlug={salon.slug}
                salonInfo={salon}
                hideTypeSelector={true}
                onClose={() => setIsSimulatorOpen(false)}
                onSuccess={() => {
                  alert(`✅ Sucesso! O cliente foi autenticado/cadastrado no estabelecimento ${salon.trade_name}!`);
                  setIsSimulatorOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Vídeo Expandido */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900">
              <span className="text-xs font-bold text-white truncate">{selectedVideo.title}</span>
              <button
                onClick={() => setSelectedVideo(null)}
                className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
                title="Fechar"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="aspect-[9/16] bg-black">
              <video
                src={selectedVideo.url}
                autoPlay
                controls
                loop
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
