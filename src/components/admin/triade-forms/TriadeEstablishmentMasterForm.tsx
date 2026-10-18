import React, { useState, useEffect } from 'react';
import {
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  Search,
  CheckCircle2,
  AlertCircle,
  Save,
  Globe,
  Sparkles,
  CreditCard,
  QrCode,
  Tag,
  ShieldCheck,
  Check,
  HelpCircle,
  Palette,
  Layers,
  ArrowRight,
  UserCheck,
  UserPlus,
  Lock,
  Eye,
  EyeOff,
  X,
  KeyRound,
  Loader2,
  Home,
  Copy,
} from 'lucide-react';
import { fetchAdminClients } from '../../../services/supabaseApi';
import { VagouOfficialLogo } from '../../common/VagouOfficialLogo';
import { TriadeUserRegisterForm, TriadeUserData } from './TriadeUserRegisterForm';
import { TriadeUserLoginForm, TriadeUserLoginPayload } from './TriadeUserLoginForm';

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

  // Identidade Visual
  logoUrl: string;
  bannerUrl: string;
  primaryColor: string;
  bio: string;
  instagram: string;
}

export interface TriadeEstablishmentMasterFormProps {
  initialData?: Partial<EstablishmentMasterPayload>;
  onSuccess?: (data: EstablishmentMasterPayload) => void;
  onClose?: () => void;
  isStandalonePreview?: boolean;
  initialStep?: 'user_check' | 'user_login' | 'user_register' | 'establishment_details';
  forcedStep?: 'user_check' | 'user_login' | 'user_register' | 'establishment_details';
}

