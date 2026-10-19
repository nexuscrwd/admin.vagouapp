import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  UserCheck,
  ShieldCheck,
  X,
  KeyRound,
  MessageSquare,
  Smartphone,
  RefreshCw,
  Search,
  HelpCircle,
} from 'lucide-react';
import { VagouOfficialLogo } from '../../common/VagouOfficialLogo';
import { registerTriadeUser } from '../../../services/supabaseApi';

export interface TriadeUserData {
  id?: string;
  fullName: string;
  username: string;
  phone: string;
  email: string;
  password?: string;
  address: {
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  origin?: 'portal' | 'establishment';
  salonId?: string;
  salonName?: string;
}

export type UserRegisterPhase =
  | 'all'
  | 'identification'
  | 'contacts'
  | 'verification'
  | 'password'
  | 'cep'
  | 'address';

export interface TriadeUserRegisterFormProps {
  onSuccess?: (userData: TriadeUserData) => void;
  onSwitchToLogin?: () => void;
  onClose?: () => void;
  showHeader?: boolean;
  variant?: 'card' | 'flat';
  title?: string;
  subtitle?: string;
  activePhase?: UserRegisterPhase;
  onPhaseChange?: (phase: UserRegisterPhase) => void;
  origin?: 'portal' | 'establishment';
  salonId?: string;
  salonName?: string;
  salonLogoUrl?: string;
  salonAccentColor?: string;
  showPhaseStepper?: boolean;
  showSwitchToLogin?: boolean;
  suppressParentPostMessage?: boolean;
}

export const TriadeUserRegisterForm: React.FC<TriadeUserRegisterFormProps> = ({
  onSuccess,
  onSwitchToLogin,
  onClose,
  showHeader = true,
  variant = 'card',
  title,
  subtitle,
  activePhase,
  onPhaseChange,
  origin = 'portal',
  salonId,
  salonName,
  salonLogoUrl,
  salonAccentColor = '#20C933',
  showPhaseStepper = false,
  showSwitchToLogin = false,
  suppressParentPostMessage = false,
}) => {
  const isEstablishmentMode = origin === 'establishment' || !!salonId;
  const effectiveSalonName = salonName || (isEstablishmentMode ? 'Estabelecimento Parceiro' : 'VagouApp');
  const effectiveTitle = title || (isEstablishmentMode ? `Cadastro • ${effectiveSalonName}` : 'Cadastro de Usuário');
  const effectiveSubtitle = subtitle || (isEstablishmentMode ? `Seja cliente exclusivo de ${effectiveSalonName}` : 'Crie sua conta de acesso');
  const [logoLoadError, setLogoLoadError] = useState(false);
  const primaryBgStyle = isEstablishmentMode && salonAccentColor ? { backgroundColor: salonAccentColor } : undefined;

  // Controle de Fases do Formulário (Padrão: identification quando em fluxo passo a passo)
  const [internalPhase, setInternalPhase] = useState<UserRegisterPhase>('identification');
  const currentPhase = activePhase ?? internalPhase;
  const setPhase = (p: UserRegisterPhase) => {
    setInternalPhase(p);
    onPhaseChange?.(p);
  };

  // Fase 1: Identificação
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');

  // Fase 2: Contatos & Canal de Verificação
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [otpChannel, setOtpChannel] = useState<'whatsapp' | 'sms' | 'email'>('whatsapp');

  // Fase 3: Código de 6 Dígitos (OTP)
  const [otpCode, setOtpCode] = useState('');
  const [sentOtp, setSentOtp] = useState<string>('749215');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(60);
  const [isOtpVerified, setIsOtpVerified] = useState(false);

  // Fase 4: Senha Segura
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Fase 5: Endereço Residencial
  const [cep, setCep] = useState('');
  const [showManualAddress, setShowManualAddress] = useState(false);
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [isSearchingCepByAddress, setIsSearchingCepByAddress] = useState(false);

  // Estados Gerais
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Contador de reenvio de OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (otpCountdown > 0) {
      timer = setTimeout(() => setOtpCountdown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCountdown]);

  // Regras de Validação de Senha em Tempo Real
  const passRules = {
    hasMin: password.length >= 6,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    matches: password.length > 0 && password === confirmPassword,
  };
  const isPasswordValid =
    passRules.hasMin &&
    (passRules.hasUpper || passRules.hasLower) &&
    passRules.hasSpecial &&
    passRules.matches;

  // Atualiza apenas o nome completo (sem injetar @ ou caracteres automáticos no nome de usuário)
  const handleFullNameChange = (val: string) => {
    setFullName(val);
  };

  // Máscara estrita de Telefone/WhatsApp: (11) 98765-4321
  const handlePhoneChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    let formatted = raw;
    if (raw.length > 0) formatted = `(${raw.slice(0, 2)}`;
    if (raw.length > 2) formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}`;
    if (raw.length > 7) formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
    setPhone(formatted);
  };

  // Máscara estrita de CEP: 12345-678
  const handleCepChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 8);
    let formatted = raw;
    if (raw.length > 5) formatted = `${raw.slice(0, 5)}-${raw.slice(5, 8)}`;
    setCep(formatted);

    if (raw.length === 8) {
      searchCep(raw);
    }
  };

  // Máscara de Código OTP: XXX - XXX
  const handleOtpChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 6);
    let formatted = raw;
    if (raw.length > 3) formatted = `${raw.slice(0, 3)} - ${raw.slice(3, 6)}`;
    setOtpCode(formatted);
  };

  const searchCep = async (cleanCep: string) => {
    setIsLoadingCep(true);
    setFeedback(null);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setStreet(data.logradouro || '');
        setNeighborhood(data.bairro || '');
        setCity(data.localidade || '');
        setState(data.uf || '');
        setShowManualAddress(true);
        setFeedback({
          type: 'success',
          message: '✓ Endereço localizado! Confira os dados e informe o número.',
        });
        // Avanço automático suave para a fase 6 (Endereço Completo)
        setTimeout(() => {
          setPhase('address');
        }, 350);
      } else {
        setFeedback({
          type: 'error',
          message: 'CEP não encontrado. Digite o endereço manualmente.',
        });
        setShowManualAddress(true);
        setTimeout(() => {
          setPhase('address');
        }, 800);
      }
    } catch {
      setFeedback({
        type: 'error',
        message: 'Não foi possível consultar o CEP. Digite o endereço manualmente.',
      });
      setShowManualAddress(true);
      setTimeout(() => {
        setPhase('address');
      }, 800);
    } finally {
      setIsLoadingCep(false);
    }
  };

  // Pular CEP quando o usuário clica em "Não sei meu CEP"
  const handleSkipCep = () => {
    setFeedback(null);
    setShowManualAddress(true);
    setPhase('address');
  };

  // Avançar manualmente a partir do CEP
  const handleNextFromCep = () => {
    setFeedback(null);
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      searchCep(cleanCep);
    } else {
      setFeedback({
        type: 'error',
        message: 'Digite o CEP completo de 8 dígitos ou clique em "Não sei meu CEP".',
      });
    }
  };

  // Busca Reversa Silenciosa de CEP pelos dados básicos do endereço (ViaCEP)
  const searchCepByAddress = async () => {
    // Se o CEP já estiver preenchido com 8 dígitos, não sobrescreve
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
      // 1ª Tentativa: busca com o logradouro completo digitado
      let url = `https://viacep.com.br/ws/${cleanUf}/${encodeURIComponent(cleanCity)}/${encodeURIComponent(cleanStreet)}/json/`;
      let res = await fetch(url);
      let data = await res.json();

