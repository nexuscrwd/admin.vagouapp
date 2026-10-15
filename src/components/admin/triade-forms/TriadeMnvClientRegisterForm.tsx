import React, { useState } from 'react';
import {
  User,
  AtSign,
  Phone,
  Mail,
  MapPin,
  Search,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Check,
  HelpCircle,
  X,
} from 'lucide-react';
import { VagouOfficialLogo } from '../../common/VagouOfficialLogo';

export interface ClientAddressData {
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface ClientRegistrationPayload {
  fullName: string;
  username: string;
  phone: string;
  email: string;
  address: ClientAddressData;
  salonId?: string;
  salonName?: string;
}

export interface TriadeMnvClientRegisterFormProps {
  salonId?: string;
  salonName?: string;
  salonLogoUrl?: string;
  salonAccentColor?: string;
  onSuccess?: (payload: ClientRegistrationPayload) => void;
  onSwitchToLogin?: () => void;
  onClose?: () => void;
  showCloseButton?: boolean;
}

export const TriadeMnvClientRegisterForm: React.FC<TriadeMnvClientRegisterFormProps> = ({
  salonId = 'sal-vagouapp',
  salonName = 'VagouApp',
  salonLogoUrl,
  salonAccentColor = '#20C933',
  onSuccess,
  onSwitchToLogin,
  onClose,
  showCloseButton = false,
}) => {
  // Controle de Etapa (1: Dados Pessoais, 2: Endereço, 3: Segurança & Senha)
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  // FASE 1: Dados Pessoais Iniciais
  const [fullName, setFullName] = useState('Matheus Oliveira');
  const [username, setUsername] = useState('matheus.barba');
  const [phone, setPhone] = useState('(11) 98765-4321');
  const [email, setEmail] = useState('matheus.oliveira@gmail.com');
  const [confirmEmail, setConfirmEmail] = useState('matheus.oliveira@gmail.com');

  // FASE 2: Endereço & Busca via CEP
  const [cep, setCep] = useState('01310-100');
  const [street, setStreet] = useState('Avenida Paulista');
  const [number, setNumber] = useState('1578');
  const [complement, setComplement] = useState('Apto 42');
  const [neighborhood, setNeighborhood] = useState('Bela Vista');
  const [city, setCity] = useState('São Paulo');
  const [state, setState] = useState('SP');

  // Estados de Busca do CEP
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [cepStatus, setCepStatus] = useState<{ type: 'success' | 'error'; message: string } | null>({
    type: 'success',
    message: 'Endereço localizado via CEP',
  });

  // FASE 3: Senha e Confirmação
  const [password, setPassword] = useState('senha1234');
  const [confirmPassword, setConfirmPassword] = useState('senha1234');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(true);

  // Estados de Submissão & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Validação em Tempo Real de Confirmações
  const emailsMismatch =
    confirmEmail.trim().length > 0 && email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase();
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  // Formatação de Máscara de CEP (00000-000)
  const formatCep = (value: string) => {
    const raw = value.replace(/\D/g, '').slice(0, 8);
    if (raw.length <= 5) return raw;
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  };

  // Formatação de Máscara de Celular ((11) 99999-9999)
  const formatPhone = (value: string) => {
    const raw = value.replace(/\D/g, '').slice(0, 11);
    if (raw.length <= 2) return raw;
    if (raw.length <= 7) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
  };

  // Consulta à API pública do ViaCEP
  const handleCepLookup = async (targetCep: string) => {
    const cleanCep = targetCep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      setCepStatus({ type: 'error', message: 'Digite os 8 dígitos do CEP.' });
      return;
    }

    setIsSearchingCep(true);
    setCepStatus(null);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      if (!response.ok) throw new Error('Falha na resposta do serviço de CEP');

      const data = await response.json();
      if (data.erro) {
        setCepStatus({
          type: 'error',
          message: 'CEP não encontrado. Preencha o endereço manualmente.',
        });
      } else {
        setStreet(data.logradouro || '');
        setNeighborhood(data.bairro || '');
        setCity(data.localidade || '');
        setState(data.uf || '');
        setCepStatus({
          type: 'success',
          message: `${data.localidade || 'Cidade'} / ${data.uf || 'UF'} preenchidos automaticamente.`,
        });
      }
    } catch {
      setCepStatus({
        type: 'error',
        message: 'Serviço de CEP indisponível no momento. Preencha manualmente.',
      });
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value);
    setCep(formatted);
    const clean = formatted.replace(/\D/g, '');
    if (clean.length === 8) {
      handleCepLookup(formatted);
    } else {
      setCepStatus(null);
    }
  };

  // Validação do Passo 1 (Dados Pessoais)
  const validateStep1 = (): boolean => {
    setFeedback(null);
    if (!fullName.trim()) {
      setFeedback({ type: 'error', message: 'Informe seu Nome Completo.' });
      return false;
    }
    if (!username.trim()) {
      setFeedback({ type: 'error', message: 'Informe seu Nome de Usuário.' });
      return false;
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      setFeedback({ type: 'error', message: 'Informe um WhatsApp/Celular válido.' });
      return false;
    }
    if (!email.trim() || !confirmEmail.trim()) {
      setFeedback({ type: 'error', message: 'Preencha o e-mail e a confirmação de e-mail.' });
      return false;
    }
    if (email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) {
      setFeedback({ type: 'error', message: 'Os campos de e-mail e confirmação de e-mail não coincidem.' });
      return false;
    }
    return true;
  };

  // Validação do Passo 2 (Endereço)
  const validateStep2 = (): boolean => {
    setFeedback(null);
    if (!cep.trim() || cep.replace(/\D/g, '').length < 8) {
      setFeedback({ type: 'error', message: 'Informe um CEP válido com 8 dígitos.' });
      return false;
    }
    if (!street.trim() || !number.trim() || !neighborhood.trim() || !city.trim() || !state.trim()) {
      setFeedback({ type: 'error', message: 'Preencha o endereço completo (rua, número, bairro, cidade e UF).' });
      return false;
    }
    return true;
  };

  // Avançar para Etapa 2
  const handleGoToStep2 = () => {
    if (validateStep1()) {
      setActiveStep(2);
    }
  };

  // Avançar para Etapa 3
  const handleGoToStep3 = () => {
    if (validateStep1() && validateStep2()) {
      setActiveStep(3);
    }
  };

  // Submissão Final do Formulário
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!validateStep1() || !validateStep2()) {
      return;
    }

    if (!password || password.length < 6) {
      setFeedback({ type: 'error', message: 'A senha deve conter no mínimo 6 caracteres.' });
      return;
    }

    if (password !== confirmPassword) {
      setFeedback({ type: 'error', message: 'A senha e a confirmação de senha não coincidem.' });
      return;
    }

    if (!acceptTerms) {
      setFeedback({ type: 'error', message: 'Aceite os termos para concluir seu cadastro.' });
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setFeedback({
        type: 'success',
        message: 'Cadastro realizado com sucesso! Conectando...',
      });

      onSuccess?.({
        fullName,
        username: username.startsWith('@') ? username : `@${username}`,
        phone,
        email,
        address: {
          cep,
          street,
          number,
          complement,
          neighborhood,
          city,
          state,
        },
        salonId,
        salonName,
      });
    }, 600);
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn font-['Poppins']">
      {/* ========================================================================= */}
      {/* 💈 TOPO EXCLUSIVO DA IDENTIDADE DO SALÃO */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-b from-slate-850 to-slate-900 border-b border-slate-800 p-4 sm:p-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {salonLogoUrl ? (
            <img
              src={salonLogoUrl}
              alt={salonName}
              className="w-11 h-11 rounded-xl object-cover border border-slate-700 shadow-md shrink-0"
            />
          ) : (
            <VagouOfficialLogo size="lg" />
          )}
          <div className="min-w-0">
            <h2 className="font-bold text-white text-base tracking-tight truncate max-w-[220px] sm:max-w-[280px]">
              {salonName}
            </h2>
            <p className="text-xs text-slate-300 font-medium">
              Cadastro no Ecossistema
            </p>
          </div>
        </div>

        {/* Botão Fechar Oficial da Tríade */}
        <button
          type="button"
          onClick={() => {
            if (onClose) {
              onClose();
            } else if (typeof window !== 'undefined') {
              window.parent?.postMessage({ source: 'VAGOUAPP_FORM', action: 'CLOSE' }, '*');
              if (window.history.length > 1) {
                window.history.back();
              } else {
                window.location.href = '/';
              }
            }
          }}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0"
          aria-label="Fechar formulário"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 🧭 ABAS DE AVANÇO PROGRESSIVO DE ETAPAS (1 -> 2 -> 3) */}
      {/* ========================================================================= */}
      <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800">
        <div className="flex items-center justify-between gap-1.5">
          {/* Aba 1: Dados Pessoais */}
          <button
            type="button"
            onClick={() => setActiveStep(1)}
            className={`flex-1 py-2 px-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeStep === 1
                ? 'bg-[#20C933] border-[#20C933] text-white shadow-md shadow-emerald-500/20'
                : activeStep > 1
                ? 'bg-slate-800/80 border-emerald-500/40 text-emerald-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-extrabold ${
                activeStep === 1 ? 'bg-white text-[#20C933]' : 'bg-slate-800 text-slate-300'
              }`}
            >
              1
            </span>
            <span className="hidden sm:inline">1. Dados</span>
            <span className="sm:hidden">1. Dados</span>
          </button>

          <span className="text-slate-700 text-xs">/</span>

          {/* Aba 2: Endereço */}
          <button
            type="button"
            onClick={() => {
              if (validateStep1()) setActiveStep(2);
            }}
            className={`flex-1 py-2 px-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeStep === 2
                ? 'bg-[#20C933] border-[#20C933] text-white shadow-md shadow-emerald-500/20'
                : activeStep > 2
                ? 'bg-slate-800/80 border-emerald-500/40 text-emerald-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-extrabold ${
                activeStep === 2 ? 'bg-white text-[#20C933]' : 'bg-slate-800 text-slate-300'
              }`}
            >
              2
            </span>
            <span>2. Endereço</span>
          </button>

          <span className="text-slate-700 text-xs">/</span>

          {/* Aba 3: Senha */}
          <button
            type="button"
            onClick={() => {
              if (validateStep1() && validateStep2()) setActiveStep(3);
            }}
            className={`flex-1 py-2 px-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeStep === 3
                ? 'bg-[#20C933] border-[#20C933] text-white shadow-md shadow-emerald-500/20'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-extrabold ${
                activeStep === 3 ? 'bg-white text-[#20C933]' : 'bg-slate-800 text-slate-300'
              }`}
            >
              3
            </span>
            <span>3. Senha</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 📝 FORMULÁRIO COM NAVEGAÇÃO PROGRESSIVA */}
      {/* ========================================================================= */}
      <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
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

        {/* ------------------------------------------------------------------------- */}
        {/* ETAPA 1: DADOS PESSOAIS */}
        {/* ------------------------------------------------------------------------- */}
        {activeStep === 1 && (
          <div className="space-y-3.5 animate-fadeIn">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-800">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">
                1
              </span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Dados Pessoais & Acesso
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Nome Completo */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome Completo <span className="text-emerald-400">*</span>
                </label>
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 focus-within:border-emerald-500 transition">
                  <User className="w-4 h-4 text-slate-500 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu nome e sobrenome"
                    className="w-full bg-transparent text-sm text-white placeholder-slate-600 outline-none"
                    required
                  />
                </div>
              </div>

              {/* Nome de Usuário / Username */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome de Usuário <span className="text-emerald-400">*</span>
                </label>
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 focus-within:border-emerald-500 transition">
                  <AtSign className="w-4 h-4 text-slate-500 mr-1.5 shrink-0" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
                    placeholder="usuario"
                    className="w-full bg-transparent text-sm text-white placeholder-slate-600 outline-none"
                    required
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Seu identificador único
                </span>
              </div>

              {/* WhatsApp / Celular */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  WhatsApp / Celular <span className="text-emerald-400">*</span>
                </label>
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 focus-within:border-emerald-500 transition">
                  <Phone className="w-4 h-4 text-slate-500 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    placeholder="(11) 98765-4321"
                    className="w-full bg-transparent text-sm text-white placeholder-slate-600 outline-none"
                    required
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Para confirmação e lembretes
                </span>
              </div>

              {/* E-mail */}
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
                    className="w-full bg-transparent text-sm text-white placeholder-slate-600 outline-none"
                    required
                  />
                </div>
              </div>

              {/* Confirmação de E-mail */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Confirmar E-mail <span className="text-emerald-400">*</span>
                </label>
                <div
                  className={`flex items-center bg-slate-950 border rounded-xl px-3 py-2.5 transition ${
                    emailsMismatch
                      ? 'border-rose-500/80 focus-within:border-rose-500'
                      : 'border-slate-800 focus-within:border-emerald-500'
                  }`}
                >
                  <Mail className="w-4 h-4 text-slate-500 mr-2 shrink-0" />
                  <input
                    type="email"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    placeholder="Repita seu e-mail"
                    className="w-full bg-transparent text-sm text-white placeholder-slate-600 outline-none"
                    required
                  />
                </div>
                {emailsMismatch && (
                  <span className="text-[10px] text-rose-400 mt-0.5 block font-medium">
                    Os e-mails digitados não coincidem.
                  </span>
                )}
              </div>
            </div>

            {/* Botão de Avançar para Etapa 2 */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleGoToStep2}
                className="w-full py-3 px-4 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                <span className="text-white">Avançar para Endereço</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------------- */}
        {/* ETAPA 2: ENDEREÇO COM BUSCA AUTOMÁTICA VIA CEP (ViaCEP) */}
        {/* ------------------------------------------------------------------------- */}
        {activeStep === 2 && (
          <div className="space-y-3.5 animate-fadeIn">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Endereço
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                Busca Automática via CEP
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Campo de CEP com Busca */}
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  CEP <span className="text-emerald-400">*</span>
                </label>
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2.5 focus-within:border-emerald-500 transition">
                  <MapPin className="w-4 h-4 text-slate-500 mr-1.5 shrink-0" />
                  <input
                    type="text"
                    value={cep}
                    onChange={handleCepChange}
                    placeholder="00000-000"
                    maxLength={9}
                    className="w-full bg-transparent text-sm text-white placeholder-slate-600 outline-none font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => handleCepLookup(cep)}
                    disabled={isSearchingCep}
                    title="Buscar CEP na API ViaCEP"
                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {isSearchingCep ? (
                      <span className="inline-block w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Search className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Endereço / Logradouro */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Endereço / Logradouro <span className="text-emerald-400">*</span>
                </label>
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 focus-within:border-emerald-500 transition">
                  <input
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="Rua, Avenida, Alameda..."
                    className="w-full bg-transparent text-sm text-white placeholder-slate-600 outline-none"
                    required
                  />
                </div>
              </div>

              {/* Status Feedback do CEP */}
              {cepStatus && (
                <div className="sm:col-span-3 -mt-1">
                  <p
                    className={`text-[11px] font-medium flex items-center gap-1.5 ${
                      cepStatus.type === 'success' ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {cepStatus.type === 'success' ? (
                      <Check className="w-3 h-3 shrink-0" />
                    ) : (
                      <HelpCircle className="w-3 h-3 shrink-0" />
                    )}
                    <span>{cepStatus.message}</span>
                  </p>
                </div>
              )}

              {/* Número */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Número <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="Ex: 123"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition"
                  required
                />
              </div>

              {/* Complemento */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Complemento
                </label>
                <input
                  type="text"
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                  placeholder="Apto, Bloco..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition"
                />
              </div>

              {/* Bairro */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Bairro <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Bairro"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition"
                  required
                />
              </div>

              {/* Cidade */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Cidade <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Cidade"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition"
                  required
                />
              </div>

              {/* Estado / UF */}
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition uppercase"
                  required
                />
              </div>
            </div>

            {/* Botoes da Etapa 2 (Voltar / Avançar) */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveStep(1)}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-slate-400" />
                <span>Voltar</span>
              </button>

              <button
                type="button"
                onClick={handleGoToStep3}
                className="flex-1 py-3 px-4 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                <span className="text-white">Avançar para Senha</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------------- */}
        {/* ETAPA 3: SENHA & CONFIRMAÇÃO DE SENHA */}
        {/* ------------------------------------------------------------------------- */}
        {activeStep === 3 && (
          <div className="space-y-3.5 animate-fadeIn">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-800">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">
                3
              </span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Segurança & Senha
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Crie uma Senha */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Crie uma Senha <span className="text-emerald-400">*</span>
                </label>
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 focus-within:border-emerald-500 transition">
                  <Lock className="w-4 h-4 text-slate-500 mr-2 shrink-0" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-transparent text-sm text-white placeholder-slate-600 outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-500 hover:text-slate-300 p-0.5 ml-1.5 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirmar Senha */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Confirmar Senha <span className="text-emerald-400">*</span>
                </label>
                <div
                  className={`flex items-center bg-slate-950 border rounded-xl px-3 py-2.5 transition ${
                    passwordsMismatch
                      ? 'border-rose-500/80 focus-within:border-rose-500'
                      : 'border-slate-800 focus-within:border-emerald-500'
                  }`}
                >
                  <Lock className="w-4 h-4 text-slate-500 mr-2 shrink-0" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita sua senha"
                    className="w-full bg-transparent text-sm text-white placeholder-slate-600 outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-slate-500 hover:text-slate-300 p-0.5 ml-1.5 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordsMismatch && (
                  <span className="text-[10px] text-rose-400 mt-0.5 block font-medium">
                    As senhas digitadas não coincidem.
                  </span>
                )}
              </div>
            </div>

            {/* Aceite dos Termos */}
            <div className="pt-1">
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 accent-emerald-500"
                />
                <span className="text-[11px] text-slate-400 leading-tight">
                  Concordo com os Termos de Uso e Política de Privacidade.
                </span>
              </label>
            </div>

            {/* Botoes da Etapa 3 (Voltar / Concluir) */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveStep(2)}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-slate-400" />
                <span>Voltar</span>
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-3 px-4 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="text-white">Cadastrar & Acessar</span>
                    <ArrowRight className="w-4 h-4 text-white" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Rodapé: Link para quem já tem cadastro */}
        <div className="pt-3 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-400">
            Já tem conta?{' '}
            <button
              type="button"
              onClick={() => onSwitchToLogin?.()}
              className="text-emerald-400 hover:text-emerald-300 font-bold ml-1 cursor-pointer"
            >
              Entrar com meu login
            </button>
          </p>
        </div>
      </form>
    </div>
  );
};
