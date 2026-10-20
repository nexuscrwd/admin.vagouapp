import React, { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Save,
  ShieldCheck,
  Check,
  Palette,
  ArrowRight,
  ArrowLeft,
  UserCheck,
  UserPlus,
  X,
  Home,
  Pencil,
  FileText,
  Search,
  Loader2,
  HelpCircle,
  Upload,
  Smartphone,
  Globe,
  Sparkles,
  Type,
  Plus,
  Trash2,
  Receipt,
  Wallet,
  Star,
  Printer,
  QrCode,
  MessageCircle,
  Send,
} from 'lucide-react';
import {
  fetchAdminClients,
  createAdminSalon,
  sanitizeSalonSlug,
  checkSalonSlugAvailability,
  formatPixKeyByType,
  detectPixKeyType,
  lookupPixKeyHolder,
} from '../../../services/supabaseApi';
import { AdminSalonItem, PixKeyType, SalonPixKeyItem } from '../../../types/admin';
import { getPixQrCodeUrl, generatePixPayload } from '../../../services/pixGenerator';
import { SalonPixPrintModal } from '../SalonPixPrintModal';
import { PixCheckoutModal } from '../PixCheckoutModal';
import { VagouOfficialLogo } from '../../common/VagouOfficialLogo';
import { TriadeUserRegisterForm, TriadeUserData } from './TriadeUserRegisterForm';
import { TriadeUserLoginForm, TriadeUserLoginPayload } from './TriadeUserLoginForm';
import { SalonWelcomeModal } from '../SalonWelcomeModal';
import { useDeviceViewport } from '../../../hooks/useDeviceViewport';

export interface EstablishmentMasterPayload {
  // Titular / Proprietário (Dados Pessoais — CPF pertence exclusivamente à Pessoa Física)
  ownerName: string;
  ownerWhatsapp: string;
  ownerEmail: string;
  ownerCpf?: string;

  // Dados Comerciais (Isolados)
  tradeName: string;
  category: string;
  slug: string;

  // Dados Fiscais (Pessoa Jurídica — Opcional)
  hasCnpj?: boolean;
  legalName: string;
  documentType: 'CNPJ' | 'CPF';
  documentNumber: string;

  // Dados de Faturamento (Múltiplas Chaves PIX)
  pixKey: string;
  pixKeys?: SalonPixKeyItem[];
  operationalModel: string;
  platformPlan: string;

  // Localização & Endereço
  address: {
    cep: string;
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
  };

  // Identidade Visual (Essenciais de Marca & PWA — Sincronizado com mnvapp e pvapp)
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  slogan: string;
  brandFont: 'Poppins' | 'Cormorant Garamond' | 'Oswald' | 'Plus Jakarta Sans' | string;
  // Campos complementares preenchidos pós-cadastro no painel do salão (mnvapp)
  bannerUrl?: string;
  bio?: string;
  instagram?: string;
}

export type EstabMasterPhase =
  | 'user_check'
  | 'commercial'
  | 'fiscal'
  | 'pix_billing'
  | 'address'
  | 'visual'
  | 'review'
  | 'welcome';

export type EstabUserAuthSubFlow = 'none' | 'login' | 'register';
export type EstabAddressSubPhase = 'same_address_modal' | 'cep_modal' | 'address_form';

export interface TriadeEstablishmentMasterFormProps {
  initialData?: Partial<EstablishmentMasterPayload>;
  onSuccess?: (data: EstablishmentMasterPayload, createdSalon?: AdminSalonItem) => void;
  onClose?: () => void;
  isStandalonePreview?: boolean;
  initialStep?: EstabMasterPhase;
  forcedStep?: EstabMasterPhase;
  onStepChange?: (step: EstabMasterPhase) => void;
  forcedUserAuthSubFlow?: EstabUserAuthSubFlow;
  onUserAuthSubFlowChange?: (subFlow: EstabUserAuthSubFlow) => void;
  forcedAddressSubPhase?: EstabAddressSubPhase;
  onAddressSubPhaseChange?: (subPhase: EstabAddressSubPhase) => void;
}

