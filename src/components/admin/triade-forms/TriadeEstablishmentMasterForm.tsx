import React, { useState } from 'react';
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
} from 'lucide-react';

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
  isStandalonePreview?: boolean;
}

export const TriadeEstablishmentMasterForm: React.FC<TriadeEstablishmentMasterFormProps> = ({
  initialData,
  onSuccess,
}) => {
  // 1. Titular / Proprietário
  const [ownerName, setOwnerName] = useState(initialData?.ownerName || 'Lucas Gabriel Mendes');
  const [ownerWhatsapp, setOwnerWhatsapp] = useState(initialData?.ownerWhatsapp || '(11) 99999-1111');
  const [ownerEmail, setOwnerEmail] = useState(initialData?.ownerEmail || 'lucas.mendes@gmail.com');

  // 2. Dados Comerciais & Fiscais
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

  // 3. Localização & Endereço com ViaCEP
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

  // 4. Identidade Visual & Branding
  const [logoUrl, setLogoUrl] = useState(initialData?.logoUrl || '');
  const [bannerUrl, setBannerUrl] = useState(initialData?.bannerUrl || '');
  const [primaryColor, setPrimaryColor] = useState(initialData?.primaryColor || '#20C933');
  const [bio, setBio] = useState(
    initialData?.bio || 'Barbearia especializada em cortes modernos, degradê navalhado e barba terapia.'
  );
  const [instagram, setInstagram] = useState(initialData?.instagram || '@lucasbarber');

  // Controle de Abas Internas do Formulário Completo
  const [activeSection, setActiveSection] = useState<'all' | 'owner' | 'commercial' | 'address' | 'visual'>('all');

  // Estados de Submissão
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Formatação de Máscara de CEP (00000-000)
  const formatCep = (value: string) => {
    const raw = value.replace(/\D/g, '').slice(0, 8);
    if (raw.length <= 5) return raw;
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  };

  // Formatação de Máscara de Telefone ((11) 99999-9999)
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
      if (!response.ok) throw new Error('Falha no serviço de CEP');

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
        message: 'Serviço de CEP indisponível. Preencha manualmente.',
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
    <div className="w-full max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn font-['Poppins']">
      {/* ========================================================================= */}
      {/* 💈 TOPO SOBERANO: CADASTRO MASTER DO ESTABELECIMENTO */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              style={{ backgroundColor: primaryColor }}
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-emerald-500/20 shrink-0"
            >
              {tradeName.charAt(0) || 'E'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-white text-lg tracking-tight truncate max-w-[320px]">
                  {tradeName || 'Novo Estabelecimento'}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                  ATIVO
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span className="font-mono text-emerald-400">{slug}.vagouapp.com</span>
                <span>•</span>
                <span>{category}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Barra de Filtro Rápido de Seções */}
        <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-slate-800 overflow-x-auto">
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

      {/* ========================================================================= */}
      {/* 📝 FORMULÁRIO COM O MÁXIMO DE INFORMAÇÕES CADASTRADAS */}
      {/* ========================================================================= */}
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

        {/* ------------------------------------------------------------------------- */}
        {/* SEÇÃO 1: TITULAR / PROPRIETÁRIO RESPONSÁVEL */}
        {/* ------------------------------------------------------------------------- */}
        {(activeSection === 'all' || activeSection === 'owner') && (
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <User className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Titular / Proprietário Responsável
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome do Proprietário <span className="text-emerald-400">*</span>
                </label>
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus-within:border-emerald-500 transition">
                  <User className="w-4 h-4 text-slate-500 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Lucas Gabriel Mendes"
                    className="w-full bg-transparent text-sm text-white placeholder-slate-600 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  WhatsApp / Celular <span className="text-emerald-400">*</span>
                </label>
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus-within:border-emerald-500 transition">
                  <Phone className="w-4 h-4 text-slate-500 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={ownerWhatsapp}
                    onChange={(e) => setOwnerWhatsapp(formatPhone(e.target.value))}
                    placeholder="(11) 99999-1111"
                    className="w-full bg-transparent text-sm text-white placeholder-slate-600 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  E-mail do Proprietário <span className="text-emerald-400">*</span>
                </label>
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus-within:border-emerald-500 transition">
                  <Mail className="w-4 h-4 text-slate-500 mr-2 shrink-0" />
                  <input
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="lucas.mendes@gmail.com"
                    className="w-full bg-transparent text-sm text-white placeholder-slate-600 outline-none"
                    required
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------------- */}
        {/* SEÇÃO 2: DADOS COMERCIAIS & FISCAIS */}
        {/* ------------------------------------------------------------------------- */}
        {(activeSection === 'all' || activeSection === 'commercial') && (
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Dados Comerciais & Fiscais
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Nome Fantasia */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome Fantasia <span className="text-emerald-400">*</span>
                </label>
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus-within:border-emerald-500 transition">
                  <Building2 className="w-4 h-4 text-slate-500 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={tradeName}
                    onChange={(e) => handleTradeNameChange(e.target.value)}
                    placeholder="Ex: Lucas Barber"
                    className="w-full bg-transparent text-sm text-white placeholder-slate-600 outline-none"
                    required
                  />
                </div>
              </div>

              {/* Razão Social */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Razão Social
                </label>
                <input
                  type="text"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="Lucas Gabriel Mendes ME"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition"
                />
              </div>

              {/* Documento (CNPJ / CPF) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Documento ({documentType}) <span className="text-emerald-400">*</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value as 'CNPJ' | 'CPF')}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-2 py-2 text-xs text-slate-300 outline-none focus:border-emerald-500 transition cursor-pointer"
                  >
                    <option value="CNPJ">CNPJ</option>
                    <option value="CPF">CPF</option>
                  </select>
                  <input
                    type="text"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    placeholder={documentType === 'CNPJ' ? '45.123.890/0001-44' : '123.456.789-00'}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition"
                    required
                  />
                </div>
              </div>

              {/* Chave PIX */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Chave PIX Oficial
                </label>
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus-within:border-emerald-500 transition">
                  <QrCode className="w-4 h-4 text-slate-500 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder="11999991111 ou chave aleatória"
                    className="w-full bg-transparent text-sm text-white placeholder-slate-600 outline-none"
                  />
                </div>
              </div>

              {/* Modelo Operacional */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Modelo Operacional
                </label>
                <select
                  value={operationalModel}
                  onChange={(e) => setOperationalModel(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 transition cursor-pointer"
                >
                  <option value="Espaço Físico & Delivery">Espaço Físico & Delivery</option>
                  <option value="Apenas Espaço Físico">Apenas Espaço Físico</option>
                  <option value="Apenas Atendimento Delivery / Domiciliar">Apenas Atendimento Delivery / Domiciliar</option>
                </select>
              </div>

              {/* Plano na Plataforma */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Plano na Plataforma
                </label>
                <select
                  value={platformPlan}
                  onChange={(e) => setPlatformPlan(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-emerald-400 font-bold outline-none focus:border-emerald-500 transition cursor-pointer"
                >
                  <option value="PRO / 5% POR AGENDAMENTO">PRO / 5% POR AGENDAMENTO</option>
                  <option value="STARTER / TAXA FIXA">STARTER / TAXA FIXA</option>
                  <option value="ENTERPRISE CUSTOM">ENTERPRISE CUSTOM</option>
                </select>
              </div>

              {/* Categoria do Estabelecimento */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Categoria
                </label>
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus-within:border-emerald-500 transition">
                  <Tag className="w-4 h-4 text-slate-500 mr-2 shrink-0" />
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-transparent text-sm text-white outline-none cursor-pointer"
                  >
                    <option value="Barbearia" className="bg-slate-900">Barbearia</option>
                    <option value="Salão Feminino" className="bg-slate-900">Salão Feminino</option>
                    <option value="Esmalteria" className="bg-slate-900">Esmalteria</option>
                    <option value="Estética & Spa" className="bg-slate-900">Estética & Spa</option>
                    <option value="Studio de Tatuagem" className="bg-slate-900">Studio de Tatuagem</option>
                  </select>
                </div>
              </div>

              {/* Subdomínio / Slug */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Subdomínio / URL do Salão
                </label>
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus-within:border-emerald-500 transition">
                  <Globe className="w-4 h-4 text-slate-500 mr-1.5 shrink-0" />
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="lucas-barber"
                    className="bg-transparent text-sm text-emerald-400 font-mono outline-none"
                    required
                  />
                  <span className="text-xs text-slate-500 font-mono">.vagouapp.com</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------------- */}
        {/* SEÇÃO 3: LOCALIZAÇÃO & ENDEREÇO COMPLETO VIA CEP */}
        {/* ------------------------------------------------------------------------- */}
        {(activeSection === 'all' || activeSection === 'address') && (
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Localização & Endereço Completo
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Campo de CEP com Busca */}
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  CEP <span className="text-emerald-400">*</span>
                </label>
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 focus-within:border-emerald-500 transition">
                  <MapPin className="w-4 h-4 text-slate-500 mr-1.5 shrink-0" />
                  <input
                    type="text"
                    value={cep}
                    onChange={handleCepChange}
                    placeholder="00000-000"
                    maxLength={9}
                    className="w-full bg-transparent text-sm text-white placeholder-slate-600 outline-none"
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
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Rua, Avenida..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition"
                  required
                />
              </div>

              {/* Feedback de Status do CEP */}
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
                  placeholder="1234"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition"
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
                  placeholder="Loja 2, Sala 10..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition"
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
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition"
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
                  placeholder="São Paulo"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition"
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
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition uppercase"
                  required
                />
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------------- */}
        {/* SEÇÃO 4: IDENTIDADE VISUAL & BRANDING */}
        {/* ------------------------------------------------------------------------- */}
        {(activeSection === 'all' || activeSection === 'visual') && (
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Palette className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Identidade Visual & Branding
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Cor Primária */}
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

              {/* Instagram */}
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

              {/* URL do Logo */}
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

              {/* Bio / Descrição */}
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
  );
};
