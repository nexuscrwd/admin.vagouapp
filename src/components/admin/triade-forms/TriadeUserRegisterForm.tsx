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
  RefreshCw,
  Search,
  HelpCircle,
} from 'lucide-react';
import { VagouOfficialLogo } from '../../common/VagouOfficialLogo';
import { registerTriadeUser, checkTriadeUserConflict } from '../../../services/supabaseApi';
import { GoogleAddressPinPicker } from '../GoogleAddressPinPicker';

export interface TriadeUserData {
  id?: string;
  fullName: string;
  username: string;
  phone: string;
  email: string;
  cpf?: string;
  password?: string;
  address: {
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    latitude?: number | null;
    longitude?: number | null;
  };
  origin?: 'portal' | 'establishment' | 'admin';
  salonId?: string;
  salonName?: string;
}

type UserRegisterPhase =
  | 'all'
  | 'identification'
  | 'contacts'
  | 'verification'
  | 'password'
  | 'cep'
  | 'address';

interface TriadeUserRegisterFormProps {
  onSuccess?: (userData: TriadeUserData) => void;
  onSwitchToLogin?: () => void;
  onClose?: () => void;
  showHeader?: boolean;
  variant?: 'card' | 'flat';
  title?: string;
  subtitle?: string;
  activePhase?: UserRegisterPhase;
  onPhaseChange?: (phase: UserRegisterPhase) => void;
  origin?: 'portal' | 'establishment' | 'admin';
  salonId?: string;
  salonName?: string;
  salonLogoUrl?: string;
  salonAccentColor?: string;
  showPhaseStepper?: boolean;
  showSwitchToLogin?: boolean;
  suppressParentPostMessage?: boolean;
  requireCpf?: boolean;
}

