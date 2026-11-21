import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  uploadBinaryMediaFile,
} from '../../../services/supabaseApi';
import { AdminSalonItem, PixKeyType, SalonPixKeyItem } from '../../../types/admin';
import { getPixQrCodeUrl } from '../../../services/pixGenerator';
import { SalonPixPrintModal } from '../SalonPixPrintModal';
import { PixCheckoutModal } from '../PixCheckoutModal';
import { VagouOfficialLogo } from '../../common/VagouOfficialLogo';
import { TriadeUserRegisterForm, TriadeUserData } from './TriadeUserRegisterForm';
import { TriadeUserLoginForm, TriadeUserLoginPayload } from './TriadeUserLoginForm';
import { SalonWelcomeModal } from '../SalonWelcomeModal';
import { GoogleAddressPinPicker } from '../GoogleAddressPinPicker';
import { useDeviceViewport } from '../../../hooks/useDeviceViewport';

export interface EstablishmentMasterPayload {

  ownerName: string;
  ownerWhatsapp: string;
  ownerEmail: string;
  ownerCpf?: string;

  tradeName: string;
  category: string;
  slug: string;

  hasCnpj?: boolean;
  legalName: string;
  documentType: 'CNPJ' | 'CPF';
  documentNumber: string;

  pixKey: string;
  pixKeys?: SalonPixKeyItem[];
  operationalModel: string;
  platformPlan: string;

  address: {
    cep: string;
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    latitude?: number | null;
    longitude?: number | null;
  };

  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  slogan: string;
  brandFont: 'Poppins' | 'Cormorant Garamond' | 'Oswald' | 'Plus Jakarta Sans' | string;

  bannerUrl?: string;
  bio?: string;
  instagram?: string;
}

type EstabMasterPhase =
  | 'user_check'
  | 'commercial'
  | 'fiscal'
  | 'pix_billing'
  | 'address'
  | 'visual'
  | 'review'
  | 'welcome';

type EstabUserAuthSubFlow = 'none' | 'login' | 'register';
type EstabAddressSubPhase = 'same_address_modal' | 'cep_modal' | 'address_form';

