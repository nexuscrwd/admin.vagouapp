import React, { useState, useEffect } from 'react';
import {
  User,
  Building2,
  Lock,
  Mail,
  Phone,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Globe,
  MapPin,
  Search,
  Users,
  Plus,
  Trash2,
  Home,
  Briefcase,
  Layers,
  Baby,
  UserCheck,
  Check,
  PhoneCall,
  X,
} from 'lucide-react';
import { VagouLogo } from '../VagouLogo';
import { supabase } from '../../services/supabase';

interface DependentItem {
  id: string;
  fullName: string;
  nickname: string;
  age: string;
  gender: 'masculino' | 'feminino' | 'outro';
  relationship: 'Filho/a' | 'Pai' | 'Mãe' | 'Esposo/a' | 'Outro';
  avatarUrl: string;
}

interface UnifiedRegistrationFormProps {
  initialType?: 'client' | 'professional';
  hideTypeSelector?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

export const UnifiedRegistrationForm: React.FC<UnifiedRegistrationFormProps> = ({
  initialType = 'client',
  hideTypeSelector = false,
  onClose,
  onSuccess,
}) => {
  const [accountType, setAccountType] = useState<'client' | 'professional'>(initialType);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  useEffect(() => {
    if (initialType) {
      setAccountType(initialType);
    }
  }, [initialType]);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // STEP 1: Pessoa Física / Cidadão
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // STEP 2: Endereço Pessoal (Residência do Cidadão) & ViaCEP
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [manualAddress, setManualAddress] = useState(false);

  // STEP 3A: Dependentes (para Clientes)
  const [dependents, setDependents] = useState<DependentItem[]>([]);
  const [showAddDependent, setShowAddDependent] = useState(false);
  const [newDepName, setNewDepName] = useState('');
  const [newDepNick, setNewDepNick] = useState('');
  const [newDepAge, setNewDepAge] = useState('');
  const [newDepGender, setNewDepGender] = useState<'masculino' | 'feminino' | 'outro'>('masculino');
  const [newDepRel, setNewDepRel] = useState<'Filho/a' | 'Pai' | 'Mãe' | 'Esposo/a' | 'Outro'>('Filho/a');

  // STEP 3B: Estabelecimento (para Profissionais)
  const [tradeName, setTradeName] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('barbearia');
  const [attendanceType, setAttendanceType] = useState<'home_only' | 'hybrid' | 'salon_only'>('salon_only');
  const [targetGender, setTargetGender] = useState<'male' | 'female' | 'unisex'>('unisex');
  const [targetAgeGroup, setTargetAgeGroup] = useState<'adults' | 'kids' | 'both'>('both');

  // DEDICATED SALON ADDRESS & CONTACTS (Se for diferente da moradia/pessoal)
  const [sameAsPersonalAddress, setSameAsPersonalAddress] = useState(true);
  const [salonCep, setSalonCep] = useState('');
  const [salonStreet, setSalonStreet] = useState('');
  const [salonNumber, setSalonNumber] = useState('');
  const [salonComplement, setSalonComplement] = useState('');
  const [salonNeighborhood, setSalonNeighborhood] = useState('');
  const [salonCity, setSalonCity] = useState('');
  const [salonState, setSalonState] = useState('');
  const [isLoadingSalonCep, setIsLoadingSalonCep] = useState(false);

  const [useSamePhone, setUseSamePhone] = useState(false);
  const [useSameEmail, setUseSameEmail] = useState(false);
  const [salonPhoneWhatsapp, setSalonPhoneWhatsapp] = useState('');
  const [salonPhoneLandline, setSalonPhoneLandline] = useState('');
  const [salonEmail, setSalonEmail] = useState('');

  // Config & Status
  const [redirectUrl, setRedirectUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successData, setSuccessData] = useState<{ message: string; targetRedirect: string } | null>(null);
  const [isEmbedded, setIsEmbedded] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('embed') === 'true' || window.self !== window.top;
    }
    return false;
  });

  // Parse URL search params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get('embed') === 'true' || window.self !== window.top) {
      setIsEmbedded(true);
      document.documentElement.classList.add('bg-transparent');
      document.body.classList.remove('bg-slate-950');
      document.body.classList.add('bg-transparent');
    }

    const modeParam = params.get('mode');
    if (modeParam === 'cadastro' || modeParam === 'onboarding' || modeParam === 'register') {
      setIsLoginMode(false);
    } else {
      setIsLoginMode(true);
    }

    const typeParam = params.get('type');
    if (typeParam === 'professional' || typeParam === 'pro' || typeParam === 'salao') {
      setAccountType('professional');
    } else if (typeParam === 'client' || typeParam === 'usuario') {
      setAccountType('client');
    }

    const slugParam = params.get('slug') || params.get('subdomain') || params.get('origem');
    if (slugParam) {
      const clean = slugParam.toLowerCase().replace(/[^a-z0-9-]/g, '');
      setSlug(clean);
      if (!tradeName) {
        setTradeName(clean.charAt(0).toUpperCase() + clean.slice(1));
      }
    }

    const redirectParam = params.get('redirect') || params.get('redirect_url');
    if (redirectParam) {
      setRedirectUrl(redirectParam);
    }

    const emailParam = params.get('email');
    if (emailParam) setEmail(emailParam);

    const nameParam = params.get('name');
    if (nameParam) setName(nameParam);
  }, []);

  // Máscaras de entrada
  const handlePhoneChange = (val: string, setter: (v: string) => void) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    let formatted = digits;
    if (digits.length > 2) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }
    if (digits.length > 7) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    setter(formatted);
  };

  const handleLandlineChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 10);
    let formatted = digits;
    if (digits.length > 2) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }
    if (digits.length > 6) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    setSalonPhoneLandline(formatted);
  };

  const handleCpfChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    let formatted = digits;
    if (digits.length > 3) {
      formatted = `${digits.slice(0, 3)}.${digits.slice(3)}`;
    }
    if (digits.length > 6) {
      formatted = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    }
    if (digits.length > 9) {
      formatted = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    }
    setCpf(formatted);
  };

  // Máscara e Busca do ViaCEP para Residência Pessoal
  const handleCepChange = async (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length > 5) {
      formatted = `${digits.slice(0, 5)}-${digits.slice(5)}`;
    }
    setCep(formatted);

    if (digits.length === 8) {
      setIsLoadingCep(true);
      setErrorMessage('');
      try {
        const resp = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const data = await resp.json();
        if (data.erro) {
          setErrorMessage('CEP não encontrado. Preencha o endereço manualmente.');
          setManualAddress(true);
        } else {
          setStreet(data.logradouro || '');
          setNeighborhood(data.bairro || '');
          setCity(data.localidade || '');
          setState(data.uf || '');
          setManualAddress(false);
        }
      } catch (err) {
        setErrorMessage('Falha ao consultar CEP. Preencha o endereço manualmente.');
        setManualAddress(true);
      } finally {
        setIsLoadingCep(false);
      }
    }
  };

  // Máscara e Busca do ViaCEP para o Estabelecimento / Salão
  const handleSalonCepChange = async (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length > 5) {
      formatted = `${digits.slice(0, 5)}-${digits.slice(5)}`;
    }
    setSalonCep(formatted);

    if (digits.length === 8) {
      setIsLoadingSalonCep(true);
      try {
        const resp = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const data = await resp.json();
        if (!data.erro) {
          setSalonStreet(data.logradouro || '');
          setSalonNeighborhood(data.bairro || '');
          setSalonCity(data.localidade || '');
          setSalonState(data.uf || '');
        }
      } catch (err) {
        console.warn('Erro ao buscar CEP do salão:', err);
      } finally {
        setIsLoadingSalonCep(false);
      }
    }
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (accountType === 'professional' && !slug) {
      const autoSlug = val
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 24);
      setSlug(autoSlug);
    }
  };

  const handleTradeNameChange = (val: string) => {
    setTradeName(val);
    const autoSlug = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 24);
    setSlug(autoSlug);
  };

  // Adicionar Dependente
  const handleAddDependent = () => {
    if (!newDepName.trim()) return;
    const newDep: DependentItem = {
      id: `dep-${Date.now()}`,
      fullName: newDepName.trim(),
      nickname: newDepNick.trim() || newDepName.split(' ')[0],
      age: newDepAge,
      gender: newDepGender,
      relationship: newDepRel,
      avatarUrl: '',
    };
    setDependents([...dependents, newDep]);
    setNewDepName('');
    setNewDepNick('');
    setNewDepAge('');
    setShowAddDependent(false);
  };

  const handleRemoveDependent = (id: string) => {
    setDependents(dependents.filter((d) => d.id !== id));
  };

  // Validação do Passo 1
  const validateStep1 = () => {
    setErrorMessage('');
    if (!name.trim()) {
      setErrorMessage('Informe seu nome completo.');
      return false;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Informe um e-mail válido.');
      return false;
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      setErrorMessage('WhatsApp é obrigatório para confirmações de agendamento.');
      return false;
    }
    if (!password || password.length < 6) {
      setErrorMessage('A senha deve ter no mínimo 6 caracteres.');
      return false;
    }
    // Regra de Nome de Perfil: 1 maiúscula + 1 caractere especial
    if (username) {
      const hasUpper = /[A-Z]/.test(username);
      const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(username);
      if (!hasUpper || !hasSpecial) {
        setErrorMessage('O nome de perfil precisa ter pelo menos 1 letra maiúscula e 1 caractere especial (ex: Anderson#).');
        return false;
      }
    }
    return true;
  };

  // Validação do Passo 2
  const validateStep2 = () => {
    setErrorMessage('');
    if (!manualAddress && cep.replace(/\D/g, '').length < 8) {
      setErrorMessage('Informe um CEP válido com 8 dígitos.');
      return false;
    }
    if (!street.trim() || !city.trim() || !state.trim()) {
      setErrorMessage('Preencha os dados do endereço de residência (Rua, Cidade e Estado).');
      return false;
    }
    return true;
  };

  // Avançar Passo
  const handleNextStep = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    }
  };

  // Finalizar Cadastro
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (accountType === 'professional' && (!tradeName.trim() || !slug.trim())) {
      setErrorMessage('Nome do estabelecimento e subdomínio são obrigatórios.');
      return;
    }

    if (accountType === 'professional' && !sameAsPersonalAddress && (!salonStreet.trim() || !salonCity.trim())) {
      setErrorMessage('Preencha os dados do endereço do estabelecimento.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/public/register-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: accountType,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          phone: phone.trim(),
          documentCpf: cpf.trim(),
          username: username.trim(),
          avatarUrl,
          // Address Pessoal
          cep: cep.trim(),
          street: street.trim(),
          number: number.trim(),
          complement: complement.trim(),
          neighborhood: neighborhood.trim(),
          city: city.trim(),
          state: state.trim(),
          // Dependents
          dependents,
          // Business
          tradeName: tradeName.trim(),
          slug: slug.trim().toLowerCase(),
          category,
          attendanceType,
          targetGender,
          targetAgeGroup,
          // Dedicated Salon Address
          salonSameAsPersonalAddress: sameAsPersonalAddress,
          salonCep: salonCep.trim(),
          salonStreet: salonStreet.trim(),
          salonNumber: salonNumber.trim(),
          salonComplement: salonComplement.trim(),
          salonNeighborhood: salonNeighborhood.trim(),
          salonCity: salonCity.trim(),
          salonState: salonState.trim(),
          // Dedicated Salon Contacts
          useSamePhone,
          useSameEmail,
          salonPhoneWhatsapp: useSamePhone ? phone.trim() : salonPhoneWhatsapp.trim(),
          salonPhoneLandline: salonPhoneLandline.trim(),
          salonEmail: useSameEmail ? email.trim().toLowerCase() : salonEmail.trim().toLowerCase(),
          redirectUrl,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setErrorMessage(data.error || 'Erro ao realizar cadastro.');
        setIsSubmitting(false);
        return;
      }

      const target = data.targetRedirect || (accountType === 'professional' ? `https://${slug}.vagouapp.com` : 'https://portal.vagouapp.com');

      setSuccessData({
        message: data.message || 'Cadastro realizado com sucesso!',
        targetRedirect: target,
      });

      // Tenta obter sessão Supabase ativa para passar aos apps consumidores (pvapp / mnvapp)
      let userSession = null;
      try {
        const { data: signInData } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (signInData?.session) {
          userSession = signInData.session;
        }
      } catch (authErr) {
        console.warn('Auto sign-in pós-cadastro fallback:', authErr);
      }

      // Post message to parent if iframe embedded
      if (window.parent && window.parent !== window) {
        const payload = {
          type: 'VAGOU_REGISTRATION_SUCCESS',
          accountType,
          email: email.trim().toLowerCase(),
          name: name.trim(),
          user: data.user,
          session: userSession,
          targetRedirect: target,
        };
        window.parent.postMessage(payload, '*');
        window.parent.postMessage({ ...payload, type: 'VAGOU_AUTH_SUCCESS' }, '*');
      }

      // Auto redirect after 1.5s or trigger onSuccess callback
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else if (!isEmbedded) {
          window.location.href = target;
        }
      }, 1500);
    } catch (err: any) {
      setErrorMessage('Falha na comunicação com o servidor de cadastro.');
      setIsSubmitting(false);
    }
  };

  // Autenticação de Usuário / Cliente
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setErrorMessage('Por favor, informe seu e-mail e sua senha.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim().toLowerCase(),
        password: loginPassword,
      });

      if (authError || !authData?.user) {
        setErrorMessage(
          authError?.message === 'Invalid login credentials'
            ? 'E-mail ou senha incorretos.'
            : authError?.message || 'Falha ao autenticar.'
        );
        setIsSubmitting(false);
        return;
      }

      // Determine redirect URL
      const target = redirectUrl || (accountType === 'professional' ? `https://${slug || 'portal'}.vagouapp.com` : 'https://portal.vagouapp.com');

      setSuccessData({
        message: 'Acesso autorizado! Carregando sua sessão...',
        targetRedirect: target,
      });

      // Post message to parent if iframe embedded so parent can refresh and capture session
      if (window.parent && window.parent !== window) {
        const payload = {
          type: 'VAGOU_AUTH_SUCCESS',
          accountType,
          email: loginEmail.trim().toLowerCase(),
          name: authData.user.user_metadata?.full_name || authData.user.email?.split('@')[0] || 'Cliente',
          user: authData.user,
          session: authData.session,
          targetRedirect: target,
        };
        window.parent.postMessage(payload, '*');
        // Para compatibilidade com componentes ouvindo apenas VAGOU_REGISTRATION_SUCCESS
        window.parent.postMessage({ ...payload, type: 'VAGOU_REGISTRATION_SUCCESS' }, '*');
      }

      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else if (!isEmbedded) {
          window.location.href = target;
        }
      }, 1500);

    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro de conexão com o Supabase Auth.');
      setIsSubmitting(false);
    }
  };

  if (successData) {
    return (
      <div className={`w-full ${isEmbedded ? 'bg-transparent border-0 p-0' : 'min-h-screen bg-slate-950 p-4'} text-slate-100 flex flex-col items-center justify-center`}>
        <div className={`w-full max-w-md ${isEmbedded ? 'bg-transparent border-0 p-2 shadow-none' : 'bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl'} text-center animate-fadeIn`}>
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Tudo pronto!</h2>
          <p className="text-sm text-slate-300 mb-6">{successData.message}</p>
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400 bg-slate-800/60 py-2.5 px-4 rounded-xl border border-slate-700/50">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            <span>Redirecionando automaticamente...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${isEmbedded ? 'bg-transparent border-0 p-0' : 'min-h-screen bg-slate-950 flex flex-col items-center justify-center p-3 sm:p-6'} text-slate-100 select-none selection:bg-emerald-500 selection:text-white`}>
      {/* Background Glow */}
      {!isEmbedded && (
        <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_20%,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent opacity-60" />
      )}

      <div className="relative w-full max-w-lg bg-transparent border-0 p-2 sm:p-4 shadow-none flex flex-col animate-fadeIn">
        {onClose && (
          <button
            type="button"
            onClick={() => {
              if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'VAGOU_CLOSE_MODAL' }, '*');
              }
              onClose();
            }}
            className="absolute top-4 right-4 z-20 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-4 h-4 text-slate-300" />
          </button>
        )}
        {/* Header Logo & Title */}
        <div className="flex flex-col items-center text-center mb-5">
          <VagouLogo className="h-9 text-white mb-2" />
          <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            {isLoginMode
              ? 'Acessar Conta'
              : accountType === 'professional'
              ? 'Cadastrar Novo Estabelecimento'
              : 'Cadastrar Novo Usuário'}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {isLoginMode
              ? 'Bem-vindo(a) de volta! Acesse sua conta para confirmar.'
              : accountType === 'professional'
              ? 'Cadastro do responsável e do estabelecimento comercial no ecossistema'
              : '1 Usuário = 1 Identidade Unificada no Ecossistema'}
          </p>
        </div>

        {/* Account Type Selector Tabs (Only in Registration Mode & if not hidden) */}
        {!isLoginMode && !hideTypeSelector && (
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-950 border border-slate-800 rounded-xl mb-5">
            <button
              type="button"
              onClick={() => {
                setAccountType('client');
                setErrorMessage('');
              }}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                accountType === 'client'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Sou Cliente</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAccountType('professional');
                setErrorMessage('');
              }}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                accountType === 'professional'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Sou Profissional</span>
            </button>
          </div>
        )}

        {/* Multi-step Indicator (Only in Registration Mode) */}
        {!isLoginMode && (
          <div className="flex items-center justify-between px-2 mb-6 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${currentStep === 1 ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300'}`}>
                1
              </span>
              <span className={`text-xs font-medium ${currentStep === 1 ? 'text-white font-semibold' : 'text-slate-400'}`}>
                Cidadão
              </span>
            </div>

            <div className="w-6 h-px bg-slate-800" />

            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${currentStep === 2 ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300'}`}>
                2
              </span>
              <span className={`text-xs font-medium ${currentStep === 2 ? 'text-white font-semibold' : 'text-slate-400'}`}>
                Endereço
              </span>
            </div>

            <div className="w-6 h-px bg-slate-800" />

            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${currentStep === 3 ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300'}`}>
                3
              </span>
              <span className={`text-xs font-medium ${currentStep === 3 ? 'text-white font-semibold' : 'text-slate-400'}`}>
                {accountType === 'professional' ? 'Negócio' : 'Dependentes'}
              </span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* LOGIN FORM (Apenas se isLoginMode for ativo) */}
        {isLoginMode ? (
          <form onSubmit={handleLogin} className="space-y-4 animate-fadeIn">
            {/* E-mail */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Seu E-mail Cadastrado
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="Ex: Amanda Silva"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/80 transition-all duration-150"
                  required
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Sua Senha
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Mínimo 6 dígitos"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/80 transition-all duration-150"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-50 mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Acessando...</span>
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4 text-white" />
                  <span>ENTRAR & CONFIRMAR HORÁRIO</span>
                </>
              )}
            </button>

            {/* Toggle Mode Footer Link */}
            <div className="text-center pt-3 border-t border-slate-800 mt-4">
              <button
                type="button"
                onClick={() => {
                  setIsLoginMode(false);
                  setErrorMessage('');
                }}
                className="text-xs text-slate-400 hover:text-white transition duration-150 cursor-pointer inline-flex items-center gap-1"
              >
                <span>Ainda não possui uma conta?</span>
                <span className="text-emerald-500 hover:text-emerald-400 font-bold underline">Cadastre-se aqui</span>
              </button>
            </div>
          </form>
        ) : (
          null
        )}

        {/* STEP 1: DADOS PESSOAIS DO CIDADÃO */}
        {!isLoginMode && currentStep === 1 && (
          <div className="space-y-4 animate-fadeIn">
            {/* Nome Completo */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nome Completo (Pessoa Física) *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ex: Anderson Silva"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/80"
                  required
                />
              </div>
            </div>

            {/* E-mail e WhatsApp */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  E-mail Pessoal *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/80"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  WhatsApp Pessoal *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value, setPhone)}
                    placeholder="(11) 99999-9999"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/80"
                    required
                  />
                </div>
              </div>
            </div>

            {/* CPF e Nome de Perfil */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  CPF <span className="text-slate-500">(Opcional)</span>
                </label>
                <input
                  type="text"
                  value={cpf}
                  onChange={(e) => handleCpfChange(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/80"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nome de Perfil <span className="text-slate-500">(Ex: Anderson#)</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="SuaTag#"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/80"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Exige 1 maiúscula + 1 especial (ex: Anderson#)
                </span>
              </div>
            </div>

            {/* Senha */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Crie uma Senha *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha secreta"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/80"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleNextStep}
              className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 text-sm mt-4 cursor-pointer"
            >
              <span>Avançar para Endereço</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>
        )}

        {/* STEP 2: ENDEREÇO DE RESIDÊNCIA DO CIDADÃO */}
        {!isLoginMode && currentStep === 2 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-300">
                  CEP de Residência Pessoal
                </label>
                <button
                  type="button"
                  onClick={() => setManualAddress(!manualAddress)}
                  className="text-[11px] text-emerald-400 hover:underline cursor-pointer"
                >
                  {manualAddress ? 'Buscar por CEP' : 'Não sei meu CEP'}
                </button>
              </div>

              {!manualAddress && (
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={cep}
                    onChange={(e) => handleCepChange(e.target.value)}
                    placeholder="00000-000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-10 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500/80"
                  />
                  {isLoadingCep && (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  )}
                </div>
              )}
            </div>

            {/* Campos de Endereço Preenchidos Automáticos */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Logradouro / Rua Pessoal *
              </label>
              <input
                type="text"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="Ex: Av. Paulista"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/80"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Número *
                </label>
                <input
                  type="text"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="Ex: 1000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/80"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Complemento
                </label>
                <input
                  type="text"
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                  placeholder="Apto 42"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/80"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Bairro
                </label>
                <input
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Bairro"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/80"
                />
              </div>

              <div className="col-span-1">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="São Paulo"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/80"
                  required
                />
              </div>

              <div className="col-span-1">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  UF
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                  placeholder="SP"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-2.5 text-xs text-white uppercase placeholder-slate-600 focus:outline-none focus:border-emerald-500/80 font-mono text-center"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="w-1/3 py-3 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-slate-300" />
                <span>Voltar</span>
              </button>

              <button
                type="button"
                onClick={handleNextStep}
                className="w-2/3 py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                <span>{accountType === 'professional' ? 'Configurar Negócio' : 'Configurar Dependentes'}</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: DEPENDENTES (CLIENTE) OU NEGÓCIO (PROFISSIONAL) */}
        {!isLoginMode && currentStep === 3 && (
          <form onSubmit={handleSubmit} className="space-y-4 animate-fadeIn">
            {accountType === 'client' ? (
              /* DEPENDENTES PARA CLIENTE */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-400">
                      Dependentes do Usuário (Opcional)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddDependent(!showAddDependent)}
                    className="text-xs font-medium text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
                  </button>
                </div>

                {/* Sub-formulario de Novo Dependente */}
                {showAddDependent && (
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3 animate-fadeIn">
                    <span className="text-xs font-bold text-white block">Novo Dependente</span>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Nome Completo *"
                        value={newDepName}
                        onChange={(e) => setNewDepName(e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-white placeholder-slate-600"
                      />
                      <input
                        type="text"
                        placeholder="Apelido"
                        value={newDepNick}
                        onChange={(e) => setNewDepNick(e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-white placeholder-slate-600"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="number"
                        placeholder="Idade"
                        value={newDepAge}
                        onChange={(e) => setNewDepAge(e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-white placeholder-slate-600"
                      />

                      <select
                        value={newDepGender}
                        onChange={(e) => setNewDepGender(e.target.value as any)}
                        className="bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-2 text-xs text-white"
                      >
                        <option value="masculino">Masculino</option>
                        <option value="feminino">Feminino</option>
                        <option value="outro">Outro</option>
                      </select>

                      <select
                        value={newDepRel}
                        onChange={(e) => setNewDepRel(e.target.value as any)}
                        className="bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-2 text-xs text-white"
                      >
                        <option value="Filho/a">Filho/a</option>
                        <option value="Pai">Pai</option>
                        <option value="Mãe">Mãe</option>
                        <option value="Esposo/a">Esposo/a</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddDependent(false)}
                        className="px-2.5 py-1 text-xs text-slate-400 hover:text-white"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleAddDependent}
                        className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-xs font-semibold"
                      >
                        Salvar Dependente
                      </button>
                    </div>
                  </div>
                )}

                {/* Lista de Dependentes Adicionados */}
                {dependents.length > 0 ? (
                  <div className="space-y-2">
                    {dependents.map((dep) => (
                      <div
                        key={dep.id}
                        className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs"
                      >
                        <div>
                          <p className="font-semibold text-white">{dep.fullName} ({dep.relationship})</p>
                          <p className="text-[10px] text-slate-400">{dep.age ? `${dep.age} anos • ` : ''}{dep.gender}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveDependent(dep.id)}
                          className="p-1 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-950/60 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-500">
                    Nenhum dependente cadastrado. Você pode incluir filhos ou parentes para agendamentos futuros.
                  </div>
                )}
              </div>
            ) : (
              /* DADOS DO ESTABELECIMENTO PARA PROFISSIONAL */
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nome Fantasia do Estabelecimento *
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={tradeName}
                      onChange={(e) => handleTradeNameChange(e.target.value)}
                      placeholder="Ex: Anderson Barber Studio"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/80"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Subdomínio Exclusivo *
                    </label>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="andersonstudio"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500/80"
                      required
                    />
                    <span className="text-[10px] text-emerald-400 font-mono mt-1 block">
                      ➔ {slug || 'seu-nome'}.vagouapp.com
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Categoria Principal
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-500/80"
                    >
                      <option value="barbearia">Barbearia</option>
                      <option value="salao">Salão de Beleza</option>
                      <option value="estetica">Estética & Esmalteria</option>
                      <option value="spa">Spa & Bem-estar</option>
                    </select>
                  </div>
                </div>

                {/* Local de Atendimento */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Modalidade de Atendimento
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setAttendanceType('home_only')}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        attendanceType === 'home_only'
                          ? 'bg-emerald-500 text-white border-emerald-400'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800/40'
                      }`}
                    >
                      <Home className="w-4 h-4 mx-auto mb-1 text-current" />
                      <span className="text-[11px] font-semibold block leading-tight">Domicílio</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAttendanceType('hybrid')}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        attendanceType === 'hybrid'
                          ? 'bg-emerald-500 text-white border-emerald-400'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800/40'
                      }`}
                    >
                      <Layers className="w-4 h-4 mx-auto mb-1 text-current" />
                      <span className="text-[11px] font-semibold block leading-tight">Local + Domicílio</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAttendanceType('salon_only')}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        attendanceType === 'salon_only'
                          ? 'bg-emerald-500 text-white border-emerald-400'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800/40'
                      }`}
                    >
                      <Briefcase className="w-4 h-4 mx-auto mb-1 text-current" />
                      <span className="text-[11px] font-semibold block leading-tight">Local Fixo</span>
                    </button>
                  </div>
                </div>

                {/* Gênero Atendido & Faixa Etária */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Gênero Atendido
                    </label>
                    <select
                      value={targetGender}
                      onChange={(e) => setTargetGender(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-2.5 text-xs text-white"
                    >
                      <option value="unisex">Unissex</option>
                      <option value="male">Masculino</option>
                      <option value="female">Feminino</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Faixa Etária
                    </label>
                    <select
                      value={targetAgeGroup}
                      onChange={(e) => setTargetAgeGroup(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-2.5 text-xs text-white"
                    >
                      <option value="both">Ambos (Adultos & Infantil)</option>
                      <option value="adults">Adultos</option>
                      <option value="kids">Infantil</option>
                    </select>
                  </div>
                </div>

                {/* ENDEREÇO DO ESTABELECIMENTO (Se for diferente da Residência) */}
                <div className="pt-2 border-t border-slate-800 space-y-3">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sameAsPersonalAddress}
                      onChange={(e) => setSameAsPersonalAddress(e.target.checked)}
                      className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-950 w-4 h-4"
                    />
                    <span>O endereço do estabelecimento é O MESMO da minha residência</span>
                  </label>

                  {!sameAsPersonalAddress && (
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Endereço Comercial / do Salão</span>
                        </span>
                        <span className="text-[10px] text-slate-400">Usado no Radar do Portal</span>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">CEP Comercial</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={salonCep}
                            onChange={(e) => handleSalonCepChange(e.target.value)}
                            placeholder="00000-000"
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white font-mono"
                          />
                          {isLoadingSalonCep && (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400 absolute right-3 top-1/2 -translate-y-1/2" />
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Rua / Logradouro do Salão *</label>
                        <input
                          type="text"
                          value={salonStreet}
                          onChange={(e) => setSalonStreet(e.target.value)}
                          placeholder="Rua do Salão"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={salonNumber}
                          onChange={(e) => setSalonNumber(e.target.value)}
                          placeholder="Número *"
                          className="bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white"
                        />
                        <input
                          type="text"
                          value={salonComplement}
                          onChange={(e) => setSalonComplement(e.target.value)}
                          placeholder="Complemento / Sala"
                          className="bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={salonNeighborhood}
                          onChange={(e) => setSalonNeighborhood(e.target.value)}
                          placeholder="Bairro"
                          className="bg-slate-900 border border-slate-800 rounded-lg py-2 px-2 text-xs text-white"
                        />
                        <input
                          type="text"
                          value={salonCity}
                          onChange={(e) => setSalonCity(e.target.value)}
                          placeholder="Cidade *"
                          className="bg-slate-900 border border-slate-800 rounded-lg py-2 px-2 text-xs text-white"
                        />
                        <input
                          type="text"
                          value={salonState}
                          onChange={(e) => setSalonState(e.target.value.toUpperCase().slice(0, 2))}
                          placeholder="UF"
                          className="bg-slate-900 border border-slate-800 rounded-lg py-2 px-2 text-xs text-white uppercase text-center font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* CONTATOS ADICIONAIS DO ESTABELECIMENTO */}
                <div className="pt-2 border-t border-slate-800 space-y-3">
                  <span className="text-xs font-semibold text-emerald-400 block">Meios de Contato Comerciais do Salão</span>

                  {/* Checkbox 1: WhatsApp */}
                  <div className="space-y-2 p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useSamePhone}
                        onChange={(e) => setUseSamePhone(e.target.checked)}
                        className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-900 w-4 h-4"
                      />
                      <span>Usar o mesmo WhatsApp da Pessoa Física</span>
                    </label>

                    {!useSamePhone ? (
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">WhatsApp Comercial do Salão *</label>
                        <input
                          type="tel"
                          value={salonPhoneWhatsapp}
                          onChange={(e) => handlePhoneChange(e.target.value, setSalonPhoneWhatsapp)}
                          placeholder="(11) 99999-9999"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/80"
                        />
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic pl-6">
                        ➔ Usando WhatsApp Pessoal: <strong className="text-emerald-400 font-mono">{phone || 'Não informado'}</strong>
                      </p>
                    )}
                  </div>

                  {/* Checkbox 2: E-mail */}
                  <div className="space-y-2 p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useSameEmail}
                        onChange={(e) => setUseSameEmail(e.target.checked)}
                        className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-900 w-4 h-4"
                      />
                      <span>Usar o mesmo E-mail da Pessoa Física no Salão</span>
                    </label>

                    {!useSameEmail ? (
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">E-mail Comercial do Salão *</label>
                        <input
                          type="email"
                          value={salonEmail}
                          onChange={(e) => setSalonEmail(e.target.value)}
                          placeholder="contato@salao.com"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/80"
                        />
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic pl-6">
                        ➔ Usando E-mail Pessoal: <strong className="text-emerald-400 font-mono">{email || 'Não informado'}</strong>
                      </p>
                    )}
                  </div>

                  {/* Telefone Fixo Opcional */}
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <label className="block text-[10px] text-slate-400 mb-1">Telefone Fixo Comercial <span className="text-slate-500">(Opcional)</span></label>
                    <input
                      type="tel"
                      value={salonPhoneLandline}
                      onChange={(e) => handleLandlineChange(e.target.value)}
                      placeholder="(11) 3333-4444"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/80"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Botoes Finais */}
            <div className="flex items-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="w-1/3 py-3 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-slate-300" />
                <span>Voltar</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-2/3 py-3.5 px-5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Criando sua conta...</span>
                  </>
                ) : (
                  <>
                    <span>Finalizar e Concluir</span>
                    <Check className="w-4 h-4 text-white" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Footer info */}
        <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Ambiente Soberano Vagou</span>
          </div>
          <a
            href="https://portal.vagouapp.com"
            className="hover:text-slate-300 transition-colors"
          >
            Já tem conta? Entrar
          </a>
        </div>
      </div>
    </div>
  );
};
