import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  activeTheme?: 'dark' | 'light';
  dark: AdminThemeColorTokens;
  light: AdminThemeColorTokens;
  updatedAt?: string;
}

export const DEFAULT_ADMIN_PREFERENCES: AdminSystemPreferences = {
  logoDarkUrl: '',
  logoLightUrl: '',
  mobileAppIconUrl: '',
  faviconUrl: '',
  activeTheme: 'dark',
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

/**
 * Envia imagem Base64 (data:image/...) ao Supabase Storage (bucket público "salon-media" com fallback "avatars")
 * usando cache CDN de 1 ano (cacheControl: '31536000'), erradicando gravação de strings Base64 gigantes no PostgreSQL.
 */
async function uploadPreferenceImage(raw: string | undefined, prefix: string): Promise<string> {
  const value = (raw || '').trim();
  if (!value.startsWith('data:image/')) return value;
  try {
    const blob = await (await fetch(value)).blob();
    const ext = blob.type.includes('svg')
      ? 'svg'
      : blob.type.includes('jpeg') || blob.type.includes('jpg')
        ? 'jpg'
        : blob.type.includes('webp')
          ? 'webp'
          : 'png';
    const path = `admin/${prefix}-${Date.now()}.${ext}`;
    const contentType = blob.type || 'image/png';

    for (const bucketName of ['salon-media', 'avatars'] as const) {
      const { error } = await supabase.storage
        .from(bucketName)
        .upload(path, blob, { contentType, cacheControl: '31536000', upsert: true });
      if (!error) {
        const { data } = supabase.storage.from(bucketName).getPublicUrl(path);
        if (data?.publicUrl) return data.publicUrl;
      }
    }
    return value;
  } catch {
    return value;
  }
}

export function normalizeRemotePreferences(
  remote: Partial<AdminSystemPreferences>,
  updatedAt?: string
): AdminSystemPreferences {
  return {
    logoDarkUrl: typeof remote.logoDarkUrl === 'string' ? remote.logoDarkUrl : '',
    logoLightUrl: typeof remote.logoLightUrl === 'string' ? remote.logoLightUrl : '',
    mobileAppIconUrl: typeof remote.mobileAppIconUrl === 'string' ? remote.mobileAppIconUrl : '',
    faviconUrl: typeof remote.faviconUrl === 'string' ? remote.faviconUrl : '',
    activeTheme:
      remote.activeTheme === 'light' || remote.activeTheme === 'dark'
        ? remote.activeTheme
        : undefined,
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
      return normalizeRemotePreferences(parsed, parsed.updatedAt);
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
  savePreferencesToServer: (
    next?: AdminSystemPreferences
  ) => Promise<{ success: boolean; error?: string }>;
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
    const defaultTokens =
      activeTheme === 'dark' ? DEFAULT_ADMIN_PREFERENCES.dark : DEFAULT_ADMIN_PREFERENCES.light;
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

    const autofillCss = `
      input:-webkit-autofill,
      input:-webkit-autofill:hover,
      input:-webkit-autofill:focus,
      input:-webkit-autofill:active {
        -webkit-background-clip: text;
        -webkit-text-fill-color: ${activeTheme === 'dark' ? '#f8fafc' : '#0f172a'} !important;
        transition: background-color 5000s ease-in-out 0s;
        box-shadow: inset 0 0 20px 20px transparent !important;
      }
    `;

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
        ${autofillCss}
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

      ${autofillCss}

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
  const [preferences, setPreferencesState] = useState<AdminSystemPreferences>(() =>
    loadStoredAdminPreferences()
  );

  const [theme, setThemeState] = useState<'dark' | 'light'>(() => {
    try {
      const storedPrefs = loadStoredAdminPreferences();
      if (storedPrefs.activeTheme === 'dark' || storedPrefs.activeTheme === 'light') {
        return storedPrefs.activeTheme;
      }
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

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastKnownUpdatedAtRef = useRef<string | undefined>(preferences.updatedAt);
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

  // Função central que persiste diretamente na tabela public.admin_preferences do Supabase (sem exigir sessão Auth JWT, pois o Admin usa system_admins)
  const persistPreferencesToSupabase = async (
    target: AdminSystemPreferences
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const [logoDarkUrl, logoLightUrl, mobileAppIconUrl, faviconUrl] = await Promise.all([
        uploadPreferenceImage(target.logoDarkUrl, 'logo-dark'),
        uploadPreferenceImage(target.logoLightUrl, 'logo-light'),
        uploadPreferenceImage(target.mobileAppIconUrl, 'mobile-icon'),
        uploadPreferenceImage(target.faviconUrl, 'favicon'),
      ]);

      const updatedAt = new Date().toISOString();
      const toSave: AdminSystemPreferences = {
        ...target,
        logoDarkUrl,
        logoLightUrl,
        mobileAppIconUrl,
        faviconUrl,
        activeTheme: target.activeTheme || theme,
        updatedAt,
      };

      const { error } = await supabase
        .from('admin_preferences')
        .upsert(
          {
            id: ADMIN_PREFERENCES_ROW_ID,
            preferences: toSave,
            updated_at: updatedAt,
          },
          { onConflict: 'id' }
        );

      // Também sincroniza com a rota de servidor quando disponível
      fetch('/api/admin/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toSave),
      }).catch(() => {});

      if (error) {
        return { success: false, error: `Não foi possível salvar no banco: ${error.message}` };
      }

      lastKnownUpdatedAtRef.current = updatedAt;
      setPreferencesState(toSave);
      try {
        localStorage.setItem(ADMIN_PREFERENCES_STORAGE_KEY, JSON.stringify(toSave));
      } catch {}
      applySystemPreferencesToDom(toSave, toSave.activeTheme || theme);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro ao salvar as preferências.' };
    }
  };

  // Carrega as preferências salvas no banco (Supabase) ao iniciar, ao focar a janela (checando updated_at primeiro) e via Realtime
  useEffect(() => {
    let active = true;

    const fetchFromSupabase = async (checkTimestampFirst = false) => {
      try {
        if (checkTimestampFirst && lastKnownUpdatedAtRef.current) {
          const { data: meta, error: metaErr } = await supabase
            .from('admin_preferences')
            .select('updated_at')
            .eq('id', ADMIN_PREFERENCES_ROW_ID)
            .maybeSingle();

          if (!active || metaErr || !meta?.updated_at) return;
          if (meta.updated_at === lastKnownUpdatedAtRef.current) {
            return; // Zero Egress desnecessário: nada mudou desde a última sincronização
          }
        }

        const { data, error } = await supabase
          .from('admin_preferences')
          .select('preferences, updated_at')
          .eq('id', ADMIN_PREFERENCES_ROW_ID)
          .maybeSingle();

        if (!active || error || !data?.preferences) return;

        const remoteObj = data.preferences as Partial<AdminSystemPreferences>;
        // Ignora linha vazia caso ainda nunca tenha sido preenchida
        const hasRemoteContent =
          Boolean(remoteObj.logoDarkUrl) ||
          Boolean(remoteObj.logoLightUrl) ||
          Boolean(remoteObj.mobileAppIconUrl) ||
          Boolean(remoteObj.faviconUrl) ||
          Boolean(remoteObj.activeTheme) ||
          (remoteObj.dark && Object.keys(remoteObj.dark).length > 0) ||
          (remoteObj.light && Object.keys(remoteObj.light).length > 0);

        if (!hasRemoteContent) return;

        lastKnownUpdatedAtRef.current = data.updated_at || remoteObj.updatedAt;
        const merged = normalizeRemotePreferences(remoteObj, data.updated_at);
        setPreferencesState(merged);
        if (merged.activeTheme === 'dark' || merged.activeTheme === 'light') {
          setThemeState(merged.activeTheme);
          try {
            localStorage.setItem('vagou_user_theme_preference', merged.activeTheme);
            localStorage.setItem('vagou_theme', merged.activeTheme);
          } catch {}
        }
        try {
          localStorage.setItem(ADMIN_PREFERENCES_STORAGE_KEY, JSON.stringify(merged));
        } catch {}
      } catch (err) {
        console.warn('[preferências] Falha inesperada ao carregar:', err);
      }
    };

    fetchFromSupabase(false);

    const handleWindowFocus = () => {
      fetchFromSupabase(true);
    };
    window.addEventListener('focus', handleWindowFocus);

    const channel = supabase
      .channel('admin_preferences_global_sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_preferences',
          filter: `id=eq.${ADMIN_PREFERENCES_ROW_ID}`,
        },
        () => {
          fetchFromSupabase(false);
        }
      )
      .subscribe();

    return () => {
      active = false;
      window.removeEventListener('focus', handleWindowFocus);
      supabase.removeChannel(channel);
    };
  }, []);

  const scheduleAutoSave = (nextPrefs: AdminSystemPreferences) => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      persistPreferencesToSupabase(nextPrefs);
    }, 350);
  };

  const updatePreferences = (next: AdminSystemPreferences) => {
    const withTheme: AdminSystemPreferences = {
      ...next,
      activeTheme: next.activeTheme || theme,
    };
    setPreferencesState(withTheme);
    try {
      localStorage.setItem(ADMIN_PREFERENCES_STORAGE_KEY, JSON.stringify(withTheme));
    } catch {}
    applySystemPreferencesToDom(withTheme, withTheme.activeTheme || theme);
    scheduleAutoSave(withTheme);
  };

  const savePreferencesToServer = async (
    customNext?: AdminSystemPreferences
  ): Promise<{ success: boolean; error?: string }> => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    const target: AdminSystemPreferences = {
      ...(customNext || preferences),
      activeTheme: (customNext || preferences).activeTheme || theme,
    };
    try {
      localStorage.setItem(ADMIN_PREFERENCES_STORAGE_KEY, JSON.stringify(target));
    } catch {}
    applySystemPreferencesToDom(target, target.activeTheme || theme);
    return persistPreferencesToSupabase(target);
  };

  const resetPreferences = async () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    const resetTarget: AdminSystemPreferences = {
      ...DEFAULT_ADMIN_PREFERENCES,
      activeTheme: theme,
      updatedAt: new Date().toISOString(),
    };
    setPreferencesState(resetTarget);
    try {
      localStorage.setItem(ADMIN_PREFERENCES_STORAGE_KEY, JSON.stringify(resetTarget));
    } catch {}
    applySystemPreferencesToDom(resetTarget, theme);
    await persistPreferencesToSupabase(resetTarget);
  };

  const toggleTheme = () => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('vagou_user_theme_preference', next);
        localStorage.setItem('vagou_theme', next);
      } catch {}
      setPreferencesState((curr) => {
        const updated = { ...curr, activeTheme: next, updatedAt: new Date().toISOString() };
        try {
          localStorage.setItem(ADMIN_PREFERENCES_STORAGE_KEY, JSON.stringify(updated));
        } catch {}
        scheduleAutoSave(updated);
        return updated;
      });
      return next;
    });
  };

  const setTheme = (newTheme: 'dark' | 'light') => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('vagou_user_theme_preference', newTheme);
      localStorage.setItem('vagou_theme', newTheme);
    } catch {}
    setPreferencesState((curr) => {
      const updated = { ...curr, activeTheme: newTheme, updatedAt: new Date().toISOString() };
      try {
        localStorage.setItem(ADMIN_PREFERENCES_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      scheduleAutoSave(updated);
      return updated;
    });
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