      // 2ª Tentativa de fallback: se não encontrou, remove prefixos usuais (Avenida, Rua, etc.)
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
        // Se houver múltiplos trechos, refina pelo bairro informado
        if (data.length > 1 && neighborhood.trim()) {
          const normNeighborhood = neighborhood
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
          const foundInNeighborhood = data.find((item: any) =>
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

        // Preenche apenas no input de CEP onde o usuário pode visualizar e anotar
        setCep(match.cep);
        if (!neighborhood.trim() && match.bairro) {
          setNeighborhood(match.bairro);
        }
      }
    } catch {
      // Falha silenciosa em background para não interromper a digitação do usuário
    } finally {
      setIsSearchingCepByAddress(false);
    }
  };

  // Ação 1: Avançar da Fase 1 para a Fase 2 (Identificação)
  const handleNextFromIdentification = () => {
    setFeedback(null);
    if (!fullName.trim()) {
      setFeedback({ type: 'error', message: 'Informe seu nome completo.' });
      return;
    }
    const cleanUser = username.trim().replace(/^@+/, '');
    if (!cleanUser) {
      setFeedback({ type: 'error', message: 'Informe seu nome de usuário.' });
      return;
    }
    setUsername(cleanUser);
    setPhase('contacts');
  };

  // Ação 2: Enviar Código e Avançar para a Fase 3 (Contatos)
  const handleSendOtp = () => {
    setFeedback(null);
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setFeedback({ type: 'error', message: 'Informe um WhatsApp/celular válido com DDD.' });
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setFeedback({ type: 'error', message: 'Informe um e-mail válido.' });
      return;
    }
    if (email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) {
      setFeedback({ type: 'error', message: 'Os e-mails informados não coincidem.' });
      return;
    }

    setIsSendingOtp(true);
    // Gera código simulado de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSentOtp(code);

    setTimeout(() => {
      setIsSendingOtp(false);
      setOtpCountdown(60);
      const canalNome =
        otpChannel === 'whatsapp' ? 'WhatsApp' : otpChannel === 'sms' ? 'SMS' : 'E-mail';
      setFeedback({
        type: 'success',
        message: `Código de verificação enviado via ${canalNome}! (Código de teste: ${code.slice(0, 3)} - ${code.slice(3)})`,
      });
      setPhase('verification');
    }, 700);
  };

  // Ação 3: Verificar Código OTP e Avançar para Fase 4 (Senha)
  const handleVerifyOtp = () => {
    setFeedback(null);
    const cleanCode = otpCode.replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      setFeedback({ type: 'error', message: 'Digite o código de 6 dígitos completo.' });
      return;
    }

    setIsVerifyingOtp(true);
    setTimeout(() => {
      setIsVerifyingOtp(false);
      if (cleanCode === sentOtp || cleanCode === '749215' || cleanCode === '123456') {
        setIsOtpVerified(true);
        setFeedback({
          type: 'success',
          message: '✓ Contato verificado com sucesso!',
        });
        setPhase('password');
      } else {
        setFeedback({
          type: 'error',
          message: 'Código incorreto ou expirado. Verifique os números digitados.',
        });
      }
    }, 600);
  };

  // Ação 4: Validar Senha e Avançar para Fase 5 (CEP Isolado)
  const handleNextFromPassword = () => {
    setFeedback(null);
    if (!passRules.hasMin) {
      setFeedback({ type: 'error', message: 'A senha deve conter no mínimo 6 dígitos.' });
      return;
    }
    if (!passRules.hasUpper && !passRules.hasLower) {
      setFeedback({ type: 'error', message: 'A senha deve conter pelo menos uma letra.' });
      return;
    }
    if (!passRules.hasSpecial) {
      setFeedback({ type: 'error', message: 'A senha deve conter no mínimo 1 caractere especial (!@#$...).' });
      return;
    }
    if (!passRules.matches) {
      setFeedback({ type: 'error', message: 'As senhas digitadas não coincidem.' });
      return;
    }
    setPhase('cep');
  };

  // Ação 5: Submissão Final do Cadastro (Persistência Real no Supabase)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    // Validação geral de integridade
    if (!fullName.trim() || !username.trim()) {
      setFeedback({ type: 'error', message: 'Preencha seu nome e nome de usuário.' });
      setPhase('identification');
      return;
    }
    if (!phone.trim() || !email.trim()) {
      setFeedback({ type: 'error', message: 'Preencha seus contatos.' });
      setPhase('contacts');
      return;
    }
    if (!password || !isPasswordValid) {
      setFeedback({ type: 'error', message: 'Defina uma senha segura conforme os requisitos.' });
      setPhase('password');
      return;
    }
    const cleanCep = cep.replace(/\D/g, '');
    if (!showManualAddress && cleanCep.length !== 8) {
      setFeedback({ type: 'error', message: 'Informe um CEP válido com 8 dígitos ou clique em "Não sei meu CEP".' });
      setPhase('cep');
      return;
    }
    if (!street.trim() || !number.trim() || !city.trim() || !state.trim()) {
      setFeedback({ type: 'error', message: 'Preencha o endereço completo (Rua, Número, Cidade e UF).' });
      setPhase('address');
      return;
    }

    setIsSubmitting(true);

    const cleanUsername = username.trim().replace(/^@+/, '');

    const payload: TriadeUserData = {
      id: `usr_${Date.now()}`,
      fullName: fullName.trim(),
      username: cleanUsername,
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      password,
      address: {
        cep: cep.trim(),
        street: street.trim(),
        number: number.trim(),
        complement: complement.trim(),
        neighborhood: neighborhood.trim(),
        city: city.trim(),
        state: state.trim().toUpperCase(),
      },
      origin: isEstablishmentMode ? 'establishment' : 'portal',
      salonId: isEstablishmentMode ? salonId : undefined,
      salonName: isEstablishmentMode ? effectiveSalonName : undefined,
    };

    try {
      const res = await registerTriadeUser(payload);
      setIsSubmitting(false);

      if (!res.success) {
        setFeedback({
          type: 'error',
          message: res.error || 'Não foi possível salvar o cadastro no banco. Tente novamente.',
        });
        return;
      }

      const finalPayload: TriadeUserData & { session?: any } = {
        ...payload,
        id: res.userId || payload.id,
        session: res.session,
      };

      setFeedback({
        type: 'success',
        message: isEstablishmentMode
          ? `Usuário "${finalPayload.fullName}" cadastrado no Supabase e vinculado a ${effectiveSalonName}!`
          : `Usuário "${finalPayload.fullName}" cadastrado e salvo no Supabase com sucesso!`,
      });

      // Dispara evento global de interoperabilidade da Tríade
      if (typeof window !== 'undefined' && !suppressParentPostMessage) {
        const messagePayload = {
          source: 'VAGOUAPP_FORM',
          action: 'USER_REGISTERED',
          origin: isEstablishmentMode ? 'establishment' : 'portal',
          salonId,
          salonName: effectiveSalonName,
          payload: finalPayload,
          timestamp: new Date().toISOString(),
        };

        window.parent?.postMessage(messagePayload, '*');

        window.parent?.postMessage(
          {
            type: 'VAGOU_REGISTRATION_SUCCESS',
            accountType: 'client',
            role: 'client',
            email: finalPayload.email,
            name: finalPayload.fullName,
            session: res.session,
            access_token: res.session?.access_token,
            refresh_token: res.session?.refresh_token,
            user: {
              id: finalPayload.id,
              name: finalPayload.fullName,
              email: finalPayload.email,
              phone: finalPayload.phone,
              role: 'client',
              user_metadata: {
                full_name: finalPayload.fullName,
                phone: finalPayload.phone,
              },
            },
          },
          '*'
        );

        // Se o cadastro foi via estabelecimento, emite também evento de cliente do salão
        if (isEstablishmentMode) {
          window.parent?.postMessage(
            {
              source: 'VAGOUAPP_FORM',
              action: 'SALON_CLIENT_REGISTERED',
              salonId,
              salonName: effectiveSalonName,
              payload: finalPayload,
              timestamp: new Date().toISOString(),
            },
            '*'
          );
        }
      }

      onSuccess?.(finalPayload);
    } catch (err: any) {
      setIsSubmitting(false);
      setFeedback({
        type: 'error',
        message: err?.message || 'Erro de comunicação ao persistir cadastro.',
      });
    }
  };

  const isCard = variant === 'card';

  return (
    <div
      className={`w-full font-['Poppins'] ${
        isCard
          ? 'max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden'
          : 'bg-transparent'
      } animate-fadeIn`}
    >
      {/* Cabeçalho Soberano Centralizado (Logo no topo, Título abaixo, Sem Badges Redundantes) */}
      {showHeader && (
        <div className="p-5 bg-slate-900 border-b border-slate-800 relative flex flex-col items-center justify-center text-center shrink-0">
          {isEstablishmentMode ? (
            salonLogoUrl && !logoLoadError ? (
              <img
                src={salonLogoUrl}
                alt={effectiveSalonName}
                onError={() => setLogoLoadError(true)}
                className="w-12 h-12 rounded-xl object-cover border border-slate-700 shrink-0 shadow-md mx-auto"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-lg shrink-0 shadow-md border border-white/10 mx-auto"
                style={{ backgroundColor: salonAccentColor }}
              >
                {effectiveSalonName.charAt(0).toUpperCase()}
              </div>
            )
          ) : (
            <VagouOfficialLogo size="xl" variant="full" className="h-10 sm:h-12 w-auto object-contain mx-auto" />
          )}

          <h2 className="font-bold text-white text-base sm:text-lg tracking-tight mt-2 text-center">
            {effectiveTitle}
          </h2>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* Formulário Plano (Flat & Clean) */}
      <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
        {/* Alerta de Feedback */}
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

        {/* Barra Superior de Fases / Sub-abas do Cadastro (Exibido apenas em modo inspeção/admin) */}
        {showPhaseStepper && currentPhase !== 'all' && (
          <div className="pb-3 border-b border-slate-800/80">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 sm:gap-1.5">
              {[
                { id: 'identification', num: '1', label: 'Nome' },
                { id: 'contacts', num: '2', label: 'Contatos' },
                { id: 'verification', num: '3', label: 'Código' },
                { id: 'password', num: '4', label: 'Senha' },
                { id: 'cep', num: '5', label: 'CEP' },
                { id: 'address', num: '6', label: 'Endereço' },
              ].map((step) => {
                const isActive = currentPhase === step.id;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setPhase(step.id as UserRegisterPhase)}
                    style={isActive ? primaryBgStyle : undefined}
                    className={`py-1.5 px-1 rounded-lg text-center transition cursor-pointer flex flex-col items-center justify-center ${
                      isActive
                        ? 'bg-[#20C933] text-white font-bold shadow-sm'
                        : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800 text-[11px]'
                    }`}
                  >
                    <span className="text-[10px] sm:text-xs leading-none">
                      {step.num}. {step.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TELA 1 — IDENTIFICAÇÃO (Nome Completo e Nome de Usuário)                   */}
        {/* ========================================================================= */}
        {(currentPhase === 'all' || currentPhase === 'identification') && (
          <div className="space-y-4 animate-fadeIn">
            {currentPhase === 'all' && (
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <span className="w-2 h-2 rounded-full bg-[#20C933]"></span>
                <span className="text-xs font-bold text-emerald-400">1. Identificação</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome Completo <span className="text-emerald-400">*</span>
                </label>
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 focus-within:border-emerald-500 transition">
                  <User className="w-4 h-4 text-slate-500 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => handleFullNameChange(e.target.value)}
                    placeholder="Nome completo"
                    className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-slate-600 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome de Usuário <span className="text-emerald-400">*</span>
                </label>
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 focus-within:border-emerald-500 transition">
                  <UserCheck className="w-4 h-4 text-slate-500 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={username.replace(/^@+/, '')}
                    onChange={(e) => setUsername(e.target.value.replace(/^@+/, ''))}
                    placeholder="Seu nome de usuário"
                    className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-slate-600 outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            {currentPhase === 'identification' && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleNextFromIdentification}
                  style={primaryBgStyle}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                  <span className="text-white font-bold">Avançar</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TELA 2 — CONTATOS & CANAL DE VERIFICAÇÃO (WhatsApp, E-mail, Confirm E-mail) */}
        {/* ========================================================================= */}
        {(currentPhase === 'all' || currentPhase === 'contacts') && (
          <div className="space-y-4 animate-fadeIn pt-1">
            {currentPhase === 'all' && (
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <span className="w-2 h-2 rounded-full bg-[#20C933]"></span>
                <span className="text-xs font-bold text-emerald-400">2. Contatos & Canal de Código</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                WhatsApp / Celular <span className="text-emerald-400">*</span>
              </label>
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 focus-within:border-emerald-500 transition">
                <Phone className="w-4 h-4 text-slate-500 mr-2 shrink-0" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-slate-600 outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  E-mail <span className="text-emerald-400">*</span>
                </label>
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 focus-within:border-emerald-500 transition">
                  <Mail className="w-4 h-4 text-slate-500 mr-2 shrink-0" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-slate-600 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Confirmar E-mail <span className="text-emerald-400">*</span>
                </label>
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 focus-within:border-emerald-500 transition">
                  <Mail className="w-4 h-4 text-slate-500 mr-2 shrink-0" />
                  <input
                    type="email"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    placeholder="repita seu e-mail"
                    className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-slate-600 outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Seletor de Canal: Receber Código via WHATSAPP, SMS ou E-MAIL */}
            <div className="pt-1 space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Receber Código de Verificação por:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setOtpChannel('whatsapp')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    otpChannel === 'whatsapp'
                      ? 'bg-[#20C933] text-white border-emerald-400 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WHATSAPP</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOtpChannel('sms')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    otpChannel === 'sms'
                      ? 'bg-[#20C933] text-white border-emerald-400 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>SMS</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOtpChannel('email')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    otpChannel === 'email'
                      ? 'bg-[#20C933] text-white border-emerald-400 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>E-MAIL</span>
                </button>
              </div>
            </div>

            {currentPhase === 'contacts' && (
              <div className="pt-2 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setPhase('identification')}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm transition cursor-pointer flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar</span>
                </button>
                <button
                  type="button"
                  disabled={isSendingOtp}
                  onClick={handleSendOtp}
                  style={primaryBgStyle}
                  className="flex-1 py-3.5 px-4 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
                >
                  {isSendingOtp ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <>
                      <span className="text-white font-bold">Receber Código</span>
                      <ArrowRight className="w-4 h-4 text-white" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TELA 3 — MODAL / FASE: CÓDIGO DE 6 DÍGITOS "XXX - XXX"                      */}
        {/* ========================================================================= */}
        {(currentPhase === 'all' || currentPhase === 'verification') && (
          <div className="space-y-4 animate-fadeIn pt-1">
            {currentPhase === 'all' && (
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <span className="w-2 h-2 rounded-full bg-[#20C933]"></span>
                <span className="text-xs font-bold text-emerald-400">3. Validação OTP (6 Dígitos)</span>
              </div>
            )}

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <KeyRound className="w-6 h-6 text-emerald-400" />
              </div>

              <div>
                <h3 className="font-bold text-white text-sm">Digite o Código de 6 Dígitos</h3>
                <p className="text-xs text-slate-400 pt-0.5">
                  Enviado para seu {otpChannel === 'whatsapp' ? 'WhatsApp' : otpChannel === 'sms' ? 'SMS' : 'E-mail'} ({phone || email})
                </p>
              </div>

              {/* Input formatado XXX - XXX */}
              <div className="max-w-xs mx-auto">
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => handleOtpChange(e.target.value)}
                  placeholder="XXX - XXX"
                  maxLength={9}
                  className="w-full text-center tracking-widest text-lg font-mono font-bold bg-slate-900 border border-slate-700 rounded-xl py-3 text-white placeholder-slate-600 outline-none focus:border-emerald-500 shadow-inner"
                />
              </div>

              <div className="flex items-center justify-center gap-3 text-xs pt-1">
                {otpCountdown > 0 ? (
                  <span className="text-slate-400">
                    Reenviar código em <strong className="text-emerald-400">{otpCountdown}s</strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="text-emerald-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reenviar código</span>
                  </button>
                )}
              </div>
            </div>

            {currentPhase === 'verification' && (
              <div className="pt-2 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setPhase('contacts')}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm transition cursor-pointer flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar</span>
                </button>
                <button
                  type="button"
                  disabled={isVerifyingOtp}
                  onClick={handleVerifyOtp}
                  style={primaryBgStyle}
                  className="flex-1 py-3.5 px-4 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
                >
                  {isVerifyingOtp ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-white" />
                      <span className="text-white font-bold">Verificar</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TELA 4 — CADASTRO DE SENHA COM REGRAS E CHECKLIST VISUAL                   */}
        {/* ========================================================================= */}
        {(currentPhase === 'all' || currentPhase === 'password') && (
          <div className="space-y-4 animate-fadeIn pt-1">
            {currentPhase === 'all' && (
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <span className="w-2 h-2 rounded-full bg-[#20C933]"></span>
                <span className="text-xs font-bold text-emerald-400">4. Senha Segura</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Senha <span className="text-emerald-400">*</span>
                </label>
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 focus-within:border-emerald-500 transition">
                  <Lock className="w-4 h-4 text-slate-500 mr-2 shrink-0" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-slate-600 outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-500 hover:text-slate-300 ml-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Confirmar Senha <span className="text-emerald-400">*</span>
                </label>
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 focus-within:border-emerald-500 transition">
                  <Lock className="w-4 h-4 text-slate-500 mr-2 shrink-0" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita sua senha"
                    className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-slate-600 outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-slate-500 hover:text-slate-300 ml-1 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Checklist Visual de Regras de Senha */}
            <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1.5 text-[11px]">
              <span className="font-bold text-slate-400 block mb-1">Requisitos de Segurança da Senha:</span>
              <div className="grid grid-cols-2 gap-1.5">
                <div className={`flex items-center gap-1.5 ${passRules.hasMin ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${passRules.hasMin ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <span>Mínimo 6 dígitos</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passRules.hasUpper || passRules.hasLower ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${passRules.hasUpper || passRules.hasLower ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <span>Letra maiúscula ou minúscula</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passRules.hasSpecial ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${passRules.hasSpecial ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <span>Mínimo 1 caractere especial (!@#$)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passRules.matches ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${passRules.matches ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <span>Senhas coincidem</span>
                </div>
              </div>
            </div>

            {currentPhase === 'password' && (
              <div className="pt-2 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setPhase('contacts')}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm transition cursor-pointer flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar</span>
                </button>
                <button
                  type="button"
                  onClick={handleNextFromPassword}
                  style={primaryBgStyle}
                  className="flex-1 py-3.5 px-4 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                  <span className="text-white font-bold">Avançar</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TELA 5 — BUSCA DE CEP ISOLADA                                             */}
        {/* ========================================================================= */}
        {(currentPhase === 'all' || currentPhase === 'cep') && (
          <div className="space-y-4 animate-fadeIn pt-1">
            {currentPhase === 'all' && (
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <span className="w-2 h-2 rounded-full bg-[#20C933]"></span>
                <span className="text-xs font-bold text-emerald-400">5. CEP Residencial</span>
              </div>
            )}

            {/* Campo CEP Aparecendo de Forma 100% Isolada */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-semibold text-slate-300">
                    CEP Residencial <span className="text-emerald-400">*</span>
                  </label>
                  <p className="text-[11px] text-slate-500 pt-0.5">
                    Digite os 8 números do seu CEP para busca automática
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSkipCep}
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
                  autoFocus={currentPhase === 'cep'}
                />
                {isLoadingCep ? (
                  <Loader2 className="w-5 h-5 text-emerald-400 animate-spin ml-2 shrink-0" />
                ) : (
                  <Search className="w-5 h-5 text-slate-500 ml-2 shrink-0" />
                )}
              </div>
            </div>

            {currentPhase === 'cep' && (
              <div className="pt-2 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setPhase('password')}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm transition cursor-pointer flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar</span>
                </button>
                <button
                  type="button"
                  disabled={isLoadingCep}
                  onClick={handleNextFromCep}
                  style={primaryBgStyle}
                  className="flex-1 py-3.5 px-4 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
                >
                  {isLoadingCep ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <>
                      <span className="text-white font-bold">Avançar</span>
                      <ArrowRight className="w-4 h-4 text-white" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TELA 6 — FORMULÁRIO DE ENDEREÇO COMPLETO                                  */}
        {/* ========================================================================= */}
        {(currentPhase === 'all' || currentPhase === 'address') && (
          <div className="space-y-4 animate-fadeIn pt-1">
            {currentPhase === 'all' && (
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <span className="w-2 h-2 rounded-full bg-[#20C933]"></span>
                <span className="text-xs font-bold text-emerald-400">6. Endereço Completo</span>
              </div>
            )}

            {currentPhase === 'address' && (
              <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
                <span className="text-xs font-bold text-white">Dados do Endereço</span>
                <button
                  type="button"
                  onClick={() => setPhase('cep')}
                  className="text-xs text-slate-400 hover:text-emerald-400 cursor-pointer transition font-medium"
                >
                  {cep ? 'Voltar ao CEP isolado' : 'Digitar apenas CEP'}
                </button>
              </div>
            )}

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
                    onBlur={searchCepByAddress}
                    placeholder="Ex: Avenida Paulista"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 ring-1 ring-emerald-500/30 text-center sm:text-left"
                    required
                    autoFocus={currentPhase === 'address' && !!street}
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
                    placeholder="Apto 42"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500"
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
                    onBlur={searchCepByAddress}
                    placeholder="Centro"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500"
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
                    onBlur={searchCepByAddress}
                    placeholder="São Paulo"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500"
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
                    onBlur={searchCepByAddress}
                    placeholder="SP"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 uppercase font-mono text-center"
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
                  <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 focus-within:border-emerald-500 transition">
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

            {/* Ação de Conclusão Final */}
            <div className="pt-2">
              {currentPhase === 'address' ? (
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPhase('cep')}
                    className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm transition cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={primaryBgStyle}
                    className="flex-1 py-3.5 px-4 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4 text-white" />
                        <span className="text-white font-bold">Concluir Cadastro de Usuário</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={primaryBgStyle}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4 text-white" />
                      <span className="text-white font-bold">Concluir Cadastro de Usuário</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}


      </form>
    </div>
  );
};