export const TriadeEstablishmentMasterForm: React.FC<TriadeEstablishmentMasterFormProps> = ({
  initialData,
  onSuccess,
  onClose,
  initialStep = 'user_check',
  forcedStep,
  onStepChange,
  forcedUserAuthSubFlow,
  onUserAuthSubFlowChange,
  forcedAddressSubPhase,
  onAddressSubPhaseChange,
}) => {
  const { device } = useDeviceViewport();

  // Passos do Fluxo Inicial de Cadastramento (Regra de Negócio VagouApp)
  const [flowStep, setFlowStep] = useState<'user_check' | 'establishment_details'>(
    (forcedStep || initialStep) === 'user_check' ? 'user_check' : 'establishment_details'
  );

  // Sub-rotina transitória de Login/Cadastro de Usuário dentro de 1. Identificação (Sim/Não)
  const [userAuthSubFlow, setUserAuthSubFlowState] = useState<EstabUserAuthSubFlow>('none');
  const setUserAuthSubFlow = (next: EstabUserAuthSubFlow) => {
    setUserAuthSubFlowState(next);
    onUserAuthSubFlowChange?.(next);
  };

  // Abas do formulário de dados do salão (Comercial, Fiscal e PIX totalmente isolados)
  const [activeSection, setActiveSection] = useState<'commercial' | 'fiscal' | 'pix_billing' | 'address' | 'visual'>('commercial');
  // Sub-fases do Endereço do Estabelecimento:
  // 1) 'same_address_modal' ("O salão fica no mesmo endereço do proprietário?")
  // 2) 'cep_modal' (Modal isolado de CEP idêntico ao cadastro de usuário)
  // 3) 'address_form' (Campos de endereço completados para conferência e número)
  const [addressSubPhase, setAddressSubPhaseState] = useState<EstabAddressSubPhase>('same_address_modal');
  const setAddressSubPhase = (next: EstabAddressSubPhase) => {
    setAddressSubPhaseState(next);
    onAddressSubPhaseChange?.(next);
  };

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [isPrintPlaqueOpen, setIsPrintPlaqueOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [createdSalonResult, setCreatedSalonResult] = useState<{
    payload: EstablishmentMasterPayload;
    salon: any;
  } | null>(null);

  const applyPhase = (phase: EstabMasterPhase) => {
    if (phase === 'user_check') {
      setFlowStep('user_check');
      setUserAuthSubFlowState('none');
      setIsReviewModalOpen(false);
      setIsWelcomeModalOpen(false);
    } else if (phase === 'review') {
      setFlowStep('establishment_details');
      setIsReviewModalOpen(true);
      setIsWelcomeModalOpen(false);
    } else if (phase === 'welcome') {
      setFlowStep('establishment_details');
      setIsReviewModalOpen(false);
      setIsWelcomeModalOpen(true);
    } else {
      setFlowStep('establishment_details');
      setActiveSection(phase);
      if (phase === 'address') {
        setAddressSubPhaseState('same_address_modal');
      }
      setIsReviewModalOpen(false);
      setIsWelcomeModalOpen(false);
    }
  };

  const updatePhase = (nextPhase: EstabMasterPhase) => {
    applyPhase(nextPhase);
    onStepChange?.(nextPhase);
  };

  useEffect(() => {
    if (forcedStep) {
      applyPhase(forcedStep);
    }
  }, [forcedStep]);

  useEffect(() => {
    if (forcedUserAuthSubFlow) {
      setUserAuthSubFlowState(forcedUserAuthSubFlow);
    }
  }, [forcedUserAuthSubFlow]);

  useEffect(() => {
    if (forcedAddressSubPhase) {
      setAddressSubPhaseState(forcedAddressSubPhase);
    }
  }, [forcedAddressSubPhase]);

  // Estados do Proprietário Autenticado
  const [isAuthenticatedOwner, setIsAuthenticatedOwner] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    name: string;
    email: string;
    phone: string;
    username: string;
  } | null>(null);

  // Estados de Vínculo de Endereço (Salão no mesmo endereço residencial do proprietário)
  const [isSameAddressChosen, setIsSameAddressChosen] = useState<boolean | null>(null);
  const [ownerAddressData, setOwnerAddressData] = useState<{
    cep: string;
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
  }>({
    cep: initialData?.address?.cep || '',
    street: initialData?.address?.street || '',
    number: initialData?.address?.number || '',
    complement: initialData?.address?.complement || '',
    neighborhood: initialData?.address?.neighborhood || '',
    city: initialData?.address?.city || '',
    state: initialData?.address?.state || '',
  });

  // Dados Pessoais do Proprietário no Formulário do Salão (CPF pertence ao cadastro pessoal do titular)
  const [ownerName, setOwnerName] = useState(initialData?.ownerName || '');
  const [ownerWhatsapp, setOwnerWhatsapp] = useState(initialData?.ownerWhatsapp || '');
  const [ownerEmail, setOwnerEmail] = useState(initialData?.ownerEmail || '');
  const [ownerCpf, setOwnerCpf] = useState(
    initialData?.ownerCpf ||
      (initialData?.documentType === 'CPF' ? initialData?.documentNumber || '' : '')
  );

  // 1. Dados Comerciais (Isolados)
  const [tradeName, setTradeName] = useState(initialData?.tradeName || '');
  const [category, setCategory] = useState(initialData?.category || 'Barbearia');
  const [slug, setSlug] = useState(
    initialData?.slug ? sanitizeSalonSlug(initialData.slug) : ''
  );
  const [isCustomSlug, setIsCustomSlug] = useState(false);
  const [slugCheckStatus, setSlugCheckStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'reserved' | 'too_short'
  >('idle');
  const [slugSuggestions, setSlugSuggestions] = useState<string[]>([]);
  const [takenByTradeName, setTakenByTradeName] = useState<string>('');

  // 2. Dados Fiscais (Pessoa Jurídica — CNPJ Opcional; CPF não aparece aqui)
  const [hasCnpj, setHasCnpj] = useState<boolean>(
    initialData?.hasCnpj ?? (initialData?.documentType === 'CNPJ' && Boolean(initialData?.documentNumber))
  );
  const [cnpjNumber, setCnpjNumber] = useState(
    initialData?.documentType === 'CNPJ' ? initialData?.documentNumber || '' : ''
  );
  const [legalName, setLegalName] = useState(initialData?.legalName || '');
  const [isSearchingCnpj, setIsSearchingCnpj] = useState(false);

  // 3. Dados de Faturamento & Recebimento (Múltiplas Chaves PIX com Auto-Preenchimento)
  const [pixKeys, setPixKeys] = useState<SalonPixKeyItem[]>(() => {
    if (Array.isArray(initialData?.pixKeys) && initialData.pixKeys.length > 0) {
      return initialData.pixKeys;
    }
    if (initialData?.pixKey) {
      const detected = detectPixKeyType(initialData.pixKey, 'phone');
      return [
        {
          id: 'pix-1',
          type: detected,
          key: formatPixKeyByType(initialData.pixKey, detected),
          holderName: initialData?.ownerName || '',
          institution: 'Chave Principal',
          isPrimary: true,
          verified: true,
        },
      ];
    }
    return [
      {
        id: 'pix-1',
        type: 'cpf',
        key: '',
        holderName: '',
        institution: '',
        isPrimary: true,
        verified: false,
      },
    ];
  });
  const [lookingUpPixId, setLookingUpPixId] = useState<string | null>(null);

  const operationalModel = initialData?.operationalModel || 'Espaço Físico & Delivery';
  const platformPlan = initialData?.platformPlan || 'PRO / 5% POR AGENDAMENTO';

  // Endereço do Salão com ViaCEP
  const [cep, setCep] = useState(initialData?.address?.cep || '');
  const [street, setStreet] = useState(initialData?.address?.street || '');
  const [number, setNumber] = useState(initialData?.address?.number || '');
  const [complement, setComplement] = useState(initialData?.address?.complement || '');
  const [neighborhood, setNeighborhood] = useState(initialData?.address?.neighborhood || '');
  const [city, setCity] = useState(initialData?.address?.city || '');
  const [state, setState] = useState(initialData?.address?.state || '');

  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [isSearchingCepByAddress, setIsSearchingCepByAddress] = useState(false);

  // Máscara dinâmica de CPF (11 dígitos) e CNPJ (14 dígitos)
  const formatFiscalDocument = (value: string, type: 'CNPJ' | 'CPF') => {
    return formatPixKeyByType(value, type === 'CPF' ? 'cpf' : 'cnpj');
  };

  // Busca automática de Razão Social / Nome Fantasia ao informar CNPJ de 14 dígitos (BrasilAPI)
  const handleCnpjLookup = async (rawCnpj: string) => {
    const clean = rawCnpj.replace(/\D/g, '');
    if (clean.length !== 14) return;
    setIsSearchingCnpj(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.razao_social) {
        setLegalName(data.razao_social);
      }
      if (data.nome_fantasia && !tradeName.trim()) {
        handleTradeNameChange(data.nome_fantasia);
      }
    } catch {
      // Falha silenciosa caso offline ou CNPJ de teste
    } finally {
      setIsSearchingCnpj(false);
    }
  };

  const handleCnpjNumberChange = (val: string) => {
    const formatted = formatFiscalDocument(val, 'CNPJ');
    setCnpjNumber(formatted);
    if (formatted.replace(/\D/g, '').length === 14) {
      handleCnpjLookup(formatted);
    }
  };

  const handleOwnerCpfChange = (val: string) => {
    setOwnerCpf(formatFiscalDocument(val, 'CPF'));
  };

  // Funções de Gerenciamento de Múltiplas Chaves PIX & Consulta Automática de Titular
  const triggerPixAutoLookup = async (id: string, keyVal: string, keyType: PixKeyType) => {
    setLookingUpPixId(id);
    try {
      const result = await lookupPixKeyHolder(keyVal, keyType, {
        ownerName,
        ownerCpf,
        ownerPhone: ownerWhatsapp,
        ownerEmail,
        legalName: hasCnpj ? legalName : '',
      });
      setPixKeys((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                holderName: result.valid ? result.holderName : '',
                institution: result.valid ? result.institution : '',
                verified: result.valid,
              }
            : item
        )
      );
    } finally {
      setLookingUpPixId(null);
    }
  };

  const handlePixKeyItemChange = (id: string, rawVal: string, explicitType?: PixKeyType) => {
    setPixKeys((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const resolvedType = explicitType || detectPixKeyType(rawVal, item.type);
        const formatted = formatPixKeyByType(rawVal, resolvedType);
        const cleanDigits = formatted.replace(/\D/g, '');
        const shouldAutoLookup =
          (resolvedType === 'cpf' && cleanDigits.length === 11) ||
          (resolvedType === 'cnpj' && cleanDigits.length === 14) ||
          (resolvedType === 'phone' && cleanDigits.length >= 10) ||
          (resolvedType === 'email' && formatted.includes('@') && formatted.includes('.')) ||
          (resolvedType === 'evp' && formatted.replace(/[^a-f0-9]/g, '').length === 32);

        if (shouldAutoLookup) {
          setTimeout(() => {
            triggerPixAutoLookup(id, formatted, resolvedType);
          }, 120);
        }

        return {
          ...item,
          type: resolvedType,
          key: formatted,
          verified: false,
        };
      })
    );
  };

  const handleAddPixKeyRow = (presetType: PixKeyType = 'phone', presetValue = '') => {
    const newId = `pix-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const formatted = presetValue ? formatPixKeyByType(presetValue, presetType) : '';
    setPixKeys((prev) => [
      ...prev,
      {
        id: newId,
        type: presetType,
        key: formatted,
        holderName: presetValue ? ownerName || legalName : '',
        institution: presetValue ? 'Titular Vinculado' : '',
        isPrimary: prev.length === 0,
        verified: Boolean(presetValue),
      },
    ]);
    if (formatted) {
      setTimeout(() => {
        triggerPixAutoLookup(newId, formatted, presetType);
      }, 80);
    }
  };

  const handleQuickFillPix = (type: PixKeyType, rawValue: string) => {
    if (!rawValue.trim()) return;
    const formatted = formatPixKeyByType(rawValue, type);
    const existingEmpty = pixKeys.find((k) => !k.key.trim());
    if (existingEmpty) {
      handlePixKeyItemChange(existingEmpty.id, formatted, type);
      triggerPixAutoLookup(existingEmpty.id, formatted, type);
    } else if (!pixKeys.some((k) => k.key === formatted)) {
      handleAddPixKeyRow(type, formatted);
    }
  };

  const handleRemovePixKeyRow = (id: string) => {
    setPixKeys((prev) => {
      const filtered = prev.filter((k) => k.id !== id);
      if (filtered.length === 0) {
        return [
          {
            id: `pix-${Date.now()}`,
            type: 'cpf',
            key: '',
            holderName: '',
            institution: '',
            isPrimary: true,
            verified: false,
          },
        ];
      }
      if (!filtered.some((k) => k.isPrimary)) {
        filtered[0].isPrimary = true;
      }
      return [...filtered];
    });
  };

  const handleSetPrimaryPixKey = (id: string) => {
    setPixKeys((prev) =>
      prev.map((k) => ({
        ...k,
        isPrimary: k.id === id,
      }))
    );
  };

  // Identidade Visual & Branding (Essenciais: Logotipo, Favicon, Cor, Slogan e Fonte da Marca)
  const [logoUrl, setLogoUrl] = useState(initialData?.logoUrl || '');
  const [faviconUrl, setFaviconUrl] = useState(initialData?.faviconUrl || '');
  const [useLogoAsFavicon, setUseLogoAsFavicon] = useState(true);
  const [primaryColor, setPrimaryColor] = useState(initialData?.primaryColor || '#20C933');
  const [slogan, setSlogan] = useState(initialData?.slogan || '');
  const [brandFont, setBrandFont] = useState<string>(initialData?.brandFont || 'Poppins');

  const BRAND_FONT_PRESETS = [
    {
      id: 'Poppins',
      name: 'Moderna & Geométrica',
      fontFamily: "'Poppins', sans-serif",
      segment: 'Padrão Oficial Vagou',
    },
    {
      id: 'Cormorant Garamond',
      name: 'Elegante & Editorial',
      fontFamily: "'Cormorant Garamond', serif",
      segment: 'Salão, Noivas & Spa',
    },
    {
      id: 'Oswald',
      name: 'Clássica & Forte',
      fontFamily: "'Oswald', sans-serif",
      segment: 'Barbearia & Grooming',
    },
    {
      id: 'Plus Jakarta Sans',
      name: 'Minimalista & Clean',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      segment: 'Estética, Cílios & Unhas',
    },
  ];

  const activeBrandFontFamily =
    BRAND_FONT_PRESETS.find((f) => f.id === brandFont)?.fontFamily || "'Poppins', sans-serif";

  // Upload local de Logotipo e Favicon (Galeria do celular ou computador)
  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'logo' | 'favicon'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (target === 'logo') {
        setLogoUrl(result);
        if (useLogoAsFavicon) {
          setFaviconUrl(result);
        }
      } else {
        setFaviconUrl(result);
        setUseLogoAsFavicon(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Estados de Submissão
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Formatações e Busca de CEP (Idêntica à lógica do Cadastro de Usuário)
  const formatCep = (value: string) => {
    const raw = value.replace(/\D/g, '').slice(0, 8);
    if (raw.length <= 5) return raw;
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  };

  const handleCepLookup = async (targetCep: string) => {
    const cleanCep = targetCep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setIsSearchingCep(true);
    setFeedback(null);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      if (!response.ok) throw new Error('Falha no ViaCEP');
      const data = await response.json();
      if (!data.erro) {
        setStreet(data.logradouro || '');
        setNeighborhood(data.bairro || '');
        setCity(data.localidade || '');
        setState(data.uf || '');
        setFeedback({
          type: 'success',
          message: '✓ Endereço localizado! Confira os dados e informe o número.',
        });
        setTimeout(() => {
          setAddressSubPhase('address_form');
        }, 350);
      } else {
        setFeedback({
          type: 'error',
          message: 'CEP não encontrado. Digite o endereço manualmente.',
        });
        setTimeout(() => {
          setAddressSubPhase('address_form');
        }, 700);
      }
    } catch {
      setFeedback({
        type: 'error',
        message: 'Não foi possível consultar o CEP. Digite o endereço manualmente.',
      });
      setTimeout(() => {
        setAddressSubPhase('address_form');
      }, 700);
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleCepChange = (val: string) => {
    const formatted = formatCep(val);
    setCep(formatted);
    if (formatted.replace(/\D/g, '').length === 8) {
      handleCepLookup(formatted);
    }
  };

  // Pular CEP quando o usuário clica em "Não sei meu CEP"
  const handleSkipSalonCep = () => {
    setFeedback(null);
    setAddressSubPhase('address_form');
  };

  // Avançar manualmente a partir do Modal de CEP
  const handleNextFromSalonCep = () => {
    setFeedback(null);
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      handleCepLookup(cleanCep);
    } else {
      setFeedback({
        type: 'error',
        message: 'Digite o CEP completo de 8 dígitos ou clique em "Não sei meu CEP".',
      });
    }
  };

  // Busca Reversa Silenciosa de CEP pelos dados básicos do endereço (ViaCEP)
  const searchSalonCepByAddress = async () => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length === 8) return;

    const cleanCity = city.trim();
    const cleanUf = state.trim().toUpperCase();
    const cleanStreet = street.trim();

    if (cleanStreet.length < 3 || cleanCity.length < 3 || cleanUf.length !== 2) {
      return;
    }

    setIsSearchingCepByAddress(true);
    try {
      let url = `https://viacep.com.br/ws/${cleanUf}/${encodeURIComponent(cleanCity)}/${encodeURIComponent(cleanStreet)}/json/`;
      let res = await fetch(url);
      let data = await res.json();

      if ((!Array.isArray(data) || data.length === 0) && cleanStreet.includes(' ')) {
        const withoutPrefix = cleanStreet
          .replace(/^(rua|avenida|travessa|alameda|rodovia|praça|praca|av\.|r\.)\s+/i, '')
          .trim();
        if (withoutPrefix.length >= 3) {
          url = `https://viacep.com.br/ws/${cleanUf}/${encodeURIComponent(cleanCity)}/${encodeURIComponent(withoutPrefix)}/json/`;
          res = await fetch(url);
          data = await res.json();
        }
      }

      if (Array.isArray(data) && data.length > 0) {
        let match = data[0];
        if (data.length > 1 && neighborhood.trim()) {
          const normNeighborhood = neighborhood
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
          const foundInNeighborhood = data.find((item: { bairro?: string }) =>
            item.bairro
              ?.toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .includes(normNeighborhood)
          );
          if (foundInNeighborhood) {
            match = foundInNeighborhood;
          }
        }

        setCep(match.cep);
        if (!neighborhood.trim() && match.bairro) {
          setNeighborhood(match.bairro);
        }
      }
    } catch {
      // Falha silenciosa em background
    } finally {
      setIsSearchingCepByAddress(false);
    }
  };

  const handleTradeNameChange = (val: string) => {
    setTradeName(val);
    if (!isCustomSlug) {
      const generatedSlug = sanitizeSalonSlug(val);
      setSlug(generatedSlug);
    }
  };

  const handleCustomSlugChange = (val: string) => {
    setIsCustomSlug(true);
    setSlug(sanitizeSalonSlug(val));
  };

  const handleResetSlugToAuto = () => {
    setIsCustomSlug(false);
    setSlug(sanitizeSalonSlug(tradeName));
  };

  // Pesquisa automática em tempo real para impedir repetição de slug no banco Supabase
  useEffect(() => {
    const clean = sanitizeSalonSlug(slug);
    if (!clean || clean.length < 3) {
      setSlugCheckStatus('too_short');
      setSlugSuggestions([]);
      setTakenByTradeName('');
      return;
    }

    let cancelled = false;
    setSlugCheckStatus('checking');

    const timer = setTimeout(async () => {
      const res = await checkSalonSlugAvailability(clean, ownerEmail);
      if (cancelled) return;
      if (res.available) {
        setSlugCheckStatus('available');
        setSlugSuggestions([]);
        setTakenByTradeName('');
      } else {
        setSlugCheckStatus(
          res.reason === 'reserved'
            ? 'reserved'
            : res.reason === 'too_short'
              ? 'too_short'
              : 'taken'
        );
        setSlugSuggestions(res.suggestions || []);
        setTakenByTradeName(res.existingTradeName || '');
      }
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [slug, ownerEmail]);

  // Função para Copiar Endereço Residencial do Proprietário e Avançar para Próxima Fase
  const applyOwnerAddressToSalon = (addrData?: typeof ownerAddressData) => {
    const source = addrData || ownerAddressData;
    if (!source.street && !source.cep) {
      setIsSameAddressChosen(false);
      setAddressSubPhase('cep_modal');
      return;
    }
    setCep(source.cep || '');
    setStreet(source.street || '');
    setNumber(source.number || '');
    setComplement(source.complement || '');
    setNeighborhood(source.neighborhood || '');
    setCity(source.city || '');
    setState(source.state || '');
    setIsSameAddressChosen(true);
    setFeedback({
      type: 'success',
      message: '✓ Endereço do proprietário vinculado ao salão! Avançando para Identidade Visual.',
    });
    updatePhase('visual');
  };

  // Sucesso na autenticação via formulário canônico de login de usuário
  const handleUserLoginSuccess = async (data: TriadeUserLoginPayload) => {
    try {
      const term = data.identifier.toLowerCase().trim();
      let matchedUser = {
        id: data.id || 'usr-auth-01',
        name: data.name || (data.identifier.includes('@') ? data.identifier.split('@')[0] : data.identifier),
        email: data.email || (data.identifier.includes('@') ? data.identifier : `${data.identifier.toLowerCase().replace(/[^a-z0-9]/g, '')}@vagouapp.com`),
        phone: data.phone || '',
        username: (data.username || data.identifier).replace(/^@+/, ''),
        cpf: data.cpf || '',
      };

      let resolvedOwnerAddr = {
        cep: data.address?.cep || '',
        street: data.address?.street || '',
        number: data.address?.number || '',
        complement: data.address?.complement || '',
        neighborhood: data.address?.neighborhood || '',
        city: data.address?.city || '',
        state: data.address?.state || '',
      };

      try {
        const cliList = await fetchAdminClients();
        if (cliList && Array.isArray(cliList)) {
          const found = cliList.find(
            (u) =>
              (data.email && u.email?.toLowerCase() === data.email.toLowerCase()) ||
              u.email?.toLowerCase() === term ||
              u.username?.replace(/^@+/, '').toLowerCase() === term.replace(/^@+/, '') ||
              (term.replace(/\D/g, '').length >= 8 &&
                u.phone?.replace(/\D/g, '').endsWith(term.replace(/\D/g, '').slice(-8)))
          );
          if (found) {
            matchedUser = {
              id: found.id,
              name: found.full_name || found.username || matchedUser.name,
              email: found.email || matchedUser.email,
              phone: found.phone || matchedUser.phone,
              username: (found.username || matchedUser.username).replace(/^@+/, ''),
              cpf: found.cpf || '',
            };
            if (found.address || found.cep) {
              resolvedOwnerAddr = {
                cep: found.cep || '',
                street: found.address || '',
                number: found.street_number || '',
                complement: found.complement || '',
                neighborhood: found.neighborhood || '',
                city: found.city || '',
                state: found.state || '',
              };
            }
          }
        }
      } catch {
        // Continua com os dados retornados pelo payload de login
      }

      setSelectedUser(matchedUser);
      setOwnerName(matchedUser.name);
      setOwnerEmail(matchedUser.email);
      setOwnerWhatsapp(matchedUser.phone);
      setOwnerAddressData(resolvedOwnerAddr);
      setIsAuthenticatedOwner(true);

      // Limpa qualquer dado residual e vincula dados pessoais reais do titular autenticado
      setTradeName('');
      setSlug('');
      setIsCustomSlug(false);
      setHasCnpj(false);
      setCnpjNumber('');
      setLegalName('');
      setOwnerCpf(matchedUser.cpf ? formatFiscalDocument(matchedUser.cpf, 'CPF') : '');

      const initialPixList: SalonPixKeyItem[] = [];
      if (matchedUser.cpf) {
        initialPixList.push({
          id: 'pix-cpf',
          type: 'cpf',
          key: formatPixKeyByType(matchedUser.cpf, 'cpf'),
          holderName: matchedUser.name,
          institution: 'Titular Proprietário Verificado',
          isPrimary: true,
          verified: true,
        });
      }
      if (matchedUser.phone) {
        initialPixList.push({
          id: 'pix-phone',
          type: 'phone',
          key: formatPixKeyByType(matchedUser.phone, 'phone'),
          holderName: matchedUser.name,
          institution: 'WhatsApp Oficial do Titular',
          isPrimary: initialPixList.length === 0,
          verified: true,
        });
      }
      setPixKeys(
        initialPixList.length > 0
          ? initialPixList
          : [
              {
                id: 'pix-1',
                type: 'cpf',
                key: '',
                holderName: matchedUser.name,
                institution: '',
                isPrimary: true,
                verified: false,
              },
            ]
      );

      setCep(resolvedOwnerAddr.cep);
      setStreet(resolvedOwnerAddr.street);
      setNumber(resolvedOwnerAddr.number);
      setComplement(resolvedOwnerAddr.complement);
      setNeighborhood(resolvedOwnerAddr.neighborhood);
      setCity(resolvedOwnerAddr.city);
      setState(resolvedOwnerAddr.state);

      setFeedback({
        type: 'success',
        message: `Proprietário "${matchedUser.name}" (${matchedUser.username}) autenticado! Confira seus dados e preencha os dados comerciais.`,
      });

      setUserAuthSubFlow('none');
      updatePhase('commercial');
    } catch {
      setFeedback({
        type: 'error',
        message: 'Falha ao autenticar proprietário. Verifique suas credenciais.',
      });
    }
  };

  // Submissão Final do Estabelecimento Comercial (Persistência Real no Supabase)
  const handleConfirmCreateSalon = async () => {
    setFeedback(null);

    if (!tradeName.trim()) {
      updatePhase('commercial');
      setFeedback({ type: 'error', message: 'Preencha o Nome Fantasia do estabelecimento.' });
      return;
    }

    if (ownerCpf.replace(/\D/g, '').length !== 11) {
      updatePhase('commercial');
      setFeedback({
        type: 'error',
        message: 'Informe o CPF pessoal do titular (11 dígitos) nos Dados Pessoais.',
      });
      return;
    }

    const cleanSlugForSubmit = sanitizeSalonSlug(slug);
    if (cleanSlugForSubmit.length < 3) {
      updatePhase('commercial');
      setFeedback({
        type: 'error',
        message: 'O link personalizado deve ter pelo menos 3 letras ou números.',
      });
      return;
    }

    if (slugCheckStatus === 'taken' || slugCheckStatus === 'reserved') {
      updatePhase('commercial');
      setFeedback({
        type: 'error',
        message: `O link "${cleanSlugForSubmit}.vagouapp.com" já está em uso. Escolha outro link ou selecione uma das sugestões disponíveis.`,
      });
      return;
    }

    if (hasCnpj && cnpjNumber.replace(/\D/g, '').length !== 14) {
      updatePhase('fiscal');
      setFeedback({
        type: 'error',
        message: 'Informe os 14 dígitos do CNPJ ou selecione a opção Sem CNPJ.',
      });
      return;
    }

    if (!cep.trim() || !street.trim() || !number.trim() || !city.trim() || !state.trim()) {
      updatePhase('address');
      setFeedback({ type: 'error', message: 'Preencha o endereço completo do estabelecimento.' });
      return;
    }

    setIsLoading(true);
    const resolvedDocType: 'CNPJ' | 'CPF' = hasCnpj ? 'CNPJ' : 'CPF';
    const resolvedDocNumber = hasCnpj ? cnpjNumber.trim() : ownerCpf.trim();
    const resolvedLegalName = hasCnpj
      ? legalName.trim() || tradeName.trim()
      : ownerName.trim() || tradeName.trim();

    const validPixKeys = pixKeys.filter((k) => k.key.trim().length > 0);
    const primaryPixObj = validPixKeys.find((k) => k.isPrimary) || validPixKeys[0];
    const resolvedPrimaryPixKey = primaryPixObj ? primaryPixObj.key.trim() : '';

    const effectiveFavicon = useLogoAsFavicon ? logoUrl || faviconUrl : faviconUrl;

    const payload: EstablishmentMasterPayload = {
      ownerName,
      ownerWhatsapp,
      ownerEmail,
      ownerCpf,
      tradeName,
      hasCnpj,
      legalName: resolvedLegalName,
      documentType: resolvedDocType,
      documentNumber: resolvedDocNumber,
      pixKey: resolvedPrimaryPixKey,
      pixKeys: validPixKeys,
      operationalModel,
      platformPlan,
      category,
      slug,
      address: {
        cep,
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
      },
      logoUrl,
      faviconUrl: effectiveFavicon,
      primaryColor,
      slogan,
      brandFont,
    };

    try {
      const res = await createAdminSalon({
        trade_name: tradeName.trim(),
        legal_name: resolvedLegalName,
        slug: slug.trim(),
        phone_whatsapp: ownerWhatsapp.trim(),
        email: ownerEmail.trim().toLowerCase(),
        document_type: resolvedDocType,
        document_number: resolvedDocNumber,
        has_cnpj: hasCnpj,
        owner_cpf: ownerCpf.trim(),
        pix_key: resolvedPrimaryPixKey,
        pix_keys: validPixKeys,
        operating_model: operationalModel,
        billing_plan: platformPlan,
        owner_name: ownerName.trim(),
        category: category as any,
        status: 'active',
        is_verified: true,
        address: street.trim(),
        street_number: number.trim(),
        complement: complement.trim(),
        neighborhood: neighborhood.trim(),
        city: city.trim(),
        state: state.trim().toUpperCase(),
        cep: cep.trim(),
        logo_url: logoUrl,
        favicon_url: effectiveFavicon,
        slogan: slogan.trim(),
        brand_font: brandFont,
        primary_color: primaryColor,
      });

      setIsLoading(false);

      if (!res.success) {
        setIsReviewModalOpen(false);
        setFeedback({
          type: 'error',
          message: res.error || 'Não foi possível salvar o estabelecimento no Supabase.',
        });
        return;
      }

      setCreatedSalonResult({ payload, salon: res.salon });
      setIsReviewModalOpen(false);
      setIsWelcomeModalOpen(true);
      onStepChange?.('welcome');
      setFeedback({
        type: 'success',
        message: `O estabelecimento "${tradeName}" foi criado e salvo no Supabase com sucesso!`,
      });
    } catch (err: any) {
      setIsLoading(false);
      setIsReviewModalOpen(false);
      setFeedback({
        type: 'error',
        message: err?.message || 'Erro de comunicação ao salvar estabelecimento.',
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeSection === 'commercial') {
      updatePhase('fiscal');
    } else if (activeSection === 'fiscal') {
      updatePhase('pix_billing');
    } else if (activeSection === 'pix_billing') {
      updatePhase('address');
    } else if (activeSection === 'address') {
      updatePhase('visual');
    } else {
      updatePhase('review');
    }
  };

  return (
    <div
      data-device={device}
      className="w-full max-w-none sm:max-w-xl mx-auto font-['Poppins'] relative"
    >
      {onClose && (
        <button
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.parent.postMessage({ source: 'VAGOUAPP_EMBED', event: 'CLOSE' }, '*');
            }
            onClose();
          }}
          className="absolute top-3.5 right-3.5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer z-30"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 1: IDENTIFICAÇÃO (SIM/NÃO) + SUB-ROTINA TRANSITÓRIA DE USUÁRIO      */}
      {/* ========================================================================= */}
      {flowStep === 'user_check' && userAuthSubFlow === 'none' && (
        <div className="w-full px-0 py-4 sm:p-6 space-y-5 text-center animate-fadeIn">
          {/* Logo Oficial do VagouApp na Etapa 1 */}
          <VagouOfficialLogo size="xl" variant="full" className="h-9 sm:h-10 w-auto object-contain mx-auto" />

          <div className="space-y-1.5">
            <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
              O estabelecimento a ser criado já possui usuário cadastrado?
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* Opção SIM -> Chama Form Canônico de Login de Usuário e retorna aos Dados do Salão */}
            <button
              type="button"
              onClick={() => setUserAuthSubFlow('login')}
              className="p-3.5 sm:p-4 min-h-[48px] rounded-xl border border-emerald-500/40 bg-emerald-950/30 hover:bg-emerald-900/40 transition cursor-pointer group active:scale-98 shadow-md flex items-center justify-between whitespace-nowrap"
            >
              <span className="text-sm font-black text-emerald-400 group-hover:text-emerald-300">SIM</span>
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            </button>

            {/* Opção NÃO -> Chama Form Canônico de Cadastro de Usuário e retorna aos Dados do Salão */}
            <button
              type="button"
              onClick={() => setUserAuthSubFlow('register')}
              className="p-3.5 sm:p-4 min-h-[48px] rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 transition cursor-pointer group active:scale-98 shadow-md flex items-center justify-between whitespace-nowrap"
            >
              <span className="text-sm font-black text-slate-200 group-hover:text-white">NÃO</span>
              <UserPlus className="w-4 h-4 text-slate-400 group-hover:text-white shrink-0" />
            </button>
          </div>

          <div className="pt-3 border-t border-slate-800/60 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Seu app de forma facil!</span>
          </div>
        </div>
      )}
      {flowStep === 'user_check' && userAuthSubFlow === 'login' && (
        <div className="w-full px-0 py-3 sm:p-5 space-y-3.5 animate-fadeIn">
          <div className="pt-1 text-center">
            <VagouOfficialLogo size="xl" variant="full" className="h-9 sm:h-10 w-auto object-contain mx-auto" />
          </div>

          <TriadeUserLoginForm
            showHeader={false}
            variant="flat"
            title="Acessar Espaço"
            submitButtonText="Acessar e Continuar para o Salão"
            suppressParentPostMessage={true}
            onSuccess={handleUserLoginSuccess}
          />

          <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2 text-[11px] text-slate-400 flex-wrap">
            <button
              type="button"
              onClick={() => setUserAuthSubFlow('none')}
              className="hover:text-white transition cursor-pointer text-slate-400 whitespace-nowrap"
            >
              ← Voltar à pergunta inicial
            </button>
            <span className="flex items-center gap-1 font-medium text-emerald-400 whitespace-nowrap">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Seu app de forma facil!
            </span>
          </div>
        </div>
      )}

      {/* SUB-ROTINA TRANSITÓRIA (OPÇÃO NÃO): CADASTRO DE USUÁRIO E RETORNO AO SALÃO */}
      {flowStep === 'user_check' && userAuthSubFlow === 'register' && (
        <div className="w-full px-0 py-3 sm:p-5 space-y-3.5 animate-fadeIn">
          <div className="pt-1 text-center">
            <VagouOfficialLogo size="xl" variant="full" className="h-9 sm:h-10 w-auto object-contain mx-auto" />
          </div>

          <TriadeUserRegisterForm
            showHeader={false}
            variant="flat"
            title="Cadastro do Proprietário"
            subtitle="Crie sua conta pessoal para vincular ao estabelecimento"
            suppressParentPostMessage={true}
            requireCpf={true}
            onSuccess={(userData: TriadeUserData) => {
              const newUser = {
                id: userData.id || `usr-${Date.now()}`,
                name: userData.fullName,
                email: userData.email,
                phone: userData.phone,
                username: userData.username.replace(/^@+/, ''),
              };

              setSelectedUser(newUser);
              setOwnerName(newUser.name);
              setOwnerEmail(newUser.email);
              setOwnerWhatsapp(newUser.phone);
              const formattedCpf = userData.cpf ? formatFiscalDocument(userData.cpf, 'CPF') : '';
              setOwnerCpf(formattedCpf);
              setIsAuthenticatedOwner(true);

              const newOwnerAddr = {
                cep: userData.address.cep || '',
                street: userData.address.street || '',
                number: userData.address.number || '',
                complement: userData.address.complement || '',
                neighborhood: userData.address.neighborhood || '',
                city: userData.address.city || '',
                state: userData.address.state || '',
              };
              setOwnerAddressData(newOwnerAddr);

              // Limpa dados comerciais e fiscais para que o novo proprietário cadastre seu próprio estabelecimento
              setTradeName('');
              setSlug('');
              setIsCustomSlug(false);
              setHasCnpj(false);
              setCnpjNumber('');
              setLegalName('');

              const initialPixList: SalonPixKeyItem[] = [];
              if (formattedCpf) {
                initialPixList.push({
                  id: 'pix-cpf',
                  type: 'cpf',
                  key: formattedCpf,
                  holderName: newUser.name,
                  institution: 'Titular Proprietário Verificado',
                  isPrimary: true,
                  verified: true,
                });
              }
              if (newUser.phone) {
                initialPixList.push({
                  id: 'pix-phone',
                  type: 'phone',
                  key: formatPixKeyByType(newUser.phone, 'phone'),
                  holderName: newUser.name,
                  institution: 'WhatsApp Oficial do Titular',
                  isPrimary: initialPixList.length === 0,
                  verified: true,
                });
              }
              setPixKeys(
                initialPixList.length > 0
                  ? initialPixList
                  : [
                      {
                        id: 'pix-1',
                        type: 'cpf',
                        key: '',
                        holderName: newUser.name,
                        institution: '',
                        isPrimary: true,
                        verified: false,
                      },
                    ]
              );

              setCep(newOwnerAddr.cep);
              setStreet(newOwnerAddr.street);
              setNumber(newOwnerAddr.number);
              setComplement(newOwnerAddr.complement);
              setNeighborhood(newOwnerAddr.neighborhood);
              setCity(newOwnerAddr.city);
              setState(newOwnerAddr.state);

              setFeedback({
                type: 'success',
                message: `Proprietário "${newUser.name}" (${newUser.username}) vinculado! Agora informe os dados comerciais do espaço.`,
              });

              setUserAuthSubFlow('none');
              updatePhase('commercial');
            }}
          />

          <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <button
              type="button"
              onClick={() => setUserAuthSubFlow('none')}
              className="hover:text-white transition cursor-pointer text-slate-400"
            >
              ← Voltar à pergunta inicial
            </button>
            <span className="flex items-center gap-1 font-medium text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Seu app de forma facil!
            </span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ETAPAS DO ESTABELECIMENTO COMERCIAL (COMPACTO & PROPORCIONAL)             */}
      {/* ========================================================================= */}
      {flowStep === 'establishment_details' && (
        <div className="w-full animate-fadeIn">
          <form onSubmit={handleSubmit} className="w-full px-0 py-3 sm:p-5 space-y-4">
            {/* Logo Oficial do VagouApp integrado dentro do <form> */}
            <div className="pb-1 text-center">
              <VagouOfficialLogo size="xl" variant="full" className="h-9 sm:h-10 w-auto object-contain mx-auto" />
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 animate-fadeIn ${
                  feedback.type === 'success'
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span className="font-medium">{feedback.message}</span>
              </div>
            )}

            {/* ========================================================================= */}
            {/* ETAPA 1 DO SALÃO: DADOS PESSOAIS DO TITULAR + DADOS COMERCIAIS (ISOLADOS) */}
            {/* ========================================================================= */}
            {activeSection === 'commercial' && (
              <div className="w-full space-y-4 animate-fadeIn">
                {/* BLOCO 1: DADOS PESSOAIS DO PROPRIETÁRIO (Plano no mobile, card proporcional no tablet/desktop) */}
                <div className="w-full bg-transparent sm:bg-slate-950/70 border-0 sm:border sm:border-slate-800 rounded-none sm:rounded-xl p-0 sm:p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-white">
                        Dados Pessoais do Titular
                      </h3>
                    </div>
                    <span className="text-[10px] font-medium text-emerald-400 whitespace-nowrap">
                      Cadastro Pessoal (Pessoa Física)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-7">
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Proprietário Responsável <span className="text-emerald-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="Nome completo do titular"
                        className="w-full min-h-[44px] bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition"
                        required
                      />
                    </div>

                    <div className="sm:col-span-5">
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        CPF Pessoal do Titular <span className="text-emerald-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={ownerCpf}
                        onChange={(e) => handleOwnerCpfChange(e.target.value)}
                        placeholder="000.000.000-00"
                        maxLength={14}
                        className="w-full min-h-[44px] bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition font-mono"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* BLOCO 2: DADOS COMERCIAIS DO ESTABELECIMENTO (ISOLADO DE FISCAL E PIX) */}
                <div className="w-full bg-transparent sm:bg-slate-950/70 border-0 sm:border sm:border-slate-800 rounded-none sm:rounded-xl p-0 sm:p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-white">
                        Dados Comerciais da Vitrine
                      </h3>
                    </div>
                    <span className="text-[10px] font-medium text-slate-400">
                      Identidade comercial e endereço web
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    {/* 1. Nome Fantasia (7 colunas no tablet/desktop, 100% no mobile) */}
                    <div className="sm:col-span-7">
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Nome Fantasia <span className="text-emerald-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={tradeName}
                        onChange={(e) => handleTradeNameChange(e.target.value)}
                        placeholder="Nome do seu espaço"
                        className="w-full min-h-[44px] bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition"
                        required
                      />
                    </div>

                    {/* 2. Categoria do Estabelecimento (5 colunas no tablet/desktop, 100% no mobile) */}
                    <div className="sm:col-span-5">
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Categoria <span className="text-emerald-400">*</span>
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full min-h-[44px] bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white outline-none focus:border-emerald-500 transition cursor-pointer"
                      >
                        <option value="Barbearia">Barbearia</option>
                        <option value="Salão de Beleza">Salão de Beleza</option>
                        <option value="Esmalteria">Esmalteria</option>
                        <option value="Estética">Estética</option>
                        <option value="Spa">Spa</option>
                        <option value="Sobrancelhas & Cílios">Sobrancelhas & Cílios</option>
                      </select>
                    </div>

                    {/* 3. Link Personalizado do App (Sem hífen) */}
                    <div className="sm:col-span-12 pt-0.5">
                      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                        <label className="block text-[11px] font-semibold text-slate-300">
                          Link Personalizado do App (Sem hífen) <span className="text-emerald-400">*</span>
                        </label>
                        <div className="flex items-center gap-2">
                          {isCustomSlug && (
                            <button
                              type="button"
                              onClick={handleResetSlugToAuto}
                              className="text-[10px] font-semibold text-slate-400 hover:text-emerald-400 transition cursor-pointer underline"
                            >
                              Usar Nome Fantasia
                            </button>
                          )}
                          {slugCheckStatus === 'checking' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                              <span>Verificando...</span>
                            </span>
                          )}
                          {slugCheckStatus === 'available' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Disponível</span>
                            </span>
                          )}
                          {(slugCheckStatus === 'taken' || slugCheckStatus === 'reserved') && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                              <span>
                                {slugCheckStatus === 'reserved' ? 'Reservado' : 'Indisponível'}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div
                        className={`flex items-center bg-slate-900 border rounded-xl px-3 py-2.5 min-h-[44px] text-xs sm:text-sm transition ${
                          slugCheckStatus === 'taken' || slugCheckStatus === 'reserved'
                            ? 'border-rose-500/70 focus-within:border-rose-500'
                            : slugCheckStatus === 'available'
                              ? 'border-emerald-500/50 focus-within:border-emerald-500'
                              : 'border-slate-800 focus-within:border-emerald-500'
                        }`}
                      >
                        <span className="hidden sm:inline text-slate-500 text-xs font-mono shrink-0 select-none">
                          https://
                        </span>
                        <input
                          type="text"
                          value={slug}
                          onChange={(e) => handleCustomSlugChange(e.target.value)}
                          placeholder="nomedonegocio"
                          className="w-full min-w-0 flex-1 bg-transparent text-white font-mono text-xs sm:text-sm font-bold outline-none px-0.5"
                          required
                        />
                        <span className="text-slate-400 text-xs ml-1 font-mono shrink-0 select-none">
                          .vagouapp.com
                        </span>
                        <div className="ml-2 shrink-0 flex items-center">
                          {slugCheckStatus === 'checking' && (
                            <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                          )}
                          {slugCheckStatus === 'available' && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                          {(slugCheckStatus === 'taken' || slugCheckStatus === 'reserved') && (
                            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                          )}
                        </div>
                      </div>

                      {slugCheckStatus === 'available' && (
                        <p className="text-[10px] text-emerald-400/90 mt-1 flex items-center gap-1 font-medium">
                          <span>✓ Link exclusivo:</span>
                          <strong className="font-mono text-white">{slug}.vagouapp.com</strong>
                        </p>
                      )}

                      {slugCheckStatus === 'too_short' && (
                        <p className="text-[10px] text-amber-400 mt-1">
                          Mínimo de 3 caracteres (apenas letras e números, sem hífen).
                        </p>
                      )}

                      {(slugCheckStatus === 'taken' || slugCheckStatus === 'reserved') && (
                        <div className="mt-1.5 space-y-1 animate-fadeIn">
                          <p className="text-[10px] text-rose-300 font-medium">
                            {slugCheckStatus === 'reserved'
                              ? `O endereço "${slug}" é reservado. Escolha uma opção livre:`
                              : `O link "${slug}.vagouapp.com" já está em uso${
                                  takenByTradeName ? ` (${takenByTradeName})` : ''
                                }. Sugestões livres:`}
                          </p>
                          {slugSuggestions.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {slugSuggestions.map((sug) => (
                                <button
                                  key={sug}
                                  type="button"
                                  onClick={() => {
                                    setIsCustomSlug(true);
                                    setSlug(sug);
                                  }}
                                  className="px-2 py-0.5 rounded-lg bg-emerald-500/15 hover:bg-[#20C933] text-emerald-300 hover:text-white border border-emerald-500/30 text-[11px] font-mono font-bold transition cursor-pointer"
                                >
                                  {sug}.vagouapp.com
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* ETAPA 2 DO SALÃO: DADOS FISCAIS (ISOLADO — APENAS CNPJ / AUTÔNOMO)        */}
            {/* ========================================================================= */}
            {activeSection === 'fiscal' && (
              <div className="w-full space-y-3.5 animate-fadeIn">
                <div className="w-full bg-transparent sm:bg-slate-950/70 border-0 sm:border sm:border-slate-800 rounded-none sm:rounded-xl p-0 sm:p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-white">
                        Dados Fiscais do Estabelecimento
                      </h3>
                    </div>
                    <span className="text-[10px] font-medium text-slate-400">
                      Tributação e Pessoa Jurídica
                    </span>
                  </div>

                  {/* Seletor: Opera sem CNPJ vs Possui CNPJ (1 coluna fullwidth no mobile, 2 colunas no tablet/desktop) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setHasCnpj(false);
                        setCnpjNumber('');
                        setLegalName('');
                      }}
                      className={`py-2.5 px-3.5 min-h-[44px] rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-between border whitespace-nowrap ${
                        !hasCnpj
                          ? 'bg-[#20C933] text-white border-emerald-400 shadow-sm'
                          : 'bg-slate-900 text-slate-300 hover:text-white border-slate-800'
                      }`}
                    >
                      <span className={!hasCnpj ? 'text-white' : ''}>Sem CNPJ (Autônomo)</span>
                      {!hasCnpj && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setHasCnpj(true)}
                      className={`py-2.5 px-3.5 min-h-[44px] rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-between border whitespace-nowrap ${
                        hasCnpj
                          ? 'bg-[#20C933] text-white border-emerald-400 shadow-sm'
                          : 'bg-slate-900 text-slate-300 hover:text-white border-slate-800'
                      }`}
                    >
                      <span className={hasCnpj ? 'text-white' : ''}>Possuo CNPJ (Empresa)</span>
                      {hasCnpj && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                    </button>
                  </div>

                  {!hasCnpj ? (
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 flex items-center justify-between gap-2 text-[11px] text-slate-300">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>
                          Estabelecimento opera como <strong>autônomo</strong> vinculado ao CPF do titular (
                          <span className="font-mono text-emerald-400">{ownerCpf || 'não informado'}</span>).
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1 animate-fadeIn">
                      <div className="sm:col-span-5">
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          CNPJ <span className="text-emerald-400">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={cnpjNumber}
                            onChange={(e) => handleCnpjNumberChange(e.target.value)}
                            placeholder="00.000.000/0001-00"
                            maxLength={18}
                            className="w-full min-h-[44px] bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition font-mono"
                          />
                          {isSearchingCnpj && (
                            <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin absolute right-2.5 top-3" />
                          )}
                        </div>
                      </div>

                      <div className="sm:col-span-7">
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Razão Social (Receita Federal) <span className="text-emerald-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={legalName}
                          onChange={(e) => setLegalName(e.target.value)}
                          placeholder="Preenchida automaticamente pelo CNPJ"
                          className="w-full min-h-[44px] bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* ETAPA 3 DO SALÃO: FATURAMENTO & CHAVES PIX + QR CODE AUTOMÁTICO          */}
            {/* ========================================================================= */}
            {activeSection === 'pix_billing' && (
              <div className="w-full space-y-3.5 animate-fadeIn">
                <div className="w-full bg-transparent sm:bg-slate-950/70 border-0 sm:border sm:border-slate-800 rounded-none sm:rounded-xl p-0 sm:p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-white">
                        Faturamento & Chaves PIX ({pixKeys.length})
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddPixKeyRow('phone', '')}
                      className="px-3 py-1.5 rounded-lg bg-[#20C933] hover:bg-[#1bb32d] text-white text-[10px] font-bold transition flex items-center gap-1 cursor-pointer shadow-xs whitespace-nowrap"
                    >
                      <Plus className="w-3 h-3 text-white" />
                      <span className="text-white">Adicionar Chave PIX</span>
                    </button>
                  </div>

                  {/* Atalhos Rápidos para Inserir Chaves PIX com 1 Clique */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-semibold mr-1">
                      Inserir rápido:
                    </span>
                    {ownerCpf && (
                      <button
                        type="button"
                        onClick={() => handleQuickFillPix('cpf', ownerCpf)}
                        className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-800 text-[10px] font-semibold transition cursor-pointer whitespace-nowrap"
                      >
                        + CPF do Titular
                      </button>
                    )}
                    {ownerWhatsapp && (
                      <button
                        type="button"
                        onClick={() => handleQuickFillPix('phone', ownerWhatsapp)}
                        className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-800 text-[10px] font-semibold transition cursor-pointer whitespace-nowrap"
                      >
                        + WhatsApp
                      </button>
                    )}
                    {ownerEmail && (
                      <button
                        type="button"
                        onClick={() => handleQuickFillPix('email', ownerEmail)}
                        className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-800 text-[10px] font-semibold transition cursor-pointer whitespace-nowrap"
                      >
                        + E-mail
                      </button>
                    )}
                    {hasCnpj && cnpjNumber && (
                      <button
                        type="button"
                        onClick={() => handleQuickFillPix('cnpj', cnpjNumber)}
                        className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-800 text-[10px] font-semibold transition cursor-pointer whitespace-nowrap"
                      >
                        + CNPJ da Empresa
                      </button>
                    )}
                  </div>

                  {/* Lista Dinâmica de Múltiplas Chaves PIX */}
                  <div className="space-y-2.5">
                    {pixKeys.map((item, idx) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-slate-900/90 space-y-2.5 transition border border-slate-800/80"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Chave PIX #{idx + 1}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryPixKey(item.id)}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                                item.isPrimary
                                  ? 'bg-[#20C933] text-white'
                                  : 'bg-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              <Star className={`w-2.5 h-2.5 ${item.isPrimary ? 'text-white fill-white' : 'text-slate-400'}`} />
                              <span className={item.isPrimary ? 'text-white' : ''}>
                                {item.isPrimary ? 'Principal' : 'Tornar Principal'}
                              </span>
                            </button>

                            {pixKeys.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemovePixKeyRow(item.id)}
                                className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                                title="Remover chave PIX"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <select
                            value={item.type}
                            onChange={(e) =>
                              handlePixKeyItemChange(item.id, item.key, e.target.value as PixKeyType)
                            }
                            className="w-full sm:w-auto min-h-[42px] bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs font-bold text-white outline-none focus:border-emerald-500 transition cursor-pointer shrink-0"
                          >
                            <option value="cpf">CPF</option>
                            <option value="cnpj">CNPJ</option>
                            <option value="phone">Celular</option>
                            <option value="email">E-mail</option>
                            <option value="evp">Aleatória</option>
                          </select>

                          <div className="relative flex-1 min-w-0 flex items-center">
                            <input
                              type="text"
                              value={item.key}
                              onChange={(e) => handlePixKeyItemChange(item.id, e.target.value)}
                              placeholder={
                                item.type === 'cpf'
                                  ? '000.000.000-00'
                                  : item.type === 'cnpj'
                                    ? '00.000.000/0001-00'
                                    : item.type === 'phone'
                                      ? '(11) 99999-9999'
                                      : item.type === 'email'
                                        ? 'pix@dominio.com'
                                        : '00000000-0000-0000-0000-000000000000'
                              }
                              className="w-full min-h-[42px] bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-8 py-2 text-xs sm:text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => triggerPixAutoLookup(item.id, item.key, item.type)}
                              title="Buscar / Validar Titular da Chave PIX"
                              className="absolute right-2 p-1 text-emerald-400 hover:text-white transition cursor-pointer"
                            >
                              {lookingUpPixId === item.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                              ) : (
                                <Search className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Confirmação Automática de Titularidade (Estilo App Bancário) */}
                        {item.verified && item.holderName && (
                          <div className="flex items-center justify-between gap-2 pt-0.5 px-1 text-[10px] text-emerald-400 animate-fadeIn">
                            <span className="flex items-center gap-1 font-semibold truncate">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span className="truncate">Titular: {item.holderName}</span>
                            </span>
                            {item.institution && (
                              <span className="text-slate-400 font-mono shrink-0">
                                {item.institution}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* PREVIEW DO QR CODE OFICIAL EM TEMPO REAL & AÇÕES DE IMPRESSÃO / COBRANÇA */}
                  {pixKeys.some((k) => k.key.trim().length > 0) && (
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3 pt-3 animate-fadeIn">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <QrCode className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                            QR Code PIX (Chave Principal)
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-400 font-mono">
                          {pixKeys.find((k) => k.isPrimary)?.key || pixKeys[0]?.key}
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-3.5 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                        <img
                          src={getPixQrCodeUrl(
                            pixKeys.find((k) => k.isPrimary)?.key || pixKeys[0]?.key || '',
                            180
                          )}
                          alt="QR Code PIX Oficial"
                          className="w-24 h-24 object-contain rounded-lg bg-white p-1 border border-slate-700 shrink-0"
                        />
                        <div className="text-center sm:text-left space-y-1.5 flex-1 min-w-0">
                          <p className="text-xs text-white font-semibold leading-tight">
                            QR Code gerado automaticamente no padrão do Banco Central.
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Pronto para ser impresso em display acrílico de balcão ou enviado diretamente ao cliente após o término do corte/serviço.
                          </p>
                        </div>
                      </div>

                      {/* Botões de Ação: Imprimir Plaquinha & Testar Cobrança */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsPrintPlaqueOpen(true)}
                          className="py-2.5 px-3 min-h-[44px] rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95 whitespace-nowrap"
                        >
                          <Printer className="w-3.5 h-3.5 text-white shrink-0" />
                          <span className="text-white">Imprimir Plaquinha PIX</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsCheckoutModalOpen(true)}
                          className="py-2.5 px-3 min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                        >
                          <Send className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Testar Cobrança Pós-Serviço</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* ETAPA 3 DO SALÃO: ENDEREÇO EM 2 MODAIS SEQUENCIAIS + DADOS COMPLETOS      */}
            {/* ========================================================================= */}
            {activeSection === 'address' && (
              <div className="w-full space-y-3.5 animate-fadeIn">
                {/* MODAL 1 — PERGUNTA: "O salão fica no mesmo endereço do proprietário?" */}
                {addressSubPhase === 'same_address_modal' && (
                  <div className="w-full bg-transparent sm:bg-slate-950/80 border-0 sm:border sm:border-slate-800 rounded-none sm:rounded-2xl p-0 sm:p-5 space-y-4 text-center animate-fadeIn">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                      <Home className="w-5 h-5 text-emerald-400" />
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-sm sm:text-base font-extrabold text-white">
                        O salão fica no mesmo endereço do proprietário?
                      </h3>
                      {ownerAddressData.street ? (
                        <p className="text-[11px] text-slate-400">
                          {ownerAddressData.street}
                          {ownerAddressData.number ? `, ${ownerAddressData.number}` : ''}{' '}
                          {ownerAddressData.complement ? `(${ownerAddressData.complement})` : ''}
                          {ownerAddressData.neighborhood ? ` — ${ownerAddressData.neighborhood}` : ''}
                          {ownerAddressData.city ? `, ${ownerAddressData.city}` : ''}
                          {ownerAddressData.state ? `/${ownerAddressData.state}` : ''}
                          {ownerAddressData.cep ? ` (CEP: ${ownerAddressData.cep})` : ''}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-400">
                          Caso o estabelecimento funcione em outro endereço comercial, selecione &quot;NÃO&quot; para informar o CEP do salão.
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => applyOwnerAddressToSalon()}
                        className="p-3.5 min-h-[48px] rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold transition cursor-pointer flex items-center justify-between shadow-lg shadow-emerald-500/20 active:scale-95 whitespace-nowrap"
                      >
                        <span className="text-xs sm:text-sm font-black text-white">SIM</span>
                        <Check className="w-4 h-4 text-white shrink-0" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsSameAddressChosen(false);
                          setFeedback(null);
                          setCep('');
                          setStreet('');
                          setNumber('');
                          setComplement('');
                          setNeighborhood('');
                          setCity('');
                          setState('');
                          setAddressSubPhase('cep_modal');
                        }}
                        className="p-3.5 min-h-[48px] rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white font-bold transition cursor-pointer flex items-center justify-between active:scale-95 whitespace-nowrap"
                      >
                        <span className="text-xs sm:text-sm font-black">NÃO</span>
                        <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                      </button>
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-slate-800/80 text-[11px]">
                      <button
                        type="button"
                        onClick={() => updatePhase('pix_billing')}
                        className="text-slate-400 hover:text-white font-semibold flex items-center gap-1 cursor-pointer transition whitespace-nowrap"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Voltar</span>
                      </button>

                      {street && (
                        <button
                          type="button"
                          onClick={() => setAddressSubPhase('address_form')}
                          className="text-emerald-400 hover:underline font-semibold cursor-pointer whitespace-nowrap"
                        >
                          Ver endereço preenchido →
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* MODAL 2 — BUSCA DE CEP ISOLADA */}
                {addressSubPhase === 'cep_modal' && (
                  <div className="w-full max-w-none sm:max-w-sm mx-auto space-y-3.5 animate-fadeIn">
                    <div className="w-full bg-transparent sm:bg-slate-950/80 border-0 sm:border sm:border-slate-800 rounded-none sm:rounded-2xl p-0 sm:p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300">
                            CEP do Estabelecimento <span className="text-emerald-400">*</span>
                          </label>
                          <p className="text-[10px] text-slate-500 pt-0.5">
                            8 dígitos para busca automática
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleSkipSalonCep}
                          className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer shrink-0 whitespace-nowrap"
                        >
                          <HelpCircle className="w-3 h-3" />
                          <span>Não sei o CEP</span>
                        </button>
                      </div>

                      <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 min-h-[46px] focus-within:border-emerald-500 transition w-full sm:max-w-[240px] mx-auto">
                        <MapPin className="w-4 h-4 text-emerald-400 mr-2 shrink-0" />
                        <input
                          type="text"
                          value={cep}
                          onChange={(e) => handleCepChange(e.target.value)}
                          placeholder="00000-000"
                          maxLength={9}
                          className="w-full bg-transparent text-base font-mono font-bold text-white placeholder-slate-600 outline-none text-center tracking-wider"
                          autoFocus
                        />
                        {isSearchingCep ? (
                          <Loader2 className="w-4 h-4 text-emerald-400 animate-spin ml-1.5 shrink-0" />
                        ) : (
                          <Search className="w-4 h-4 text-slate-500 ml-1.5 shrink-0" />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setAddressSubPhase('same_address_modal')}
                        className="py-2.5 px-4 min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Voltar</span>
                      </button>
                      <button
                        type="button"
                        disabled={isSearchingCep}
                        onClick={handleNextFromSalonCep}
                        className="flex-1 py-2.5 px-4 min-h-[44px] rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50 whitespace-nowrap"
                      >
                        {isSearchingCep ? (
                          <Loader2 className="w-4 h-4 text-white animate-spin" />
                        ) : (
                          <>
                            <span className="text-white font-bold">Avançar</span>
                            <ArrowRight className="w-3.5 h-3.5 text-white" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* TELA DE DADOS DO ENDEREÇO COMPLETADOS (Fullwidth Mobile / Proporcional Tablet & Desktop) */}
                {addressSubPhase === 'address_form' && (
                  <div className="w-full bg-transparent sm:bg-slate-950/70 border-0 sm:border sm:border-slate-800 rounded-none sm:rounded-xl p-0 sm:p-4 space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800 flex-wrap gap-2">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-white">
                          Endereço do Estabelecimento
                        </h3>
                      </div>
                      <div className="flex items-center gap-2.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setAddressSubPhase('cep_modal')}
                          className="text-slate-400 hover:text-emerald-400 cursor-pointer transition font-medium whitespace-nowrap"
                        >
                          Buscar por CEP
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddressSubPhase('same_address_modal')}
                          className="text-emerald-400 hover:underline cursor-pointer font-semibold whitespace-nowrap"
                        >
                          Usar endereço do titular
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* 1. Rua / Logradouro * (Amplo) e 2. Número * */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        <div className="sm:col-span-9">
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                            Rua / Logradouro <span className="text-emerald-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={street}
                            onChange={(e) => setStreet(e.target.value)}
                            onBlur={searchSalonCepByAddress}
                            placeholder="Ex: Rua Bela Cintra"
                            className="w-full min-h-[44px] bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500"
                            required
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                            Número <span className="text-emerald-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={number}
                            onChange={(e) => setNumber(e.target.value)}
                            placeholder="100"
                            className="w-full min-h-[44px] bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 ring-1 ring-emerald-500/30 sm:text-center"
                            required
                            autoFocus={!!street}
                          />
                        </div>
                      </div>

                      {/* 3. Complemento (4 cols) e 4. Bairro * (8 cols) */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        <div className="sm:col-span-4">
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                            Complemento
                          </label>
                          <input
                            type="text"
                            value={complement}
                            onChange={(e) => setComplement(e.target.value)}
                            placeholder="Loja 2"
                            className="w-full min-h-[44px] bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div className="sm:col-span-8">
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                            Bairro <span className="text-emerald-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={neighborhood}
                            onChange={(e) => setNeighborhood(e.target.value)}
                            onBlur={searchSalonCepByAddress}
                            placeholder="Consolação"
                            className="w-full min-h-[44px] bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500"
                            required
                          />
                        </div>
                      </div>

                      {/* 5. Cidade * (6 cols), 6. UF * (2 cols) e 7. CEP * (4 cols) */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        <div className="sm:col-span-6">
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                            Cidade <span className="text-emerald-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            onBlur={searchSalonCepByAddress}
                            placeholder="São Paulo"
                            className="w-full min-h-[44px] bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500"
                            required
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1 sm:text-center">
                            UF <span className="text-emerald-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={state}
                            maxLength={2}
                            onChange={(e) => setState(e.target.value.toUpperCase())}
                            onBlur={searchSalonCepByAddress}
                            placeholder="SP"
                            className="w-full min-h-[44px] bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 uppercase font-mono sm:text-center"
                            required
                          />
                        </div>

                        <div className="sm:col-span-4">
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-semibold text-slate-400">
                              CEP <span className="text-emerald-400">*</span>
                            </label>
                            {isSearchingCepByAddress && (
                              <Loader2 className="w-3 h-3 text-emerald-400 animate-spin" />
                            )}
                          </div>
                          <div className="flex items-center min-h-[44px] bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus-within:border-emerald-500 transition">
                            <MapPin className="w-3.5 h-3.5 text-emerald-400 mr-1.5 shrink-0" />
                            <input
                              type="text"
                              value={cep}
                              onChange={(e) => handleCepChange(e.target.value)}
                              placeholder="00000-000"
                              maxLength={9}
                              className="w-full bg-transparent text-xs sm:text-sm font-mono text-white placeholder-slate-600 outline-none"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between gap-2.5">
                      <button
                        type="button"
                        onClick={() => setAddressSubPhase('cep_modal')}
                        className="py-2.5 px-4 min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Voltar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => updatePhase('visual')}
                        className="flex-1 sm:flex-initial py-2.5 px-5 min-h-[44px] rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 whitespace-nowrap"
                      >
                        <span className="text-white">Avançar para Visual</span>
                        <ArrowRight className="w-3.5 h-3.5 text-white shrink-0" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ETAPA 4 DO SALÃO: IDENTIDADE VISUAL & BRANDING (Fullwidth Mobile / Proporcional Tablet & Desktop) */}
            {activeSection === 'visual' && (
              <div className="w-full bg-transparent sm:bg-slate-950/70 border-0 sm:border sm:border-slate-800 rounded-none sm:rounded-xl p-0 sm:p-4 space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-white">
                      Identidade Visual do Estabelecimento
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Marca, ícone PWA e assinatura visual
                  </span>
                </div>

                {/* 1. LOGOTIPO & 2. FAVICON */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Pilar 1: Logotipo Principal */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-semibold text-slate-200">
                        1. Logotipo da Marca
                      </label>
                      {logoUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setLogoUrl('');
                            if (useLogoAsFavicon) setFaviconUrl('');
                          }}
                          className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                        >
                          Remover
                        </button>
                      )}
                    </div>

                    <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-dashed border-slate-700 hover:border-emerald-500/60 transition cursor-pointer group">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'logo')}
                        className="hidden"
                      />
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 overflow-hidden border border-slate-700"
                        style={{ backgroundColor: logoUrl ? '#0f172a' : primaryColor }}
                      >
                        {logoUrl ? (
                          <img
                            src={logoUrl}
                            alt="Logotipo"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <span className="text-sm font-black text-white uppercase">
                            {(tradeName || 'VA').slice(0, 2)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-white group-hover:text-emerald-400 transition flex items-center gap-1">
                          <Upload className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>{logoUrl ? 'Trocar Logotipo' : 'Enviar Logotipo'}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          PNG, JPG ou SVG
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* Pilar 2: Favicon / Ícone do App */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <label className="block text-[11px] font-semibold text-slate-200">
                        2. Ícone do App (1:1)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !useLogoAsFavicon;
                          setUseLogoAsFavicon(next);
                          if (next && logoUrl) {
                            setFaviconUrl(logoUrl);
                          }
                        }}
                        className={`text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition ${
                          useLogoAsFavicon ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Usar logotipo</span>
                      </button>
                    </div>

                    <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-dashed border-slate-700 hover:border-emerald-500/60 transition cursor-pointer group">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'favicon')}
                        className="hidden"
                      />
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 overflow-hidden border border-slate-700 shadow-sm"
                        style={{
                          backgroundColor:
                            (useLogoAsFavicon ? logoUrl : faviconUrl) ? '#0f172a' : primaryColor,
                        }}
                      >
                        {(useLogoAsFavicon ? logoUrl : faviconUrl) ? (
                          <img
                            src={useLogoAsFavicon ? logoUrl : faviconUrl}
                            alt="Favicon"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-black text-white uppercase">
                            {(tradeName || 'V').slice(0, 1)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-white group-hover:text-emerald-400 transition flex items-center gap-1">
                          <Smartphone className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>
                            {(useLogoAsFavicon ? logoUrl : faviconUrl)
                              ? 'Trocar Ícone'
                              : 'Enviar Ícone'}
                          </span>
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          Tela inicial do celular
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* 3. COR DA MARCA (5 cols) & 4. SLOGAN (7 cols) */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-0.5">
                  <div className="sm:col-span-5 space-y-1.5">
                    <label className="block text-[11px] font-semibold text-slate-200">
                      3. Cor Principal
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-10 h-10 rounded-lg border border-slate-700 bg-transparent cursor-pointer shrink-0"
                      />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-24 min-h-[42px] bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white font-mono outline-none focus:border-emerald-500 transition uppercase text-center"
                      />
                      <div className="flex items-center gap-1.5 pl-0.5">
                        {[
                          { hex: '#20C933', label: 'Verde Vagou' },
                          { hex: '#D97706', label: 'Dourado' },
                          { hex: '#E11D48', label: 'Rose' },
                          { hex: '#2563EB', label: 'Azul' },
                        ].map((swatch) => (
                          <button
                            key={swatch.hex}
                            type="button"
                            onClick={() => setPrimaryColor(swatch.hex)}
                            title={swatch.label}
                            style={{ backgroundColor: swatch.hex }}
                            className={`w-6 h-6 rounded-full cursor-pointer transition transform hover:scale-110 ${
                              primaryColor.toLowerCase() === swatch.hex.toLowerCase()
                                ? 'ring-2 ring-white scale-110'
                                : 'opacity-80 hover:opacity-100'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="sm:col-span-7 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-semibold text-slate-200 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                        <span>4. Slogan Curto</span>
                      </label>
                      <span className="text-[10px] font-mono text-slate-500">
                        {slogan.length}/60
                      </span>
                    </div>
                    <input
                      type="text"
                      value={slogan}
                      maxLength={60}
                      onChange={(e) => setSlogan(e.target.value)}
                      placeholder="Ex: Estilo e tradição no seu tempo."
                      className="w-full min-h-[44px] bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                </div>

                {/* 5. ESTILO DA FONTE DA MARCA */}
                <div className="space-y-2 pt-0.5">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <label className="block text-[11px] font-semibold text-slate-200 flex items-center gap-1">
                      <Type className="w-3 h-3 text-emerald-400" />
                      <span>5. Fonte de Destaque (Nome & Cabeçalho)</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {BRAND_FONT_PRESETS.map((preset) => {
                      const isSelected = brandFont === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setBrandFont(preset.id)}
                          className={`p-3 rounded-xl text-left transition cursor-pointer flex flex-col justify-between gap-1 ${
                            isSelected
                              ? 'bg-[#20C933] text-white shadow-md shadow-emerald-500/15'
                              : 'bg-slate-900 hover:bg-slate-800/90 text-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`text-[9px] font-bold uppercase tracking-wider truncate ${
                                isSelected ? 'text-white' : 'text-emerald-400'
                              }`}
                            >
                              {preset.name}
                            </span>
                            {isSelected && <Check className="w-3 h-3 text-white shrink-0" />}
                          </div>

                          <p
                            style={{ fontFamily: preset.fontFamily }}
                            className="text-xs sm:text-sm font-bold truncate text-white"
                          >
                            {tradeName || 'Meu Salão'}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* SIMULADOR VISUAL EM TEMPO REAL */}
                <div className="pt-2.5 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-2.5 rounded-xl">
                    <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <div
                      className="w-4 h-4 rounded flex items-center justify-center shrink-0 overflow-hidden"
                      style={{
                        backgroundColor:
                          (useLogoAsFavicon ? logoUrl : faviconUrl) ? '#0f172a' : primaryColor,
                      }}
                    >
                      {(useLogoAsFavicon ? logoUrl : faviconUrl) ? (
                        <img
                          src={useLogoAsFavicon ? logoUrl : faviconUrl}
                          alt="Favicon"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[9px] font-black text-white uppercase">
                          {(tradeName || 'V').slice(0, 1)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] text-slate-500 block">Aba do Navegador</span>
                      <p className="text-[11px] font-semibold text-white truncate">
                        {tradeName || 'Meu Salão'} {slogan ? `— ${slogan}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 bg-slate-900/90 px-3 py-2.5 rounded-xl">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 overflow-hidden shadow-sm"
                      style={{
                        backgroundColor:
                          (useLogoAsFavicon ? logoUrl : faviconUrl) ? '#0f172a' : primaryColor,
                      }}
                    >
                      {(useLogoAsFavicon ? logoUrl : faviconUrl) ? (
                        <img
                          src={useLogoAsFavicon ? logoUrl : faviconUrl}
                          alt="App Icon"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span
                          style={{ fontFamily: activeBrandFontFamily }}
                          className="text-[11px] font-black text-white uppercase"
                        >
                          {(tradeName || 'VA').slice(0, 2)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] text-slate-500 block">
                        App no Celular ({brandFont})
                      </span>
                      <p
                        style={{ fontFamily: activeBrandFontFamily }}
                        className="text-xs font-bold text-white truncate"
                      >
                        {tradeName || 'Meu Salão'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* RODAPÉ FIXO DE NAVEGAÇÃO PROGRESSIVA (Comercial, Fiscal, PIX & Visual) */}
            {activeSection !== 'address' && (
              <div className="pt-2 flex items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    if (activeSection === 'visual') updatePhase('address');
                    else if (activeSection === 'pix_billing') updatePhase('fiscal');
                    else if (activeSection === 'fiscal') updatePhase('commercial');
                    else updatePhase('user_check');
                  }}
                  className="py-2.5 px-4 min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                  <span>Voltar</span>
                </button>

                {activeSection === 'commercial' && (
                  <button
                    type="button"
                    onClick={() => {
                      const clean = sanitizeSalonSlug(slug);
                      if (clean.length < 3) {
                        setFeedback({
                          type: 'error',
                          message: 'Informe um link personalizado com pelo menos 3 letras ou números.',
                        });
                        return;
                      }
                      if (slugCheckStatus === 'taken' || slugCheckStatus === 'reserved') {
                        setFeedback({
                          type: 'error',
                          message: `O link "${clean}.vagouapp.com" já está em uso. Escolha outro link ou toque em uma sugestão livre.`,
                        });
                        return;
                      }
                      setFeedback(null);
                      updatePhase('fiscal');
                    }}
                    className="flex-1 sm:flex-initial py-2.5 px-5 min-h-[44px] rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 whitespace-nowrap"
                  >
                    <span className="text-white">Avançar para Fiscal</span>
                    <ArrowRight className="w-3.5 h-3.5 text-white shrink-0" />
                  </button>
                )}

                {activeSection === 'fiscal' && (
                  <button
                    type="button"
                    onClick={() => {
                      setFeedback(null);
                      updatePhase('pix_billing');
                    }}
                    className="flex-1 sm:flex-initial py-2.5 px-5 min-h-[44px] rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 whitespace-nowrap"
                  >
                    <span className="text-white">Avançar para PIX</span>
                    <ArrowRight className="w-3.5 h-3.5 text-white shrink-0" />
                  </button>
                )}

                {activeSection === 'pix_billing' && (
                  <button
                    type="button"
                    onClick={() => {
                      setFeedback(null);
                      updatePhase('address');
                    }}
                    className="flex-1 sm:flex-initial py-2.5 px-5 min-h-[44px] rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 whitespace-nowrap"
                  >
                    <span className="text-white">Avançar para Endereço</span>
                    <ArrowRight className="w-3.5 h-3.5 text-white shrink-0" />
                  </button>
                )}

                {activeSection === 'visual' && (
                  <button
                    type="button"
                    onClick={() => updatePhase('review')}
                    className="flex-1 sm:flex-initial py-2.5 px-5 min-h-[44px] rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 whitespace-nowrap"
                  >
                    <FileText className="w-3.5 h-3.5 text-white shrink-0" />
                    <span className="text-white">Revisar Ficha</span>
                    <ArrowRight className="w-3.5 h-3.5 text-white shrink-0" />
                  </button>
                )}
              </div>
            )}
          </form>

          {/* ========================================================================= */}
          {/* 📋 MODAL FINAL DE CONFIRMAÇÃO: FICHA COMPLETA DO ESTABELECIMENTO         */}
          {/* ========================================================================= */}
          {isReviewModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
              <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
                {/* Cabeçalho do Modal de Revisão */}
                <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-white">
                        Ficha Completa — Confirmação
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Confira os dados antes de criar o estabelecimento
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => updatePhase(activeSection || 'visual')}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Corpo Rolável da Ficha Completa */}
                <div className="p-4 overflow-y-auto space-y-4 divide-y divide-slate-800/80 text-xs">
                  {/* Resumo 1: Titular Vinculado (Dados Pessoais + CPF) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 text-[11px]">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Titular / Proprietário (Dados Pessoais)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => updatePhase('user_check')}
                        className="text-[11px] font-semibold text-slate-400 hover:text-emerald-400 flex items-center gap-1 cursor-pointer transition"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Trocar</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <span className="text-slate-500 block text-[11px]">Nome</span>
                        <strong className="text-white font-semibold">{ownerName || '—'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">CPF Pessoal</span>
                        <strong className="text-emerald-400 font-mono">{ownerCpf || '—'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">WhatsApp</span>
                        <strong className="text-white font-semibold">{ownerWhatsapp || '—'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">E-mail</span>
                        <strong className="text-white font-semibold truncate block">{ownerEmail || '—'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Resumo 2: Dados Comerciais */}
                  <div className="pt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 text-[11px]">
                        <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>1. Dados Comerciais</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => updatePhase('commercial')}
                        className="text-[11px] font-semibold text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Editar</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <span className="text-slate-500 block text-[11px]">Nome Fantasia</span>
                        <strong className="text-white font-semibold">{tradeName || '—'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Categoria</span>
                        <strong className="text-white font-semibold">{category || '—'}</strong>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-500 block text-[11px]">Rota Oficial</span>
                        <strong className="text-emerald-400 font-mono">{slug}.vagouapp.com</strong>
                      </div>
                    </div>
                  </div>

                  {/* Resumo 3: Dados Fiscais */}
                  <div className="pt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 text-[11px]">
                        <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                        <span>2. Dados Fiscais</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => updatePhase('fiscal')}
                        className="text-[11px] font-semibold text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Editar</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <span className="text-slate-500 block text-[11px]">Regime / Tributação</span>
                        <strong className="text-white font-semibold">
                          {hasCnpj ? cnpjNumber || 'CNPJ informado' : 'Autônomo (Sem CNPJ)'}
                        </strong>
                      </div>
                      {hasCnpj && (
                        <div>
                          <span className="text-slate-500 block text-[11px]">Razão Social</span>
                          <strong className="text-white font-semibold">{legalName || '—'}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Resumo 4: Faturamento & Chaves PIX */}
                  <div className="pt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 text-[11px]">
                        <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                        <span>3. Faturamento & Chaves PIX</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => updatePhase('pix_billing')}
                        className="text-[11px] font-semibold text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Editar</span>
                      </button>
                    </div>
                    <div className="space-y-1 pt-1">
                      {pixKeys
                        .filter((k) => k.key.trim())
                        .map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-[11px]">
                            <span className="text-white font-mono">
                              {item.key}{' '}
                              {item.isPrimary && (
                                <span className="text-emerald-400 font-sans font-bold">(Principal)</span>
                              )}
                            </span>
                            <span className="text-slate-400 truncate max-w-[140px]">
                              {item.holderName || item.institution || ''}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Resumo 5: Endereço & Localização */}
                  <div className="pt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 text-[11px]">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                        <span>
                          4. Endereço & Localização{isSameAddressChosen ? ' (Mesmo do Titular)' : ''}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => updatePhase('address')}
                        className="text-[11px] font-semibold text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Editar</span>
                      </button>
                    </div>
                    <div className="pt-1 space-y-1">
                      <p className="text-white font-semibold">
                        {street || '—'}, {number || 'S/N'} {complement ? `(${complement})` : ''}
                      </p>
                      <p className="text-slate-400">
                        {neighborhood || '—'} · {city || '—'} / {state || '—'} — CEP: {cep || '—'}
                      </p>
                    </div>
                  </div>

                  {/* Resumo 6: Identidade Visual & Branding */}
                  <div className="pt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 text-[11px]">
                        <Palette className="w-3.5 h-3.5 text-emerald-400" />
                        <span>5. Identidade Visual & Branding</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => updatePhase('visual')}
                        className="text-[11px] font-semibold text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Editar</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-5 h-5 rounded-lg border border-slate-700 shrink-0"
                          style={{ backgroundColor: primaryColor }}
                        />
                        <div>
                          <span className="text-slate-500 block text-[11px]">Cor da Marca</span>
                          <strong className="text-white font-mono">{primaryColor}</strong>
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Logotipo & Favicon</span>
                        <strong className="text-white font-semibold">
                          {logoUrl ? 'Imagem enviada' : 'Iniciais automáticas'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Fonte de Destaque</span>
                        <strong
                          style={{ fontFamily: activeBrandFontFamily }}
                          className="text-white font-bold text-sm"
                        >
                          {brandFont}
                        </strong>
                      </div>
                      <div className="sm:col-span-3">
                        <span className="text-slate-500 block text-[11px]">Slogan</span>
                        <p className="text-slate-200 font-medium">{slogan || '—'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rodapé Fixo de Ação Final (sticky bottom-0 z-20) */}
                <div className="sticky bottom-0 z-20 p-4 sm:p-5 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => updatePhase(activeSection)}
                    className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
                  >
                    Voltar e Editar Dados
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmCreateSalon}
                    disabled={isLoading}
                    className="w-full sm:w-auto py-3.5 px-6 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4 text-white" />
                        <span className="text-white">Confirmar e Criar Estabelecimento</span>
                        <Check className="w-4 h-4 text-white" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 6: MODAL DE BOAS-VINDAS, LINK, QR CODE DE BALCÃO & ACESSO AO APP    */}
      {/* ========================================================================= */}
      <SalonWelcomeModal
        isOpen={isWelcomeModalOpen}
        onClose={() => {
          setIsWelcomeModalOpen(false);
          if (createdSalonResult) {
            if (typeof window !== 'undefined') {
              window.parent?.postMessage(
                {
                  source: 'VAGOUAPP_FORM',
                  action: 'SALON_MASTER_SUCCESS',
                  payload: createdSalonResult.payload,
                  salon: createdSalonResult.salon,
                  timestamp: new Date().toISOString(),
                },
                '*'
              );
            }
            onSuccess?.(createdSalonResult.payload, createdSalonResult.salon);
          }
          onStepChange?.('visual');
          onClose?.();
        }}
        data={{
          tradeName: tradeName || 'Meu Espaço',
          slug: slug || 'meu-espaco',
          slogan,
          ownerName,
        }}
      />

      {/* ========================================================================= */}
      {/* 🖨️ MODAL DE IMPRESSÃO DA PLAQUINHA PIX DE BALCÃO / BANCADA                */}
      {/* ========================================================================= */}
      <SalonPixPrintModal
        isOpen={isPrintPlaqueOpen}
        onClose={() => setIsPrintPlaqueOpen(false)}
        salonName={tradeName || 'Meu Estabelecimento'}
        logoUrl={logoUrl}
        pixKey={pixKeys.find((k) => k.isPrimary)?.key || pixKeys[0]?.key || ''}
        pixKeyType={pixKeys.find((k) => k.isPrimary)?.type || pixKeys[0]?.type || 'phone'}
        holderName={
          pixKeys.find((k) => k.isPrimary)?.holderName ||
          (hasCnpj ? legalName : ownerName) ||
          tradeName
        }
        institution={pixKeys.find((k) => k.isPrimary)?.institution || 'Banco Central (SPI / PIX)'}
        city={city || 'São Paulo'}
      />

      {/* ========================================================================= */}
      {/* 📲 MODAL DE COBRANÇA PIX PÓS-SERVIÇO (QR CODE NA TELA / ENVIAR WHATSAPP)  */}
      {/* ========================================================================= */}
      <PixCheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        salonName={tradeName || 'Meu Estabelecimento'}
        pixKey={pixKeys.find((k) => k.isPrimary)?.key || pixKeys[0]?.key || ''}
        pixHolderName={
          pixKeys.find((k) => k.isPrimary)?.holderName ||
          (hasCnpj ? legalName : ownerName) ||
          tradeName
        }
        clientName="Cliente Exemplo"
        clientPhone={ownerWhatsapp || ''}
        serviceName="Corte Degradê + Barba Alinhada"
        professionalName={ownerName || 'Profissional'}
        initialAmount={65.0}
      />
    </div>
  );
};