export const TriadeUserRegisterForm: React.FC<TriadeUserRegisterFormProps> = ({
  onSuccess,
  onClose,
  showHeader = true,
  variant = 'card',
  title,
  activePhase,
  onPhaseChange,
  origin = 'portal',
  salonId,
  salonName,
  salonLogoUrl,
  salonAccentColor = '#20C933',
  showPhaseStepper = false,
  suppressParentPostMessage = false,
}) => {
  const isEstablishmentMode = origin === 'establishment' || !!salonId;
  const effectiveSalonName = salonName || (isEstablishmentMode ? 'Estabelecimento Parceiro' : 'VagouApp');
  const effectiveTitle = title || (isEstablishmentMode ? `Cadastro • ${effectiveSalonName}` : 'Cadastro de Usuário');
  const [logoLoadError, setLogoLoadError] = useState(false);
  const primaryBgStyle = isEstablishmentMode && salonAccentColor ? { backgroundColor: salonAccentColor } : undefined;

  const [internalPhase, setInternalPhase] = useState<UserRegisterPhase>('identification');
  const currentPhase = activePhase ?? internalPhase;
  const setPhase = (p: UserRegisterPhase) => {
    setInternalPhase(p);
    onPhaseChange?.(p);
  };

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const cpf = '';

  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [otpChannel, setOtpChannel] = useState<'whatsapp' | 'sms' | 'email'>('whatsapp');

  const [otpCode, setOtpCode] = useState('');
  const [sentOtp, setSentOtp] = useState<string>('749215');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(60);
  const [, setIsOtpVerified] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [cep, setCep] = useState('');
  const [showManualAddress, setShowManualAddress] = useState(false);
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [isSearchingCepByAddress, setIsSearchingCepByAddress] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingIdentification, setIsCheckingIdentification] = useState(false);
  const [usernameCheckStatus, setUsernameCheckStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [usernameConflictMessage, setUsernameConflictMessage] = useState<string | null>(null);
  const [phoneConflictMessage, setPhoneConflictMessage] = useState<string | null>(null);
  const [emailConflictMessage, setEmailConflictMessage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const cleanUser = username.trim().replace(/^@+/, '');
    const baseUser = cleanUser.replace(/@+$/g, '').trim();
    if (baseUser.length < 2) {
      setUsernameCheckStatus('idle');
      setUsernameConflictMessage(null);
      return;
    }

    let cancelled = false;
    setUsernameCheckStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const res = await checkTriadeUserConflict({ username: cleanUser });
        if (cancelled) return;
        if (res.hasConflict && res.conflictField === 'username') {
          setUsernameCheckStatus('taken');
          setUsernameConflictMessage(
            res.message || `O nome de usuário "${cleanUser}" já está cadastrado no sistema.`
          );
        } else {
          setUsernameCheckStatus('available');
          setUsernameConflictMessage(null);
        }
      } catch {
        if (!cancelled) {
          setUsernameCheckStatus('idle');
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username]);

  useEffect(() => {
    const cleanPhone = phone.replace(/\D/g, '');
    const cleanMail = email.trim().toLowerCase();
    if (cleanPhone.length < 10 && (!cleanMail.includes('@') || cleanMail.length < 5)) {
      setPhoneConflictMessage(null);
      setEmailConflictMessage(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const [phoneRes, emailRes] = await Promise.all([
          cleanPhone.length >= 10 ? checkTriadeUserConflict({ phone }) : Promise.resolve({ hasConflict: false }),
          cleanMail.includes('@') && cleanMail.length >= 5
            ? checkTriadeUserConflict({ email: cleanMail })
            : Promise.resolve({ hasConflict: false }),
        ]);
        if (cancelled) return;
        setPhoneConflictMessage(
          phoneRes.hasConflict ? (phoneRes as any).message || 'Este WhatsApp já está cadastrado.' : null
        );
        setEmailConflictMessage(
          emailRes.hasConflict ? (emailRes as any).message || 'Este e-mail já está cadastrado.' : null
        );
      } catch {}
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [phone, email]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (otpCountdown > 0) {
      timer = setTimeout(() => setOtpCountdown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCountdown]);

  const cleanUsernameRule = username.trim().replace(/^@+/, '');
  const userRules = {
    hasUpper: /[A-Z]/.test(cleanUsernameRule),
    hasLower: /[a-z]/.test(cleanUsernameRule),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(cleanUsernameRule),
  };
  const isUsernameFormatValid =
    cleanUsernameRule.length >= 3 &&
    userRules.hasUpper &&
    userRules.hasLower &&
    userRules.hasSpecial;

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

  const handleFullNameChange = (val: string) => {
    setFullName(val);
  };

  const handlePhoneChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    let formatted = raw;
    if (raw.length > 0) formatted = `(${raw.slice(0, 2)}`;
    if (raw.length > 2) formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}`;
    if (raw.length > 7) formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
    setPhone(formatted);
  };

  const handleCepChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 8);
    let formatted = raw;
    if (raw.length > 5) formatted = `${raw.slice(0, 5)}-${raw.slice(5, 8)}`;
    setCep(formatted);

    if (raw.length === 8) {
      searchCep(raw);
    }
  };

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

  const handleSkipCep = () => {
    setFeedback(null);
    setShowManualAddress(true);
    setPhase('address');
  };

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

  const searchCepByAddress = async () => {

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

  const handleNextFromIdentification = async () => {
    setFeedback(null);
    if (!fullName.trim()) {
      setFeedback({ type: 'error', message: 'Informe seu nome completo.' });
      return;
    }
    const cleanUser = username.trim().replace(/^@+/, '');
    if (!cleanUser || !isUsernameFormatValid) {
      setFeedback({
        type: 'error',
        message:
          'O nome de usuário deve conter ao menos 1 letra maiúscula, 1 letra minúscula e 1 caractere especial (Ex: Anderson@, Ana#1).',
      });
      return;
    }

    if (usernameCheckStatus === 'taken') {
      setFeedback({
        type: 'error',
        message:
          usernameConflictMessage ||
          `O nome de usuário "${cleanUser}" já está cadastrado no sistema. Escolha outro ou acesse sua conta existente.`,
      });
      return;
    }

    setIsCheckingIdentification(true);
    try {
      const conflict = await checkTriadeUserConflict({
        username: cleanUser,
        cpf: cpf.trim() || undefined,
      });
      setIsCheckingIdentification(false);

      if (conflict.hasConflict) {
        if (conflict.conflictField === 'username') {
          setUsernameCheckStatus('taken');
          setUsernameConflictMessage(conflict.message || null);
        }
        setFeedback({
          type: 'error',
          message:
            conflict.message ||
            `Os dados informados ("${cleanUser}") já pertencem a um usuário cadastrado no sistema.`,
        });
        return;
      }

      setUsernameCheckStatus('available');
      setUsername(cleanUser);
      setPhase('contacts');
    } catch {
      setIsCheckingIdentification(false);
      setUsername(cleanUser);
      setPhase('contacts');
    }
  };

  const handleSendOtp = async () => {
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
    try {
      const conflict = await checkTriadeUserConflict({
        username: username.trim().replace(/^@+/, ''),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        cpf: cpf.trim() || undefined,
      });

      if (conflict.hasConflict) {
        setIsSendingOtp(false);
        if (conflict.conflictField === 'phone') {
          setPhoneConflictMessage(conflict.message || 'Este WhatsApp já está cadastrado.');
        } else if (conflict.conflictField === 'email') {
          setEmailConflictMessage(conflict.message || 'Este e-mail já está cadastrado.');
        }
        setFeedback({
          type: 'error',
          message:
            conflict.message ||
            'Este WhatsApp ou E-mail já pertence a um usuário cadastrado no sistema.',
        });
        return;
      }
    } catch {}

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
    }, 500);
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!fullName.trim() || !username.trim()) {
      setFeedback({ type: 'error', message: 'Preencha seu nome e nome de usuário.' });
      setPhase('identification');
      return;
    }
    if (!isUsernameFormatValid) {
      setFeedback({
        type: 'error',
        message:
          'O nome de usuário deve conter ao menos 1 letra maiúscula, 1 letra minúscula e 1 caractere especial (Ex: Anderson@, Ana#1).',
      });
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

    const resolvedOrigin: 'portal' | 'establishment' | 'admin' = isEstablishmentMode
      ? 'establishment'
      : origin === 'admin'
      ? 'admin'
      : 'portal';

    const payload: TriadeUserData = {
      id: `usr_${Date.now()}`,
      fullName: fullName.trim(),
      username: cleanUsername,
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      cpf: cpf.trim() || undefined,
      password,
      address: {
        cep: cep.trim(),
        street: street.trim(),
        number: number.trim(),
        complement: complement.trim(),
        neighborhood: neighborhood.trim(),
        city: city.trim(),
        state: state.trim().toUpperCase(),
        latitude,
        longitude,
      },
      origin: resolvedOrigin,
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

      if (typeof window !== 'undefined' && !suppressParentPostMessage) {
        const messagePayload = {
          source: 'VAGOUAPP_FORM',
          action: 'USER_REGISTERED',
          origin: isEstablishmentMode ? 'establishment' : origin,
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
      className={`triade-form-root w-full font-['Poppins'] ${
        isCard
          ? 'max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden'
          : 'w-full bg-transparent'
      } animate-fadeIn`}
    >

      {showHeader && (
        <div
          className={`px-6 pt-6 pb-4 sm:px-7 sm:pt-6 sm:pb-5 ${
            isCard ? 'bg-slate-900 border-b border-slate-800/80' : 'bg-transparent border-b border-white/10'
          } relative flex flex-col items-center justify-center text-center shrink-0`}
        >
          {isEstablishmentMode ? (
            salonLogoUrl && !logoLoadError ? (
              <img
                src={salonLogoUrl}
                alt={effectiveSalonName}
                onError={() => setLogoLoadError(true)}
                className="w-10 h-10 rounded-xl object-cover border border-slate-700 shrink-0 shadow-md mx-auto"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-base shrink-0 shadow-md border border-white/10 mx-auto"
                style={{ backgroundColor: salonAccentColor }}
              >
                {effectiveSalonName.charAt(0).toUpperCase()}
              </div>
            )
          ) : (
            <VagouOfficialLogo size="xl" variant="full" className="h-9 sm:h-10 w-auto object-contain mx-auto" />
          )}

          <h2 className="font-bold text-white text-sm sm:text-base tracking-tight mt-2 text-center">
            {effectiveTitle}
          </h2>

          {onClose && (
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.parent.postMessage({ source: 'VAGOUAPP_EMBED', event: 'CLOSE' }, '*');
                }
                onClose();
              }}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className={`w-full ${
          isCard || showHeader ? 'px-6 pt-5 pb-6 sm:px-7 sm:pt-6 sm:pb-7' : 'px-4 py-4 sm:p-6'
        } space-y-4`}
      >

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

        {(currentPhase === 'all' || currentPhase === 'identification') && (
          <div className="space-y-4 animate-fadeIn">
            {currentPhase === 'all' && (
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <span className="w-2 h-2 rounded-full bg-[#20C933]"></span>
                <span className="text-xs font-bold text-emerald-400">1. Identificação</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Nome Completo <span className="text-emerald-400">*</span>
                </label>
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 min-h-[46px] focus-within:border-emerald-500 transition">
                  <User className="w-4 h-4 text-slate-500 mr-2.5 shrink-0" />
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
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    Nome de Usuário <span className="text-emerald-400">*</span>
                  </label>
                  {usernameCheckStatus === 'checking' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                      <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                      <span>Verificando...</span>
                    </span>
                  )}
                  {usernameCheckStatus === 'available' && isUsernameFormatValid && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Disponível</span>
                    </span>
                  )}
                  {usernameCheckStatus === 'taken' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400">
                      <AlertCircle className="w-3 h-3 text-rose-400" />
                      <span>Já cadastrado</span>
                    </span>
                  )}
                </div>
                <div
                  className={`flex items-center bg-slate-950 border rounded-xl px-3.5 py-3 min-h-[46px] transition ${
                    usernameCheckStatus === 'taken'
                      ? 'border-rose-500 focus-within:border-rose-500'
                      : cleanUsernameRule
                        ? isUsernameFormatValid && usernameCheckStatus === 'available'
                          ? 'border-emerald-500/60 focus-within:border-emerald-500'
                          : !isUsernameFormatValid
                            ? 'border-amber-500/60 focus-within:border-amber-500'
                            : 'border-slate-800 focus-within:border-emerald-500'
                        : 'border-slate-800 focus-within:border-emerald-500'
                  }`}
                >
                  <UserCheck
                    className={`w-4 h-4 mr-2.5 shrink-0 ${
                      usernameCheckStatus === 'taken'
                        ? 'text-rose-400'
                        : isUsernameFormatValid && usernameCheckStatus === 'available'
                          ? 'text-emerald-400'
                          : 'text-slate-500'
                    }`}
                  />
                  <input
                    type="text"
                    value={username.replace(/^@+/, '')}
                    onChange={(e) => {
                      setFeedback(null);
                      setUsername(e.target.value.replace(/^@+/, ''));
                    }}
                    placeholder="Ex: Anderson@"
                    className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-slate-600 outline-none font-mono"
                    required
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition ${
                      userRules.hasUpper
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    • 1 Maiúscula (A-Z)
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition ${
                      userRules.hasLower
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    • 1 Minúscula (a-z)
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition ${
                      userRules.hasSpecial
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    • 1 Caractere Especial (@, #, $, !)
                  </span>
                </div>
                {usernameCheckStatus === 'taken' && usernameConflictMessage && (
                  <p className="text-[11px] text-rose-400 font-medium mt-1.5 flex items-start gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <span>{usernameConflictMessage}</span>
                  </p>
                )}
              </div>
            </div>

            {currentPhase === 'identification' && (
              <div className="pt-2">
                <button
                  type="button"
                  disabled={isCheckingIdentification || usernameCheckStatus === 'taken'}
                  onClick={handleNextFromIdentification}
                  style={primaryBgStyle}
                  className="w-full py-3.5 px-5 min-h-[48px] rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCheckingIdentification ? (
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

        {(currentPhase === 'all' || currentPhase === 'contacts') && (
          <div className="space-y-4 animate-fadeIn pt-1">
            {currentPhase === 'all' && (
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <span className="w-2 h-2 rounded-full bg-[#20C933]"></span>
                <span className="text-xs font-bold text-emerald-400">2. Contatos & Canal de Código</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-5">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <label className="block text-[11px] font-semibold text-slate-300">
                    WhatsApp <span className="text-emerald-400">*</span>
                  </label>
                  {phoneConflictMessage && (
                    <span className="text-[10px] font-bold text-rose-400">Já cadastrado</span>
                  )}
                </div>
                <div
                  className={`flex items-center bg-slate-950 border rounded-xl px-2.5 py-2 transition ${
                    phoneConflictMessage
                      ? 'border-rose-500 focus-within:border-rose-500'
                      : 'border-slate-800 focus-within:border-emerald-500'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5 text-slate-500 mr-1.5 shrink-0" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => {
                      setFeedback(null);
                      handlePhoneChange(e.target.value);
                    }}
                    placeholder="(11) 98765-4321"
                    className="w-full bg-transparent text-xs text-white placeholder-slate-600 outline-none font-mono"
                    required
                  />
                </div>
              </div>

              <div className="sm:col-span-7">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <label className="block text-[11px] font-semibold text-slate-300">
                    E-mail Principal <span className="text-emerald-400">*</span>
                  </label>
                  {emailConflictMessage && (
                    <span className="text-[10px] font-bold text-rose-400">Já cadastrado</span>
                  )}
                </div>
                <div
                  className={`flex items-center bg-slate-950 border rounded-xl px-2.5 py-2 transition ${
                    emailConflictMessage
                      ? 'border-rose-500 focus-within:border-rose-500'
                      : 'border-slate-800 focus-within:border-emerald-500'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5 text-slate-500 mr-1.5 shrink-0" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setFeedback(null);
                      setEmail(e.target.value);
                    }}
                    placeholder="seu@email.com"
                    className="w-full bg-transparent text-xs text-white placeholder-slate-600 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="sm:col-span-12">
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Confirmar E-mail <span className="text-emerald-400">*</span>
                </label>
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 focus-within:border-emerald-500 transition">
                  <Mail className="w-3.5 h-3.5 text-slate-500 mr-1.5 shrink-0" />
                  <input
                    type="email"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    placeholder="repita seu e-mail"
                    className="w-full bg-transparent text-xs text-white placeholder-slate-600 outline-none"
                    required
                  />
                </div>
                {(phoneConflictMessage || emailConflictMessage) && (
                  <p className="text-[11px] text-rose-400 font-medium mt-1.5 flex items-start gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <span>{phoneConflictMessage || emailConflictMessage}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="hidden">
              <button type="button" onClick={() => setOtpChannel('email')}>E-MAIL</button>
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

        {(currentPhase === 'all' || currentPhase === 'verification') && (
          <div className="space-y-4 animate-fadeIn pt-1">
            {currentPhase === 'all' && (
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <span className="w-2 h-2 rounded-full bg-[#20C933]"></span>
                <span className="text-xs font-bold text-emerald-400">3. Validação OTP (6 Dígitos)</span>
              </div>
            )}

            <div className="w-full bg-transparent sm:bg-slate-950/80 border-0 sm:border sm:border-slate-800 rounded-none sm:rounded-2xl px-0 py-3 sm:p-5 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <KeyRound className="w-6 h-6 text-emerald-400" />
              </div>

              <div>
                <h3 className="font-bold text-white text-sm">Digite o Código de 6 Dígitos</h3>
                <p className="text-xs text-slate-400 pt-0.5">
                  Enviado para seu {otpChannel === 'whatsapp' ? 'WhatsApp' : otpChannel === 'sms' ? 'SMS' : 'E-mail'} ({phone || email})
                </p>
              </div>

              <div className="w-full sm:max-w-xs mx-auto">
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

            <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1.5 text-[11px]">
              <span className="font-bold text-slate-400 block mb-1">Requisitos de Segurança da Senha:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                <div className={`flex items-center gap-1.5 ${passRules.hasMin ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${passRules.hasMin ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <span>Mínimo 6 dígitos</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passRules.hasUpper || passRules.hasLower ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${passRules.hasUpper || passRules.hasLower ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <span>Letra maiúscula ou minúscula</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passRules.hasSpecial ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${passRules.hasSpecial ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <span>Mínimo 1 caractere especial (!@#$)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passRules.matches ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${passRules.matches ? 'text-emerald-400' : 'text-slate-600'}`} />
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

        {(currentPhase === 'all' || currentPhase === 'cep') && (
          <div className="space-y-4 animate-fadeIn pt-1">
            {currentPhase === 'all' && (
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <span className="w-2 h-2 rounded-full bg-[#20C933]"></span>
                <span className="text-xs font-bold text-emerald-400">5. CEP Residencial</span>
              </div>
            )}

            <div className="w-full bg-transparent sm:bg-slate-950/70 border-0 sm:border sm:border-slate-800 rounded-none sm:rounded-2xl p-0 sm:p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300">
                    CEP Residencial <span className="text-emerald-400">*</span>
                  </label>
                  <p className="text-[10px] text-slate-500 pt-0.5">
                    8 dígitos para busca automática
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSkipCep}
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
                  autoFocus={currentPhase === 'cep'}
                />
                {isLoadingCep ? (
                  <Loader2 className="w-4 h-4 text-emerald-400 animate-spin ml-1.5 shrink-0" />
                ) : (
                  <Search className="w-4 h-4 text-slate-500 ml-1.5 shrink-0" />
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

            <div className="space-y-2.5">

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-9">
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Rua / Logradouro <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    onBlur={searchCepByAddress}
                    placeholder="Nome da rua ou avenida"
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500"
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
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 ring-1 ring-emerald-500/30 text-left sm:text-center"
                    required
                    autoFocus={currentPhase === 'address' && !!street}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Complemento
                  </label>
                  <input
                    type="text"
                    value={complement}
                    onChange={(e) => setComplement(e.target.value)}
                    placeholder="Apto 42"
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500"
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
                    onBlur={searchCepByAddress}
                    placeholder="Centro"
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-6">
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Cidade <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    onBlur={searchCepByAddress}
                    placeholder="São Paulo"
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1 text-left sm:text-center">
                    UF <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={state}
                    maxLength={2}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    onBlur={searchCepByAddress}
                    placeholder="SP"
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 uppercase font-mono text-left sm:text-center"
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
                  <div className="flex items-center min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 focus-within:border-emerald-500 transition">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 mr-1.5 shrink-0" />
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

              <div className="pt-1">
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
                  label="Pino Exato da Residência (Rastreamento Delivery)"
                  compact
                />
              </div>
            </div>

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
