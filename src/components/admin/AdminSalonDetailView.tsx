import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  Palette,
  Scissors,
  Layers,
  ChevronLeft,
  ChevronRight,
  Film,
  Pencil,
  Images,
  UploadCloud,
  Cloud,
  Maximize2,
  Filter,
  FolderHeart,
  Folder,
  Layout,
  Bookmark,
  QrCode,
  Printer,
} from 'lucide-react';
import { AdminSalonItem, SalonServiceRecord, SalonServiceMediaItem } from '../../types/admin';
import { SalonLogo } from '../common/SalonLogo';
import { UserAvatar } from '../common/UserAvatar';
import { supabase } from '../../services/supabase';
import { TriadeMnvClientLoginForm } from './triade-forms/TriadeMnvClientLoginForm';
import { TriadeMnvClientRegisterForm } from './triade-forms/TriadeMnvClientRegisterForm';
import { SalonWelcomeModal } from './SalonWelcomeModal';

interface AdminSalonDetailViewProps {
  salon: AdminSalonItem;
  onBack: () => void;
  onEdit: () => void;
  onUpdateStatus: (salonId: string, status: AdminSalonItem['status']) => void;
  onUpdateSalon?: (updated: Partial<AdminSalonItem>) => void;
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

export type SalonMediaMainTab = 'fotos' | 'videos' | 'imagens';
export type SalonMediaSubTab = 'all' | 'servicos' | 'profissionais' | 'espaco' | 'banner' | 'logotipo';

export interface SalonMediaItem {
  id: string;
  url: string;
  title: string;
  type: 'image' | 'video';
  duration_seconds?: number;
  category?: 'servicos' | 'profissionais' | 'espaco' | 'banner' | 'logotipo' | 'ambiente' | 'procedimento' | 'equipe' | 'geral';
  media_group?: 'fotos' | 'videos' | 'imagens';
  created_at?: string;
  is_cover?: boolean;
}

export const AdminSalonDetailView: React.FC<AdminSalonDetailViewProps> = ({
  salon,
  onBack,
  onEdit,
  onUpdateStatus,
  onUpdateSalon,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'branding' | 'media' | 'services' | 'team' | 'clients' | 'forms'>('general');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [isWelcomeQrModalOpen, setIsWelcomeQrModalOpen] = useState(false);

  // Acervo Central de Mídias do Estabelecimento (Galeria Geral com Abas Fotos / Videos / Imagens)
  const [salonMedia, setSalonMedia] = useState<SalonMediaItem[]>([]);
  const [mediaMainTab, setMediaMainTab] = useState<SalonMediaMainTab>('fotos');
  const [mediaSubTab, setMediaSubTab] = useState<SalonMediaSubTab>('all');
  const [mediaSearch, setMediaSearch] = useState('');
  const [isUploadMediaModalOpen, setIsUploadMediaModalOpen] = useState(false);
  const [isGooglePhotosModalOpen, setIsGooglePhotosModalOpen] = useState(false);
  const [viewingMediaItem, setViewingMediaItem] = useState<SalonMediaItem | null>(null);
  const [mediaItemToLink, setMediaItemToLink] = useState<SalonMediaItem | null>(null);

  // Formulário de Nova Mídia
  const [newMediaForm, setNewMediaForm] = useState({
    title: '',
    url: '',
    type: 'image' as 'image' | 'video',
    media_group: 'fotos' as 'fotos' | 'videos' | 'imagens',
    category: 'servicos' as 'servicos' | 'profissionais' | 'espaco' | 'banner' | 'logotipo',
    duration_seconds: 5,
    is_cover: false,
  });

  // Estado do Seletor do Google Fotos
  const [googlePhotosAlbumFilter, setGooglePhotosAlbumFilter] = useState<string>('all');
  const [selectedGooglePhotos, setSelectedGooglePhotos] = useState<string[]>([]);
  const [isGooglePhotosImporting, setIsGooglePhotosImporting] = useState(false);

  // Seletor da Galeria Central nos Modais de Serviço
  const [isSelectFromGalleryModalOpen, setIsSelectFromGalleryModalOpen] = useState(false);
  const [targetServiceForGallerySelect, setTargetServiceForGallerySelect] = useState<{
    serviceId: string;
    targetType: 'photo' | 'slide';
  } | null>(null);

  // Clientes Fixos
  const [clients, setClients] = useState<SalonClientRecord[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [clientSearch, setClientSearch] = useState('');

  // Equipe / Colaboradores
  const [team, setTeam] = useState<SalonProfessionalRecord[]>([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);

  // Catálogo de Serviços & Procedimentos
  const [services, setServices] = useState<SalonServiceRecord[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState<string>('all');
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);
  const [newServiceForm, setNewServiceForm] = useState({
    name: '',
    category: 'Cabelo',
    price: '',
    duration_minutes: '30',
    description: '',
  });

  // Estado para Edição de Serviço Existente
  const [editingService, setEditingService] = useState<SalonServiceRecord | null>(null);
  const [editServiceForm, setEditServiceForm] = useState({
    name: '',
    category: 'Cabelo',
    price: '',
    duration_minutes: '30',
    description: '',
    is_active: true,
  });

  // Modais de Mídia do Respectivo Serviço (CRUD por Serviço)
  const [selectedServiceForPhotos, setSelectedServiceForPhotos] = useState<SalonServiceRecord | null>(null);
  const [selectedServiceForVideos, setSelectedServiceForVideos] = useState<SalonServiceRecord | null>(null);
  const [selectedServiceForSlides, setSelectedServiceForSlides] = useState<SalonServiceRecord | null>(null);
  const [viewingPhotoUrl, setViewingPhotoUrl] = useState<string | null>(null);

  // Estados dos formulários de inserção nos modais
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newSlideUrl, setNewSlideUrl] = useState('');
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

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

        // 3. Busca Catálogo de Serviços (tabela 'services' do Supabase)
        setIsLoadingServices(true);
        const { data: servData } = await supabase
          .from('services')
          .select('*')
          .eq('salon_id', salon.id)
          .order('name');

        if (servData && servData.length > 0) {
          setServices(
            servData.map((s) => ({
              id: s.id,
              salon_id: s.salon_id,
              name: s.name || 'Serviço',
              description: s.description || '',
              category: s.category || 'Geral',
              price: typeof s.price === 'number' ? s.price : Number(s.price) || 0,
              duration_minutes: s.duration_minutes || 30,
              is_active: s.is_active ?? true,
              target_audience: s.target_audience || 'all',
              order_index: s.order_index,
              created_at: s.created_at,
              photos: Array.isArray(s.photos) ? s.photos : [],
              videos: Array.isArray(s.videos) ? s.videos : [],
              slides: Array.isArray(s.slides) ? s.slides : [],
            }))
          );
        } else {
          // Fallback contextualizado para o segmento do salão com Mídias e Slides
          const isBarbershop = salon.category === 'barbearia' || salon.slug?.toLowerCase().includes('barber');
          const defaultServices: SalonServiceRecord[] = isBarbershop
            ? [
                {
                  id: 'srv-1',
                  salon_id: salon.id,
                  name: 'Corte Degradê Navalhado (Fade)',
                  description: 'Corte moderno com acabamento na lâmina e toalha quente.',
                  category: 'Cabelo',
                  price: 55,
                  duration_minutes: 40,
                  is_active: true,
                  target_audience: 'men',
                  photos: [
                    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800&auto=format&fit=crop&q=80',
                  ],
                  videos: [
                    {
                      id: 'v-1',
                      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                      title: 'Fade em 360° - 5s',
                      duration_seconds: 5,
                    },
                  ],
                  slides: [
                    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&auto=format&fit=crop&q=80',
                  ],
                },
                {
                  id: 'srv-2',
                  salon_id: salon.id,
                  name: 'Barboterapia & Alinhamento',
                  description: 'Vapor de ozônio, óleos essenciais, hidratação e navalha.',
                  category: 'Barba',
                  price: 45,
                  duration_minutes: 30,
                  is_active: true,
                  target_audience: 'men',
                  photos: [
                    'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&auto=format&fit=crop&q=80',
                  ],
                  videos: [
                    {
                      id: 'v-2',
                      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
                      title: 'Toalha quente e navalha 5s',
                      duration_seconds: 5,
                    },
                  ],
                  slides: [
                    'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&auto=format&fit=crop&q=80',
                  ],
                },
                {
                  id: 'srv-3',
                  salon_id: salon.id,
                  name: 'Combo Master (Corte + Barba + Sobrancelha)',
                  description: 'Experiência completa com direito a higienização capilar.',
                  category: 'Combos',
                  price: 90,
                  duration_minutes: 60,
                  is_active: true,
                  target_audience: 'men',
                  photos: [
                    'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&auto=format&fit=crop&q=80',
                  ],
                  videos: [],
                  slides: [
                    'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&auto=format&fit=crop&q=80',
                  ],
                },
                {
                  id: 'srv-4',
                  salon_id: salon.id,
                  name: 'Pigmentação de Barba & Cabelo',
                  description: 'Correção de falhas e realce de linhas com tinta especial.',
                  category: 'Tratamentos',
                  price: 40,
                  duration_minutes: 25,
                  is_active: true,
                  target_audience: 'men',
                  photos: [
                    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&auto=format&fit=crop&q=80',
                  ],
                  videos: [],
                  slides: [],
                },
                {
                  id: 'srv-5',
                  salon_id: salon.id,
                  name: 'Selagem Capilar Antifrizz',
                  description: 'Alinhamento térmico suave com redução de volume.',
                  category: 'Tratamentos',
                  price: 110,
                  duration_minutes: 50,
                  is_active: false,
                  target_audience: 'all',
                  photos: [],
                  videos: [],
                  slides: [],
                },
              ]
            : [
                {
                  id: 'srv-1',
                  salon_id: salon.id,
                  name: 'Corte Feminino com Finalização',
                  description: 'Visagismo, lavagem especial com massagem e escova modeladora.',
                  category: 'Cabelo',
                  price: 120,
                  duration_minutes: 50,
                  is_active: true,
                  target_audience: 'women',
                  photos: [
                    'https://images.unsplash.com/photo-1560869713-7d0a29430803?w=800&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80',
                  ],
                  videos: [
                    {
                      id: 'v-3',
                      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                      title: 'Movimento e Escova 5s',
                      duration_seconds: 5,
                    },
                  ],
                  slides: [
                    'https://images.unsplash.com/photo-1560869713-7d0a29430803?w=800&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=800&auto=format&fit=crop&q=80',
                  ],
                },
                {
                  id: 'srv-2',
                  salon_id: salon.id,
                  name: 'Mechas Criativas & Iluminação',
                  description: 'Técnica personalizada com proteção dos fios (Plex).',
                  category: 'Coloração',
                  price: 320,
                  duration_minutes: 180,
                  is_active: true,
                  target_audience: 'women',
                  photos: [
                    'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=800&auto=format&fit=crop&q=80',
                  ],
                  videos: [],
                  slides: [
                    'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=800&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1560869713-7d0a29430803?w=800&auto=format&fit=crop&q=80',
                  ],
                },
                {
                  id: 'srv-3',
                  salon_id: salon.id,
                  name: 'Tratamento de Nutrição Profunda',
                  description: 'Cronograma capilar intensivo para recuperação imediata.',
                  category: 'Tratamentos',
                  price: 150,
                  duration_minutes: 45,
                  is_active: true,
                  target_audience: 'all',
                  photos: [
                    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80',
                  ],
                  videos: [],
                  slides: [],
                },
                {
                  id: 'srv-4',
                  salon_id: salon.id,
                  name: 'Manicure & Pedicure Completa',
                  description: 'Esmaltação em gel ou tradicional com cutilagem fina.',
                  category: 'Unhas',
                  price: 75,
                  duration_minutes: 60,
                  is_active: true,
                  target_audience: 'all',
                  photos: [],
                  videos: [],
                  slides: [],
                },
              ];
          setServices(defaultServices);
        }

        // 4. Carrega Acervo Geral de Mídias do Estabelecimento (Estruturado em Fotos, Vídeos 5s e Imagens)
        const isBarbershopForMedia = salon.category === 'barbearia' || salon.slug?.toLowerCase().includes('barber');
        const defaultMediaList: SalonMediaItem[] = isBarbershopForMedia
          ? [
              // --- FOTOS: Serviços ---
              {
                id: 'med-f-srv-1',
                title: 'Fade Navalhado & Barba Alinhada',
                url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80',
                type: 'image',
                media_group: 'fotos',
                category: 'servicos',
                created_at: '2026-10-01',
              },
              {
                id: 'med-f-srv-2',
                title: 'Finalização com Navalhete e Toalha Quente',
                url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800&auto=format&fit=crop&q=80',
                type: 'image',
                media_group: 'fotos',
                category: 'servicos',
                created_at: '2026-10-04',
              },
              {
                id: 'med-f-srv-3',
                title: 'Barboterapia & Hidratação de Barba',
                url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&auto=format&fit=crop&q=80',
                type: 'image',
                media_group: 'fotos',
                category: 'servicos',
                created_at: '2026-10-06',
              },
              // --- FOTOS: Profissionais ---
              {
                id: 'med-f-prof-1',
                title: 'Equipe de Barbeiros em Atendimento',
                url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
                type: 'image',
                media_group: 'fotos',
                category: 'profissionais',
                created_at: '2026-09-22',
              },
              {
                id: 'med-f-prof-2',
                title: 'Master Barber - Perfil Profissional',
                url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80',
                type: 'image',
                media_group: 'fotos',
                category: 'profissionais',
                created_at: '2026-09-25',
              },
              // --- FOTOS: Espaço ---
              {
                id: 'med-f-esp-1',
                title: 'Bancadas de Atendimento & Espelhos Vintage',
                url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&auto=format&fit=crop&q=80',
                type: 'image',
                media_group: 'fotos',
                category: 'espaco',
                created_at: '2026-09-18',
              },
              {
                id: 'med-f-esp-2',
                title: 'Recepção, Sala de Espera & Poltronas',
                url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&auto=format&fit=crop&q=80',
                type: 'image',
                media_group: 'fotos',
                category: 'espaco',
                created_at: '2026-09-20',
              },
              // --- VÍDEOS: Serviços (5s) ---
              {
                id: 'med-v-srv-1',
                title: 'Fade em 360° - Giro Completo (5s)',
                url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                type: 'video',
                duration_seconds: 5,
                media_group: 'videos',
                category: 'servicos',
                created_at: '2026-10-08',
              },
              // --- VÍDEOS: Espaço (5s) ---
              {
                id: 'med-v-esp-1',
                title: 'Tour Rápido pelo Salão (5s)',
                url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
                type: 'video',
                duration_seconds: 5,
                media_group: 'videos',
                category: 'espaco',
                created_at: '2026-10-10',
              },
              // --- IMAGENS: Banner (Cabeçalho do App) ---
              {
                id: 'med-i-ban-1',
                title: 'Banner Principal de Cabeçalho • 1200x500',
                url: salon.cover_image_url || 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1200&auto=format&fit=crop&q=80',
                type: 'image',
                media_group: 'imagens',
                category: 'banner',
                created_at: '2026-09-15',
                is_cover: true,
              },
              // --- IMAGENS: Logotipo (App) ---
              {
                id: 'med-i-log-1',
                title: 'Logotipo Oficial Redondo do Estabelecimento',
                url: salon.logo_url || 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&auto=format&fit=crop&q=80',
                type: 'image',
                media_group: 'imagens',
                category: 'logotipo',
                created_at: '2026-09-15',
              },
            ]
          : [
              // --- FOTOS: Serviços ---
              {
                id: 'med-f-srv-1',
                title: 'Mechas Loiro Pérola & Escova Modelada',
                url: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?w=800&auto=format&fit=crop&q=80',
                type: 'image',
                media_group: 'fotos',
                category: 'servicos',
                created_at: '2026-10-01',
              },
              {
                id: 'med-f-srv-2',
                title: 'Corte em Camadas & Hidratação',
                url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80',
                type: 'image',
                media_group: 'fotos',
                category: 'servicos',
                created_at: '2026-10-04',
              },
              {
                id: 'med-f-srv-3',
                title: 'Esmaltação em Gel & Alongamento em Fibra',
                url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&auto=format&fit=crop&q=80',
                type: 'image',
                media_group: 'fotos',
                category: 'servicos',
                created_at: '2026-10-06',
              },
              // --- FOTOS: Profissionais ---
              {
                id: 'med-f-prof-1',
                title: 'Equipe de Cabeleireiras e Coloristas',
                url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&auto=format&fit=crop&q=80',
                type: 'image',
                media_group: 'fotos',
                category: 'profissionais',
                created_at: '2026-09-22',
              },
              {
                id: 'med-f-prof-2',
                title: 'Visagista & Terapeuta Capilar',
                url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=800&auto=format&fit=crop&q=80',
                type: 'image',
                media_group: 'fotos',
                category: 'profissionais',
                created_at: '2026-09-25',
              },
              // --- FOTOS: Espaço ---
              {
                id: 'med-f-esp-1',
                title: 'Salão Principal & Bancadas de Cabelo',
                url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80',
                type: 'image',
                media_group: 'fotos',
                category: 'espaco',
                created_at: '2026-09-18',
              },
              {
                id: 'med-f-esp-2',
                title: 'Área de Lavatório & Spa Capilar',
                url: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=800&auto=format&fit=crop&q=80',
                type: 'image',
                media_group: 'fotos',
                category: 'espaco',
                created_at: '2026-09-20',
              },
              // --- VÍDEOS: Serviços (5s) ---
              {
                id: 'med-v-srv-1',
                title: 'Movimento e Balanço Pós-Escova (5s)',
                url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                type: 'video',
                duration_seconds: 5,
                media_group: 'videos',
                category: 'servicos',
                created_at: '2026-10-08',
              },
              // --- VÍDEOS: Espaço (5s) ---
              {
                id: 'med-v-esp-1',
                title: 'Tour pelo Ambiente do Salão (5s)',
                url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
                type: 'video',
                duration_seconds: 5,
                media_group: 'videos',
                category: 'espaco',
                created_at: '2026-10-10',
              },
              // --- IMAGENS: Banner (Cabeçalho do App) ---
              {
                id: 'med-i-ban-1',
                title: 'Banner Principal de Cabeçalho • Vitrine App',
                url: salon.cover_image_url || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&auto=format&fit=crop&q=80',
                type: 'image',
                media_group: 'imagens',
                category: 'banner',
                created_at: '2026-09-15',
                is_cover: true,
              },
              // --- IMAGENS: Logotipo (App) ---
              {
                id: 'med-i-log-1',
                title: 'Logotipo Oficial Redondo do Estabelecimento',
                url: salon.logo_url || 'https://images.unsplash.com/photo-1560869713-7d0a29430803?w=400&auto=format&fit=crop&q=80',
                type: 'image',
                media_group: 'imagens',
                category: 'logotipo',
                created_at: '2026-09-15',
              },
            ];
        setSalonMedia(defaultMediaList);
      } catch (err) {
        console.warn('Erro ao carregar dados do salão:', err);
      } finally {
        setIsLoadingClients(false);
        setIsLoadingTeam(false);
        setIsLoadingServices(false);
      }
    }

    loadSalonDetails();
  }, [salon.id, salon.category, salon.slug, salon.cover_image_url]);

  // Handlers da Galeria Central de Mídias do Estabelecimento
  const handleAddNewMedia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMediaForm.url.trim()) return;

    const newId = `med-${Date.now()}`;
    const newMedia: SalonMediaItem = {
      id: newId,
      title: newMediaForm.title.trim() || 'Nova Mídia',
      url: newMediaForm.url.trim(),
      type: newMediaForm.type,
      media_group: newMediaForm.media_group,
      category: newMediaForm.category,
      duration_seconds: newMediaForm.type === 'video' ? newMediaForm.duration_seconds : undefined,
      created_at: new Date().toISOString().split('T')[0],
      is_cover: newMediaForm.is_cover,
    };

    setSalonMedia((prev) => {
      let updated = [newMedia, ...prev];
      if (newMediaForm.is_cover || newMediaForm.category === 'banner') {
        salon.cover_image_url = newMedia.url;
        onUpdateSalon?.({ cover_image_url: newMedia.url });
        updated = updated.map((m) =>
          m.id === newId ? { ...m, is_cover: true } : { ...m, is_cover: false }
        );
      }
      if (newMediaForm.category === 'logotipo') {
        salon.logo_url = newMedia.url;
        onUpdateSalon?.({ logo_url: newMedia.url });
      }
      return updated;
    });

    setNewMediaForm({
      title: '',
      url: '',
      type: 'image',
      media_group: 'fotos',
      category: 'servicos',
      duration_seconds: 5,
      is_cover: false,
    });
    setIsUploadMediaModalOpen(false);
  };

  const handleSetAsCover = (mediaItem: SalonMediaItem) => {
    salon.cover_image_url = mediaItem.url;
    onUpdateSalon?.({ cover_image_url: mediaItem.url });
    setSalonMedia((prev) =>
      prev.map((m) => ({
        ...m,
        is_cover: m.id === mediaItem.id,
      }))
    );
  };

  const handleSetAsBanner = (mediaItem: SalonMediaItem) => {
    salon.cover_image_url = mediaItem.url;
    onUpdateSalon?.({ cover_image_url: mediaItem.url });
    setSalonMedia((prev) =>
      prev.map((m) =>
        m.id === mediaItem.id
          ? { ...m, is_cover: true, media_group: 'imagens', category: 'banner' }
          : { ...m, is_cover: false }
      )
    );
  };

  const handleSetAsLogo = (mediaItem: SalonMediaItem) => {
    salon.logo_url = mediaItem.url;
    onUpdateSalon?.({ logo_url: mediaItem.url });
    setSalonMedia((prev) =>
      prev.map((m) =>
        m.id === mediaItem.id
          ? { ...m, media_group: 'imagens', category: 'logotipo' }
          : m
      )
    );
  };

  const handleDeleteMedia = (mediaId: string) => {
    setSalonMedia((prev) => prev.filter((m) => m.id !== mediaId));
  };

  const handleImportGooglePhotos = () => {
    if (selectedGooglePhotos.length === 0) return;
    setIsGooglePhotosImporting(true);

    const importedItems: SalonMediaItem[] = selectedGooglePhotos.map((url, index) => {
      const isVideo = url.endsWith('.mp4');
      return {
        id: `gp-${Date.now()}-${index}`,
        title: isVideo ? `Vídeo Google Fotos ${index + 1}` : `Foto Google Fotos ${index + 1}`,
        url,
        type: isVideo ? 'video' : 'image',
        duration_seconds: isVideo ? 5 : undefined,
        media_group: isVideo ? 'videos' : 'fotos',
        category: 'servicos',
        created_at: new Date().toISOString().split('T')[0],
      };
    });

    setSalonMedia((prev) => [...importedItems, ...prev]);
    setSelectedGooglePhotos([]);
    setIsGooglePhotosImporting(false);
    setIsGooglePhotosModalOpen(false);
  };

  const handleLinkMediaToServiceAction = (serviceId: string) => {
    if (!mediaItemToLink) return;
    const itemUrl = mediaItemToLink.url;

    setServices((prev) =>
      prev.map((s) => {
        if (s.id === serviceId) {
          if (mediaItemToLink.type === 'video') {
            const currentVideos = s.videos || [];
            return {
              ...s,
              videos: [
                ...currentVideos,
                {
                  id: `v-${Date.now()}`,
                  url: itemUrl,
                  title: mediaItemToLink.title,
                  duration_seconds: mediaItemToLink.duration_seconds || 5,
                },
              ],
            };
          } else {
            const currentPhotos = s.photos || [];
            return {
              ...s,
              photos: [...currentPhotos, itemUrl],
            };
          }
        }
        return s;
      })
    );
    setMediaItemToLink(null);
  };

  const handleSelectFromGalleryForService = (mediaUrl: string) => {
    if (!targetServiceForGallerySelect) return;
    const { serviceId, targetType } = targetServiceForGallerySelect;

    setServices((prev) =>
      prev.map((s) => {
        if (s.id === serviceId) {
          if (targetType === 'photo') {
            return { ...s, photos: [...(s.photos || []), mediaUrl] };
          } else if (targetType === 'slide') {
            const currentSlides = s.slides || [];
            if (currentSlides.length < 5) {
              return { ...s, slides: [...currentSlides, mediaUrl] };
            }
          }
        }
        return s;
      })
    );
    setIsSelectFromGalleryModalOpen(false);
    setTargetServiceForGallerySelect(null);
  };

  const googlePhotosLibrary = [
    {
      id: 'gp-1',
      url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&auto=format&fit=crop&q=80',
      title: 'Bancada e Fade Alinhado',
      album: 'trabalhos',
      date: '10/10/2026',
    },
    {
      id: 'gp-2',
      url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80',
      title: 'Barba Terapia e Toalha',
      album: 'trabalhos',
      date: '08/10/2026',
    },
    {
      id: 'gp-3',
      url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800&auto=format&fit=crop&q=80',
      title: 'Finalização Navalha Afiada',
      album: 'trabalhos',
      date: '05/10/2026',
    },
    {
      id: 'gp-4',
      url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&auto=format&fit=crop&q=80',
      title: 'Fachada e Luminária Vintage',
      album: 'espaco',
      date: '28/09/2026',
    },
    {
      id: 'gp-5',
      url: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=800&auto=format&fit=crop&q=80',
      title: 'Lavatório de Massagem',
      album: 'espaco',
      date: '22/09/2026',
    },
    {
      id: 'gp-6',
      url: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?w=800&auto=format&fit=crop&q=80',
      title: 'Loiro Iluminado em Camadas',
      album: 'trabalhos',
      date: '18/09/2026',
    },
    {
      id: 'gp-7',
      url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80',
      title: 'Escova e Selagem Térmica',
      album: 'trabalhos',
      date: '15/09/2026',
    },
    {
      id: 'gp-8',
      url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&auto=format&fit=crop&q=80',
      title: 'Esmaltação Francesinha e Joia',
      album: 'trabalhos',
      date: '12/09/2026',
    },
    {
      id: 'gp-9',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      title: 'Stories 5s - Fade e Textura',
      album: 'stories',
      date: '11/10/2026',
      isVideo: true,
    },
    {
      id: 'gp-10',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      title: 'Stories 5s - Relaxamento',
      album: 'stories',
      date: '09/10/2026',
      isVideo: true,
    },
  ];

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(id);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleToggleServiceStatus = async (serviceId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    setServices((prev) =>
      prev.map((s) => (s.id === serviceId ? { ...s, is_active: newStatus } : s))
    );
    try {
      await supabase.from('services').update({ is_active: newStatus }).eq('id', serviceId);
    } catch (err) {
      console.warn('Erro ao atualizar status do serviço no Supabase:', err);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Deseja realmente remover este serviço do catálogo?')) return;
    setServices((prev) => prev.filter((s) => s.id !== serviceId));
    try {
      await supabase.from('services').delete().eq('id', serviceId);
    } catch (err) {
      console.warn('Erro ao excluir serviço no Supabase:', err);
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceForm.name.trim()) return;

    const newService: SalonServiceRecord = {
      id: `srv-${Date.now()}`,
      salon_id: salon.id,
      name: newServiceForm.name.trim(),
      category: newServiceForm.category.trim() || 'Geral',
      price: parseFloat(newServiceForm.price.replace(',', '.')) || 0,
      duration_minutes: parseInt(newServiceForm.duration_minutes, 10) || 30,
      description: newServiceForm.description.trim(),
      is_active: true,
      target_audience: 'all',
      photos: [],
      videos: [],
      slides: [],
    };

    setServices((prev) => [newService, ...prev]);
    setIsAddServiceModalOpen(false);
    setNewServiceForm({
      name: '',
      category: 'Cabelo',
      price: '',
      duration_minutes: '30',
      description: '',
    });

    try {
      await supabase.from('services').insert({
        salon_id: salon.id,
        name: newService.name,
        category: newService.category,
        price: newService.price,
        duration_minutes: newService.duration_minutes,
        description: newService.description,
        is_active: true,
      });
    } catch (err) {
      console.warn('Erro ao inserir serviço no Supabase:', err);
    }
  };

  const handleOpenEditService = (srv: SalonServiceRecord) => {
    setEditingService(srv);
    setEditServiceForm({
      name: srv.name,
      category: srv.category || 'Cabelo',
      price: srv.price ? srv.price.toFixed(2).replace('.', ',') : '',
      duration_minutes: String(srv.duration_minutes || 30),
      description: srv.description || '',
      is_active: srv.is_active ?? true,
    });
  };

  const handleUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService || !editServiceForm.name.trim()) return;

    const updatedPrice = parseFloat(editServiceForm.price.replace(',', '.')) || 0;
    const updatedDuration = parseInt(editServiceForm.duration_minutes, 10) || 30;

    const updatedService: SalonServiceRecord = {
      ...editingService,
      name: editServiceForm.name.trim(),
      category: editServiceForm.category.trim() || 'Geral',
      price: updatedPrice,
      duration_minutes: updatedDuration,
      description: editServiceForm.description.trim(),
      is_active: editServiceForm.is_active,
    };

    setServices((prev) =>
      prev.map((s) => (s.id === editingService.id ? updatedService : s))
    );
    setEditingService(null);

    try {
      await supabase
        .from('services')
        .update({
          name: updatedService.name,
          category: updatedService.category,
          price: updatedService.price,
          duration_minutes: updatedService.duration_minutes,
          description: updatedService.description,
          is_active: updatedService.is_active,
        })
        .eq('id', editingService.id);
    } catch (err) {
      console.warn('Erro ao atualizar serviço no Supabase:', err);
    }
  };

  // Handlers de Fotos do Serviço (CRUD)
  const handleAddPhotoToService = (serviceId: string, url: string) => {
    if (!url.trim()) return;
    setServices((prev) =>
      prev.map((s) => {
        if (s.id === serviceId) {
          const updatedPhotos = [...(s.photos || []), url.trim()];
          return { ...s, photos: updatedPhotos };
        }
        return s;
      })
    );
    setNewPhotoUrl('');
  };

  const handleRemovePhotoFromService = (serviceId: string, photoIndex: number) => {
    setServices((prev) =>
      prev.map((s) => {
        if (s.id === serviceId) {
          const updated = [...(s.photos || [])];
          updated.splice(photoIndex, 1);
          return { ...s, photos: updated };
        }
        return s;
      })
    );
  };

  // Handlers de Vídeos 5s do Serviço (CRUD)
  const handleAddVideoToService = (serviceId: string, videoUrl: string, title?: string) => {
    if (!videoUrl.trim()) return;
    const newVideo: SalonServiceMediaItem = {
      id: `v-${Date.now()}`,
      url: videoUrl.trim(),
      title: title?.trim() || 'Vídeo 5s (Stories)',
      duration_seconds: 5,
    };
    setServices((prev) =>
      prev.map((s) => {
        if (s.id === serviceId) {
          return { ...s, videos: [...(s.videos || []), newVideo] };
        }
        return s;
      })
    );
    setNewVideoUrl('');
    setNewVideoTitle('');
  };

  const handleRemoveVideoFromService = (serviceId: string, videoId: string) => {
    setServices((prev) =>
      prev.map((s) => {
        if (s.id === serviceId) {
          return { ...s, videos: (s.videos || []).filter((v) => v.id !== videoId) };
        }
        return s;
      })
    );
  };

  // Handlers de Slide do Serviço (Limite de até 5 imagens e ordenação)
  const handleAddSlideToService = (serviceId: string, url: string) => {
    if (!url.trim()) return;
    setServices((prev) =>
      prev.map((s) => {
        if (s.id === serviceId) {
          const currentSlides = s.slides || [];
          if (currentSlides.length >= 5) {
            alert('Limite máximo de 5 imagens por slide atingido.');
            return s;
          }
          return { ...s, slides: [...currentSlides, url.trim()] };
        }
        return s;
      })
    );
    setNewSlideUrl('');
  };

  const handleRemoveSlideFromService = (serviceId: string, slideIndex: number) => {
    setServices((prev) =>
      prev.map((s) => {
        if (s.id === serviceId) {
          const updated = [...(s.slides || [])];
          updated.splice(slideIndex, 1);
          return { ...s, slides: updated };
        }
        return s;
      })
    );
    setActiveSlideIndex((prev) => Math.max(0, prev - 1));
  };

  const handleMoveSlide = (serviceId: string, fromIndex: number, toIndex: number) => {
    setServices((prev) =>
      prev.map((s) => {
        if (s.id === serviceId && s.slides) {
          const updated = [...s.slides];
          if (toIndex < 0 || toIndex >= updated.length) return s;
          const [moved] = updated.splice(fromIndex, 1);
          updated.splice(toIndex, 0, moved);
          return { ...s, slides: updated };
        }
        return s;
      })
    );
    setActiveSlideIndex(toIndex);
  };

  const serviceCategories = ['all', 'Cabelo', 'Barba', 'Combos', 'Tratamentos', 'Coloração', 'Unhas'];

  const filteredServices = services.filter((s) => {
    const matchesSearch =
      !serviceSearch.trim() ||
      s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
      s.category.toLowerCase().includes(serviceSearch.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(serviceSearch.toLowerCase()));

    const matchesCategory =
      serviceCategoryFilter === 'all' || s.category.toLowerCase() === serviceCategoryFilter.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  // Sub-abas dinâmicas conforme a aba principal selecionada (Fotos / Vídeos / Imagens)
  const currentSubTabs: { id: SalonMediaSubTab; label: string }[] =
    mediaMainTab === 'fotos'
      ? [
          { id: 'all', label: 'Todas as Fotos' },
          { id: 'servicos', label: 'Serviços' },
          { id: 'profissionais', label: 'Profissionais' },
          { id: 'espaco', label: 'Espaço' },
        ]
      : mediaMainTab === 'videos'
      ? [
          { id: 'all', label: 'Todos os Vídeos (5s)' },
          { id: 'servicos', label: 'Serviços' },
          { id: 'espaco', label: 'Espaço' },
        ]
      : [
          { id: 'all', label: 'Todas as Imagens' },
          { id: 'banner', label: 'Banner (Cabeçalho)' },
          { id: 'logotipo', label: 'Logotipo' },
        ];

  // Helper para normalizar o grupo de mídia
  const resolveMediaGroup = (item: SalonMediaItem): 'fotos' | 'videos' | 'imagens' => {
    if (item.media_group) return item.media_group;
    if (item.type === 'video') return 'videos';
    if (item.category === 'banner' || item.category === 'logotipo') return 'imagens';
    return 'fotos';
  };

  // Helper para normalizar a sub-categoria
  const resolveMediaSubCategory = (item: SalonMediaItem): string => {
    if (item.category === 'procedimento') return 'servicos';
    if (item.category === 'equipe') return 'profissionais';
    if (item.category === 'ambiente') return 'espaco';
    return item.category || 'servicos';
  };

  // Filtragem estrita e reativa das mídias
  const filteredMedia = salonMedia.filter((item) => {
    const group = resolveMediaGroup(item);
    if (group !== mediaMainTab) return false;

    if (mediaSubTab !== 'all') {
      const sub = resolveMediaSubCategory(item);
      if (sub !== mediaSubTab) return false;
    }

    if (mediaSearch.trim()) {
      const q = mediaSearch.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSub = resolveMediaSubCategory(item).toLowerCase().includes(q);
      if (!matchTitle && !matchSub) return false;
    }

    return true;
  });

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
              </div>
            </div>
          </div>

          {/* Lado Direito: Ações Rápidas */}
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setIsWelcomeQrModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              title="Visualizar Link do App e QR Code para Balcão"
            >
              <QrCode className="w-3.5 h-3.5 text-white" />
              <span className="text-white">QR Code &amp; Link</span>
            </button>

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
          {/* 1. Dados */}
          <button
            onClick={() => setActiveTab('general')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'general'
                ? 'bg-[#20C933] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Dados</span>
          </button>

          {/* 2. Id. Visual */}
          <button
            onClick={() => setActiveTab('branding')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'branding'
                ? 'bg-[#20C933] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Id. Visual</span>
          </button>

          {/* 3. Galeria de Imagens (Acervo Central de Mídias do Estabelecimento) */}
          <button
            onClick={() => setActiveTab('media')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'media'
                ? 'bg-[#20C933] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <Images className="w-4 h-4" />
            <span>Galeria de Imagens</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                activeTab === 'media'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {salonMedia.length}
            </span>
          </button>

          {/* 4. Serviços */}
          <button
            onClick={() => setActiveTab('services')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'services'
                ? 'bg-[#20C933] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <Scissors className="w-4 h-4" />
            <span>Serviços</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                activeTab === 'services'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {services.length}
            </span>
          </button>

          {/* 4. Equipe */}
          <button
            onClick={() => setActiveTab('team')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'team'
                ? 'bg-[#20C933] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Equipe</span>
          </button>

          {/* 5. Clientes */}
          <button
            onClick={() => setActiveTab('clients')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'clients'
                ? 'bg-[#20C933] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Clientes</span>
          </button>

          {/* 6. Formulários */}
          <button
            onClick={() => setActiveTab('forms')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'forms'
                ? 'bg-[#20C933] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Formulários</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. CONTEÚDO DAS ABAS                                     */}
      {/* ======================================================== */}

      {/* ABA 1: DADOS GERAIS (2 COLUNAS LADO A LADO) */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Coluna 1: Titular / Proprietário Responsável */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">Titular / Proprietário</h3>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20">
                  1 Usuário = 1 Salão
                </span>
              </div>

              <div className="pt-3 flex items-center gap-3">
                <UserAvatar
                  fullName={salon.owner_name || salon.legal_name || 'Beto Roberto'}
                  photoUrl={salon.owner_avatar_url}
                  size="md"
                />
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {salon.owner_name || salon.legal_name || 'Beto Roberto'}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    Proprietário Master • profiles/clients
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex items-center justify-between py-0.5">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> WhatsApp:
                </span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                  {salon.owner_phone || salon.phone_whatsapp || '(11) 98765-4321'}
                </span>
              </div>
              <div className="flex items-center justify-between py-0.5">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> E-mail:
                </span>
                <span className="font-mono text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                  {salon.owner_email || salon.email || `contato@${salon.slug}.com`}
                </span>
              </div>
            </div>
          </div>

          {/* Coluna 2: Dados Comerciais & Fiscais */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm flex flex-col justify-between">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
              <CreditCard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Dados Comerciais & Fiscais</span>
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Documento:</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {salon.document_type || 'CNPJ'}: {salon.document_number || '45.123.890/0001-44'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Chave PIX:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold truncate max-w-[180px]">
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

          {/* Linha Inferior Completa: Link Exclusivo do App & Placa QR Code de Balcão */}
          <div className="md:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="bg-white p-2 rounded-xl border border-slate-200 shrink-0">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                    fullVitrineUrl
                  )}&format=png&margin=6`}
                  alt={`QR Code ${salon.trade_name}`}
                  className="w-16 h-16 object-contain"
                />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-emerald-500 shrink-0" />
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Link Exclusivo &amp; QR Code de Balcão
                  </h4>
                </div>
                <p className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 truncate">
                  {fullVitrineUrl}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Compartilhe o link com clientes ou imprima a placa de QR Code para recepção.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => handleCopy(fullVitrineUrl, 'vitrine-main-link')}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                {copiedUrl === 'vitrine-main-link' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-500">Link Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsWelcomeQrModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              >
                <Printer className="w-3.5 h-3.5 text-white" />
                <span className="text-white">Abrir QR Code &amp; Imprimir Placa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: IDENTIDADE VISUAL */}
      {activeTab === 'branding' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Card: Logotipos da Marca */}
          <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Logotipos & Variações da Marca</h3>
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                Renderização Dinâmica no Portal
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Logotipo Versão Dark */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-200">
                    <Moon className="w-3.5 h-3.5 text-blue-400" />
                    <span>Logotipo Versão Dark</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Para tema escuro</span>
                </div>
                <div className="h-24 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-center p-3">
                  {salon.logo_dark_url || salon.logo_url ? (
                    <img
                      src={salon.logo_dark_url || salon.logo_url}
                      alt="Logo Dark"
                      className="max-h-16 max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-xs text-slate-500 font-mono">Sem logo dark específico (usando padrão)</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  Exibido na vitrine quando o usuário acessa em modo escuro.
                </p>
              </div>

              {/* Logotipo Versão Light */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    <span>Logotipo Versão Light</span>
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Para tema claro</span>
                </div>
                <div className="h-24 rounded-lg bg-white border border-slate-300 dark:border-slate-800 flex items-center justify-center p-3">
                  {salon.logo_light_url || salon.logo_url ? (
                    <img
                      src={salon.logo_light_url || salon.logo_url}
                      alt="Logo Light"
                      className="max-h-16 max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-xs text-slate-400 font-mono">Sem logo light específico</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Exibido em emails transacionais e faturas claras.
                </p>
              </div>
            </div>
          </div>

          {/* Card: Cores, Favicon e Preview */}
          <div className="lg:col-span-1 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Cores & Layout</h3>
            </div>

            {/* Favicon & Cor Primária */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 block">Favicon</span>
                <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 flex items-center justify-center mx-auto overflow-hidden">
                  {salon.favicon_url || salon.logo_url ? (
                    <img src={salon.favicon_url || salon.logo_url} alt="Favicon" className="w-7 h-7 object-contain" />
                  ) : (
                    <span className="text-xs font-bold text-emerald-500">V</span>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 block">Cor Primária</span>
                <div className="flex items-center justify-center gap-1.5 pt-1">
                  <span
                    className="w-6 h-6 rounded-full border border-white/20 shadow-xs"
                    style={{ backgroundColor: salon.primary_color || '#20C933' }}
                  />
                  <span className="font-mono text-xs text-slate-700 dark:text-slate-300 font-semibold">
                    {salon.primary_color || '#20C933'}
                  </span>
                </div>
              </div>
            </div>

            {/* Preview de Botão com a cor do salão */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Preview de Ação no App
              </span>
              <button
                className="w-full py-2 px-3 rounded-xl text-white font-bold text-xs shadow-xs transition active:scale-95"
                style={{ backgroundColor: salon.primary_color || '#20C933' }}
              >
                Agendar Horário • {salon.trade_name}
              </button>
            </div>

            {/* Vitrine Pública & Subdomínio */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Subdomínio Oficial
              </span>
              <div className="flex items-center justify-between font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                <span>{salon.slug}.vagouapp.com</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: GALERIA DE IMAGENS DO ESTABELECIMENTO (ACERVO CENTRAL DE MÍDIAS) */}
      {activeTab === 'media' && (
        <div className="space-y-6">
          {/* Card Principal da Galeria do Estabelecimento */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            {/* Header da Seção: Título e Ações Principais */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Images className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Galeria de Mídias do Estabelecimento</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Organização simplificada do acervo do salão em 3 abas principais: Fotos, Vídeos (5s) e Imagens da Marca.
                </p>
              </div>

              {/* Botões de Ação no Topo */}
              <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setNewMediaForm({
                      title: '',
                      url: '',
                      type: mediaMainTab === 'videos' ? 'video' : 'image',
                      media_group: mediaMainTab,
                      category:
                        mediaMainTab === 'fotos'
                          ? mediaSubTab === 'all' ? 'servicos' : (mediaSubTab as any)
                          : mediaMainTab === 'videos'
                          ? mediaSubTab === 'all' ? 'servicos' : (mediaSubTab as any)
                          : mediaSubTab === 'all' ? 'banner' : (mediaSubTab as any),
                      duration_seconds: 5,
                      is_cover: false,
                    });
                    setIsUploadMediaModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-white" />
                  <span>Upload Local</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedGooglePhotos([]);
                    setIsGooglePhotosModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                >
                  <Cloud className="w-3.5 h-3.5 text-white" />
                  <span>Google Fotos</span>
                </button>
              </div>
            </div>

            {/* AS 3 ABAS PRINCIPAIS: FOTOS, VÍDEOS (5S) E IMAGENS */}
            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
              {/* 1. Aba Fotos */}
              <button
                type="button"
                onClick={() => {
                  setMediaMainTab('fotos');
                  setMediaSubTab('all');
                }}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                  mediaMainTab === 'fotos'
                    ? 'bg-[#20C933] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800/60'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Fotos</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                    mediaMainTab === 'fotos'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {salonMedia.filter((m) => resolveMediaGroup(m) === 'fotos').length}
                </span>
              </button>

              {/* 2. Aba Vídeos */}
              <button
                type="button"
                onClick={() => {
                  setMediaMainTab('videos');
                  setMediaSubTab('all');
                }}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                  mediaMainTab === 'videos'
                    ? 'bg-[#20C933] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800/60'
                }`}
              >
                <Film className="w-4 h-4" />
                <span>Vídeos</span>
                <span className="text-[10px] font-semibold opacity-90 hidden sm:inline">(5s / MB equiv.)</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                    mediaMainTab === 'videos'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {salonMedia.filter((m) => resolveMediaGroup(m) === 'videos').length}
                </span>
              </button>

              {/* 3. Aba Imagens */}
              <button
                type="button"
                onClick={() => {
                  setMediaMainTab('imagens');
                  setMediaSubTab('all');
                }}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                  mediaMainTab === 'imagens'
                    ? 'bg-[#20C933] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800/60'
                }`}
              >
                <Layout className="w-4 h-4" />
                <span>Imagens</span>
                <span className="text-[10px] font-semibold opacity-90 hidden sm:inline">(Banner & Logo)</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                    mediaMainTab === 'imagens'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {salonMedia.filter((m) => resolveMediaGroup(m) === 'imagens').length}
                </span>
              </button>
            </div>

            {/* SUB-ABAS ESPECÍFICAS DA ABA SELECIONADA + CAMPO DE BUSCA */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              {/* Chips de Sub-aba */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap mr-1">
                  Sub-abas:
                </span>
                {currentSubTabs.map((sub) => {
                  const isActive = mediaSubTab === sub.id;
                  const count =
                    sub.id === 'all'
                      ? salonMedia.filter((m) => resolveMediaGroup(m) === mediaMainTab).length
                      : salonMedia.filter(
                          (m) =>
                            resolveMediaGroup(m) === mediaMainTab &&
                            resolveMediaSubCategory(m) === sub.id
                        ).length;

                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setMediaSubTab(sub.id)}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-[#20C933] text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span>{sub.label}</span>
                      <span
                        className={`text-[10px] font-mono font-bold ${
                          isActive ? 'text-white/80' : 'text-slate-500'
                        }`}
                      >
                        ({count})
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Busca por Título */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={mediaSearch}
                  onChange={(e) => setMediaSearch(e.target.value)}
                  placeholder={`Buscar em ${
                    mediaMainTab === 'fotos' ? 'Fotos' : mediaMainTab === 'videos' ? 'Vídeos' : 'Imagens'
                  }...`}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Grid de Cards de Mídia */}
            {filteredMedia.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <Images className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  Nenhuma mídia encontrada na aba {mediaMainTab.toUpperCase()}
                  {mediaSubTab !== 'all' ? ` (${mediaSubTab})` : ''}.
                </p>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewMediaForm({
                        title: '',
                        url: '',
                        type: mediaMainTab === 'videos' ? 'video' : 'image',
                        media_group: mediaMainTab,
                        category:
                          mediaMainTab === 'fotos'
                            ? mediaSubTab === 'all' ? 'servicos' : (mediaSubTab as any)
                            : mediaMainTab === 'videos'
                            ? mediaSubTab === 'all' ? 'servicos' : (mediaSubTab as any)
                            : mediaSubTab === 'all' ? 'banner' : (mediaSubTab as any),
                        duration_seconds: 5,
                        is_cover: false,
                      });
                      setIsUploadMediaModalOpen(true);
                    }}
                    className="px-3 py-1 rounded-lg bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-white" />
                    <span>Fazer Upload</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsGooglePhotosModalOpen(true)}
                    className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Cloud className="w-3 h-3 text-white" />
                    <span>Abrir Google Fotos</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {filteredMedia.map((item) => {
                  const subCat = resolveMediaSubCategory(item);
                  const isCurrentCover = item.is_cover || salon.cover_image_url === item.url;
                  const isCurrentLogo = salon.logo_url === item.url;

                  return (
                    <div
                      key={item.id}
                      className="group relative rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col transition hover:border-slate-300 dark:hover:border-slate-700"
                    >
                      {/* Thumbnail Container */}
                      <div
                        className="relative aspect-video sm:aspect-square w-full bg-slate-900 overflow-hidden cursor-pointer"
                        onClick={() => setViewingMediaItem(item)}
                      >
                        {item.type === 'video' ? (
                          <>
                            <video
                              src={item.url}
                              muted
                              loop
                              playsInline
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                              <div className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-xs">
                                <Play className="w-3.5 h-3.5 fill-white translate-x-0.5" />
                              </div>
                            </div>
                          </>
                        ) : (
                          <img
                            src={item.url}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            loading="lazy"
                          />
                        )}

                        {/* Badges de Topo */}
                        <div className="absolute top-2 left-2 flex items-center gap-1">
                          {item.type === 'video' ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white flex items-center gap-0.5 shadow-xs">
                              <Play className="w-2.5 h-2.5 fill-white" />
                              <span>5s</span>
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-900/80 text-white flex items-center gap-0.5 shadow-xs backdrop-blur-xs">
                              <ImageIcon className="w-2.5 h-2.5 text-white" />
                              <span>Foto</span>
                            </span>
                          )}

                          {isCurrentCover && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white flex items-center gap-0.5 shadow-xs">
                              <Sparkles className="w-2.5 h-2.5 text-white" />
                              <span>Banner Capa</span>
                            </span>
                          )}

                          {isCurrentLogo && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white flex items-center gap-0.5 shadow-xs">
                              <Bookmark className="w-2.5 h-2.5 text-white" />
                              <span>Logotipo Ativo</span>
                            </span>
                          )}
                        </div>

                        <div className="absolute top-2 right-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-950/70 text-slate-200 capitalize backdrop-blur-xs border border-white/10">
                            {subCat}
                          </span>
                        </div>

                        {/* Overlay com Ações ao Hover */}
                        <div
                          className="absolute inset-0 bg-slate-950/75 opacity-0 group-hover:opacity-100 transition duration-200 p-2 flex flex-col justify-between"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setViewingMediaItem(item)}
                              className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black transition cursor-pointer"
                              title="Visualizar em Tela Cheia"
                            >
                              <Maximize2 className="w-3.5 h-3.5 text-white" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopy(item.url, item.id)}
                              className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black transition cursor-pointer"
                              title="Copiar Link da Mídia"
                            >
                              {copiedUrl === item.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-white" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMedia(item.id)}
                              className="p-1.5 rounded-lg bg-rose-600/80 text-white hover:bg-rose-600 transition cursor-pointer"
                              title="Excluir Mídia"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-white" />
                            </button>
                          </div>

                          <div className="space-y-1">
                            {/* Ações Específicas por Tipo e Aba */}
                            {mediaMainTab === 'imagens' ? (
                              <div className="grid grid-cols-2 gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleSetAsBanner(item)}
                                  className="w-full py-1 px-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                                  title="Definir como Banner de Cabeçalho do App"
                                >
                                  <Sparkles className="w-3 h-3 text-white" />
                                  <span>Banner App</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSetAsLogo(item)}
                                  className="w-full py-1 px-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                                  title="Definir como Logotipo do App"
                                >
                                  <Bookmark className="w-3 h-3 text-white" />
                                  <span>Logotipo</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                {!isCurrentCover && item.type === 'image' && (
                                  <button
                                    type="button"
                                    onClick={() => handleSetAsBanner(item)}
                                    className="w-full py-1 px-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    <Sparkles className="w-3 h-3 text-white" />
                                    <span>Tornar Banner</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setMediaItemToLink(item)}
                                  className="w-full py-1 px-1.5 rounded-lg bg-[#20C933] hover:bg-[#1bb32d] text-white text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Scissors className="w-3 h-3 text-white" />
                                  <span>Vincular Serviço</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Metadados no Rodapé do Card */}
                      <div className="p-2.5 space-y-1">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate" title={item.title}>
                          {item.title}
                        </h4>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                          <span>{item.created_at || '2026-10-12'}</span>
                          <span className="capitalize">
                            {subCat === 'servicos'
                              ? 'Serviços'
                              : subCat === 'profissionais'
                              ? 'Profissionais'
                              : subCat === 'espaco'
                              ? 'Espaço'
                              : subCat === 'banner'
                              ? 'Banner'
                              : subCat === 'logotipo'
                              ? 'Logotipo'
                              : subCat}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 4: SERVIÇOS (CATÁLOGO DE PROCEDIMENTOS COM MÍDIAS, VÍDEOS 5S E SLIDE DE 5 IMAGENS POR SERVIÇO) */}
      {activeTab === 'services' && (
        <div className="space-y-6">
          {/* Card Principal do Catálogo de Procedimentos */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            {/* Header da Seção: Título e Ação de Novo Serviço */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Catálogo de Procedimentos & Mídias</span>
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setIsAddServiceModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5 text-white" />
                <span>Novo Serviço</span>
              </button>
            </div>

            {/* Filtros e Busca Rápida */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  placeholder="Buscar serviço por nome..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Categorias Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
                {serviceCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setServiceCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                      serviceCategoryFilter === cat
                        ? 'bg-[#20C933] text-white font-bold shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {cat === 'all' ? 'Todos' : cat}
                  </button>
                ))}
              </div>
            </div>

              {/* Tabela Plana e Limpa de Serviços */}
              {isLoadingServices ? (
                <div className="py-8 text-center text-xs text-slate-500">Carregando catálogo de serviços...</div>
              ) : filteredServices.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  Nenhum procedimento encontrado com os filtros selecionados.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                        <th className="py-2.5 px-3">Procedimento</th>
                        <th className="py-2.5 px-3">Categoria</th>
                        <th className="py-2.5 px-3">Valor</th>
                        <th className="py-2.5 px-3">Duração</th>
                        <th className="py-2.5 px-3 text-center">Fotos</th>
                        <th className="py-2.5 px-3 text-center">Vídeos</th>
                        <th className="py-2.5 px-3 text-center">Slide (5 imgs)</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {filteredServices.map((srv) => {
                        const photoCount = srv.photos?.length || 0;
                        const videoCount = srv.videos?.length || 0;
                        const slideCount = srv.slides?.length || 0;

                        return (
                          <tr key={srv.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition">
                            {/* 1. Procedimento */}
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-slate-900 dark:text-white">{srv.name}</div>
                              {srv.description && (
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                                  {srv.description}
                                </div>
                              )}
                            </td>

                            {/* 2. Categoria */}
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                                {srv.category}
                              </span>
                            </td>

                            {/* 3. Valor */}
                            <td className="py-2.5 px-3 font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                              R$ {srv.price.toFixed(2).replace('.', ',')}
                            </td>

                            {/* 4. Duração */}
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                              <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {srv.duration_minutes} min
                              </span>
                            </td>

                            {/* 5. Fotos (Galeria do Serviço com CRUD) */}
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => setSelectedServiceForPhotos(srv)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                                  photoCount > 0
                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border border-blue-500/20'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-transparent'
                                }`}
                                title={`Abrir galeria de fotos de ${srv.name}`}
                              >
                                <ImageIcon className="w-3.5 h-3.5" />
                                <span className="font-mono">{photoCount}</span>
                              </button>
                            </td>

                            {/* 6. Vídeos (Vídeos de 5s do Serviço com CRUD) */}
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => setSelectedServiceForVideos(srv)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                                  videoCount > 0
                                    ? 'bg-[#20C933] text-white hover:bg-[#1bb32d] shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-transparent'
                                }`}
                                title={`Abrir vídeos de 5s de ${srv.name}`}
                              >
                                <Film className={`w-3.5 h-3.5 ${videoCount > 0 ? 'text-white' : ''}`} />
                                <span className="font-mono">{videoCount}</span>
                              </button>
                            </td>

                            {/* 7. Slide (Carrossel de 5 Imagens do Serviço com CRUD) */}
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedServiceForSlides(srv);
                                  setActiveSlideIndex(0);
                                }}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                                  slideCount === 5
                                    ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 hover:bg-purple-500/25 border border-purple-500/30'
                                    : slideCount > 0
                                    ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 border border-purple-500/20'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-transparent'
                                }`}
                                title={`Abrir slide (até 5 imagens) de ${srv.name}`}
                              >
                                <Layers className="w-3.5 h-3.5" />
                                <span className="font-mono">{slideCount}/5</span>
                              </button>
                            </td>

                            {/* 8. Status */}
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleServiceStatus(srv.id, srv.is_active)}
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition ${
                                  srv.is_active
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-700'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    srv.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                                  }`}
                                />
                                <span>{srv.is_active ? 'Ativo' : 'Pausado'}</span>
                              </button>
                            </td>

                            {/* 9. Ação (Editar e Excluir) */}
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditService(srv)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition cursor-pointer"
                                  title={`Editar ${srv.name}`}
                                  aria-label={`Editar ${srv.name}`}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteService(srv.id)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition cursor-pointer"
                                  title="Excluir procedimento"
                                  aria-label="Excluir procedimento"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
        </div>
      )}

      {/* ABA 4: EQUIPE & COLABORADORES */}
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

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Profissional</th>
                  <th className="py-2.5 px-3">Cargo / Função</th>
                  <th className="py-2.5 px-3">WhatsApp</th>
                  <th className="py-2.5 px-3 text-center">Comissão</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {team.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Nenhum profissional cadastrado para este estabelecimento.
                    </td>
                  </tr>
                ) : (
                  team.map((pro) => (
                    <tr key={pro.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar fullName={pro.name} photoUrl={pro.avatar_url} size="sm" />
                          <span className="font-bold text-slate-900 dark:text-white">{pro.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                          {pro.role}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">
                        {pro.phone || 'Sem telefone'}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                        {pro.commission_rate}%
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          Ativo
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 5: CLIENTES FIXOS DO ESTABELECIMENTO */}
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

      {/* ABA 6: FORMULÁRIOS INTEGRADOS DO SALÃO */}
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
                  <TriadeMnvClientLoginForm
                    salonName={salon.trade_name}
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
                  <TriadeMnvClientRegisterForm
                    salonName={salon.trade_name}
                    salonLogoUrl={salon.logo_url}
                    salonAccentColor={salon.primary_color || '#20C933'}
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

            <div className="flex-1 overflow-y-auto p-2 sm:p-4 bg-slate-950">
              {simulatorMode === 'login' ? (
                <TriadeMnvClientLoginForm
                  salonName={salon.trade_name}
                  onSuccess={() => {
                    alert(`✅ Sucesso! O cliente foi autenticado no estabelecimento ${salon.trade_name}!`);
                    setIsSimulatorOpen(false);
                  }}
                />
              ) : (
                <TriadeMnvClientRegisterForm
                  salonName={salon.trade_name}
                  salonLogoUrl={salon.logo_url}
                  salonAccentColor={salon.primary_color || '#20C933'}
                  onClose={() => setIsSimulatorOpen(false)}
                  showCloseButton={true}
                  onSuccess={() => {
                    alert(`✅ Sucesso! O cliente foi cadastrado no estabelecimento ${salon.trade_name}!`);
                    setIsSimulatorOpen(false);
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: GALERIA DE FOTOS DO PROCEDIMENTO COM CRUD */}
      {selectedServiceForPhotos && (() => {
        const activeSrv = services.find((s) => s.id === selectedServiceForPhotos.id) || selectedServiceForPhotos;
        const photos = activeSrv.photos || [];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Galeria de Fotos do Procedimento</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                        {photos.length} {photos.length === 1 ? 'foto' : 'fotos'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {activeSrv.name} • {activeSrv.category}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedServiceForPhotos(null);
                    setNewPhotoUrl('');
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  title="Fechar"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Formulário Rápido de Adição de Foto */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 space-y-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (newPhotoUrl.trim()) {
                      handleAddPhotoToService(activeSrv.id, newPhotoUrl.trim());
                    }
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="url"
                    value={newPhotoUrl}
                    onChange={(e) => setNewPhotoUrl(e.target.value)}
                    placeholder="Cole a URL da nova foto do serviço (ex: https://images.unsplash.com/...)"
                    className="flex-1 px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={!newPhotoUrl.trim()}
                    className="px-4 py-2 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 text-white" />
                    <span>Adicionar Foto</span>
                  </button>
                </form>

                {/* Botão Escolher da Galeria Central + Sugestões Rápidas */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-200 dark:border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetServiceForGallerySelect({
                        serviceId: activeSrv.id,
                        targetType: 'photo',
                      });
                      setIsSelectFromGalleryModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs self-start"
                  >
                    <Images className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Escolher da Galeria do Salão ({salonMedia.length})</span>
                  </button>

                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <span className="font-semibold">Inserir teste:</span>
                    <button
                      type="button"
                      onClick={() =>
                        handleAddPhotoToService(
                          activeSrv.id,
                          'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&auto=format&fit=crop&q=80'
                        )
                      }
                      className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      + Exemplo 1
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() =>
                        handleAddPhotoToService(
                          activeSrv.id,
                          'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&auto=format&fit=crop&q=80'
                        )
                      }
                      className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      + Exemplo 2
                    </button>
                  </div>
                </div>
              </div>

              {/* Grid de Fotos do Serviço */}
              <div className="p-4 overflow-y-auto flex-1">
                {photos.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
                    <ImageIcon className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                    Nenhuma foto cadastrada para este procedimento ainda.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {photos.map((url, idx) => (
                      <div
                        key={idx}
                        className="group relative rounded-xl overflow-hidden aspect-square border border-slate-200 dark:border-slate-800 bg-slate-950 shadow-xs"
                      >
                        <img
                          src={url}
                          alt={`${activeSrv.name} - foto ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300 cursor-pointer"
                          onClick={() => setViewingPhotoUrl(url)}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition p-2 flex items-end justify-between">
                          <button
                            type="button"
                            onClick={() => setViewingPhotoUrl(url)}
                            className="p-1 rounded-lg bg-black/60 text-white hover:bg-black transition cursor-pointer"
                            title="Visualizar ampliada"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemovePhotoFromService(activeSrv.id, idx)}
                            className="p-1 rounded-lg bg-red-600/80 text-white hover:bg-red-600 transition cursor-pointer"
                            title="Remover foto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Rodapé */}
              <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Fotos sincronizadas na vitrine deste procedimento.
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedServiceForPhotos(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
                >
                  Concluir
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 2: VÍDEOS DE 5S DO PROCEDIMENTO COM CRUD */}
      {selectedServiceForVideos && (() => {
        const activeSrv = services.find((s) => s.id === selectedServiceForVideos.id) || selectedServiceForVideos;
        const videos = activeSrv.videos || [];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#20C933]/15 text-[#20C933] flex items-center justify-center">
                    <Play className="w-4 h-4 fill-[#20C933]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Vídeos de 5 Segundos (Radar Stories Nível 3)</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#20C933] text-white font-bold">
                        {videos.length} {videos.length === 1 ? 'vídeo' : 'vídeos'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {activeSrv.name} • Loop de 5s para vagas imediatas no radar
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedServiceForVideos(null);
                    setNewVideoUrl('');
                    setNewVideoTitle('');
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  title="Fechar"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Formulário Rápido de Adição de Vídeo */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 space-y-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (newVideoUrl.trim()) {
                      handleAddVideoToService(activeSrv.id, newVideoUrl.trim(), newVideoTitle);
                    }
                  }}
                  className="flex flex-col sm:flex-row gap-2"
                >
                  <input
                    type="url"
                    value={newVideoUrl}
                    onChange={(e) => setNewVideoUrl(e.target.value)}
                    placeholder="URL do vídeo MP4 (5s vertical)..."
                    className="flex-1 px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                  <input
                    type="text"
                    value={newVideoTitle}
                    onChange={(e) => setNewVideoTitle(e.target.value)}
                    placeholder="Título (opcional)"
                    className="sm:w-44 px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={!newVideoUrl.trim()}
                    className="px-4 py-2 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] disabled:opacity-50 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 text-white" />
                    <span>Adicionar Vídeo 5s</span>
                  </button>
                </form>

                {/* Sugestões Rápidas de Vídeo */}
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <span className="font-semibold">Inserir vídeo de teste:</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleAddVideoToService(
                        activeSrv.id,
                        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                        'Fade 5s em Loop'
                      )
                    }
                    className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    + Vídeo Exemplo 1
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleAddVideoToService(
                        activeSrv.id,
                        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
                        'Toalha Quente 5s'
                      )
                    }
                    className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    + Vídeo Exemplo 2
                  </button>
                </div>
              </div>

              {/* Lista/Grid de Vídeos de 5s */}
              <div className="p-4 overflow-y-auto flex-1">
                {videos.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
                    <Film className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                    Nenhum vídeo de 5 segundos cadastrado para este procedimento.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {videos.map((vid) => (
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
                          <span className="font-bold text-white truncate max-w-[140px]">
                            {vid.title || 'Vídeo 5s'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveVideoFromService(activeSrv.id, vid.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-red-400 transition cursor-pointer"
                            title="Remover vídeo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Rodapé */}
              <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Vídeos verticais de 5 segundos ativam o Stories Nível 3 no radar de urgência.
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedServiceForVideos(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
                >
                  Concluir
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 3: SLIDE DO PROCEDIMENTO COM ATÉ 5 IMAGENS E CRUD */}
      {selectedServiceForSlides && (() => {
        const activeSrv = services.find((s) => s.id === selectedServiceForSlides.id) || selectedServiceForSlides;
        const slides = activeSrv.slides || [];
        const isLimitReached = slides.length >= 5;
        const currentActiveIndex = Math.min(activeSlideIndex, Math.max(0, slides.length - 1));

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Slide do Procedimento (Carrossel Nível 2)</span>
                      <span
                        className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold ${
                          isLimitReached
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {slides.length} / 5 Imagens
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {activeSrv.name} • Apresentação de até 5 fotos para o radar
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedServiceForSlides(null);
                    setNewSlideUrl('');
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  title="Fechar"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Formulário de Adicionar ao Slide (se < 5 fotos) */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 space-y-2">
                {isLimitReached ? (
                  <div className="px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 text-xs flex items-center justify-between">
                    <span>
                      Limite máximo de 5 imagens atingido para este slide. Remova uma foto abaixo se desejar substituir.
                    </span>
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (newSlideUrl.trim()) {
                        handleAddSlideToService(activeSrv.id, newSlideUrl.trim());
                      }
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="url"
                      value={newSlideUrl}
                      onChange={(e) => setNewSlideUrl(e.target.value)}
                      placeholder={`Cole a URL da imagem para o slide (vagas restantes: ${5 - slides.length})...`}
                      className="flex-1 px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      disabled={!newSlideUrl.trim()}
                      className="px-4 py-2 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 text-white" />
                      <span>Adicionar ao Slide</span>
                    </button>
                  </form>
                )}

                {/* Botão Escolher da Galeria Central + Sugestões Rápidas */}
                {!isLimitReached && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-200 dark:border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setTargetServiceForGallerySelect({
                          serviceId: activeSrv.id,
                          targetType: 'slide',
                        });
                        setIsSelectFromGalleryModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs self-start"
                    >
                      <Images className="w-3.5 h-3.5 text-purple-500" />
                      <span>Escolher da Galeria do Salão ({salonMedia.length})</span>
                    </button>

                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                      <span className="font-semibold">Inserir teste no slide:</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleAddSlideToService(
                            activeSrv.id,
                            'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&auto=format&fit=crop&q=80'
                          )
                        }
                        className="text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                      >
                        + Slide Teste A
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleAddSlideToService(
                            activeSrv.id,
                            'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80'
                          )
                        }
                        className="text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                      >
                        + Slide Teste B
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Corpo: Carrossel Interativo de Slides */}
              <div className="p-4 overflow-y-auto flex-1 space-y-4">
                {slides.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
                    <Layers className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                    Nenhuma imagem cadastrada no slide deste procedimento.
                    <br />
                    Adicione até 5 fotos para ativar o carrossel no Radar Nível 2.
                  </div>
                ) : (
                  <>
                    {/* Visualização do Slide Ativo em Destaque */}
                    <div className="relative rounded-2xl overflow-hidden aspect-video bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-md">
                      <img
                        src={slides[currentActiveIndex]}
                        alt={`Slide ${currentActiveIndex + 1}`}
                        className="w-full h-full object-cover"
                      />

                      {/* Badge do Slide Atual */}
                      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-xs text-white text-xs font-mono font-bold border border-white/10 flex items-center gap-1.5 shadow-md">
                        <Layers className="w-3.5 h-3.5 text-purple-400" />
                        <span>
                          Slide {currentActiveIndex + 1} de {slides.length}
                        </span>
                      </div>

                      {/* Botões de Navegação Anterior / Próximo */}
                      {slides.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setActiveSlideIndex((prev) =>
                                prev > 0 ? prev - 1 : slides.length - 1
                              )
                            }
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition cursor-pointer shadow-md"
                            title="Slide anterior"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setActiveSlideIndex((prev) =>
                                prev < slides.length - 1 ? prev + 1 : 0
                              )
                            }
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition cursor-pointer shadow-md"
                            title="Próximo slide"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Barra de Miniaturas e Controles de Ordenação */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Miniaturas do Slide (Clique para selecionar ou reordenar):</span>
                        <span>{slides.length}/5 imagens</span>
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {slides.map((url, idx) => (
                          <div
                            key={idx}
                            className={`group relative rounded-xl overflow-hidden aspect-square border cursor-pointer transition ${
                              idx === currentActiveIndex
                                ? 'border-[#20C933] ring-2 ring-[#20C933]/30 scale-102'
                                : 'border-slate-200 dark:border-slate-800 opacity-70 hover:opacity-100'
                            }`}
                            onClick={() => setActiveSlideIndex(idx)}
                          >
                            <img
                              src={url}
                              alt={`Miniatura ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-1 left-1 px-1.5 py-0.2 rounded-md bg-black/70 text-[9px] font-mono font-bold text-white">
                              #{idx + 1}
                            </div>
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                              {idx > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveSlide(activeSrv.id, idx, idx - 1);
                                  }}
                                  className="p-1 rounded bg-slate-800 text-white hover:bg-slate-700"
                                  title="Mover para esquerda"
                                >
                                  <ChevronLeft className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveSlideFromService(activeSrv.id, idx);
                                }}
                                className="p-1 rounded bg-red-600 text-white hover:bg-red-700"
                                title="Remover do slide"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              {idx < slides.length - 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveSlide(activeSrv.id, idx, idx + 1);
                                  }}
                                  className="p-1 rounded bg-slate-800 text-white hover:bg-slate-700"
                                  title="Mover para direita"
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Rodapé */}
              <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Carrossel dinâmico exibido no Radar e na vitrine do procedimento.
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedServiceForSlides(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
                >
                  Concluir
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 4: VISUALIZADOR DE FOTO EM ALTA RESOLUÇÃO */}
      {viewingPhotoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-fadeIn cursor-pointer"
          onClick={() => setViewingPhotoUrl(null)}
        >
          <div
            className="max-w-3xl max-h-[90vh] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900">
              <span className="text-xs font-bold text-white">Visualização de Foto do Serviço</span>
              <button
                type="button"
                onClick={() => setViewingPhotoUrl(null)}
                className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 bg-black flex items-center justify-center">
              <img
                src={viewingPhotoUrl}
                alt="Foto Ampliada"
                className="max-h-[75vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal: Novo Procedimento / Serviço */}
      {isAddServiceModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Novo Procedimento • {salon.trade_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddServiceModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Fechar"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateService} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Procedimento *
                </label>
                <input
                  type="text"
                  required
                  value={newServiceForm.name}
                  onChange={(e) => setNewServiceForm({ ...newServiceForm, name: e.target.value })}
                  placeholder="Ex: Corte Degradê Navalhado"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Categoria
                  </label>
                  <select
                    value={newServiceForm.category}
                    onChange={(e) => setNewServiceForm({ ...newServiceForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="Cabelo">Cabelo</option>
                    <option value="Barba">Barba</option>
                    <option value="Combos">Combos</option>
                    <option value="Tratamentos">Tratamentos</option>
                    <option value="Coloração">Coloração</option>
                    <option value="Unhas">Unhas</option>
                    <option value="Estética">Estética</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Preço (R$) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newServiceForm.price}
                    onChange={(e) => setNewServiceForm({ ...newServiceForm, price: e.target.value })}
                    placeholder="Ex: 50,00"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Duração (min) *
                  </label>
                  <input
                    type="number"
                    required
                    min="5"
                    step="5"
                    value={newServiceForm.duration_minutes}
                    onChange={(e) => setNewServiceForm({ ...newServiceForm, duration_minutes: e.target.value })}
                    placeholder="Ex: 40"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Descrição Resumida (opcional)
                </label>
                <textarea
                  rows={2}
                  value={newServiceForm.description}
                  onChange={(e) => setNewServiceForm({ ...newServiceForm, description: e.target.value })}
                  placeholder="Detalhes ou diferenciais do procedimento..."
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddServiceModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                >
                  <Check className="w-4 h-4 text-white" />
                  <span>Salvar Procedimento</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: EDITAR PROCEDIMENTO EXISTENTE */}
      {editingService && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Editar Procedimento • {editingService.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingService(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Fechar"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateService} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Procedimento *
                </label>
                <input
                  type="text"
                  required
                  value={editServiceForm.name}
                  onChange={(e) => setEditServiceForm({ ...editServiceForm, name: e.target.value })}
                  placeholder="Ex: Corte Degradê Navalhado"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Categoria
                  </label>
                  <select
                    value={editServiceForm.category}
                    onChange={(e) => setEditServiceForm({ ...editServiceForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="Cabelo">Cabelo</option>
                    <option value="Barba">Barba</option>
                    <option value="Combos">Combos</option>
                    <option value="Tratamentos">Tratamentos</option>
                    <option value="Coloração">Coloração</option>
                    <option value="Unhas">Unhas</option>
                    <option value="Estética">Estética</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Preço (R$) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editServiceForm.price}
                    onChange={(e) => setEditServiceForm({ ...editServiceForm, price: e.target.value })}
                    placeholder="Ex: 50,00"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Duração (min) *
                  </label>
                  <input
                    type="number"
                    required
                    min="5"
                    step="5"
                    value={editServiceForm.duration_minutes}
                    onChange={(e) => setEditServiceForm({ ...editServiceForm, duration_minutes: e.target.value })}
                    placeholder="Ex: 40"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Status do Procedimento
                </label>
                <div className="flex items-center gap-3 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                    <input
                      type="radio"
                      name="edit-status"
                      checked={editServiceForm.is_active === true}
                      onChange={() => setEditServiceForm({ ...editServiceForm, is_active: true })}
                      className="accent-[#20C933] cursor-pointer"
                    />
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">Ativo no Cardápio</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                    <input
                      type="radio"
                      name="edit-status"
                      checked={editServiceForm.is_active === false}
                      onChange={() => setEditServiceForm({ ...editServiceForm, is_active: false })}
                      className="accent-slate-500 cursor-pointer"
                    />
                    <span className="font-medium text-slate-500">Pausado temporariamente</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Descrição Resumida (opcional)
                </label>
                <textarea
                  rows={2}
                  value={editServiceForm.description}
                  onChange={(e) => setEditServiceForm({ ...editServiceForm, description: e.target.value })}
                  placeholder="Detalhes ou diferenciais do procedimento..."
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              {/* Mídias Vinculadas com Atalhos Rápidos */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-2">
                  Mídias Vinculadas a este Procedimento:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const s = editingService;
                      setEditingService(null);
                      setSelectedServiceForPhotos(s);
                    }}
                    className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-left hover:border-emerald-500 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">Fotos</span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-slate-900 dark:text-white">
                      {editingService.photos?.length || 0}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const s = editingService;
                      setEditingService(null);
                      setSelectedServiceForVideos(s);
                    }}
                    className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-left hover:border-emerald-500 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">Vídeos 5s</span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-slate-900 dark:text-white">
                      {editingService.videos?.length || 0}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const s = editingService;
                      setEditingService(null);
                      setSelectedServiceForSlides(s);
                      setActiveSlideIndex(0);
                    }}
                    className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-left hover:border-emerald-500 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-purple-500" />
                      <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">Slide</span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-slate-900 dark:text-white">
                      {editingService.slides?.length || 0}/5
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                >
                  <Check className="w-4 h-4 text-white" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: UPLOAD LOCAL / NOVA MÍDIA NA GALERIA */}
      {isUploadMediaModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Upload Local • Adicionar à Galeria Central
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadMediaModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewMedia} className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Dropzone Mockup */}
              <div className="p-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2 hover:border-emerald-500 transition cursor-pointer bg-slate-50 dark:bg-slate-950">
                <UploadCloud className="w-8 h-8 mx-auto text-emerald-600 dark:text-emerald-400" />
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Arraste imagens ou vídeos aqui
                </p>
                <p className="text-[11px] text-slate-500">
                  PNG, JPG, WEBP ou MP4 até 50MB (bucket 'salon-media')
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ou insira a URL direta da imagem/vídeo *
                </label>
                <input
                  type="url"
                  required
                  value={newMediaForm.url}
                  onChange={(e) => setNewMediaForm({ ...newMediaForm, url: e.target.value })}
                  placeholder="https://images.unsplash.com/... ou https://storage..."
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Título / Legenda da Mídia
                </label>
                <input
                  type="text"
                  value={newMediaForm.title}
                  onChange={(e) => setNewMediaForm({ ...newMediaForm, title: e.target.value })}
                  placeholder="Ex: Fachada Principal, Fade Navalhado, Espaço Lavatório..."
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Aba Principal da Galeria
                  </label>
                  <select
                    value={newMediaForm.media_group}
                    onChange={(e) => {
                      const grp = e.target.value as 'fotos' | 'videos' | 'imagens';
                      setNewMediaForm({
                        ...newMediaForm,
                        media_group: grp,
                        type: grp === 'videos' ? 'video' : 'image',
                        category: grp === 'fotos' ? 'servicos' : grp === 'videos' ? 'servicos' : 'banner',
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="fotos">Fotos</option>
                    <option value="videos">Vídeos (5s)</option>
                    <option value="imagens">Imagens (Banner & Logo)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Sub-aba de Destino
                  </label>
                  <select
                    value={newMediaForm.category}
                    onChange={(e) => setNewMediaForm({ ...newMediaForm, category: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {newMediaForm.media_group === 'fotos' && (
                      <>
                        <option value="servicos">Serviços</option>
                        <option value="profissionais">Profissionais</option>
                        <option value="espaco">Espaço</option>
                      </>
                    )}
                    {newMediaForm.media_group === 'videos' && (
                      <>
                        <option value="servicos">Serviços (5s)</option>
                        <option value="espaco">Espaço (5s)</option>
                      </>
                    )}
                    {newMediaForm.media_group === 'imagens' && (
                      <>
                        <option value="banner">Banner (Cabeçalho do App)</option>
                        <option value="logotipo">Logotipo do App</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {newMediaForm.media_group === 'imagens' && newMediaForm.category === 'banner' && (
                <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <input
                    type="checkbox"
                    checked={newMediaForm.is_cover}
                    onChange={(e) => setNewMediaForm({ ...newMediaForm, is_cover: e.target.checked })}
                    className="accent-emerald-500 cursor-pointer w-4 h-4"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    Definir imediatamente como Banner Principal de Cabeçalho do App
                  </span>
                </label>
              )}

              {/* Sugestões Rápidas para Teste */}
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 flex-wrap">
                <span className="font-semibold">Inserir link de teste:</span>
                <button
                  type="button"
                  onClick={() =>
                    setNewMediaForm({
                      ...newMediaForm,
                      url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&auto=format&fit=crop&q=80',
                      title: 'Corte Degradê na Régua',
                      media_group: 'fotos',
                      category: 'servicos',
                      type: 'image',
                    })
                  }
                  className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  + Foto Serviços
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() =>
                    setNewMediaForm({
                      ...newMediaForm,
                      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                      title: 'Fade em 360° (5s)',
                      media_group: 'videos',
                      category: 'servicos',
                      type: 'video',
                      duration_seconds: 5,
                    })
                  }
                  className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  + Vídeo 5s
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() =>
                    setNewMediaForm({
                      ...newMediaForm,
                      url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1200&auto=format&fit=crop&q=80',
                      title: 'Banner Cabeçalho Vitrine',
                      media_group: 'imagens',
                      category: 'banner',
                      type: 'image',
                      is_cover: true,
                    })
                  }
                  className="text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  + Banner Cabeçalho
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUploadMediaModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newMediaForm.url.trim()}
                  className="px-4 py-2 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                >
                  <Check className="w-4 h-4 text-white" />
                  <span>Salvar na Galeria</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: GOOGLE FOTOS PICKER (INTEGRAÇÃO EM NUVEM) */}
      {isGooglePhotosModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header Google Fotos */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600/15 text-blue-600 flex items-center justify-center">
                  <Cloud className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Google Fotos • Biblioteca em Nuvem</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400 font-bold">
                      Google OAuth Ativo
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Selecione fotos e vídeos da conta Google do estabelecimento para importar diretamente à galeria central.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsGooglePhotosModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filtro por Álbuns do Google Fotos */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center gap-2 overflow-x-auto">
              <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap pl-1">Álbuns:</span>
              {[
                { id: 'all', label: 'Todos os Arquivos' },
                { id: 'trabalhos', label: 'Trabalhos Recentes 2026' },
                { id: 'espaco', label: 'Salão & Estrutura' },
                { id: 'stories', label: 'Stories 5s' },
              ].map((album) => (
                <button
                  key={album.id}
                  type="button"
                  onClick={() => setGooglePhotosAlbumFilter(album.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    googlePhotosAlbumFilter === album.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {album.label}
                </button>
              ))}
            </div>

            {/* Grid de Fotos do Google Fotos */}
            <div className="p-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {googlePhotosLibrary
                  .filter((item) => googlePhotosAlbumFilter === 'all' || item.album === googlePhotosAlbumFilter)
                  .map((item) => {
                    const isSelected = selectedGooglePhotos.includes(item.url);
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedGooglePhotos(selectedGooglePhotos.filter((u) => u !== item.url));
                          } else {
                            setSelectedGooglePhotos([...selectedGooglePhotos, item.url]);
                          }
                        }}
                        className={`group relative rounded-xl overflow-hidden aspect-square border-2 cursor-pointer transition shadow-xs ${
                          isSelected
                            ? 'border-[#20C933] ring-2 ring-[#20C933]/30 scale-98'
                            : 'border-slate-200 dark:border-slate-800 hover:border-blue-400'
                        }`}
                      >
                        {item.isVideo ? (
                          <div className="w-full h-full relative bg-slate-900">
                            <video src={item.url} muted className="w-full h-full object-cover" />
                            <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-600 text-white flex items-center gap-0.5">
                              <Play className="w-2.5 h-2.5 fill-white" />
                              <span>5s</span>
                            </div>
                          </div>
                        ) : (
                          <img
                            src={item.url}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            loading="lazy"
                          />
                        )}

                        {/* Checkbox de Seleção */}
                        <div
                          className={`absolute top-2 right-2 w-6 h-6 rounded-lg flex items-center justify-center transition shadow-md ${
                            isSelected
                              ? 'bg-[#20C933] text-white'
                              : 'bg-black/50 text-transparent border border-white/40 group-hover:border-white'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                        </div>

                        {/* Legenda na base */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 to-transparent p-2">
                          <p className="text-[10px] font-bold text-white truncate">{item.title}</p>
                          <span className="text-[9px] text-slate-300 font-mono">{item.date}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Rodapé do Seletor */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {selectedGooglePhotos.length} foto(s) selecionada(s)
                </span>
                {selectedGooglePhotos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedGooglePhotos([])}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline cursor-pointer"
                  >
                    Limpar
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsGooglePhotosModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleImportGooglePhotos}
                  disabled={selectedGooglePhotos.length === 0 || isGooglePhotosImporting}
                  className="px-4 py-2 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                >
                  <Check className="w-4 h-4 text-white" />
                  <span>Importar para a Galeria ({selectedGooglePhotos.length})</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: VISUALIZADOR DE MÍDIA EM ALTA RESOLUÇÃO (LIGHTBOX) */}
      {viewingMediaItem && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn"
          onClick={() => setViewingMediaItem(null)}
        >
          <div
            className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Images className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold truncate max-w-md">{viewingMediaItem.title}</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 capitalize">
                  {viewingMediaItem.category}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewingMediaItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex items-center justify-center bg-black/60 min-h-[400px] max-h-[70vh] overflow-hidden">
              {viewingMediaItem.type === 'video' ? (
                <video
                  src={viewingMediaItem.url}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="max-h-[65vh] max-w-full rounded-xl object-contain shadow-2xl"
                />
              ) : (
                <img
                  src={viewingMediaItem.url}
                  alt={viewingMediaItem.title}
                  className="max-h-[65vh] max-w-full rounded-xl object-contain shadow-2xl"
                />
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="text-slate-400 font-mono">
                <span>{viewingMediaItem.url}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(viewingMediaItem.url, viewingMediaItem.id)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedUrl === viewingMediaItem.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUrl === viewingMediaItem.id ? 'Copiado!' : 'Copiar URL'}</span>
                </button>

                {viewingMediaItem.type === 'image' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        handleSetAsBanner(viewingMediaItem);
                        setViewingMediaItem(null);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                      <span>Definir como Banner</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleSetAsLogo(viewingMediaItem);
                        setViewingMediaItem(null);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Bookmark className="w-3.5 h-3.5 text-white" />
                      <span>Definir como Logo</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const item = viewingMediaItem;
                    setViewingMediaItem(null);
                    setMediaItemToLink(item);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                >
                  <Scissors className="w-3.5 h-3.5 text-white" />
                  <span>Vincular a Procedimento</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: VINCULAR MÍDIA DA GALERIA A UM SERVIÇO ESPECÍFICO */}
      {mediaItemToLink && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Vincular Mídia a um Procedimento
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMediaItemToLink(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <img
                  src={mediaItemToLink.url}
                  alt={mediaItemToLink.title}
                  className="w-12 h-12 rounded-lg object-cover"
                />
                <div className="overflow-hidden">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {mediaItemToLink.title}
                  </h4>
                  <span className="text-[11px] text-slate-500 capitalize">
                    {mediaItemToLink.type === 'video' ? 'Vídeo 5s' : 'Foto'} • {mediaItemToLink.category}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Selecione o procedimento de destino:
                </span>
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                  {services.map((srv) => (
                    <div
                      key={srv.id}
                      onClick={() => handleLinkMediaToServiceAction(srv.id)}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 flex items-center justify-between transition cursor-pointer group"
                    >
                      <div>
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                          {srv.name}
                        </h5>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                          <span>{srv.category}</span>
                          <span>•</span>
                          <span className="font-mono">R$ {srv.price.toFixed(2)}</span>
                          <span>•</span>
                          <span>{srv.photos?.length || 0} fotos</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="px-2.5 py-1 rounded-lg bg-[#20C933] hover:bg-[#1bb32d] text-white text-[10px] font-bold transition cursor-pointer"
                      >
                        Vincular
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setMediaItemToLink(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: SELECIONAR DA GALERIA CENTRAL DO SALÃO PARA O PROCEDIMENTO */}
      {isSelectFromGalleryModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Images className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Escolher da Galeria do Salão • Seleção Direta
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsSelectFromGalleryModalOpen(false);
                  setTargetServiceForGallerySelect(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Clique sobre qualquer foto da galeria do estabelecimento para adicioná-la instantaneamente ao procedimento:
              </p>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {salonMedia
                  .filter((m) => m.type === 'image')
                  .map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectFromGalleryForService(item.url)}
                      className="group relative rounded-xl overflow-hidden aspect-square border border-slate-200 dark:border-slate-800 hover:border-[#20C933] cursor-pointer transition shadow-xs"
                    >
                      <img
                        src={item.url}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition flex items-center justify-center p-2 text-center">
                        <span className="px-2 py-1 rounded bg-[#20C933] text-white text-[10px] font-bold shadow-xs">
                          + Adicionar
                        </span>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent p-1">
                        <p className="text-[9px] font-bold text-white truncate">{item.title}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsSelectFromGalleryModalOpen(false);
                  setTargetServiceForGallerySelect(null);
                }}
                className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL OFICIAL DE LINK DO APP & QR CODE DE BALCÃO */}
      <SalonWelcomeModal
        isOpen={isWelcomeQrModalOpen}
        onClose={() => setIsWelcomeQrModalOpen(false)}
        data={{
          tradeName: salon.trade_name,
          slug: salon.slug,
          slogan: salon.description,
          logoUrl: salon.logo_url,
          primaryColor: salon.primary_color || '#20C933',
          ownerName: salon.owner_name,
        }}
      />
    </div>
  );
};
