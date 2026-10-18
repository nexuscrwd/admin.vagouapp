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
} from 'lucide-react';
import { fetchAdminClients, createAdminSalon } from '../../../services/supabaseApi';
import { AdminSalonItem } from '../../../types/admin';
import { VagouOfficialLogo } from '../../common/VagouOfficialLogo';
import { TriadeUserRegisterForm, TriadeUserData } from './TriadeUserRegisterForm';
import { TriadeUserLoginForm, TriadeUserLoginPayload } from './TriadeUserLoginForm';
import { SalonWelcomeModal } from '../SalonWelcomeModal';

export interface EstablishmentMasterPayload {
  // Titular / Proprietário
  ownerName: string;
  ownerWhatsapp: string;
  ownerEmail: string;

  // Dados Comerciais & Fiscais
  tradeName: string;
  legalName: string;
  documentType: 'CNPJ' | 'CPF';
  documentNumber: string;
  pixKey: string;
  operationalModel: string;
  platformPlan: string;
  category: string;
  slug: string;

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
  | 'address'
  | 'visual'
  | 'review'
  | 'welcome';

export interface TriadeEstablishmentMasterFormProps {
  initialData?: Partial<EstablishmentMasterPayload>;
  onSuccess?: (data: EstablishmentMasterPayload, createdSalon?: AdminSalonItem) => void;
  onClose?: () => void;
  isStandalonePreview?: boolean;
  initialStep?: EstabMasterPhase;
  forcedStep?: EstabMasterPhase;
  onStepChange?: (step: EstabMasterPhase) => void;
}

export const TriadeEstablishmentMasterForm: React.FC<TriadeEstablishmentMasterFormProps> = ({
  initialData,
  onSuccess,
  onClose,
  initialStep = 'user_check',
  forcedStep,
  onStepChange,
}) => {
  // Passos do Fluxo Inicial de Cadastramento (Regra de Negócio VagouApp)
  const [flowStep, setFlowStep] = useState<'user_check' | 'establishment_details'>(
    (forcedStep || initialStep) === 'user_check' ? 'user_check' : 'establishment_details'
  );

  // Sub-rotina transitória de Login/Cadastro de Usuário dentro de 1. Identificação (Sim/Não)
  const [userAuthSubFlow, setUserAuthSubFlow] = useState<'none' | 'login' | 'register'>('none');

  // Abas do formulário de dados do salão (Padrão inicial: Comercial & Fiscal)
  const [activeSection, setActiveSection] = useState<'commercial' | 'address' | 'visual'>('commercial');
  // Sub-fases do Endereço do Estabelecimento:
  // 1) 'same_address_modal' ("O salão fica no mesmo endereço do proprietário?")
  // 2) 'cep_modal' (Modal isolado de CEP idêntico ao cadastro de usuário)
  // 3) 'address_form' (Campos de endereço completados para conferência e número)
  const [addressSubPhase, setAddressSubPhase] = useState<'same_address_modal' | 'cep_modal' | 'address_form'>('same_address_modal');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);

  const applyPhase = (phase: EstabMasterPhase) => {
    if (phase === 'user_check') {
      setFlowStep('user_check');
      setUserAuthSubFlow('none');
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
        setAddressSubPhase('same_address_modal');
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
    cep: '01310-100',
    street: 'Avenida Paulista',
    number: '1578',
    complement: 'Apto 42',
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
  });





  // Dados do Proprietário no Formulário do Salão
  const [ownerName, setOwnerName] = useState(initialData?.ownerName || 'Lucas Gabriel Mendes');
  const [ownerWhatsapp, setOwnerWhatsapp] = useState(initialData?.ownerWhatsapp || '(11) 99999-1111');
  const [ownerEmail, setOwnerEmail] = useState(initialData?.ownerEmail || 'lucas.mendes@gmail.com');

  // Dados Comerciais & Fiscais do Salão
  const [tradeName, setTradeName] = useState(initialData?.tradeName || 'Lucas Barber');
  const [legalName, setLegalName] = useState(initialData?.legalName || 'Lucas Gabriel Mendes Barbearia ME');
  const [documentType, setDocumentType] = useState<'CNPJ' | 'CPF'>(initialData?.documentType || 'CNPJ');
  const [documentNumber, setDocumentNumber] = useState(initialData?.documentNumber || '45.123.890/0001-44');
  const [pixKey, setPixKey] = useState(initialData?.pixKey || '11999991111');
  const operationalModel = initialData?.operationalModel || 'Espaço Físico & Delivery';
  const platformPlan = initialData?.platformPlan || 'PRO / 5% POR AGENDAMENTO';
  const [category, setCategory] = useState(initialData?.category || 'Barbearia');
  const [slug, setSlug] = useState(initialData?.slug || 'lucas-barber');

