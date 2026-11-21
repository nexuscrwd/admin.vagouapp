import React, { useState, useRef, useEffect } from 'react';
import {
  Palette,
  Upload,
  RotateCcw,
  Save,
  Sun,
  Moon,
  Smartphone,
  Globe,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  Sparkles,
  Copy,
  Layers,
  Type,
  Table2,
  Layout,
} from 'lucide-react';
import {
  useTheme,
  DEFAULT_ADMIN_PREFERENCES,
  AdminThemeColorTokens,
} from '../../context/ThemeContext';
import { uploadBinaryMediaFile } from '../../services/supabaseApi';

const THEME_PRESETS: Array<{
  id: string;
  label: string;
  mode: 'dark' | 'light';
  tokens: AdminThemeColorTokens;
}> = [
  {
    id: 'default-dark',
    label: 'Padrão Oficial Dark',
    mode: 'dark',
    tokens: DEFAULT_ADMIN_PREFERENCES.dark,
  },
  {
    id: 'emerald-exec-dark',
    label: 'Esmeralda Executivo',
    mode: 'dark',
    tokens: {
      headerBg: '#062016',
      headerText: '#f8fafc',
      subHeaderBg: '#0a291d',
      subHeaderText: '#ecfdf5',
      tableHeaderBg: '#061a12',
      tableHeaderText: '#6ee7b7',
      appBg: '#020c08',
      sectionBg: '#082218',
      sectionText: '#e2e8f0',
    },
  },
  {
    id: 'graphite-dark',
    label: 'Grafite Soberano',
    mode: 'dark',
    tokens: {
      headerBg: '#18181b',
      headerText: '#fafafa',
      subHeaderBg: '#1f1f23',
      subHeaderText: '#f4f4f5',
      tableHeaderBg: '#141417',
      tableHeaderText: '#a1a1aa',
      appBg: '#09090b',
      sectionBg: '#18181b',
      sectionText: '#e4e4e7',
    },
  },
  {
    id: 'default-light',
    label: 'Padrão Oficial Light',
    mode: 'light',
    tokens: DEFAULT_ADMIN_PREFERENCES.light,
  },
  {
    id: 'warm-light',
    label: 'Claro Corporativo',
    mode: 'light',
    tokens: {
      headerBg: '#ffffff',
      headerText: '#0f172a',
      subHeaderBg: '#f8fafc',
      subHeaderText: '#1e293b',
      tableHeaderBg: '#e2e8f0',
      tableHeaderText: '#334155',
      appBg: '#f1f5f9',
      sectionBg: '#ffffff',
      sectionText: '#0f172a',
    },
  },
];

