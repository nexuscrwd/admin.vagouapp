import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export interface AdminThemeColorTokens {
  headerBg: string;
  headerText: string;
  subHeaderBg: string;
  subHeaderText: string;
  tableHeaderBg: string;
  tableHeaderText: string;
  appBg: string;
  sectionBg: string;
  sectionText: string;
}

export interface AdminSystemPreferences {
  logoDarkUrl: string;
  logoLightUrl: string;
  mobileAppIconUrl: string;
  faviconUrl: string;
  dark: AdminThemeColorTokens;
  light: AdminThemeColorTokens;
  updatedAt?: string;
}

export const DEFAULT_ADMIN_PREFERENCES: AdminSystemPreferences = {
  logoDarkUrl: '',
  logoLightUrl: '',
  mobileAppIconUrl: '',
  faviconUrl: '',
  dark: {
    headerBg: '#0f172a',
    headerText: '#f8fafc',
    subHeaderBg: '#0f172a',
    subHeaderText: '#f8fafc',
    tableHeaderBg: '#0f172a',
    tableHeaderText: '#94a3b8',
    appBg: '#020617',
    sectionBg: '#0f172a',
    sectionText: '#e2e8f0',
  },
  light: {
    headerBg: '#ffffff',
    headerText: '#0f172a',
    subHeaderBg: '#ffffff',
    subHeaderText: '#0f172a',
    tableHeaderBg: '#f1f5f9',
    tableHeaderText: '#475569',
    appBg: '#f1f5f9',
    sectionBg: '#ffffff',
    sectionText: '#1e293b',
  },
};

export const ADMIN_PREFERENCES_STORAGE_KEY = 'vagou_admin_system_preferences_v1';

const ADMIN_PREFERENCES_ROW_ID = 'global';

/** Se a imagem vier em Base64 (data:image/...), envia ao Storage (bucket "media") e devolve a URL pública. */
async function uploadPreferenceImage(raw: string | undefined, prefix: string): Promise<string> {
  const value = (raw || '').trim();
  if (!value.startsWith('data:image/')) return value;
  const blob = await (await fetch(value)).blob();
  const ext = blob.type.includes('svg') ? 'svg' : blob.type.includes('jpeg') || blob.type.includes('jpg') ? 'jpg' : 'png';
  const path = `admin/${prefix}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('media')
    .upload(path, blob, { contentType: blob.type || 'image/png', upsert: true });
  if (error) throw new Error(`Falha ao enviar a imagem (${prefix}): ${error.message}`);
  const { data } = supabase.storage.from('media').getPublicUrl(path);
  if (!data?.publicUrl) throw new Error(`Não foi possível obter a URL pública da imagem (${prefix}).`);
  return data.publicUrl;
}

export function normalizeRemotePreferences(remote: Partial<AdminSystemPreferences>, updatedAt?: string): AdminSystemPreferences {
  return {
    logoDarkUrl: typeof remote.logoDarkUrl === 'string' ? remote.logoDarkUrl : '',
    logoLightUrl: typeof remote.logoLightUrl === 'string' ? remote.logoLightUrl : '',
    mobileAppIconUrl: typeof remote.mobileAppIconUrl === 'string' ? remote.mobileAppIconUrl : '',
    faviconUrl: typeof remote.faviconUrl === 'string' ? remote.faviconUrl : '',
    dark: { ...DEFAULT_ADMIN_PREFERENCES.dark, ...(remote.dark || {}) },
    light: { ...DEFAULT_ADMIN_PREFERENCES.light, ...(remote.light || {}) },
    updatedAt: updatedAt || remote.updatedAt,
  };
}


export function loadStoredAdminPreferences(): AdminSystemPreferences {
  try {
    const raw = localStorage.getItem(ADMIN_PREFERENCES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        logoDarkUrl: typeof parsed.logoDarkUrl === 'string' ? parsed.logoDarkUrl : '',
        logoLightUrl: typeof parsed.logoLightUrl === 'string' ? parsed.logoLightUrl : '',
        mobileAppIconUrl: typeof parsed.mobileAppIconUrl === 'string' ? parsed.mobileAppIconUrl : '',
        faviconUrl: typeof parsed.faviconUrl === 'string' ? parsed.faviconUrl : '',
        dark: { ...DEFAULT_ADMIN_PREFERENCES.dark, ...(parsed.dark || {}) },
        light: { ...DEFAULT_ADMIN_PREFERENCES.light, ...(parsed.light || {}) },
        updatedAt: parsed.updatedAt,
      };
    }
  } catch {}
  return DEFAULT_ADMIN_PREFERENCES;
}

export interface ThemeContextType {
  theme: 'dark' | 'light';
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
  preferences: AdminSystemPreferences;
  updatePreferences: (next: AdminSystemPreferences) => void;
  savePreferencesToServer: (next?: AdminSystemPreferences) => Promise<{ success: boolean; error?: string }>;
  resetPreferences: () => Promise<void>;
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  isDark: true,
  toggleTheme: () => {},
  setTheme: () => {},
  accentColor: '#20C933',
  setAccentColor: () => {},
  preferences: DEFAULT_ADMIN_PREFERENCES,
  updatePreferences: () => {},
  savePreferencesToServer: async () => ({ success: true }),
  resetPreferences: async () => {},
});

export const applyAccentColorToDom = (color: string) => {
  if (!color) return;
  const hex = color.startsWith('#') ? color : '#20C933';

  try {
    localStorage.setItem('vagou_accent_color', hex);
    const root = document.documentElement;
    root.style.setProperty('--accent-color', hex);
    root.style.setProperty('--color-emerald-500', hex);
    root.style.setProperty('--color-emerald-400', `color-mix(in srgb, ${hex} 85%, white 15%)`);
    root.style.setProperty('--color-emerald-600', `color-mix(in srgb, ${hex} 85%, black 15%)`);

    let styleEl = document.getElementById('vagou-dynamic-accent');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'vagou-dynamic-accent';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
      :root {
        --accent-color: ${hex} !important;
        --color-emerald-500: ${hex} !important;
      }
      .text-white, .dark .text-white { color: #ffffff !important; }
    `;
  } catch (err) {
    console.error('Erro ao aplicar cor de destaque:', err);
  }
};