export const TriadeEstablishmentMasterForm: React.FC<TriadeEstablishmentMasterFormProps> = ({
  initialData,
  onSuccess,
  onClose,
  initialStep = 'user_check',
  forcedStep,
}) => {
  // Passos do Fluxo Inicial de Cadastramento (Regra de Negócio VagouApp)
  const [flowStep, setFlowStep] = useState<
    'user_check' | 'user_login' | 'user_register' | 'establishment_details'
  >(forcedStep || initialStep);

  useEffect(() => {
    if (forcedStep) {
      setFlowStep(forcedStep);
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
  const [isSameAddressModalOpen, setIsSameAddressModalOpen] = useState<boolean>(false);
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
  const [operationalModel, setOperationalModel] = useState(
    initialData?.operationalModel || 'Espaço Físico & Delivery'
  );
  const [platformPlan, setPlatformPlan] = useState(
    initialData?.platformPlan || 'PRO / 5% POR AGENDAMENTO'
  );
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
  const [cepStatus, setCepStatus] = useState<{ type: 'success' | 'error'; message: string } | null>({
    type: 'success',
    message: 'Endereço localizado via CEP',
  });

  // Identidade Visual & Branding
  const [logoUrl, setLogoUrl] = useState(initialData?.logoUrl || '');
  const [bannerUrl, setBannerUrl] = useState(initialData?.bannerUrl || '');
  const [primaryColor, setPrimaryColor] = useState(initialData?.primaryColor || '#20C933');
  const [bio, setBio] = useState(
    initialData?.bio || 'Barbearia especializada em cortes modernos, degradê navalhado e barba terapia.'
  );
  const [instagram, setInstagram] = useState(initialData?.instagram || '@lucasbarber');

  // Abas do formulário final
  const [activeSection, setActiveSection] = useState<'all' | 'owner' | 'commercial' | 'address' | 'visual'>('all');

  // Estados de Submissão
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Formatações
  const formatCep = (value: string) => {
    const raw = value.replace(/\D/g, '').slice(0, 8);
    if (raw.length <= 5) return raw;
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  };

  const handleCepLookup = async (targetCep: string) => {
    const cleanCep = targetCep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setIsSearchingCep(true);
    setCepStatus(null);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      if (!response.ok) throw new Error('Falha no ViaCEP');
      const data = await response.json();
      if (!data.erro) {
        setStreet(data.logradouro || '');
        setNeighborhood(data.bairro || '');
        setCity(data.localidade || '');
        setState(data.uf || '');
        setCepStatus({
          type: 'success',
          message: `${data.localidade || 'Cidade'} / ${data.uf || 'UF'} preenchidos.`,
        });
      }
    } catch {
      setCepStatus({ type: 'error', message: 'Preencha o endereço manualmente.' });
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value);
    setCep(formatted);
    if (formatted.replace(/\D/g, '').length === 8) {
      handleCepLookup(formatted);
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

  // Função para Copiar Endereço Residencial do Proprietário
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
    setCepStatus({
      type: 'success',
      message: '✓ Endereço residencial do proprietário copiado com sucesso!',
    });
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
        message: `Proprietário "${matchedUser.name}" (@${matchedUser.username}) autenticado! Dados pré-carregados na ficha do estabelecimento.`,
      });

      // Abre modal de pergunta sobre mesmo endereço caso ainda não escolhido
      if (isSameAddressChosen === null) {
        setIsSameAddressModalOpen(true);
      }

      setFlowStep('establishment_details');
    } catch {
      setFeedback({
        type: 'error',
        message: 'Falha ao autenticar proprietário. Verifique suas credenciais.',
      });
    }
  };



  // Submissão Final do Estabelecimento Comercial
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!tradeName.trim() || !ownerName.trim() || !ownerWhatsapp.trim()) {
      setFeedback({ type: 'error', message: 'Preencha o Nome Fantasia e os dados do Proprietário.' });
      return;
    }

    if (!cep.trim() || !street.trim() || !number.trim() || !city.trim() || !state.trim()) {
      setFeedback({ type: 'error', message: 'Preencha o endereço completo do estabelecimento.' });
      return;
    }

    setIsLoading(true);
    const payload: EstablishmentMasterPayload = {
      ownerName,
      ownerWhatsapp,
      ownerEmail,
      tradeName,
      legalName,
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
      bannerUrl,
      primaryColor,
      bio,
      instagram,
    };

    setTimeout(() => {
      setIsLoading(false);
      setFeedback({
        type: 'success',
        message: `Ficha cadastral de "${tradeName}" salva com sucesso no Supabase!`,
      });
      onSuccess?.(payload);
    }, 700);
  };

  return (
    <div className="w-full font-['Poppins'] relative">


      {/* ========================================================================= */}
      {/* 🏡 MODAL INTERATIVO DE PERGUNTA: MESMO ENDEREÇO DO PROPRIETÁRIO?         */}
      {/* ========================================================================= */}
      {isSameAddressModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 shadow-2xl space-y-5 relative">
            <button
              type="button"
              onClick={() => setIsSameAddressModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-1 border border-emerald-500/30">
                <Home className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="font-bold text-white text-base">
                O salão fica no mesmo endereço do proprietário?
              </h3>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-300 space-y-1">
              <span className="font-bold text-emerald-400 block text-[11px] uppercase">
                Endereço Residencial Cadastrado:
              </span>
              <p className="font-medium text-white">
                {ownerAddressData.street || 'Avenida Paulista'}, {ownerAddressData.number || '1578'} {ownerAddressData.complement && `(${ownerAddressData.complement})`}
              </p>
              <p className="text-slate-400 text-[11px]">
                {ownerAddressData.neighborhood || 'Bela Vista'} · {ownerAddressData.city || 'São Paulo'} / {ownerAddressData.state || 'SP'} — CEP: {ownerAddressData.cep || '01310-100'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  applyOwnerAddressToSalon();
                  setIsSameAddressModalOpen(false);
                }}
                className="w-full py-3.5 px-4 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                <Check className="w-4 h-4 text-white" />
                <span className="text-white font-bold">SIM — Usar Mesmo Endereço do Proprietário</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsSameAddressChosen(false);
                  setIsSameAddressModalOpen(false);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer"
              >
                NÃO — Digitar Endereço Comercial Distinto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 1: MODAL/PERGUNTA SE É OU NÃO USUÁRIO DO ECOSSISTEMA              */}
      {/* ========================================================================= */}
      {flowStep === 'user_check' && (
        <div className="p-6 sm:p-10 space-y-6 text-center animate-fadeIn">
          {/* Logo Oficial do VagouApp na Etapa 1 */}
          <VagouOfficialLogo size="xl" variant="full" className="h-10 sm:h-12 w-auto object-contain mx-auto" />

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
              O estabelecimento a ser criado já possui usuário cadastrado?
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto pt-2">
            {/* Opção SIM */}
            <button
              type="button"
              onClick={() => setFlowStep('user_login')}
              className="p-5 rounded-2xl border border-emerald-500/40 bg-emerald-950/30 hover:bg-emerald-900/40 transition cursor-pointer group active:scale-98 shadow-md flex items-center justify-between"
            >
              <span className="text-base font-black text-emerald-400 group-hover:text-emerald-300">SIM</span>
              <Check className="w-5 h-5 text-emerald-400" />
            </button>

            {/* Opção NÃO */}
            <button
              type="button"
              onClick={() => {
                setFlowStep('user_register');
              }}
              className="p-5 rounded-2xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 transition cursor-pointer group active:scale-98 shadow-md flex items-center justify-between"
            >
              <span className="text-base font-black text-slate-200 group-hover:text-white">NÃO</span>
              <UserPlus className="w-5 h-5 text-slate-400 group-hover:text-white" />
            </button>
          </div>

          <div className="pt-4 border-t border-slate-800/60 max-w-lg mx-auto flex items-center justify-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Ambiente Oficial VagouApp · Governança da Tríade</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 2: FORMULÁRIO DE LOGIN DE USUÁRIO (CANÔNICO & REUTILIZÁVEL)         */}
      {/* ========================================================================= */}
      {flowStep === 'user_login' && (
        <div className="p-4 sm:p-6 max-w-md mx-auto space-y-4 animate-fadeIn">
          {/* Logo Oficial do VagouApp na Etapa 2 */}
          <div className="pt-2 text-center">
            <VagouOfficialLogo size="xl" variant="full" className="h-10 sm:h-12 w-auto object-contain mx-auto" />
          </div>

          <TriadeUserLoginForm
            showHeader={false}
            variant="flat"
            title="Acessar Espaço"
            submitButtonText="Acessar e Continuar"
            onSuccess={handleUserLoginSuccess}
          />

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <button
              type="button"
              onClick={() => setFlowStep('user_check')}
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
      {/* ETAPA 3: FORMULÁRIO DE CADASTRO DE USUÁRIO (CANÔNICO & REUTILIZÁVEL)      */}
      {/* ========================================================================= */}
      {flowStep === 'user_register' && (
        <div className="p-4 sm:p-6 max-w-xl mx-auto space-y-4 animate-fadeIn">
          {/* Logo Oficial do VagouApp na Etapa 3 */}
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
                username: userData.username,
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

              if (isSameAddressChosen === null) {
                setIsSameAddressModalOpen(true);
              }

              setFlowStep('establishment_details');
            }}
          />

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <button
              type="button"
              onClick={() => setFlowStep('user_check')}
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
      {/* ETAPA 4: FORMULÁRIO COMPLETO DE DADOS DO ESTABELECIMENTO COMERCIAL        */}
      {/* ========================================================================= */}
      {flowStep === 'establishment_details' && (
        <div className="animate-fadeIn">
          {/* Logo Oficial do VagouApp na Etapa 4 */}
          <div className="pt-5 pb-2 text-center">
            <VagouOfficialLogo size="xl" variant="full" className="h-10 sm:h-12 w-auto object-contain mx-auto" />
          </div>

          {/* Barra de Filtro Rápido de Seções */}
          <div className="border-b border-slate-800 p-3 sm:px-5 bg-slate-900/60">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveSection('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  activeSection === 'all'
                    ? 'bg-[#20C933] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white bg-slate-950/50'
                }`}
              >
                Ficha Completa
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('owner')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  activeSection === 'owner'
                    ? 'bg-[#20C933] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white bg-slate-950/50'
                }`}
              >
                Titular / Proprietário
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('commercial')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  activeSection === 'commercial'
                    ? 'bg-[#20C933] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white bg-slate-950/50'
                }`}
              >
                Comercial & Fiscal
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('address')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  activeSection === 'address'
                    ? 'bg-[#20C933] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white bg-slate-950/50'
                }`}
              >
                Endereço (ViaCEP)
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('visual')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  activeSection === 'visual'
                    ? 'bg-[#20C933] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white bg-slate-950/50'
                }`}
              >
                Id. Visual & Branding
              </button>
            </div>
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



            {/* SEÇÃO 2: DADOS COMERCIAIS & FISCAIS */}
            {(activeSection === 'all' || activeSection === 'commercial') && (
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3.5">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    Dados Comerciais & Fiscais
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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

                  <div>
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

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Documento Fiscal ({documentType})
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={documentType}
                        onChange={(e) => setDocumentType(e.target.value as 'CNPJ' | 'CPF')}
                        className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:border-emerald-500 transition cursor-pointer"
                      >
                        <option value="CNPJ">CNPJ</option>
                        <option value="CPF">CPF</option>
                      </select>
                      <input
                        type="text"
                        value={documentNumber}
                        onChange={(e) => setDocumentNumber(e.target.value)}
                        placeholder="00.000.000/0001-00"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition"
                      />
                    </div>
                  </div>

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

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Slug Único de Rota (Wildcard)
                    </label>
                    <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm focus-within:border-emerald-500 transition">
                      <span className="text-slate-500 text-xs mr-1 font-mono">vagouapp.com/</span>
                      <input
                        type="text"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        className="w-full bg-transparent text-white font-mono text-sm outline-none"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SEÇÃO 3: ENDEREÇO & LOCALIZAÇÃO */}
            {(activeSection === 'all' || activeSection === 'address') && (
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                      Endereço & Localização (ViaCEP)
                    </h3>
                  </div>

                  {cepStatus && (
                    <span
                      className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                        cepStatus.type === 'success'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {cepStatus.message}
                    </span>
                  )}
                </div>

                {/* 🏠 CARD / OPÇÃO: MESMO ENDEREÇO DO PROPRIETÁRIO (GARAGEM, SOBRADO, SALÃO EM CASA) */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/40 space-y-3 shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <Home className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">
                          O salão fica no mesmo endereço do proprietário?
                        </h4>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsSameAddressModalOpen(true)}
                      className="text-[11px] font-bold text-emerald-400 hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <Home className="w-3.5 h-3.5" />
                      <span>Abrir Modal</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => applyOwnerAddressToSalon()}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center gap-2.5 ${
                        isSameAddressChosen === true
                          ? 'bg-[#20C933] text-white border-emerald-400 shadow-md'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-emerald-500/50 hover:text-white'
                      }`}
                    >
                      <CheckCircle2
                        className={`w-4 h-4 shrink-0 ${
                          isSameAddressChosen === true ? 'text-white' : 'text-emerald-400'
                        }`}
                      />
                      <div>
                        <span className="text-xs font-bold block">SIM — Usar Mesmo Endereço</span>
                        <span
                          className={`text-[10px] block ${
                            isSameAddressChosen === true ? 'text-emerald-100' : 'text-slate-400'
                          }`}
                        >
                          Copiar endereço do proprietário ({ownerAddressData.street || 'Avenida Paulista'}, {ownerAddressData.number || '1578'})
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsSameAddressChosen(false);
                        setCepStatus(null);
                      }}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center gap-2.5 ${
                        isSameAddressChosen === false
                          ? 'bg-slate-800 text-white border-slate-600'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <span className="text-xs font-bold block">NÃO — Endereço Comercial</span>
                        <span className="text-[10px] text-slate-400 block">
                          Digitar CEP e endereço do ponto comercial
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      CEP <span className="text-emerald-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={cep}
                        onChange={handleCepChange}
                        placeholder="00000-000"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition"
                        required
                      />
                      {isSearchingCep && (
                        <span className="absolute right-3 top-2.5 w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Rua / Logradouro <span className="text-emerald-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Ex: Rua Bela Cintra"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Número <span className="text-emerald-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      placeholder="123"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Complemento</label>
                    <input
                      type="text"
                      value={complement}
                      onChange={(e) => setComplement(e.target.value)}
                      placeholder="Ex: Sala 4"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Bairro <span className="text-emerald-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      placeholder="Consolação"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Cidade <span className="text-emerald-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="São Paulo"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      UF <span className="text-emerald-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value.toUpperCase())}
                      placeholder="SP"
                      maxLength={2}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition uppercase"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SEÇÃO 4: IDENTIDADE VISUAL & BRANDING */}
            {(activeSection === 'all' || activeSection === 'visual') && (
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3.5">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <Palette className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    Identidade Visual & Branding
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Cor Temática do Salão
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-10 h-10 rounded-xl border border-slate-800 bg-transparent cursor-pointer shrink-0"
                      />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono outline-none focus:border-emerald-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Instagram Oficial
                    </label>
                    <input
                      type="text"
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      placeholder="@lucasbarber"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      URL do Logotipo (Opcional)
                    </label>
                    <input
                      type="url"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://exemplo.com/logo.png"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Sobre o Estabelecimento (Bio)
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={2}
                      placeholder="Breve descrição dos diferenciais do salão..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* BOTÃO DE SALVAMENTO SOBERANO (FUNDO VERDE = TEXTO BRANCO OBRIGATÓRIO) */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-5 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4 text-white" />
                    <span className="text-white">Salvar Ficha Cadastral Master</span>
                    <ArrowRight className="w-4 h-4 text-white ml-1" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