export const AdminPreferencesPanel: React.FC = () => {
  const {
    theme,
    setTheme,
    preferences,
    updatePreferences,
    savePreferencesToServer,
    resetPreferences,
  } = useTheme();

  const [editingMode, setEditingMode] = useState<'dark' | 'light'>(theme);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setEditingMode(theme);
  }, [theme]);

  const logoDarkInputRef = useRef<HTMLInputElement>(null);
  const logoLightInputRef = useRef<HTMLInputElement>(null);
  const mobileIconInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const activeTokens: AdminThemeColorTokens =
    editingMode === 'dark' ? preferences.dark : preferences.light;
  const defaultTokens: AdminThemeColorTokens =
    editingMode === 'dark'
      ? DEFAULT_ADMIN_PREFERENCES.dark
      : DEFAULT_ADMIN_PREFERENCES.light;

  const handleSwitchEditingMode = (mode: 'dark' | 'light') => {
    setEditingMode(mode);
    setTheme(mode);
  };

  const handleTokenChange = (key: keyof AdminThemeColorTokens, value: string) => {
    const next = {
      ...preferences,
      activeTheme: editingMode,
      [editingMode]: {
        ...preferences[editingMode],
        [key]: value,
      },
      updatedAt: new Date().toISOString(),
    };
    updatePreferences(next);
  };

  const handleAssetChange = (
    field: 'logoDarkUrl' | 'logoLightUrl' | 'mobileAppIconUrl' | 'faviconUrl',
    value: string
  ) => {
    const next = {
      ...preferences,
      activeTheme: editingMode,
      [field]: value,
      updatedAt: new Date().toISOString(),
    };
    updatePreferences(next);
  };

  const handleFileUpload = async (
    field: 'logoDarkUrl' | 'logoLightUrl' | 'mobileAppIconUrl' | 'faviconUrl',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsSaving(true);
    try {
      const uploadRes = await uploadBinaryMediaFile(file, {
        bucket: 'branding',
        ownerType: 'admin_preference',
        title: field,
      });

      if (uploadRes.success && uploadRes.url) {
        handleAssetChange(field, uploadRes.url);
        setFeedback('Imagem otimizada e salva no Supabase Storage (bucket branding)!');
      } else {
        setFeedback(uploadRes.error || 'Não foi possível enviar a imagem para o Storage.');
      }
    } finally {
      setIsSaving(false);
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  const handleApplyPreset = async (preset: (typeof THEME_PRESETS)[number]) => {
    setEditingMode(preset.mode);
    setTheme(preset.mode);
    const next = {
      ...preferences,
      activeTheme: preset.mode,
      [preset.mode]: { ...preset.tokens },
      updatedAt: new Date().toISOString(),
    };
    updatePreferences(next);
    await savePreferencesToServer(next);
    setFeedback(`Predefinição "${preset.label}" salva no banco e aplicada em todos os navegadores!`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const next = {
        ...preferences,
        activeTheme: editingMode,
        updatedAt: new Date().toISOString(),
      };
      const res = await savePreferencesToServer(next);
      if (res.success) {
        setFeedback('Preferências salvas no Supabase e sincronizadas para todos os navegadores!');
      } else {
        setFeedback(res.error || 'Preferências aplicadas localmente.');
      }
    } finally {
      setIsSaving(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleResetAll = async () => {
    await resetPreferences();
    setFeedback('Todas as cores, logotipos e ícones foram restaurados para o padrão original.');
    setTimeout(() => setFeedback(null), 3500);
  };

  const renderColorControl = (
    label: string,
    tokenKey: keyof AdminThemeColorTokens,
    defaultHex: string
  ) => {
    const currentVal = activeTokens[tokenKey] || defaultHex;
    return (
      <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-200/70 dark:border-slate-800/70 last:border-b-0">
        <div className="min-w-0">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block truncate">
            {label}
          </span>
          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
            Padrão: {defaultHex.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <label className="relative w-8 h-8 rounded-lg overflow-hidden cursor-pointer border border-slate-300 dark:border-slate-700 shrink-0 shadow-xs">
            <input
              type="color"
              value={currentVal.startsWith('#') && currentVal.length === 7 ? currentVal : defaultHex}
              onChange={(e) => handleTokenChange(tokenKey, e.target.value)}
              className="absolute inset-[-6px] w-12 h-12 cursor-pointer border-0 p-0 bg-transparent"
            />
          </label>

          <input
            type="text"
            value={currentVal}
            onChange={(e) => handleTokenChange(tokenKey, e.target.value)}
            className="w-24 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white font-mono text-xs border border-slate-200 dark:border-slate-800 focus:border-emerald-500 outline-none uppercase"
            maxLength={9}
          />

          {currentVal.toLowerCase() !== defaultHex.toLowerCase() && (
            <button
              type="button"
              onClick={() => handleTokenChange(tokenKey, defaultHex)}
              title="Restaurar cor padrão"
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  const previewLogoUrl =
    editingMode === 'dark'
      ? preferences.logoDarkUrl || preferences.logoLightUrl || '/logo.png'
      : preferences.logoLightUrl || preferences.logoDarkUrl || '/logo_light.png';

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden animate-fadeIn">

      <div className="admvapp-subheader shrink-0 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 lg:px-6 py-2.5 z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#20C933] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Palette className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm lg:text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Preferências de Cores, Temas & Identidade Visual
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Logotipo Dark/Light, Ícone Mobile, Favicon e paleta de superfície e tipografia do Admin Master
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">

          <div className="inline-flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => handleSwitchEditingMode('dark')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                editingMode === 'dark'
                  ? 'bg-[#20C933] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Moon className={`w-3.5 h-3.5 ${editingMode === 'dark' ? 'text-white' : ''}`} />
              <span>Tema Dark</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchEditingMode('light')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                editingMode === 'light'
                  ? 'bg-[#20C933] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sun className={`w-3.5 h-3.5 ${editingMode === 'light' ? 'text-white' : ''}`} />
              <span>Tema Light</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetAll}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Restaurar Padrão</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95 disabled:opacity-60 whitespace-nowrap"
          >
            <Save className="w-3.5 h-3.5 text-white" />
            <span className="text-white">{isSaving ? 'Salvando...' : 'Salvar Preferências'}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-0 m-0 min-h-0 custom-scrollbar">
        <div className="p-4 lg:p-6 space-y-6">
          {feedback && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          <section className="admvapp-section p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <ImageIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Logotipos (Dark / Light), Ícone Mobile & Favicon
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Envie arquivos de imagem (PNG, SVG, WEBP) ou informe a URL direta para cada variação.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <Moon className="w-3.5 h-3.5 text-emerald-500" />
                    Logotipo (Tema Dark)
                  </span>
                  {preferences.logoDarkUrl && (
                    <button
                      type="button"
                      onClick={() => handleAssetChange('logoDarkUrl', '')}
                      className="text-[11px] text-rose-500 hover:text-rose-400 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Limpar</span>
                    </button>
                  )}
                </div>

                <div className="h-24 rounded-xl bg-slate-950 flex items-center justify-center p-3 overflow-hidden">
                  {preferences.logoDarkUrl ? (
                    <img
                      src={preferences.logoDarkUrl}
                      alt="Logo Dark"
                      className="max-h-14 max-w-full object-contain"
                    />
                  ) : (
                    <img
                      src="/logo.png"
                      alt="Logo Dark Padrão"
                      className="max-h-12 max-w-full object-contain opacity-90"
                    />
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={logoDarkInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload('logoDarkUrl', e)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => logoDarkInputRef.current?.click()}
                    className="px-3 py-2 rounded-lg bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    <Upload className="w-3.5 h-3.5 text-white" />
                    <span className="text-white">Enviar Logo</span>
                  </button>
                  <input
                    type="text"
                    value={preferences.logoDarkUrl}
                    onChange={(e) => handleAssetChange('logoDarkUrl', e.target.value)}
                    placeholder="https://... ou Data URL"
                    className="w-full min-w-0 px-2.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white text-xs border border-slate-200 dark:border-slate-800 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    Logotipo (Tema Light)
                  </span>
                  {preferences.logoLightUrl && (
                    <button
                      type="button"
                      onClick={() => handleAssetChange('logoLightUrl', '')}
                      className="text-[11px] text-rose-500 hover:text-rose-400 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Limpar</span>
                    </button>
                  )}
                </div>

                <div className="h-24 rounded-xl bg-slate-100 flex items-center justify-center p-3 overflow-hidden">
                  {preferences.logoLightUrl ? (
                    <img
                      src={preferences.logoLightUrl}
                      alt="Logo Light"
                      className="max-h-14 max-w-full object-contain"
                    />
                  ) : (
                    <img
                      src="/logo_light.png"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/logo.png';
                      }}
                      alt="Logo Light Padrão"
                      className="max-h-12 max-w-full object-contain"
                    />
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={logoLightInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload('logoLightUrl', e)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => logoLightInputRef.current?.click()}
                    className="px-3 py-2 rounded-lg bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    <Upload className="w-3.5 h-3.5 text-white" />
                    <span className="text-white">Enviar Logo</span>
                  </button>
                  <input
                    type="text"
                    value={preferences.logoLightUrl}
                    onChange={(e) => handleAssetChange('logoLightUrl', e.target.value)}
                    placeholder="https://... ou Data URL"
                    className="w-full min-w-0 px-2.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white text-xs border border-slate-200 dark:border-slate-800 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                    Ícone Mobile (App / PWA)
                  </span>
                  {preferences.mobileAppIconUrl && (
                    <button
                      type="button"
                      onClick={() => handleAssetChange('mobileAppIconUrl', '')}
                      className="text-[11px] text-rose-500 hover:text-rose-400 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Limpar</span>
                    </button>
                  )}
                </div>

                <div className="h-24 rounded-xl bg-slate-950 flex items-center justify-center gap-3 p-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                    <img
                      src={preferences.mobileAppIconUrl || preferences.faviconUrl || '/icon.svg'}
                      alt="Ícone Mobile"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="text-[11px] text-slate-400 leading-snug">
                    <strong className="text-white block">Tela Inicial Mobile</strong>
                    Usado ao instalar no celular e na barra recolhida.
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={mobileIconInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload('mobileAppIconUrl', e)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => mobileIconInputRef.current?.click()}
                    className="px-3 py-2 rounded-lg bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    <Upload className="w-3.5 h-3.5 text-white" />
                    <span className="text-white">Enviar Ícone</span>
                  </button>
                  <input
                    type="text"
                    value={preferences.mobileAppIconUrl}
                    onChange={(e) => handleAssetChange('mobileAppIconUrl', e.target.value)}
                    placeholder="https://... (512x512)"
                    className="w-full min-w-0 px-2.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white text-xs border border-slate-200 dark:border-slate-800 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-emerald-500" />
                    Favicon do Navegador
                  </span>
                  <div className="flex items-center gap-2">
                    {preferences.mobileAppIconUrl &&
                      preferences.faviconUrl !== preferences.mobileAppIconUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            handleAssetChange('faviconUrl', preferences.mobileAppIconUrl)
                          }
                          title="Usar o mesmo ícone do dispositivo mobile"
                          className="text-[10px] text-emerald-500 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copiar Mobile</span>
                        </button>
                      )}
                    {preferences.faviconUrl && (
                      <button
                        type="button"
                        onClick={() => handleAssetChange('faviconUrl', '')}
                        className="text-[11px] text-rose-500 hover:text-rose-400 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Limpar</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="h-24 rounded-xl bg-slate-950 flex flex-col justify-center px-3.5">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-t-lg bg-slate-800 w-full max-w-[210px]">
                    <img
                      src={preferences.faviconUrl || preferences.mobileAppIconUrl || '/icon.svg'}
                      alt="Favicon"
                      className="w-4 h-4 object-contain shrink-0"
                    />
                    <span className="text-[11px] font-medium text-white truncate">
                      Admin-VagouApp
                    </span>
                  </div>
                  <div className="h-2 bg-slate-900 rounded-b-lg w-full max-w-[210px]" />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={faviconInputRef}
                    type="file"
                    accept="image/*,.ico"
                    onChange={(e) => handleFileUpload('faviconUrl', e)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => faviconInputRef.current?.click()}
                    className="px-3 py-2 rounded-lg bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    <Upload className="w-3.5 h-3.5 text-white" />
                    <span className="text-white">Enviar Favicon</span>
                  </button>
                  <input
                    type="text"
                    value={preferences.faviconUrl}
                    onChange={(e) => handleAssetChange('faviconUrl', e.target.value)}
                    placeholder="https://... (64x64 / SVG)"
                    className="w-full min-w-0 px-2.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white text-xs border border-slate-200 dark:border-slate-800 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

            <div className="xl:col-span-7 space-y-6">

              <section className="admvapp-section p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    Temas Predefinidos Rápidos
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Editando agora:{' '}
                    <strong className="text-emerald-500">
                      {editingMode === 'dark' ? 'Tema Escuro (Dark)' : 'Tema Claro (Light)'}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {THEME_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition flex items-center gap-2 cursor-pointer"
                    >
                      <span
                        className="w-3 h-3 rounded-full shrink-0 border border-white/20"
                        style={{ backgroundColor: preset.tokens.headerBg }}
                      />
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="admvapp-section p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <Layers className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Cores de Fundo & Superfície ({editingMode === 'dark' ? 'Tema Dark' : 'Tema Light'})
                  </h3>
                </div>

                <div className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                  {renderColorControl('Cor de Cabeçalho (Topo & Barra Lateral)', 'headerBg', defaultTokens.headerBg)}
                  {renderColorControl('Cor de Subcabeçalho (Barra de Ferramentas)', 'subHeaderBg', defaultTokens.subHeaderBg)}
                  {renderColorControl('Cor de Cabeçalho de Tabela (thead)', 'tableHeaderBg', defaultTokens.tableHeaderBg)}
                  {renderColorControl('Fundo do App (Canvas Principal)', 'appBg', defaultTokens.appBg)}
                  {renderColorControl('Fundo de Seção (Cards & Painéis)', 'sectionBg', defaultTokens.sectionBg)}
                </div>
              </section>

              <section className="admvapp-section p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <Type className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Cores da Fonte & Tipografia ({editingMode === 'dark' ? 'Tema Dark' : 'Tema Light'})
                  </h3>
                </div>

                <div className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                  {renderColorControl('Cor da Fonte de Cabeçalho', 'headerText', defaultTokens.headerText)}
                  {renderColorControl('Cor da Fonte de Subcabeçalho', 'subHeaderText', defaultTokens.subHeaderText)}
                  {renderColorControl('Cor da Fonte de Cabeçalho de Tabela', 'tableHeaderText', defaultTokens.tableHeaderText)}
                  {renderColorControl('Cor da Fonte de Conteúdo de Seção', 'sectionText', defaultTokens.sectionText)}
                </div>
              </section>
            </div>

            <div className="xl:col-span-5">
              <div className="sticky top-4 space-y-4">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Layout className="w-3.5 h-3.5 text-emerald-500" />
                    Pré-visualização em Tempo Real ({editingMode === 'dark' ? 'Dark' : 'Light'})
                  </span>
                </div>

                <div
                  className="rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-800 shadow-lg transition-colors"
                  style={{ backgroundColor: activeTokens.appBg }}
                >

                  <div
                    className="px-4 py-3 flex items-center justify-between border-b border-white/10"
                    style={{
                      backgroundColor: activeTokens.headerBg,
                      color: activeTokens.headerText,
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={previewLogoUrl}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/logo.png';
                        }}
                        alt="Logo Preview"
                        className="h-7 w-auto object-contain"
                      />
                      <span
                        className="text-xs font-bold"
                        style={{ color: activeTokens.headerText }}
                      >
                        Cabeçalho do Sistema
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-[#20C933] text-white text-[10px] font-bold">
                      + Cadastrar
                    </span>
                  </div>

                  <div
                    className="px-4 py-2.5 flex items-center justify-between border-b border-white/10"
                    style={{
                      backgroundColor: activeTokens.subHeaderBg,
                      color: activeTokens.subHeaderText,
                    }}
                  >
                    <span
                      className="text-xs font-bold"
                      style={{ color: activeTokens.subHeaderText }}
                    >
                      Subcabeçalho • Filtros e Ações
                    </span>
                    <span
                      className="text-[10px] opacity-80"
                      style={{ color: activeTokens.subHeaderText }}
                    >
                      Total (6)
                    </span>
                  </div>

                  <div className="p-4 space-y-4" style={{ backgroundColor: activeTokens.appBg }}>

                    <div
                      className="p-3.5 rounded-xl space-y-1.5"
                      style={{
                        backgroundColor: activeTokens.sectionBg,
                        color: activeTokens.sectionText,
                      }}
                    >
                      <div
                        className="text-xs font-bold"
                        style={{ color: activeTokens.sectionText }}
                      >
                        Fundo e Conteúdo de Seção
                      </div>
                      <p
                        className="text-[11px] opacity-90 leading-relaxed"
                        style={{ color: activeTokens.sectionText }}
                      >
                        Este bloco demonstra a cor de fundo de seção e a cor da fonte de conteúdo de seção.
                      </p>
                    </div>

                    <div
                      className="rounded-xl overflow-hidden"
                      style={{ backgroundColor: activeTokens.sectionBg }}
                    >
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr
                            style={{
                              backgroundColor: activeTokens.tableHeaderBg,
                              color: activeTokens.tableHeaderText,
                            }}
                          >
                            <th
                              className="py-2.5 px-3 font-bold uppercase tracking-wider text-[10px]"
                              style={{ color: activeTokens.tableHeaderText }}
                            >
                              <div className="flex items-center gap-1.5">
                                <Table2 className="w-3 h-3" />
                                <span>Cabeçalho Tabela</span>
                              </div>
                            </th>
                            <th
                              className="py-2.5 px-3 font-bold uppercase tracking-wider text-[10px]"
                              style={{ color: activeTokens.tableHeaderText }}
                            >
                              Usuário
                            </th>
                            <th
                              className="py-2.5 px-3 font-bold uppercase tracking-wider text-[10px] text-right"
                              style={{ color: activeTokens.tableHeaderText }}
                            >
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          <tr>
                            <td
                              className="py-2.5 px-3 font-semibold"
                              style={{ color: activeTokens.sectionText }}
                            >
                              Anderson Pires
                            </td>
                            <td
                              className="py-2.5 px-3 font-mono"
                              style={{ color: activeTokens.sectionText }}
                            >
                              Anderson@
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span className="px-2 py-0.5 rounded bg-[#20C933] text-white text-[10px] font-bold">
                                Ativo
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td
                              className="py-2.5 px-3 font-semibold"
                              style={{ color: activeTokens.sectionText }}
                            >
                              Fabio Foos
                            </td>
                            <td
                              className="py-2.5 px-3 font-mono"
                              style={{ color: activeTokens.sectionText }}
                            >
                              Fabio#
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span className="px-2 py-0.5 rounded bg-[#20C933] text-white text-[10px] font-bold">
                                Ativo
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