export const applySystemPreferencesToDom = (
  prefs: AdminSystemPreferences,
  activeTheme: 'dark' | 'light'
) => {
  if (typeof document === 'undefined') return;
  try {
    const tokens = activeTheme === 'dark' ? prefs.dark : prefs.light;
    const defaultTokens = activeTheme === 'dark' ? DEFAULT_ADMIN_PREFERENCES.dark : DEFAULT_ADMIN_PREFERENCES.light;
    const isCustomized =
      tokens.headerBg !== defaultTokens.headerBg ||
      tokens.headerText !== defaultTokens.headerText ||
      tokens.subHeaderBg !== defaultTokens.subHeaderBg ||
      tokens.subHeaderText !== defaultTokens.subHeaderText ||
      tokens.tableHeaderBg !== defaultTokens.tableHeaderBg ||
      tokens.tableHeaderText !== defaultTokens.tableHeaderText ||
      tokens.appBg !== defaultTokens.appBg ||
      tokens.sectionBg !== defaultTokens.sectionBg ||
      tokens.sectionText !== defaultTokens.sectionText;

    const root = document.documentElement;
    root.style.setProperty('--admin-header-bg', tokens.headerBg);
    root.style.setProperty('--admin-header-text', tokens.headerText);
    root.style.setProperty('--admin-subheader-bg', tokens.subHeaderBg);
    root.style.setProperty('--admin-subheader-text', tokens.subHeaderText);
    root.style.setProperty('--admin-table-header-bg', tokens.tableHeaderBg);
    root.style.setProperty('--admin-table-header-text', tokens.tableHeaderText);
    root.style.setProperty('--admin-app-bg', tokens.appBg);
    root.style.setProperty('--admin-section-bg', tokens.sectionBg);
    root.style.setProperty('--admin-section-text', tokens.sectionText);

    // Atualiza Favicon do navegador e Ícone Mobile (apple-touch-icon)
    const effectiveFavicon = prefs.faviconUrl || prefs.mobileAppIconUrl || '/icon.svg';
    const effectiveMobileIcon = prefs.mobileAppIconUrl || prefs.faviconUrl || '/icon.svg';

    const iconLinks = document.querySelectorAll("link[rel*='icon']");
    if (iconLinks.length > 0) {
      iconLinks.forEach((link) => {
        (link as HTMLLinkElement).href = effectiveFavicon;
      });
    } else {
      const newFavicon = document.createElement('link');
      newFavicon.rel = 'icon';
      newFavicon.href = effectiveFavicon;
      document.head.appendChild(newFavicon);
    }

    let appleTouch = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement | null;
    if (!appleTouch) {
      appleTouch = document.createElement('link');
      appleTouch.rel = 'apple-touch-icon';
      document.head.appendChild(appleTouch);
    }
    appleTouch.href = effectiveMobileIcon;

    let styleEl = document.getElementById('vagou-admin-preferences-style');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'vagou-admin-preferences-style';
      document.head.appendChild(styleEl);
    }

    if (!isCustomized) {
      styleEl.textContent = `
        :root {
          --admin-header-bg: ${tokens.headerBg};
          --admin-header-text: ${tokens.headerText};
          --admin-subheader-bg: ${tokens.subHeaderBg};
          --admin-subheader-text: ${tokens.subHeaderText};
          --admin-table-header-bg: ${tokens.tableHeaderBg};
          --admin-table-header-text: ${tokens.tableHeaderText};
          --admin-app-bg: ${tokens.appBg};
          --admin-section-bg: ${tokens.sectionBg};
          --admin-section-text: ${tokens.sectionText};
        }
      `;
      return;
    }

    styleEl.textContent = `
      :root {
        --admin-header-bg: ${tokens.headerBg};
        --admin-header-text: ${tokens.headerText};
        --admin-subheader-bg: ${tokens.subHeaderBg};
        --admin-subheader-text: ${tokens.subHeaderText};
        --admin-table-header-bg: ${tokens.tableHeaderBg};
        --admin-table-header-text: ${tokens.tableHeaderText};
        --admin-app-bg: ${tokens.appBg};
        --admin-section-bg: ${tokens.sectionBg};
        --admin-section-text: ${tokens.sectionText};
      }

      /* 1. Fundo do App */
      .admvapp-shell,
      .admvapp-shell .admvapp-main {
        background-color: var(--admin-app-bg) !important;
      }

      /* 2. Cabeçalho Superior & Barra Lateral */
      .admvapp-shell .admvapp-header,
      .admvapp-shell .admvapp-sidebar {
        background-color: var(--admin-header-bg) !important;
        color: var(--admin-header-text) !important;
      }
      .admvapp-shell .admvapp-header h1,
      .admvapp-shell .admvapp-header h2,
      .admvapp-shell .admvapp-header span:not(.text-white),
      .admvapp-shell .admvapp-sidebar nav button:not(.bg-\\[\\#20C933\\]) span {
        color: var(--admin-header-text);
      }

      /* 3. Subcabeçalho Fixo das Telas */
      .admvapp-shell .admvapp-subheader,
      .admvapp-shell .admvapp-main > div > div.shrink-0:first-child {
        background-color: var(--admin-subheader-bg) !important;
        color: var(--admin-subheader-text) !important;
      }
      .admvapp-shell .admvapp-subheader h1,
      .admvapp-shell .admvapp-subheader h2,
      .admvapp-shell .admvapp-main > div > div.shrink-0:first-child h1,
      .admvapp-shell .admvapp-main > div > div.shrink-0:first-child h2 {
        color: var(--admin-subheader-text) !important;
      }

      /* 4. Cabeçalho de Tabela */
      .admvapp-shell table thead th {
        background-color: var(--admin-table-header-bg) !important;
        color: var(--admin-table-header-text) !important;
      }

      /* 5. Fundo de Seção & Cor da Fonte de Conteúdo de Seção */
      .admvapp-shell .admvapp-section,
      .admvapp-shell .admvapp-main table tbody,
      .admvapp-shell .admvapp-main .rounded-xl.bg-white,
      .admvapp-shell .admvapp-main .rounded-2xl.bg-white,
      .dark .admvapp-shell .admvapp-main .dark\\:bg-slate-900 {
        background-color: var(--admin-section-bg) !important;
        color: var(--admin-section-text) !important;
      }
      .admvapp-shell .admvapp-main table tbody td,
      .admvapp-shell .admvapp-section p,
      .admvapp-shell .admvapp-section h3,
      .admvapp-shell .admvapp-section h4 {
        color: var(--admin-section-text);
      }

      /* Trava Inegociável do 7º Mandamento: Botão Verde = Texto/Ícone Branco */
      .bg-\\[\\#20C933\\],
      .bg-emerald-500,
      .bg-emerald-600,
      .bg-\\[\\#20C933\\] *,
      .bg-emerald-500 *,
      .bg-emerald-600 * {
        color: #ffffff !important;
      }
    `;
  } catch (err) {
    console.error('Erro ao aplicar preferências visuais do Admin:', err);
  }
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<'dark' | 'light'>(() => {
    try {
      const explicitChoice = localStorage.getItem('vagou_user_theme_preference');
      if (explicitChoice === 'dark' || explicitChoice === 'light') {
        return explicitChoice;
      }
      const legacy = localStorage.getItem('vagou_theme');
      if (legacy === 'dark' || legacy === 'light') {
        return legacy;
      }
    } catch {}
    return 'dark';
  });

  const [accentColor, setAccentColorState] = useState<string>(() => {
    try {
      return localStorage.getItem('vagou_accent_color') || '#20C933';
    } catch {
      return '#20C933';
    }
  });

  const [preferences, setPreferencesState] = useState<AdminSystemPreferences>(() =>
    loadStoredAdminPreferences()
  );

  const isDark = theme === 'dark';

  useEffect(() => {
    try {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
    } catch {}
    applySystemPreferencesToDom(preferences, theme);
  }, [theme, preferences]);

  useEffect(() => {
    applyAccentColorToDom(accentColor);
  }, [accentColor]);

  // Carrega as preferências salvas no banco (Supabase) ao iniciar — vale para qualquer navegador/dispositivo
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('admin_preferences')
          .select('preferences, updated_at')
          .eq('id', ADMIN_PREFERENCES_ROW_ID)
          .maybeSingle();
        if (!active) return;
        if (error) {
          console.warn('[preferências] Não foi possível ler admin_preferences:', error.message);
          return;
        }
        if (!data?.preferences) return;
        const merged = normalizeRemotePreferences(data.preferences as Partial<AdminSystemPreferences>, data.updated_at);
        setPreferencesState(merged);
        try {
          localStorage.setItem(ADMIN_PREFERENCES_STORAGE_KEY, JSON.stringify(merged));
        } catch {}
      } catch (err) {
        console.warn('[preferências] Falha inesperada ao carregar:', err);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const updatePreferences = (next: AdminSystemPreferences) => {
    setPreferencesState(next);
    try {
      localStorage.setItem(ADMIN_PREFERENCES_STORAGE_KEY, JSON.stringify(next));
    } catch {}
    applySystemPreferencesToDom(next, theme);
  };

  const savePreferencesToServer = async (
    customNext?: AdminSystemPreferences
  ): Promise<{ success: boolean; error?: string }> => {
    const target = customNext || preferences;
    try {
      localStorage.setItem(ADMIN_PREFERENCES_STORAGE_KEY, JSON.stringify(target));
    } catch {}
    applySystemPreferencesToDom(target, theme);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) {
        return { success: false, error: 'Entre como administrador para salvar as preferências no banco.' };
      }

      const [logoDarkUrl, logoLightUrl, mobileAppIconUrl, faviconUrl] = await Promise.all([
        uploadPreferenceImage(target.logoDarkUrl, 'logo-dark'),
        uploadPreferenceImage(target.logoLightUrl, 'logo-light'),
        uploadPreferenceImage(target.mobileAppIconUrl, 'mobile-icon'),
        uploadPreferenceImage(target.faviconUrl, 'favicon'),
      ]);

      const updatedAt = new Date().toISOString();
      const toSave: AdminSystemPreferences = { ...target, logoDarkUrl, logoLightUrl, mobileAppIconUrl, faviconUrl, updatedAt };

      const { data, error } = await supabase
        .from('admin_preferences')
        .upsert(
          { id: ADMIN_PREFERENCES_ROW_ID, preferences: toSave, updated_by: user.id, updated_at: updatedAt },
          { onConflict: 'id' }
        )
        .select('id');

      if (error) {
        return { success: false, error: `Não foi possível salvar no banco: ${error.message}` };
      }
      if (!data || data.length !== 1) {
        return { success: false, error: 'O banco não confirmou a gravação. Verifique se esta conta é administrador da plataforma.' };
      }

      setPreferencesState(toSave);
      try {
        localStorage.setItem(ADMIN_PREFERENCES_STORAGE_KEY, JSON.stringify(toSave));
      } catch {}
      applySystemPreferencesToDom(toSave, theme);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro ao salvar as preferências.' };
    }
  };

  const resetPreferences = async () => {
    setPreferencesState(DEFAULT_ADMIN_PREFERENCES);
    try {
      localStorage.setItem(ADMIN_PREFERENCES_STORAGE_KEY, JSON.stringify(DEFAULT_ADMIN_PREFERENCES));
    } catch {}
    applySystemPreferencesToDom(DEFAULT_ADMIN_PREFERENCES, theme);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) return;
      const updatedAt = new Date().toISOString();
      const { error } = await supabase
        .from('admin_preferences')
        .upsert(
          { id: ADMIN_PREFERENCES_ROW_ID, preferences: { ...DEFAULT_ADMIN_PREFERENCES, updatedAt }, updated_by: user.id, updated_at: updatedAt },
          { onConflict: 'id' }
        );
      if (error) console.warn('[preferências] Não foi possível restaurar o padrão no banco:', error.message);
    } catch (err) {
      console.warn('[preferências] Falha ao restaurar o padrão no banco:', err);
    }
  };

  const toggleTheme = () => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('vagou_user_theme_preference', next);
        localStorage.setItem('vagou_theme', next);
      } catch {}
      return next;
    });
  };

  const setTheme = (newTheme: 'dark' | 'light') => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('vagou_user_theme_preference', newTheme);
      localStorage.setItem('vagou_theme', newTheme);
    } catch {}
  };

  const setAccentColor = (color: string) => {
    setAccentColorState(color);
    applyAccentColorToDom(color);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        toggleTheme,
        setTheme,
        accentColor,
        setAccentColor,
        preferences,
        updatePreferences,
        savePreferencesToServer,
        resetPreferences,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);