  // Endereço do Salão com ViaCEP
  const [cep, setCep] = useState(initialData?.address?.cep || '01415-000');
  const [street, setStreet] = useState(initialData?.address?.street || 'Rua Bela Cintra');
  const [number, setNumber] = useState(initialData?.address?.number || '1234');
  const [complement, setComplement] = useState(initialData?.address?.complement || 'Loja 2');
  const [neighborhood, setNeighborhood] = useState(initialData?.address?.neighborhood || 'Consolação');
  const [city, setCity] = useState(initialData?.address?.city || 'São Paulo');
  const [state, setState] = useState(initialData?.address?.state || 'SP');

  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [isSearchingCepByAddress, setIsSearchingCepByAddress] = useState(false);
  const [isSearchingCnpj, setIsSearchingCnpj] = useState(false);

  // Máscara dinâmica de CPF (11 dígitos) e CNPJ (14 dígitos)
  const formatFiscalDocument = (value: string, type: 'CNPJ' | 'CPF') => {
    const digits = value.replace(/\D/g, '');
    if (type === 'CPF') {
      const d = digits.slice(0, 11);
      if (d.length <= 3) return d;
      if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
      if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
      return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
    }
    const d = digits.slice(0, 14);
    if (d.length <= 2) return d;
    if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
    if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
    if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
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
      if (data.nome_fantasia && (!tradeName.trim() || tradeName === 'Lucas Barber')) {
        handleTradeNameChange(data.nome_fantasia);
      }
    } catch {
      // Falha silenciosa caso offline ou CNPJ de teste
    } finally {
      setIsSearchingCnpj(false);
    }
  };

  const handleDocumentTypeSwitch = (nextType: 'CNPJ' | 'CPF') => {
    setDocumentType(nextType);
    const formatted = formatFiscalDocument(documentNumber, nextType);
    setDocumentNumber(formatted);
    if (nextType === 'CPF') {
      setLegalName('');
    }
  };

  const handleDocumentNumberChange = (val: string) => {
    const formatted = formatFiscalDocument(val, documentType);
    setDocumentNumber(formatted);
    if (documentType === 'CNPJ' && formatted.replace(/\D/g, '').length === 14) {
      handleCnpjLookup(formatted);
    }
  };

  // Identidade Visual & Branding (Essenciais: Logotipo, Favicon, Cor, Slogan e Fonte da Marca)
  const [logoUrl, setLogoUrl] = useState(initialData?.logoUrl || '');
  const [faviconUrl, setFaviconUrl] = useState(initialData?.faviconUrl || '');
  const [useLogoAsFavicon, setUseLogoAsFavicon] = useState(true);
  const [primaryColor, setPrimaryColor] = useState(initialData?.primaryColor || '#20C933');
  const [slogan, setSlogan] = useState(
    initialData?.slogan || 'Cortes modernos, degradê navalhado e barba terapia.'
  );
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
    const generatedSlug = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    setSlug(generatedSlug);
  };

  // Função para Copiar Endereço Residencial do Proprietário e Avançar para Próxima Fase
  const applyOwnerAddressToSalon = (addrData?: typeof ownerAddressData) => {
    const source = addrData || ownerAddressData;
    setCep(source.cep || '01310-100');
    setStreet(source.street || 'Avenida Paulista');
    setNumber(source.number || '1578');
    setComplement(source.complement || 'Apto 42');
    setNeighborhood(source.neighborhood || 'Bela Vista');
    setCity(source.city || 'São Paulo');
    setState(source.state || 'SP');
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
        id: 'usr-auth-01',
        name: data.identifier.includes('@') ? data.identifier.split('@')[0] : data.identifier,
        email: data.identifier.includes('@') ? data.identifier : `${data.identifier.toLowerCase().replace(/[^a-z0-9]/g, '')}@vagouapp.com`,
        phone: '(11) 98765-4321',
        username: data.identifier.replace(/^@+/, ''),
      };

      try {
        const cliList = await fetchAdminClients();
        if (cliList && Array.isArray(cliList)) {
          const found = cliList.find(
            (u) =>
              u.email?.toLowerCase() === term ||
              u.username?.toLowerCase() === term ||
              u.phone?.replace(/\D/g, '') === term.replace(/\D/g, '')
          );
          if (found) {
            matchedUser = {
              id: found.id,
              name: found.full_name || found.username || 'Proprietário',
              email: found.email || matchedUser.email,
              phone: found.phone || matchedUser.phone,
              username: found.username || matchedUser.username,
            };
            if (found.address || found.cep) {
              setOwnerAddressData({
                cep: found.cep || '01310-100',
                street: found.address || 'Avenida Paulista',
                number: found.street_number || '1578',
                complement: found.complement || '',
                neighborhood: found.neighborhood || 'Bela Vista',
                city: found.city || 'São Paulo',
                state: found.state || 'SP',
              });
            }
          }
        }
      } catch {
        console.warn('Uso do fallback simulado para login do proprietário');
      }

      setSelectedUser(matchedUser);
      setOwnerName(matchedUser.name);
      setOwnerEmail(matchedUser.email);
      setOwnerWhatsapp(matchedUser.phone);
      setIsAuthenticatedOwner(true);

      setFeedback({
        type: 'success',
        message: `Proprietário "${matchedUser.name}" (${matchedUser.username.replace(/^@+/, '')}) autenticado! Dados pré-carregados na ficha do estabelecimento.`,
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

    if (!cep.trim() || !street.trim() || !number.trim() || !city.trim() || !state.trim()) {
      updatePhase('address');
      setFeedback({ type: 'error', message: 'Preencha o endereço completo do estabelecimento.' });
      return;
    }

    setIsLoading(true);
    const resolvedLegalName =
      documentType === 'CNPJ'
        ? legalName.trim() || tradeName.trim()
        : ownerName.trim() || tradeName.trim();

    const effectiveFavicon = useLogoAsFavicon ? logoUrl || faviconUrl : faviconUrl;

    const payload: EstablishmentMasterPayload = {
      ownerName,
      ownerWhatsapp,
      ownerEmail,
      tradeName,
      legalName: resolvedLegalName,
      documentType,
      documentNumber,
      pixKey,
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
        document_type: documentType,
        document_number: documentNumber.trim(),
        pix_key: pixKey.trim(),
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

      setIsReviewModalOpen(false);
      setIsWelcomeModalOpen(true);
      onStepChange?.('welcome');
      setFeedback({
        type: 'success',
        message: `O estabelecimento "${tradeName}" foi criado e salvo no Supabase com sucesso!`,
      });

      if (typeof window !== 'undefined') {
        window.parent?.postMessage(
          {
            source: 'VAGOUAPP_FORM',
            action: 'SALON_MASTER_SUCCESS',
            payload,
            salon: res.salon,
            timestamp: new Date().toISOString(),
          },
          '*'
        );
      }

      onSuccess?.(payload, res.salon);
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
      updatePhase('address');
    } else if (activeSection === 'address') {
      updatePhase('visual');
    } else {
      updatePhase('review');
    }
  };

  return (
    <div className="w-full font-['Poppins'] relative">
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-20 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition cursor-pointer"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 1: IDENTIFICAÇÃO (SIM/NÃO) + SUB-ROTINA TRANSITÓRIA DE USUÁRIO      */}
      {/* ========================================================================= */}
      {flowStep === 'user_check' && userAuthSubFlow === 'none' && (
        <div className="p-6 sm:p-10 space-y-6 text-center animate-fadeIn">
          {/* Logo Oficial do VagouApp na Etapa 1 */}
          <VagouOfficialLogo size="xl" variant="full" className="h-10 sm:h-12 w-auto object-contain mx-auto" />

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
              O estabelecimento a ser criado já possui usuário cadastrado?
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto pt-2">
            {/* Opção SIM -> Chama Form Canônico de Login de Usuário e retorna aos Dados do Salão */}
            <button
              type="button"
              onClick={() => setUserAuthSubFlow('login')}
              className="p-5 rounded-2xl border border-emerald-500/40 bg-emerald-950/30 hover:bg-emerald-900/40 transition cursor-pointer group active:scale-98 shadow-md flex items-center justify-between"
            >
              <span className="text-base font-black text-emerald-400 group-hover:text-emerald-300">SIM</span>
              <Check className="w-5 h-5 text-emerald-400" />
            </button>

            {/* Opção NÃO -> Chama Form Canônico de Cadastro de Usuário e retorna aos Dados do Salão */}
            <button
              type="button"
              onClick={() => setUserAuthSubFlow('register')}
              className="p-5 rounded-2xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 transition cursor-pointer group active:scale-98 shadow-md flex items-center justify-between"
            >
              <span className="text-base font-black text-slate-200 group-hover:text-white">NÃO</span>
              <UserPlus className="w-5 h-5 text-slate-400 group-hover:text-white" />
            </button>
          </div>

          <div className="pt-4 border-t border-slate-800/60 max-w-lg mx-auto flex items-center justify-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Ambiente Seguro · Governança Oficial</span>
          </div>
        </div>
      )}

      {/* SUB-ROTINA TRANSITÓRIA (OPÇÃO SIM): LOGIN DE USUÁRIO E RETORNO AO SALÃO */}
      {flowStep === 'user_check' && userAuthSubFlow === 'login' && (
        <div className="p-4 sm:p-6 max-w-md mx-auto space-y-4 animate-fadeIn">
          <div className="pt-2 text-center">
            <VagouOfficialLogo size="xl" variant="full" className="h-10 sm:h-12 w-auto object-contain mx-auto" />
          </div>

          <TriadeUserLoginForm
            showHeader={false}
            variant="flat"
            title="Acessar Espaço"
            submitButtonText="Acessar e Continuar para o Salão"
            onSuccess={handleUserLoginSuccess}
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
              Ambiente Soberano
            </span>
          </div>
        </div>
      )}

      {/* SUB-ROTINA TRANSITÓRIA (OPÇÃO NÃO): CADASTRO DE USUÁRIO E RETORNO AO SALÃO */}
      {flowStep === 'user_check' && userAuthSubFlow === 'register' && (
        <div className="p-4 sm:p-6 max-w-xl mx-auto space-y-4 animate-fadeIn">
          <div className="pt-2 text-center">
            <VagouOfficialLogo size="xl" variant="full" className="h-10 sm:h-12 w-auto object-contain mx-auto" />
          </div>

          <TriadeUserRegisterForm
            showHeader={false}
            variant="flat"
            title="Cadastro do Proprietário"
            subtitle="Crie sua conta para vincular ao novo estabelecimento"
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
              setIsAuthenticatedOwner(true);

              setOwnerAddressData({
                cep: userData.address.cep,
                street: userData.address.street,
                number: userData.address.number,
                complement: userData.address.complement || '',
                neighborhood: userData.address.neighborhood,
                city: userData.address.city,
                state: userData.address.state,
              });

              setFeedback({
                type: 'success',
                message: `Novo proprietário "${newUser.name}" (${newUser.username}) cadastrado com sucesso! Preenchendo dados do estabelecimento.`,
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
              Ambiente Soberano
            </span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ETAPAS DO ESTABELECIMENTO COMERCIAL (SEM DUPLA BARRA INTERNA)             */}
      {/* ========================================================================= */}
      {flowStep === 'establishment_details' && (
        <div className="animate-fadeIn">
          {/* Logo Oficial do VagouApp + Selo de Titular Vinculado */}
          <div className="pt-5 pb-1 text-center space-y-2">
            <VagouOfficialLogo size="xl" variant="full" className="h-10 sm:h-12 w-auto object-contain mx-auto" />
            {isAuthenticatedOwner && selectedUser && (
              <div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <UserCheck className="w-3 h-3 text-emerald-400" />
                  <span>Titular vinculado: {selectedUser.username.replace(/^@+/, '')}</span>
                </span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6">
            {feedback && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 animate-fadeIn ${
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

            {/* ETAPA 1 DO SALÃO: DADOS COMERCIAIS & FISCAIS */}
            {activeSection === 'commercial' && (
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3.5">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                      Dados Comerciais & Fiscais
                    </h3>
                  </div>
                  <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Múltiplas cadeiras & parceiros avulsos liberados ({documentType})</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Documento Fiscal ({documentType === 'CPF' ? 'Salão no CPF' : 'Empresa CNPJ'})
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={documentType}
                        onChange={(e) => handleDocumentTypeSwitch(e.target.value as 'CNPJ' | 'CPF')}
                        className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-xs font-bold text-white outline-none focus:border-emerald-500 transition cursor-pointer shrink-0"
                      >
                        <option value="CNPJ">CNPJ</option>
                        <option value="CPF">CPF</option>
                      </select>
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={documentNumber}
                          onChange={(e) => handleDocumentNumberChange(e.target.value)}
                          placeholder={
                            documentType === 'CNPJ' ? '00.000.000/0001-00' : '000.000.000-00'
                          }
                          maxLength={documentType === 'CNPJ' ? 18 : 14}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition font-mono"
                        />
                        {isSearchingCnpj && documentType === 'CNPJ' && (
                          <Loader2 className="w-4 h-4 text-emerald-400 animate-spin absolute right-3 top-2.5" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nome Fantasia <span className="text-emerald-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={tradeName}
                      onChange={(e) => handleTradeNameChange(e.target.value)}
                      placeholder="Ex: Lucas Barber"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition"
                      required
                    />
                  </div>

                  {documentType === 'CNPJ' && (
                    <div className="animate-fadeIn">
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Razão Social
                      </label>
                      <input
                        type="text"
                        value={legalName}
                        onChange={(e) => setLegalName(e.target.value)}
                        placeholder="Ex: Lucas Barber Ltda"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Chave PIX
                    </label>
                    <input
                      type="text"
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                      placeholder="Ex: pix@lucasbarber.com.br"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Categoria do Estabelecimento
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 transition cursor-pointer"
                    >
                      <option value="Barbearia">Barbearia</option>
                      <option value="Salão de Beleza">Salão de Beleza</option>
                      <option value="Esmalteria">Esmalteria</option>
                      <option value="Estética">Estética</option>
                      <option value="Spa">Spa</option>
                      <option value="Sobrancelhas & Cílios">Sobrancelhas & Cílios</option>
                    </select>
                  </div>

                  <div className={documentType === 'CPF' ? 'sm:col-span-2' : ''}>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Slug Único de Rota (Wildcard)
                    </label>
                    <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm focus-within:border-emerald-500 transition">
                      <input
                        type="text"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        placeholder="nomedonegocio"
                        className="w-full bg-transparent text-white font-mono text-sm outline-none"
                        required
                      />
                      <span className="text-slate-500 text-xs ml-1 font-mono shrink-0">.vagouapp.com</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* ETAPA 3 DO SALÃO: ENDEREÇO EM 2 MODAIS SEQUENCIAIS + DADOS COMPLETOS      */}
            {/* ========================================================================= */}
            {activeSection === 'address' && (
              <div className="space-y-4 animate-fadeIn">
                {/* MODAL 1 — PERGUNTA: "O salão fica no mesmo endereço do proprietário?" */}
                {addressSubPhase === 'same_address_modal' && (
                  <div className="max-w-lg mx-auto bg-slate-950/80 border border-slate-800 rounded-2xl p-6 space-y-5 text-center animate-fadeIn">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                      <Home className="w-6 h-6 text-emerald-400" />
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-base sm:text-lg font-extrabold text-white">
                        O salão fica no mesmo endereço do proprietário?
                      </h3>
                      <p className="text-xs text-slate-400">
                        {ownerAddressData.street || 'Avenida Paulista'}, {ownerAddressData.number || '1578'}{' '}
                        {ownerAddressData.complement ? `(${ownerAddressData.complement})` : ''} —{' '}
                        {ownerAddressData.neighborhood || 'Bela Vista'}, {ownerAddressData.city || 'São Paulo'}/
                        {ownerAddressData.state || 'SP'} (CEP: {ownerAddressData.cep || '01310-100'})
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* SIM -> Copia endereço do proprietário e avança direto para a próxima fase (Identidade Visual) */}
                      <button
                        type="button"
                        onClick={() => applyOwnerAddressToSalon()}
                        className="p-4 rounded-2xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold transition cursor-pointer flex items-center justify-between shadow-lg shadow-emerald-500/20 active:scale-95"
                      >
                        <span className="text-sm font-black text-white">SIM</span>
                        <Check className="w-5 h-5 text-white shrink-0" />
                      </button>

                      {/* NÃO -> Abre o Modal 2 (CEP com lógica idêntica ao cadastro de usuário) */}
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
                        className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white font-bold transition cursor-pointer flex items-center justify-between active:scale-95"
                      >
                        <span className="text-sm font-black">NÃO</span>
                        <MapPin className="w-5 h-5 text-emerald-400 shrink-0" />
                      </button>
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-slate-800/80 text-xs">
                      <button
                        type="button"
                        onClick={() => updatePhase('commercial')}
                        className="text-slate-400 hover:text-white font-semibold flex items-center gap-1 cursor-pointer transition"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Voltar</span>
                      </button>

                      {street && (
                        <button
                          type="button"
                          onClick={() => setAddressSubPhase('address_form')}
                          className="text-emerald-400 hover:underline font-semibold cursor-pointer"
                        >
                          Ver endereço preenchido →
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* MODAL 2 — BUSCA DE CEP ISOLADA (Lógica idêntica à do Cadastro de Usuário) */}
                {addressSubPhase === 'cep_modal' && (
                  <div className="max-w-lg mx-auto space-y-4 animate-fadeIn">
                    <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300">
                            CEP do Estabelecimento <span className="text-emerald-400">*</span>
                          </label>
                          <p className="text-[11px] text-slate-500 pt-0.5">
                            Digite os 8 números do CEP para preenchimento automático
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleSkipSalonCep}
                          className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer shrink-0"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Não sei meu CEP</span>
                        </button>
                      </div>

                      <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl px-4 py-3.5 focus-within:border-emerald-500 transition">
                        <MapPin className="w-5 h-5 text-emerald-400 mr-3 shrink-0" />
                        <input
                          type="text"
                          value={cep}
                          onChange={(e) => handleCepChange(e.target.value)}
                          placeholder="12345-678"
                          maxLength={9}
                          className="w-full bg-transparent text-base sm:text-lg font-mono text-white placeholder-slate-600 outline-none"
                          autoFocus
                        />
                        {isSearchingCep ? (
                          <Loader2 className="w-5 h-5 text-emerald-400 animate-spin ml-2 shrink-0" />
                        ) : (
                          <Search className="w-5 h-5 text-slate-500 ml-2 shrink-0" />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setAddressSubPhase('same_address_modal')}
                        className="py-3.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm transition cursor-pointer flex items-center gap-1.5"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Voltar</span>
                      </button>
                      <button
                        type="button"
                        disabled={isSearchingCep}
                        onClick={handleNextFromSalonCep}
                        className="flex-1 py-3.5 px-5 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
                      >
                        {isSearchingCep ? (
                          <Loader2 className="w-4 h-4 text-white animate-spin" />
                        ) : (
                          <>
                            <span className="text-white font-bold">Avançar</span>
                            <ArrowRight className="w-4 h-4 text-white" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* TELA DE DADOS DO ENDEREÇO COMPLETADOS (Mesmo padrão do Cadastro de Usuário) */}
                {addressSubPhase === 'address_form' && (
                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4 animate-fadeIn">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-400" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                          Dados do Endereço do Estabelecimento
                        </h3>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <button
                          type="button"
                          onClick={() => setAddressSubPhase('cep_modal')}
                          className="text-slate-400 hover:text-emerald-400 cursor-pointer transition font-medium"
                        >
                          {cep ? 'Voltar ao CEP isolado' : 'Digitar apenas CEP'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddressSubPhase('same_address_modal')}
                          className="text-emerald-400 hover:underline cursor-pointer font-semibold"
                        >
                          Mesmo endereço do proprietário?
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* 1. Rua / Logradouro * (Amplo) e 2. Número * (Compacto) */}
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-slate-400 mb-1">
                            Rua / Logradouro <span className="text-emerald-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={street}
                            onChange={(e) => setStreet(e.target.value)}
                            onBlur={searchSalonCepByAddress}
                            placeholder="Ex: Rua Bela Cintra"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500"
                            required
                          />
                        </div>

                        <div className="w-full sm:w-28 shrink-0">
                          <label className="block text-xs font-semibold text-slate-400 mb-1">
                            Número <span className="text-emerald-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={number}
                            onChange={(e) => setNumber(e.target.value)}
                            placeholder="100"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 ring-1 ring-emerald-500/30 text-center sm:text-left"
                            required
                            autoFocus={!!street}
                          />
                        </div>
                      </div>

                      {/* 3. Complemento (Compacto) e 4. Bairro * (Proporcional) */}
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="w-full sm:w-40 shrink-0">
                          <label className="block text-xs font-semibold text-slate-400 mb-1">
                            Complemento
                          </label>
                          <input
                            type="text"
                            value={complement}
                            onChange={(e) => setComplement(e.target.value)}
                            placeholder="Loja 2"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-slate-400 mb-1">
                            Bairro <span className="text-emerald-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={neighborhood}
                            onChange={(e) => setNeighborhood(e.target.value)}
                            onBlur={searchSalonCepByAddress}
                            placeholder="Consolação"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500"
                            required
                          />
                        </div>
                      </div>

                      {/* 5. Cidade * (Ampla), 6. UF * (Compacta: 2 letras) e 7. CEP * (Compacto: 8 caracteres) */}
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 min-w-[160px]">
                          <label className="block text-xs font-semibold text-slate-400 mb-1">
                            Cidade <span className="text-emerald-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            onBlur={searchSalonCepByAddress}
                            placeholder="São Paulo"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500"
                            required
                          />
                        </div>

                        <div className="w-full sm:w-20 shrink-0">
                          <label className="block text-xs font-semibold text-slate-400 mb-1 text-center sm:text-left">
                            UF <span className="text-emerald-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={state}
                            maxLength={2}
                            onChange={(e) => setState(e.target.value.toUpperCase())}
                            onBlur={searchSalonCepByAddress}
                            placeholder="SP"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 uppercase font-mono text-center"
                            required
                          />
                        </div>

                        <div className="w-full sm:w-36 shrink-0">
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-semibold text-slate-400">
                              CEP <span className="text-emerald-400">*</span>
                            </label>
                            {isSearchingCepByAddress && (
                              <Loader2 className="w-3 h-3 text-emerald-400 animate-spin" />
                            )}
                          </div>
                          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus-within:border-emerald-500 transition">
                            <MapPin className="w-4 h-4 text-emerald-400 mr-1.5 shrink-0" />
                            <input
                              type="text"
                              value={cep}
                              onChange={(e) => handleCepChange(e.target.value)}
                              placeholder="12345-678"
                              maxLength={9}
                              className="w-full bg-transparent text-xs sm:text-sm font-mono text-white placeholder-slate-600 outline-none"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setAddressSubPhase('cep_modal')}
                        className="py-3.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition flex items-center gap-2 cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Voltar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => updatePhase('visual')}
                        className="flex-1 sm:flex-initial py-3.5 px-6 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95"
                      >
                        <span className="text-white">Avançar para Identidade Visual</span>
                        <ArrowRight className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ETAPA 4 DO SALÃO: IDENTIDADE VISUAL & BRANDING (Logotipo, Favicon, Cor e Slogan) */}
            {activeSection === 'visual' && (
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-5 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                      Identidade Visual do Estabelecimento
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Marca, ícone do app (PWA) e assinatura visual
                  </span>
                </div>

                {/* 1. LOGOTIPO & 2. FAVICON (ÍCONE DO APP / NAVEGADOR) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Pilar 1: Logotipo Principal */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-200">
                        1. Logotipo da Marca
                      </label>
                      {logoUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setLogoUrl('');
                            if (useLogoAsFavicon) setFaviconUrl('');
                          }}
                          className="text-[11px] text-rose-400 hover:underline cursor-pointer"
                        >
                          Remover
                        </button>
                      )}
                    </div>

                    <label className="flex items-center gap-3.5 p-3.5 rounded-xl bg-slate-900 border border-dashed border-slate-700 hover:border-emerald-500/60 transition cursor-pointer group">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'logo')}
                        className="hidden"
                      />
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 overflow-hidden border border-slate-700"
                        style={{ backgroundColor: logoUrl ? '#0f172a' : primaryColor }}
                      >
                        {logoUrl ? (
                          <img
                            src={logoUrl}
                            alt="Logotipo"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <span className="text-base font-black text-white uppercase">
                            {(tradeName || 'VA').slice(0, 2)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-white group-hover:text-emerald-400 transition flex items-center gap-1.5">
                          <Upload className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{logoUrl ? 'Trocar Logotipo' : 'Enviar Logotipo'}</span>
                        </span>
                        <span className="text-[11px] text-slate-400 block pt-0.5">
                          Toque para escolher da galeria ou computador (PNG, JPG, SVG)
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* Pilar 2: Favicon / Ícone do App na Galeria do Celular e Abas do Navegador */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="block text-xs font-semibold text-slate-200">
                        2. Favicon / Ícone do App
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
                        className={`text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition ${
                          useLogoAsFavicon ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Usar mesmo do logotipo</span>
                      </button>
                    </div>

                    <label className="flex items-center gap-3.5 p-3.5 rounded-xl bg-slate-900 border border-dashed border-slate-700 hover:border-emerald-500/60 transition cursor-pointer group">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'favicon')}
                        className="hidden"
                      />
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden border border-slate-700 shadow-md"
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
                          <span className="text-base font-black text-white uppercase">
                            {(tradeName || 'V').slice(0, 1)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-white group-hover:text-emerald-400 transition flex items-center gap-1.5">
                          <Smartphone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>
                            {(useLogoAsFavicon ? logoUrl : faviconUrl)
                              ? 'Trocar Ícone 1:1'
                              : 'Enviar Favicon (1:1)'}
                          </span>
                        </span>
                        <span className="text-[11px] text-slate-400 block pt-0.5">
                          Ícone na galeria de apps do celular e na aba do navegador
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* 3. COR DA MARCA (RELACIONADA AO LOGOTIPO) & 4. SLOGAN */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* Pilar 3: Cor em relação ao Logotipo */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-200">
                      3. Cor Principal (Harmonia com o Logotipo)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-10 h-10 rounded-xl border border-slate-700 bg-transparent cursor-pointer shrink-0"
                      />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-28 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white font-mono outline-none focus:border-emerald-500 transition uppercase"
                      />
                      {/* Paletas Rápidas de 1 Toque */}
                      <div className="flex items-center gap-1.5 pl-1">
                        {[
                          { hex: '#20C933', label: 'Verde Vagou' },
                          { hex: '#D97706', label: 'Dourado Barber' },
                          { hex: '#E11D48', label: 'Rose Estética' },
                          { hex: '#2563EB', label: 'Azul Royal' },
                          { hex: '#7C3AED', label: 'Roxo Studio' },
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

                  {/* Pilar 4: Slogan Curto da Marca */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        <span>4. Slogan do Estabelecimento</span>
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
                      placeholder="Ex: Estilo, navalha e tradição no seu tempo."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                </div>

                {/* 5. ESTILO DA FONTE DA MARCA (OPÇÃO B — PERSONALIDADE CONTROLADA) */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="block text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-emerald-400" />
                      <span>5. Fonte de Destaque da Marca (Nome & Cabeçalho)</span>
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Interface e agenda permanecem em <strong className="text-slate-200">Poppins</strong> para leitura rápida
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {BRAND_FONT_PRESETS.map((preset) => {
                      const isSelected = brandFont === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setBrandFont(preset.id)}
                          className={`p-3 rounded-xl text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                            isSelected
                              ? 'bg-[#20C933] text-white shadow-md shadow-emerald-500/15'
                              : 'bg-slate-900 hover:bg-slate-800/90 text-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider truncate ${
                                isSelected ? 'text-white' : 'text-emerald-400'
                              }`}
                            >
                              {preset.name}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                          </div>

                          <p
                            style={{ fontFamily: preset.fontFamily }}
                            className={`text-sm sm:text-base font-bold truncate ${
                              isSelected ? 'text-white' : 'text-white'
                            }`}
                          >
                            {tradeName || 'Meu Salão'}
                          </p>

                          <span
                            className={`text-[10px] truncate ${
                              isSelected ? 'text-white/90' : 'text-slate-400'
                            }`}
                          >
                            {preset.id} · {preset.segment}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* SIMULADOR VISUAL EM TEMPO REAL (ABA DO NAVEGADOR + ÍCONE DO APP NO CELULAR) */}
                <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Preview 1: Aba do Navegador */}
                  <div className="flex items-center gap-2.5 bg-slate-900/90 px-3.5 py-2.5 rounded-xl">
                    <Globe className="w-4 h-4 text-slate-500 shrink-0" />
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center shrink-0 overflow-hidden"
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
                        <span className="text-[10px] font-black text-white uppercase">
                          {(tradeName || 'V').slice(0, 1)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-slate-500 block">Aba do Navegador</span>
                      <p className="text-xs font-semibold text-white truncate">
                        {tradeName || 'Meu Salão'} {slogan ? `— ${slogan}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Preview 2: Galeria de Apps do Celular (PWA) & Cabeçalho com Fonte da Marca */}
                  <div className="flex items-center gap-3 bg-slate-900/90 px-3.5 py-2.5 rounded-xl">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden shadow-sm"
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
                          className="text-xs font-black text-white uppercase"
                        >
                          {(tradeName || 'VA').slice(0, 2)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-slate-500 block">
                        App no Celular & Cabeçalho ({brandFont})
                      </span>
                      <p
                        style={{ fontFamily: activeBrandFontFamily }}
                        className="text-sm font-bold text-white truncate"
                      >
                        {tradeName || 'Meu Salão'}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {slogan || 'Seu slogan aparecerá aqui'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* RODAPÉ FIXO DE NAVEGAÇÃO PROGRESSIVA (Comercial & Visual) */}
            {activeSection !== 'address' && (
              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (activeSection === 'visual') updatePhase('address');
                    else updatePhase('user_check');
                  }}
                  className="py-3.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition flex items-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar</span>
                </button>

                {activeSection === 'commercial' && (
                  <button
                    type="button"
                    onClick={() => updatePhase('address')}
                    className="flex-1 sm:flex-initial py-3.5 px-6 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95"
                  >
                    <span className="text-white">Avançar para Endereço</span>
                    <ArrowRight className="w-4 h-4 text-white" />
                  </button>
                )}

                {activeSection === 'visual' && (
                  <button
                    type="button"
                    onClick={() => updatePhase('review')}
                    className="flex-1 sm:flex-initial py-3.5 px-6 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95"
                  >
                    <FileText className="w-4 h-4 text-white" />
                    <span className="text-white">Revisar Ficha Completa</span>
                    <ArrowRight className="w-4 h-4 text-white" />
                  </button>
                )}
              </div>
            )}
          </form>

          {/* ========================================================================= */}
          {/* 📋 MODAL FINAL DE CONFIRMAÇÃO: FICHA COMPLETA DO ESTABELECIMENTO         */}
          {/* ========================================================================= */}
          {isReviewModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
              <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                {/* Cabeçalho do Modal de Revisão */}
                <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-white">
                        Ficha Completa — Confirmação de Cadastro
                      </h3>
                      <p className="text-xs text-slate-400">
                        Confira os dados preenchidos antes de criar o estabelecimento
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => updatePhase(activeSection)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Corpo Rolável da Ficha Completa (Layout Plano sem Box-dentro-de-Box) */}
                <div className="p-4 sm:p-6 overflow-y-auto space-y-5 divide-y divide-slate-800/80 text-xs">
                  {/* Resumo 1: Titular Vinculado */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 text-[11px]">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Titular / Proprietário Vinculado</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => updatePhase('user_check')}
                        className="text-[11px] font-semibold text-slate-400 hover:text-emerald-400 flex items-center gap-1 cursor-pointer transition"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Trocar Usuário</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div>
                        <span className="text-slate-500 block text-[11px]">Nome</span>
                        <strong className="text-white font-semibold">{ownerName || '—'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">WhatsApp</span>
                        <strong className="text-white font-semibold">{ownerWhatsapp || '—'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">E-mail</span>
                        <strong className="text-white font-semibold">{ownerEmail || '—'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Resumo 2: Dados Comerciais & Fiscais */}
                  <div className="pt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 text-[11px]">
                        <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>2. Dados Comerciais & Fiscais</span>
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div>
                        <span className="text-slate-500 block text-[11px]">Nome Fantasia</span>
                        <strong className="text-white font-semibold">{tradeName || '—'}</strong>
                      </div>
                      {documentType === 'CNPJ' && (
                        <div>
                          <span className="text-slate-500 block text-[11px]">Razão Social</span>
                          <strong className="text-white font-semibold">{legalName || '—'}</strong>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-500 block text-[11px]">{documentType}</span>
                        <strong className="text-white font-semibold">{documentNumber || '—'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Categoria</span>
                        <strong className="text-white font-semibold">{category || '—'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Chave PIX</span>
                        <strong className="text-white font-semibold">{pixKey || '—'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Rota Oficial</span>
                        <strong className="text-emerald-400 font-mono">{slug}.vagouapp.com</strong>
                      </div>
                    </div>
                  </div>

                  {/* Resumo 3: Endereço & Localização */}
                  <div className="pt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 text-[11px]">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                        <span>
                          3. Endereço & Localização{isSameAddressChosen ? ' (Mesmo do Proprietário)' : ''}
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

                  {/* Resumo 4: Identidade Visual & Branding */}
                  <div className="pt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 text-[11px]">
                        <Palette className="w-3.5 h-3.5 text-emerald-400" />
                        <span>4. Identidade Visual & Branding</span>
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
          onStepChange?.('visual');
          onClose?.();
        }}
        data={{
          tradeName: tradeName || 'Meu Espaço',
          slug: slug || 'meu-espaco',
          slogan,
          logoUrl,
          primaryColor,
          ownerName,
        }}
      />
    </div>
  );
};