interface TriadeEstablishmentMasterFormProps {
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
  isStandalonePreview = false,
  initialStep = 'user_check',
  forcedStep,
  onStepChange,
  forcedUserAuthSubFlow,
  onUserAuthSubFlowChange,
  forcedAddressSubPhase,
  onAddressSubPhaseChange,
}) => {
  const { device } = useDeviceViewport();

  const [flowStep, setFlowStep] = useState<'user_check' | 'establishment_details'>(
    (forcedStep || initialStep) === 'user_check' ? 'user_check' : 'establishment_details'
  );

  const [userAuthSubFlow, setUserAuthSubFlowState] = useState<EstabUserAuthSubFlow>('none');
  const setUserAuthSubFlow = (next: EstabUserAuthSubFlow) => {
    setUserAuthSubFlowState(next);
    onUserAuthSubFlowChange?.(next);
  };

  const [activeSection, setActiveSection] = useState<'commercial' | 'fiscal' | 'pix_billing' | 'address' | 'visual'>('commercial');

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

  const [, setIsAuthenticatedOwner] = useState<boolean>(false);
  const [, setSelectedUser] = useState<{
    id: string;
    name: string;
    email: string;
    phone: string;
    username: string;
  } | null>(null);

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

  const [ownerName, setOwnerName] = useState(initialData?.ownerName || '');
  const [ownerWhatsapp, setOwnerWhatsapp] = useState(initialData?.ownerWhatsapp || '');
  const [ownerEmail, setOwnerEmail] = useState(initialData?.ownerEmail || '');
  const [ownerCpf, setOwnerCpf] = useState(
    initialData?.ownerCpf ||
      (initialData?.documentType === 'CPF' ? initialData?.documentNumber || '' : '')
  );

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

  const [hasCnpj, setHasCnpj] = useState<boolean>(
    initialData?.hasCnpj ?? (initialData?.documentType === 'CNPJ' && Boolean(initialData?.documentNumber))
  );
  const [cnpjNumber, setCnpjNumber] = useState(
    initialData?.documentType === 'CNPJ' ? initialData?.documentNumber || '' : ''
  );
  const [legalName, setLegalName] = useState(initialData?.legalName || '');
  const [isSearchingCnpj, setIsSearchingCnpj] = useState(false);

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
  const platformPlan = initialData?.platformPlan || 'PER_APPOINTMENT';

  const [cep, setCep] = useState(initialData?.address?.cep || '');
  const [street, setStreet] = useState(initialData?.address?.street || '');
  const [number, setNumber] = useState(initialData?.address?.number || '');
  const [complement, setComplement] = useState(initialData?.address?.complement || '');
  const [neighborhood, setNeighborhood] = useState(initialData?.address?.neighborhood || '');
  const [city, setCity] = useState(initialData?.address?.city || '');
  const [state, setState] = useState(initialData?.address?.state || '');
  const [latitude, setLatitude] = useState<number | null>(initialData?.address?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(initialData?.address?.longitude ?? null);

  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [isSearchingCepByAddress, setIsSearchingCepByAddress] = useState(false);

  const formatFiscalDocument = (value: string, type: 'CNPJ' | 'CPF') => {
    return formatPixKeyByType(value, type === 'CPF' ? 'cpf' : 'cnpj');
  };

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

  const [logoUrl, setLogoUrl] = useState(initialData?.logoUrl || '');
  const [faviconUrl, setFaviconUrl] = useState(initialData?.faviconUrl || '');
  const [useLogoAsFavicon, setUseLogoAsFavicon] = useState(true);
  const [primaryColor, setPrimaryColor] = useState(initialData?.primaryColor || '#10B981');
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

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'logo' | 'favicon'
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setFeedback(null);
    const uploadRes = await uploadBinaryMediaFile(file, {
      bucket: 'branding',
      ownerType: target === 'logo' ? 'salon_logo_light' : 'salon_icon',
      title: `${tradeName || slug || 'estabelecimento'}-${target}`,
    });

    if (uploadRes.success && uploadRes.url) {
      if (target === 'logo') {
        setLogoUrl(uploadRes.url);
        if (useLogoAsFavicon) {
          setFaviconUrl(uploadRes.url);
        }
      } else {
        setFaviconUrl(uploadRes.url);
        setUseLogoAsFavicon(false);
      }
      setFeedback({ type: 'success', message: 'Imagem salva no Supabase Storage com sucesso!' });
    } else {
      setFeedback({
        type: 'error',
        message: uploadRes.error || 'Falha ao enviar imagem para o Storage.',
      });
    }
  };

  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

  const handleSkipSalonCep = () => {
    setFeedback(null);
    setAddressSubPhase('address_form');
  };

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

      }

      setSelectedUser(matchedUser);
      setOwnerName(matchedUser.name);
      setOwnerEmail(matchedUser.email);
      setOwnerWhatsapp(matchedUser.phone);
      setOwnerAddressData(resolvedOwnerAddr);
      setIsAuthenticatedOwner(true);

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

  const handleConfirmCreateSalon = async () => {
    setFeedback(null);

    if (!tradeName.trim()) {
      setIsReviewModalOpen(false);
      updatePhase('commercial');
      setFeedback({ type: 'error', message: 'Preencha o Nome Fantasia do estabelecimento.' });
      return;
    }

    const cleanOwnerCpf = ownerCpf.replace(/\D/g, '');
    if (cleanOwnerCpf.length > 0 && cleanOwnerCpf.length !== 11) {
      setIsReviewModalOpen(false);
      updatePhase('commercial');
      setFeedback({
        type: 'error',
        message: 'O CPF informado deve conter 11 dígitos ou ser deixado em branco.',
      });
      return;
    }

    const cleanSlugForSubmit = sanitizeSalonSlug(slug || tradeName);
    if (cleanSlugForSubmit.length < 3) {
      setIsReviewModalOpen(false);
      updatePhase('commercial');
      setFeedback({
        type: 'error',
        message: 'O link personalizado deve ter pelo menos 3 letras ou números.',
      });
      return;
    }

    if (slugCheckStatus === 'taken' || slugCheckStatus === 'reserved') {
      setIsReviewModalOpen(false);
      updatePhase('commercial');
      setFeedback({
        type: 'error',
        message: `O link "${cleanSlugForSubmit}.vagouapp.com" já está em uso. Escolha outro link ou selecione uma das sugestões disponíveis.`,
      });
      return;
    }

    if (hasCnpj && cnpjNumber.replace(/\D/g, '').length !== 14) {
      setIsReviewModalOpen(false);
      updatePhase('fiscal');
      setFeedback({
        type: 'error',
        message: 'Informe os 14 dígitos do CNPJ ou selecione a opção Sem CNPJ.',
      });
      return;
    }

    const resolvedStreet = (street.trim() || ownerAddressData.street.trim());
    const resolvedNumber = (number.trim() || ownerAddressData.number.trim() || 'S/N');
    const resolvedNeighborhood = (neighborhood.trim() || ownerAddressData.neighborhood.trim() || 'Centro');
    const resolvedCity = (city.trim() || ownerAddressData.city.trim() || 'São Paulo');
    const resolvedState = (state.trim() || ownerAddressData.state.trim() || 'SP').toUpperCase();
    const resolvedCep = (cep.trim() || ownerAddressData.cep.trim());

    if (!resolvedStreet || !resolvedCity || !resolvedState) {
      setIsReviewModalOpen(false);
      updatePhase('address');
      setAddressSubPhase('address_form');
      setFeedback({ type: 'error', message: 'Preencha a rua, cidade e UF do estabelecimento.' });
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
      slug: cleanSlugForSubmit,
      address: {
        cep: resolvedCep,
        street: resolvedStreet,
        number: resolvedNumber,
        complement,
        neighborhood: resolvedNeighborhood,
        city: resolvedCity,
        state: resolvedState,
        latitude,
        longitude,
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
        slug: cleanSlugForSubmit,
        phone_whatsapp: ownerWhatsapp.trim(),
        email: ownerEmail.trim().toLowerCase(),
        document_type: resolvedDocType,
        document_number: resolvedDocNumber,
        has_cnpj: hasCnpj,
        owner_cpf: ownerCpf.trim(),
        pix_key: resolvedPrimaryPixKey,
        pix_keys: validPixKeys,
        operating_model: operationalModel,
        billing_plan:
          String(platformPlan || '').toUpperCase() === 'SUBSCRIPTION'
            ? 'SUBSCRIPTION'
            : 'PER_APPOINTMENT',
        fee_per_booking: 2.5,
        billing_fee_value: 2.5,
        monthly_subscription_fee: 89.9,
        billing_due_day: 10,
        owner_name: ownerName.trim(),
        category: category as any,
        status: 'active',
        is_verified: true,
        address: resolvedStreet,
        street_number: resolvedNumber,
        complement: complement.trim(),
        neighborhood: resolvedNeighborhood,
        city: resolvedCity,
        state: resolvedState,
        cep: resolvedCep,
        latitude,
        longitude,
        logo_url: logoUrl,
        favicon_url: effectiveFavicon,
        slogan: slogan.trim(),
        brand_font: brandFont,
        default_theme: 'light',
        primary_color: primaryColor || '#10B981',
        secondary_color: '#065F46',
        nav_bg_style: 'solid',
        nav_bg_color: '#D1FAE5',
        nav_icon_border: 'none',
        section_header_bg_style: 'solid',
        section_header_bg_color: '#ECFDF5',
        section_header_text_color: '#065F46',
        section_header_icon_color: '#059669',
      });

      setIsLoading(false);

      if (!res.success) {
        setFeedback({
          type: 'error',
          message: res.error || 'Não foi possível salvar o estabelecimento no Supabase.',
        });
        return;
      }

      const finalSlug = sanitizeSalonSlug(
        res.salon?.slug || cleanSlugForSubmit || slug || tradeName
      );
      const targetSalonUrl = `https://${finalSlug}.vagouapp.com`;
      const enrichedPayload = {
        ...payload,
        slug: finalSlug,
        redirectUrl: targetSalonUrl,
        salonUrl: targetSalonUrl,
        salon: res.salon,
      };

      setCreatedSalonResult({ payload, salon: res.salon });
      setIsReviewModalOpen(false);

      if (forcedStep !== undefined) {
        setIsWelcomeModalOpen(true);
        onStepChange?.('welcome');
        onSuccess?.(enrichedPayload as any, res.salon);
        setFeedback({
          type: 'success',
          message: `O estabelecimento "${tradeName}" foi criado e salvo no Supabase com sucesso!`,
        });
        return;
      }

      onSuccess?.(enrichedPayload as any, res.salon);
      onClose?.();

      if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
        try {
          window.parent.postMessage(
            {
              source: 'VAGOUAPP_FORM',
              action: 'SALON_MASTER_SUCCESS',
              event: 'SALON_MASTER_SUCCESS',
              payload: enrichedPayload,
              salon: res.salon,
              slug: finalSlug,
              url: targetSalonUrl,
              redirectUrl: targetSalonUrl,
              salonUrl: targetSalonUrl,
              timestamp: new Date().toISOString(),
            },
            '*'
          );
          window.parent.postMessage(
            {
              type: 'VAGOU_REDIRECT',
              source: 'VAGOUAPP_EMBED',
              event: 'REDIRECT',
              action: 'SALON_MASTER_SUCCESS',
              slug: finalSlug,
              url: targetSalonUrl,
              redirectUrl: targetSalonUrl,
              salonUrl: targetSalonUrl,
            },
            '*'
          );
        } catch {}
      }

      if (isStandalonePreview || !onClose) {
        try {
          if (typeof window !== 'undefined') {
            if (window.top && window.top !== window) {
              try {
                window.top.location.href = targetSalonUrl;
              } catch {
                const topLink = document.createElement('a');
                topLink.href = targetSalonUrl;
                topLink.target = '_top';
                topLink.rel = 'noopener noreferrer';
                document.body.appendChild(topLink);
                topLink.click();
                document.body.removeChild(topLink);
              }
              setTimeout(() => {
                try {
                  window.parent.postMessage({ type: 'VAGOU_MODAL_CLOSE' }, '*');
                  window.parent.postMessage({ source: 'VAGOUAPP_EMBED', event: 'CLOSE' }, '*');
                } catch {}
              }, 350);
            } else {
              window.location.assign(targetSalonUrl);
            }
          }
        } catch {
          if (typeof window !== 'undefined') {
            window.location.assign(targetSalonUrl);
          }
        }
      }
    } catch (err: any) {
      setIsLoading(false);
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
      className="triade-form-root w-full max-w-none sm:max-w-xl mx-auto font-['Poppins'] relative"
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

      {flowStep === 'user_check' && userAuthSubFlow === 'none' && (
        <div className="w-full px-5 py-6 sm:p-7 space-y-5 text-center animate-fadeIn">

          <VagouOfficialLogo size="xl" variant="full" className="h-9 sm:h-10 w-auto object-contain mx-auto" />

          <div className="space-y-1.5">
            <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
              O estabelecimento a ser criado já possui usuário cadastrado?
            </h2>
          </div>

          <div className="flex flex-col items-center gap-3 pt-1">

            <button
              type="button"
              onClick={() => setUserAuthSubFlow('login')}
              className="w-1/2 p-3.5 sm:p-4 min-h-[48px] rounded-xl border border-emerald-500/40 bg-emerald-950/30 hover:bg-emerald-900/40 transition cursor-pointer group active:scale-98 shadow-md flex items-center justify-between whitespace-nowrap"
            >
              <span className="text-sm font-black text-emerald-400 group-hover:text-emerald-300">SIM</span>
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => setUserAuthSubFlow('register')}
              className="w-1/2 p-3.5 sm:p-4 min-h-[48px] rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 transition cursor-pointer group active:scale-98 shadow-md flex items-center justify-between whitespace-nowrap"
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
        <div className="w-full px-5 py-5 sm:p-6 space-y-4 animate-fadeIn">
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

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 text-[11px] text-slate-400 flex-wrap">
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

      {flowStep === 'user_check' && userAuthSubFlow === 'register' && (
        <div className="w-full px-5 py-5 sm:p-6 space-y-4 animate-fadeIn">
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

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
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

      {flowStep === 'establishment_details' && (
        <div className="w-full animate-fadeIn">
          <form onSubmit={handleSubmit} className="w-full px-5 py-5 sm:p-6 space-y-4">

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

            {activeSection === 'commercial' && (
              <div className="w-full space-y-4 animate-fadeIn">

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
                    <div className="sm:col-span-12">
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
                  </div>
                </div>

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
                          Estabelecimento opera como <strong>autônomo</strong> vinculado ao titular (
                          <span className="font-mono text-emerald-400">{ownerCpf || 'Pode ser inserido posteriormente em Dados Pessoais'}</span>).
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

            {activeSection === 'address' && (
              <div className="w-full space-y-3.5 animate-fadeIn">

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

                      <GoogleAddressPinPicker
                        cep={cep}
                        address={street}
                        streetNumber={number}
                        neighborhood={neighborhood}
                        city={city}
                        state={state}
                        latitude={latitude}
                        longitude={longitude}
                        onCoordinatesChange={({ latitude: lat, longitude: lng }) => {
                          setLatitude(lat);
                          setLongitude(lng);
                        }}
                      />
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

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
                          { hex: '#10B981', label: 'Esmeralda Pastel (v5.0)' },
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
                    <span className="text-white">Revisar e Criar</span>
                    <ArrowRight className="w-3.5 h-3.5 text-white shrink-0" />
                  </button>
                )}
              </div>
            )}
          </form>

          {isReviewModalOpen &&
            (() => {
              const reviewDialog = (
                <div className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn font-['Poppins']">
                  <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

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

                    <div className="p-4 overflow-y-auto space-y-4 divide-y divide-slate-800/80 text-xs">
                      {feedback && (
                        <div
                          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
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
              );
              return typeof document !== 'undefined' && forcedStep !== 'review'
                ? createPortal(reviewDialog, document.body)
                : reviewDialog;
            })()}
        </div>
      )}

      <SalonWelcomeModal
        isOpen={isWelcomeModalOpen}
        onClose={() => {
          setIsWelcomeModalOpen(false);
          if (createdSalonResult) {
            const finalSlug = sanitizeSalonSlug(
              createdSalonResult.salon?.slug || createdSalonResult.payload.slug || slug || tradeName
            );
            const targetSalonUrl = `https://${finalSlug}.vagouapp.com`;
            const enrichedPayload = {
              ...createdSalonResult.payload,
              slug: finalSlug,
              redirectUrl: targetSalonUrl,
              salonUrl: targetSalonUrl,
              salon: createdSalonResult.salon,
            };
            if (typeof window !== 'undefined') {
              window.parent?.postMessage(
                {
                  source: 'VAGOUAPP_FORM',
                  action: 'SALON_MASTER_SUCCESS',
                  payload: enrichedPayload,
                  salon: createdSalonResult.salon,
                  slug: finalSlug,
                  redirectUrl: targetSalonUrl,
                  salonUrl: targetSalonUrl,
                  timestamp: new Date().toISOString(),
                },
                '*'
              );
            }
            onSuccess?.(enrichedPayload as any, createdSalonResult.salon);
          }
          onStepChange?.('visual');
          onClose?.();
        }}
        data={{
          tradeName: createdSalonResult?.salon?.trade_name || tradeName || 'Meu Espaço',
          slug: createdSalonResult?.salon?.slug || sanitizeSalonSlug(slug || tradeName) || 'meuespaco',
          slogan,
          ownerName,
        }}
      />

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
